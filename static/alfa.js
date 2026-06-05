/* ═════════════════════════════════════════
   ALFA.JS — Assistente Inteligente Tennant
   v3.0 — Marketing Edition
═════════════════════════════════════════ */

// ─── ESTADO ──────────────────────────────
let historico          = [];
let artigosDisponiveis = [];
let selecionados       = new Set();
let paisAtual          = '';
let paisNomeAtual      = '';
let enviando           = false;
let historicoSessao    = [];
let todosOsPaises      = {};
let filtroAtivo        = 'todos';
let modoFoco           = false;
let contadorBuscas     = 0;
let contadorTraducoes  = 0;

// Cronograma — persiste em localStorage
let cronogramaPosts = JSON.parse(localStorage.getItem('alfa_cronograma') || '[]');
let cronogramaAno   = new Date().getFullYear();
let cronogramaMes   = new Date().getMonth(); // 0-11
let diaSelecionado  = null;

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
    atualizarProgressoAnual();
    atualizarSemana();
    atualizarProximoPost();
    verificarPostsDiaUm();
    chatInput.focus();
});

// ─── TOAST ───────────────────────────────
function toast(titulo, msg = '', tipo = 'sucesso') {
    const icons = { sucesso: 'fa-circle-check', aviso: 'fa-triangle-exclamation', erro: 'fa-circle-xmark', info: 'fa-circle-info' };
    const cont = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `
        <i class="fa-solid ${icons[tipo] || icons.info} toast-icon"></i>
        <div class="toast-texto">
            ${titulo ? `<div class="toast-titulo">${escHtml(titulo)}</div>` : ''}
            ${msg ? `<div class="toast-msg">${escHtml(msg)}</div>` : ''}
        </div>
        <button class="toast-fechar" onclick="this.closest('.toast').remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    cont.appendChild(t);
    setTimeout(() => {
        t.classList.add('saindo');
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

// ─── MODO FOCO ───────────────────────────
window.toggleModoFoco = function() {
    modoFoco = !modoFoco;
    const shell = document.getElementById('alfa-shell');
    const btn   = document.getElementById('btn-foco');
    shell.classList.toggle('modo-foco', modoFoco);
    btn.innerHTML = modoFoco
        ? '<i class="fa-solid fa-compress"></i>'
        : '<i class="fa-solid fa-expand"></i>';
};

// ─── CHIP FILTROS ─────────────────────────
window.toggleFiltro = function(btn, tipo) {
    document.querySelectorAll('.filtro-chip').forEach(c => c.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = tipo;
    if (tipo !== 'todos' && artigosDisponiveis.length > 0) {
        const mapaFiltros = {
            limpeza:        ['clean', 'limpeza', 'floor', 'wash', 'scrub', 'sweep', 'mop'],
            produto:        ['product', 'produto', 'machine', 'equipment', 'scrubber', 'sweeper'],
            sustentabilidade: ['sustain', 'sustentab', 'green', 'eco', 'environment', 'ambiental'],
            robotica:       ['robot', 'robotic', 'autonomous', 'autônomo', 'automation'],
            manutencao:     ['mainten', 'manutenção', 'repair', 'service', 'preventiv']
        };
        const palavras = mapaFiltros[tipo] || [tipo];
        usarSugestao(`Mostre artigos sobre: ${palavras[0]}`);
    }
};

// ─── MÉTRICAS ─────────────────────────────
function atualizarMetricas() {
    document.getElementById('metrica-total').textContent      = artigosDisponiveis.length;
    document.getElementById('metrica-selecionados').textContent = selecionados.size;
    document.getElementById('metrica-buscas').textContent     = contadorBuscas;
    document.getElementById('metrica-traducoes').textContent  = contadorTraducoes;
}

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

// ─── WELCOME (empty state melhorado) ─────
function mostrarBemVindo() {
    chatMessages.innerHTML = '';
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-state';
    emptyEl.innerHTML = `
        <div class="empty-state-icon"><i class="fa-solid fa-robot"></i></div>
        <div class="empty-state-titulo">Olá! Sou a Alfa 👋</div>
        <div class="empty-state-desc">Sua assistente inteligente de marketing da Tennant. Selecione um país e carregue os artigos para começar.</div>
        <div class="empty-state-sugestoes">
            <button class="empty-sugestao-btn" onclick="document.getElementById('btn-carregar').click()">
                <i class="fa-solid fa-rotate"></i> Carregar artigos do país selecionado
            </button>
            <button class="empty-sugestao-btn" onclick="abrirCronograma()">
                <i class="fa-solid fa-calendar-days"></i> Abrir cronograma de postagem
            </button>
            <button class="empty-sugestao-btn" onclick="abrirModalBriefing()">
                <i class="fa-solid fa-file-pen"></i> Gerar briefing de pauta
            </button>
            <button class="empty-sugestao-btn" onclick="abrirResumir()">
                <i class="fa-solid fa-book-open"></i> Resumir um artigo por URL
            </button>
        </div>
    `;
    chatMessages.appendChild(emptyEl);
}

// ─── CARREGAR ARTIGOS (com skeleton) ─────
btnCarregar.addEventListener('click', async () => {
    const pais = selectPais.value;
    const paisNome = selectPais.options[selectPais.selectedIndex].text;

    btnCarregar.disabled = true;
    btnCarregar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
    artigosStatus.style.display = 'none';

    // Skeleton loading
    chatMessages.innerHTML = '';
    const skWrap = document.createElement('div');
    skWrap.className = 'msg-row alfa';
    skWrap.innerHTML = `
        <div class="msg-avatar">A</div>
        <div class="msg-bubble">
            <div class="skeleton-card">
                <div class="skeleton skeleton-titulo"></div>
                <div class="skeleton skeleton-linha larga"></div>
                <div class="skeleton skeleton-linha media"></div>
                <div class="skeleton skeleton-linha curta"></div>
            </div>
        </div>
    `;
    chatMessages.appendChild(skWrap);
    scrollBottom();

    try {
        const r = await fetch('/buscar-artigos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais, busca: '' })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        chatMessages.innerHTML = '';

        if (!data.sucesso) {
            adicionarMsgAlfa(`⚠️ Não consegui carregar os artigos de **${paisNome}**.`);
            toast('Erro ao carregar', `Verifique a conexão com ${paisNome}`, 'erro');
            return;
        }

        artigosDisponiveis = data.artigos || [];
        paisAtual    = pais;
        paisNomeAtual = paisNome;
        selecionados.clear();
        atualizarSelecaoBadge();
        atualizarMetricas();

        artigosStatus.style.display = 'flex';
        artigosStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${artigosDisponiveis.length} artigos carregados`;

        const labelA = document.getElementById('comparar-pais-a');
        if (labelA) labelA.textContent = paisNome;

        adicionarMsgAlfa(
            `✅ Carreguei **${artigosDisponiveis.length} artigos** do blog da Tennant em **${paisNome}**.\n\nO que deseja fazer?\n- *"Filtre artigos sobre limpeza"*\n- Use os **chips de filtro** acima para filtrar por categoria\n- Clique em **Briefing** para gerar uma pauta`
        );
        toast('Artigos carregados!', `${artigosDisponiveis.length} artigos de ${paisNome}`, 'sucesso');

    } catch {
        chatMessages.innerHTML = '';
        adicionarMsgAlfa('⚠️ Erro de conexão ao carregar os artigos.');
        toast('Erro de conexão', 'Verifique o servidor', 'erro');
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

    // Remove empty state se existir
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

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
            toast('Erro', data.erro, 'erro');
        } else {
            historico.push({ role: 'user', content: texto });
            historico.push({ role: 'assistant', content: data.texto || '' });
            const artigos = data.artigos_filtrados || [];
            adicionarMsgAlfa(data.texto || '', null, artigos);
            if (artigos.length > 0) {
                contadorBuscas++;
                salvarHistoricoSessao(texto, artigos);
                atualizarMetricas();
                toast('Artigos encontrados', `${artigos.length} resultado${artigos.length !== 1 ? 's' : ''} para "${texto.slice(0,30)}..."`, 'info');
            }
        }
    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro de conexão. Verifique o servidor e tente novamente.');
        toast('Erro de conexão', 'Servidor indisponível', 'erro');
    } finally {
        enviando = false;
        btnSend.disabled = false;
        chatInput.focus();
    }
};

