/* ═════════════════════════════════════════
   ALFA.JS — Assistente Inteligente Tennant
   v2.0 — Marketing Edition
═════════════════════════════════════════ */

// ─── ESTADO ──────────────────────────────
let historico       = [];
let artigosDisponiveis = [];
let selecionados    = new Set();
let paisAtual       = '';
let paisNomeAtual   = '';
let enviando        = false;
let historicoSessao = []; // [{pais, tema, artigos, timestamp}]
let todosOsPaises   = {};

// ─── REFS ────────────────────────────────
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
const loadingText    = document.getElementById('loading-text');

// ─── INIT ────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    await carregarPaises();
    mostrarBemVindo();
    chatInput.focus();
});

// ─── PAÍSES ──────────────────────────────
async function carregarPaises() {
    try {
        const r = await fetch('/paises', { credentials: 'include' });
        if (r.status === 401) { window.location.href = '/'; return; }
        todosOsPaises = await r.json();

        const sorted = Object.entries(todosOsPaises).sort((a,b) => a[1].localeCompare(b[1]));
        selectPais.innerHTML = '';
        sorted.forEach(([cod, nome]) => {
            const o = document.createElement('option');
            o.value = cod; o.textContent = nome;
            selectPais.appendChild(o);
        });

        // Popula select do modal comparar
        const selectB = document.getElementById('comparar-pais-b');
        if (selectB) {
            selectB.innerHTML = '';
            sorted.forEach(([cod, nome]) => {
                const o = document.createElement('option');
                o.value = cod; o.textContent = nome;
                selectB.appendChild(o);
            });
        }
    } catch {
        selectPais.innerHTML = '<option>Erro ao carregar</option>';
    }
}

// ─── WELCOME ─────────────────────────────
function mostrarBemVindo() {
    chatMessages.innerHTML = '';
    adicionarMsgAlfa(
        `Olá! Sou a **Alfa**, sua assistente de marketing da Tennant. 👋\n\nAlém de encontrar e traduzir artigos, agora tenho novas ferramentas para o seu dia a dia:\n\n**📝 Briefing** — gero uma pauta de conteúdo a partir dos artigos\n**🔍 Resumir** — resumo qualquer artigo em português\n**🌍 Comparar** — identifico lacunas de conteúdo entre países\n**📋 Exportar** — baixe a lista de artigos em CSV\n**🕐 Histórico** — reveja buscas anteriores desta sessão\n\nPara começar: selecione um país e clique em **"Carregar artigos"**! 🌿`
    );
}

