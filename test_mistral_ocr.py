#!/usr/bin/env python3
"""
Script para testar a API Mistral OCR e verificar como ela lida com imagens
"""
import requests
import os
import json
import time
from pathlib import Path

def test_mistral_ocr(file_path, api_key):
    """
    Testa a API Mistral OCR com um arquivo
    """
    print(f"\n🔍 Testando: {file_path}")
    print("=" * 50)

    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return None

    file_size = os.path.getsize(file_path)
    print(f"📁 Tamanho do arquivo: {file_size / 1024 / 1024:.2f} MB")

    try:
        # Step 1: Upload file
        print("⬆️ Step 1/3: Fazendo upload...")
        start_time = time.time()

        with open(file_path, 'rb') as f:
            upload_data = {
                'purpose': 'ocr'
            }
            files = {
                'file': f
            }
            headers = {
                'Authorization': f'Bearer {api_key}'
            }

            upload_response = requests.post(
                'https://api.mistral.ai/v1/files',
                headers=headers,
                files=files,
                data=upload_data
            )

        if not upload_response.ok:
            print(f"❌ Upload falhou: {upload_response.status_code}")
            print(upload_response.text)
            return None

        upload_result = upload_response.json()
        file_id = upload_result['id']
        upload_time = time.time() - start_time
        print(f"✅ Upload completo em {upload_time:.2f}s - ID: {file_id}")

        # Step 2: Get signed URL
        print("🔗 Step 2/3: Obtendo URL assinada...")
        url_start = time.time()

        url_response = requests.get(
            f'https://api.mistral.ai/v1/files/{file_id}/url?expiry=24',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Accept': 'application/json'
            }
        )

        if not url_response.ok:
            print(f"❌ URL falhou: {url_response.status_code}")
            print(url_response.text)
            return None

        url_result = url_response.json()
        signed_url = url_result['url']
        url_time = time.time() - url_start
        print(f"✅ URL obtida em {url_time:.2f}s")

        # Step 3: OCR Processing
        print("🔍 Step 3/3: Processando OCR...")
        ocr_start = time.time()

        # Schema para anotações de imagem em português
        image_annotation_schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "ImageAnnotation",
                "description": "Anotação detalhada de imagem em português brasileiro",
                "schema": {
                    "type": "object",
                    "properties": {
                        "image_type": {
                            "type": "string",
                            "description": "Tipo da imagem: gráfico, tabela, figura, diagrama, foto, esquema, fluxograma, etc."
                        },
                        "short_description": {
                            "type": "string",
                            "description": "Descrição curta e objetiva da imagem em português (máximo 100 caracteres)"
                        },
                        "summary": {
                            "type": "string",
                            "description": "Resumo detalhado do conteúdo visual, dados, texto e elementos importantes da imagem em português"
                        }
                    },
                    "required": ["image_type", "short_description", "summary"],
                    "additionalProperties": False
                },
                "strict": False
            }
        }

        ocr_response = requests.post(
            'https://api.mistral.ai/v1/ocr',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'mistral-ocr-latest',
                'document': {
                    'type': 'document_url',
                    'document_url': signed_url
                },
                'include_image_base64': True,
                'bbox_annotation_format': image_annotation_schema
            }
        )

        if not ocr_response.ok:
            print(f"❌ OCR falhou: {ocr_response.status_code}")
            print(ocr_response.text)
            return None

        ocr_result = ocr_response.json()
        ocr_time = time.time() - ocr_start
        total_time = time.time() - start_time

        print(f"✅ OCR completo em {ocr_time:.2f}s")
        print(f"🎉 Tempo total: {total_time:.2f}s")

        # Salvar resultado completo para análise
        filename = Path(file_path).stem
        result_file = f"/Users/thaleslaray/code/projetos/hd/cloudflare-ocr-new/test_results_{filename}.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(ocr_result, f, ensure_ascii=False, indent=2)
        print(f"💾 Resultado salvo em: {result_file}")

        # Análise rápida
        print("\n📊 ANÁLISE RÁPIDA:")
        print(f"Páginas: {len(ocr_result.get('pages', []))}")

        if 'pages' in ocr_result:
            for i, page in enumerate(ocr_result['pages']):
                print(f"\n📄 Página {i+1}:")
                if 'images' in page:
                    print(f"  🖼️ Imagens: {len(page['images'])}")
                    for j, img in enumerate(page['images']):
                        if 'description' in img:
                            print(f"    Imagem {j+1}: {img['description'][:100]}...")
                        else:
                            print(f"    Imagem {j+1}: {list(img.keys())}")

                if 'markdown' in page:
                    markdown_preview = page['markdown'][:200].replace('\n', ' ')
                    print(f"  📝 Markdown (preview): {markdown_preview}...")

        return ocr_result

    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def main():
    # Chave da API para teste
    api_key = "f8ox6Pxx2u5VAxhLQiAdNjdTzkQDUlmp"

    # Arquivos para teste
    test_files = [
        "/Users/thaleslaray/Downloads/2507.13264v1.pdf",
        "/Users/thaleslaray/Downloads/teste.pdf",
        "/Users/thaleslaray/Downloads/multimodal_bank_statement.pdf"
    ]

    results = {}

    for file_path in test_files:
        result = test_mistral_ocr(file_path, api_key)
        if result:
            results[file_path] = result

    print("\n" + "="*50)
    print("🎯 RESUMO DOS TESTES")
    print("="*50)

    for file_path, result in results.items():
        filename = Path(file_path).name
        if result and 'pages' in result:
            total_images = sum(len(page.get('images', [])) for page in result['pages'])
            print(f"📁 {filename}: {len(result['pages'])} páginas, {total_images} imagens")
        else:
            print(f"📁 {filename}: Falhou")

if __name__ == "__main__":
    main()