from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import os
import asyncio
import json
from datetime import datetime, date
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
 
        print("🔎 DEBUG - senha digitada:", "OK" if senha else "VAZIA")
        print("🔎 DEBUG - senha sistema:", "OK" if APP_PASSWORD else "NÃO CARREGADA")
 
        if not APP_PASSWORD:
            print("🚨 ERRO CRÍTICO: senha não carregada")
            erro = "Erro interno no servidor"
            return render_template("login.html", erro=erro)
 
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
 
        _enfileirar_notificacao(
            "sucesso",
            "Tradução concluída!",
            f"{len(arquivos)} arquivo(s) gerado(s) para {MAPA_PAISES.get(pais, pais)}."
        )
        return jsonify({
            "sucesso": True,
            "status": status,
            "arquivos": arquivos
        })
 
    except Exception as e:
        print("❌ Erro no /rodar:", str(e))
        _enfileirar_notificacao("erro", "Erro na tradução", str(e)[:120])
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
 
        _enfileirar_notificacao(
            "sucesso",
            "Artigos traduzidos!",
            f"{len(arquivos)} arquivo(s) gerado(s)."
        )
        return jsonify({
            "sucesso": True,
            "status": status,
            "arquivos": arquivos
        })
 
    except Exception as e:
        print("❌ Erro no /traduzir-selecionados:", str(e))
        _enfileirar_notificacao("erro", "Erro ao traduzir selecionados", str(e)[:120])
        return jsonify({"sucesso": False, "erro": str(e)}), 500
 
 
# 🤖 Alfa — Assistente Inteligente
@app.route("/alfa")
def alfa():
    if not session.get("logado"):
        return redirect(url_for("login"))
    return render_template("alfa.html")
 
 
# 🤖 Alfa — Chat endpoint com IA (Gemini)
@app.route("/alfa-chat", methods=["POST"])
def alfa_chat():
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401
 
    try:
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
- Quando o usuário pedir artigos sobre um tema, analise os títulos acima (em qualquer idioma) e identifique quais são relevantes.
- Se o usuário pedir "todos os artigos", retorne todos os URLs disponíveis.
- Se não houver artigos carregados, oriente o usuário a selecionar um país e carregar os artigos.
 
REGRA CRÍTICA DE FORMATO:
Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido. Nada antes, nada depois.
NÃO escreva texto livre. NÃO use markdown. NÃO use ```. APENAS o JSON abaixo:
 
{{"texto": "sua resposta amigável em português aqui", "acao": null, "artigos_filtrados": ["url1", "url2"], "tipo_filtro": null}}
 
Campos obrigatórios:
- "texto": string com resposta clara em português (ex: "Encontrei 6 artigos sobre limpeza industrial:")
- "artigos_filtrados": array de URLs relevantes, ou [] se nenhum
- "acao": null, ou "selecionar_todos" se o usuário quiser todos os artigos
- "tipo_filtro": null, ou um dos valores "produto","dica","case","feriado","conteudo","outro" se o usuário filtrar por tipo
"""
 
        # ── Monta histórico para a OpenAI ──
        messages = [{"role": "system", "content": system_prompt}]
        for h in historico[-8:]:
            role = h.get("role", "")
            content_h = h.get("content", "")
            if not content_h or role not in ("user", "assistant"):
                continue
            messages.append({"role": role, "content": content_h})

        # Adiciona a mensagem atual
        messages.append({"role": "user", "content": mensagem})

        # ── Chama a API da OpenAI ──
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        print(f"🔑 OPENAI_API_KEY: {'OK' if api_key else 'NÃO CONFIGURADA'}")

        if not api_key:
            return jsonify({
                "texto": "⚠️ Chave de API da Alfa não configurada. Configure a variável OPENAI_API_KEY no Render.",
                "artigos_filtrados": [],
                "acao": None
            })

        resp = req_lib.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "gpt-4o-mini",
                "max_tokens": 2000,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": messages
            },
            timeout=30
        )
        if not resp.ok:
            print("❌ OpenAI error:", resp.status_code, resp.text[:300])
        resp.raise_for_status()
        result = resp.json()

        # ── Extrai texto da resposta da OpenAI ──
        raw_text = ""
        try:
            raw_text = result["choices"][0]["message"]["content"]
        except Exception as e:
            print("❌ Erro ao extrair texto da OpenAI:", e)

        print("📨 OpenAI raw_text:", raw_text[:300])
 
        # ── Parse JSON robusto ──
        # Tenta várias estratégias para extrair o JSON mesmo que o modelo
        # coloque texto livre antes ou depois
        def extrair_json(text):
            import re
            text = text.strip()
 
            # 1. Tenta direto (ideal — response_format funcionou)
            try:
                return json.loads(text)
            except Exception:
                pass
 
            # 2. Remove blocos ```json ... ``` ou ``` ... ```
            text_sem_md = re.sub(r'```json\s*', '', text)
            text_sem_md = re.sub(r'```\s*', '', text_sem_md).strip()
            try:
                return json.loads(text_sem_md)
            except Exception:
                pass
 
            # 3. Encontra o primeiro { ... } completo no texto (ignora texto livre ao redor)
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
 
            return None
 
        parsed = extrair_json(raw_text)
 
        if not parsed:
            print("⚠️ Não conseguiu parsear JSON. raw_text:", raw_text[:500])
            parsed = {
                "texto": "Desculpe, tive um problema ao processar a resposta. Tente novamente.",
                "artigos_filtrados": [],
                "acao": None
            }
 
        return jsonify({
            "texto":             parsed.get("texto", ""),
            "artigos_filtrados": parsed.get("artigos_filtrados", []),
            "acao":              parsed.get("acao", None),
            "tipo_filtro":       parsed.get("tipo_filtro", None),
        })
 
    except Exception as e:
        print("❌ Erro no /alfa-chat:", str(e))
        return jsonify({"erro": f"Erro interno: {str(e)}"}), 500
 
 
