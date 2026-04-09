console.log("JS carregado com sucesso!");

// ELEMENTOS
const form = document.getElementById("scraper-form");
const statusDiv = document.getElementById("status");
const statusText = document.getElementById("status-text");
const resultadoDiv = document.getElementById("resultado");
const downloadsDiv = document.getElementById("downloads");
const button = document.getElementById("submit-btn");
const selectPais = document.getElementById("pais");
const inputQuantidade = document.getElementById("quantidade");
const avisoQuantidade = document.getElementById("aviso-quantidade");

// 🌍 CARREGAR PAÍSES DINAMICAMENTE
async function carregarPaises() {
    try {
        const response = await fetch("/paises", {
            credentials: "include" 
        });

        // 🔐 se não autorizado → volta pro login
        if (response.status === 401) {
            window.location.href = "/";
            return;
        }

        const paises = await response.json();

        selectPais.innerHTML = "";

        Object.entries(paises)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([codigo, nome]) => {
                const option = document.createElement("option");
                option.value = codigo;
                option.textContent = nome;
                selectPais.appendChild(option);
            });

    } catch (error) {
        console.error("Erro ao carregar países:", error);
        selectPais.innerHTML = "<option>Erro ao carregar países</option>";
    }
}

// 🔴 VALIDAÇÃO DE QUANTIDADE
inputQuantidade.addEventListener("input", () => {
    const valor = parseInt(inputQuantidade.value);
    if (valor > 50) {
        avisoQuantidade.style.display = "block";
        inputQuantidade.value = 50;
    } else {
        avisoQuantidade.style.display = "none";
    }
});

// 🚀 SUBMIT DO FORM (SEM RELOAD)
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pais = selectPais.value;
    let quantidade = parseInt(inputQuantidade.value);

    if (quantidade > 50) {
        avisoQuantidade.style.display = "block";
        return;
    }

    // Reset de interface para nova execução
    statusDiv.style.display = "flex";
    statusText.innerText = "🔄 Processando artigos...";
    resultadoDiv.style.display = "none";
    resultadoDiv.classList.remove("fade-in-content"); // Reset da animação
    downloadsDiv.innerHTML = "";
    
    // Estado do botão
    button.disabled = true;
    button.innerText = "Aguarde...";

    try {
        const response = await fetch("/rodar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", 
            body: JSON.stringify({ pais, quantidade })
        });

        if (response.status === 401) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "/";
            return;
        }

        const data = await response.json();

        if (data.sucesso) {
            statusText.innerText = "✅ Concluído!";
            
            // Ativa o card de resultados com a animação CSS
            resultadoDiv.style.display = "block";
            resultadoDiv.classList.add("fade-in-content");

            if (data.arquivos && data.arquivos.length > 0) {
                data.arquivos.forEach((arquivo) => {
                    const link = document.createElement("a");
                    link.href = `/download/${encodeURIComponent(arquivo)}`;
                    link.className = "download-btn";
                    // Ícone de documento antes do nome
                    link.innerHTML = `<i class="fa-regular fa-file-word"></i> Baixar: ${arquivo}`;
                    downloadsDiv.appendChild(link);
                });
            } else {
                downloadsDiv.innerHTML = "<p style='text-align:center; font-size:13px; color:#64748b;'>Nenhum arquivo gerado.</p>";
            }

        } else {
            statusText.innerText = "❌ " + (data.erro || "Erro inesperado");
            button.disabled = false;
            button.innerText = "Tentar novamente";
        }

    } catch (error) {
        console.error("Erro na requisição:", error);
        statusText.innerText = "❌ Erro de conexão com o servidor";
        button.disabled = false;
        button.innerText = "Rodar Scraper";
    }

    // Reativa o botão se não houver sucesso imediato ou após o fim
    if (statusText.innerText.includes("Concluído")) {
        button.disabled = false;
        button.innerText = "Iniciar Novo Scraper";
    }
});

// 🚀 INICIALIZAÇÃO
carregarPaises();
