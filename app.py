import os
import gradio as gr
import asyncio
import pathlib
from pipeline import executar_pipeline

# === Caminho do Banner ===
# ==========================================================
# Assets
# ==========================================================

banner_path = pathlib.Path(__file__).parent / "assets" / "logo_tennant_scraper.png"

# === Mapa visual com países e emojis ===
# ==========================================================
# Países
# ==========================================================

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
    ("🇧🇷 Brasil", "pt_br"),
    ("🇺🇸 Estados Unidos", "en_us"),
    ("🇨🇦 Canadá", "en_ca"),
    ("🇦🇺 Austrália e Nova Zelândia", "en_au"),
    ("🇬🇧 Reino Unido", "en_gb"),
    ("🇪🇸 Espanha", "es_es"),
    ("🇲🇽 México", "es_mx"),
    ("🇫🇷 França", "fr_fr"),
    ("🇳🇱 Holanda", "nl_nl"),
    ("🇪🇺 Europa", "en_eu"),
    ("🌏 Ásia", "en_ap"),
    ("🌎 América Latina", "en_la"),
    ("🇩🇪 Alemanha", "de_de"),
    ("🇮🇹 Itália", "it_it"),
    ("🇯🇵 Japão", "ja_jp"),
    ("🇨🇳 China", "zh_cn"),
    ("🇵🇹 Portugal", "pt_pt"),
]

NOMES_TO_ALIAS = {nome: alias for nome, alias in OPCOES_PAISES}

# === Checagem de senha ===
# ==========================================================
# Segurança
# ==========================================================

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
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=True, value="✅ Acesso liberado. Bem-vindo!"),
            gr.update(value="")
        )

# === Execução principal ===
    return (
        gr.update(visible=True),
        gr.update(visible=False),
        gr.update(visible=True, value="❌ Senha incorreta."),
        gr.update(visible=False),
        gr.update(value="")
    )

# ==========================================================
# Execução
# ==========================================================

async def rodar_interface(pais_nome, qtd):
    alias = NOMES_TO_ALIAS.get(pais_nome, "")
    pais_formatado = pais_nome.split("(", 1)[0].strip()
    try:
        return await executar_pipeline(pais_formatado, alias, qtd)
    except Exception as e:
        return f"❌ Erro: {str(e)}", [], gr.update(visible=True)

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
    alias = NOMES_TO_ALIAS.get(pais_nome)
    pais_formatado = pais_nome.strip()
    return await executar_pipeline(pais_formatado, alias, qtd)

# ==========================================================
# Interface
# ==========================================================

with gr.Blocks(
    title="W.S.T.B.R 2000",
    theme=gr.themes.Soft(
        primary_hue="red",
        secondary_hue="gray"
    )
) as demo:

    # ================= LOGIN =================
    with gr.Card(visible=True) as login_box:
        gr.Markdown("## 🔐 Acesso ao Sistema")

        senha = gr.Textbox(
            label="Senha",
            type="password",
            placeholder="Digite a senha de acesso"
        )

        btn_login = gr.Button("Entrar", variant="primary")
        erro_senha = gr.Markdown("", visible=False)

    boas_vindas = gr.Markdown("", visible=False)

    with gr.Row(visible=False) as app_box:
        with gr.Column():
            # === Banner centralizado ===
            if banner_path.exists():
                gr.Image(value=str(banner_path), show_label=False, height=180)
            else:
                gr.Markdown("⚠️ Banner não encontrado")
    # ================= APP =================
    with gr.Column(visible=False) as app_box:

        # Banner
        if banner_path.exists():
            gr.Image(value=str(banner_path), show_label=False, height=160)

        gr.Markdown("""
        # 🌍 W.S.T.B.R 2000
        **Web Scraper & Tradutor de Artigos para PT-BR**  
        Tradução editorial refinada + arquivos DOCX automatizados.
        """)

        # Manual
        with gr.Card():
            gr.Markdown("""
            <h1 style="color:#d9534f; text-align:center; margin-top: 0;">🚨 Bem-vindo ao W.S.T.B.R 2000</h1>
            <p style="text-align:center; font-size:16px;">
            <b>Tradutor de Artigos Web em Português do Brasil, powered by GPT-4o-mini</b> 🌍<br>
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
            ### 🧭 Como usar (rápido)
            **1️⃣ Escolha o país** de origem dos artigos  
            **2️⃣ Defina a quantidade** desejada  
            **3️⃣ Clique em iniciar** e aguarde  
            **4️⃣ Baixe os arquivos ao final**
            
            ⏳ *O processo pode levar alguns minutos por artigo.*
            """)

        # Controles
        with gr.Card():
            with gr.Row():
                pais_dropdown = gr.Dropdown(
                    label="🌍 Selecione o país",
                    label="🌍 País",
                    choices=[nome for nome, _ in OPCOES_PAISES],
                    value="🇧🇷 Brasil (👑⚽🥅)"
                    value="🇧🇷 Brasil"
                )

                qtd = gr.Number(
                    label="📰 Quantidade de artigos",
                    value=3,
                    minimum=1,
                    maximum=45
                )
                qtd = gr.Number(label="🗞️ Número de artigos", value=3, minimum=1, maximum=45)

            btn = gr.Button("🚀 Iniciar Tradução", variant="primary")
            status = gr.Textbox(label="📌 Status do processo", interactive=False)
            arquivos = gr.File(label="📎 Arquivos traduzidos (.docx)", file_types=[".docx"], file_count="multiple")
            loading = gr.Markdown("⏳ Processando...", visible=False)

            btn.click(
                fn=rodar_interface,
                inputs=[pais_dropdown, qtd],
                outputs=[status, arquivos],
                show_progress=True
            ).then(
                fn=lambda: gr.update(visible=False), inputs=None, outputs=loading

        # Resultados
        with gr.Card():
            status = gr.Textbox(label="📌 Status", interactive=False)
            arquivos = gr.File(
                label="📎 Arquivos DOCX",
                file_types=[".docx"],
                file_count="multiple"
            )

        btn.click(
            fn=rodar_interface,
            inputs=[pais_dropdown, qtd],
            outputs=[status, arquivos],
            show_progress=True
        )

    btn_login.click(
        fn=checar_senha,
        inputs=senha,
        outputs=[login_box, app_box, erro_senha, boas_vindas, senha]
    )

# === Start ===
# ==========================================================
# Start
# ==========================================================

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
