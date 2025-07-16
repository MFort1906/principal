# app.py — com melhorias finais refinadas para Render

import os, re, time, json, shutil, random, asyncio, unicodedata
from urllib.parse import urljoin

import nest_asyncio
nest_asyncio.apply()

import requests
from bs4 import BeautifulSoup
from docx import Document
import gradio as gr
from openai import AsyncOpenAI

# === Config ===
print("🔧 Iniciando app.py...")

with open("/etc/secrets/OPENAI_KEY") as f:
    api_key = f.read().strip()
    print("🔑 OPENAI_KEY carregada:", api_key[:6], "... (ocultado)")
if not api_key:
    raise ValueError("⚠️ Variável de ambiente 'OPENAI_KEY' não encontrada.")
client = AsyncOpenAI(api_key=api_key)

with open("/etc/secrets/SCRAPER_PASSWORD") as f:
    SENHA = f.read().strip()
    print("🔐 SCRAPER_PASSWORD carregada com sucesso.")
if not SENHA:
    raise ValueError("⚠️ Variável de ambiente 'SCRAPER_PASSWORD' não encontrada.")

# === Variáveis Globais de Configuração ===
URL_BASE = "https://www.tennantco.com"
MAPA_PAISES = {
    'pt_br': 'Brasil', 'en_us': 'Estados Unidos', 'en_ca': 'Canadá',
    'en_au': 'Austrália e nova zelandia', 'en_za': 'África do Sul', 'en_gb': 'Reino Unido',
    'es_es': 'Espanha', 'es_mx': 'México', 'fr_fr': 'França', 'nl_nl': 'Holanda',
    'en_eu': 'Europa (outros paises)', 'en_ap': 'Ásia (outros paises)',
    'en_la': 'america latina (outros paises)', 'es_la': 'america latina (outros paises)',
    'de_de': 'Alemanha', 'it_it': 'Itália', 'ja_jp': 'Japão', 'zh_cn': 'China', 'pt_pt': 'Portugal'
}

def normalizar(texto):
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII').lower().strip()

MAPA_NOMES = {normalizar(nome): codigo for codigo, nome in MAPA_PAISES.items()}
ALIASES_PAISES = {
    "canguru": "en_au", "boomerang": "en_au", "sidney": "en_au", "aussie": "en_au", "kiwi": "en_au",
    "samba": "pt_br", "carnaval": "pt_br", "taco": "es_mx", "mariachi": "es_mx",
    "eiffel": "fr_fr", "croissant": "fr_fr", "molde": "nl_nl", "tulipa": "nl_nl",
    "shinkansen": "ja_jp", "samurai": "ja_jp", "dragao": "zh_cn", "mao": "zh_cn",
    "realeza": "en_gb", "londres": "en_gb", "snow": "en_ca", "hockey": "en_ca",
    "bavaria": "de_de", "oktoberfest": "de_de", 'RJ': 'pt_br', 'SP': 'pt_br'
}

# === Tradução GPT refinada ===
async def traduzir_e_formatar_gpt(textos):
    resultados = []
    modelo = "gpt-4o-mini"
    blocos, buffer = [], ""
    max_chars = 1200
    total_prompt_tokens = 0
    total_completion_tokens = 0

    termos_remover = [
        "entre em contato", "descubra como", "solicite um orçamento", "fale conosco",
        "nossa equipe de vendas", "está pronta para ajudar", "demonstração de produto",
        "visite nosso site", "nos siga nas redes", "cnpj:", "telefone:", "email:", "diretores da empresa"
    ]

    termos_preservar = ["BrainOS", "ec-H2O NanoClean", "T16AMR", "i-mop", "LiDAR", "3D", "AMR"]

    textos_corrigidos = []
    for texto in textos:
        for termo in termos_preservar:
            texto = texto.replace(termo, f"{termo}")
        textos_corrigidos.append(texto)

    textos_filtrados = []
    for t in textos_corrigidos:
        if not any(termo in t.lower() for termo in termos_remover):
            textos_filtrados.append(t)

    for texto in textos_filtrados:
        texto_limpo = texto.strip()
        if not texto_limpo:
            continue
        if len(buffer) + len(texto_limpo) + 1 < max_chars:
            buffer += " " + texto_limpo
        else:
            blocos.append(buffer.strip())
            buffer = texto_limpo
    if buffer:
        blocos.append(buffer.strip())

    for bloco in blocos:
        system_msg = {
            "role": "system",
            "content": (
                "Você é um tradutor profissional. Traduza para o português do Brasil com fidelidade, coesão, fluidez e tom editorial. "
                "Regras: "
                "1) Não adicione chamadas promocionais ou institucionais. "
                "2) Preserve nomes técnicos e marcas (ex: i-mop, ec-H2O, CS5, T500). "
                "3) Ignore rodapés, categorias e menus. "
                "4) Use 'esfregão' para mop e 'lavadora de pisos' ou 'esfregadora' para scrubber. "
                "5) Evite repetições e frases soltas; traduza com naturalidade. "
                "6) Não marque os termos preservados."
            )
        }
        user_msg = {"role": "user", "content": bloco}

        try:
            resposta = await client.chat.completions.create(
                model=modelo,
                messages=[system_msg, user_msg],
                temperature=0.1,
                max_tokens=2000,
                n=1)

            texto_traduzido = resposta.choices[0].message.content.strip()
            usage = resposta.usage
            total_prompt_tokens += usage.prompt_tokens
            total_completion_tokens += usage.completion_tokens

            paragrafos = [p.strip() for p in texto_traduzido.split('\n') if p.strip()]
            resultados.extend(paragrafos)
            await asyncio.sleep(random.uniform(1.2, 2.0))

        except Exception as e:
            print(f"[Erro GPT Tradução] {e}")
            resultados.append(bloco)

    print(f"\n📊 Tokens:")
    print(f"🔹 Prompt: {total_prompt_tokens}")
    print(f"🔹 Resposta: {total_completion_tokens}")
    print(f"🔹 Total: {total_prompt_tokens + total_completion_tokens}")

    return resultados, {
        "prompt_tokens": total_prompt_tokens,
        "completion_tokens": total_completion_tokens,
        "total_tokens": total_prompt_tokens + total_completion_tokens
    }