# ─────────────────────────────────────────────────────────────
# 📅 CRONOGRAMA — tipos de conteúdo reconhecidos pelo CSS
# ─────────────────────────────────────────────────────────────
TIPOS_CONTEUDO = ["produto", "dica", "case", "feriado", "conteudo", "outro"]

# 📅 CRONOGRAMA — listar posts do cronograma
@app.route("/cronograma", methods=["GET"])
def get_cronograma():
    """Retorna todos os posts do cronograma.
    Suporta filtros: ?mes=6&ano=2026&tipo=produto
    """
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    mes  = request.args.get("mes",  type=int)
    ano  = request.args.get("ano",  type=int, default=date.today().year)
    tipo = request.args.get("tipo", "").strip().lower()

    caminho = os.path.join(os.getcwd(), "cronograma.json")
    if not os.path.exists(caminho):
        return jsonify({"sucesso": True, "posts": [], "total": 0})

    with open(caminho, encoding="utf-8") as f:
        posts = json.load(f)

    # Filtra por ano
    posts = [p for p in posts if p.get("ano", ano) == ano]

    # Filtra por mês se informado
    if mes:
        posts = [p for p in posts if p.get("mes") == mes]

    # Filtra por tipo se informado e válido
    if tipo and tipo in TIPOS_CONTEUDO:
        posts = [p for p in posts if p.get("tipo", "outro") == tipo]

    return jsonify({"sucesso": True, "posts": posts, "total": len(posts)})