window.usarSugestao = function(texto) {
    // Remove empty state se existir
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    chatInput.value = texto;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    enviarMensagem();
};

// ─── HISTÓRICO DE SESSÃO ─────────────────
function salvarHistoricoSessao(tema, artigos) {
    historicoSessao.unshift({
        tema, artigos: artigos.slice(), pais: paisNomeAtual,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    if (historicoSessao.length > 20) historicoSessao.pop();
}

window.verHistorico = function() {
    if (historicoSessao.length === 0) {
        adicionarMsgAlfa('📭 Nenhuma busca registrada nesta sessão ainda.');
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
    adicionarMsgAlfa(`🔁 Busca: *"${item.tema}"* — **${artigosObj.length} artigos**`, null, artigosObj);
};

// ─── EXPORTAR ────────────────────────────
window.exportarLista = function() {
    const fonte = selecionados.size > 0
        ? artigosDisponiveis.filter(a => selecionados.has(a.href))
        : artigosDisponiveis;

    if (fonte.length === 0) {
        toast('Nenhum artigo', 'Carregue artigos antes de exportar', 'aviso');
        return;
    }
    const linhas = ['Título,URL,País'];
    fonte.forEach(a => {
        const titulo = (a.title || '').replace(/"/g, '""');
        linhas.push(`"${titulo}","${a.href || ''}","${paisNomeAtual}"`);
    });
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `artigos_tennant_${paisAtual}_${new Date().toISOString().slice(0,10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);

    const dlWrap = document.createElement('div');
    dlWrap.className = 'export-confirm';
    dlWrap.innerHTML = `
        <div class="export-icon"><i class="fa-solid fa-file-csv"></i></div>
        <div class="export-info">
            <div class="export-title">Lista exportada!</div>
            <div class="export-sub">${fonte.length} artigos · ${paisNomeAtual} · CSV UTF-8</div>
        </div>
    `;
    adicionarMsgAlfa('✅ Arquivo CSV gerado e baixado!', null, null, dlWrap);
    toast('Exportado!', `${fonte.length} artigos em CSV`, 'sucesso');
};

window.exportarGrupo = function(artigos) {
    const linhas = ['Título,URL,País'];
    artigos.forEach(a => {
        const titulo = (a.title || '').replace(/"/g, '""');
        linhas.push(`"${titulo}","${a.href || ''}","${paisNomeAtual}"`);
    });
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `artigos_filtrados_${Date.now()}.csv`;
    el.click();
    URL.revokeObjectURL(url);
    toast('Exportado!', `${artigos.length} artigos`, 'sucesso');
};

// ─── MODAL: BRIEFING ─────────────────────
window.abrirModalBriefing = function() {
    if (artigosDisponiveis.length === 0) {
        toast('Sem artigos', 'Carregue artigos de um país primeiro', 'aviso');
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
    if (!tema) { toast('Campo obrigatório', 'Informe o tema do briefing', 'aviso'); return; }

    adicionarMsgUsuario(`📝 Gerar briefing — tema: "${tema}" · tom: ${tom}`);
    adicionarTyping();

    const prompt = `Você é especialista em marketing de conteúdo da Tennant Company.
Gere um BRIEFING DE PAUTA COMPLETO em português brasileiro para o tema: "${tema}". Tom: ${tom}.

ARTIGOS DISPONÍVEIS (${artigosDisponiveis.length} total):
${artigosDisponiveis.slice(0, 80).map((a, i) => `${i+1}. [${a.title || 'sem título'}] (${a.href})`).join('\n')}

O briefing deve ter: 1) Objetivo, 2) Público-alvo, 3) Artigos de referência com URLs, 4) Ângulos sugeridos, 5) Palavras-chave, 6) CTA.
Responda em JSON: {"texto": "briefing completo em markdown"}`;

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();
        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar briefing</button>`;
        adicionarMsgAlfa(data.texto || '⚠️ Erro ao gerar briefing.', null, null, copyWrap);
        toast('Briefing gerado!', `Tema: ${tema}`, 'sucesso');
    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao gerar briefing. Tente novamente.');
        toast('Erro', 'Falha ao gerar briefing', 'erro');
    }
};

