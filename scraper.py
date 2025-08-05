import time
import random
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

        # Título do artigo
        title_tag = soup.find('h1')
        title = title_tag.get_text(strip=True) if title_tag else "Título não encontrado"
        print(f"\n📄 Coletando conteúdo do artigo: {title}", flush=True)

        conteudo_ordenado = []
        vistos_texto = set()
        imagens_encontradas = set()

        blocos = soup.select('div.richtext.text.parbase')
        PADROES_EXCLUIR = [
            "sign me up", "first name", "last name", "phone*", "email*",
            "ready to take", "let's talk", "requesting a product",
            "you’ve come to the right place", "required fields",
            "contact us", "customer service", "©", "privacy notice",
            "seu carrinho de compras está vazio"
        ]

        ultimo_tipo = None

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

                    # Mantém tipo original
                    tipo = el.name if el.name in ['h2', 'h3'] else 'p'

                    # Se for <p> logo após H2/H3, força como parágrafo
                    if ultimo_tipo in ['h2', 'h3'] and tipo == 'p':
                        tipo = 'p'

                    conteudo_ordenado.append({'tipo': tipo, 'conteudo': texto})
                    vistos_texto.add(texto.lower())
                    ultimo_tipo = tipo

                elif el.name == 'img':
                    src = el.get("src") or el.get("data-src")
                    if src:
                        img_url = urljoin(article_url, src)
                        if img_url not in imagens_encontradas:
                            conteudo_ordenado.append({'tipo': 'img', 'conteudo': img_url})
                            imagens_encontradas.add(img_url)

        # Captura imagens adicionais fora do bloco principal
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

        return title, conteudo_ordenado, article_url

    except Exception as e:
        print(f"[Erro ao coletar artigo] {e}", flush=True)
        return None, [], None
