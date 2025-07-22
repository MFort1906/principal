import os
import requests
import mimetypes
from urllib.parse import urlparse
from docx import Document
from docx.shared import Inches
from utils import clean_filename, limpar_xml

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/91.0.4472.124 Safari/537.36'
    )
}

def baixar_imagem(url, pasta_destino):
    try:
        print(f"\n🔽 Tentando baixar imagem: {url}", flush=True)
        response = requests.get(url, headers=HEADERS, stream=True, timeout=10)
        response.raise_for_status()

        # Detectar extensão correta
        content_type = response.headers.get('Content-Type')
        ext = mimetypes.guess_extension(content_type) or '.jpg'
        print(f"📦 Tipo de conteúdo: {content_type} | Extensão detectada: {ext}", flush=True)

        # Criar nome seguro de arquivo
        nome_url = os.path.basename(urlparse(url).path).split("?")[0]
        if not nome_url:
            nome_url = f"img_{hash(url)}"
        if not os.path.splitext(nome_url)[1]:
            nome_url += ext

        nome_arquivo = clean_filename(nome_url)
        caminho = os.path.join(pasta_destino, nome_arquivo)

        with open(caminho, 'wb') as f:
            f.write(response.content)

        print(f"✅ Imagem salva em: {caminho}", flush=True)
        return caminho
    except Exception as e:
        print(f"[❌ Erro ao baixar imagem] {url}: {e}", flush=True)
        return None

def salvar_conteudo_em_docx(titulo, elementos, pasta_saida):
    """Salva o conteúdo traduzido em um arquivo .docx com texto e imagens"""
    nome_arquivo = clean_filename(titulo)
    caminho = os.path.join(pasta_saida, f"{nome_arquivo}.docx")
    os.makedirs(pasta_saida, exist_ok=True)

    doc = Document()
    doc.add_heading(limpar_xml(titulo), level=1)

    print(f"\n📝 Iniciando documento: {nome_arquivo}", flush=True)
    total_imgs = 0
    total_paragrafos = 0

    for item in elementos:
        tipo = item['tipo']
        conteudo = item['conteudo']

        if tipo == 'h2':
            doc.add_paragraph(conteudo, style='Heading 2')
            print(f"🔹 H2: {conteudo[:50]}...", flush=True)
        elif tipo == 'h3':
            doc.add_paragraph(conteudo, style='Heading 3')
            print(f"🔸 H3: {conteudo[:50]}...", flush=True)
        elif tipo == 'p':
            doc.add_paragraph(f"• {conteudo}")
            total_paragrafos += 1
        elif tipo == 'img':
            img_path = baixar_imagem(conteudo, pasta_saida)
            if img_path:
                try:
                    paragraph = doc.add_paragraph()
                    run = paragraph.add_run()
                    run.add_picture(img_path, width=Inches(5.5))
                    total_imgs += 1
                    print(f"🖼️ Imagem inserida: {img_path}", flush=True)
                except Exception as e:
                    print(f"[❌ Erro ao inserir imagem] {img_path}: {e}", flush=True)

    doc.save(caminho)
    print(f"\n💾 Arquivo salvo com sucesso: {caminho}", flush=True)
    print(f"📊 Estatísticas: {total_paragrafos} parágrafos | {total_imgs} imagens\n", flush=True)
    return caminho