// ─── CARREGAR ARTIGOS ────────────────────
btnCarregar.addEventListener('click', async () => {
    const pais = selectPais.value;
    const paisNome = selectPais.options[selectPais.selectedIndex].text;

    btnCarregar.disabled = true;
    btnCarregar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
    artigosStatus.style.display = 'none';
    adicionarMsgUsuario(`Carregar artigos de: ${paisNome}`);
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
            adicionarMsgAlfa(`⚠️ Não consegui carregar os artigos de **${paisNome}**. Verifique a conexão.`);
            return;
        }

        artigosDisponiveis = data.artigos || [];
        paisAtual = pais;
        paisNomeAtual = paisNome;
        selecionados.clear();
        atualizarSelecaoBadge();

        artigosStatus.style.display = 'flex';
        artigosStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${artigosDisponiveis.length} artigos carregados`;

        // Atualiza label do modal comparar
        const labelA = document.getElementById('comparar-pais-a');
        if (labelA) labelA.textContent = paisNome;

        adicionarMsgAlfa(
            `✅ Carreguei **${artigosDisponiveis.length} artigos** do blog da Tennant em **${paisNome}**.\n\nO que deseja fazer?\n- *"Filtre artigos sobre limpeza"* — para buscar por tema\n- Clique em **Briefing** na sidebar — para gerar uma pauta\n- Clique em **Comparar** — para ver diferenças com outro país`
        );

    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro de conexão ao carregar os artigos.');
    } finally {
        btnCarregar.disabled = false;
        btnCarregar.innerHTML = '<i class="fa-solid fa-rotate"></i> Carregar artigos';
    }
});

// ─── ENVIAR MENSAGEM ─────────────────────
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
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

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                mensagem: texto,
                historico: historico.slice(-10),
                pais: paisAtual,
                pais_nome: paisNomeAtual,
                artigos: artigosDisponiveis
            })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();

        if (data.erro) {
            adicionarMsgAlfa('⚠️ ' + data.erro);
        } else {
            historico.push({ role: 'user', content: texto });
            historico.push({ role: 'assistant', content: data.texto || '' });
            const artigos = data.artigos_filtrados || [];
            adicionarMsgAlfa(data.texto || '', null, artigos);

            // Salva no histórico de sessão se filtrou artigos
            if (artigos.length > 0) {
                salvarHistoricoSessao(texto, artigos);
            }
        }
    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro de conexão. Verifique o servidor e tente novamente.');
    } finally {
        enviando = false;
        btnSend.disabled = false;
        chatInput.focus();
    }
};

window.usarSugestao = function(texto) {
    chatInput.value = texto;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    enviarMensagem();
};

// ─── HISTÓRICO DE SESSÃO ─────────────────
function salvarHistoricoSessao(tema, artigos) {
    historicoSessao.unshift({
        tema,
        artigos: artigos.slice(),
        pais: paisNomeAtual,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    if (historicoSessao.length > 20) historicoSessao.pop();
}

window.verHistorico = function() {
    if (historicoSessao.length === 0) {
        adicionarMsgAlfa('📭 Nenhuma busca registrada nesta sessão ainda. Filtre artigos por tema e elas aparecerão aqui!');
        return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'historico-wrap';

    historicoSessao.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'historico-item';
        row.innerHTML = `
            <div class="hist-meta">
                <span class="hist-time">${item.timestamp}</span>
                <span class="hist-pais"><i class="fa-solid fa-earth-americas"></i> ${escHtml(item.pais)}</span>
                <span class="hist-count">${item.artigos.length} artigo${item.artigos.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="hist-tema">${escHtml(item.tema)}</div>
            <button class="hist-recarregar" onclick="recarregarBusca(${i})">
                <i class="fa-solid fa-rotate-right"></i> Usar esta busca
            </button>
        `;
        wrap.appendChild(row);
    });

    adicionarMsgAlfa(`🕐 **Histórico desta sessão** (${historicoSessao.length} busca${historicoSessao.length !== 1 ? 's' : ''}):`, null, null, wrap);
};

window.recarregarBusca = function(idx) {
    const item = historicoSessao[idx];
    if (!item) return;
    const artigosObj = item.artigos.map(url => {
        if (typeof url === 'string') {
            const found = artigosDisponiveis.find(a => a.href === url);
            return found || { href: url, title: extrairTituloSlug(url) };
        }
        return url;
    });
    adicionarMsgAlfa(`🔁 Recarregando busca: *"${item.tema}"* — **${artigosObj.length} artigos**`, null, artigosObj);
};

// ─── EXPORTAR LISTA CSV ──────────────────
window.exportarLista = function() {
    const fonte = selecionados.size > 0
        ? artigosDisponiveis.filter(a => selecionados.has(a.href))
        : artigosDisponiveis;

    if (fonte.length === 0) {
        adicionarMsgAlfa('⚠️ Carregue artigos antes de exportar. Se quiser exportar apenas alguns, selecione-os primeiro.');
        return;
    }

    const label = selecionados.size > 0 ? `${selecionados.size} selecionados` : `${fonte.length} artigos`;
    adicionarMsgUsuario(`Exportar lista — ${label}`);

    // Gera CSV
    const linhas = ['Título,URL,País'];
    fonte.forEach(a => {
        const titulo = (a.title || '').replace(/"/g, '""');
        const url = a.href || '';
        linhas.push(`"${titulo}","${url}","${paisNomeAtual}"`);
    });
    const csv = linhas.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `artigos_tennant_${paisAtual}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Mostra confirmação no chat
    const dlWrap = document.createElement('div');
    dlWrap.className = 'export-confirm';
    dlWrap.innerHTML = `
        <div class="export-icon"><i class="fa-solid fa-file-csv"></i></div>
        <div class="export-info">
            <div class="export-title">Lista exportada com sucesso!</div>
            <div class="export-sub">${fonte.length} artigos · ${paisNomeAtual} · CSV UTF-8</div>
        </div>
    `;
    adicionarMsgAlfa(`✅ Arquivo CSV gerado e baixado! Compatível com Excel e Google Sheets.`, null, null, dlWrap);
};

// ─── MODAL: BRIEFING ─────────────────────
window.abrirModalBriefing = function() {
    if (artigosDisponiveis.length === 0) {
        adicionarMsgAlfa('⚠️ Carregue os artigos de um país antes de gerar um briefing!');
        return;
    }
    document.getElementById('briefing-tema').value = '';
    document.getElementById('modal-briefing').style.display = 'flex';
    setTimeout(() => document.getElementById('briefing-tema').focus(), 100);
};

window.gerarBriefing = async function() {
    const tema = document.getElementById('briefing-tema').value.trim();
    const tom = document.querySelector('input[name="briefing-tom"]:checked')?.value || 'profissional';
    fecharModal('modal-briefing');

    if (!tema) {
        adicionarMsgAlfa('⚠️ Informe o tema do briefing.');
        return;
    }

    adicionarMsgUsuario(`📝 Gerar briefing de pauta — tema: "${tema}" · tom: ${tom}`);
    adicionarTyping();

    // Filtra artigos relevantes ao tema via IA
    const prompt = `Você é especialista em marketing de conteúdo da Tennant Company.

Analise os artigos disponíveis abaixo e gere um BRIEFING DE PAUTA COMPLETO em português brasileiro para o tema: "${tema}".
Tom desejado: ${tom}.

ARTIGOS DISPONÍVEIS (${artigosDisponiveis.length} total):
${artigosDisponiveis.slice(0, 100).map((a, i) => `${i+1}. [${a.title || 'sem título'}] (${a.href})`).join('\n')}

O briefing deve conter:
1. **Objetivo do conteúdo** (2-3 linhas)
2. **Público-alvo** 
3. **Artigos de referência** (liste os mais relevantes para o tema, com URL)
4. **Ângulos sugeridos** (3-4 ideias de abordagem)
5. **Palavras-chave** sugeridas
6. **Call-to-action** recomendado

Responda em JSON: {"texto": "briefing completo formatado em markdown"}`;

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                mensagem: prompt,
                historico: [],
                pais: paisAtual,
                pais_nome: paisNomeAtual,
                artigos: artigosDisponiveis
            })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();

        const texto = data.texto || '⚠️ Não foi possível gerar o briefing.';

        // Botão de copiar
        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar briefing</button>`;
        copyWrap._texto = texto;

        adicionarMsgAlfa(texto, null, null, copyWrap);

    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao gerar briefing. Tente novamente.');
    }
};

window.copiarTexto = function(btn) {
    const wrap = btn.closest('.copy-wrap');
    // Pega o texto do bubble pai
    const bubble = btn.closest('.msg-bubble');
    const msgText = bubble?.querySelector('.msg-text');
    const texto = msgText ? msgText.innerText : '';
    navigator.clipboard.writeText(texto).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        btn.style.color = 'var(--ag)';
        setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar briefing'; btn.style.color = ''; }, 2000);
    });
};

// ─── MODAL: COMPARAR PAÍSES ──────────────
window.abrirComparacao = function() {
    if (!paisAtual) {
        adicionarMsgAlfa('⚠️ Carregue os artigos de um país primeiro. Ele será o "País A" na comparação.');
        return;
    }
    document.getElementById('comparar-pais-a').textContent = paisNomeAtual;
    document.getElementById('modal-comparar').style.display = 'flex';
};

window.compararPaises = async function() {
    const paisB = document.getElementById('comparar-pais-b').value;
    const paisBNome = document.getElementById('comparar-pais-b').options[document.getElementById('comparar-pais-b').selectedIndex].text;
    fecharModal('modal-comparar');

    if (paisB === paisAtual) {
        adicionarMsgAlfa('⚠️ Selecione um país diferente do atual para comparar.');
        return;
    }

    adicionarMsgUsuario(`🌍 Comparar conteúdo: ${paisNomeAtual} vs ${paisBNome}`);
    adicionarTyping();

    loadingText.textContent = `Carregando artigos de ${paisBNome}...`;
    loadingOverlay.style.display = 'flex';

    try {
        // Carrega artigos do País B
        const r = await fetch('/buscar-artigos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais: paisB, busca: '' })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        loadingOverlay.style.display = 'none';
        removerTyping();

        if (!data.sucesso) {
            adicionarMsgAlfa(`⚠️ Não consegui carregar artigos de ${paisBNome}.`);
            return;
        }

        const artigosB = data.artigos || [];

        // Manda para IA comparar
        adicionarTyping();
        const prompt = `Você é especialista em marketing de conteúdo global da Tennant.

