import os
import gradio as gr
import asyncio
import pathlib
from pipeline import executar_pipeline

# === Caminho do Banner ===
banner_path = pathlib.Path(__file__).parent / "assets" / "logo_tennant_scraper.png"

# === Mapa visual com países ===
OPCOES_PAISES = [
    ("Brasil", "pt_br"),
    ("Estados Unidos", "en_us"),
    ("Canadá", "en_ca"),
    ("Austrália e Nova Zelândia", "en_au"),
    ("Reino Unido", "en_gb"),
    ("Espanha", "es_es"),
    ("México", "es_mx"),
    ("França", "fr_fr"),
    ("Holanda", "nl_nl"),
    ("Europa", "en_eu"),
    ("Ásia", "en_ap"),
    ("América Latina", "en_la"),
    ("Alemanha", "de_de"),
    ("Itália", "it_it"),
    ("Japão", "ja_jp"),
    ("China", "zh_cn"),
    ("Portugal", "pt_pt"),
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
            gr.update(visible=True, value="Senha inválida."),
            gr.update(visible=False),
            gr.update(value="")
        )

# === Execução principal ===
async def rodar_interface(pais_nome, qtd):
    alias = NOMES_TO_ALIAS.get(pais_nome, "")
    try:
        return await executar_pipeline(pais_nome, alias, qtd)
    except Exception as e:
        return f"Erro durante a execução: {str(e)}", []

# === Interface ===
with gr.Blocks(
    title="W.S.T.B.R 2000",
    theme=gr.themes.Soft()
) as demo:

    # ===== LOGIN =====
    with gr.Row(visible=True) as login_box:
        with gr.Column(max_width=420):
            gr.Markdown("### Acesso restrito")
            senha = gr.Textbox(
                label="Senha",
                type="password",
                placeholder="Informe a senha de acesso"
            )
            btn_login = gr.Button("Entrar", variant="primary")
            erro_senha = gr.Markdown("", visible=False)

    boas_vindas = gr.Markdown("", visible=False)

    # ===== APLICATIVO =====
    with gr.Row(visible=False) as app_box:
        with gr.Column():

            if banner_path.exists():
                gr.Image(value=str(banner_path), show_label=False, height=160)

            gr.Markdown("""
### Web Scraper & Tradutor de Artigos Técnicos

Ferramenta interna para **coleta, tradução editorial e formatação profissional**
de artigos do blog institucional da Tennant.

- Tradução automática para **Português do Brasil**
- Preservação de termos técnicos e marcas
- Geração de arquivos **.DOCX prontos para publicação**
""")

            gr.Markdown("""
---

#### Instruções de uso

1. Selecione o país de origem dos artigos  
2. Defina a quantidade de artigos a processar  
3. Inicie a execução e aguarde a finalização  
4. Faça o download dos arquivos gerados  

O sistema evita artigos duplicados e ignora conteúdos inválidos automaticamente.
""")

            with gr.Row():
                pais_dropdown = gr.Dropdown(
                    label="País de origem dos artigos",
                    choices=[nome for nome, _ in OPCOES_PAISES],
                    value="Brasil"
                )

                qtd = gr.Number(
                    label="Quantidade de artigos",
                    value=3,
                    minimum=1,
                    maximum=45,
                    precision=0
                )

            btn = gr.Button("Executar processamento", variant="primary")

            status = gr.Textbox(
                label="Status da execução",
                interactive=False
            )

            arquivos = gr.File(
                label="Arquivos gerados",
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
