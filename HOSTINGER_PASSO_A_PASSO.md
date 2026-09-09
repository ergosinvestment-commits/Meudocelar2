# 🚀 Guia Prático Definitivo: Conectar o Meudocelar ao MySQL da Hostinger

Suas credenciais configuradas:
- **Banco de Dados:** `u566136191_meudocelar`
- **Usuário:** `u566136191_meudocelar`
- **Host:** `localhost`
- **Porta:** `3306`

---

## ⚡ Passo 1: Executar o `schema.sql` no phpMyAdmin da Hostinger

1. No **hPanel da Hostinger**, vá em **Bancos de Dados MySQL**.
2. Ao lado do banco `u566136191_meudocelar`, clique em **Entrar no phpMyAdmin**.
3. Na coluna esquerda do phpMyAdmin, clique no nome do seu banco (`u566136191_meudocelar`).
4. No menu superior, clique na aba **SQL**.
5. Abra o arquivo **`schema.sql`** do seu projeto, copie todo o conteúdo, cole na caixa de texto e clique em **Executar** (*Go*).
   *(Todas as tabelas `stores`, `categories`, `products`, `users` e `banners` serão criadas com os dados do Meudocelar!)*

---

## ⚡ Passo 2: Configurar as Variáveis de Ambiente no Servidor

No arquivo `.env` na raiz da sua aplicação na Hostinger (ou nas variáveis de ambiente do Node.js):

```env
NODE_ENV=production
PORT=3000
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u566136191_meudocelar
DB_USER=u566136191_meudocelar
DB_PASSWORD=Second*-2112
JWT_SECRET=meudocelar_chave_secreta_jwt_2026
```

---

## ⚡ Passo 3: Inicializar a Aplicação Node.js na Hostinger

No painel da Hostinger (seção **Avançado > Node.js** ou via SSH):
- **Application Root**: `/public_html` (ou a pasta onde extraiu o projeto)
- **Application Startup File**: `server.js` ou `dist/server.cjs`
- **Node.js Version**: `20.x` ou `18.x`
- Clique em **Salvar / Iniciar Aplicação**.