# 📅 CRONOGRAMA — salvar / substituir posts
@app.route("/cronograma", methods=["POST"])
def salvar_cronograma():
    """Recebe lista de posts e persiste em cronograma.json.
    Body: { "posts": [ { dia, mes, ano, tema, conteudo, tipo, status }, ... ] }
    """
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        data = request.get_json()
        posts = data.get("posts", [])

        # Valida e normaliza cada post
        normalizados = []
        for p in posts:
            tipo   = p.get("tipo", "outro").lower()
            status = p.get("status", "pendente").lower()
            normalizados.append({
                "dia":      int(p.get("dia", 1)),
                "mes":      int(p.get("mes", 1)),
                "ano":      int(p.get("ano", date.today().year)),
                "tema":     str(p.get("tema", "")).strip(),
                "conteudo": str(p.get("conteudo", "")).strip(),
                "tipo":     tipo   if tipo   in TIPOS_CONTEUDO          else "outro",
                "status":   status if status in ("publicado", "agendado", "pendente") else "pendente",
            })

        caminho = os.path.join(os.getcwd(), "cronograma.json")
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(normalizados, f, ensure_ascii=False, indent=2)

        print(f"📅 Cronograma salvo: {len(normalizados)} posts")
        return jsonify({"sucesso": True, "total": len(normalizados)})

    except Exception as e:
        print("❌ Erro no /cronograma POST:", e)
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# 📅 CRONOGRAMA — atualizar status de um post (publicado / agendado / pendente)
@app.route("/cronograma/status", methods=["PATCH"])
def atualizar_status_post():
    """Body: { "dia": 10, "mes": 6, "ano": 2026, "status": "publicado" }"""
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        data   = request.get_json()
        dia    = int(data.get("dia"))
        mes    = int(data.get("mes"))
        ano    = int(data.get("ano", date.today().year))
        status = data.get("status", "pendente").lower()

        if status not in ("publicado", "agendado", "pendente"):
            return jsonify({"sucesso": False, "erro": "Status inválido"}), 400

        caminho = os.path.join(os.getcwd(), "cronograma.json")
        if not os.path.exists(caminho):
            return jsonify({"sucesso": False, "erro": "Cronograma não encontrado"}), 404

        with open(caminho, encoding="utf-8") as f:
            posts = json.load(f)

        atualizados = 0
        for p in posts:
            if p.get("dia") == dia and p.get("mes") == mes and p.get("ano") == ano:
                p["status"] = status
                atualizados += 1

        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)

        return jsonify({"sucesso": True, "atualizados": atualizados})

    except Exception as e:
        print("❌ Erro no /cronograma/status:", e)
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# ─────────────────────────────────────────────────────────────
# 📊 MÉTRICAS — painel rápido da sidebar
# ─────────────────────────────────────────────────────────────
@app.route("/metricas", methods=["GET"])
def get_metricas():
    """Retorna métricas agregadas para os cards da sidebar."""
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    hoje = date.today()
    ano  = hoje.year

    # Conta arquivos gerados
    total_arquivos = 0
    try:
        total_arquivos = len([
            f for f in os.listdir(PASTA_RESULTADOS)
            if os.path.isfile(os.path.join(PASTA_RESULTADOS, f))
        ])
    except Exception:
        pass

    # Lê cronograma para calcular métricas de posts
    posts_publicados = 0
    posts_agendados  = 0
    posts_total_ano  = 0
    proximo_post     = None

    caminho = os.path.join(os.getcwd(), "cronograma.json")
    if os.path.exists(caminho):
        try:
            with open(caminho, encoding="utf-8") as f:
                posts = json.load(f)

            posts_ano = [p for p in posts if p.get("ano") == ano]
            posts_total_ano  = len(posts_ano)
            posts_publicados = sum(1 for p in posts_ano if p.get("status") == "publicado")
            posts_agendados  = sum(1 for p in posts_ano if p.get("status") == "agendado")

            # Próximo post: menor data >= hoje com status agendado ou pendente
            futuros = [
                p for p in posts_ano
                if p.get("status") in ("agendado", "pendente")
                and date(p.get("ano", ano), p.get("mes", 1), p.get("dia", 1)) >= hoje
            ]
            if futuros:
                futuros.sort(key=lambda p: date(p["ano"], p["mes"], p["dia"]))
                prox = futuros[0]
                data_prox = date(prox["ano"], prox["mes"], prox["dia"])
                delta = (data_prox - hoje).days
                proximo_post = {
                    "dia":    prox["dia"],
                    "mes":    prox["mes"],
                    "ano":    prox["ano"],
                    "tema":   prox.get("tema", ""),
                    "tipo":   prox.get("tipo", "outro"),
                    "status": prox.get("status", "pendente"),
                    "dias_restantes": delta,
                    "data_fmt": data_prox.strftime("%d/%m/%Y"),
                }
        except Exception as e:
            print("⚠️ Erro ao ler cronograma para métricas:", e)

    # Progresso anual (% de posts publicados em relação ao total)
    pct_anual = round((posts_publicados / posts_total_ano * 100) if posts_total_ano else 0, 1)

    return jsonify({
        "sucesso": True,
        "metricas": {
            "arquivos_gerados": total_arquivos,
            "posts_publicados": posts_publicados,
            "posts_agendados":  posts_agendados,
            "posts_total_ano":  posts_total_ano,
            "progresso_anual_pct": pct_anual,
        },
        "proximo_post": proximo_post,
    })


# ─────────────────────────────────────────────────────────────
# 🏷️  FILTROS — tipos de conteúdo disponíveis
# ─────────────────────────────────────────────────────────────
@app.route("/tipos-conteudo", methods=["GET"])
def get_tipos_conteudo():
    """Retorna os tipos disponíveis para os filtro-chips do CSS."""
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    labels = {
        "produto":  {"label": "Produto",   "icone": "fa-box"},
        "dica":     {"label": "Dica",      "icone": "fa-lightbulb"},
        "case":     {"label": "Case",      "icone": "fa-star"},
        "feriado":  {"label": "Feriado",   "icone": "fa-calendar"},
        "conteudo": {"label": "Conteúdo",  "icone": "fa-file-alt"},
        "outro":    {"label": "Outro",     "icone": "fa-tag"},
    }
    return jsonify({"sucesso": True, "tipos": labels})


# ─────────────────────────────────────────────────────────────
# 🔔 TOAST — endpoint para notificações server-side (opcional)
# Permite que o back-end enfileire toasts a serem exibidos
# na próxima requisição do front-end.
# ─────────────────────────────────────────────────────────────
@app.route("/notificacoes", methods=["GET"])
def get_notificacoes():
    """Retorna notificações pendentes para a sessão e as limpa."""
    if not session.get("logado"):
        return jsonify({"erro": "Não autorizado"}), 401

    notifs = session.pop("notificacoes", [])
    return jsonify({"sucesso": True, "notificacoes": notifs})


def _enfileirar_notificacao(tipo: str, titulo: str, mensagem: str = ""):
    """Helper interno: adiciona toast à sessão Flask.
    tipo: 'sucesso' | 'aviso' | 'erro' | 'info'
    """
    notifs = session.get("notificacoes", [])
    notifs.append({"tipo": tipo, "titulo": titulo, "mensagem": mensagem})
    session["notificacoes"] = notifs


# 🚪 Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))
 
 
# ▶️ Run
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
 
