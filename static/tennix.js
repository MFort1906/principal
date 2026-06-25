// ── Aplica tema imediatamente para evitar flash de tema errado ──
(function() {
    var t = localStorage.getItem('tennix_tema') || 'light';
    document.documentElement.setAttribute('data-theme', t);
})();

/* ═════════════════════════════════════════
   TENNIX.JS — Assistente Inteligente Tennant
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
let cronogramaPosts = JSON.parse(localStorage.getItem('tennix_cronograma') || '[]');
let cronogramaAno   = new Date().getFullYear();
let cronogramaMes   = new Date().getMonth(); // 0-11
let diaSelecionado  = null;

// ─── REFS ────────────────────────────────
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const btnSend        = document.getElementById('btn-send');
const selectPais     = document.getElementById('pais-tennix');
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
    const shell = document.getElementById('tennix-shell');
    const btn   = document.getElementById('btn-foco');
    shell.classList.toggle('modo-foco', modoFoco);
    btn.innerHTML = modoFoco
        ? '<i class="fa-solid fa-compress"></i>'
        : '<i class="fa-solid fa-expand"></i>';
};

// ─── TEMA ESCURO/CLARO (escolha do usuário) ──────────────
function aplicarTema(tema) {
    // Aplica no <html> para máxima especificidade via [data-theme]
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('tennix_tema', tema);
    // Atualiza ícone
    const icon = document.getElementById('tema-icon');
    if (icon) icon.className = tema === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    // Atualiza tooltip
    const btn = document.getElementById('btn-tema-toggle');
    if (btn) btn.setAttribute('data-tooltip', tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
}

window.toggleTemaUsuario = function() {
    const atual = document.documentElement.getAttribute('data-theme') || 'light';
    aplicarTema(atual === 'dark' ? 'light' : 'dark');
};

// Aplica tema salvo assim que o DOM estiver pronto (ícone precisa existir)
document.addEventListener('DOMContentLoaded', function() {
    const saved = localStorage.getItem('tennix_tema') || 'light';
    aplicarTema(saved);
});

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
        <div class="empty-state-titulo">Olá! Sou a TENNIX 👋</div>
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
    skWrap.className = 'msg-row tennix';
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
            adicionarMsgTennix(`⚠️ Não consegui carregar os artigos de **${paisNome}**.`);
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

        adicionarMsgTennix(
            `✅ Carreguei **${artigosDisponiveis.length} artigos** do blog da Tennant em **${paisNome}**.\n\nO que deseja fazer?\n- *"Filtre artigos sobre limpeza"*\n- Use os **chips de filtro** acima para filtrar por categoria\n- Clique em **Briefing** para gerar uma pauta`
        );
        toast('Artigos carregados!', `${artigosDisponiveis.length} artigos de ${paisNome}`, 'sucesso');

    } catch {
        chatMessages.innerHTML = '';
        adicionarMsgTennix('⚠️ Erro de conexão ao carregar os artigos.');
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
        const r = await fetch('/tennix-chat', {
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
            adicionarMsgTennix('⚠️ ' + data.erro);
            toast('Erro', data.erro, 'erro');
        } else {
            historico.push({ role: 'user', content: texto });
            historico.push({ role: 'assistant', content: data.texto || '' });
            const artigos = data.artigos_filtrados || [];
            adicionarMsgTennix(data.texto || '', null, artigos);
            if (artigos.length > 0) {
                contadorBuscas++;
                salvarHistoricoSessao(texto, artigos);
                atualizarMetricas();
                toast('Artigos encontrados', `${artigos.length} resultado${artigos.length !== 1 ? 's' : ''} para "${texto.slice(0,30)}..."`, 'info');
            }
        }
    } catch {
        removerTyping();
        adicionarMsgTennix('⚠️ Erro de conexão. Verifique o servidor e tente novamente.');
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
        adicionarMsgTennix('📭 Nenhuma busca registrada nesta sessão ainda.');
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
    adicionarMsgTennix(`🕐 **Histórico desta sessão** (${historicoSessao.length} busca${historicoSessao.length !== 1 ? 's' : ''}):`, null, null, wrap);
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
    adicionarMsgTennix(`🔁 Busca: *"${item.tema}"* — **${artigosObj.length} artigos**`, null, artigosObj);
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
    adicionarMsgTennix('✅ Arquivo CSV gerado e baixado!', null, null, dlWrap);
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
        const r = await fetch('/tennix-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();
        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar briefing</button>`;
        adicionarMsgTennix(data.texto || '⚠️ Erro ao gerar briefing.', null, null, copyWrap);
        toast('Briefing gerado!', `Tema: ${tema}`, 'sucesso');
    } catch {
        removerTyping();
        adicionarMsgTennix('⚠️ Erro ao gerar briefing. Tente novamente.');
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
        if (!data.sucesso) { adicionarMsgTennix(`⚠️ Não consegui carregar artigos de ${paisBNome}.`); return; }

        const artigosB = data.artigos || [];
        adicionarTyping();
        const prompt = `Compare os blogs de dois países e identifique lacunas de conteúdo.
PAÍS A — ${paisNomeAtual} (${artigosDisponiveis.length} artigos):
${artigosDisponiveis.slice(0,60).map(a => `- ${a.title || a.href}`).join('\n')}
PAÍS B — ${paisBNome} (${artigosB.length} artigos):
${artigosB.slice(0,60).map(a => `- ${a.title || a.href}`).join('\n')}
Responda em JSON: {"texto": "análise em markdown: 1) Temas exclusivos País A, 2) Temas exclusivos País B, 3) Temas comuns, 4) Recomendações"}`;

        const r2 = await fetch('/tennix-chat', {
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
        adicionarMsgTennix(data2.texto || '⚠️ Erro na análise.', null, null, badgeWrap);
        toast('Comparação concluída!', `${paisNomeAtual} vs ${paisBNome}`, 'sucesso');
    } catch {
        loadingOverlay.style.display = 'none';
        removerTyping();
        adicionarMsgTennix('⚠️ Erro ao comparar países.');
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
        const r = await fetch('/tennix-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ mensagem: prompt, historico: [], pais: paisAtual, pais_nome: paisNomeAtual, artigos: [] })
        });
        if (r.status === 401) { window.location.href = '/'; return; }
        const data = await r.json();
        removerTyping();
        const copyWrap = document.createElement('div');
        copyWrap.className = 'copy-wrap';
        copyWrap.innerHTML = `<button class="copy-btn" onclick="copiarTexto(this)"><i class="fa-regular fa-copy"></i> Copiar resumo</button>`;
        adicionarMsgTennix(data.texto || '⚠️ Erro ao gerar resumo.', null, null, copyWrap);
        toast('Resumo gerado!', '', 'sucesso');
    } catch {
        removerTyping();
        adicionarMsgTennix('⚠️ Erro ao resumir. Tente novamente.');
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
    try { localStorage.setItem('tennix_cronograma_meta', JSON.stringify(semImagem)); } catch(_) {}
    // Salva imagens separadamente por índice
    cronogramaPosts.forEach((p, i) => {
        if (p.imagem && p.imagem !== '__HAS_IMG__') {
            try { localStorage.setItem(`tennix_img_${i}`, p.imagem); } catch(_) {}
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

        const r = await fetch('/tennix-chat', {
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
            adicionarMsgTennix('⚠️ Erro ao traduzir: ' + (data.erro || 'falha'));
            toast('Erro ao traduzir', data.erro || '', 'erro');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-language"></i> Tentar novamente';
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgTennix('⚠️ Erro de conexão durante a tradução.');
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
    adicionarMsgTennix(
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
            adicionarMsgTennix('⚠️ Erro ao traduzir: ' + (data.erro || ''));
            toast('Erro', data.erro || '', 'erro');
        }
    } catch {
        loadingOverlay.style.display = 'none';
        adicionarMsgTennix('⚠️ Erro de conexão durante a tradução.');
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

function adicionarMsgTennix(texto, hora = null, artigosFiltrados = null, extraEl = null) {
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    const row = document.createElement('div');
    row.className = 'msg-row tennix';
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
    row.className = 'msg-row tennix typing-row';
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

// ══════════════════════════════════════════════════════
// 🎨 ADMIN — Temas Comemorativos
// ══════════════════════════════════════════════════════

const TEMAS_INFO = {
    padrao:       { nome: 'Padrão',        emoji: '🟢', particles: [] },
    natal:        { nome: 'Natal',         emoji: '🎄', particles: ['❄️','⛄','🎅','🎁','✨','🌟'] },
    ano_novo:     { nome: 'Ano Novo',      emoji: '🎆', particles: ['🎆','🎇','✨','⭐','🌟','💫'] },
    pascoa:       { nome: 'Páscoa',        emoji: '🐣', particles: ['🐣','🐰','🥚','🌸','🌷','🌼'] },
    carnaval:     { nome: 'Carnaval',      emoji: '🎭', particles: ['🎭','🎊','🎉','🎈','✨','🌈'] },
    halloween:    { nome: 'Halloween',     emoji: '🎃', particles: ['🎃','👻','🦇','🕷️','🍬','💀'] },
    junina:       { nome: 'Festa Junina',  emoji: '🎡', particles: ['🎡','🌽','🎠','⭐','🌟','🎆'] },
    dia_das_maes: { nome: 'Dia das Mães',  emoji: '💐', particles: ['💐','🌷','🌸','💖','🌺','✨'] },
    dia_dos_pais: { nome: 'Dia dos Pais',  emoji: '👔', particles: ['⭐','🌟','✨','💙','🎉','🎊'] },
};

let temaAtual       = 'padrao';
let temaSelecionado = 'padrao';
let particleTimer   = null;

// ── Abrir painel admin ──
window.abrirAdminTema = function() {
    document.getElementById('modal-admin-tema').style.display = 'flex';
    _renderTemaCards();
    _atualizarStatusTema();
};

// ── Selecionar card (visual) ──
function _renderTemaCards() {
    document.querySelectorAll('.admin-tema-card').forEach(card => {
        const t = card.dataset.tema;
        card.classList.toggle('selecionado', t === temaSelecionado);
        card.classList.toggle('ativo-agora', t === temaAtual);
        card.onclick = () => {
            temaSelecionado = t;
            _renderTemaCards();
        };
    });
}

function _atualizarStatusTema() {
    const info = TEMAS_INFO[temaAtual] || TEMAS_INFO.padrao;
    document.getElementById('admin-tema-status-txt').innerHTML =
        `Tema ativo: <strong>${info.emoji} ${info.nome}</strong>`;
}

// ── Aplicar tema (chama API) ──
window.aplicarTemaSelecionado = async function() {
    const senha = document.getElementById('admin-senha-input').value.trim();
    if (!senha) { toast('Atenção', 'Digite a senha de administrador.', 'aviso'); return; }

    const btn = document.getElementById('btn-aplicar-tema');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aplicando...';

    try {
        const r = await fetch('/admin/tema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ senha_admin: senha, tema: temaSelecionado, ativo: true })
        });
        const data = await r.json();

        if (data.sucesso) {
            temaAtual = temaSelecionado;
            _aplicarTemaVisual(temaAtual);
            _atualizarStatusTema();
            _renderTemaCards();
            const info = TEMAS_INFO[temaAtual] || TEMAS_INFO.padrao;
            toast('Tema aplicado!', `${info.emoji} ${info.nome} ativado com sucesso.`, 'sucesso');
            // Limpa senha após uso
            document.getElementById('admin-senha-input').value = '';
        } else {
            toast('Erro', data.erro || 'Não foi possível aplicar o tema.', 'erro');
        }
    } catch (e) {
        toast('Erro de conexão', 'Não foi possível conectar ao servidor.', 'erro');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Aplicar tema';
    }
};

// ── Desativar tema ──
window.desativarTema = async function() {
    const senha = document.getElementById('admin-senha-input').value.trim();
    if (!senha) { toast('Atenção', 'Digite a senha de administrador.', 'aviso'); return; }

    try {
        const r = await fetch('/admin/tema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ senha_admin: senha, tema: 'padrao', ativo: false })
        });
        const data = await r.json();
        if (data.sucesso) {
            temaAtual       = 'padrao';
            temaSelecionado = 'padrao';
            _aplicarTemaVisual('padrao');
            _atualizarStatusTema();
            _renderTemaCards();
            toast('Tema restaurado', '🟢 Visual padrão ativado.', 'sucesso');
            document.getElementById('admin-senha-input').value = '';
        } else {
            toast('Erro', data.erro || 'Senha incorreta.', 'erro');
        }
    } catch (e) {
        toast('Erro de conexão', '', 'erro');
    }
};

// ── Carregar tema salvo ao iniciar ──
async function carregarTemaInicial() {
    try {
        const r = await fetch('/admin/tema', { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        if (data.sucesso && data.ativo && data.tema && data.tema !== 'padrao') {
            temaAtual       = data.tema;
            temaSelecionado = data.tema;
            _aplicarTemaVisual(data.tema);
        }
    } catch { /* silencioso */ }
}