Compare os blogs de dois países e identifique lacunas de conteúdo.

PAÍS A — ${paisNomeAtual} (${artigosDisponiveis.length} artigos):
${artigosDisponiveis.slice(0,80).map(a => `- ${a.title || a.href}`).join('\n')}

PAÍS B — ${paisBNome} (${artigosB.length} artigos):
${artigosB.slice(0,80).map(a => `- ${a.title || a.href}`).join('\n')}

Analise e responda em JSON: {"texto": "análise completa em markdown com: 1) Temas exclusivos do País A, 2) Temas exclusivos do País B, 3) Temas em comum, 4) Recomendações de adaptação de conteúdo"}`;

        const r2 = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r2.status === 401) { window.location.href = '/'; return; }
        const data2 = await r2.json();
        removerTyping();

        // Badge de comparação
        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'comparar-badge';
        badgeWrap.innerHTML = `
            <span class="cb-pais">${escHtml(paisNomeAtual)} <small>${artigosDisponiveis.length} arts.</small></span>
            <span class="cb-vs">⟷</span>
            <span class="cb-pais">${escHtml(paisBNome)} <small>${artigosB.length} arts.</small></span>
        `;
        adicionarMsgAlfa(data2.texto || '⚠️ Erro na análise.', null, null, badgeWrap);

    } catch {
        loadingOverlay.style.display = 'none';
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao comparar países. Tente novamente.');
    }
};

// ─── MODAL: RESUMIR ARTIGO ────────────────
window.abrirResumir = function() {
    document.getElementById('resumir-url').value = '';
    document.getElementById('modal-resumir').style.display = 'flex';
    setTimeout(() => document.getElementById('resumir-url').focus(), 100);
};

window.resumirArtigo = async function() {
    const url = document.getElementById('resumir-url').value.trim();
    const tamanho = document.querySelector('input[name="resumo-tamanho"]:checked')?.value || 'medio';
    fecharModal('modal-resumir');

    if (!url || !url.startsWith('http')) {
        adicionarMsgAlfa('⚠️ Informe uma URL válida do blog Tennant.');
        return;
    }

    adicionarMsgUsuario(`📖 Resumir artigo: ${url}`);
    adicionarTyping();

    const instrucaoTamanho = tamanho === 'curto'
        ? 'Liste apenas 3 pontos principais em bullets.'
        : tamanho === 'completo'
        ? 'Faça um resumo completo com introdução, pontos principais e conclusão.'
        : 'Escreva um parágrafo de 4-6 linhas com os pontos principais.';

    const prompt = `Você é especialista em marketing de conteúdo da Tennant.

