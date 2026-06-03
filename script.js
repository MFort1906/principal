/* ═══════════════════════════════════════
   PESQUISAR.CSS — Estilos da tela de pesquisa
════════════════════════════════════════ */

.pesquisa-container {
  max-width: 760px;
}

/* ── BACK BUTTON ── */
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: var(--ts);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s var(--e);
}
.back-btn:hover {
  color: var(--cyan);
  border-color: var(--cyan-rng);
  background: var(--cyan-dim);
}

/* ── FILTER PANEL ── */
.filter-panel {
  padding: 24px;
}
.filter-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.search-wrap {
  position: relative;
}
.search-wrap input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--rm);
  padding: 12px 40px 12px 16px;
  font-family: var(--fb);
  font-size: 14px;
  color: var(--tp);
  outline: none;
  transition: border-color 0.2s;
}
.search-wrap input::placeholder { color: var(--ts); }
.search-wrap input:focus {
  border-color: var(--cyan-rng);
  background: rgba(0,204,255,0.04);
}
.clear-btn {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  color: var(--ts); cursor: pointer;
  font-size: 13px;
  padding: 4px;
  transition: color 0.15s;
}
.clear-btn:hover { color: var(--cyan); }

/* ── LOADING BUSCA ── */
.loading-busca {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--rl);
  margin: 12px 0;
  color: var(--ts);
  font-size: 14px;
}
.spinner-ring {
  width: 22px; height: 22px;
  border: 2px solid rgba(0,154,199,0.15);
  border-top-color: var(--cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── BARRA DE RESULTADOS ── */
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--rm);
  margin: 12px 0 8px;
  gap: 12px;
  flex-wrap: wrap;
}
.result-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.result-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.result-count-tag {
  font-family: var(--fm);
  font-size: 12px;
  color: var(--cyan);
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-rng);
  padding: 3px 10px;
  border-radius: 20px;
}
.pais-tag {
  font-size: 12px;
  color: var(--ts);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  padding: 3px 10px;
  border-radius: 20px;
}
.filtro-tag {
  font-size: 11px;
  color: var(--grn);
  background: var(--grn-dim);
  border: 1px solid var(--grn-bdr);
  padding: 3px 10px;
  border-radius: 20px;
}
.action-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: var(--ts);
  font-family: var(--fb);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s var(--e);
}
.action-pill:hover {
  color: var(--cyan);
  border-color: var(--cyan-rng);
  background: var(--cyan-dim);
}
.action-pill.danger:hover {
  color: var(--red);
  border-color: var(--red-bdr);
  background: var(--red-dim);
}

/* ── FILTRO INLINE ── */
.filtro-inline-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(0,238,170,0.04);
  border: 1px solid rgba(0,238,170,0.1);
  border-radius: var(--rm);
  margin-bottom: 10px;
  color: var(--grn);
  font-size: 13px;
}
.filtro-inline-bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: var(--fb);
  font-size: 13px;
  color: var(--tp);
}
.filtro-inline-bar input::placeholder { color: rgba(0,238,170,0.4); }
#filtro-count {
  font-family: var(--fm);
  font-size: 11px;
  color: var(--grn);
  opacity: 0.7;
}

/* ── GRID DE ARTIGOS ── */
.artigos-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.artigo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--rm);
  cursor: pointer;
  transition: all 0.18s var(--e);
  animation: fadeSlide 0.3s var(--e) both;
  position: relative;
  overflow: hidden;
}
.artigo-card::before {
  content:'';
  position:absolute; left:0; top:0; bottom:0;
  width: 3px;
  background: transparent;
  transition: background 0.2s;
  border-radius: 3px 0 0 3px;
}
.artigo-card:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
}
.artigo-card.selecionado {
  border-color: rgba(0,204,255,0.25);
  background: rgba(0,204,255,0.06);
}
.artigo-card.selecionado::before {
  background: var(--cyan);
}
.artigo-card.oculto {
  display: none;
}

@keyframes fadeSlide {
  from { opacity:0; transform: translateY(6px); }
  to   { opacity:1; transform: translateY(0); }
}

