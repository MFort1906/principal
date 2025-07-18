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
async def rodar_interface(pais, alias, qtd):
    status_msg = f"🔄 Coletando artigos de: {pais}"
    try:
        arquivos = await executar_pipeline(pais, alias, qtd)
        return "✅ Tradução concluída!", arquivos, gr.update(visible=False)
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
            <li>Digite o país ou termo associado. Pode ser o nome oficial ou uma palavra típica como "carnaval", "tulipa", "taco", "neymar"... o sistema entende! 😎</li>
            <li><i>(Opcional)</i> Informe o código do país se quiser ensinar um novo termo. Exemplo: você digita <code>macarrão</code> e diz que isso deve ser <code>it_it</code> (Itália).</li>
            <li>Escolha quantos artigos quer traduzir 📰. O padrão é 3, mas você pode subir isso conforme sua fome por conteúdo.</li>
            <li>Clique em <b>"Executar"</b>. O sistema vai buscar os artigos, traduzir com GPT-4o-mini, e gerar arquivos <code>.docx</code> prontos pra baixar.</li>
            <li><b>Espere alguns minutos ⏳</b>. A tradução é feita bloco a bloco com cuidado editorial. Confia no processo. 🤝</li>
            <li><b>Baixe os arquivos gerados 📥</b>. Eles vão aparecer no campo de download no final.</li>
            </ol>
            </details>
            """, label=None)

            with gr.Row():
                with gr.Column():
                    pais = gr.Textbox(label="🌍 País ou termo característico", placeholder="ex: Holanda, taco, SP")
                    alias = gr.Textbox(label="🌐 Alias (opcional)", placeholder="ex: en_us")
                    qtd = gr.Number(label="🗞️ Número de artigos", value=3)

            btn = gr.Button("🚀 Iniciar Tradução", variant="primary")
            status = gr.Textbox(label="📌 Status do processo", interactive=False)
            arquivos = gr.File(label="📎 Arquivos traduzidos (.docx)", file_types=[".docx"], file_count="multiple")

            btn.click(fn=rodar_interface, inputs=[pais, alias, qtd], outputs=[status, arquivos, alias])

    btn_login.click(fn=checar_senha, inputs=senha, outputs=[login_box, app_box])

# === Lançamento do app ===
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", 7860)))
