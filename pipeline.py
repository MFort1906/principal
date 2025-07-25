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
        return f"❌ Erro: {str(e)}", []

    nome_pais = MAPA_PAISES.get(codigo, "Desconhecido")
    pasta_saida = os.path.abspath(f"resultados/{nome_pais}")
    limpar_pasta_resultados(pasta_saida)

    url_blog = f"{URL_BASE}/{codigo}/blog.html"
    links = coletar_links_artigos(url_blog, codigo)

    vistos_hash = set()
    arquivos_gerados = []
    artigos_processados = 0

    for artigo in links:
        if artigos_processados >= int(qtd_artigos):
            break

        try:
            titulo, conteudo, _ = get_article_content(artigo['href'])
            if not conteudo:
                print(f"[⚠️ Artigo ignorado: sem conteúdo] {artigo['href']}", flush=True)
                continue

            texto_bruto = " ".join([item['conteudo'] for item in conteudo if item['tipo'] in ['p', 'h2', 'h3']])
            hash_artigo = hash(texto_bruto.strip().lower())
            if hash_artigo in vistos_hash:
                print(f"[⚠️ Artigo ignorado: duplicado] {artigo['href']}", flush=True)
                continue

            texto_para_traduzir = [item['conteudo'] for item in conteudo if item['tipo'] in ['p', 'h2', 'h3']]
            traducao, _ = await traduzir_e_formatar_gpt(texto_para_traduzir)

            traduzido_formatado = []
            i = 0
            for item in conteudo:
                if item['tipo'] in ['p', 'h2', 'h3']:
                    if i < len(traducao):
                        traduzido_formatado.append({'tipo': item['tipo'], 'conteudo': traducao[i]})
                        i += 1
                else:
                    traduzido_formatado.append(item)

            caminho = salvar_conteudo_em_docx(
                titulo=titulo,
                elementos=traduzido_formatado,
                pasta_saida=pasta_saida,
                url_origem=artigo['href']
            )

            arquivos_gerados.append(caminho)
            vistos_hash.add(hash_artigo)
            artigos_processados += 1

        except Exception as e:
            print(f"[❌ Erro ao processar artigo] {artigo['href']}: {e}", flush=True)
            continue

    return "✅ Tradução concluída!", arquivos_gerados
