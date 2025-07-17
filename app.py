import os
import gradio as gr
import asyncio
from pipeline import executar_pipeline

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
async def rodar_interface(pais_input, alias_input, qtd_artigos):
    status_msg = f"🔄 Coletando artigos de: {pais_input}"
    arquivos = await executar_pipeline(pais_input, alias_input, qtd_artigos)
    return "✅ Tradução concluída!", arquivos, gr.update(visible=False)

# === Interface Gradio ===
with gr.Blocks(title="Tradutor de Artigos Tennant") as demo:
    with gr.Row(visible=True) as login_box:
        senha = gr.Textbox(label="Senha", type="password")
        btn_login = gr.Button("Entrar")

    with gr.Row(visible=False) as app_box:
        gr.Markdown("## 🌍 Tradução de Artigos Tennant")
        with gr.Row():
            pais = gr.Textbox(label="País ou termo", placeholder="ex: Brasil, taco, croissant...")
            alias = gr.Textbox(label="Alias (opcional)", placeholder="ex: en_us")
        qtd = gr.Number(label="Quantidade de Artigos", value=3)

        btn = gr.Button("Executar")
        status = gr.Textbox(label="Status", interactive=False)
        arquivos = gr.File(label="Arquivos traduzidos", file_types=[".docx"], file_count="multiple")

        btn.click(fn=rodar_interface, inputs=[pais, alias, qtd], outputs=[status, arquivos, alias])

    btn_login.click(fn=checar_senha, inputs=senha, outputs=[login_box, app_box])

# === Lançamento do app ===
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