O usuário quer um resumo do artigo em: ${url}

Como você não tem acesso direto à URL, use o título/slug da URL para inferir o conteúdo do artigo e gere um resumo útil baseado no que você sabe sobre o tema.

Instruções: ${instrucaoTamanho}
Responda sempre em português brasileiro.
Inclua no final: "🔗 Artigo original: ${url}"

Responda em JSON: {"texto": "resumo em markdown"}`;

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();

        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar resumo</button>`;
        adicionarMsgAlfa(data.texto || '⚠️ Erro ao gerar resumo.', null, null, copyWrap);

    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao resumir. Tente novamente.');
    }
};

// ─── LIMPAR CHAT ─────────────────────────
window.limparChat = function() {
    historico = [];
    mostrarBemVindo();
};

// ─── RENDERIZAR ARTIGOS ──────────────────
function renderizarArtigosNoChat(artigos, grupoId) {
    if (!artigos || artigos.length === 0) return null;

    const wrap = document.createElement('div');
    wrap.className = 'artigos-chat-wrap';
    wrap.dataset.grupoId = grupoId;

    const bar = document.createElement('div');
    bar.className = 'artigos-select-bar';
    bar.innerHTML = `
        <span><i class="fa-solid fa-file-lines"></i> ${artigos.length} artigo${artigos.length !== 1 ? 's' : ''} encontrado${artigos.length !== 1 ? 's' : ''}</span>
        <button class="sel-all-btn" onclick="selecionarTodosDoGrupo(this)">Selecionar todos</button>
    `;
    wrap.appendChild(bar);

    const lista = document.createElement('div');
    lista.className = 'artigos-chat-lista';
    artigos.forEach((art, i) => {
        const card = document.createElement('div');
        card.className = 'artigo-chat-card';
        if (selecionados.has(art.href)) card.classList.add('selecionado');
        card.dataset.url = art.href;
        card.style.animationDelay = `${Math.min(i * 0.04, 0.5)}s`;

        const slug = (() => {
            try { return new URL(art.href).pathname.split('/').slice(-1)[0].replace('.html', ''); }
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
        lista.appendChild(card);
    });
    wrap.appendChild(lista);

    const urlsDeste = artigos.map(a => a.href);
    const acoesBtns = document.createElement('div');
    acoesBtns.className = 'artigos-acoes';
    acoesBtns.innerHTML = `
        <button class="traduzir-grupo-btn" onclick="traduzirGrupo(this, ${JSON.stringify(urlsDeste).replace(/"/g, '&quot;')})">
            <i class="fa-solid fa-language"></i> Traduzir estes ${artigos.length}
        </button>
        <button class="selecionar-grupo-btn" onclick="selecionarGrupoParaTraduzir(this, ${JSON.stringify(urlsDeste).replace(/"/g, '&quot;')})">
            <i class="fa-solid fa-layer-group"></i> Adicionar à seleção
        </button>
        <button class="exportar-grupo-btn" onclick="exportarGrupo(${JSON.stringify(artigos).replace(/"/g, '&quot;')})">
            <i class="fa-solid fa-table-list"></i> Exportar CSV
        </button>
    `;
    wrap.appendChild(acoesBtns);
    return wrap;
}

// ─── EXPORTAR GRUPO ──────────────────────
window.exportarGrupo = function(artigos) {
    const linhas = ['Título,URL,País'];
    artigos.forEach(a => {
        const titulo = (a.title || '').replace(/"/g, '""');
        linhas.push(`"${titulo}","${a.href || ''}","${paisNomeAtual}"`);
    });
    const csv = linhas.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `artigos_filtrados_${Date.now()}.csv`;
    el.click();
    URL.revokeObjectURL(url);
};

// ─── TRADUZIR GRUPO ──────────────────────
window.traduzirGrupo = async function(btn, urls) {
    if (!paisAtual) { adicionarMsgAlfa('⚠️ Selecione um país antes de traduzir.'); return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traduzindo...';
    loadingText.textContent = 'Traduzindo artigos selecionados...';
    loadingOverlay.style.display = 'flex';
    adicionarMsgUsuario(`Traduzir ${urls.length} artigo${urls.length !== 1 ? 's' : ''}`);

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
            mostrarDownloads(data.arquivos || []);
            btn.closest('.artigos-acoes').querySelector('.traduzir-grupo-btn').outerHTML =
                `<span class="traduzido-ok"><i class="fa-solid fa-circle-check"></i> Tradução concluída!</span>`;
        } else {
            adicionarMsgAlfa('⚠️ Erro ao traduzir: ' + (data.erro || 'falha desconhecida'));
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-language"></i> Tentar novamente';
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgAlfa('⚠️ Erro de conexão durante a tradução.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-language"></i> Tentar novamente';
    }
};

window.selecionarGrupoParaTraduzir = function(btn, urls) {
    urls.forEach(url => selecionados.add(url));
    atualizarSelecaoBadge();
    document.querySelectorAll('.artigo-chat-card').forEach(card => {
        if (urls.includes(card.dataset.url)) card.classList.add('selecionado');
    });
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Adicionados';
    btn.disabled = true;
};

function mostrarDownloads(arquivos) {
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
}

window.selecionarTodosDoGrupo = function(btn) {
    const wrap = btn.closest('.artigos-chat-wrap');
    if (!wrap) return;
    const cards = wrap.querySelectorAll('.artigo-chat-card');
    const todos = Array.from(cards).every(c => c.classList.contains('selecionado'));
    cards.forEach(card => {
        const url = card.dataset.url;
        if (todos) { selecionados.delete(url); card.classList.remove('selecionado'); }
        else { selecionados.add(url); card.classList.add('selecionado'); }
    });
    btn.textContent = todos ? 'Selecionar todos' : 'Desmarcar todos';
    atualizarSelecaoBadge();
};

function toggleCard(card, url) {
    if (selecionados.has(url)) { selecionados.delete(url); card.classList.remove('selecionado'); }
    else { selecionados.add(url); card.classList.add('selecionado'); }
    atualizarSelecaoBadge();
}

function atualizarSelecaoBadge() {
    const n = selecionados.size;
    selecaoCount.textContent = n;
    selecaoBadge.style.display = n > 0 ? 'flex' : 'none';
    btnTraduzir.style.display = n > 0 ? 'flex' : 'none';
}

window.traduzirSelecionados = async function() {
    if (selecionados.size === 0 || !paisAtual) return;
    const urls = Array.from(selecionados);
    loadingText.textContent = 'Traduzindo artigos selecionados...';
    loadingOverlay.style.display = 'flex';
    adicionarMsgUsuario(`Traduzir ${urls.length} selecionado${urls.length !== 1 ? 's' : ''}`);
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
            mostrarDownloads(data.arquivos || []);
            selecionados.clear();
            atualizarSelecaoBadge();
        } else {
            adicionarMsgAlfa('⚠️ Erro ao traduzir: ' + (data.erro || 'falha desconhecida'));
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgAlfa('⚠️ Erro de conexão durante a tradução.');
    }
};

// ─── MODALS ──────────────────────────────
window.fecharModal = function(id) {
    document.getElementById(id).style.display = 'none';
};
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['modal-briefing','modal-comparar','modal-resumir'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
    }
});

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

    // Limpa JSON vazado
    let textoLimpo = texto || '';
    textoLimpo = textoLimpo.replace(/```json[\s\S]*?```/gi, '').trim();
    if (/^\s*\{[\s\S]*\}\s*$/.test(textoLimpo)) {
        try { const p = JSON.parse(textoLimpo); if (p.texto) textoLimpo = p.texto; } catch(_) {}
    }

    const msgText = document.createElement('div');
    msgText.className = 'msg-text';
    msgText.innerHTML = formatarMarkdown(textoLimpo);
    bubble.appendChild(msgText);

    const msgTime = document.createElement('div');
    msgTime.className = 'msg-time';
    msgTime.textContent = hora || horaAtual();
    bubble.appendChild(msgTime);

    if (artigosFiltrados && artigosFiltrados.length > 0) {
        const artigosObj = artigosFiltrados.map(item => {
            if (typeof item === 'string') {
                const found = artigosDisponiveis.find(a => a.href === item);
                return found || { href: item, title: extrairTituloSlug(item) };
            }
            return item;
        }).filter(a => a && a.href);
        if (artigosObj.length > 0) {
            const cardsEl = renderizarArtigosNoChat(artigosObj, 'grupo_' + Date.now());
            if (cardsEl) bubble.appendChild(cardsEl);
        }
    }

    if (extraEl) bubble.appendChild(extraEl);

    row.innerHTML = `<div class="msg-avatar">A</div>`;
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollBottom();
}

