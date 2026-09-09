# Meudocelar - Guia de Deploy e Sincronização (Hostinger / GitHub)

Este projeto é uma aplicação full-stack moderna (Node.js/Express + React 19 + TypeScript + Vite + Tailwind CSS) com suporte duplo a armazenamento: **MySQL/MariaDB (Hostinger)** e **JSON com persistência local em disco**.

---

## 🚀 Como Sincronizar via GitHub com a Hostinger

### 1. Preparar o Repositório no GitHub
1. Faça o commit e envie todas as alterações para o seu repositório GitHub (`main` ou `master`).
2. O arquivo `.gitignore` já está configurado para ignorar `node_modules/`, `dist/`, logs e arquivos `.env*` confidenciais.

---

### 2. Configurar a Aplicação Node.js na Hostinger (hPanel ou VPS)

Na aba **Node.js** do seu painel Hostinger:

- **Node.js Version**: `18.x`, `20.x` ou `22.x` (Recomendado: 20 LTS ou 22 LTS).
- **Application Root**: `/public_html` (ou a pasta onde o repositório foi clonado).
- **Application Startup File**: `dist/server.cjs`
- **Build Command**: `npm run build`
- **Install Command**: `npm install`

---

### 3. Variáveis de Ambiente (`.env` na Hostinger)

Crie ou edite o arquivo `.env` na raiz do seu projeto na Hostinger com base no modelo `.env.example`:

```env
# Ambiente de Produção
NODE_ENV=production
PORT=3000

# Chave de segurança para sessões
JWT_SECRET=sua_chave_secreta_muito_segura_aqui

# Configurações do MySQL da Hostinger (Opcional - se não preenchido, usa JSON com auto-recuperação)
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_nomedobanco
DB_USER=u123456789_usuario
DB_PASSWORD=SuaSenhaDoBanco123!
```

---

### 4. Deploy / Atualização Passo a Passo

Via terminal SSH ou Git Auto-Deploy da Hostinger:

```bash
# 1. Puxar alterações do GitHub
git pull origin main

# 2. Instalar novas dependências (se houver)
npm install

# 3. Compilar o frontend e o backend empacotado em CJS
npm run build

# 4. Reiniciar a aplicação Node.js no painel Hostinger ou via PM2
# (Exemplo via PM2):
pm2 restart all || npm start
```

---

### ✨ Recursos Prontos para Produção:
- **Build unificado**: `npm run build` gera o frontend em `dist/` e o backend em `dist/server.cjs`.
- **Monitor de Preços em Background**: Rotina periódica que verifica links de fornecedores (Hotmart, AliExpress, Shopee, Magalu, Kiwify, etc.).
- **Upload de Imagens**: Armazenamento automático em `data/uploads/` com compressão WebP.
- **Banco de Dados Híbrido**: Opera automaticamente em MySQL quando configurado, com fallback e sincronização automática em JSON.
