import os
import gradio as gr
import pathlib
from pipeline import executar_pipeline

# ==========================================================
# Assets
# ==========================================================

banner_path = pathlib.Path(__file__).parent / "assets" / "logo_tennant_scraper.png"

# ==========================================================
# Países
# ==========================================================

OPCOES_PAISES = [
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

# ==========================================================
# Segurança
# ==========================================================

def checar_senha(senha_input):
    with open("/etc/secrets/SCRAPER_PASSWORD") as f:
        senha_correta = f.read().strip()

    if senha_input == senha_correta:
        return (
            gr.update(visible=False),
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=True, value="✅ Acesso liberado. Bem-vindo!"),
            gr.update(value="")
        )

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
                    label="🌍 País",
                    choices=[nome for nome, _ in OPCOES_PAISES],
                    value="🇧🇷 Brasil"
                )

                qtd = gr.Number(
                    label="📰 Quantidade de artigos",
                    value=3,
                    minimum=1,
                    maximum=45
                )

            btn = gr.Button("🚀 Iniciar Tradução", variant="primary")

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

# ==========================================================
# Start
# ==========================================================

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
