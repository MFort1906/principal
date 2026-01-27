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
                "Você é um tradutor profissional. Traduza para o português do Brasil com fidelidade, coesão, fluidez e tom editorial.\n\n"
                "Regras:\n"
                "1) Não adicione chamadas promocionais.\n"
                "2) Preserve nomes técnicos e marcas.\n"
                "3) Ignore rodapés e menus.\n"
                "4) Use “esfregão” para mop e “lavadora de pisos” para scrubber.\n"
                "5) Evite repetições e traduza com naturalidade.\n"
                "6) Se o conteúdo for claramente irrelevante, ignore.\n"
                "7) Preserve perguntas e tópicos curtos quando fizerem sentido.\n"
                "8) Troque "esfregão" por "mop" na hora de traduzir."
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
        if any(difflib.SequenceMatcher(None, linha.lower(), p.lower()).ratio() > 0.97 for p in paragrafos):
            continue
        paragrafos.append(linha)
        linhas_vistas.add(linha.lower())
    return paragrafos
