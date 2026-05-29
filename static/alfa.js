/* ═════════════════════════════════════════
   ALFA.JS — Lógica do chat assistente
   Alfa by Tennant Company
═════════════════════════════════════════ */

// ─── ESTADO ───────────────────────────────
let historico = [];           // histórico de mensagens para a API
let artigosDisponiveis = [];  // todos artigos carregados
let selecionados = new Set(); // URLs selecionadas
let paisAtual = '';
let paisNomeAtual = '';
let enviando = false;

// ─── REFS ─────────────────────────────────
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const btnSend        = document.getElementById('btn-send');
const selectPais     = document.getElementById('pais-alfa');
const btnCarregar    = document.getElementById('btn-carregar');
const artigosStatus  = document.getElementById('artigos-status');
const selecaoBadge   = document.getElementById('selecao-badge');
const selecaoCount   = document.getElementById('selecao-count');
const btnTraduzir    = document.getElementById('btn-traduzir');
const loadingOverlay = document.getElementById('loading-overlay');

// ─── INIT ─────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    await carregarPaises();
    mostrarBemVindo();
    chatInput.focus();
});

// ─── CARREGAR PAÍSES ──────────────────────
async function carregarPaises() {
    try {
        const r = await fetch('/paises', { credentials: 'include' });
        if (r.status === 401) { window.location.href = '/'; return; }
        const paises = await r.json();
        selectPais.innerHTML = '';
        Object.entries(paises)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([cod, nome]) => {
                const o = document.createElement('option');
                o.value = cod; o.textContent = nome;
                selectPais.appendChild(o);
            });
    } catch {
        selectPais.innerHTML = '<option>Erro ao carregar</option>';
    }
}

// ─── WELCOME ──────────────────────────────
function mostrarBemVindo() {
    const now = horaAtual();
    chatMessages.innerHTML = '';
    adicionarMsgAlfa(
        `Olá! Sou a **Alfa**, sua assistente inteligente da Tennant. 👋\n\nPosso te ajudar a encontrar artigos dos blogs globais Tennant com base em temas, independente do idioma em que estão publicados.\n\n**Como começar:**\n1. Selecione um país na barra lateral\n2. Clique em **"Carregar artigos"**\n3. Me diga o que você precisa — por exemplo: *"quero artigos sobre limpeza industrial"* ou *"mostre posts sobre sustentabilidade"*\n\nEstou pronta para ajudar! 🌿`,
        now
    );
}

