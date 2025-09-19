# 🚀 OCR to Markdown - Cloudflare Pages Template

Template "padrão ouro" para aplicações OCR usando Cloudflare Pages + Functions e Mistral AI.

## ✨ Funcionalidades

- 📄 **Upload de PDF e imagens** com drag & drop
- 🔍 **OCR com IA** usando Mistral OCR API
- 💰 **Cálculo de custos** em tempo real (USD/BRL)
- 📊 **Análise de valor** vs digitação manual
- 🎯 **Progress tracking** com animações
- 📱 **Interface responsiva**
- 🔐 **API key management** (localStorage)
- 🧪 **Modo teste** para demonstrações
- ⬇️ **Download em Markdown**
- 👀 **Preview renderizado**

## 🏗️ Estrutura do Projeto

```
cloudflare-ocr-new/
├── index.html          # Interface principal
├── style.css          # Estilos responsivos
├── app.js             # Lógica frontend completa
├── functions/         # Cloudflare Functions
│   └── process.js     # API de processamento OCR
└── README.md          # Este arquivo
```

## 🚀 Deploy no Cloudflare Pages

### Método 1: Git Integration (Recomendado)

1. **Faça fork/clone deste repositório**
2. **Vá para Cloudflare Dashboard** → **Pages** (não Workers!)
3. **"Create application"** → **"Connect to Git"**
4. **Selecione o repositório**
5. **Configure build settings:**
   - **Build command:** `echo ""`
   - **Build output directory:** (deixar vazio)
   - **Root directory:** (deixar vazio)
6. **Deploy!**

### Método 2: Direct Upload

```bash
# Clone o repositório
git clone <seu-repo>
cd cloudflare-ocr-new

# Deploy direto
npx wrangler pages deploy . --project-name=ocr-app
```

## ⚙️ Configuração

### Variáveis de Ambiente (Opcional)

No Cloudflare Pages Dashboard → Settings → Environment variables:

- `MISTRAL_API_KEY`: Chave da API Mistral (fallback se usuário não configurar)

### API Keys

A aplicação funciona de 3 formas:

1. **Usuário insere API key** → Salva no localStorage
2. **Modo teste** → Simulação completa
3. **Fallback** → Usa variável de ambiente (se configurada)

## 🧪 Teste Local

```bash
# Instalar Wrangler (se não tiver)
npm install -g wrangler

# Servidor local
npx wrangler pages dev . --port 4000

# Acesse: http://localhost:4000
```

## 📱 Funcionalidades Técnicas

### Frontend (app.js)
- **Class-based architecture** com métodos organizados
- **Event listeners** para todas as interações
- **Estado management** (API key, arquivo atual, resultados)
- **PDF.js integration** para contagem de páginas
- **Exchange rate API** para conversão USD/BRL
- **Progress animations** com CSS + JavaScript
- **Error handling** robusto

### Backend (functions/process.js)
- **Cloudflare Pages Function** compatível
- **Mistral OCR API** integration (3 steps: upload → URL → OCR)
- **CORS headers** configurados
- **File validation** (tipo, tamanho)
- **Error handling** com logs
- **API key flexibility** (header ou env)

### UI/UX (style.css)
- **Gradient background** moderno
- **Trust indicators** para credibilidade
- **Cost calculator** visual
- **Value comparison** metrics
- **Progress steps** animados
- **Responsive design** mobile-first
- **Loading states** em todos os pontos

## 🎯 Casos de Uso

- **Digitização de documentos**
- **Extração de texto de imagens**
- **Conversão PDF → Markdown**
- **Processamento de formulários**
- **Arquivos históricos**

## 💡 Customização

### Trocar Provedor de OCR
Modifique `functions/process.js` para usar Google Vision, AWS Textract, etc.

### Alterar Estilos
Customize `style.css` - todas as cores, gradientes e animações.

### Adicionar Formatos
Estenda `app.js` para suportar DOCX, TXT, etc.

## ⚠️ Limitações

- **Arquivo max:** 50MB
- **Custo:** $1/1000 páginas (Mistral OCR)
- **Formatos:** PDF, PNG, JPG, WEBP, BMP, TIFF
- **Rate limits:** Conforme Mistral API

## 🔧 Troubleshooting

### Deploy não funciona?
1. ✅ Certifique-se de usar **Pages** (não Workers)
2. ✅ Build command: `echo ""`
3. ✅ Build output directory: vazio
4. ✅ Estrutura: arquivos na raiz + `/functions/`

### API não responde?
1. ✅ Verifique logs no Cloudflare Dashboard
2. ✅ Confirme CORS headers
3. ✅ Teste API key na Mistral Console

### Interface quebrada?
1. ✅ Verifique JavaScript errors no Console
2. ✅ Confirme CDN links (Font Awesome, PDF.js, Marked)
3. ✅ Teste com diferentes navegadores

## 📄 Licença

MIT License - Use como quiser!

## 🤝 Contribuição

PRs são bem-vindos! Este é um template para a comunidade.

---

**Powered by:**
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Mistral AI](https://mistral.ai/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Marked.js](https://marked.js.org/)
- [Font Awesome](https://fontawesome.com/)

🎉 **Template criado com [Claude Code](https://claude.ai/code)**