from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import os
import asyncio
from dotenv import load_dotenv
from pipeline import executar_pipeline

# 🔌 Carregar .env APENAS localmente (Render já usa Environment)
if os.environ.get("RENDER") is None:
    load_dotenv()

# 🔐 Função segura para pegar variáveis de ambiente
def get_env_var(nome):
    valor = os.getenv(nome)
    if not valor:
        print(f"⚠️ Variável de ambiente NÃO encontrada: {nome}")
    else:
        print(f"✅ Variável {nome} carregada com sucesso")
    return valor

# 🔐 Variáveis do sistema
APP_PASSWORD = get_env_var("APP_PASSWORD")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "chave_super_secreta_padrao")

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# 🌍 Mapa de países
MAPA_PAISES = {
    'pt_br': 'Brasil', 'en_us': 'Estados Unidos', 'en_ca': 'Canadá',
    'en_au': 'Austrália e Nova Zelândia', 'en_za': 'África do Sul', 'en_gb': 'Reino Unido',
    'es_es': 'Espanha', 'es_mx': 'México', 'fr_fr': 'França', 'nl_nl': 'Holanda',
    'en_eu': 'Europa (outros países)', 'en_ap': 'Ásia (outros países)',
    'en_la': 'América Latina (outros países)', 'es_la': 'América Latina (outros países)',
    'de_de': 'Alemanha', 'it_it': 'Itália', 'ja_jp': 'Japão', 'zh_cn': 'China', 'pt_pt': 'Portugal'
}

# 📂 Pasta de resultados (Render-safe)
PASTA_RESULTADOS = os.path.join(os.getcwd(), "resultados")
os.makedirs(PASTA_RESULTADOS, exist_ok=True)

print("📁 Pasta de resultados:", PASTA_RESULTADOS)

# 🔐 LOGIN
@app.route("/", methods=["GET", "POST"])
def login():
    erro = None

    if request.method == "POST":
        senha = request.form.get("password")

        # 🔎 DEBUG seguro (sem vazar senha)
        print("🔎 DEBUG - senha digitada:", "OK" if senha else "VAZIA")
        print("🔎 DEBUG - senha sistema:", "OK" if APP_PASSWORD else "NÃO CARREGADA")

        # 🚨 Verificação crítica
        if not APP_PASSWORD:
            print("🚨 ERRO CRÍTICO: APP_PASSWORD não definida no ambiente")
            erro = "Erro interno no servidor"
            return render_template("login.html", erro=erro)

        # ✅ Comparação segura
        if senha and senha.strip() == APP_PASSWORD.strip():
            print("✅ LOGIN OK")
            session["logado"] = True
            return redirect(url_for("home"))
        else:
            print("❌ LOGIN FALHOU")
            erro = "Senha incorreta"

    return render_template("login.html", erro=erro)


# 🏠 Página protegida
@app.route("/home")
def home():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("index.html")


# 📘 Página do manual
@app.route("/manual")
def manual():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("manual.html")


# 🌍 API de países
@app.route("/paises", methods=["GET"])
def get_paises():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401
    return jsonify(MAPA_PAISES)


# 🚀 Rodar scraper
@app.route("/rodar", methods=["POST"])
def rodar():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({"sucesso": False, "erro": "Nenhum dado recebido"}), 400

        pais = data.get("pais")
        quantidade = int(data.get("quantidade", 1))

        if pais not in MAPA_PAISES:
            return jsonify({"sucesso": False, "erro": "País inválido"}), 400

        print(f"🌍 País: {pais} | 📄 Quantidade: {quantidade}")

        status, arquivos = asyncio.run(
            executar_pipeline(
                pais_input=pais,
                alias_input=None,
                qtd_artigos=quantidade
            )
        )

        print("📂 Arquivos gerados:", arquivos)

        return jsonify({
            "sucesso": True,
            "status": status,
            "arquivos": arquivos
        })

    except Exception as e:
        print("❌ Erro no /rodar:", str(e))
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# 📥 Download
@app.route("/download/<path:nome_arquivo>", methods=["GET"])
def download(nome_arquivo):
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    caminho_completo = os.path.join(PASTA_RESULTADOS, nome_arquivo)
    print("📥 Tentando baixar:", caminho_completo)

    if os.path.exists(caminho_completo):
        return send_file(caminho_completo, as_attachment=True)
    else:
        print("❌ Arquivo não encontrado!")
        return jsonify({
            "erro": "Arquivo não encontrado",
            "caminho_recebido": nome_arquivo,
            "caminho_completo": caminho_completo
        }), 404


# 🚪 Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ▶️ Rodar servidor (Render OK)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
