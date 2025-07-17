# scraper.py

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

# === Funções Auxiliares ===
def tempo_espera(min_time=5, max_time=9, contexto="aguardando..."):
    tempo = random.uniform(min_time, max_time)
    print(f"⌛ {contexto} ({tempo:.2f}s)")
    time.sleep(tempo)

def is_valid_url(url):
    return url.startswith("http") and ".html" in url

def limpar_url(href, pais):
    """Garante que a URL seja absoluta e válida para scraping"""
    if not href.startswith("http"):
        href = urljoin(f"{URL_BASE}/{pais}/", href)
    return href

# === Função principal para extrair links de artigos ===
def coletar_links_artigos(pagina_url, pais):
    try:
        response = requests.get(pagina_url, headers=HEADERS)
        response.raise_for_status()
    except Exception as e:
        print(f"[Erro] Falha ao acessar {pagina_url}: {e}")
        return []

    sopa = BeautifulSoup(response.text, 'html.parser')

    # Remove rodapés e seções irrelevantes
    for seletor in ['footer', '.footer', '#footer', '.site-footer', '.rodape', '.legal', '.copyright']:
        for el in sopa.select(seletor):
            el.decompose()

    # Coleta os links de artigos válidos
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

    # Remover duplicações
    vistos = set()
    links_unicos = []
    for link in links:
        if link['href'] not in vistos:
            vistos.add(link['href'])
            links_unicos.append(link)

    print(f"🔗 {len(links_unicos)} links válidos extraídos.")
    return links_unicos

# === Função para extrair conteúdo de um artigo ===
def get_article_content(article_url):
    try:
        tempo_espera(7.5, 9.5, contexto="esperando antes de coletar o artigo")
        response = requests.get(article_url, headers=HEADERS, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Remover seções irrelevantes
        for seletor in ['nav', '.nav', '#nav', '.breadcrumbs', '.category-list']:
            for el in soup.select(seletor):
                el.decompose()

        title_tag = soup.find('h1')
        title = title_tag.get_text(strip=True) if title_tag else "Título não encontrado"

        # Captura os blocos de conteúdo
        raw_content = []
        vistos = set()

        for el in soup.find_all(['p', 'h2', 'h3']):
            texto = el.get_text(strip=True)
            if not texto:
                continue
            if el.name == 'h2':
                texto = f"## {texto}"
            elif len(texto) < 20:
                continue
            texto_lower = texto.lower()
            if texto_lower not in vistos:
                raw_content.append(texto)
                vistos.add(texto_lower)

        return title, raw_content

    except Exception as e:
        print(f"[Erro ao coletar artigo] {e}")
        return None, []
