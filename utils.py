import time
import random
import unicodedata
import os
import shutil

# ==========================================================
# Mapas de países e aliases
# ==========================================================

MAPA_PAISES = {
    'pt_br': 'Brasil',
    'en_us': 'Estados Unidos',
    'en_ca': 'Canadá',
    'en_au': 'Austrália e Nova Zelândia',
    'en_za': 'África do Sul',
    'en_gb': 'Reino Unido',
    'es_es': 'Espanha',
    'es_mx': 'México',
    'fr_fr': 'França',
    'nl_nl': 'Holanda',
    'en_eu': 'Europa (outros países)',
    'en_ap': 'Ásia (outros países)',
    'en_la': 'América Latina (outros países)',
    'es_la': 'América Latina (outros países)',
    'de_de': 'Alemanha',
    'it_it': 'Itália',
    'ja_jp': 'Japão',
    'zh_cn': 'China',
    'pt_pt': 'Portugal'
}

ALIASES_PAISES = {
    "canguru": "en_au",
    "boomerang": "en_au",
    "sidney": "en_au",
    "aussie": "en_au",
    "kiwi": "en_au",

    "samba": "pt_br",
    "carnaval": "pt_br",
    "rj": "pt_br",
    "sp": "pt_br",

    "taco": "es_mx",
    "mariachi": "es_mx",

    "eiffel": "fr_fr",
    "croissant": "fr_fr",

    "molde": "nl_nl",
    "tulipa": "nl_nl",

    "shinkansen": "ja_jp",
    "samurai": "ja_jp",

    "dragao": "zh_cn",
    "mao": "zh_cn",

    "realeza": "en_gb",
    "londres": "en_gb",

    "snow": "en_ca",
    "hockey": "en_ca",

    "bavaria": "de_de",
    "oktoberfest": "de_de"
}

# ==========================================================
# Utilidades de filesystem
# ==========================================================

def limpar_pasta_resultados(path: str) -> None:
    """
    Remove completamente a pasta de resultados e recria do zero.
    """
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

# ==========================================================
# Controle de tempo / espera
# ==========================================================

def tempo_espera(min_time: float = 5, max_time: float = 9, contexto: str = "aguardando...") -> None:
    """
    Aguarda um tempo aleatório entre min_time e max_time,
    exibindo uma mensagem contextual.
    """
    tempo = random.uniform(min_time, max_time)
    print(f"⌛ {contexto} ({tempo:.2f}s)")
    time.sleep(tempo)

# ==========================================================
# Utilidades de texto
# ==========================================================

def normalizar(texto: str) -> str:
    """
    Remove acentos, converte para minúsculas e remove espaços extras.
    Ideal para comparações e matching.
    """
    return (
        unicodedata
        .normalize('NFKD', texto)
        .encode('ASCII', 'ignore')
        .decode('ASCII')
        .lower()
        .strip()
    )

def is_valid_url(url: str) -> bool:
    """
    Verifica se a URL parece válida para scraping de artigos HTML.
    """
    return url.startswith("http") and ".html" in url

def clean_filename(nome: str) -> str:
    """
    Limpa e normaliza nomes de arquivo, removendo caracteres proibidos
    e limitando o tamanho.
    """
    nome = normalizar(nome)
    proibidos = '<>:"/\\|?*'

    for char in proibidos:
        nome = nome.replace(char, '')

    nome = nome.strip()
    nome = nome[:50]

    return nome.replace(' ', '_')

def limpar_xml(texto: str) -> str:
    """
    Remove caracteres ilegais para XML (.docx),
    prevenindo erros de salvamento.
    """
    return ''.join(
        c for c in texto
        if (
            c in ('\n', '\r', '\t') or
            32 <= ord(c) <= 126 or
            ord(c) >= 160
        )
    )
