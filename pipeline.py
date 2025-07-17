import os
from scraper import coletar_links_artigos, get_article_content
from tradução import traduzir_e_formatar_gpt
from exporter import salvar_conteudo_em_docx
from utils import normalizar, limpar_pasta_resultados
from paises import resolver_pais, MAPA_PAISES

URL_BASE = "https://www.tennantco.com"

async def executar_pipeline(pais_input, alias_input, qtd_artigos):
    try:
        codigo = resolver_pais(pais_input, alias_input)
    except ValueError as e:
        return str(e), [], None  # o terceiro retorno é para gr.update()

    nome_pais = MAPA_PAISES.get(codigo, "Desconhecido")
    pasta_saida = os.path.abspath(f"resultados/{nome_pais}")
    limpar_pasta_resultados(pasta_saida)

    url_blog = f"{URL_BASE}/{codigo}/blog.html"
    links = coletar_links_artigos(url_blog, codigo)

    vistos_hash = set()
    arquivos_gerados = []

    for artigo in links[:int(qtd_artigos)]:
        titulo, parags = get_article_content(artigo['href'])
        if not parags:
            continue

        hash_artigo = hash(" ".join(parags).strip().lower())
        if hash_artigo in vistos_hash:
            continue

        traducao, _ = await traduzir_e_formatar_gpt(parags)
        caminho = salvar_conteudo_em_docx(titulo, traducao, pasta_saida)
        arquivos_gerados.append(caminho)

        vistos_hash.add(hash_artigo)

    return "✅ Concluído!", arquivos_gerados, None
