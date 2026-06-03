from utils import normalizar

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

MAPA_NOMES = {normalizar(nome): codigo for codigo, nome in MAPA_PAISES.items()}

def resolver_pais(pais_input: str, alias_input: str = "") -> str:
    entrada = normalizar(pais_input.strip())

    if entrada in MAPA_PAISES:
        return entrada
    if entrada in MAPA_NOMES:
        return MAPA_NOMES[entrada]
    if entrada in ALIASES_PAISES:
        return ALIASES_PAISES[entrada]

    alias_input = alias_input.strip()
    if alias_input in MAPA_PAISES:
        return alias_input

    raise ValueError(f"❌ País inválido: '{pais_input}'")
