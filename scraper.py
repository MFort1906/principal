import time
import random
import re  # <-- novo
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# === Constantes ===
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/91.0.4472.124 Safari/537.36'
    )
}

URL_BASE = "https://www.tennantco.com"

# ---- Parâmetros da heurística de títulos (ajuste fino conforme necessidade) ----
SCORE_LIMIAR = 4          # pontuação mínima para manter como h2/h3
MAX_WORDS_TIT = 14        # títulos muito longos viram parágrafo
MAX_CHARS_TIT = 120       # limite de caracteres para título
PENALIZA_PONTOS_FINAIS = True
LIMIAR_STREAK_LEN = 80    # se houver muitos headings seguidos e próximo for >80 chars, rebaixa

# === Funções Auxiliares ===
def tempo_espera(min_time=5, max_time=9, contexto="aguardando..."):
    tempo = random.uniform(min_time, max_time)
    print(f"⌛ {contexto} ({tempo:.2f}s)")
    time.sleep(tempo)

def is_valid_url(url):
    return url.startswith("http") and ".html" in url

def limpar_url(href, pais):
    if not href.startswith("http"):
        href = urljoin(f"{URL_BASE}/{pais}/", href)
    return href

def coletar_links_artigos(pagina_url, pais):
    try:
        response = requests.get(pagina_url, headers=HEADERS)
        response.raise_for_status()
    except Exception as e:
        print(f"[Erro] Falha ao acessar {pagina_url}: {e}")
        return []

    sopa = BeautifulSoup(response.text, 'html.parser')

    for seletor in ['footer', '.footer', '#footer', '.site-footer', '.rodape', '.legal', '.copyright']:
        for el in sopa.select(seletor):
            el.decompose()

    todos_a = sopa.find_all('a', href=True, title=True)
    links = []

    for a in todos_a:
        href = a['href']
        title = a['title'].strip() or a.text.strip()
        href = limpar_url(href, pais)

        if any(excl in href for excl in ['cart', 'contact', 'solicitud', 'linkedin', 'facebook', 'twitter']):
            continue
        if not is_valid_url(href):
            continue
        if '/blog/' not in href and pais not in ['ja_jp', 'zh_cn', 'ko_kr']:
            continue

        links.append({'title': title, 'href': href})

    vistos = set()
    links_unicos = []
    for link in links:
        if link['href'] not in vistos:
            vistos.add(link['href'])
            links_unicos.append(link)

    print(f"🔗 {len(links_unicos)} links válidos extraídos.", flush=True)
    return links_unicos

# ---------------- Heurística robusta para decidir se é título ----------------
def _tem_varias_frases(txt: str) -> bool:
    """Mais de uma sentença separada por . ? ! indica parágrafo."""
    return len(re.split(r'[\.?!]\s+', txt.strip())) > 1

def _classes(el):
    try:
        return " ".join(el.get("class", [])).lower()
    except Exception:
        return ""

def _classes_pai(el):
    try:
        p = el.parent
        if p:
            return " ".join(p.get("class", [])).lower()
    except Exception:
        pass
    return ""

def pontuar_titulo(el, texto: str) -> int:
    score = 0
    tag = (el.name or "").lower()

    # peso pela tag
    if tag == "h2":
        score += 3
    elif tag == "h3":
        score += 2

    # enumeração no início (ex.: "1. ...", "2:", "3 -")
    if re.match(r'^\s*\d+\s*[\.\-:]\s+', texto):
        score += 2

    # comprimento e palavras
    if len(texto) <= MAX_CHARS_TIT:
        score += 1
    if len(texto.split()) <= MAX_WORDS_TIT:
        score += 1

    # classes sugerindo título
    cself = _classes(el)
    cparent = _classes_pai(el)
    if any(k in cself for k in ["title", "heading", "cmp-title", "section-title"]):
        score += 2
    if any(k in cparent for k in ["title", "heading", "cmp-title", "section-title"]):
        score += 1

    # penalizações
    if _tem_varias_frases(texto):
        score -= 2
    if PENALIZA_PONTOS_FINAIS and texto.strip().endswith(('.', '?', '!', ';', ':')):
        score -= 1
    if len(texto) > 200:
        score -= 2

    return score
