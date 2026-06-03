// ─── ELEMENTOS ────────────────────────────────────────────────
const selectPais        = document.getElementById('pais-busca');
const inputBusca        = document.getElementById('termo-busca');
const clearSearchBtn    = document.getElementById('clear-search');
const btnBuscar         = document.getElementById('btn-buscar');
const loadingBusca      = document.getElementById('loading-busca');
const barraResultados   = document.getElementById('barra-resultados');
const totalEncontrado   = document.getElementById('total-encontrado');
const paisNomeLabel     = document.getElementById('pais-nome-label');
const filtroAtivoLabel  = document.getElementById('filtro-ativo-label');
const btnSelecionarTodos= document.getElementById('btn-selecionar-todos');
const btnLimparSelecao  = document.getElementById('btn-limpar-selecao');
const filtroInline      = document.getElementById('filtro-inline');
const filtroTitulo      = document.getElementById('filtro-titulo');
const filtroCount       = document.getElementById('filtro-count');
const listaArtigos      = document.getElementById('lista-artigos');
const selecaoRodape     = document.getElementById('selecao-rodape');
const qtdSelecionados   = document.getElementById('qtd-selecionados');
const btnTraduzir       = document.getElementById('btn-traduzir');
const statusTraducao    = document.getElementById('status-traducao');
const statusTextTrad    = document.getElementById('status-text-trad');
const resultadoTraducao = document.getElementById('resultado-traducao');
const downloadsTraducao = document.getElementById('downloads-traducao');
const resultCountTrad   = document.getElementById('result-count-trad');

// ─── ESTADO ───────────────────────────────────────────────────
let artigos = [];          // lista completa retornada pela API
let selecionados = new Set(); // URLs selecionadas
let paisAtual = '';
let paisNomeAtual = '';

// ─── CARREGAR PAÍSES ──────────────────────────────────────────
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
    } catch (e) {
        selectPais.innerHTML = '<option>Erro ao carregar países</option>';
    }
}

// ─── TOGGLE VER TODOS ─────────────────────────────────────────
const toggleTodos = document.getElementById('toggle-todos');
const searchWrapEl = document.querySelector('.search-wrap');
const termoBuscaWrap = document.getElementById('termo-busca')?.closest('.field-group');

toggleTodos.addEventListener('change', () => {
  const ativo = toggleTodos.checked;
  if (termoBuscaWrap) {
    termoBuscaWrap.style.opacity = ativo ? '0.4' : '1';
    termoBuscaWrap.style.pointerEvents = ativo ? 'none' : '';
  }
  if (ativo) {
    inputBusca.value = '';
    clearSearchBtn.style.display = 'none';
  }
});

// ─── CLEAR SEARCH ─────────────────────────────────────────────
inputBusca.addEventListener('input', () => {
    clearSearchBtn.style.display = inputBusca.value ? 'block' : 'none';
});
clearSearchBtn.addEventListener('click', () => {
    inputBusca.value = '';
    clearSearchBtn.style.display = 'none';
    inputBusca.focus();
});

// ─── BUSCAR ARTIGOS ───────────────────────────────────────────
btnBuscar.addEventListener('click', buscarArtigos);
inputBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscarArtigos(); });

