// Cloudflare Pages Function for OCR processing
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };

  try {
    // Get API key from header (client-side) or environment (fallback)
    const clientApiKey = request.headers.get('X-API-Key');
    const apiKey = clientApiKey || env.MISTRAL_API_KEY;

    // Debug logging
    console.log('🔑 Client API Key present:', !!clientApiKey);
    console.log('🔑 Env API Key present:', !!env.MISTRAL_API_KEY);
    console.log('🔑 Using API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Chave da API Mistral não configurada. Configure no frontend ou use o modo teste.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the uploaded file and chunk info
    const formData = await request.formData();
    const file = formData.get('file');
    const chunkInfoStr = formData.get('chunk_info');

    let chunkInfo = null;
    if (chunkInfoStr) {
      try {
        chunkInfo = JSON.parse(chunkInfoStr);
        console.log('📦 Processing chunk:', chunkInfo);
      } catch (e) {
        console.warn('Failed to parse chunk info:', e);
      }
    }

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No file size limit - we handle chunking intelligently in the frontend
    // Large files are automatically split into optimal chunks for processing

    const startTime = Date.now();

    // Step 1: Upload file to Mistral
    console.log('⬆️ Step 1/3: Uploading file to Mistral...');
    const uploadStart = Date.now();

    const uploadFormData = new FormData();
    uploadFormData.append('purpose', 'ocr');
    uploadFormData.append('file', file);

    const uploadResponse = await fetch('https://api.mistral.ai/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: uploadFormData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;
    const uploadTime = Date.now() - uploadStart;
    console.log(`✅ Upload completed in ${uploadTime}ms - File ID: ${fileId}`);

    // Step 2: Get signed URL
    console.log('🔗 Step 2/3: Getting signed URL...');
    const urlStart = Date.now();

    const urlResponse = await fetch(`https://api.mistral.ai/v1/files/${fileId}/url?expiry=24`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!urlResponse.ok) {
      const errorText = await urlResponse.text();
      throw new Error(`URL generation failed: ${urlResponse.status} - ${errorText}`);
    }

    const urlResult = await urlResponse.json();
    const signedUrl = urlResult.url;
    const urlTime = Date.now() - urlStart;
    console.log(`✅ URL generated in ${urlTime}ms`);

    // Step 3: Process with OCR
    console.log('🔍 Step 3/3: Processing with OCR (this may take a while)...');
    const ocrStart = Date.now();

    // Schema para anotações de imagem em português
    const imageAnnotationSchema = {
      type: "json_schema",
      json_schema: {
        name: "ImageAnnotation",
        description: "Anotação detalhada de imagem em português brasileiro",
        schema: {
          type: "object",
          properties: {
            image_type: {
              type: "string",
              description: "Tipo da imagem: gráfico, tabela, figura, diagrama, foto, esquema, fluxograma, etc."
            },
            short_description: {
              type: "string",
              description: "Descrição curta e objetiva da imagem em português (máximo 100 caracteres)"
            },
            summary: {
              type: "string",
              description: "Resumo detalhado do conteúdo visual, dados, texto e elementos importantes da imagem em português"
            }
          },
          required: ["image_type", "short_description", "summary"],
          additionalProperties: false
        },
        strict: false
      }
    };

    // Prepare OCR request
    const ocrRequestBody = {
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: signedUrl
      },
      include_image_base64: true,
      bbox_annotation_format: imageAnnotationSchema
    };

    // Note: Mistral OCR API doesn't support page_range parameter
    // We'll process the whole file and let the chunking happen at file level
    if (chunkInfo && chunkInfo.isChunked) {
      console.log(`📄 Processing chunk ${chunkInfo.chunkNumber}/${chunkInfo.totalChunks} (simulated range: pages ${chunkInfo.startPage}-${chunkInfo.endPage})`);
    }

    const ocrResponse = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ocrRequestBody)
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      throw new Error(`OCR processing failed: ${ocrResponse.status} - ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    const ocrTime = Date.now() - ocrStart;
    const totalTime = Date.now() - startTime;

    console.log(`✅ OCR completed in ${ocrTime}ms`);
    console.log(`🎉 Total processing time: ${totalTime}ms`);
    console.log('📋 OCR Result from Mistral:', JSON.stringify(ocrResult, null, 2));

    // Extract content from Mistral response - it comes in pages array
    let markdownContent = '';
    if (ocrResult.pages && ocrResult.pages.length > 0) {
      // Process each page and include image descriptions
      markdownContent = ocrResult.pages.map((page, index) => {
        const pageNumber = index + 1;
        let pageContent = `# 📄 PÁGINA ${pageNumber}\n\n`;

        // Add the actual page content
        pageContent += page.markdown || '';

        // Remove useless image references that LLMs can't see
        pageContent = pageContent.replace(/!\[img-\d+\.(jpeg|jpg|png|gif|webp)\]\(img-\d+\.(jpeg|jpg|png|gif|webp)\)/g, '');

        // Add image descriptions if available
        if (page.images && page.images.length > 0) {
          const imageDescriptions = page.images
            .filter(img => img.image_annotation)
            .map(img => {
              try {
                const annotation = typeof img.image_annotation === 'string'
                  ? JSON.parse(img.image_annotation)
                  : img.image_annotation;

                return `**[${annotation.image_type.toUpperCase()}]** ${annotation.short_description}\n\n${annotation.summary}`;
              } catch (e) {
                console.log('Erro ao processar anotação da imagem:', e);
                return `**[IMAGEM]** ${img.image_annotation}`;
              }
            });

          if (imageDescriptions.length > 0) {
            pageContent += '\n\n---\n\n**CONTEÚDO VISUAL IDENTIFICADO:**\n\n' + imageDescriptions.join('\n\n---\n\n');
          }
        }

        return pageContent;
      }).join('\n\n' + '='.repeat(80) + '\n\n');

      console.log(`📄 Extracted ${ocrResult.pages.length} pages of content`);
    } else {
      // Fallback to other possible fields
      markdownContent = ocrResult.content || ocrResult.text || ocrResult.markdown || JSON.stringify(ocrResult, null, 2);
    }

    const response = {
      success: true,
      markdown: markdownContent,
      filename: file.name,
      isReal: true,
      timing: {
        upload: uploadTime,
        url: urlTime,
        ocr: ocrTime,
        total: totalTime
      },
      stats: {
        pages: ocrResult.pages?.length || 0,
        fileSize: file.size,
        usage: ocrResult.usage_info
      }
    };

    // Add chunk information if this was a chunked request
    if (chunkInfo) {
      response.chunkInfo = chunkInfo;
      response.isChunked = true;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Erro no processamento: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS request for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    }
  });
}