// ── Aplicar visualmente ──
function _aplicarTemaVisual(tema) {
    // Remove todos os temas do body
    Object.keys(TEMAS_INFO).forEach(t => document.body.classList.remove(`tema-${t}`));
    _limparParticulas();

    if (tema && tema !== 'padrao') {
        document.body.classList.add(`tema-${tema}`);
        _iniciarParticulas(tema);
    }

    // Badge na sidebar
    const badge = document.getElementById('admin-tema-badge');
    if (badge) badge.style.display = (tema && tema !== 'padrao') ? 'inline' : 'none';
}

// ── Partículas ──
function _iniciarParticulas(tema) {
    const container = document.getElementById('tema-particles');
    if (!container) return;
    const emojis = TEMAS_INFO[tema]?.particles || [];
    if (!emojis.length) return;

    function criarParticula() {
        const el = document.createElement('span');
        el.className = 'tema-particle';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left    = Math.random() * 100 + 'vw';
        el.style.fontSize = (14 + Math.random() * 14) + 'px';
        const dur  = 8 + Math.random() * 14;
        const delay = Math.random() * 6;
        el.style.animation = `floatParticle ${dur}s ${delay}s linear infinite`;
        container.appendChild(el);
        // Limita a 30 partículas
        const all = container.querySelectorAll('.tema-particle');
        if (all.length > 30) all[0].remove();
    }

    // Cria batch inicial
    for (let i = 0; i < 12; i++) criarParticula();
    // Adiciona gradualmente
    particleTimer = setInterval(criarParticula, 2500);
}

