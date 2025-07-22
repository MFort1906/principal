import os
import requests
from docx import Document
from docx.shared import Inches
from utils import clean_filename, limpar_xml

def baixar_imagem(url, pasta_destino):
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()

        nome_arquivo = os.path.basename(url.split("?")[0])
        caminho = os.path.join(pasta_destino, nome_arquivo)

        with open(caminho, 'wb') as f:
            f.write(response.content)

        return caminho
    except Exception as e:
        print(f"[Erro ao baixar imagem] {url} - {e}")
        return None

def salvar_conteudo_em_docx(titulo, elementos, pasta_saida):
    """Salva o conteúdo traduzido em um arquivo .docx com texto e imagens"""
    nome_arquivo = clean_filename(titulo)
    caminho = os.path.join(pasta_saida, f"{nome_arquivo}.docx")

    os.makedirs(pasta_saida, exist_ok=True)

    doc = Document()
    doc.add_heading(limpar_xml(titulo), level=1)

    for item in elementos:
        tipo = item['tipo']
        conteudo = item['conteudo']

        if tipo == 'h2':
            doc.add_paragraph(conteudo, style='Heading 2')
        elif tipo == 'h3':
            doc.add_paragraph(conteudo, style='Heading 3')
        elif tipo == 'p':
            doc.add_paragraph(f"• {conteudo}")
        elif tipo == 'img':
            img_path = baixar_imagem(conteudo, pasta_saida)
            if img_path:
                try:
                    doc.add_picture(img_path, width=Inches(4.5))
                except Exception as e:
                    print(f"[Erro ao inserir imagem] {img_path}: {e}")

    doc.save(caminho)
    print(f"💾 Arquivo salvo: {caminho}")
    return caminho
