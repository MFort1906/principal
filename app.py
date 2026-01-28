import os
import gradio as gr
import asyncio
import pathlib
from pipeline import executar_pipeline

# === Caminho do Banner ===
banner_path = pathlib.Path(__file__).parent / "assets" / "LOGO W.S.T.B.R.png"

# === Países ===
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

# === Senha ===
def checar_senha(senha_input):
    with open("/etc/secrets/SCRAPER_PASSWORD") as f:
        senha_correta = f.read().strip()

    if senha_input == senha_correta:
        return (
            gr.update(visible=False),
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=True, value="Acesso autorizado."),
            gr.update(value="")
        )
    else:
        return (
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=True, value="Senha incorreta."),
            gr.update(visible=False),
            gr.update(value="")
        )

# === Execução ===
async def rodar_interface(pais_nome, qtd):
    alias = NOMES_TO_ALIAS.get(pais_nome, "")
    try:
        return await executar_pipeline(pais_nome, alias, qtd)
    except Exception as e:
        return f"Erro: {str(e)}", []

# === Tema Corporativo ===
tema_corporativo = gr.themes.Base(
    primary_hue="blue",
    secondary_hue="blue",
    neutral_hue="gray",
    font=["Inter", "ui-sans-serif", "system-ui"]
)

# === Interface Gradio ===
with gr.Blocks(title="W.S.T.B.R 2000", theme=tema_corporativo) as demo:

    # ----------------------------
    # LOGIN CARD
    # ----------------------------
    with gr.Row(visible=True) as login_box:
        with gr.Column(scale=1):
            gr.Markdown("## 🔐 Acesso ao sistema")
            senha = gr.Textbox(
                label="Senha",
                type="password",
                placeholder="Digite a senha de acesso",
            )
            btn_login = gr.Button("Entrar", variant="primary")
            erro_senha = gr.Markdown("", visible=False)

    boas_vindas = gr.Markdown("", visible=False)

    # ----------------------------
    # APP PRINCIPAL
    # ----------------------------
    with gr.Row(visible=False) as app_box:
        # Coluna esquerda: entrada e informações
        with gr.Column(scale=1):
            if banner_path.exists():
                gr.Image(value=str(banner_path), show_label=False, height=120)

            gr.Markdown(
                """
                ## W.S.T.B.R 2000
                Plataforma corporativa de scraping e tradução automatizada.
                """
            )

            gr.Markdown(
                """
                <details>
                <summary><strong>Documentação técnica</strong></summary>
                <br>
                **Objetivo:** Coletar artigos institucionais, traduzir e gerar DOCX padrão editorial.<br>
                **Fluxo:** Selecionar país → Definir quantidade → Executar → Baixar arquivos.<br>
                **Automatizações:** Remoção de conteúdo promocional, deduplicação e validação de imagens.
                </details>
                """
            )

            gr.Markdown("---")

            # Seleção de país e quantidade
            pais_dropdown = gr.Dropdown(
                label="País de origem",
                choices=[nome for nome, _ in OPCOES_PAISES],
                value="🇧🇷 Brasil",
                interactive=True
            )

            qtd = gr.Number(
                label="Quantidade de artigos",
                value=3,
                minimum=1,
                maximum=45
            )

            btn = gr.Button("▶️ Iniciar processamento", variant="primary")

        # Coluna direita: status e arquivos
        with gr.Column(scale=1):
            status = gr.Textbox(
                label="Status",
                interactive=False,
                placeholder="Status aparecerá aqui...",
                lines=8
            )

            arquivos = gr.File(
                label="Arquivos gerados (.docx)",
                file_types=[".docx"],
                file_count="multiple"
            )

    # ----------------------------
    # Conexões de eventos
    # ----------------------------
    btn_login.click(
        fn=checar_senha,
        inputs=senha,
        outputs=[login_box, app_box, erro_senha, boas_vindas, senha]
    )

    btn.click(
        fn=rodar_interface,
        inputs=[pais_dropdown, qtd],
        outputs=[status, arquivos],
        show_progress=True
    )

# === Start ===
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.getenv("PORT", 7860))
    )
