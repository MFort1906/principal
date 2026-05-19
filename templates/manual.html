<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manual — Tennant Scraper</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <style>
        .manual-header-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
        }
        .manual-header-logo::before {
            content: '';
            position: absolute;
            width: 240px; height: 80px;
            background: radial-gradient(ellipse, rgba(0,200,255,.18) 0%, transparent 70%);
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
        .manual-header-logo img {
            position: relative; z-index: 1;
            height: 64px; width: auto;
            filter:
                drop-shadow(0 0 14px rgba(0,200,255,.65))
                drop-shadow(0 0 40px rgba(0,100,255,.3))
                drop-shadow(0 2px 6px rgba(0,0,0,.5));
        }
        .manual-divider {
            width: 1px; height: 28px;
            background: linear-gradient(to bottom, rgba(0,200,255,.4), transparent);
            margin: 10px auto 0;
        }
    </style>
</head>
<body class="manual-body">
    <div class="noise-overlay"></div>

    <!-- HEADER -->
    <div class="manual-header">
        <a href="{{ url_for('home') }}" class="back-link">
            <i class="fa-solid fa-arrow-left"></i>
            Voltar
        </a>
        <div class="manual-header-inner">
            <div class="manual-header-logo">
                <img src="data:image/png;base64,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" alt="Tennant">
                <div class="manual-divider"></div>
            </div>
            <div class="manual-eyebrow">
                <i class="fa-solid fa-book-open"></i>
                Documentação
            </div>
            <h1 class="manual-title">Manual de Uso</h1>
            <p class="manual-desc">Guia completo da plataforma de scraping e tradução Tennant</p>
        </div>
        <div class="manual-header-stats">
            <div class="stat-pill"><i class="fa-solid fa-layer-group"></i> 4 seções</div>
            <div class="stat-pill"><i class="fa-solid fa-clock"></i> 2 min leitura</div>
        </div>
    </div>

    <div class="manual-container">

        <!-- SEÇÃO 1 -->
        <div class="accordion-item">
            <button type="button" class="accordion-toggle" aria-expanded="false">
                <div class="accordion-toggle-left">
                    <span class="acc-num">01</span>
                    <span class="acc-title">Dicas essenciais</span>
                </div>
                <div class="accordion-toggle-right">
                    <span class="acc-tag">Importante</span>
                    <i class="fa-solid fa-chevron-down acc-arrow"></i>
                </div>
            </button>
            <div class="accordion-body">
                <div class="acc-row">
                    <div class="acc-icon-wrap red"><i class="fa-solid fa-ban"></i></div>
                    <div>
                        <div class="acc-row-title">Não atualize a página</div>
                        <div class="acc-row-desc">Durante o processamento, atualizar a página interrompe a execução e perde todos os dados gerados.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap yellow"><i class="fa-regular fa-clock"></i></div>
                    <div>
                        <div class="acc-row-title">Tempo variável</div>
                        <div class="acc-row-desc">O tempo de resposta varia conforme o país e a qualidade da conexão. Seja paciente.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap blue"><i class="fa-solid fa-users"></i></div>
                    <div>
                        <div class="acc-row-title">Fila de execução</div>
                        <div class="acc-row-desc">Múltiplos usuários compartilham uma fila. Em horários de pico, aguarde sua vez.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap orange"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div>
                        <div class="acc-row-title">Faça o download imediatamente</div>
                        <div class="acc-row-desc">Os arquivos <strong>não são salvos permanentemente</strong>. Baixe assim que o processamento concluir.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SEÇÃO 2 -->
        <div class="accordion-item">
            <button type="button" class="accordion-toggle" aria-expanded="false">
                <div class="accordion-toggle-left">
                    <span class="acc-num">02</span>
                    <span class="acc-title">Seleção de país</span>
                </div>
                <div class="accordion-toggle-right">
                    <span class="acc-tag accent">Configuração</span>
                    <i class="fa-solid fa-chevron-down acc-arrow"></i>
                </div>
            </button>
            <div class="accordion-body">
                <div class="acc-row">
                    <div class="acc-icon-wrap accent"><i class="fa-solid fa-earth-americas"></i></div>
                    <div>
                        <div class="acc-row-title">Blog por domínio</div>
                        <div class="acc-row-desc">Cada país corresponde a um blog oficial da Tennant. Escolha o correto para buscar no domínio certo.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap accent"><i class="fa-solid fa-language"></i></div>
                    <div>
                        <div class="acc-row-title">Tradução automática</div>
                        <div class="acc-row-desc">O conteúdo do blog do país escolhido é traduzido automaticamente para o português.</div>
                    </div>
                </div>
                <div class="acc-tip">
                    <i class="fa-solid fa-lightbulb"></i>
                    <span>Confira o país antes de iniciar. Trocar exige rodar o processo novamente do zero.</span>
                </div>
            </div>
        </div>

        <!-- SEÇÃO 3 -->
        <div class="accordion-item">
            <button type="button" class="accordion-toggle" aria-expanded="false">
                <div class="accordion-toggle-left">
                    <span class="acc-num">03</span>
                    <span class="acc-title">Quantidade de artigos</span>
                </div>
                <div class="accordion-toggle-right">
                    <span class="acc-tag accent">Configuração</span>
                    <i class="fa-solid fa-chevron-down acc-arrow"></i>
                </div>
            </button>
            <div class="accordion-body">
                <div class="acc-row">
                    <div class="acc-icon-wrap accent"><i class="fa-solid fa-file-lines"></i></div>
                    <div>
                        <div class="acc-row-title">Limite por execução</div>
                        <div class="acc-row-desc">O sistema aceita de <strong>1 a 50 artigos por execução</strong>. Valores acima podem causar bloqueios temporários.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap blue"><i class="fa-solid fa-gauge-high"></i></div>
                    <div>
                        <div class="acc-row-title">Processamento em lotes</div>
                        <div class="acc-row-desc">Para grandes volumes, prefira lotes de 10–20 artigos para maior confiabilidade e velocidade.</div>
                    </div>
                </div>
                <div class="acc-tip">
                    <i class="fa-solid fa-lightbulb"></i>
                    <span>Lotes menores são mais rápidos e menos propensos a falhas por timeout de rede.</span>
                </div>
            </div>
        </div>

        <!-- SEÇÃO 4 -->
        <div class="accordion-item">
            <button type="button" class="accordion-toggle" aria-expanded="false">
                <div class="accordion-toggle-left">
                    <span class="acc-num">04</span>
                    <span class="acc-title">Formato de saída</span>
                </div>
                <div class="accordion-toggle-right">
                    <span class="acc-tag green">Saída</span>
                    <i class="fa-solid fa-chevron-down acc-arrow"></i>
                </div>
            </button>
            <div class="accordion-body">
                <div class="acc-row">
                    <div class="acc-icon-wrap accent"><i class="fa-solid fa-file-word"></i></div>
                    <div>
                        <div class="acc-row-title">Arquivo .docx</div>
                        <div class="acc-row-desc">Todos os artigos são exportados em <strong>.docx (Microsoft Word)</strong> com a formatação original preservada.</div>
                    </div>
                </div>
                <div class="acc-row">
                    <div class="acc-icon-wrap green"><i class="fa-solid fa-download"></i></div>
                    <div>
                        <div class="acc-row-title">Download individual</div>
                        <div class="acc-row-desc">Cada artigo gera um arquivo separado, disponível para download imediatamente após o processamento.</div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <script>
        document.querySelectorAll('.accordion-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const item  = btn.closest('.accordion-item');
                const body  = item.querySelector('.accordion-body');
                const arrow = btn.querySelector('.acc-arrow');
                const open  = item.classList.contains('open');

                document.querySelectorAll('.accordion-item.open').forEach(el => {
                    el.classList.remove('open');
                    el.querySelector('.accordion-body').style.maxHeight = '0';
                    el.querySelector('.acc-arrow').style.transform = 'rotate(0deg)';
                    el.querySelector('.accordion-toggle').setAttribute('aria-expanded','false');
                });

                if (!open) {
                    item.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + 'px';
                    arrow.style.transform = 'rotate(180deg)';
                    btn.setAttribute('aria-expanded','true');
                }
            });
        });
    </script>
</body>
</html>