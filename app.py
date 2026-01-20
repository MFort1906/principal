import os
import gradio as gr
import asyncio
import pathlib
from pipeline import executar_pipeline

# === Caminho do Banner ===
banner_path = pathlib.Path(__file__).parent / "assets" / "logo_tennant_scraper.png"

# === Mapa visual com países ===
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

# === Checagem de senha ===
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

# === Execução principal ===
async def rodar_interface(pais_nome, qtd):
    alias = NOMES_TO_ALIAS.get(pais_nome, "")
    pais_formatado = pais_nome.strip()
    try:
        return await executar_pipeline(pais_formatado, alias, qtd)
    except Exception as e:
        return f"Erro: {str(e)}", []

# === Interface ===
with gr.Blocks(title="W.S.T.B.R 2000") as demo:

    # ===== LOGIN =====
    with gr.Row(visible=True) as login_box:
        with gr.Column():
            gr.Markdown("### Acesso ao sistema")
            senha = gr.Textbox(
                label="Senha",
                type="password",
                placeholder="Digite a senha de acesso"
            )
            btn_login = gr.Button("Entrar", variant="primary")
            erro_senha = gr.Markdown("", visible=False)

    boas_vindas = gr.Markdown("", visible=False)

    # ===== APLICAÇÃO =====
    with gr.Row(visible=False) as app_box:
        with gr.Column():

            # Banner
            if banner_path.exists():
                gr.Image(value=str(banner_path), show_label=False, height=160)

            # Título
            gr.Markdown("""
            <h2 style="text-align:center; margin-bottom:6px;">
            W.S.T.B.R 2000
            </h2>

            <p style="text-align:center; font-size:15px; color:#555;">
            Sistema corporativo para scraping, tradução editorial e geração automática de artigos em DOCX.
            </p>
            """)

            # Manual técnico (recolhido)
            gr.Markdown("""
            <details>
            <summary><strong>Documentação de uso</strong></summary>

            <br>

            <b>Finalidade</b><br>
            Coletar artigos do blog institucional da Tennant, traduzir para português do Brasil
            com qualidade editorial e gerar documentos formatados em DOCX.

            <br><br>

            <b>Fluxo de execução</b>
            <ol>
                <li>Selecionar o país de origem</li>
                <li>Definir a quantidade de artigos</li>
                <li>Iniciar o processamento</li>
                <li>Realizar o download dos arquivos gerados</li>
            </ol>

            <b>Observações técnicas</b>
            <ul>
                <li>Artigos duplicados são ignorados automaticamente</li>
                <li>Imagens são validadas antes da inserção</li>
                <li>Termos técnicos e marcas são preservados</li>
            </ul>
            </details>
            """)

            # Inputs principais
            with gr.Row():
                pais_dropdown = gr.Dropdown(
                    label="País de origem dos artigos",
                    choices=[nome for nome, _ in OPCOES_PAISES],
                    value="🇧🇷 Brasil"
                )

                qtd = gr.Number(
                    label="Quantidade de artigos",
                    value=3,
                    minimum=1,
                    maximum=45
                )

            btn = gr.Button("Iniciar processamento", variant="primary")

            status = gr.Textbox(
                label="Status",
                interactive=False
            )

            arquivos = gr.File(
                label="Arquivos gerados (.docx)",
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
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.getenv("PORT", 7860))
    )