window.copiarTexto = function(btn) {
    const bubble = btn.closest('.msg-bubble');
    const msgText = bubble?.querySelector('.msg-text');
    const texto = msgText ? msgText.innerText : '';
    navigator.clipboard.writeText(texto).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        btn.style.color = 'var(--ag)';
        toast('Copiado!', '', 'sucesso');
        setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar briefing'; btn.style.color = ''; }, 2000);
    });
};

// ─── MODAL: COMPARAR PAÍSES ──────────────
window.abrirComparacao = function() {
    if (!paisAtual) { toast('Sem país', 'Carregue artigos de um país primeiro', 'aviso'); return; }
    document.getElementById('comparar-pais-a').textContent = paisNomeAtual;
    document.getElementById('modal-comparar').style.display = 'flex';
};

window.compararPaises = async function() {
    const paisB = document.getElementById('comparar-pais-b').value;
    const paisBNome = document.getElementById('comparar-pais-b').options[document.getElementById('comparar-pais-b').selectedIndex].text;
    fecharModal('modal-comparar');
    if (paisB === paisAtual) { toast('Mesmo país', 'Selecione um país diferente', 'aviso'); return; }

    adicionarMsgUsuario(`🌍 Comparar: ${paisNomeAtual} vs ${paisBNome}`);
    adicionarTyping();
    loadingText.textContent = `Carregando artigos de ${paisBNome}...`;
    loadingOverlay.style.display = 'flex';

    try {
        const r = await fetch('/buscar-artigos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ pais: paisB, busca: '' })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        loadingOverlay.style.display = 'none';
        removerTyping();
        if (!data.sucesso) { adicionarMsgAlfa(`⚠️ Não consegui carregar artigos de ${paisBNome}.`); return; }

        const artigosB = data.artigos || [];
        adicionarTyping();
        const prompt = `Compare os blogs de dois países e identifique lacunas de conteúdo.
PAÍS A — ${paisNomeAtual} (${artigosDisponiveis.length} artigos):
${artigosDisponiveis.slice(0,60).map(a => `- ${a.title || a.href}`).join('\n')}
PAÍS B — ${paisBNome} (${artigosB.length} artigos):
${artigosB.slice(0,60).map(a => `- ${a.title || a.href}`).join('\n')}
Responda em JSON: {"texto": "análise em markdown: 1) Temas exclusivos País A, 2) Temas exclusivos País B, 3) Temas comuns, 4) Recomendações"}`;

        const r2 = await fetch('/alfa-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r2.status === 401) { window.location.href = '/'; return; }
        const data2 = await r2.json();
        removerTyping();

        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'comparar-badge';
        badgeWrap.innerHTML = `
            <span class="cb-pais">${escHtml(paisNomeAtual)} <small>${artigosDisponiveis.length} arts.</small></span>
            <span class="cb-vs">⟷</span>
            <span class="cb-pais">${escHtml(paisBNome)} <small>${artigosB.length} arts.</small></span>
        `;
        adicionarMsgAlfa(data2.texto || '⚠️ Erro na análise.', null, null, badgeWrap);
        toast('Comparação concluída!', `${paisNomeAtual} vs ${paisBNome}`, 'sucesso');
    } catch {
        loadingOverlay.style.display = 'none';
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao comparar países.');
        toast('Erro', 'Falha na comparação', 'erro');
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
    if (!url || !url.startsWith('http')) { toast('URL inválida', 'Informe uma URL válida', 'aviso'); return; }

    adicionarMsgUsuario(`📖 Resumir artigo: ${url}`);
    adicionarTyping();

    const instrucao = tamanho === 'curto' ? 'Liste apenas 3 pontos principais em bullets.'
        : tamanho === 'completo' ? 'Resumo completo com introdução, pontos e conclusão.'
        : 'Parágrafo de 4-6 linhas com pontos principais.';

    const prompt = `Você é especialista em marketing da Tennant. Resuma o artigo em: ${url}
Use o slug/URL para inferir o tema. ${instrucao}
Responda em português. Inclua ao final: "🔗 Artigo original: ${url}"
Responda em JSON: {"texto": "resumo em markdown"}`;

    try {
        const r = await fetch('/alfa-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();
        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar resumo</button>`;
        adicionarMsgAlfa(data.texto || '⚠️ Erro ao gerar resumo.', null, null, copyWrap);
        toast('Resumo gerado!', '', 'sucesso');
    } catch {
        removerTyping();
        adicionarMsgAlfa('⚠️ Erro ao resumir. Tente novamente.');
        toast('Erro', 'Falha ao resumir', 'erro');
    }
};

// ─── CRONOGRAMA ───────────────────────────
window.abrirCronograma = function() {
    cronogramaAno = new Date().getFullYear();
    cronogramaMes = new Date().getMonth();
    diaSelecionado = null;
    renderizarCalendario();
    document.getElementById('modal-cronograma').style.display = 'flex';
};

window.navegarMes = function(dir) {
    cronogramaMes += dir;
    if (cronogramaMes < 0)  { cronogramaMes = 11; cronogramaAno--; }
    if (cronogramaMes > 11) { cronogramaMes = 0;  cronogramaAno++; }
    diaSelecionado = null;
    renderizarCalendario();
};

function renderizarCalendario() {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.getElementById('cron-mes-label').textContent = `${meses[cronogramaMes]} ${cronogramaAno}`;

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const primeiroDia = new Date(cronogramaAno, cronogramaMes, 1).getDay();
    const diasNoMes   = new Date(cronogramaAno, cronogramaMes + 1, 0).getDate();
    const hoje        = new Date();

    // Posts deste mês
    const postsMes = cronogramaPosts.filter(p => {
        const d = new Date(p.data + 'T00:00:00');
        return d.getFullYear() === cronogramaAno && d.getMonth() === cronogramaMes;
    });

    // Células vazias
    for (let i = 0; i < primeiroDia; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day vazio';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= diasNoMes; d++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day';

        const isHoje = hoje.getFullYear() === cronogramaAno && hoje.getMonth() === cronogramaMes && hoje.getDate() === d;
        const isSel  = diaSelecionado === d;
        if (isHoje) cell.classList.add('hoje');
        if (isSel)  cell.classList.add('selecionado');

        const postsNoDia = postsMes.filter(p => new Date(p.data + 'T00:00:00').getDate() === d);
        if (postsNoDia.length > 0) cell.classList.add('tem-post');

        const dotsHtml = postsNoDia.slice(0,3).map(p => `<div class="cal-dot ${p.tipo}"></div>`).join('');

        cell.innerHTML = `
            <span>${d}</span>
            ${dotsHtml ? `<div class="cal-day-dots">${dotsHtml}</div>` : ''}
        `;
        cell.onclick = () => { diaSelecionado = d; renderizarCalendario(); renderizarListaPosts(d); };
        grid.appendChild(cell);
    }

    // Lista inicial
    if (diaSelecionado) {
        renderizarListaPosts(diaSelecionado);
    } else {
        renderizarListaPosts(null);
    }
}

function renderizarListaPosts(dia) {
    const cont   = document.getElementById('cron-lista-posts');
    const titulo = document.getElementById('cron-lista-titulo');
    cont.innerHTML = '';

    const todosMes = cronogramaPosts.filter(p => {
        const d = new Date(p.data + 'T00:00:00');
        return d.getFullYear() === cronogramaAno && d.getMonth() === cronogramaMes;
    }).sort((a,b) => a.data.localeCompare(b.data));

    const posts = dia
        ? todosMes.filter(p => new Date(p.data + 'T00:00:00').getDate() === dia)
        : todosMes;

    titulo.textContent = dia ? `Posts do dia ${dia}` : 'Todos os posts do mês';

    if (posts.length === 0) {
        cont.innerHTML = `<div style="font-size:13px;color:var(--as);padding:20px 0;text-align:center">
            <i class="fa-regular fa-calendar-xmark" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
            Nenhum post ${dia ? 'neste dia' : 'neste mês'}
        </div>`;
        return;
    }

    const badgeLabel = { produto:'🟢 Produto', dica:'🟡 Dica', case:'🟣 Case', conteudo:'🟠 Conteúdo', feriado:'🔴 Feriado', outro:'⚪ Outro' };
    const canalIcon  = { Instagram:'📸', LinkedIn:'💼', Facebook:'📘', Blog:'📝' };

    posts.forEach((p) => {
        // Encontra índice real no array global
        const idxReal = cronogramaPosts.findIndex(x => x.data === p.data && x.tema === p.tema);
        const item = document.createElement('div');
        item.className = 'post-item';

        const d = new Date(p.data + 'T00:00:00');
        const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        // Calcula D-1
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const diff = Math.round((d - hoje) / 86400000);
        const isDiaUm = diff === 1;
        const isHoje  = diff === 0;
        const jaTemTexto = !!p.textoGerado;

        const alertaDiaUm = isDiaUm
            ? `<span style="background:#fff3cd;color:#856404;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;display:inline-flex;align-items:center;gap:3px"><i class="fa-solid fa-bell"></i> Post amanhã!</span>`
            : isHoje
            ? `<span style="background:#d1e7dd;color:#0a3622;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;display:inline-flex;align-items:center;gap:3px"><i class="fa-solid fa-rocket"></i> Hoje!</span>`
            : '';

        const textoIndicador = jaTemTexto
            ? `<span style="background:#e8f5ee;color:var(--ag);font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;display:inline-flex;align-items:center;gap:3px"><i class="fa-solid fa-circle-check"></i> Texto pronto</span>`
            : '';

        item.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div class="post-item-data">${dataFmt} ${p.canal ? `· ${canalIcon[p.canal]||''}${p.canal}` : ''}</div>
                <div style="display:flex;gap:4px;align-items:center">
                    ${alertaDiaUm}
                    ${textoIndicador}
                    <button onclick="confirmarRemoverPost(${idxReal})" style="background:none;border:none;color:var(--as);cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;transition:color .12s" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='var(--as)'">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <div class="post-item-tema">${escHtml(p.tema)}</div>
            ${p.obs ? `<div class="post-item-conteudo">${escHtml(p.obs)}</div>` : ''}
            ${p.imagem && p.imagem !== '__HAS_IMG__' ? `<img src="${p.imagem}" style="width:100%;max-height:80px;object-fit:cover;border-radius:6px;margin-top:6px">` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
                <span class="post-tipo-badge badge-${p.tipo}">${badgeLabel[p.tipo] || p.tipo}</span>
                <button class="gerar-texto-btn" onclick="gerarTextoPost(${idxReal})">
                    <i class="fa-solid fa-${jaTemTexto ? 'rotate' : 'wand-magic-sparkles'}"></i>
                    ${jaTemTexto ? 'Ver / Regenerar texto' : 'Gerar texto'}
                </button>
            </div>
        `;

        // Se já tem texto e é hoje/amanhã, mostra preview colapsado
        if (jaTemTexto) {
            const preview = document.createElement('div');
            preview.style.cssText = 'margin-top:8px;padding:8px 10px;background:var(--ag3);border-radius:8px;font-size:11px;color:var(--ag);line-height:1.5;cursor:pointer;border:1px solid rgba(27,92,56,.15)';
            preview.textContent = p.textoGerado.slice(0, 120) + (p.textoGerado.length > 120 ? '...' : '');
            preview.title = 'Clique para ver o texto completo';
            preview.onclick = () => gerarTextoPost(idxReal);
            item.appendChild(preview);
        }

        cont.appendChild(item);
    });
}

// ─── UPLOAD DE IMAGEM ────────────────────
let imagemBase64Atual = null; // base64 da imagem do post sendo criado

window.previewImagem = function(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Imagem muito grande', 'Máximo 5MB', 'aviso'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        imagemBase64Atual = e.target.result; // data:image/...;base64,...
        const preview = document.getElementById('upload-img-preview');
        const placeholder = document.getElementById('upload-img-placeholder');
        const removeBtn = document.getElementById('upload-img-remove');
        preview.src = imagemBase64Atual;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        removeBtn.style.display = 'flex';
        document.getElementById('upload-img-area').style.border = '1.5px solid var(--ag2)';
    };
    reader.readAsDataURL(file);
};

window.removerImagem = function(e) {
    e.stopPropagation();
    imagemBase64Atual = null;
    document.getElementById('upload-img-preview').style.display = 'none';
    document.getElementById('upload-img-placeholder').style.display = 'flex';
    document.getElementById('upload-img-remove').style.display = 'none';
    document.getElementById('post-img-input').value = '';
    document.getElementById('upload-img-area').style.border = '1.5px dashed var(--abrd)';
};

window.abrirAdicionarPost = function() {
    imagemBase64Atual = null;
    const hoje = new Date();
    const dataDefault = diaSelecionado
        ? `${cronogramaAno}-${String(cronogramaMes+1).padStart(2,'0')}-${String(diaSelecionado).padStart(2,'0')}`
        : hoje.toISOString().slice(0,10);
    document.getElementById('post-data').value = dataDefault;
    document.getElementById('post-tema').value = '';
    document.getElementById('post-obs').value = '';
    document.getElementById('upload-img-preview').style.display = 'none';
    document.getElementById('upload-img-placeholder').style.display = 'flex';
    document.getElementById('upload-img-remove').style.display = 'none';
    document.getElementById('post-img-input').value = '';
    document.getElementById('upload-img-area').style.border = '1.5px dashed var(--abrd)';
    document.getElementById('modal-add-post').style.display = 'flex';
    setTimeout(() => document.getElementById('post-tema').focus(), 100);
};

window.salvarPost = function() {
    const data   = document.getElementById('post-data').value;
    const tema   = document.getElementById('post-tema').value.trim();
    const tipo   = document.querySelector('input[name="post-tipo"]:checked')?.value || 'outro';
    const canal  = document.querySelector('input[name="post-canal"]:checked')?.value || 'Instagram';
    const obs    = document.getElementById('post-obs').value.trim();
    const imagem = imagemBase64Atual || null;

    if (!data || !tema) { toast('Campos obrigatórios', 'Preencha data e tema', 'aviso'); return; }

    cronogramaPosts.push({ data, tema, tipo, canal, obs, imagem, textoGerado: null });
    cronogramaPosts.sort((a,b) => a.data.localeCompare(b.data));
    salvarCronograma();

    fecharModal('modal-add-post');

    // Navega para o mês do post
    const d = new Date(data + 'T00:00:00');
    cronogramaAno  = d.getFullYear();
    cronogramaMes  = d.getMonth();
    diaSelecionado = d.getDate();
    renderizarCalendario();
    atualizarProgressoAnual();
    atualizarSemana();
    atualizarProximoPost();

    toast('Post adicionado!', `${tema} · ${d.toLocaleDateString('pt-BR')}`, 'sucesso');

    // Verifica se é D-1 (amanhã) → gera texto automaticamente
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = Math.round((d - hoje) / 86400000);
    if (diff === 1) {
        setTimeout(() => {
            toast('Gerando texto...', 'Post é amanhã — criando texto agora!', 'info');
            const idx = cronogramaPosts.findIndex(p => p.data === data && p.tema === tema);
            if (idx > -1) gerarTextoPost(idx, true);
        }, 800);
    }
};

function salvarCronograma() {
    // Salva sem imagens grandes no localStorage (guarda apenas referência)
    const semImagem = cronogramaPosts.map(p => ({ ...p, imagem: p.imagem ? '__HAS_IMG__' : null }));
    try { localStorage.setItem('alfa_cronograma_meta', JSON.stringify(semImagem)); } catch(_) {}
    // Salva imagens separadamente por índice
    cronogramaPosts.forEach((p, i) => {
        if (p.imagem && p.imagem !== '__HAS_IMG__') {
            try { localStorage.setItem(`alfa_img_${i}`, p.imagem); } catch(_) {}
        }
    });
    // Versão completa em memória (sem limite)
}

// ─── GERAR TEXTO DO POST ──────────────────
let postIndexAtual = null; // índice do post sendo gerado (para regenerar)

window.gerarTextoPost = async function(idx, autoAbrir = false) {
    const post = cronogramaPosts[idx];
    if (!post) return;
    postIndexAtual = idx;

    // Abre modal de resultado
    document.getElementById('modal-texto-gerado').style.display = 'flex';
    document.getElementById('modal-cronograma').style.display = 'none';

    // Mostra skeleton
    const contentEl = document.getElementById('texto-gerado-content');
    contentEl.innerHTML = `
        <div class="skeleton skeleton-linha larga" style="margin-bottom:10px"></div>
        <div class="skeleton skeleton-linha media" style="margin-bottom:8px"></div>
        <div class="skeleton skeleton-linha larga" style="margin-bottom:8px"></div>
        <div class="skeleton skeleton-linha curta"></div>
    `;

    // Meta badges
    const canalIcon = { Instagram: '📸', LinkedIn: '💼', Facebook: '📘', Blog: '📝' };
    const tipoLabel = { produto: '🟢 Produto', dica: '🟡 Dica', case: '🟣 Case', conteudo: '🟠 Conteúdo', outro: '⚪ Outro' };
    document.getElementById('texto-gerado-meta').innerHTML = `
        <span class="post-tipo-badge badge-${post.tipo}">${tipoLabel[post.tipo] || post.tipo}</span>
        <span class="post-tipo-badge" style="background:#f0f4ff;color:#3b5bdb">${canalIcon[post.canal] || '📱'} ${post.canal || 'Instagram'}</span>
        <span class="post-tipo-badge" style="background:var(--ab);color:var(--as)"><i class="fa-solid fa-calendar-day"></i> ${new Date(post.data+'T00:00:00').toLocaleDateString('pt-BR')}</span>
    `;

    // Mostra imagem se houver
    const imgWrap = document.getElementById('texto-gerado-img-wrap');
    const imgEl   = document.getElementById('texto-gerado-img');
    if (post.imagem && post.imagem !== '__HAS_IMG__') {
        imgEl.src = post.imagem;
        imgWrap.style.display = 'block';
    } else {
        imgWrap.style.display = 'none';
    }

    // Monta prompt
    const canal  = post.canal || 'Instagram';
    const instrCanal = {
        Instagram: 'Post para Instagram: texto envolvente até 220 caracteres (sem o bloco de hashtags), tom visual e inspirador. Ao final, adicione 5 hashtags relevantes separadas.',
        LinkedIn:  'Post para LinkedIn: texto profissional de 3-4 parágrafos, com insight de negócio. Ao final, 3 hashtags profissionais.',
        Facebook:  'Post para Facebook: texto amigável e informativo, 2-3 parágrafos curtos, com pergunta final para engajamento.',
        Blog:      'Introdução de blog: parágrafo de abertura envolvente (150-200 palavras) e lista dos tópicos principais do artigo.'
    };

    const temImagem = post.imagem && post.imagem !== '__HAS_IMG__';
    const promptTexto = `Você é especialista em marketing de conteúdo da Tennant Company.

Gere um texto pronto para publicação com base nas informações abaixo.

DADOS DO POST:
- Tema: ${post.tema}
- Tipo: ${post.tipo}
- Canal: ${canal}
- Contexto adicional: ${post.obs || 'nenhum'}
${temImagem ? '- Uma imagem foi fornecida (analise-a para enriquecer o texto)' : ''}

INSTRUÇÃO DE FORMATO: ${instrCanal[canal] || instrCanal.Instagram}

Tom: profissional mas acessível, alinhado à marca Tennant (limpeza, tecnologia, eficiência, sustentabilidade).
Responda APENAS com o texto final, sem explicações. Não inclua o título "Texto:" no início.`;

    try {
        const api_key = ''; // será via backend
        const mensagens = [{ role: 'user', content: promptTexto }];

        // Se tem imagem, envia como vision
        let bodyPayload;
        if (temImagem) {
            const mediaType = post.imagem.split(';')[0].split(':')[1] || 'image/jpeg';
            const base64Data = post.imagem.split(',')[1];
            bodyPayload = {
                mensagem: promptTexto,
                historico: [],
                pais: paisAtual,
                pais_nome: paisNomeAtual,
                artigos: [],
                imagem_base64: base64Data,
                imagem_media_type: mediaType
            };
        } else {
            bodyPayload = {
                mensagem: promptTexto,
                historico: [],
                pais: paisAtual,
                pais_nome: paisNomeAtual,
                artigos: []
            };
        }

        const r = await fetch('/alfa-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyPayload)
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();

        const texto = data.texto || '⚠️ Não foi possível gerar o texto.';

        // Salva no post
        cronogramaPosts[idx].textoGerado = texto;
        salvarCronograma();

        contentEl.innerHTML = '';
        contentEl.textContent = texto;

        toast('Texto gerado!', `Para o post: ${post.tema.slice(0,30)}...`, 'sucesso');

    } catch (err) {
        contentEl.textContent = '⚠️ Erro ao gerar texto. Verifique a conexão e tente novamente.';
        toast('Erro', 'Falha ao gerar texto', 'erro');
    }
};

window.regenerarTexto = async function() {
    if (postIndexAtual === null) return;
    cronogramaPosts[postIndexAtual].textoGerado = null;
    await gerarTextoPost(postIndexAtual, false);
};

window.copiarTextoGerado = function() {
    const texto = document.getElementById('texto-gerado-content').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        toast('Copiado!', 'Texto pronto para colar', 'sucesso');
        const btn = document.querySelector('#modal-texto-gerado .modal-btn-confirm');
        if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!'; setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar texto'; }, 2000); }
    });
};

