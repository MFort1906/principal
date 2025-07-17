import time
import random
import re
import unicodedata
import os
import shutil

# === Mapas de países e aliases ===
MAPA_PAISES = {
    'pt_br': 'Brasil', 'en_us': 'Estados Unidos', 'en_ca': 'Canadá',
    'en_au': 'Austrália e Nova Zelândia', 'en_za': 'África do Sul', 'en_gb': 'Reino Unido',
    'es_es': 'Espanha', 'es_mx': 'México', 'fr_fr': 'França', 'nl_nl': 'Holanda',
    'en_eu': 'Europa (outros países)', 'en_ap': 'Ásia (outros países)',
    'en_la': 'América Latina (outros países)', 'es_la': 'América Latina (outros países)',
    'de_de': 'Alemanha', 'it_it': 'Itália', 'ja_jp': 'Japão', 'zh_cn': 'China', 'pt_pt': 'Portugal'
}

ALIASES_PAISES = {
    "canguru": "en_au", "boomerang": "en_au", "sidney": "en_au", "aussie": "en_au", "kiwi": "en_au",
    "samba": "pt_br", "carnaval": "pt_br", "taco": "es_mx", "mariachi": "es_mx",
    "eiffel": "fr_fr", "croissant": "fr_fr", "molde": "nl_nl", "tulipa": "nl_nl",
    "shinkansen": "ja_jp", "samurai": "ja_jp", "dragao": "zh_cn", "mao": "zh_cn",
    "realeza": "en_gb", "londres": "en_gb", "snow": "en_ca", "hockey": "en_ca",
    "bavaria": "de_de", "oktoberfest": "de_de", 'RJ': 'pt_br', 'SP': 'pt_br'
}

def limpar_pasta_resultados(path):
    if os.path.exists(path):
        shutil.rmtree(path)  # apaga a pasta inteira
    os.makedirs(path)        # cria a pasta novamente

def tempo_espera(min_time=5, max_time=9, contexto="aguardando..."):
    tempo = random.uniform(min_time, max_time)
    print(f"⌛ {contexto} ({tempo:.2f}s)")
    time.sleep(tempo)

def normalizar(texto):
    """Remove acentos e deixa minúsculo para facilitar comparações."""
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII').lower().strip()

def is_valid_url(url):
    return url.startswith("http") and ".html" in url

def clean_filename(s):
    """Remove caracteres proibidos e limita o tamanho."""
    proibidos = '<>:"/\\|?*'
    for char in proibidos:
        s = s.replace(char, '')
    s = s.strip()
    if len(s) > 50:
        s = s[:50]
    return s.replace(' ', '_')

def limpar_xml(texto):
    """Remove caracteres ilegais para salvar em .docx."""
    return ''.join(
        c for c in texto
        if c == '\n' or c == '\r' or c == '\t' or 32 <= ord(c) <= 126 or ord(c) >= 160
    )
