import asyncio
import random
import re
import difflib
from openai import AsyncOpenAI

# Carrega a chave da API do ambiente
with open("/etc/secrets/OPENAI_KEY") as f:
    OPENAI_KEY = f.read().strip()

client = AsyncOpenAI(api_key=OPENAI_KEY)


async def traduzir_e_formatar_gpt(textos, destino='português Brasil'):
    modelo = "gpt-4o-mini"
    resultados = []
    blocos = agrupar_em_blocos(textos, max_chars=1200)

    total_prompt_tokens = 0
    total_completion_tokens = 0

    for bloco in blocos:
        system_msg = {
            "role": "system",
            "content": (
                "Você é um tradutor profissional de artigos técnicos e institucionais.\n"
                "Traduza o texto para o português do Brasil com fidelidade ao conteúdo original, "
                "coerência, fluidez natural e tom editorial profissional.\n\n"

                "Regras obrigatórias:\n"
                "1) Não adicione chamadas promocionais, CTAs ou frases comerciais.\n"
                "2) Preserve nomes técnicos, marcas, modelos e siglas exatamente como no original.\n"
                "3) Ignore menus, rodapés, formulários, avisos legais e conteúdos de navegação.\n"
                "4) Traduza “scrubber” como “lavadora de pisos”.\n"
                "5) Traduza “squeegee” como “rodo”.\n"
                "6) Evite repetições excessivas e traduções literais artificiais.\n"
                "7) Preserve perguntas, subtítulos e tópicos curtos quando fizerem sentido.\n"
                "8) Não resuma, não interprete e não acrescente informações.\n"
                "9) Se um trecho for claramente irrelevante ou técnico sem contexto editorial, ignore-o.\n"
                "10) Todo valor monetário expresso em dólar ($) deve ser convertido para real brasileiro (R$), "
                "utilizando a taxa fixa: 1 USD = 5,20 BRL.\n"
                "    - Mantenha apenas o valor convertido em reais.\n"
                "    - Use o formato brasileiro (ex: R$ 1.040,00).\n\n"

                "Formatação:\n"
                "- Preserve a estrutura do texto (parágrafos, títulos e listas).\n"
                "- Cada parágrafo deve ser traduzido separadamente."
            )
        }

        user_msg = {"role": "user", "content": bloco}

        try:
            resposta = await client.chat.completions.create(
                model=modelo,
                messages=[system_msg, user_msg],
                temperature=0.3,
                max_tokens=2000,
            )

            texto = resposta.choices[0].message.content.strip()
            prompt = resposta.usage.prompt_tokens
            complete = resposta.usage.completion_tokens

            total_prompt_tokens += prompt
            total_completion_tokens += complete

            paragrafos = limpar_duplicados(texto)
            resultados.extend(paragrafos)

            await asyncio.sleep(random.uniform(1.2, 2.0))

        except Exception as e:
            print(f"[Erro GPT] {e}", flush=True)
            resultados.append(bloco)

    return resultados, {
        "prompt_tokens": total_prompt_tokens,
        "completion_tokens": total_completion_tokens,
        "total_tokens": total_prompt_tokens + total_completion_tokens
    }


def agrupar_em_blocos(paragrafos, max_chars=1200):
    blocos = []
    buffer = ""

    for par in paragrafos:
        if re.match(r'^\d+\.', par):  # título com número
            if buffer:
                blocos.append(buffer.strip())
            buffer = par

        elif len(buffer) + len(par) + 1 <= max_chars:
            buffer += par + "\n"

        else:
            blocos.append(buffer.strip())
            buffer = par + "\n"

    if buffer.strip():
        blocos.append(buffer.strip())

    return blocos


def limpar_duplicados(texto_traduzido):
    paragrafos = []
    linhas_vistas = set()

    for linha in texto_traduzido.split('\n'):
        linha = linha.strip()

        if not linha or linha.lower() in linhas_vistas:
            continue

        if any(
            difflib.SequenceMatcher(None, linha.lower(), p.lower()).ratio() > 0.97
            for p in paragrafos
        ):
            continue

        paragrafos.append(linha)
        linhas_vistas.add(linha.lower())

    return paragrafos
