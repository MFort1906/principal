import os
from scraper import coletar_links_artigos, get_article_content
from tradução import traduzir_e_formatar_gpt
from exporter import salvar_conteudo_em_docx
from utils import normalizar, limpar_pasta_resultados
from paises import resolver_pais, MAPA_PAISES

URL_BASE = "https://www.tennantco.com"

async def rodar_interface(pais_input, alias_input, qtd_artigos):
    try:
        codigo = resolver_pais(pais_input, alias_input)
    except ValueError as e:
        yield f"❌ Erro: {str(e)}", []
        return

    nome_pais = MAPA_PAISES.get(codigo, "Desconhecido")
    pasta_saida = os.path.abspath(f"resultados/{nome_pais}")
    limpar_pasta_resultados(pasta_saida)

    url_blog = f"{URL_BASE}/{codigo}/blog.html"
    links = coletar_links_artigos(url_blog, codigo)

    if not links:
        yield "❌ Nenhum artigo encontrado!", []
        return

    vistos_hash = set()
    arquivos_gerados = []
    artigos_processados = 0
    total_para_processar = int(qtd_artigos)

    for idx, artigo in enumerate(links, 1):
        if artigos_processados >= total_para_processar:
            break

        try:
            yield f"📄 ({artigos_processados+1}/{total_para_processar}) Coletando: {artigo['title'][:60]}...", arquivos_gerados
            titulo, conteudo, _ = get_article_content(artigo['href'])

            if not conteudo:
                yield f"⚠️ Ignorado (sem conteúdo): {artigo['title']}", arquivos_gerados
                continue

            texto_bruto = " ".join([item['conteudo'] for item in conteudo if item['tipo'] in ['p', 'h2', 'h3']])
            hash_artigo = hash(texto_bruto.strip().lower())
            if hash_artigo in vistos_hash:
                yield f"⚠️ Ignorado (duplicado): {artigo['title']}", arquivos_gerados
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

            yield f"✅ ({artigos_processados}/{total_para_processar}) Traduzido: {titulo}", arquivos_gerados

        except Exception as e:
            yield f"❌ Erro ao processar: {artigo['title']} → {e}", arquivos_gerados
            continue

    yield "🚀 Tradução finalizada!", arquivos_gerados