window.confirmarRemoverPost = function(idx) {
    const post = cronogramaPosts[idx];
    if (!post) return;
    if (confirm(`Remover post "${post.tema}" de ${new Date(post.data+'T00:00:00').toLocaleDateString('pt-BR')}?`)) {
        cronogramaPosts.splice(idx, 1);
        salvarCronograma();
        renderizarCalendario();
        atualizarProgressoAnual();
        atualizarSemana();
        atualizarProximoPost();
        toast('Post removido', '', 'info');
    }
};

// Verifica posts D-1 que ainda não têm texto → notifica
function verificarPostsDiaUm() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    const postsAmanha = cronogramaPosts.filter(p => {
        const d = new Date(p.data + 'T00:00:00');
        return d.getTime() === amanha.getTime() && !p.textoGerado;
    });
    if (postsAmanha.length > 0) {
        setTimeout(() => {
            toast(
                `${postsAmanha.length} post${postsAmanha.length > 1 ? 's' : ''} para amanhã sem texto!`,
                'Abra o cronograma e clique em "Gerar texto"',
                'aviso'
            );
        }, 1500);
    }
}

// ─── PROGRESSO ANUAL ─────────────────────
function atualizarProgressoAnual() {
    const ano     = new Date().getFullYear();
    const hoje    = new Date();
    const diaDoAno = Math.floor((hoje - new Date(ano, 0, 0)) / 86400000);
    const totalDias = 365;
    const pct = Math.round((diaDoAno / totalDias) * 100);
    document.getElementById('progresso-pct').textContent = pct + '%';
    document.getElementById('progresso-fill').style.width = pct + '%';
}