function _limparParticulas() {
    if (particleTimer) { clearInterval(particleTimer); particleTimer = null; }
    const c = document.getElementById('tema-particles');
    if (c) c.innerHTML = '';
}

// ── Hook na inicialização ──
const _origDOMReady = window.addEventListener;
document.addEventListener('DOMContentLoaded', () => {
    carregarTemaInicial();
});

/* ═══════════════════════════════════════════════════════
   MÓDULO: AUDITORIA TENNANT
   Verifica se cada máquina do site possui os documentos
   obrigatórios (Folheto, Guia, Manual de Peças, Manual
   do Operador, Tabela de Parede).

   ESTRATÉGIA:
   O site tennantco.com carrega a seção de documentação
   via JavaScript assíncrono — o HTML estático não expõe
   os PDFs. Por isso usamos a Claude API com web_search
   para buscar cada documento por modelo, pesquisando
   diretamente no site da Tennant.
════════════════════════════════════════════════════════ */

// ─── Estado da auditoria ───────────────────────────────
let auditoriaResultados = [];
let auditoriaEmAndamento = false;

// ─── Labels dos documentos ────────────────────────────
const DOC_LABELS = {
    folheto:         'Folheto',
    guia:            'Guia de peças de reposição',
    manual_pecas:    'Manual de peças',
    manual_operador: 'Manual do operador',
    tabela_parede:   'Tabela de parede'
};

// ─── Categorias de máquinas disponíveis ──────────────
const CATEGORIAS_MAQUINAS = [
    'Extratoras de carpete',
    'Polidoras e enceradeiras',
    'Aspiradores',
    'Equipamento de limpeza especializada',
    'Lavadoras de alta pressão',
    'Lavadoras de piso operação a pé',
    'Lavadoras de piso operação a bordo',
    'Lavadoras robóticas',
    'Varredeiras de operação a bordo',
    'Varredeiras de operação a pé',
    'Varredeiras-Lavadoras',
];

// ─── Termos de busca por tipo de documento ───────────
// Cada entrada: array de termos alternativos que buscamos
const DOC_SEARCH_TERMS = {
    folheto:         ['folheto', 'brochure', 'datasheet', 'ficha técnica'],
    guia:            ['guia de peças de reposição', 'common replacement parts', 'peças de reposição e consumíveis'],
    manual_pecas:    ['parts manual', 'manual de peças', 'parts list'],
    manual_operador: ['manual do operador', 'operator manual', 'manual de operação'],
    tabela_parede:   ['tabela de parede', 'wall chart', 'use and care guide']
};

// ─── Abrir modal ──────────────────────────────────────
window.abrirAuditoria = function() {
    novaAuditoria();
    document.getElementById('modal-auditoria').style.display = 'flex';
};