# -----------------------------------------------------------------------------


def get_article_content(article_url):
    try:
        tempo_espera(7.5, 9.5, contexto="esperando antes de coletar o artigo")
        response = requests.get(article_url, headers=HEADERS, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Limpa elementos irrelevantes
        SELETORES_IRRELEVANTES = [
            'nav', '.nav', '#nav',
            'footer', '.footer', '#footer', '.site-footer',
            '.breadcrumbs', '.category-list',
            '.cart-empty', '.form', 'form', 'aside',
            '.related-links', '.site-utility', '.newsletter-signup',
            '.social', '.contact', '#comments', '.share', '.sidebar',
            '.global-footer', '.utility-bar', '.login', '.register',
            '.minicart-content', '.minicart', '#minicart'
        ]
        for seletor in SELETORES_IRRELEVANTES:
            for el in soup.select(seletor):
                el.decompose()

        # Título
        title_tag = soup.find('h1')
        title = title_tag.get_text(strip=True) if title_tag else "Título não encontrado"
        print(f"\n📄 Coletando conteúdo do artigo: {title}", flush=True)

        conteudo_ordenado = []
        vistos_texto = set()
        imagens_encontradas = set()

        # Texto principal dentro de .richtext
        blocos = soup.select('div.richtext.text.parbase')
        PADROES_EXCLUIR = [
            "sign me up", "first name", "last name", "phone*", "email*",
            "ready to take", "let's talk", "requesting a product",
            "you’ve come to the right place", "required fields",
            "contact us", "customer service", "©", "privacy notice",
            "seu carrinho de compras está vazio"
        ]

        # controle para evitar muitos headings longos em sequência
        head_streak = 0

        for bloco in blocos:
            for el in bloco.find_all(['h2', 'h3', 'p', 'li', 'img']):
                if el.name in ['p', 'li', 'h2', 'h3']:
                    texto = el.get_text(strip=True)
                    if not texto or any(pad in texto.lower() for pad in PADROES_EXCLUIR):
                        continue
                    if len(texto) < 20 and el.name not in ['h2', 'h3']:
                        continue
                    if texto.lower() in vistos_texto:
                        continue

                    # ---------- decisão de tipo com heurística ----------
                    if el.name in ['h2', 'h3']:
                        score = pontuar_titulo(el, texto)
                        tipo = el.name if score >= SCORE_LIMIAR else 'p'
                    else:
                        tipo = 'p'

                    # pós-regra: se muitos headings seguidos e o próximo é grande, rebaixa
                    if tipo in ('h2', 'h3'):
                        head_streak += 1
                        if head_streak >= 2 and len(texto) > LIMIAR_STREAK_LEN:
                            tipo = 'p'
                    else:
                        head_streak = 0
                    # ---------------------------------------------------

                    conteudo_ordenado.append({'tipo': tipo, 'conteudo': texto})
                    vistos_texto.add(texto.lower())

                elif el.name == 'img':
                    src = el.get("src") or el.get("data-src")
                    if src:
                        img_url = urljoin(article_url, src)
                        if img_url not in imagens_encontradas:
                            conteudo_ordenado.append({'tipo': 'img', 'conteudo': img_url})
                            imagens_encontradas.add(img_url)

        # Imagens fora da richtext — captura global
        for img in soup.select("img"):
            src = img.get("src") or img.get("data-src")
            if not src or "tracking" in src.lower():
                continue
            img_url = urljoin(article_url, src)
            if img_url not in imagens_encontradas:
                conteudo_ordenado.append({'tipo': 'img', 'conteudo': img_url})
                imagens_encontradas.add(img_url)

        print(f"✅ Total de blocos de texto: {len(vistos_texto)}", flush=True)
        print(f"🖼️ Total de imagens encontradas: {len(imagens_encontradas)}", flush=True)
        for idx, img in enumerate(imagens_encontradas, 1):
            print(f"   {idx}. {img}")

        return title, conteudo_ordenado, article_url

    except Exception as e:
        print(f"[Erro ao coletar artigo] {e}", flush=True)
        # mantém a assinatura com 3 itens para não quebrar o pipeline
        return None, [], None
