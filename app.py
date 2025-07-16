# app.py — com melhorias para Render

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
    'pt_br': 'Brasil',
    'en_us': 'Estados Unidos',
    'en_ca': 'Canadá',
    'en_au': 'Austrália e nova zelandia',
    'en_za': 'África do Sul',
    'en_gb': 'Reino Unido',
    'es_es': 'Espanha',
    'es_mx': 'México',
    'fr_fr': 'França',
    'nl_nl': 'Holanda',
    'en_eu': 'Europa (outros paises)',
    'en_ap': 'Ásia (outros paises)',
    'en_la': 'america latina (outros paises)',
    'es_la': 'america latina (outros paises)',
    'de_de': 'Alemanha',
    'it_it': 'Itália',
    'ja_jp': 'Japão',
    'zh_cn': 'China',
    'pt_pt': 'Portugal',
}

def normalizar(texto):
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII').lower().strip()
    
MAPA_NOMES = {normalizar(nome): codigo for codigo, nome in MAPA_PAISES.items()}

ALIASES_PAISES = {
    "canguru": "en_au", "boomerang": "en_au", "sidney": "en_au", "aussie": "en_au", "kiwi": "en_au",
    "samba": "pt_br", "carnaval": "pt_br",
    "taco": "es_mx", "mariachi": "es_mx",
    "eiffel": "fr_fr", "croissant": "fr_fr",
    "molde": "nl_nl", "tulipa": "nl_nl",
    "shinkansen": "ja_jp", "samurai": "ja_jp",
    "dragao": "zh_cn", "mao": "zh_cn",
    "realeza": "en_gb", "londres": "en_gb",
    "snow": "en_ca", "hockey": "en_ca",
    "bavaria": "de_de", "oktoberfest": "de_de", 'RJ': 'pt_br', 'SP': 'pt_br'
}

# === Utils ===


def tempo_espera(min_time=5, max_time=9, contexto="esperando..."):
    tempo = random.uniform(min_time, max_time)
    print(f"\n⌛ {contexto}... ({tempo:.2f}s)")
    time.sleep(tempo)

def limpar_pasta_resultados(nome_pasta):
    if os.path.exists(nome_pasta):
        shutil.rmtree(nome_pasta)
    os.makedirs(nome_pasta)
    print(f"📁 Pasta limpa/criada: {nome_pasta}")

def clean_filename(s):
    return re.sub(r'[<>:"/\\|?*]', '', s)[:50].replace(' ', '_')

def salvar_conteudo(title, content, pasta_pais):
    print(f"💾 Salvando: {title[:60]}")
    base_name = clean_filename(title)
    filename = f"{base_name}.docx"
    path = os.path.join(pasta_pais, filename)

    contador = 1
    while os.path.exists(path):
        filename = f"{base_name}_{contador}.docx"
        path = os.path.join(pasta_pais, filename)
        contador += 1

    doc = Document()
    doc.add_heading(title, level=1)
    for p in content:
        texto = p.strip()
        par = doc.add_paragraph(f"• {texto}")
        if len(texto.split()) < 12:
            par.runs[0].bold = True
    doc.save(path)

def coletar_links_artigos(url):
    print(f"🔗 Coletando artigos de: {url}")
    try:
        html = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}).text
        tempo_espera(3, 5, "entre coletas")
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.select("footer, .footer, #footer, .legal"):
            tag.decompose()
        links = []
        for a in soup.find_all("a", href=True, title=True):
            href = a['href']
            if not href.startswith('http'):
                href = urljoin(url, href)
            if '/blog/' in href:
                links.append({'title': a['title'].strip(), 'href': href})
        print(f"🔍 {len(links)} links encontrados.")
        return links
    except Exception as e:
        print(f"❌ Erro ao coletar links: {e}")
        return []

def get_article_content(article_url):
    print(f"📄 Obtendo artigo: {article_url}")
    try:
        html = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"}).text
        tempo_espera(2, 4, "entre artigos")
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("h1")
        title = title_tag.get_text(strip=True) if title_tag else "Sem título"
        paragraphs = [p.get_text(strip=True) for p in soup.find_all(['p', 'h2', 'h3'])]
        print(f"✅ Título: {title[:40]}... ({len(paragraphs)} parágrafos)")
        return title, paragraphs
    except Exception as e:
        print(f"⚠️ Erro ao obter artigo: {e}")
        return "Erro ao coletar título", []

async def traduzir_e_formatar_gpt(textos):
    print(f"🌐 Traduzindo bloco com {len(textos)} textos...")
    blocos, buffer, final = [], "", []
    total_prompt, total_completion = 0, 0

    for t in textos:
        if len(buffer) + len(t) + 1 < 1200:
            buffer += " " + t
        else:
            blocos.append(buffer.strip()); buffer = t
    if buffer: blocos.append(buffer.strip())

    for bloco in blocos:
        try:
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um tradutor profissional. Traduza para o português do Brasil."},
                    {"role": "user", "content": bloco}
                ],
                temperature=0.3, max_tokens=1500,
            )
            txt = resp.choices[0].message.content
            final.extend([p.strip() for p in txt.split('\n') if p.strip()])
            usage = resp.usage
            total_prompt += usage.prompt_tokens
            total_completion += usage.completion_tokens
            print(f"✅ Tradução concluída ({usage.total_tokens} tokens)")
        except Exception as e:
            print(f"⚠️ Erro na tradução GPT: {e}")
            final.append(bloco)
        await asyncio.sleep(random.uniform(1, 2))

    return final, {
        "prompt_tokens": total_prompt,
        "completion_tokens": total_completion,
        "total_tokens": total_prompt + total_completion
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
