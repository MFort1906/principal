import os
import gradio as gr
import asyncio
from pipeline import executar_pipeline

# === Mapa visual com países e emojis ===
OPCOES_PAISES = [
    ("🇧🇷 Brasil (👑⚽🥅)", "pt_br"),
    ("🇺🇸 Estados Unidos 🏈", "en_us"),
    ("🇨🇦 Canadá ❄️", "en_ca"),
    ("🇦🇺 Austrália e Nova Zelândia 🦘", "en_au"),
    ("🇿🇦 África do Sul 🦁", "en_za"),
    ("🇬🇧 Reino Unido 👑", "en_gb"),
    ("🇪🇸 Espanha 🦩", "es_es"),
    ("🇲🇽 México 🌮", "es_mx"),
    ("🇫🇷 França 🥐", "fr_fr"),
    ("🇳🇱 Holanda 🌷", "nl_nl"),
    ("🇪🇺 Europa 🏰", "en_eu"),
    ("🌏 Ásia 🐼", "en_ap"),
    ("🌎 América Latina 💃", "en_la"),
    ("🇩🇪 Alemanha 🍻", "de_de"),
    ("🇮🇹 Itália 🍝", "it_it"),
    ("🇯🇵 Japão 🤺", "ja_jp"),
    ("🇨🇳 China 🐉", "zh_cn"),
    ("🇵🇹 Portugal 🛎️", "pt_pt"),
]

# Dicionário para mapear nome exibido para alias
NOMES_TO_ALIAS = {nome: alias for nome, alias in OPCOES_PAISES}

# === Função de checagem de senha ===
def checar_senha(senha_input):
    with open("/etc/secrets/SCRAPER_PASSWORD") as f:
        senha_correta = f.read().strip()
    return (
        gr.update(visible=False), gr.update(visible=True)
    ) if senha_input == senha_correta else (
        gr.update(visible=True), gr.update(visible=False)
    )

# === Função principal da interface ===
async def rodar_interface(pais_nome, qtd):
    alias = NOMES_TO_ALIAS.get(pais_nome, "")
    pais_formatado = pais_nome.split("(", 1)[0].strip()
    try:
        mensagem, arquivos = await executar_pipeline(pais_formatado, alias, qtd)
        return mensagem, arquivos, visibilidade
    except Exception as e:
        return f"❌ Erro: {str(e)}", [], gr.update(visible=True)

# === Interface Gradio ===
with gr.Blocks(title="W.S.T.B.R 2000", theme=gr.themes.Soft()) as demo:
    with gr.Row(visible=True) as login_box:
        with gr.Column():
            senha = gr.Textbox(label="🔐 Senha de acesso", type="password")
            btn_login = gr.Button("Entrar", variant="primary")

    with gr.Row(visible=False) as app_box:
        with gr.Column():
            gr.Markdown("""
            <h1 style="color:#d9534f;">🚨 Bem-vindo ao W.S.T.B.R 2000</h1>
            <p><b>Tradutor de Artigos Web em Português do Brasil, powered by GPT-4o-mini</b> 🌍<br>
            Tradução automática, formatação DOCX e scraping editorial refinado.</p>

            <details>
            <summary><strong>📘 Como usar este tradutor?</strong></summary>
            <ol>
            <li>Escolha um país com base no tema cultural mais marcante. 😎</li>
            <li>Defina quantos artigos deseja traduzir 📰. O padrão é 3.</li>
            <li>Clique em <b>"Executar"</b> e aguarde ⏳. Cada artigo pode levar um tempinho.</li>
            <li><b>Baixe os arquivos gerados 📥</b> no final.</li>
            </ol>
            </details>
            """)

            with gr.Row():
                pais_dropdown = gr.Dropdown(
                    label="🌍 Selecione o país",
                    choices=[nome for nome, _ in OPCOES_PAISES],
                    value="🇧🇷 Brasil (👑⚽🥅)"
                )
                qtd = gr.Number(label="🗞️ Número de artigos", value=3, minimum=1)

            btn = gr.Button("🚀 Iniciar Tradução", variant="primary")
            status = gr.Textbox(label="📌 Status do processo", interactive=False)
            arquivos = gr.File(label="📎 Arquivos traduzidos (.docx)", file_types=[".docx"], file_count="multiple")

            btn.click(fn=rodar_interface, inputs=[pais_dropdown, qtd], outputs=[status, arquivos])

    btn_login.click(fn=checar_senha, inputs=senha, outputs=[login_box, app_box])

# === Lançamento do app ===
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
