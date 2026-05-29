from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import os
import asyncio
from dotenv import load_dotenv
from pipeline import executar_pipeline, executar_pipeline_selecionados
from scraper import coletar_links_artigos

# 🔌 Carregar .env APENAS localmente
if os.environ.get("RENDER") is None:
    load_dotenv()

# 🔐 Função para pegar senha (SECRET FILE + fallback ENV)
def get_password():
    # 1. Tenta SECRET FILE (Render)
    secret_path = "/etc/secrets/APP_PASSWORD"

    if os.path.exists(secret_path):
        try:
            with open(secret_path) as f:
                senha = f.read().strip()
                print("✅ Senha carregada via SECRET FILE")
                return senha
        except Exception as e:
            print("❌ Erro ao ler secret file:", e)

    # 2. Fallback: variável de ambiente
    senha_env = os.getenv("APP_PASSWORD")
    if senha_env:
        print("✅ Senha carregada via ENV")
        return senha_env

    # 3. Falhou tudo
    print("🚨 Nenhuma senha encontrada!")
    return None


# 🔐 Variáveis do sistema
APP_PASSWORD = get_password()
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

# 📂 Pasta de resultados
PASTA_RESULTADOS = os.path.join(os.getcwd(), "resultados")
os.makedirs(PASTA_RESULTADOS, exist_ok=True)

print("📁 Pasta de resultados:", PASTA_RESULTADOS)

# 🔐 LOGIN
@app.route("/", methods=["GET", "POST"])
def login():
    erro = None

    if request.method == "POST":
        senha = request.form.get("password")

        # 🔎 DEBUG seguro
        print("🔎 DEBUG - senha digitada:", "OK" if senha else "VAZIA")
        print("🔎 DEBUG - senha sistema:", "OK" if APP_PASSWORD else "NÃO CARREGADA")

        # 🚨 Verificação crítica
        if not APP_PASSWORD:
            print("🚨 ERRO CRÍTICO: senha não carregada")
            erro = "Erro interno no servidor"
            return render_template("login.html", erro=erro)

        # ✅ Comparação
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


# 📘 Manual
@app.route("/manual")
def manual():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("manual.html")


# 🌍 API países
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

    caminho = os.path.join(PASTA_RESULTADOS, nome_arquivo)
    print("📥 Download:", caminho)

    if os.path.exists(caminho):
        return send_file(caminho, as_attachment=True)
    else:
        print("❌ Arquivo não encontrado")
        return jsonify({"erro": "Arquivo não encontrado"}), 404


# 🔍 Página de pesquisa de artigos
@app.route("/pesquisar")
def pesquisar():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("pesquisar.html")


# 🔍 API: buscar lista de artigos disponíveis
@app.route("/buscar-artigos", methods=["POST"])
def buscar_artigos():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        data = request.get_json()
        pais = data.get("pais")
        busca = data.get("busca", "").strip().lower()

        if pais not in MAPA_PAISES:
            return jsonify({"sucesso": False, "erro": "País inválido"}), 400

        url_blog = f"https://www.tennantco.com/{pais}/blog.html"
        links = coletar_links_artigos(url_blog, pais)

        # Filtrar por busca textual se fornecida
        if busca:
            links = [l for l in links if busca in l.get("title", "").lower() or busca in l.get("href", "").lower()]

        return jsonify({
            "sucesso": True,
            "artigos": links,
            "total": len(links),
            "pais_nome": MAPA_PAISES.get(pais, pais)
        })

    except Exception as e:
        print("❌ Erro no /buscar-artigos:", str(e))
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# 🚀 Traduzir artigos selecionados
@app.route("/traduzir-selecionados", methods=["POST"])
def traduzir_selecionados():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        data = request.get_json()
        pais = data.get("pais")
        urls_selecionadas = data.get("urls", [])

        if pais not in MAPA_PAISES:
            return jsonify({"sucesso": False, "erro": "País inválido"}), 400

        if not urls_selecionadas:
            return jsonify({"sucesso": False, "erro": "Nenhum artigo selecionado"}), 400

        print(f"🎯 Traduzindo {len(urls_selecionadas)} artigos selecionados do país {pais}")

        status, arquivos = asyncio.run(
            executar_pipeline_selecionados(
                pais_input=pais,
                urls_selecionadas=urls_selecionadas
            )
        )

        return jsonify({
            "sucesso": True,
            "status": status,
            "arquivos": arquivos
        })

    except Exception as e:
        print("❌ Erro no /traduzir-selecionados:", str(e))
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# 🤖 Alfa — Assistente Inteligente
@app.route("/alfa")
def alfa():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("alfa.html")


