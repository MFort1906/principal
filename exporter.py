import os
from docx import Document

def clean_filename(nome):
    """Remove caracteres proibidos de nomes de arquivos"""
    proibidos = '<>:"/\\|?*'
    for c in proibidos:
        nome = nome.replace(c, '')
    nome = nome.strip()
    if len(nome) > 80:
        nome = nome[:80]
    return nome.replace(' ', '_')

def limpar_xml(texto):
    """Remove caracteres ilegais para salvar em .docx"""
    return ''.join(
        c for c in texto
        if c == '\n' or c == '\r' or c == '\t' or 32 <= ord(c) <= 126 or ord(c) >= 160
    )

def salvar_conteudo_em_docx(titulo, paragrafos, pasta_saida):
    """Salva o conteúdo traduzido em um arquivo .docx com cabeçalho"""
    nome_arquivo = clean_filename(titulo)
    caminho = os.path.join(pasta_saida, f"{nome_arquivo}.docx")

    doc = Document()
    doc.add_heading(limpar_xml(titulo), level=1)

    for p in paragrafos:
        doc.add_paragraph(f"• {p}")

    doc.save(caminho)
    print(f"💾 Arquivo salvo: {caminho}")
    return caminho