window.novaAuditoria = function() {
    document.getElementById('auditoria-config').style.display = 'block';
    document.getElementById('auditoria-progresso').style.display = 'none';
    document.getElementById('auditoria-resultado').style.display = 'none';
    document.getElementById('btn-aud-nova').style.display = 'none';
    document.getElementById('btn-aud-exportar').style.display = 'none';
    auditoriaResultados = [];
    auditoriaEmAndamento = false;
    renderizarCategorias();
};

function renderizarCategorias() {
    const container = document.getElementById('categorias-maquinas');
    if (!container) return;
    container.innerHTML = '';

    // As 5 categorias solicitadas ficam pré-marcadas, o restante desmarcado
    const preChecked = new Set([
        'Extratoras de carpete',
        'Polidoras e enceradeiras',
        'Aspiradores',
        'Equipamento de limpeza especializada',
        'Lavadoras de alta pressão',
    ]);

    CATEGORIAS_MAQUINAS.forEach(cat => {
        const label = document.createElement('label');
        label.className = 'cat-check-label';
        const checked = preChecked.has(cat) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" class="cat-check" value="${escHtml(cat)}" ${checked}> ${escHtml(cat)}`;
        container.appendChild(label);
    });
}

// ─── Iniciar auditoria ────────────────────────────────
window.iniciarAuditoria = async function() {
    const docsSelecionados = [...document.querySelectorAll('.doc-check:checked')].map(c => c.value);
    if (docsSelecionados.length === 0) {
        toast('Selecione documentos', 'Marque ao menos um documento para verificar.', 'aviso');
        return;
    }

    const categoriasSelecionadas = [...document.querySelectorAll('.cat-check:checked')].map(c => c.value);
    if (categoriasSelecionadas.length === 0) {
        toast('Selecione categorias', 'Marque ao menos uma categoria de máquinas.', 'aviso');
        return;
    }

    document.getElementById('auditoria-config').style.display = 'none';
    document.getElementById('auditoria-progresso').style.display = 'block';
    auditoriaEmAndamento = true;
    auditoriaResultados = [];

    setAudProg(5, 'Identificando máquinas no site da Tennant...');
    logAud(`🚀 Iniciando auditoria — ${categoriasSelecionadas.length} categoria(s) selecionada(s)`);
    logAud(`📂 Categorias: ${categoriasSelecionadas.join(', ')}`);

    try {
        // ── Etapa 1: Listar máquinas ─────────────────
        const maquinas = await obterListaMaquinas(categoriasSelecionadas);
        if (!maquinas || maquinas.length === 0) throw new Error('Nenhuma máquina encontrada nas categorias selecionadas.');

        setAudProg(15, `${maquinas.length} máquinas encontradas. Verificando documentos...`);
        logAud(`✅ ${maquinas.length} máquinas identificadas`);

        // ── Etapa 2: Verificar documentos ────────────
        for (let i = 0; i < maquinas.length; i++) {
            const m = maquinas[i];
            const pct = 15 + Math.round(((i + 1) / maquinas.length) * 82);
            setAudProg(pct, `Verificando: ${m.nome} (${i+1}/${maquinas.length})`);
            logAud(`🔍 Buscando documentos de ${m.nome}...`);

            const resultado = await verificarDocumentosMaquina(m, docsSelecionados);
            auditoriaResultados.push(resultado);
            atualizarContadoresAud();

            if (i < maquinas.length - 1) await sleep(400);
        }

        setAudProg(100, '✅ Auditoria concluída!');
        logAud(`🎉 Auditoria finalizada — ${maquinas.length} máquinas analisadas.`);

        await sleep(700);
        mostrarResultadoAuditoria(docsSelecionados);

    } catch (err) {
        console.error('Auditoria erro:', err);
        setAudProg(0, 'Erro: ' + err.message);
        logAud(`❌ Erro fatal: ${err.message}`);
        toast('Erro na auditoria', err.message, 'erro');
        setTimeout(() => novaAuditoria(), 4000);
    }
};

// ─── Helper: sleep ────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Atualiza barra de progresso ─────────────────────
function setAudProg(pct, msg) {
    document.getElementById('aud-prog-bar').style.width = pct + '%';
    document.getElementById('aud-prog-sub').textContent = msg;
}

function logAud(msg) {
    const log = document.getElementById('aud-prog-log');
    const line = document.createElement('div');
    line.className = 'aud-log-line';
    line.textContent = msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

function atualizarContadoresAud() {
    const ok   = auditoriaResultados.filter(r => r.status === 'completo').length;
    const warn = auditoriaResultados.filter(r => r.status === 'pendente').length;
    const err  = auditoriaResultados.filter(r => r.status === 'vazio' || r.status === 'erro').length;
    document.getElementById('aud-ok-count').textContent   = ok;
    document.getElementById('aud-warn-count').textContent = warn;
    document.getElementById('aud-err-count').textContent  = err;
}

// ─── Etapa 1: Listar máquinas ────────────────────────
async function obterListaMaquinas(categorias) {
    const r = await fetch('/tennix-auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tipo: 'listar_maquinas', categorias: categorias || [] })
    });
    if (r.status === 401) { window.location.href = '/'; return []; }
    if (!r.ok) throw new Error(`Erro HTTP ${r.status} ao listar máquinas`);
    const data = await r.json();
    if (!data.sucesso) throw new Error(data.erro || 'Não foi possível listar máquinas.');
    return data.maquinas || [];
}