// ─── PRÓXIMO POST ─────────────────────────
function atualizarProximoPost() {
    const hoje    = new Date(); hoje.setHours(0,0,0,0);
    const futuros = cronogramaPosts
        .filter(p => new Date(p.data + 'T00:00:00') >= hoje)
        .sort((a,b) => a.data.localeCompare(b.data));

    const pill = document.getElementById('proximo-post-pill');
    if (futuros.length === 0) { pill.style.display = 'none'; return; }

    const prox = futuros[0];
    const d    = new Date(prox.data + 'T00:00:00');
    const diff = Math.round((d - hoje) / 86400000);
    const label = diff === 0 ? 'Hoje!' : diff === 1 ? 'Amanhã' : `Em ${diff} dias`;

    document.getElementById('proximo-post-data').textContent = `${label} · ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    document.getElementById('proximo-post-tema').textContent = prox.tema;
    pill.style.display = 'block';
}

// ─── STATUS DA SEMANA ─────────────────────
function atualizarSemana() {
    const hoje  = new Date(); hoje.setHours(0,0,0,0);
    const diasSemana = [];
    const diaSemana  = hoje.getDay();
    for (let i = 0; i < 7; i++) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - diaSemana + i);
        diasSemana.push(d);
    }

    const semanaEl = document.getElementById('semana-posts');
    const nomesDia = ['D','S','T','Q','Q','S','S'];
    const postsSemana = diasSemana.map(d => {
        const iso = d.toISOString().slice(0,10);
        const posts = cronogramaPosts.filter(p => p.data === iso);
        return { dia: d, posts };
    }).filter(x => x.posts.length > 0);

    if (postsSemana.length === 0) {
        semanaEl.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,.3);padding:4px 0">Nenhum post esta semana</div>`;
        return;
    }

    semanaEl.innerHTML = '';
    postsSemana.forEach(({ dia, posts }) => {
        const isHoje = dia.toDateString() === hoje.toDateString();
        posts.forEach(p => {
            const row = document.createElement('div');
            row.className = 'semana-post-row';
            row.innerHTML = `
                <div class="semana-post-dia ${isHoje ? 'hoje-dia' : ''}">${nomesDia[dia.getDay()]}</div>
                <div class="semana-post-info">
                    <div class="semana-post-tema">${escHtml(p.tema)}</div>
                    <div class="semana-post-tipo">${p.tipo}</div>
                </div>
                <div class="semana-post-status ${isHoje ? 'status-agendado' : dia < hoje ? 'status-publicado' : 'status-pendente'}"></div>
            `;
            semanaEl.appendChild(row);
        });
    });
}

