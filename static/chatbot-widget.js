/* ============================================================
   TENNIX — Chatbot Widget (estilo Botpress, canto da tela)
   ------------------------------------------------------------
   • Autossuficiente: injeta seu próprio HTML + CSS via Shadow DOM
     (não conflita com o CSS de nenhum site onde for embutido).
   • Configurável por window.TennixChatbotConfig ANTES do <script>.
   • Serve tanto para a página Manual (mesmo domínio, usa cookie de
     sessão) quanto para sites externos (usa token público).

   USO INTERNO (mesmo domínio):
     <script>window.TennixChatbotConfig = { endpoint: "/api/chatbot" };</script>
     <script src="/static/chatbot-widget.js"></script>

   USO EXTERNO (outro site):
     <script>
       window.TennixChatbotConfig = {
         endpoint: "https://SEU-APP.onrender.com/api/chatbot",
         token:    "SEU_TOKEN_PUBLICO"
       };
     </script>
     <script src="https://SEU-APP.onrender.com/chatbot-widget.js"></script>
   ============================================================ */
(function () {
  "use strict";

  // Evita carregar duas vezes na mesma página
  if (window.__tennixChatbotLoaded) return;
  window.__tennixChatbotLoaded = true;

  // ---------- Configuração (com valores padrão) ----------
  var userCfg = window.TennixChatbotConfig || {};
  var CFG = {
    endpoint:  userCfg.endpoint  || "/api/chatbot",
    token:     userCfg.token     || null,          // usado só em sites externos
    title:     userCfg.title     || "TENNIX",
    subtitle:  userCfg.subtitle  || "Assistente Tennant",
    welcome:   userCfg.welcome   || "Olá! 👋 Sou a TENNIX, assistente da Tennant Company. Como posso ajudar você hoje?",
    placeholder: userCfg.placeholder || "Escreva sua mensagem…",
    accent:    userCfg.accent    || "#009ac7",     // teal Tennant
    accent2:   userCfg.accent2   || "#015570",
    position:  userCfg.position  || "right",       // "right" ou "left"
    startOpen: !!userCfg.startOpen
  };

  var STORE_KEY = "tennix_chat_history";

  // ---------- Estado ----------
  var historico = [];   // [{role:"user"|"assistant", content:"..."}]
  try {
    var saved = sessionStorage.getItem(STORE_KEY);
    if (saved) historico = JSON.parse(saved) || [];
  } catch (e) { /* sessionStorage indisponível — segue em memória */ }

  function salvarHistorico() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(historico.slice(-30))); }
    catch (e) {}
  }

  // ---------- Host + Shadow DOM (isolamento total de CSS) ----------
  var host = document.createElement("div");
  host.id = "tennix-chatbot-host";
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483000";
  host.style[CFG.position === "left" ? "left" : "right"] = "0";
  host.style.bottom = "0";
  document.body.appendChild(host);

  var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  // ---------- CSS ----------
  var css = `
    :host, * { box-sizing: border-box; }
    .tx-wrap {
      --accent: ${CFG.accent};
      --accent2: ${CFG.accent2};
      font-family: 'Syne','Segoe UI',system-ui,-apple-system,sans-serif;
      position: fixed; bottom: 24px; ${CFG.position === "left" ? "left" : "right"}: 24px;
      z-index: 2147483000;
    }
    /* Botão flutuante */
    .tx-fab {
      width: 60px; height: 60px; border-radius: 50%;
      border: none; cursor: pointer;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 28px rgba(0,154,199,.45), 0 2px 8px rgba(0,0,0,.2);
      transition: transform .2s ease, box-shadow .2s ease;
      position: relative;
    }
    .tx-fab:hover { transform: scale(1.06); box-shadow: 0 10px 34px rgba(0,154,199,.6); }
    .tx-fab:active { transform: scale(.96); }
    .tx-fab svg { width: 28px; height: 28px; }
    .tx-fab .tx-close-ico { display: none; }
    .tx-wrap.open .tx-fab .tx-open-ico { display: none; }
    .tx-wrap.open .tx-fab .tx-close-ico { display: block; }
    .tx-badge {
      position: absolute; top: -2px; right: -2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #8dc63f; border: 2px solid #fff;
      animation: tx-pulse 2s infinite;
    }
    @keyframes tx-pulse { 0%{box-shadow:0 0 0 0 rgba(141,198,63,.6)} 70%{box-shadow:0 0 0 8px rgba(141,198,63,0)} 100%{box-shadow:0 0 0 0 rgba(141,198,63,0)} }

    /* Painel */
    .tx-panel {
      position: absolute; bottom: 76px; ${CFG.position === "left" ? "left" : "right"}: 0;
      width: 380px; max-width: calc(100vw - 32px);
      height: 560px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 18px; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,.28), 0 4px 12px rgba(0,0,0,.12);
      transform: translateY(16px) scale(.96); opacity: 0; pointer-events: none;
      transition: transform .22s cubic-bezier(.4,0,.2,1), opacity .22s ease;
    }
    .tx-wrap.open .tx-panel { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

    /* Cabeçalho */
    .tx-head {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 12px;
    }
    .tx-avatar {
      width: 40px; height: 40px; border-radius: 12px; flex: none;
      background: rgba(255,255,255,.18); display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; letter-spacing: .5px;
    }
    .tx-head-txt { flex: 1; min-width: 0; }
    .tx-head-title { font-weight: 800; font-size: 15px; line-height: 1.1; }
    .tx-head-sub { font-size: 12px; opacity: .85; display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .tx-dot { width: 7px; height: 7px; border-radius: 50%; background: #8dc63f; box-shadow: 0 0 6px #8dc63f; }
    .tx-head-x { background: none; border: none; color: #fff; cursor: pointer; opacity: .8; padding: 4px; border-radius: 8px; display: flex; }
    .tx-head-x:hover { opacity: 1; background: rgba(255,255,255,.15); }

    /* Corpo / mensagens */
    .tx-body {
      flex: 1; overflow-y: auto; padding: 18px 16px; background: #f1f2f2;
      display: flex; flex-direction: column; gap: 12px;
    }
    .tx-body::-webkit-scrollbar { width: 6px; }
    .tx-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 3px; }

    .tx-msg { max-width: 82%; padding: 11px 14px; font-size: 14px; line-height: 1.5; border-radius: 16px; white-space: pre-wrap; word-wrap: break-word; }
    .tx-msg.bot  { align-self: flex-start; background: #fff; color: #1a1a1a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .tx-msg.user { align-self: flex-end; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border-bottom-right-radius: 4px; }
    .tx-msg a { color: var(--accent); }
    .tx-msg.user a { color: #fff; text-decoration: underline; }

    .tx-typing { align-self: flex-start; background: #fff; padding: 12px 16px; border-radius: 16px; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.08); display: flex; gap: 4px; }
    .tx-typing span { width: 7px; height: 7px; border-radius: 50%; background: #b8bcc0; animation: tx-bounce 1.3s infinite; }
    .tx-typing span:nth-child(2){ animation-delay:.2s } .tx-typing span:nth-child(3){ animation-delay:.4s }
    @keyframes tx-bounce { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }

    /* Rodapé / input */
    .tx-foot { padding: 12px; background: #fff; border-top: 1px solid #e8e9e9; }
    .tx-inrow { display: flex; align-items: flex-end; gap: 8px; background: #f1f2f2; border-radius: 14px; padding: 6px 6px 6px 14px; border: 1px solid transparent; transition: border-color .15s; }
    .tx-inrow:focus-within { border-color: var(--accent); background: #fff; }
    .tx-input { flex: 1; border: none; background: none; outline: none; resize: none; font: inherit; font-size: 14px; color: #1a1a1a; max-height: 96px; padding: 6px 0; line-height: 1.4; }
    .tx-send { width: 38px; height: 38px; flex: none; border: none; border-radius: 10px; cursor: pointer; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; display: flex; align-items: center; justify-content: center; transition: transform .15s, opacity .15s; }
    .tx-send:hover { transform: scale(1.06); } .tx-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }
    .tx-send svg { width: 18px; height: 18px; }
    .tx-brand { text-align: center; font-size: 10.5px; color: #898b8e; margin-top: 8px; letter-spacing: .3px; }
    .tx-brand b { color: var(--accent); }

    @media (max-width: 460px) {
      .tx-wrap { bottom: 16px; ${CFG.position === "left" ? "left" : "right"}: 16px; }
      .tx-panel { width: calc(100vw - 24px); height: calc(100vh - 100px); bottom: 72px; }
    }
  `;

  // ---------- HTML ----------
  var iconChat = '<svg viewBox="0 0 24 24" fill="none" class="tx-open-ico"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.02.84 3.86 2.24 5.28L4 21l4.9-1.28C10 20.55 11 20.7 12 20.7c4.97 0 9-3.58 9-8s-4.03-9-9-9z" fill="currentColor"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24" fill="none" class="tx-close-ico"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var iconSend = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-4 16-4-6-8-2z" fill="currentColor"/></svg>';
  var iconX = '<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var initials = (CFG.title || "TX").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "TX";

  var wrap = document.createElement("div");
  wrap.className = "tx-wrap" + (CFG.startOpen ? " open" : "");
  wrap.innerHTML =
    '<div class="tx-panel">' +
      '<div class="tx-head">' +
        '<div class="tx-avatar">' + initials + '</div>' +
        '<div class="tx-head-txt">' +
          '<div class="tx-head-title">' + esc(CFG.title) + '</div>' +
          '<div class="tx-head-sub"><span class="tx-dot"></span>' + esc(CFG.subtitle) + '</div>' +
        '</div>' +
        '<button class="tx-head-x" data-act="close" title="Fechar">' + iconX + '</button>' +
      '</div>' +
      '<div class="tx-body" id="tx-body"></div>' +
      '<div class="tx-foot">' +
        '<div class="tx-inrow">' +
          '<textarea class="tx-input" id="tx-input" rows="1" placeholder="' + esc(CFG.placeholder) + '"></textarea>' +
          '<button class="tx-send" id="tx-send" title="Enviar">' + iconSend + '</button>' +
        '</div>' +
        '<div class="tx-brand">Powered by <b>TENNIX</b> · Tennant Company</div>' +
      '</div>' +
    '</div>' +
    '<button class="tx-fab" data-act="toggle" aria-label="Abrir chat">' + iconChat + iconClose + '<span class="tx-badge"></span></button>';

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  shadow.appendChild(styleEl);
  shadow.appendChild(wrap);

  // ---------- Referências ----------
  var body  = shadow.getElementById("tx-body");
  var input = shadow.getElementById("tx-input");
  var sendBtn = shadow.getElementById("tx-send");
  var enviando = false;

  // ---------- Eventos ----------
  wrap.addEventListener("click", function (e) {
    var act = e.target.closest("[data-act]");
    if (!act) return;
    var a = act.getAttribute("data-act");
    if (a === "toggle") togglePanel();
    if (a === "close")  wrap.classList.remove("open");
  });

  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });
  sendBtn.addEventListener("click", enviar);

  function togglePanel() {
    wrap.classList.toggle("open");
    if (wrap.classList.contains("open")) { setTimeout(function(){ input.focus(); }, 250); scrollToEnd(); }
  }

  // ---------- Render inicial ----------
  if (historico.length) {
    historico.forEach(function (m) { addMsg(m.content, m.role === "user" ? "user" : "bot", false); });
  } else {
    addMsg(CFG.welcome, "bot", false);
  }
  scrollToEnd();

  // ---------- Funções ----------
  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  }

  function addMsg(texto, tipo, salvar) {
    var el = document.createElement("div");
    el.className = "tx-msg " + (tipo === "user" ? "user" : "bot");
    el.innerHTML = linkify(esc(texto));
    body.appendChild(el);
    scrollToEnd();
    if (salvar) { historico.push({ role: tipo === "user" ? "user" : "assistant", content: texto }); salvarHistorico(); }
    return el;
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "tx-typing"; t.id = "tx-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t); scrollToEnd();
  }
  function hideTyping() { var t = shadow.getElementById("tx-typing"); if (t) t.remove(); }

  function scrollToEnd() { requestAnimationFrame(function(){ body.scrollTop = body.scrollHeight; }); }

  function enviar() {
    var texto = input.value.trim();
    if (!texto || enviando) return;
    enviando = true; sendBtn.disabled = true;

    addMsg(texto, "user", true);
    input.value = ""; autoGrow();
    showTyping();

    var headers = { "Content-Type": "application/json" };
    if (CFG.token) headers["X-Widget-Token"] = CFG.token;

    fetch(CFG.endpoint, {
      method: "POST",
      headers: headers,
      credentials: CFG.token ? "omit" : "include", // sessão no mesmo domínio; token em site externo
      body: JSON.stringify({ mensagem: texto, historico: historico.slice(-10) })
    })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      hideTyping();
      if (!res.ok || res.j.erro) {
        addMsg("⚠️ " + (res.j.erro || "Não consegui responder agora. Tente novamente."), "bot", false);
      } else {
        addMsg(res.j.texto || "…", "bot", true);
      }
    })
    .catch(function () {
      hideTyping();
      addMsg("⚠️ Erro de conexão. Verifique sua internet e tente de novo.", "bot", false);
    })
    .finally(function () { enviando = false; sendBtn.disabled = false; input.focus(); });
  }

  // ---------- Utilitários ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function linkify(s) {
    return s.replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
  }

  // API pública opcional (para abrir/fechar via código do site host)
  window.TennixChatbot = {
    open:  function () { wrap.classList.add("open"); },
    close: function () { wrap.classList.remove("open"); },
    toggle: togglePanel,
    reset: function () { historico = []; salvarHistorico(); body.innerHTML = ""; addMsg(CFG.welcome, "bot", false); }
  };
})();