async function buscarArtigos() {
    const pais = selectPais.value;
    const busca = toggleTodos.checked ? '' : inputBusca.value.trim();

    // reset
    listaArtigos.style.display = 'none';
    listaArtigos.innerHTML = '';
    barraResultados.style.display = 'none';
    filtroInline.style.display = 'none';
    selecaoRodape.style.display = 'none';
    resultadoTraducao.style.display = 'none';
    statusTraducao.style.display = 'none';
    selecionados.clear();
    artigos = [];

    // loading
    loadingBusca.style.display = 'flex';
    setBuscarBtn(false);

    try {
        const r = await fetch('/buscar-artigos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais, busca })
        });

        if (r.status === 401) { window.location.href = '/'; return; }

        const data = await r.json();
        loadingBusca.style.display = 'none';
        setBuscarBtn(true);

        if (!data.sucesso) {
            mostrarErro(data.erro || 'Erro ao buscar artigos.');
            return;
        }

        artigos = data.artigos || [];
        paisAtual = pais;
        paisNomeAtual = data.pais_nome || pais;

        // Barra de resultados
        totalEncontrado.textContent = `${artigos.length} artigo${artigos.length !== 1 ? 's' : ''}`;
        paisNomeLabel.textContent = paisNomeAtual;

        if (busca) {
            filtroAtivoLabel.textContent = `"${busca}"`;
            filtroAtivoLabel.style.display = 'inline-flex';
        } else {
            filtroAtivoLabel.style.display = 'none';
        }

        barraResultados.style.display = 'flex';

        if (artigos.length === 0) {
            listaArtigos.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-newspaper"></i>
                    Nenhum artigo encontrado para os filtros aplicados.
                </div>`;
            listaArtigos.style.display = 'flex';
            return;
        }

        // Renderizar cards
        renderizarArtigos(artigos);
        listaArtigos.style.display = 'flex';
        filtroInline.style.display = 'flex';
        filtroTitulo.value = '';
        atualizarFiltroinline();

    } catch (err) {
        loadingBusca.style.display = 'none';
        setBuscarBtn(true);
        mostrarErro('Erro de conexão. Verifique o servidor.');
    }
}

// ─── RENDERIZAR CARDS ─────────────────────────────────────────
function renderizarArtigos(lista) {
    listaArtigos.innerHTML = '';
    lista.forEach((art, i) => {
        const card = document.createElement('div');
        card.className = 'artigo-card';
        card.dataset.url = art.href;
        card.dataset.titulo = art.title || art.href;
        card.style.animationDelay = `${Math.min(i * 0.04, 0.6)}s`;

        const isSel = selecionados.has(art.href);
        if (isSel) card.classList.add('selecionado');

        const hostname = (() => {
            try { return new URL(art.href).pathname.split('/').slice(-1)[0].replace('.html',''); }
            catch { return art.href; }
        })();

        card.innerHTML = `
            <div class="artigo-check">
                <i class="fa-solid fa-check"></i>
            </div>
            <div class="artigo-icon">
                <i class="fa-regular fa-file-lines"></i>
            </div>
            <div class="artigo-info">
                <div class="artigo-titulo" title="${escHtml(art.title || art.href)}">${escHtml(art.title || 'Sem título')}</div>
                <div class="artigo-url">${escHtml(hostname)}</div>
            </div>
            <a href="${escHtml(art.href)}" target="_blank" class="artigo-link" title="Abrir artigo original" onclick="event.stopPropagation()">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `;

        card.addEventListener('click', () => toggleSelecionado(card, art.href));
        listaArtigos.appendChild(card);
    });
}

function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── TOGGLE SELEÇÃO ───────────────────────────────────────────
function toggleSelecionado(card, url) {
    if (selecionados.has(url)) {
        selecionados.delete(url);
        card.classList.remove('selecionado');
    } else {
        selecionados.add(url);
        card.classList.add('selecionado');
    }
    atualizarRodape();
}

function atualizarRodape() {
    const n = selecionados.size;
    qtdSelecionados.textContent = n;
    selecaoRodape.style.display = n > 0 ? 'flex' : 'none';
}

// ─── SELECIONAR TODOS / LIMPAR ────────────────────────────────
btnSelecionarTodos.addEventListener('click', () => {
    const cards = listaArtigos.querySelectorAll('.artigo-card:not(.oculto)');
    cards.forEach(card => {
        const url = card.dataset.url;
        selecionados.add(url);
        card.classList.add('selecionado');
    });
    atualizarRodape();
});

btnLimparSelecao.addEventListener('click', () => {
    selecionados.clear();
    listaArtigos.querySelectorAll('.artigo-card').forEach(c => c.classList.remove('selecionado'));
    atualizarRodape();
});

// ─── FILTRO INLINE ────────────────────────────────────────────
filtroTitulo.addEventListener('input', atualizarFiltroinline);

function atualizarFiltroinline() {
    const termo = filtroTitulo.value.toLowerCase().trim();
    const cards = listaArtigos.querySelectorAll('.artigo-card');
    let visiveis = 0;
    cards.forEach(card => {
        const titulo = (card.dataset.titulo || '').toLowerCase();
        const url = (card.dataset.url || '').toLowerCase();
        const match = !termo || titulo.includes(termo) || url.includes(termo);
        card.classList.toggle('oculto', !match);
        if (match) visiveis++;
    });
    filtroCount.textContent = termo ? `${visiveis} resultado${visiveis !== 1 ? 's' : ''}` : '';
}

// ─── TRADUZIR SELECIONADOS ────────────────────────────────────
btnTraduzir.addEventListener('click', traduzirSelecionados);

async function traduzirSelecionados() {
    if (selecionados.size === 0) return;

    const urls = Array.from(selecionados);

    // UI: esconder lista e rodapé, mostrar loading
    selecaoRodape.style.display = 'none';
    resultadoTraducao.style.display = 'none';
    statusTraducao.style.display = 'flex';
    statusTextTrad.textContent = `Traduzindo ${urls.length} artigo${urls.length !== 1 ? 's' : ''}`;

    // Scroll para o loader
    statusTraducao.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
        const r = await fetch('/traduzir-selecionados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais: paisAtual, urls })
        });

        if (r.status === 401) { window.location.href = '/'; return; }

        const data = await r.json();
        statusTraducao.style.display = 'none';

        if (data.sucesso) {
            const arquivos = data.arquivos || [];
            resultCountTrad.textContent = `${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''}`;
            downloadsTraducao.innerHTML = '';

            if (arquivos.length > 0) {
                arquivos.forEach((arq, i) => {
                    const a = document.createElement('a');
                    a.href = `/download/${encodeURIComponent(arq)}`;
                    a.className = 'dl-item';
                    a.style.animationDelay = `${i * 0.06}s`;
                    const nome = arq.includes('/') ? arq.split('/').pop() : arq;
                    a.innerHTML = `
                        <span class="dl-icon"><i class="fa-regular fa-file-word"></i></span>
                        <span class="dl-info">
                            <span class="dl-label">Artigo ${i + 1}</span>
                            <span class="dl-name">${nome}</span>
                        </span>
                        <i class="fa-solid fa-arrow-down dl-arr"></i>
                    `;
                    downloadsTraducao.appendChild(a);
                });
            } else {
                downloadsTraducao.innerHTML = `<div style="text-align:center;padding:16px;font-size:13px;color:var(--ts)">Nenhum arquivo gerado.</div>`;
            }

            resultadoTraducao.style.display = 'block';
            resultadoTraducao.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Limpar seleção após tradução
            selecionados.clear();
            listaArtigos.querySelectorAll('.artigo-card').forEach(c => c.classList.remove('selecionado'));

        } else {
            mostrarErro(data.erro || 'Erro ao traduzir.');
            atualizarRodape(); // re-exibe rodapé
        }

    } catch (err) {
        statusTraducao.style.display = 'none';
        mostrarErro('Erro de conexão durante a tradução.');
        atualizarRodape();
    }
}

// ─── HELPERS ──────────────────────────────────────────────────
function setBuscarBtn(enabled) {
    const inner = btnBuscar.querySelector('.run-btn-inner');
    if (inner) inner.innerHTML = enabled
        ? '<i class="fa-solid fa-magnifying-glass"></i><span>Buscar artigos</span>'
        : '<i class="fa-solid fa-spinner fa-spin"></i><span>Buscando...</span>';
    if (enabled) btnBuscar.removeAttribute('disabled');
    else btnBuscar.setAttribute('disabled', '');
}

function mostrarErro(msg) {
    listaArtigos.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-circle-exclamation" style="color:var(--red);opacity:0.7;"></i>
            ${escHtml(msg)}
        </div>`;
    listaArtigos.style.display = 'flex';
}

// ─── INIT ─────────────────────────────────────────────────────
carregarPaises();