// ─── LIMPAR CHAT ─────────────────────────
window.limparChat = function() {
    historico = [];
    mostrarBemVindo();
    toast('Conversa limpa', '', 'info');
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
            <a href="${escHtml(art.href)}" target="_blank" class="artigo-chat-link" onclick="event.stopPropagation()">
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

// ─── TRADUZIR ────────────────────────────
window.traduzirGrupo = async function(btn, urls) {
    if (!paisAtual) { toast('Sem país', 'Selecione um país', 'aviso'); return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traduzindo...';
    loadingText.textContent = 'Traduzindo artigos...';
    loadingOverlay.style.display = 'flex';
    adicionarMsgUsuario(`Traduzir ${urls.length} artigo${urls.length !== 1 ? 's' : ''}`);
    try {
        const r = await fetch('/traduzir-selecionados', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ pais: paisAtual, urls })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        loadingOverlay.style.display = 'none';
        if (data.sucesso) {
            contadorTraducoes++;
            atualizarMetricas();
            mostrarDownloads(data.arquivos || []);
            btn.closest('.artigos-acoes').querySelector('.traduzir-grupo-btn').outerHTML =
                `<span class="traduzido-ok"><i class="fa-solid fa-circle-check"></i> Traduzido!</span>`;
            toast('Tradução concluída!', `${urls.length} artigo${urls.length !== 1 ? 's' : ''}`, 'sucesso');
        } else {
            adicionarMsgAlfa('⚠️ Erro ao traduzir: ' + (data.erro || 'falha'));
            toast('Erro ao traduzir', data.erro || '', 'erro');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-language"></i> Tentar novamente';
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgAlfa('⚠️ Erro de conexão durante a tradução.');
        toast('Erro de conexão', '', 'erro');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-language"></i> Tentar novamente';
    }
};

window.selecionarGrupoParaTraduzir = function(btn, urls) {
    urls.forEach(url => selecionados.add(url));
    atualizarSelecaoBadge();
    atualizarMetricas();
    document.querySelectorAll('.artigo-chat-card').forEach(card => {
        if (urls.includes(card.dataset.url)) card.classList.add('selecionado');
    });
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Adicionados';
    btn.disabled = true;
    toast('Adicionados à seleção', `${urls.length} artigos`, 'info');
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
        `✅ **${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''}** pronto${arquivos.length !== 1 ? 's' : ''} para download:`,
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
        else        { selecionados.add(url);    card.classList.add('selecionado');    }
    });
    btn.textContent = todos ? 'Selecionar todos' : 'Desmarcar todos';
    atualizarSelecaoBadge();
    atualizarMetricas();
};

