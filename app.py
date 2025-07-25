import os
import gradio as gr
import asyncio
from pipeline import rodar_interface  # Usa a função com yield

print("🔧 Gradio version:", gr.__version__)

# === Mapa visual com países e emojis ===
OPCOES_PAISES = [
    ("🇧🇷 Brasil (👑⚽🥅)", "pt_br"),
    ("🇺🇸 Estados Unidos 🏈", "en_us"),
    ("🇨🇦 Canadá ❄️", "en_ca"),
    ("🇦🇺 Austrália e Nova Zelândia 🦘", "en_au"),
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
NOMES_TO_ALIAS = {nome: alias for nome, alias in OPCOES_PAISES}

# === Checagem de senha ===
def checar_senha(senha_input):
    with open("/etc/secrets/SCRAPER_PASSWORD") as f:
        senha_correta = f.read().strip()
    if senha_input == senha_correta:
        return (
            gr.update(visible=False),    # login_box
            gr.update(visible=True),     # app_box
            gr.update(visible=False),    # erro_senha
            gr.update(visible=True, value="✅ Login bem-sucedido! Bem-vindo 😄"),  # boas_vindas
            gr.update(value="")          # limpar campo senha
        )
    else:
        return (
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=True, value="❌ Senha incorreta. Tente novamente."),
            gr.update(visible=False),
            gr.update(value="")
        )

# === Wrapper para coroutine async com yield ===
def wrapper_gradio(pais_nome, qtd):
    async def _async_wrapper():
        alias = NOMES_TO_ALIAS.get(pais_nome, "")
        pais_formatado = pais_nome.split("(", 1)[0].strip()
        async for status, arquivos in rodar_interface(pais_formatado, alias, qtd):
            yield status, arquivos
    return _async_wrapper()

# === Interface ===
with gr.Blocks(title="W.S.T.B.R 2000 🧠🌍", theme=gr.themes.Soft()) as demo:
    with gr.Row(visible=True) as login_box:
        with gr.Column():
            senha = gr.Textbox(
                label="🔐 Senha de acesso",
                type="password",
                placeholder="Digite a senha para acessar"
            )
            btn_login = gr.Button("Entrar", variant="primary")
            erro_senha = gr.Markdown("", visible=False)

    boas_vindas = gr.Markdown("", visible=False)

    with gr.Row(visible=False) as app_box:
        with gr.Column():
            gr.Markdown("""
            <h1 style="color:#5c4dff;">🚀 Bem-vindo ao W.S.T.B.R 2000</h1>
            <p><b>Tradutor de Artigos Web em Português do Brasil, powered by GPT-4o-mini</b> 🌍<br>
            Tradução automática, formatação DOCX e scraping editorial refinado.</p>

            <details>
            <summary><strong>📘 Como usar este tradutor?</strong></summary>
            <ol>
            <li>Escolha um país com base no tema cultural mais marcante. 😎</li>
            <li>Defina quantos artigos deseja traduzir 📰. O padrão é 3.</li>
            <li>Clique em <b>"Iniciar Tradução"</b> e acompanhe o progresso ⏳.</li>
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
                qtd = gr.Number(label="🗞️ Número de artigos", value=3, minimum=1, maximum=45)

            btn = gr.Button("🛠️ Iniciar Tradução", variant="primary")

            status = gr.Markdown("⌛ Status aparecerá aqui", label="📌 Status do processo")
            arquivos = gr.File(label="📎 Arquivos traduzidos (.docx)", file_types=[".docx"], file_count="multiple")

            btn.click(
                fn=wrapper_gradio,
                inputs=[pais_dropdown, qtd],
                outputs=[status, arquivos],
                show_progress=True,
                stream=True  # ✅ esta é a forma correta!
            )

    btn_login.click(
        fn=checar_senha,
        inputs=senha,
        outputs=[login_box, app_box, erro_senha, boas_vindas, senha]
    )

# === Start ===
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
