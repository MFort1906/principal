import os
import requests
import mimetypes
from urllib.parse import urlparse
from docx import Document
from docx.shared import Inches
from utils import clean_filename, limpar_xml

def baixar_imagem(url, pasta_destino):
    try:
        print(f"🔽 Baixando imagem: {url}")
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()

        # Tenta obter a extensão correta
        content_type = response.headers.get('Content-Type')
        ext = mimetypes.guess_extension(content_type) or '.jpg'

        # Gera nome seguro
        nome_url = os.path.basename(urlparse(url).path).split("?")[0]
        if not nome_url:
            nome_url = f"img_{hash(url)}"
        if not os.path.splitext(nome_url)[1]:
            nome_url += ext

        nome_arquivo = clean_filename(nome_url)
        caminho = os.path.join(pasta_destino, nome_arquivo)

        with open(caminho, 'wb') as f:
            f.write(response.content)

        print(f"✅ Imagem salva em: {caminho}")
        return caminho
    except Exception as e:
        print(f"[Erro ao baixar imagem] {url}: {e}")
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
                    print(f"🖼️ Inserindo imagem: {img_path}")
                    doc.add_picture(img_path, width=Inches(5.5))  # pode ajustar para 6.0 se quiser maior
                except Exception as e:
                    print(f"[Erro ao inserir imagem] {img_path}: {e}")

    doc.save(caminho)
    print(f"💾 Arquivo salvo: {caminho}")
    return caminho