function toggleCard(card, url) {
    if (selecionados.has(url)) { selecionados.delete(url); card.classList.remove('selecionado'); }
    else                        { selecionados.add(url);    card.classList.add('selecionado');    }
    atualizarSelecaoBadge();
    atualizarMetricas();
}

function atualizarSelecaoBadge() {
    const n = selecionados.size;
    selecaoCount.textContent = n;
    selecaoBadge.style.display = n > 0 ? 'flex' : 'none';
    btnTraduzir.style.display  = n > 0 ? 'flex' : 'none';
}

window.traduzirSelecionados = async function() {
    if (selecionados.size === 0 || !paisAtual) return;
    const urls = Array.from(selecionados);
    loadingText.textContent = 'Traduzindo artigos selecionados...';
    loadingOverlay.style.display = 'flex';
    adicionarMsgUsuario(`Traduzir ${urls.length} selecionado${urls.length !== 1 ? 's' : ''}`);
    try {
        const r = await fetch('/traduzir-selecionados', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ pais: paisAtual, urls })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        loadingOverlay.style.display = 'none';
        if (data.sucesso) {
            contadorTraducoes++;
            mostrarDownloads(data.arquivos || []);
            selecionados.clear();
            atualizarSelecaoBadge();
            atualizarMetricas();
            toast('Tradução concluída!', `${urls.length} arquivos prontos`, 'sucesso');
        } else {
            adicionarMsgAlfa('⚠️ Erro ao traduzir: ' + (data.erro || ''));
            toast('Erro', data.erro || '', 'erro');
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgAlfa('⚠️ Erro de conexão durante a tradução.');
        toast('Erro de conexão', '', 'erro');
    }
};

// ─── MODALS ──────────────────────────────
window.fecharModal = function(id) {
    document.getElementById(id).style.display = 'none';
};
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['modal-briefing','modal-comparar','modal-resumir','modal-cronograma','modal-add-post']
            .forEach(id => document.getElementById(id).style.display = 'none');
    }
});

// ─── HELPERS DE MENSAGEM ─────────────────
function adicionarMsgUsuario(texto) {
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
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
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    const row = document.createElement('div');
    row.className = 'msg-row alfa';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

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