// ─── VERSÃO ANTIGA (substituída) ─────────────────────
async function _obterListaMaquinas_ANTIGA() {
    const prompt = `Você é um auditor do site da Tennant Company Brasil. Use a ferramenta de busca web para acessar https://www.tennantco.com/pt_br/m%C3%A1quinas.html e as páginas de subcategoria listadas no menu:
- Lavadoras de piso de operação a bordo
- Lavadoras de operação a pé
- Lavadoras robóticas
- Varredeiras de operação a bordo
- Varredeiras de operação a pé
- Varredeiras-Lavadoras
- Extratoras de carpete
- Polidoras e enceradeiras
- Aspiradores
- Equipamento de limpeza especializado
- Lavadoras de alta pressão

Liste TODOS os modelos de máquinas individuais que encontrar (ex: T360, T300, A260, B70, A500, A650, T7, T16, T16AMR, S20, S30, M20, M30, etc.).

Para cada modelo, inclua o nome do modelo e a URL da página do produto no site pt_br da Tennant.

Responda SOMENTE com JSON, sem texto extra, sem markdown:
{"maquinas":[{"nome":"T360","url":"https://www.tennantco.com/pt_br/1/machines/scrubbers/product.t360...html","categoria":"Lavadora operação a pé"},{"nome":"T300","url":"...","categoria":"..."}]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Erro na API Claude');

    const texto = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

    // Extrair JSON
    const jsonMatch = texto.match(/\{[\s\S]*"maquinas"[\s\S]*\}/);
    if (!jsonMatch) {
        // Fallback: tentar parsear direto
        try { return JSON.parse(texto.replace(/```json|```/g, '').trim()).maquinas || []; }
        catch { throw new Error('IA não retornou lista de máquinas em formato JSON.'); }
    }
    return JSON.parse(jsonMatch[0]).maquinas || [];
}

// ─── Etapa 2: Verificar documentos por modelo ────────
// Usa o endpoint /tennix-auditoria no backend (OpenAI GPT-4o + web search).
async function verificarDocumentosMaquina(maquina, docsParaVerificar) {
    try {
        const r = await fetch('/tennix-auditoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                tipo: 'verificar_docs',
                maquina: maquina,
                docs: docsParaVerificar
            })
        });
        if (r.status === 401) { window.location.href = '/'; return null; }
        if (!r.ok) throw new Error(`Erro HTTP ${r.status}`);
        const data = await r.json();
        if (!data.sucesso) throw new Error(data.erro || 'Erro ao verificar documentos');
        return {
            nome:       data.nome,
            url:        data.url,
            categoria:  data.categoria,
            documentos: data.documentos,
            presentes:  data.presentes,
            ausentes:   data.ausentes,
            status:     data.status
        };
    } catch (err) {
        const docs = {};
        docsParaVerificar.forEach(d => { docs[d] = 'erro'; });
        return { nome: maquina.nome, url: maquina.url, categoria: maquina.categoria || '', documentos: docs, presentes: [], ausentes: docsParaVerificar, status: 'erro', erro: err.message };
    }
}

// ─── VERSÃO ANTIGA (substituída) ─────────────────────
async function _verificarDocumentosMaquina_ANTIGA(maquina, docsParaVerificar) {
    // Monta queries de busca para cada documento
    const docsInfo = docsParaVerificar.map(d => {
        const termos = DOC_SEARCH_TERMS[d];
        return `- ${DOC_LABELS[d]} (buscar por: ${termos.join(' OR ')})`;
    }).join('\n');

    const prompt = `Você é um auditor do site da Tennant Company Brasil. Sua tarefa é verificar se a máquina "${maquina.nome}" possui os seguintes documentos disponíveis para download no site tennantco.com/pt_br.

Use a ferramenta de busca web para pesquisar cada documento. Estratégia:
1. Acesse a página do produto: ${maquina.url}
2. Busque no site por PDFs do modelo ${maquina.nome} usando queries como:
   - site:tennantco.com "${maquina.nome}" folheto
   - site:tennantco.com "${maquina.nome}" parts manual
   - site:tennantco.com/content/dam "${maquina.nome}"

Documentos a verificar:
${docsInfo}

Para cada documento, determine se existe um link de PDF disponível para o modelo ${maquina.nome} no site da Tennant Brasil.
- "sim" = PDF encontrado com link real apontando para tennantco.com
- "nao" = PDF não encontrado

Responda SOMENTE com JSON:
{"documentos":{"folheto":"sim","guia":"nao","manual_pecas":"sim","manual_operador":"nao","tabela_parede":"nao"}}

Inclua APENAS as chaves: ${docsParaVerificar.join(', ')}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 800,
                tools: [{ type: 'web_search_20250305', name: 'web_search' }],
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const texto = data.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');

        // Extrair JSON
        let docs = {};
        const jsonMatch = texto.match(/\{[\s\S]*"documentos"[\s\S]*\}/);
        if (jsonMatch) {
            docs = JSON.parse(jsonMatch[0]).documentos || {};
        } else {
            // Tentar parsear direto
            try {
                docs = JSON.parse(texto.replace(/```json|```/g, '').trim()).documentos || {};
            } catch {
                // Se falhou tudo, marca como não encontrado
                docsParaVerificar.forEach(d => { docs[d] = 'nao'; });
            }
        }

        // Normalizar: qualquer valor diferente de "sim" vira "nao"
        docsParaVerificar.forEach(d => {
            if (!docs[d]) docs[d] = 'nao';
            docs[d] = String(docs[d]).toLowerCase().includes('sim') ? 'sim' : 'nao';
        });

        const presentes = docsParaVerificar.filter(d => docs[d] === 'sim');
        const ausentes  = docsParaVerificar.filter(d => docs[d] !== 'sim');

        let status = 'completo';
        if (ausentes.length === docsParaVerificar.length) status = 'vazio';
        else if (ausentes.length > 0) status = 'pendente';

        return { nome: maquina.nome, url: maquina.url, categoria: maquina.categoria || '', documentos: docs, presentes, ausentes, status };

    } catch (err) {
        const docs = {};
        docsParaVerificar.forEach(d => { docs[d] = 'erro'; });
        return { nome: maquina.nome, url: maquina.url, categoria: maquina.categoria || '', documentos: docs, presentes: [], ausentes: docsParaVerificar, status: 'erro', erro: err.message };
    }
}

