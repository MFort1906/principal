import os
import requests
import mimetypes
from urllib.parse import urlparse
from docx import Document
from docx.shared import Inches
from PIL import Image
from utils import clean_filename, limpar_xml

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/91.0.4472.124 Safari/537.36'
    )
}

def log(msg):
    print(msg, flush=True)

def baixar_imagem(url, pasta_destino):
    try:
        log(f"\n🔽 Tentando baixar imagem: {url}")
        response = requests.get(url, headers=HEADERS, stream=True, timeout=10)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type')
        if not content_type or not content_type.lower().startswith("image/"):
            log(f"[⚠️ Tipo de conteúdo inválido ou ausente] {url}")
            return None

        ext = mimetypes.guess_extension(content_type.lower()) or '.jpg'
        log(f"📦 Tipo de conteúdo: {content_type} | Extensão detectada: {ext}")

        nome_url = os.path.basename(urlparse(url).path).split("?")[0] or f"img_{hash(url)}"
        if not os.path.splitext(nome_url)[1]:
            nome_url += ext

        nome_arquivo = clean_filename(nome_url)
        caminho = os.path.join(pasta_destino, nome_arquivo)

        with open(caminho, 'wb') as f:
            f.write(response.content)

        # Validação da imagem
        try:
            with Image.open(caminho) as img:
                img.verify()
        except Exception as e:
            log(f"[⚠️ Imagem corrompida ou inválida] {url}: {e}")
            return None

        log(f"✅ Imagem salva em: {caminho}")
        return caminho

    except Exception as e:
        log(f"[❌ Erro ao baixar imagem] {url}: {e}")
        return None

def reparar_imagem(caminho_original):
    try:
        with Image.open(caminho_original) as img:
            rgb = img.convert('RGB')
            caminho_corrigido = caminho_original.replace(".", "_reparada.", 1)
            rgb.save(caminho_corrigido, format="JPEG")
            log(f"[🛠️ Imagem reparada e salva como] {caminho_corrigido}")
            return caminho_corrigido
    except Exception as e:
        log(f"[⚠️ Erro ao reparar imagem] {caminho_original}: {e}")
        return None

def salvar_conteudo_em_docx(titulo, elementos, pasta_saida, url_origem=None):
    nome_arquivo = clean_filename(titulo)
    caminho = os.path.join(pasta_saida, f"{nome_arquivo}.docx")

    try:
        os.makedirs(pasta_saida, exist_ok=True)
    except Exception as e:
        log(f"[❌ Erro ao criar pasta de saída] {pasta_saida}: {e}")
        return None

    doc = Document()

    if url_origem:
        doc.add_paragraph(f"🔗 Artigo original: {url_origem}", style="Intense Quote")

    doc.add_heading(limpar_xml(titulo), level=1)

    log(f"\n📝 Iniciando documento: {nome_arquivo}")
    total_imgs = 0
    total_paragrafos = 0

    for bloco in elementos:
        tipo = bloco['tipo']
        conteudo = bloco['conteudo']

        if tipo == 'h2':
            doc.add_paragraph(conteudo, style='Heading 2')
            log(f"🔹 H2: {conteudo[:60]}...")
        elif tipo == 'h3':
            doc.add_paragraph(conteudo, style='Heading 3')
            log(f"🔸 H3: {conteudo[:60]}...")
        elif tipo == 'p':
            doc.add_paragraph(f"• {conteudo}", style='List Bullet')
            total_paragrafos += 1
        elif tipo == 'img':
            img_path = baixar_imagem(conteudo, pasta_saida)
            if img_path:
                try:
                    doc.add_picture(img_path, width=Inches(5.5))
                    total_imgs += 1
                    log(f"🖼️ Imagem inserida: {img_path}")
                except Exception as e1:
                    log(f"[⚠️ Falha ao inserir imagem original] {img_path}: {e1}")
                    img_corrigida = reparar_imagem(img_path)
                    if img_corrigida:
                        try:
                            doc.add_picture(img_corrigida, width=Inches(5.5))
                            total_imgs += 1
                            log(f"🖼️ Imagem reparada inserida: {img_corrigida}")
                        except Exception as e2:
                            log(f"[❌ Erro ao inserir imagem reparada] {img_corrigida}: {e2}")

    doc.save(caminho)
    log(f"\n✅ Documento salvo: {caminho}")
    log(f"📊 Estatísticas: {total_paragrafos} parágrafos | {total_imgs} imagens\n")
    return caminho