async def run(pais, alias, qtd_artigos):
    entrada = normalizar(pais)
    if entrada in MAPA_PAISES:
        codigo = entrada
    elif entrada in MAPA_NOMES:
        codigo = MAPA_NOMES[entrada]
    elif entrada in ALIASES_PAISES:
        codigo = ALIASES_PAISES[entrada]
    elif alias.strip() in MAPA_PAISES:
        codigo = alias.strip()
    else:
        return f"❌ País inválido: {pais}", [], gr.update(visible=True)

    nome_pais = MAPA_PAISES[codigo]
    url_blog = f"{URL_BASE}/{codigo}/blog.html"
    pasta = os.path.abspath(f"resultados/{nome_pais}")
    limpar_pasta_resultados(pasta)

    links = coletar_links_artigos(url_blog)

    vistos_titulos = set()
    vistos_hashes = set()
    processados = 0
    falhas = []
    token_totais = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for art in links:
        if processados >= int(qtd_artigos):
            break

        title, content = get_article_content(art['href'])
        if not content:
            falhas.append(title)
            continue

        titulo_normalizado = normalizar(title)
        hash_artigo = hash(" ".join(content).strip().lower())
        if titulo_normalizado in vistos_titulos or hash_artigo in vistos_hashes:
            continue

        vistos_titulos.add(titulo_normalizado)
        vistos_hashes.add(hash_artigo)

        traduzido, token_log = await traduzir_e_formatar_gpt(content)
        salvar_conteudo(title, traduzido, pasta)
        processados += 1

        for k in token_totais:
            token_totais[k] += token_log.get(k, 0)

    arquivos_docx = sorted([os.path.join(pasta, f) for f in os.listdir(pasta) if f.endswith(".docx")])

    if falhas:
        print('easter egg')
        for f in falhas:
            print(f" - {f}")

    resumo_tokens = (
        f"\n📊 Uso de tokens:"
        f"\n• Prompt: {token_totais['prompt_tokens']}"
        f"\n• Resposta: {token_totais['completion_tokens']}"
        f"\n• Total: {token_totais['total_tokens']}"
    )

    return "✅ Concluído!" + resumo_tokens, arquivos_docx, gr.update(visible=False)

def checar_senha(senha_input):
    return (gr.update(visible=False), gr.update(visible=True)) if senha_input == SENHA else (gr.update(visible=True), gr.update(visible=False))

# === Interface ===
with gr.Blocks(title="Tennant Translator") as demo:
    gr.HTML("""<style>#arquivos_box .wrap.svelte-1ipelgc { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }.gradio-container { max-width: 95vw !important; margin: auto !important; }.gr-textbox, .gr-number { flex: 1 1 48%; min-width: 300px; }.gr-button { width: 100%; }</style>""")

    with gr.Row(visible=True) as login_box:
        senha_input = gr.Textbox(label="Digite a senha", type="password")
        btn_login = gr.Button("Entrar")

    with gr.Row(visible=False) as app_box:
        gr.Markdown("## 🌐 Tradutor de Artigos Tennant (GPT-4o-mini)")
        with gr.Row():
            pais = gr.Textbox(label="País ou termo", placeholder="ex: taco, samba, holanda")
            alias = gr.Textbox(label="Alias (se for novo)", placeholder="ex: es_mx")
            qtd = gr.Number(label="Qtd. artigos", value=3)

        status = gr.Textbox(label="Status do processo", interactive=False)
        with gr.Column(elem_id="arquivos_box"):
            arquivos = gr.File(label="Arquivos traduzidos (.docx)", file_types=[".docx"], file_count="multiple")

        btn = gr.Button("Iniciar")
        btn.click(run, inputs=[pais, alias, qtd], outputs=[status, arquivos, alias])

    btn_login.click(checar_senha, inputs=senha_input, outputs=[login_box, app_box])

if __name__ == "__main__":
    import sys
    port = int(os.getenv("PORT", 7860))
    demo.launch(server_name="0.0.0.0", server_port=port)