# 🤖 Alfa — Chat endpoint com IA
@app.route("/alfa-chat", methods=["POST"])
def alfa_chat():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        import json
        import requests as req_lib

        data = request.get_json()
        mensagem     = data.get("mensagem", "").strip()
        historico    = data.get("historico", [])
        pais         = data.get("pais", "")
        pais_nome    = data.get("pais_nome", "")
        artigos      = data.get("artigos", [])

        if not mensagem:
            return jsonify({"erro": "Mensagem vazia"}), 400

        # ── System prompt da Alfa ──
        artigos_str = ""
        if artigos:
            linhas = [f"{i+1}. [{a.get('title','s/título')}] ({a.get('href','')})"
                      for i, a in enumerate(artigos[:200])]
            artigos_str = "\n".join(linhas)
        else:
            artigos_str = "(nenhum artigo carregado ainda)"

        system_prompt = f"""Você é Alfa, assistente inteligente da Alfa by Tennant Company.
Você ajuda a encontrar artigos dos blogs globais Tennant com base em temas, independente do idioma dos títulos.

PAÍS ATUAL: {pais_nome or 'não selecionado'} ({pais or '-'})

ARTIGOS DISPONÍVEIS ({len(artigos)} total):
{artigos_str}

INSTRUÇÕES:
- Responda SEMPRE em português brasileiro, de forma amigável e profissional.
- Quando o usuário pedir artigos sobre um tema (limpeza, sustentabilidade, produtos, manutenção, etc.),
  analise os títulos acima (que podem estar em qualquer idioma: inglês, espanhol, alemão, japonês, etc.)
  e identifique quais são relevantes para o tema pedido — usando seu conhecimento de idiomas.
- Se o usuário pedir "todos os artigos", retorne todos os URLs disponíveis.
- Se não houver artigos carregados, oriente o usuário a selecionar um país e carregar os artigos.
- Seja proativo: sugira próximos passos após filtrar.

FORMATO DA RESPOSTA (JSON puro, sem markdown, sem ```):
{{
  "texto": "resposta amigável em português",
  "acao": null,
  "artigos_filtrados": ["url1", "url2"]
}}

- "artigos_filtrados": lista de URLs dos artigos relevantes. Vazio [] se não há nada a mostrar.
- "acao": null normalmente. Use "selecionar_todos" se o usuário quiser todos.
- "texto": sempre preenchido com uma resposta clara e útil.
"""

        # ── Monta mensagens para a API ──
        messages = []
        for h in historico[-8:]:
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": mensagem})

        # ── Chama Anthropic API ──
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            # Fallback: resposta sem IA
            return jsonify({
                "texto": "⚠️ Chave de API da Alfa não configurada. Configure a variável ANTHROPIC_API_KEY.",
                "artigos_filtrados": [],
                "acao": None
            })

        resp = req_lib.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": messages
            },
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()

        raw_text = ""
        for block in result.get("content", []):
            if block.get("type") == "text":
                raw_text += block.get("text", "")

        # ── Parse JSON da resposta ──
        try:
            # Remove possíveis ```json``` wrappers
            clean = raw_text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
                clean = clean.strip()
            parsed = json.loads(clean)
        except Exception:
            parsed = {
                "texto": raw_text or "Não consegui processar a resposta.",
                "artigos_filtrados": [],
                "acao": None
            }

        return jsonify({
            "texto": parsed.get("texto", ""),
            "artigos_filtrados": parsed.get("artigos_filtrados", []),
            "acao": parsed.get("acao", None)
        })

    except Exception as e:
        print("❌ Erro no /alfa-chat:", str(e))
        return jsonify({"erro": f"Erro interno: {str(e)}"}), 500


# 🚪 Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ▶️ Run
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