// ─── Mostrar resultado ────────────────────────────────
function mostrarResultadoAuditoria(docsVerificados) {
    document.getElementById('auditoria-progresso').style.display = 'none';
    document.getElementById('auditoria-resultado').style.display = 'block';
    document.getElementById('btn-aud-nova').style.display = 'inline-flex';
    document.getElementById('btn-aud-exportar').style.display = 'inline-flex';

    // Sumário
    const total = auditoriaResultados.length;
    const ok = auditoriaResultados.filter(r => r.status === 'completo').length;
    const warn = auditoriaResultados.filter(r => r.status === 'pendente').length;
    const vazio = auditoriaResultados.filter(r => r.status === 'vazio').length;
    const erro = auditoriaResultados.filter(r => r.status === 'erro').length;
    const pctOk = total > 0 ? Math.round((ok / total) * 100) : 0;

    document.getElementById('aud-sumario').innerHTML = `
        <div class="aud-sum-titulo">Resultado da auditoria</div>
        <div class="aud-sum-cards">
            <div class="aud-sum-card aud-sum-total">
                <div class="aud-sum-num">${total}</div>
                <div class="aud-sum-label">Máquinas analisadas</div>
            </div>
            <div class="aud-sum-card aud-sum-ok">
                <div class="aud-sum-num">${ok}</div>
                <div class="aud-sum-label">Completas (${pctOk}%)</div>
            </div>
            <div class="aud-sum-card aud-sum-warn">
                <div class="aud-sum-num">${warn}</div>
                <div class="aud-sum-label">Com pendências</div>
            </div>
            <div class="aud-sum-card aud-sum-err">
                <div class="aud-sum-num">${vazio + erro}</div>
                <div class="aud-sum-label">Sem documentos</div>
            </div>
        </div>
        <div class="aud-sum-barra-wrap">
            <div class="aud-sum-barra" style="width:${pctOk}%" title="${pctOk}% completo"></div>
        </div>
    `;

    renderTabelaAuditoria(auditoriaResultados, docsVerificados);
}

function renderTabelaAuditoria(resultados, docsVerificados) {
    const wrap = document.getElementById('aud-tabela-wrap');
    if (resultados.length === 0) {
        wrap.innerHTML = '<div class="aud-empty">Nenhum resultado para este filtro.</div>';
        return;
    }

    const statusLabel = { completo: '✅ Completo', pendente: '⚠️ Pendente', vazio: '❌ Sem docs', erro: '⚠️ Erro' };
    const statusClass = { completo: 'aud-status-ok', pendente: 'aud-status-warn', vazio: 'aud-status-err', erro: 'aud-status-warn' };

    let html = `<table class="aud-tabela">
        <thead>
            <tr>
                <th>Máquina</th>
                ${docsVerificados.map(d => `<th>${DOC_LABELS[d]}</th>`).join('')}
                <th>Status</th>
                <th>Faltando</th>
            </tr>
        </thead>
        <tbody>`;

    resultados.forEach(r => {
        const faltando = r.ausentes.map(d => DOC_LABELS[d]).join(', ') || '—';
        html += `<tr data-status="${r.status}">
            <td><a href="${escHtml(r.url)}" target="_blank" class="aud-link">${escHtml(r.nome)} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:9px"></i></a></td>
            ${docsVerificados.map(d => {
                const ok = r.documentos[d] === 'sim';
                return `<td class="aud-doc-cell ${ok ? 'aud-doc-ok' : 'aud-doc-falta'}">${ok ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>'}</td>`;
            }).join('')}
            <td><span class="aud-status-badge ${statusClass[r.status]}">${statusLabel[r.status] || r.status}</span></td>
            <td class="aud-faltando-cel">${faltando}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
}

// ─── Filtrar resultados ───────────────────────────────
window.filtrarResultados = function(btn, filtro) {
    document.querySelectorAll('.aud-filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');

    const docsVerificados = [...document.querySelectorAll('.doc-check:checked')].map(c => c.value);

    let dados = auditoriaResultados;
    if (filtro !== 'todos') dados = auditoriaResultados.filter(r => r.status === filtro);

    renderTabelaAuditoria(dados, docsVerificados.length ? docsVerificados :
        Object.keys(DOC_LABELS));
};