/* Checkbox customizado */
.artigo-check {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s var(--e);
  font-size: 10px;
  color: transparent;
}
.artigo-card.selecionado .artigo-check {
  border-color: var(--cyan);
  background: var(--cyan);
  color: #000;
}
.artigo-card:hover:not(.selecionado) .artigo-check {
  border-color: rgba(0,204,255,0.4);
}

/* Ícone do artigo */
.artigo-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--ts);
  transition: all 0.15s;
}
.artigo-card.selecionado .artigo-icon {
  background: var(--cyan-dim);
  border-color: var(--cyan-rng);
  color: var(--cyan);
}

/* Conteúdo do artigo */
.artigo-info { flex: 1; min-width: 0; }
.artigo-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--tp);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
  transition: color 0.15s;
}
.artigo-card.selecionado .artigo-titulo { color: var(--cyan); }
.artigo-url {
  font-family: var(--fm);
  font-size: 11px;
  color: var(--ts);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ação de abrir URL */
.artigo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 8px;
  color: var(--ts);
  text-decoration: none;
  font-size: 11px;
  flex-shrink: 0;
  transition: all 0.15s;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
}
.artigo-link:hover {
  color: var(--cyan);
  background: var(--cyan-dim);
  border-color: var(--cyan-rng);
}

/* Sem resultados */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--ts);
  font-size: 14px;
}
.empty-state i {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.4;
}

/* ── RODAPÉ DE SELEÇÃO ── */
.selecao-footer {
  position: sticky;
  bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,154,199,0.2);
  border-radius: var(--rl);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 0 0 1px rgba(0,154,199,0.08);
  z-index: 10;
  margin-top: 12px;
  animation: slideUp 0.3s var(--e) both;
}
@keyframes slideUp {
  from { opacity:0; transform: translateY(16px); }
  to   { opacity:1; transform: translateY(0); }
}
.selecao-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.selecao-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--fm);
  font-size: 13px;
  color: var(--cyan);
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-rng);
  padding: 6px 14px;
  border-radius: 20px;
}
.selecao-badge i { font-size: 11px; }
.selecao-hint {
  font-size: 12px;
  color: var(--ts);
}
.traduzir-btn {
  padding: 0 !important;
  min-width: 200px;
}

/* ── LOADER DE TRADUÇÃO ── */
.translate-loader {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}
.lang-pill {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fd);
  font-size: 20px;
  letter-spacing: 1px;
}
.lang-pill.from {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--ts);
}
.lang-pill.to {
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-rng);
  color: var(--cyan);
}
.arrow-anim {
  font-size: 20px;
  color: var(--cyan);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50%       { opacity: 1;   transform: scale(1.1); }
}

/* ── VER TODOS TOGGLE ── */
.todos-row {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}
.todos-toggle-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.todos-toggle-wrap input[type="checkbox"] {
  display: none;
}
.todos-slider {
  position: relative;
  width: 38px;
  height: 21px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 99px;
  flex-shrink: 0;
  transition: all 0.22s var(--e);
}
.todos-slider::after {
  content: '';
  position: absolute;
  left: 3px; top: 3px;
  width: 13px; height: 13px;
  background: var(--ts);
  border-radius: 50%;
  transition: all 0.22s var(--e);
}
.todos-toggle-wrap input:checked + .todos-slider {
  background: var(--cyan-dim);
  border-color: var(--cyan-rng);
}
.todos-toggle-wrap input:checked + .todos-slider::after {
  left: calc(100% - 16px);
  background: var(--cyan);
}
.todos-label {
  font-size: 13px;
  color: var(--ts);
  transition: color 0.18s;
}
.todos-toggle-wrap:has(input:checked) .todos-label {
  color: var(--cyan);
}
.todos-toggle-wrap:has(input:checked) ~ .search-wrap,
.todos-field-hidden {
  opacity: 0.4;
  pointer-events: none;
}

/* ── RESPONSIVO ── */
@media (max-width: 600px) {
  .filter-row { flex-direction: column; }
  .result-bar { flex-direction: column; align-items: flex-start; }
  .selecao-footer { flex-direction: column; gap: 12px; }
  .traduzir-btn { width: 100%; }
}