function adicionarTyping() {
    const row = document.createElement('div');
    row.className = 'msg-row alfa typing-row';
    row.innerHTML = `<div class="msg-avatar">A</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(row);
    scrollBottom();
}
function removerTyping() {
    const t = chatMessages.querySelector('.typing-row');
    if (t) t.remove();
}

// ─── UTILITÁRIOS ─────────────────────────
function extrairTituloSlug(url) {
    try {
        const slug = new URL(url).pathname.split('/').pop().replace('.html','').replace(/-/g,' ');
        return slug.charAt(0).toUpperCase() + slug.slice(1);
    } catch { return url; }
}
function formatarMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,'<em>$1</em>')
        .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
        .replace(/^[-•] (.+)$/gm, '• $1')
        .replace(/\n/g,'<br>');
}
function escHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function horaAtual() {
    return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function scrollBottom() {
    requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
}
/* ═════════════════════════════════════════
   SUPORTE AO NOVO HTML
═════════════════════════════════════════ */

// ─── CRONOGRAMA ──────────────────────────
let cronogramaPosts = JSON.parse(
    localStorage.getItem('alfa_cronograma') || '[]'
);

let cronDataAtual = new Date();

window.abrirCronograma = function() {
    document.getElementById('modal-cronograma').style.display = 'flex';
    renderizarCronograma();
};

window.abrirAdicionarPost = function() {
    document.getElementById('modal-add-post').style.display = 'flex';
};

window.salvarPost = function() {
    const data = document.getElementById('post-data').value;
    const tema = document.getElementById('post-tema').value.trim();

    if (!data || !tema) {
        alert('Preencha data e tema.');
        return;
    }

    cronogramaPosts.push({
        data,
        tema,
        tipo: document.querySelector('input[name="post-tipo"]:checked')?.value || 'outro',
        obs: document.getElementById('post-obs').value || ''
    });

    localStorage.setItem(
        'alfa_cronograma',
        JSON.stringify(cronogramaPosts)
    );

    fecharModal('modal-add-post');

    renderizarCronograma();
    atualizarResumoCronograma();
};

window.navegarMes = function(dir) {
    cronDataAtual.setMonth(cronDataAtual.getMonth() + dir);
    renderizarCronograma();
};

function renderizarCronograma() {
    const label = document.getElementById('cron-mes-label');
    const lista = document.getElementById('cron-lista-posts');
    const grid = document.getElementById('cal-grid');

    if (!label || !lista || !grid) return;

    label.textContent = cronDataAtual.toLocaleDateString(
        'pt-BR',
        {
            month: 'long',
            year: 'numeric'
        }
    );

    lista.innerHTML =
        cronogramaPosts
            .sort((a, b) => a.data.localeCompare(b.data))
            .map(post => `
                <div class="cron-item">
                    <strong>${post.data}</strong><br>
                    ${post.tema}
                </div>
            `)
            .join('') ||
        '<div>Nenhum post cadastrado.</div>';

    grid.innerHTML = '';
}

function atualizarResumoCronograma() {
    const proximos = cronogramaPosts
        .filter(p => new Date(p.data) >= new Date())
        .sort((a, b) => a.data.localeCompare(b.data));

    const proximo = proximos[0];

    const pill = document.getElementById('proximo-post-pill');

    if (!pill) return;

    if (!proximo) {
        pill.style.display = 'none';
        return;
    }

    pill.style.display = 'block';

    document.getElementById('proximo-post-data').textContent =
        proximo.data;

    document.getElementById('proximo-post-tema').textContent =
        proximo.tema;
}

// ─── MODO FOCO ───────────────────────────
window.toggleModoFoco = function() {
    document
        .getElementById('alfa-shell')
        ?.classList.toggle('modo-foco');
};

// ─── FILTROS RÁPIDOS ─────────────────────
window.toggleFiltro = function(btn, filtro) {
    document
        .querySelectorAll('.filtro-chip')
        .forEach(el => el.classList.remove('ativo'));

    btn.classList.add('ativo');

    if (filtro === 'todos') {
        usarSugestao('Mostre todos os artigos disponíveis');
        return;
    }

    const mapa = {
        limpeza: 'limpeza',
        produto: 'produtos',
        sustentabilidade: 'sustentabilidade',
        robotica: 'robótica',
        manutencao: 'manutenção'
    };

    usarSugestao(
        `Mostre artigos sobre ${mapa[filtro] || filtro}`
    );
};

// ─── MÉTRICAS DA SIDEBAR ─────────────────
function atualizarMetricasSidebar() {
    const total = document.getElementById('metrica-total');
    const selecionadosEl =
        document.getElementById('metrica-selecionados');

    if (total)
        total.textContent = artigosDisponiveis.length;

    if (selecionadosEl)
        selecionadosEl.textContent = selecionados.size;
}

// Atualiza ao carregar artigos
const _btnCarregarOriginal =
    btnCarregar.onclick;

// Atualiza quando muda seleção
const atualizarSelecaoOriginal =
    atualizarSelecaoBadge;

atualizarSelecaoBadge = function() {
    atualizarSelecaoOriginal();
    atualizarMetricasSidebar();
};

// ─── FECHAR NOVOS MODAIS COM ESC ─────────
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    [
        'modal-briefing',
        'modal-comparar',
        'modal-resumir',
        'modal-cronograma',
        'modal-add-post'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
});

// ─── INIT EXTRA ──────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    atualizarMetricasSidebar();
    atualizarResumoCronograma();
});