// ─── CARREGAR ARTIGOS ─────────────────────
btnCarregar.addEventListener('click', async () => {
    const pais = selectPais.value;
    const paisNome = selectPais.options[selectPais.selectedIndex].text;

    btnCarregar.disabled = true;
    btnCarregar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
    artigosStatus.style.display = 'none';

    adicionarMsgUsuario(`Carregar artigos disponíveis de: ${paisNome}`);
    adicionarTyping();

    try {
        const r = await fetch('/buscar-artigos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais, busca: '' })
        });
        if (r.status === 401) { window.location.href = '/'; return; }

        const data = await r.json();
        removerTyping();

        if (!data.sucesso) {
            adicionarMsgAlfa(`⚠️ Não consegui carregar os artigos de **${paisNome}**. Verifique a conexão e tente novamente.`);
            return;
        }

        artigosDisponiveis = data.artigos || [];
        paisAtual = pais;
        paisNomeAtual = paisNome;
        selecionados.clear();
        atualizarSelecaoBadge();

        artigosStatus.style.display = 'flex';
        artigosStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${artigosDisponiveis.length} artigos carregados`;

        adicionarMsgAlfa(
            `✅ Carreguei **${artigosDisponiveis.length} artigos** do blog da Tennant em **${paisNome}**.\n\nAgora me diga o que você está procurando! Por exemplo:\n- *"Filtre apenas artigos sobre limpeza"*\n- *"Quero posts sobre sustentabilidade"*\n- *"Mostre todos os artigos"*`
        );

    } catch (err) {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro de conexão ao carregar os artigos. Tente novamente.');
    } finally {
        btnCarregar.disabled = false;
        btnCarregar.innerHTML = '<i class="fa-solid fa-rotate"></i> Carregar artigos';
    }
});

// ─── ENVIAR MENSAGEM ──────────────────────
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
    }
});
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

window.enviarMensagem = async function() {
    const texto = chatInput.value.trim();
    if (!texto || enviando) return;

    enviando = true;
    btnSend.disabled = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';

    adicionarMsgUsuario(texto);
    adicionarTyping();

    // Build context for Alfa
    const contexto = {
        mensagem: texto,
        historico: historico.slice(-10), // últimas 10 trocas
        pais: paisAtual,
        pais_nome: paisNomeAtual,
        artigos: artigosDisponiveis  // envia lista para o backend filtrar com IA
    };

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(contexto)
        });

        if (r.status === 401) { window.location.href = '/'; return; }

        const data = await r.json();
        removerTyping();

        if (data.erro) {
            adicionarMsgAlfa('⚠️ ' + data.erro);
        } else {
            // Adiciona ao histórico
            historico.push({ role: 'user', content: texto });
            historico.push({ role: 'assistant', content: data.texto || '' });

            // Renderiza resposta
            adicionarMsgAlfa(data.texto || '', null, data.artigos_filtrados || null);

            // Se tinha sugestões do tipo "selecionar todos"
            if (data.acao === 'selecionar_todos' && artigosDisponiveis.length > 0) {
                artigosDisponiveis.forEach(a => selecionados.add(a.href));
                atualizarSelecaoBadge();
                document.querySelectorAll('.artigo-chat-card').forEach(c => c.classList.add('selecionado'));
            }
        }

    } catch (err) {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro de conexão. Verifique o servidor e tente novamente.');
    } finally {
        enviando = false;
        btnSend.disabled = false;
        chatInput.focus();
    }
};

// ─── SUGESTÕES ────────────────────────────
window.usarSugestao = function(texto) {
    chatInput.value = texto;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    enviarMensagem();
};

// ─── RENDERIZAR ARTIGOS ───────────────────
function renderizarArtigosNoChat(artigos) {
    if (!artigos || artigos.length === 0) return null;

    const wrap = document.createElement('div');
    wrap.className = 'artigos-chat-wrap';

    // Barra select all
    const bar = document.createElement('div');
    bar.className = 'artigos-select-bar';
    bar.innerHTML = `
        <span><i class="fa-solid fa-file-lines"></i> ${artigos.length} artigo${artigos.length !== 1 ? 's' : ''} encontrado${artigos.length !== 1 ? 's' : ''}</span>
        <button onclick="selecionarTodosDoGrupo(this)">Selecionar todos</button>
    `;
    wrap.appendChild(bar);

    artigos.forEach((art, i) => {
        const card = document.createElement('div');
        card.className = 'artigo-chat-card';
        if (selecionados.has(art.href)) card.classList.add('selecionado');
        card.dataset.url = art.href;
        card.dataset.titulo = art.title || art.href;
        card.style.animationDelay = `${Math.min(i * 0.04, 0.5)}s`;

        const slug = (() => {
            try { return new URL(art.href).pathname.split('/').slice(-1)[0].replace('.html',''); }
            catch { return art.href; }
        })();

        card.innerHTML = `
            <div class="artigo-chat-check"><i class="fa-solid fa-check"></i></div>
            <div class="artigo-chat-info">
                <div class="artigo-chat-title" title="${escHtml(art.title || art.href)}">${escHtml(art.title || 'Sem título')}</div>
                <div class="artigo-chat-url">${escHtml(slug)}</div>
            </div>
            <a href="${escHtml(art.href)}" target="_blank" class="artigo-chat-link" onclick="event.stopPropagation()" title="Abrir original">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `;

        card.addEventListener('click', () => toggleCard(card, art.href));
        wrap.appendChild(card);
    });

    return wrap;
}

window.selecionarTodosDoGrupo = function(btn) {
    const wrap = btn.closest('.artigos-select-bar').nextSibling
        ? btn.closest('.artigos-chat-wrap') : null;
    if (!wrap) return;

    const cards = wrap.querySelectorAll('.artigo-chat-card');
    const todosSelected = Array.from(cards).every(c => c.classList.contains('selecionado'));

    cards.forEach(card => {
        const url = card.dataset.url;
        if (todosSelected) {
            selecionados.delete(url);
            card.classList.remove('selecionado');
        } else {
            selecionados.add(url);
            card.classList.add('selecionado');
        }
    });

    btn.textContent = todosSelected ? 'Selecionar todos' : 'Desmarcar todos';
    atualizarSelecaoBadge();
};

function toggleCard(card, url) {
    if (selecionados.has(url)) {
        selecionados.delete(url);
        card.classList.remove('selecionado');
    } else {
        selecionados.add(url);
        card.classList.add('selecionado');
    }
    atualizarSelecaoBadge();
}

function atualizarSelecaoBadge() {
    const n = selecionados.size;
    selecaoCount.textContent = n;
    selecaoBadge.style.display = n > 0 ? 'flex' : 'none';
    btnTraduzir.style.display = n > 0 ? 'flex' : 'none';
}

// ─── TRADUZIR ────────────────────────────
window.traduzirSelecionados = async function() {
    if (selecionados.size === 0 || !paisAtual) return;

    const urls = Array.from(selecionados);
    loadingOverlay.style.display = 'flex';

    adicionarMsgUsuario(`Traduzir ${urls.length} artigo${urls.length !== 1 ? 's' : ''} selecionado${urls.length !== 1 ? 's' : ''}`);

    try {
        const r = await fetch('/traduzir-selecionados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais: paisAtual, urls })
        });

        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        loadingOverlay.style.display = 'none';

        if (data.sucesso) {
            const arquivos = data.arquivos || [];
            const dlWrap = document.createElement('div');
            dlWrap.className = 'downloads-chat-wrap';

            arquivos.forEach((arq, i) => {
                const nome = arq.includes('/') ? arq.split('/').pop() : arq;
                const a = document.createElement('a');
                a.href = `/download/${encodeURIComponent(arq)}`;
                a.className = 'dl-chat-item';
                a.innerHTML = `
                    <span class="dl-chat-icon"><i class="fa-regular fa-file-word"></i></span>
                    <span class="dl-chat-info">
                        <span class="dl-chat-label">Artigo ${i + 1}</span>
                        <span class="dl-chat-name">${escHtml(nome)}</span>
                    </span>
                    <i class="fa-solid fa-arrow-down dl-chat-arrow"></i>
                `;
                dlWrap.appendChild(a);
            });

            adicionarMsgAlfa(
                `✅ Tradução concluída! **${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''}** pronto${arquivos.length !== 1 ? 's' : ''} para download:`,
                null, null, dlWrap
            );

            selecionados.clear();
            atualizarSelecaoBadge();

        } else {
            adicionarMsgAlfa('⚠️ Erro ao traduzir: ' + (data.erro || 'falha desconhecida'));
        }

    } catch (err) {
        loadingOverlay.style.display = 'none';
        adicionarMsgAlfa('⚠️ Erro de conexão durante a tradução.');
    }
};

// ─── HELPERS DE MENSAGEM ─────────────────
function adicionarMsgUsuario(texto) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    row.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-user" style="font-size:12px"></i></div>
        <div class="msg-bubble">
            <div class="msg-text">${escHtml(texto)}</div>
            <div class="msg-time">${horaAtual()}</div>
        </div>
    `;
    chatMessages.appendChild(row);
    scrollBottom();
}

function adicionarMsgAlfa(texto, hora = null, artigosFiltrados = null, extraEl = null) {
    const row = document.createElement('div');
    row.className = 'msg-row alfa';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    const msgText = document.createElement('div');
    msgText.className = 'msg-text';
    msgText.innerHTML = formatarMarkdown(texto);
    bubble.appendChild(msgText);

    const msgTime = document.createElement('div');
    msgTime.className = 'msg-time';
    msgTime.textContent = hora || horaAtual();
    bubble.appendChild(msgTime);

    // Renderizar artigos filtrados
    if (artigosFiltrados && artigosFiltrados.length > 0) {
        // Mapear URLs para objetos completos
        const artigosObj = artigosFiltrados.map(url => {
            const found = artigosDisponiveis.find(a => a.href === url);
            return found || { href: url, title: url };
        });
        const cardsEl = renderizarArtigosNoChat(artigosObj);
        if (cardsEl) bubble.appendChild(cardsEl);
    }

    // Extra element (downloads, etc)
    if (extraEl) bubble.appendChild(extraEl);

    row.innerHTML = `<div class="msg-avatar">A</div>`;
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollBottom();
}

function adicionarTyping() {
    const row = document.createElement('div');
    row.className = 'msg-row alfa typing-row';
    row.innerHTML = `
        <div class="msg-avatar">A</div>
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatMessages.appendChild(row);
    scrollBottom();
}

function removerTyping() {
    const t = chatMessages.querySelector('.typing-row');
    if (t) t.remove();
}

// ─── FORMATAÇÃO MARKDOWN SIMPLES ─────────
function formatarMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function horaAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function scrollBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}
