import time
import random
import re
import unicodedata

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
