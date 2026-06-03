// ─── ELEMENTOS ───────────────────────────────────────────────
const form            = document.getElementById('scraper-form');
const statusDiv       = document.getElementById('status');
const statusText      = document.getElementById('status-text');
const resultadoDiv    = document.getElementById('resultado');
const downloadsDiv    = document.getElementById('downloads');
const resultCount     = document.getElementById('result-count');
const button          = document.getElementById('submit-btn');
const selectPais      = document.getElementById('pais');
const inputQtd        = document.getElementById('quantidade');
const avisoQtd        = document.getElementById('aviso-quantidade');

// ─── CARREGAR PAÍSES ─────────────────────────────────────────
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

// ─── VALIDAÇÃO ───────────────────────────────────────────────
inputQtd.addEventListener('input', () => {
    const v = parseInt(inputQtd.value);
    if (v > 50) { avisoQtd.style.display = 'flex'; inputQtd.value = 50; }
    else          avisoQtd.style.display = 'none';
});

// ─── SUBMIT ──────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pais      = selectPais.value;
    const quantidade = parseInt(inputQtd.value);

    if (quantidade > 50) { avisoQtd.style.display = 'flex'; return; }

    // Reset UI
    statusDiv.style.display    = 'flex';
    statusText.textContent     = 'Processando artigos';
    resultadoDiv.style.display = 'none';
    downloadsDiv.innerHTML     = '';

    setButton(false, '<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...');

    try {
        const r = await fetch('/rodar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pais, quantidade })
        });

        if (r.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/';
            return;
        }

        const data = await r.json();

        if (data.sucesso) {
            statusText.textContent = 'Concluído';

            // Mostrar resultado
            resultadoDiv.style.display = 'block';
            void resultadoDiv.offsetWidth;

            const arquivos = data.arquivos || [];
            if (resultCount) resultCount.textContent = `${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''}`;

            if (arquivos.length > 0) {
                arquivos.forEach((arq, i) => {
                    const a = document.createElement('a');
                    a.href      = `/download/${encodeURIComponent(arq)}`;
                    a.className = 'dl-item';
                    a.style.animationDelay = `${i * 0.06}s`;

                    // nome limpo (sem pasta)
                    const nome = arq.includes('/') ? arq.split('/').pop() : arq;

                    a.innerHTML = `
                        <span class="dl-icon"><i class="fa-regular fa-file-word"></i></span>
                        <span class="dl-info">
                            <span class="dl-label">Artigo ${i + 1}</span>
                            <span class="dl-name">${nome}</span>
                        </span>
                        <i class="fa-solid fa-arrow-down dl-arr"></i>
                    `;
                    downloadsDiv.appendChild(a);
                });
            } else {
                downloadsDiv.innerHTML = `
                    <div style="text-align:center;padding:16px 0;font-size:13px;color:var(--ts)">
                        Nenhum arquivo gerado.
                    </div>`;
            }

            setButton(true, '<i class="fa-solid fa-bolt"></i> <span>Novo processamento</span>');

        } else {
            statusText.textContent = data.erro || 'Erro inesperado';
            setButton(true, '<i class="fa-solid fa-bolt"></i> <span>Tentar novamente</span>');
        }

    } catch (err) {
        statusText.textContent = 'Erro de conexão com o servidor';
        setButton(true, '<i class="fa-solid fa-bolt"></i> <span>Iniciar processamento</span>');
    }
});

function setButton(enabled, html) {
    const inner = button.querySelector('.run-btn-inner');
    if (inner) inner.innerHTML = html;
    else button.innerHTML = `<span class="run-btn-inner">${html}</span><span class="run-btn-shine"></span>`;

    if (enabled) button.removeAttribute('disabled');
    else         button.setAttribute('disabled', '');
}

// ─── INIT ─────────────────────────────────────────────────────
carregarPaises();