// ─── Exportar Excel (via backend) ────────────────────
window.exportarRelatorioAuditoria = async function() {
    if (!auditoriaResultados.length) { toast('Nada para exportar', '', 'aviso'); return; }

    const btnExportar = document.getElementById('btn-aud-exportar');
    const textoOriginal = btnExportar ? btnExportar.innerHTML : '';
    if (btnExportar) {
        btnExportar.disabled = true;
        btnExportar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel...';
    }

    const docKeys = Object.keys(auditoriaResultados[0]?.documentos || DOC_LABELS);

    try {
        const r = await fetch('/auditoria-exportar-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                resultados: auditoriaResultados,
                docs_verificados: docKeys
            })
        });

        if (r.status === 401) { window.location.href = '/'; return; }
        if (!r.ok) {
            const err = await r.json().catch(() => ({ erro: 'Erro desconhecido' }));
            throw new Error(err.erro || `Erro HTTP ${r.status}`);
        }

        // Baixar o arquivo
        const blob = await r.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `auditoria_tennant_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        toast('Excel exportado! 🎉', '3 abas: Resumo, Detalhe e Pendências', 'sucesso');

    } catch (err) {
        console.error('Erro ao exportar Excel:', err);
        toast('Erro ao exportar', err.message, 'erro');
    } finally {
        if (btnExportar) {
            btnExportar.disabled = false;
            btnExportar.innerHTML = textoOriginal || '<i class="fa-solid fa-file-excel"></i> Exportar Excel';
        }
    }
};


// ════════════════════════════════════════════════════
//  VITOR ESPIÃO — Monitoramento de Concorrentes (REAL)
// ════════════════════════════════════════════════════

// Estado persistente na sessão (sobrevive a re-renders, reseta ao recarregar)
let espiaoCache = [
    { id:1, name:'Kärcher',   url:'https://www.karcher.com/br',    category:'Limpeza Industrial',    emoji:'🇩🇪', color:'#FFD700', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:2, name:'Nilfisk',   url:'https://www.nilfisk.com/pt-br', category:'Limpeza Profissional',  emoji:'🇩🇰', color:'#1E90FF', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:3, name:'Hako',      url:'https://www.hako.com/br',       category:'Máquinas Municipais',   emoji:'🇩🇪', color:'#FF6B35', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:4, name:'Comac',     url:'https://www.comac.it',          category:'Lavadoras de Piso',     emoji:'🇮🇹', color:'#27AE60', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:5, name:'Fimap',     url:'https://www.fimap.com/br',      category:'Limpeza Sustentável',   emoji:'🇮🇹', color:'#8E44AD', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:6, name:'IPC Group', url:'https://www.ipcworldwide.com',  category:'Equip. de Limpeza',     emoji:'🌍',  color:'#E74C3C', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:7, name:'Alabia',    url:'https://alabia.com.br',         category:'Robôs de Limpeza',      emoji:'🇧🇷', color:'#00BCD4', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:8, name:'PUDU',      url:'https://www.pudurobotics.com/en', category:'Robôs de Limpeza',    emoji:'🇨🇳', color:'#F39C12', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
    { id:9, name:'Kunber',    url:'https://kunber.com.br',         category:'Equip. de Limpeza',     emoji:'🇧🇷', color:'#16A085', status:'pendente', alerts:0, mudancas:[], scanned_at: null },
];

const ESPIAO_ALERT_CFG = {
    produto: { label:'Produto',    bg:'#D1ECF1', color:'#0C5460', icon:'📦' },
    preco:   { label:'Preço',      bg:'#FFF3CD', color:'#856404', icon:'💰' },
    promo:   { label:'Promoção',   bg:'#FFF3CD', color:'#856404', icon:'🏷️' },
};

const ESPIAO_MSGS = [
    'Missão em andamento... 🕵️',
    'Escaneando o inimigo... 👁️',
    'Interceptando dados... 📡',
    'Nenhum movimento passa despercebido... 🦅',
    'Tennant sempre na frente! 💪',
    'Agente ativo. Situação sob controle. 🎯',
];

const ESPIAO_CORES_RELEVANCIA = {
    alta:  { bg:'#FDECEA', color:'#721C24', icon:'🔴' },
    media: { bg:'#FFF3CD', color:'#856404', icon:'🟡' },
    baixa: { bg:'#E8F5EE', color:'#1B5C38', icon:'🟢' },
};

let espiaoMsgIdx      = 0;
let espiaoMsgTimer    = null;
let espiaoFiltroAtual = 'all';
let espiaoSelecionado = null;
let espiaoScanning    = false;

window.abrirVitorEspiao = function() {
    document.getElementById('modal-espiao').style.display = 'flex';
    espiaoRenderGrid();
    espiaoAtualizarStats();
    espiaoAtualizarBadge();
    if (!espiaoMsgTimer) {
        espiaoMsgTimer = setInterval(() => {
            espiaoMsgIdx = (espiaoMsgIdx + 1) % ESPIAO_MSGS.length;
            const el = document.getElementById('espiao-subtitulo');
            if (el) el.textContent = ESPIAO_MSGS[espiaoMsgIdx];
        }, 3500);
    }
};

// Intercepta fecharModal para limpar timer
const _fecharModalOriginalEspiao = window.fecharModal;
window.fecharModal = function(id) {
    if (id === 'modal-espiao' && espiaoMsgTimer) {
        clearInterval(espiaoMsgTimer);
        espiaoMsgTimer = null;
    }
    _fecharModalOriginalEspiao(id);
};

function espiaoAtualizarStats() {
    const total    = espiaoCache.length;
    const alertas  = espiaoCache.filter(c => c.alerts > 0).length;
    const mudancas = espiaoCache.reduce((s, c) => s + (c.mudancas || []).length, 0);
    const online   = espiaoCache.filter(c => c.status === 'online').length;
    document.getElementById('esp-stat-total').textContent    = total;
    document.getElementById('esp-stat-alertas').textContent  = alertas;
    document.getElementById('esp-stat-mudancas').textContent = mudancas;
    document.getElementById('esp-stat-online').textContent   = online;
}

function espiaoAtualizarBadge() {
    const total = espiaoCache.reduce((s, c) => s + (c.alerts || 0), 0);
    const badge = document.getElementById('espiao-badge-alertas');
    if (!badge) return;
    if (total > 0) {
        badge.textContent = '🚨 ' + total + ' alerta' + (total > 1 ? 's' : '');
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function espiaoRenderGrid() {
    const grid = document.getElementById('espiao-grid');
    if (!grid) return;

    const lista = espiaoFiltroAtual === 'alertas'
        ? espiaoCache.filter(c => c.alerts > 0)
        : espiaoCache;

    if (lista.length === 0 && espiaoFiltroAtual === 'alertas') {
        grid.innerHTML = '<div class="espiao-empty-state" style="grid-column:1/-1">✅ Nenhum alerta ativo. Tudo calmo por enquanto!</div>';
        return;
    }

    grid.innerHTML = lista.map(c => {
        const isPendente = c.status === 'pendente';
        const checkedLabel = c.scanned_at ? `🕐 ${c.scanned_at}` : '⏳ Não escaneado';
        return `
        <div class="espiao-comp-card ${espiaoSelecionado === c.id ? 'selecionado' : ''}"
             style="border-color:${espiaoSelecionado === c.id ? c.color : ''}"
             onclick="espiaoSelecionar(${c.id})">
            ${c.alerts > 0 ? `<div class="espiao-alerta-pill">${c.alerts} 🔔</div>` : ''}
            ${isPendente && !espiaoScanning ? `<div class="espiao-pending-pill">aguardando scan</div>` : ''}
            <div class="espiao-comp-header">
                <span class="espiao-comp-emoji">${c.emoji}</span>
                <div>
                    <div class="espiao-comp-name">${c.name}</div>
                    <div class="espiao-comp-cat">${c.category}</div>
                </div>
            </div>
            <div class="espiao-comp-footer" style="margin-top:10px">
                <span class="espiao-status-${c.status}">
                    ${c.status === 'online' ? '🟢 online' : c.status === 'pendente' ? '⏳ pendente' : '🟡 ' + c.status}
                </span>
                <span class="espiao-comp-time">${checkedLabel}</span>
            </div>
        </div>`;
    }).join('');
}

window.espiaoFiltrar = function(modo, btn) {
    espiaoFiltroAtual = modo;
    document.querySelectorAll('.espiao-filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    espiaoSelecionado = null;
    document.getElementById('espiao-detalhe').style.display = 'none';
    espiaoRenderGrid();
};

window.espiaoSelecionar = function(id) {
    espiaoSelecionado = espiaoSelecionado === id ? null : id;
    espiaoRenderGrid();
    const painel = document.getElementById('espiao-detalhe');
    if (!espiaoSelecionado) { painel.style.display = 'none'; return; }

    const c = espiaoCache.find(x => x.id === espiaoSelecionado);
    const mudancas = c.mudancas || [];

    let changesHtml;
    if (c.status === 'pendente') {
        changesHtml = `<div class="espiao-empty-state">⏳ Este concorrente ainda não foi escaneado. Clique em <strong>Escanear tudo</strong>.</div>`;
    } else if (mudancas.length === 0) {
        changesHtml = `<div class="espiao-empty-state">😴 Nenhuma novidade detectada. Estão quietinhos por enquanto.</div>`;
    } else {
        changesHtml = `
            <div class="espiao-changes-label">📋 ${mudancas.length} novidade(s) detectada(s)</div>
            <div class="espiao-changes-list">
                ${mudancas.map(m => {
                    const tipoCfg  = ESPIAO_ALERT_CFG[m.tipo] || ESPIAO_ALERT_CFG.produto;
                    const relCfg   = ESPIAO_CORES_RELEVANCIA[m.relevancia] || ESPIAO_CORES_RELEVANCIA.media;
                    return `<div class="espiao-change-item" style="background:${tipoCfg.bg}">
                        <span class="espiao-change-icon">${tipoCfg.icon}</span>
                        <div class="espiao-change-body">
                            <span class="espiao-change-badge" style="color:${tipoCfg.color};border-color:${tipoCfg.color};background:${tipoCfg.bg}">${tipoCfg.label}</span>
                            <span class="espiao-rel-badge" style="color:${relCfg.color}">${relCfg.icon} ${m.relevancia}</span>
                            <span class="espiao-change-text" style="color:#1C1C1C;display:block;margin-top:4px">${m.texto}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    }

    painel.innerHTML = `
        <div class="espiao-detalhe-inner" style="border-color:${c.color}">
            <div class="espiao-det-header">
                <span style="font-size:32px">${c.emoji}</span>
                <div>
                    <div class="espiao-det-name">${c.name}</div>
                    <a class="espiao-det-url" href="${c.url}" target="_blank">${c.url} ↗</a>
                    ${c.scanned_at ? `<div style="font-size:11px;color:#8B949E;margin-top:3px">🕐 Último scan: ${c.scanned_at}</div>` : ''}
                </div>
            </div>
            ${changesHtml}
        </div>`;
    painel.style.display = 'block';
};

// ── Scan real via backend ────────────────────────────────────
window.espiaoScanearTudo = async function() {
    const btn = document.getElementById('espiao-scan-btn');
    if (!btn || btn.disabled || espiaoScanning) return;

    espiaoScanning = true;
    btn.disabled   = true;
    btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Escaneando...';

    // Mostra todos como "escaneando" visualmente
    espiaoCache.forEach(c => { c.status = 'escaneando'; });
    espiaoRenderGrid();

    try {
        const resp = await fetch('/espiao-escanear', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
        });

        if (resp.status === 401) { window.location.href = '/'; return; }
        if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`);

        const data = await resp.json();

        if (!data.sucesso) throw new Error(data.erro || 'Erro desconhecido');

        // Atualiza cache com resultados reais
        data.resultados.forEach(r => {
            const idx = espiaoCache.findIndex(c => c.id === r.id);
            if (idx !== -1) {
                espiaoCache[idx] = {
                    ...espiaoCache[idx],
                    status:     'online',
                    alerts:     r.alerts || 0,
                    mudancas:   r.mudancas || [],
                    scanned_at: r.scanned_at,
                };
            }
        });

        const totalAlertas = espiaoCache.reduce((s, c) => s + c.alerts, 0);
        espiaoAtualizarStats();
        espiaoAtualizarBadge();
        espiaoRenderGrid();

        // Atualiza painel de detalhe se algum estiver aberto
        if (espiaoSelecionado) espiaoSelecionar(espiaoSelecionado);

        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Concluído!';
        toast(
            'Varredura concluída! 🕵️',
            totalAlertas > 0
                ? `${totalAlertas} novidade(s) detectada(s) nos concorrentes.`
                : 'Nenhuma novidade detectada nos concorrentes.',
            totalAlertas > 0 ? 'aviso' : 'sucesso'
        );

    } catch (err) {
        console.error('Espião scan erro:', err);
        espiaoCache.forEach(c => { if (c.status === 'escaneando') c.status = 'pendente'; });
        espiaoRenderGrid();
        toast('Erro no scan 🕵️', err.message, 'erro');
        btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Escanear tudo';
    } finally {
        espiaoScanning = false;
        btn.disabled   = false;
        setTimeout(() => {
            if (btn.innerHTML.includes('Concluído'))
                btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Escanear tudo';
        }, 3000);
    }
};
