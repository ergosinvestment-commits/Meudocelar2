import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { mysqlManager } from './src/server/mysql';
import { loginRateLimiter, apiRateLimiter, requireAdminAuth } from './src/server/security';
import { fetchSupplierData, calculateMarkupPrice, detectPlatformFromUrl } from './src/server/priceMonitor';
import { PriceCheckResult } from './src/types';
import { saveOptimizedUpload, optimizeBuffer, optimizeImageUrl } from './src/server/imageOptimizer';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust proxy for reverse proxies (Cloud Run, Hostinger, Nginx)
  app.set('trust proxy', 1);

  // Initialize MySQL if configured in environment (non-blocking for fast server boot)
  mysqlManager.init().then(async (connected) => {
    if (connected) {
      console.log('[Hostinger MySQL] Conexão ativa com o banco de dados MySQL.');
      try {
        await mysqlManager.createTablesIfNotExist();
        await mysqlManager.ensureBlogTablesExist();
        await mysqlManager.ensureInstitutionalTableExist();
        const mysqlData = await mysqlManager.loadAllDataFromMySql();
        if (mysqlData) {
          db.hydrateFromMySql(mysqlData);
        }
      } catch (e: any) {
        console.warn('[Hostinger MySQL] Falha ao sincronizar estado inicial:', e?.message || e);
      }
    }
  }).catch((err) => {
    console.warn('[Hostinger MySQL] Inicialização em segundo plano:', err?.message || err);
  });

  // Security Headers (configured to allow iframe preview, cross-origin images and inline scripts)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible media, fonts & affiliate link images
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false, // Prevents CORP blocking of uploaded or proxied images
      crossOriginOpenerPolicy: false,
      frameguard: false // Permite iframe no ambiente AI Studio e incorporação
    })
  );

  // Gzip / Deflate compression for all responses
  app.use(compression());

  // Static uploads directory for images saved from computer
  const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

  // Middleware for large payload (e.g., high-resolution image uploads)
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Global API Rate Limiter
  app.use('/api/', apiRateLimiter);

  // Upload image from computer endpoint (converts and compresses automatically to WebP)
  app.post('/api/admin/upload-image', async (req, res) => {
    try {
      const { dataUrl, fileName, format } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
      }

      // If it's a base64 Data URL, compress to WebP (or AVIF) and save to disk
      if (dataUrl.startsWith('data:image/')) {
        const { publicUrl, originalSize, newSize } = await saveOptimizedUpload(dataUrl, UPLOADS_DIR, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 82,
          format: format === 'avif' ? 'avif' : 'webp'
        });

        return res.json({
          success: true,
          url: publicUrl,
          originalSize,
          newSize,
          savedBytes: Math.max(0, originalSize - newSize),
          format: 'webp'
        });
      }

      // If it's an external URL, normalize with WebP parameters
      const optimizedUrl = optimizeImageUrl(dataUrl);
      res.json({ success: true, url: optimizedUrl, format: 'webp' });
    } catch (err: any) {
      console.error('[Upload Image Error]', err);
      res.status(500).json({ error: 'Erro ao processar imagem: ' + (err?.message || 'Falha interna') });
    }
  });

  // ============================================
  // PUBLIC STORE API (Matches Planiloja Index Requirements)
  // ============================================

  // Get Store Configuration
  app.get('/api/store/:slug', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    let store = db.getStoreBySlug(slug);
    if (!store) {
      const stores = db.getStores();
      store = stores[0];
    }
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    // Return object compatible with the store frontend
    res.json(store);
  });

  // Get Store Products (Public - only active & non-expired)
  app.get('/api/store/:slug/products', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    let products = db.getProducts(slug, true);
    if (!products || products.length === 0) {
      products = db.getProducts('achadinhos-da-maria', true);
    }
    res.json(products || []);
  });

  // Get Store Categories (Public)
  app.get('/api/store/:slug/categories', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const onlyMenu = req.query.menu === 'true';
    const categories = db.getCategories(slug, onlyMenu);
    res.json(categories);
  });

  // Get Store Platforms (Public)
  app.get('/api/store/:slug/platforms', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const platforms = db.getPlatforms(slug, true);
    res.json(platforms);
  });

  // Register Click on Affiliate Link
  app.post('/api/store/:slug/clicks', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const clickData = req.body || {};
    const recorded = db.recordClick(slug, clickData);
    res.json({ success: true, clickId: recorded.id });
  });

  // Register Store View
  app.post('/api/store/:slug/view', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    db.incrementViews(slug);
    res.json({ success: true });
  });

  // ============================================
  // PUBLIC BLOG & CONTACT API
  // ============================================

  // Get Published Blog Posts
  app.get('/api/store/:slug/posts', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const posts = db.getPosts(slug, true);
    res.json(posts);
  });

  // Get Single Blog Post by Slug
  app.get('/api/store/:slug/posts/:postSlug', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const postSlug = req.params.postSlug;
    const post = db.getPostBySlug(slug, postSlug);
    if (!post) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }
    res.json(post);
  });

  // Increment Post Views
  app.post('/api/store/:slug/posts/:id/view', (req, res) => {
    const id = req.params.id;
    db.incrementPostViews(id);
    res.json({ success: true });
  });

  // Get Public Blog Settings
  app.get(['/api/store/:slug/blog-settings', '/api/public/store/:slug/blog-settings'], (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const settings = db.getBlogSettings(slug);
    res.json(settings);
  });

  // Get Public Blog Categories
  app.get('/api/store/:slug/blog-categories', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const categories = db.getBlogCategories(slug, true);
    res.json(categories);
  });

  // Get Public Blog Editors
  app.get('/api/store/:slug/blog-editors', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const editors = db.getBlogEditors(slug, true);
    res.json(editors);
  });

  // Get Public Institutional Data
  app.get(['/api/store/:slug/institutional', '/api/public/store/:slug/institutional'], (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const data = db.getInstitutional(slug);
    res.json(data);
  });

  // Send Contact Message
  app.post('/api/store/:slug/contact', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const msg = db.saveMessage(slug, req.body);
    res.status(201).json({ success: true, message: msg });
  });

  // Image Proxy (bypasses hotlink protection & compresses remote images to WebP/AVIF)
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || typeof targetUrl !== 'string' || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
        return res.status(400).send('URL de imagem inválida');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': ''
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).send('Erro ao carregar imagem remota');
      }

      const arrayBuffer = await response.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      // Compress and convert to WebP / AVIF via sharp
      try {
        const clientAcceptsAvif = (req.headers.accept || '').includes('image/avif');
        const { buffer: compressedBuffer, mimeType } = await optimizeBuffer(rawBuffer, {
          maxWidth: 1600,
          quality: 82,
          format: clientAcceptsAvif ? 'avif' : 'webp'
        });

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(compressedBuffer);
      } catch (sharpErr) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(rawBuffer);
      }
    } catch (err) {
      res.status(500).send('Falha ao processar proxy da imagem');
    }
  });

  // Batch Image Optimization Endpoint (scans and optimizes all images in database)
  app.post('/api/admin/optimize-all-images', async (req, res) => {
    try {
      const stats = await db.optimizeAllImages();
      res.json({ success: true, ...stats });
    } catch (err: any) {
      console.error('[Optimize Images Error]', err);
      res.status(500).json({ error: 'Erro ao otimizar imagens: ' + (err?.message || 'Falha interna') });
    }
  });

  // ============================================
  // ADMIN DASHBOARD API
  // ============================================

  // List all stores
  app.get('/api/admin/stores', (req, res) => {
    const stores = db.getStores();
    res.json(stores);
  });

  // Create store
  app.post('/api/admin/stores', (req, res) => {
    const newStore = db.createStore(req.body);
    res.status(201).json(newStore);
  });

  // Get store details for admin
  app.get('/api/admin/store/:slug', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const store = db.getStoreBySlug(slug);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(store);
  });

  // Update store details and appearance
  app.put('/api/admin/store/:slug', async (req, res) => {
    const slug = req.params.slug;
    const updated = db.updateStore(slug, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Store not found' });
    }
    // Async sync to MySQL if connected
    if (mysqlManager.isLive()) {
      mysqlManager.saveStore(updated).catch(e => console.error('[MySQL SaveStore Error]', e));
    }
    res.json(updated);
  });

  // Get all products (including inactive) for admin table
  app.get('/api/admin/store/:slug/products', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const products = db.getProducts(slug, false);
    res.json(products);
  });

  // Create new product
  app.post('/api/admin/store/:slug/products', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const created = db.createProduct(slug, req.body);
    if (mysqlManager.isLive()) {
      mysqlManager.saveProduct(created).catch(e => console.error('[MySQL SaveProduct Error]', e));
    }
    res.status(201).json(created);
  });

  // Full update of product
  app.put('/api/admin/store/:slug/products/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updateProduct(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.saveProduct(updated).catch(e => console.error('[MySQL UpdateProduct Error]', e));
    }
    res.json(updated);
  });

  // Quick inline update of single fields (e.g. price, promo, active, star, order)
  app.patch('/api/admin/store/:slug/products/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updateProduct(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.saveProduct(updated).catch(e => console.error('[MySQL PatchProduct Error]', e));
    }
    res.json(updated);
  });

  // Delete product
  app.delete('/api/admin/store/:slug/products/:id', async (req, res) => {
    const id = req.params.id;
    const success = db.deleteProduct(id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.deleteProduct(id).catch(e => console.error('[MySQL DeleteProduct Error]', e));
    }
    res.json({ success: true });
  });

  // ============================================
  // CATEGORIES ADMIN API
  // ============================================

  // Get all categories
  app.get('/api/admin/store/:slug/categories', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const categories = db.getCategories(slug, false);
    res.json(categories);
  });

  // Create new category
  app.post('/api/admin/store/:slug/categories', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const created = db.createCategory(slug, req.body);
    if (mysqlManager.isLive()) {
      mysqlManager.saveCategory(created).catch(e => console.error('[MySQL SaveCategory Error]', e));
    }
    res.status(201).json(created);
  });

  // Update category
  app.put('/api/admin/store/:slug/categories/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updateCategory(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.saveCategory(updated).catch(e => console.error('[MySQL UpdateCategory Error]', e));
    }
    res.json(updated);
  });

  // Patch category
  app.patch('/api/admin/store/:slug/categories/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updateCategory(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.saveCategory(updated).catch(e => console.error('[MySQL PatchCategory Error]', e));
    }
    res.json(updated);
  });

  // Delete category
  app.delete('/api/admin/store/:slug/categories/:id', async (req, res) => {
    const id = req.params.id;
    const success = db.deleteCategory(id);
    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.deleteCategory(id).catch(e => console.error('[MySQL DeleteCategory Error]', e));
    }
    res.json({ success: true });
  });

  // ============================================
  // PLATFORMS ADMIN API
  // ============================================

  // Get all platforms
  app.get('/api/admin/store/:slug/platforms', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const platforms = db.getPlatforms(slug, false);
    res.json(platforms);
  });

  // Create new platform
  app.post('/api/admin/store/:slug/platforms', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const created = db.createPlatform(slug, req.body);
    if (mysqlManager.isLive()) {
      mysqlManager.savePlatform(created).catch(e => console.error('[MySQL SavePlatform Error]', e));
    }
    res.status(201).json(created);
  });

  // Update platform
  app.put('/api/admin/store/:slug/platforms/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updatePlatform(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.savePlatform(updated).catch(e => console.error('[MySQL UpdatePlatform Error]', e));
    }
    res.json(updated);
  });

  // Patch platform
  app.patch('/api/admin/store/:slug/platforms/:id', async (req, res) => {
    const id = req.params.id;
    const updated = db.updatePlatform(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.savePlatform(updated).catch(e => console.error('[MySQL PatchPlatform Error]', e));
    }
    res.json(updated);
  });

  // Delete platform
  app.delete('/api/admin/store/:slug/platforms/:id', async (req, res) => {
    const id = req.params.id;
    const success = db.deletePlatform(id);
    if (!success) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    if (mysqlManager.isLive()) {
      mysqlManager.deletePlatform(id).catch(e => console.error('[MySQL DeletePlatform Error]', e));
    }
    res.json({ success: true });
  });

  // ============================================
  // USERS ADMIN API (GESTÃO DE USUÁRIOS)
  // ============================================

  // Get all users of a store
  app.get('/api/admin/store/:slug/users', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const users = db.getUsers(slug);
    res.json(users);
  });

  // Create new user
  app.post('/api/admin/store/:slug/users', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const result = db.createUser(slug, req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erro ao criar usuário' });
    }
    res.status(201).json(result.user);
  });

  // Update user
  app.put('/api/admin/store/:slug/users/:id', async (req, res) => {
    const id = req.params.id;
    const result = db.updateUser(id, req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erro ao atualizar usuário' });
    }
    res.json(result.user);
  });

  // Patch user
  app.patch('/api/admin/store/:slug/users/:id', async (req, res) => {
    const id = req.params.id;
    const result = db.updateUser(id, req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erro ao atualizar usuário' });
    }
    res.json(result.user);
  });

  // Dedicated user password change
  app.post('/api/admin/store/:slug/users/:id/password', async (req, res) => {
    const id = req.params.id;
    const { password, newPassword, senha } = req.body || {};
    const passToSet = password || newPassword || senha;
    if (!passToSet || typeof passToSet !== 'string' || !passToSet.trim()) {
      return res.status(400).json({ error: 'A nova senha deve ser informada.' });
    }
    const result = db.updateUser(id, { password: passToSet.trim() });
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erro ao alterar senha do usuário' });
    }
    res.json({ success: true, message: 'Senha atualizada com sucesso!', user: result.user });
  });

  // Delete user
  app.delete('/api/admin/store/:slug/users/:id', async (req, res) => {
    const id = req.params.id;
    const result = db.deleteUser(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erro ao remover usuário' });
    }
    res.json({ success: true });
  });

  // ============================================
  // BLOG POSTS & MESSAGES ADMIN API
  // ============================================

  // Get all posts for admin (including drafts)
  app.get('/api/admin/store/:slug/posts', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const posts = db.getPosts(slug, false);
    res.json(posts);
  });

  // Create or update post
  app.post('/api/admin/store/:slug/posts', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const post = db.savePost(slug, req.body);
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogPost(post).catch(e => console.error('[MySQL SaveBlogPost Error]', e));
    }
    res.status(201).json(post);
  });

  app.put('/api/admin/store/:slug/posts/:id', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const post = db.savePost(slug, { ...req.body, id: req.params.id });
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogPost(post).catch(e => console.error('[MySQL UpdateBlogPost Error]', e));
    }
    res.json(post);
  });

  app.delete('/api/admin/store/:slug/posts/:id', async (req, res) => {
    const success = db.deletePost(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.deleteBlogPost(req.params.id).catch(e => console.error('[MySQL DeleteBlogPost Error]', e));
    }
    res.json({ success: true });
  });

  // Get contact messages for admin
  app.get('/api/admin/store/:slug/messages', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const messages = db.getMessages(slug);
    res.json(messages);
  });

  // Delete message
  app.delete('/api/admin/store/:slug/messages/:id', async (req, res) => {
    const success = db.deleteMessage(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.deleteContactMessage(req.params.id).catch(e => console.error('[MySQL DeleteContactMessage Error]', e));
    }
    res.json({ success: true });
  });

  // ============================================
  // BLOG SETTINGS, CATEGORIES & EDITORS ADMIN API
  // ============================================

  // Get blog settings
  app.get('/api/admin/store/:slug/blog-settings', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const settings = db.getBlogSettings(slug);
    res.json(settings);
  });

  // Update blog settings
  app.put('/api/admin/store/:slug/blog-settings', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const updated = db.updateBlogSettings(slug, req.body);
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogSettings(slug, updated).catch(e => console.error('[MySQL SaveBlogSettings Error]', e));
    }
    res.json(updated);
  });

  // Get institutional data (admin)
  app.get('/api/admin/store/:slug/institutional', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const data = db.getInstitutional(slug);
    res.json(data);
  });

  // Update institutional data (admin - persists directly to MySQL institutional_pages, stores, and blog_settings)
  app.put('/api/admin/store/:slug/institutional', async (req, res) => {
    try {
      const slug = req.params.slug || 'achadinhos-da-maria';
      const updated = db.updateInstitutional(slug, req.body);
      let mysqlSaved = false;
      let mysqlError: string | null = null;

      if (mysqlManager.isLive()) {
        try {
          mysqlSaved = await mysqlManager.saveInstitutional(updated);
        } catch (mErr: any) {
          mysqlError = mErr?.message || 'Erro ao persistir no MySQL';
          console.error('[Admin SaveInstitutional MySQL Error]', mErr);
        }
      }

      res.json({
        success: true,
        data: updated,
        mysqlSaved,
        mysqlError,
        message: 'Dados institucionais salvos com sucesso!'
      });
    } catch (err: any) {
      console.error('[Admin SaveInstitutional Server Error]', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Erro ao salvar dados institucionais'
      });
    }
  });

  // Get all blog categories (admin)
  app.get('/api/admin/store/:slug/blog-categories', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const categories = db.getBlogCategories(slug, false);
    res.json(categories);
  });

  // Create blog category
  app.post('/api/admin/store/:slug/blog-categories', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const newCat = db.createBlogCategory(slug, req.body);
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogCategory(newCat).catch(e => console.error('[MySQL SaveBlogCategory Error]', e));
    }
    res.status(201).json(newCat);
  });

  // Update blog category
  app.put('/api/admin/store/:slug/blog-categories/:id', async (req, res) => {
    const updated = db.updateBlogCategory(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogCategory(updated).catch(e => console.error('[MySQL UpdateBlogCategory Error]', e));
    }
    res.json(updated);
  });

  // Delete blog category
  app.delete('/api/admin/store/:slug/blog-categories/:id', async (req, res) => {
    const success = db.deleteBlogCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.deleteBlogCategory(req.params.id).catch(e => console.error('[MySQL DeleteBlogCategory Error]', e));
    }
    res.json({ success: true });
  });

  // Get all blog editors (admin)
  app.get('/api/admin/store/:slug/blog-editors', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const editors = db.getBlogEditors(slug, false);
    res.json(editors);
  });

  // Create blog editor
  app.post('/api/admin/store/:slug/blog-editors', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const newEditor = db.createBlogEditor(slug, req.body);
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogEditor(newEditor).catch(e => console.error('[MySQL SaveBlogEditor Error]', e));
    }
    res.status(201).json(newEditor);
  });

  // Update blog editor
  app.put('/api/admin/store/:slug/blog-editors/:id', async (req, res) => {
    const updated = db.updateBlogEditor(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Editor não encontrado' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.saveBlogEditor(updated).catch(e => console.error('[MySQL UpdateBlogEditor Error]', e));
    }
    res.json(updated);
  });

  // Delete blog editor
  app.delete('/api/admin/store/:slug/blog-editors/:id', async (req, res) => {
    const success = db.deleteBlogEditor(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Editor não encontrado' });
    }
    if (mysqlManager.isLive()) {
      await mysqlManager.deleteBlogEditor(req.params.id).catch(e => console.error('[MySQL DeleteBlogEditor Error]', e));
    }
    res.json({ success: true });
  });

  // ============================================
  // ADMIN AUTH API
  // ============================================

  // Admin login verification (protected with rate limiter against brute-force)
  app.post('/api/admin/auth/login', loginRateLimiter, (req, res) => {
    const { slug = 'achadinhos-da-maria', login, password } = req.body || {};
    const result = db.verifyAdminAuth(slug, login, password);
    if (!result.success) {
      return res.status(401).json({ success: false, error: result.message || 'Credenciais inválidas' });
    }
    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  });

  // Update admin credentials
  app.post('/api/admin/auth/change-credentials', (req, res) => {
    const { slug = 'achadinhos-da-maria', newEmail, newPassword, newUser } = req.body || {};
    if (!newEmail && !newPassword && !newUser) {
      return res.status(400).json({ error: 'Nenhum dado informado para alteração' });
    }
    const success = db.updateAdminCredentials(slug, newEmail, newPassword, newUser);
    if (!success) {
      return res.status(500).json({ error: 'Erro ao atualizar credenciais' });
    }
    res.json({ success: true });
  });

  // ============================================
  // DATABASE & HOSTINGER MANAGEMENT API
  // ============================================

  // Database and connection status
  app.get('/api/admin/database/status', (req, res) => {
    const mysqlStatus = mysqlManager.getStatus();
    const stores = db.getStores();
    const store = stores[0];
    const products = store ? db.getProducts(store.slug, false) : [];
    const categories = store ? db.getCategories(store.slug, false) : [];
    const platforms = store ? db.getPlatforms(store.slug, false) : [];

    res.json({
      ...mysqlStatus,
      totalStores: stores.length,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalPlatforms: platforms.length,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Export complete SQL script for Hostinger phpMyAdmin
  app.get('/api/admin/database/export-sql', (req, res) => {
    const slug = (req.query.slug as string) || 'achadinhos-da-maria';
    const sql = db.generateSqlDump(slug);
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="planiloja_${slug}_hostinger.sql"`);
    res.send(sql);
  });

  // Get raw SQL text for 1-click copy into phpMyAdmin SQL tab
  app.get('/api/admin/database/sql-content', (req, res) => {
    const slug = (req.query.slug as string) || 'achadinhos-da-maria';
    const sql = db.generateSqlDump(slug);
    res.json({ sql });
  });

  // Export JSON Backup
  app.get('/api/admin/database/export-json', (req, res) => {
    const slug = (req.query.slug as string) || 'achadinhos-da-maria';
    const backup = db.generateJsonBackup(slug);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="planiloja_${slug}_backup.json"`);
    res.send(JSON.stringify(backup, null, 2));
  });

  // Reset and restore demo data (JSON/local)
  app.post('/api/admin/store/:slug/seed-demo-data', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const result = db.resetDemoData(slug);
    res.json({ success: true, message: 'Dados fictícios restaurados com sucesso!', ...result });
  });

  // Get MySQL / Database Live Diagnostics
  app.get('/api/admin/database/diagnostics', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const diag = await mysqlManager.getLiveDiagnostics();
      res.json({ success: true, ...diag });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro ao obter diagnóstico' });
    }
  });

  // Save MySQL config live and connect
  app.post('/api/admin/database/save-config', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const { host, port, user, password, database, ssl } = req.body || {};
      if (!host || !user || !database) {
        return res.status(400).json({
          success: false,
          message: 'Preencha o Host, Usuário e Nome do Banco de Dados para salvar a configuração.'
        });
      }

      const result = await mysqlManager.saveConfigAndConnect({
        host: String(host).trim(),
        port: Number(port || 3306),
        user: String(user).trim(),
        password: password ? String(password).trim() : '',
        database: String(database).trim(),
        ssl: Boolean(ssl)
      });

      if (result.success) {
        // Sync current store and products to the newly connected MySQL
        const allData = db.getAllData();
        await mysqlManager.syncAllData(allData);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Erro ao salvar credenciais: ${err?.message || 'Erro interno'}`
      });
    }
  });

  // Sync all in-memory catalog data directly to MySQL tables
  app.post('/api/admin/database/sync-all', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const allData = db.getAllData();
      const syncResult = await mysqlManager.syncAllData(allData);
      res.json(syncResult);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Erro na sincronização: ${err?.message || 'Erro interno'}`
      });
    }
  });

  // Direct MySQL Seeding / Population endpoint for Hostinger
  app.post('/api/admin/database/seed-mysql-now', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const slug = (req.body?.slug as string) || 'achadinhos-da-maria';
      
      // Always restore local catalog
      db.resetDemoData(slug);

      // If MySQL is active, seed MySQL tables directly
      const mysqlResult = await mysqlManager.seedAllDemoData(true);
      
      return res.json({
        success: true,
        message: mysqlResult.success
          ? 'Tabelas do banco MySQL e catálogo populados com sucesso com 8 produtos demonstrativos!'
          : `Catálogo atualizado! (${mysqlResult.message})`,
        mysql: mysqlResult
      });
    } catch (err: any) {
      console.error('[MySQL Seed Error]', err);
      return res.status(200).json({
        success: false,
        message: `Falha ao semear banco de dados: ${err?.message || 'Erro desconhecido'}`
      });
    }
  });

  // Ensure Blog Tables exist and synchronize blog data directly to MySQL
  app.post('/api/admin/database/ensure-blog-tables', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const slug = (req.body?.slug as string) || 'achadinhos-da-maria';
      
      // 1. Create tables in MySQL if connected
      const tablesResult = await mysqlManager.ensureBlogTablesExist();
      
      // 2. Sync all blog data from memory to MySQL
      let syncResult: any = { success: false, message: 'MySQL não conectado' };
      if (mysqlManager.isLive()) {
        const posts = db.getPosts(slug, false);
        const categories = db.getBlogCategories(slug, false);
        const editors = db.getBlogEditors(slug, false);
        const settings = db.getBlogSettings(slug);

        syncResult = await mysqlManager.syncBlogData({
          storeSlug: slug,
          posts,
          categories,
          editors,
          settings
        });
      }

      const diag = await mysqlManager.getLiveDiagnostics();

      return res.json({
        success: tablesResult.success,
        tablesResult,
        syncResult,
        diagnostics: diag,
        message: tablesResult.success
          ? 'Tabelas do Blog verificadas e sincronizadas com sucesso no MySQL da Hostinger!'
          : tablesResult.message
      });
    } catch (err: any) {
      console.error('[MySQL Ensure Blog Tables Error]', err);
      return res.status(500).json({
        success: false,
        message: `Erro ao criar tabelas do blog: ${err?.message || 'Erro desconhecido'}`
      });
    }
  });

  // Ensure Institutional Table and columns exist, and synchronize institutional data directly to MySQL
  app.post('/api/admin/database/ensure-institutional-table', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const slug = (req.body?.slug as string) || 'achadinhos-da-maria';

      // 1. Create table institutional_pages & add columns to stores and blog_settings
      const tableResult = await mysqlManager.ensureInstitutionalTableExist();

      // 2. Sync current institutional data from memory into MySQL
      let syncSaved = false;
      if (mysqlManager.isLive()) {
        const instData = db.getInstitutional(slug);
        syncSaved = await mysqlManager.saveInstitutional(instData);
      }

      const diag = await mysqlManager.getLiveDiagnostics();

      return res.json({
        success: tableResult.success,
        tableResult,
        syncSaved,
        diagnostics: diag,
        message: tableResult.success
          ? 'Tabela institutional_pages e colunas validadas e sincronizadas com sucesso no MySQL da Hostinger!'
          : tableResult.message
      });
    } catch (err: any) {
      console.error('[MySQL Ensure Institutional Table Error]', err);
      return res.status(500).json({
        success: false,
        message: `Erro ao validar tabela institucional: ${err?.message || 'Erro desconhecido'}`
      });
    }
  });

  // Dedicated SQL Script for Blog Tables creation in phpMyAdmin
  app.get('/api/admin/database/sql-blog-script', (req, res) => {
    const slug = (req.query?.slug as string) || 'achadinhos-da-maria';
    const fullDump = db.generateSqlDump(slug);
    
    // Extract everything from section 6 (CATEGORIAS DO BLOG) onwards
    const blogSectionIndex = fullDump.indexOf('-- 6. CATEGORIAS DO BLOG');
    let blogSql = '';
    if (blogSectionIndex !== -1) {
      blogSql = `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n` + fullDump.substring(blogSectionIndex);
    } else {
      blogSql = fullDump;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(blogSql);
  });

  // Test Hostinger MySQL credentials live
  app.post('/api/admin/database/test-connection', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const { host, port, user, password, database, ssl } = req.body || {};
      if (!host || !user || !database) {
        return res.status(400).json({
          success: false,
          message: 'Preencha o Host, Usuário e Nome do Banco de Dados para realizar o teste.'
        });
      }

      const testResult = await mysqlManager.testConnection({
        host: String(host).trim(),
        port: Number(port || 3306),
        user: String(user).trim(),
        password: password ? String(password).trim() : '',
        database: String(database).trim(),
        ssl: Boolean(ssl)
      });

      res.json(testResult);
    } catch (err: any) {
      console.error('[MySQL Test Error]', err);
      res.status(200).json({
        success: false,
        message: `Falha ao executar teste de conexão: ${err?.message || 'Erro interno'}`
      });
    }
  });

  // Get store metrics & reports
  app.get('/api/admin/store/:slug/metrics', (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
    const metrics = db.getMetrics(slug, days);
    res.json(metrics);
  });

  // Image upload handling (supports base64 data URLs)
  app.post('/api/admin/upload', (req, res) => {
    try {
      const { image, name } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }
      // Return the image data or processed URL
      res.json({ url: image });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Sheet Importer / Migrator Endpoint
  app.post('/api/admin/store/:slug/import-sheet', async (req, res) => {
    const slug = req.params.slug || 'achadinhos-da-maria';
    const { catalogoCsvUrl, configCsvUrl, replaceExisting } = req.body;

    try {
      let importedProductsCount = 0;

      if (catalogoCsvUrl) {
        const response = await fetch(catalogoCsvUrl);
        const text = await response.text();
        
        // Parse CSV
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const productsToImport: any[] = [];

        for (const line of lines) {
          // Simple CSV line splitter that handles quotes
          const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          const cols = match ? match.map(c => c.replace(/^"|"$/g, '').trim()) : line.split(',').map(c => c.trim());
          
          const first = (cols[0] || '').toUpperCase();
          if (!first || first === 'ATIVO' || first.includes('CATÁLOGO') || first !== 'SIM') continue;

          const preco = parseFloat((cols[7] || '').replace(/\./g, '').replace(',', '.')) || 0;
          const precoPromo = cols[8] ? (parseFloat(cols[8].replace(/\./g, '').replace(',', '.')) || null) : null;

          productsToImport.push({
            ativo: true,
            tipo: (cols[1] || '').toUpperCase() === 'DIGITAL' ? 'DIGITAL' : 'FISICO',
            plataforma: cols[2] || 'Amazon',
            categoria: cols[3] || 'Geral',
            subcategoria: cols[4] || '',
            nome: cols[5] || 'Produto Importado',
            descricao: cols[6] || '',
            preco,
            precoPromo,
            cupom: cols[9] || '',
            validade: cols[10] || null,
            linkAfiliado: cols[11] || '',
            textoBotao: cols[12] || '',
            video: cols[13] || '',
            img1: cols[14] || '',
            img2: cols[15] || '',
            img3: cols[16] || '',
            img4: cols[17] || '',
            ordem: parseInt(cols[18]) || 99,
            destaque: (cols[19] || '').toUpperCase() === 'SIM'
          });
        }

        if (productsToImport.length > 0) {
          db.bulkImport(slug, productsToImport, Boolean(replaceExisting));
          importedProductsCount = productsToImport.length;
        }
      }

      res.json({
        success: true,
        message: `Importação concluída! ${importedProductsCount} produtos foram processados.`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao importar dados da planilha: ' + (err?.message || 'Falha de conexão') });
    }
  });

  // ============================================
  // PRICE MONITOR & SUPPLIER SYNC APIS
  // ============================================

  // Get price monitor settings for store
  app.get('/api/price-monitor/settings', (req, res) => {
    const slug = (req.query.slug as string) || 'achadinhos-da-maria';
    const settings = db.getPriceMonitorSettings(slug);
    res.json(settings);
  });

  // Update price monitor settings
  app.post('/api/price-monitor/settings', (req, res) => {
    const slug = (req.body.slug as string) || 'achadinhos-da-maria';
    const settings = db.savePriceMonitorSettings(slug, req.body);
    res.json({ success: true, settings });
  });

  // Check single URL preview (Hotmart, AliExpress, Shopee, Magalu, Amazon, Kiwify, etc.)
  app.post('/api/price-monitor/check-url', async (req, res) => {
    try {
      const { url, markupType, markupValue } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL do produto é obrigatória' });
      }

      const result = await fetchSupplierData(url);
      const mType = markupType || 'direct';
      const mVal = Number(markupValue) || 0;

      result.calculatedPrice = calculateMarkupPrice(result.supplierPrice, mType, mVal);
      result.calculatedPromo = result.supplierPromo ? calculateMarkupPrice(result.supplierPromo, mType, mVal) : null;

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao consultar fornecedor: ' + (err?.message || 'Erro interno') });
    }
  });

  // Scan catalog or subset of products and compare prices
  app.post('/api/price-monitor/scan-catalog', async (req, res) => {
    try {
      const { slug = 'achadinhos-da-maria', productIds, autoApply = false } = req.body;
      const settings = db.getPriceMonitorSettings(slug);
      let products = db.getProducts(slug, false);

      if (Array.isArray(productIds) && productIds.length > 0) {
        products = products.filter(p => productIds.includes(p.id));
      } else {
        // Only products with affiliate links
        products = products.filter(p => !!p.linkAfiliado && (p.linkAfiliado.startsWith('http://') || p.linkAfiliado.startsWith('https://')));
      }

      if (products.length === 0) {
        return res.json({
          success: true,
          scannedCount: 0,
          results: [],
          message: 'Nenhum produto com link de afiliado válido encontrado para monitorar.'
        });
      }

      const results: PriceCheckResult[] = [];
      const updatesToApply: {
        productId: string;
        newPrice?: number;
        newPromo?: number | null;
        ativo?: boolean;
        newSupplierPrice?: number;
        newSupplierPromo?: number | null;
        stockStatus?: 'in_stock' | 'out_of_stock';
      }[] = [];

      // Process in batches of 3 concurrently to avoid overloading external servers
      const batchSize = 3;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const batchPromises = batch.map(async (prod) => {
          const check = await fetchSupplierData(prod.linkAfiliado, { timeoutMs: 12000 });
          check.productId = prod.id;
          check.productName = prod.nome;
          check.currentCatalogPrice = prod.preco;
          check.currentCatalogPromo = prod.precoPromo;

          const mType = settings.markupType || 'direct';
          const mVal = Number(settings.markupValue) || 0;

          if (check.supplierPrice !== null) {
            check.calculatedPrice = calculateMarkupPrice(check.supplierPrice, mType, mVal);
          } else {
            check.calculatedPrice = prod.preco;
          }

          if (check.supplierPromo !== null) {
            check.calculatedPromo = calculateMarkupPrice(check.supplierPromo, mType, mVal);
          } else {
            check.calculatedPromo = null;
          }

          // Compute difference and status
          const is404 = check.status === 'not_found' || check.httpStatus === 404 || check.is404 || (check.error && check.error.toLowerCase().includes('404'));

          if (is404) {
            check.status = 'not_found';
            check.inStock = false;
            check.is404 = true;
          } else if (!check.inStock) {
            check.status = 'out_of_stock';
          } else if (check.calculatedPrice && check.calculatedPrice > prod.preco) {
            check.status = 'up';
            check.diffPercent = Math.round(((check.calculatedPrice - prod.preco) / prod.preco) * 100);
          } else if (check.calculatedPrice && check.calculatedPrice < prod.preco) {
            check.status = 'down';
            check.diffPercent = Math.round(((prod.preco - check.calculatedPrice) / prod.preco) * 100);
          } else if (check.status !== 'error') {
            check.status = 'unchanged';
            check.diffPercent = 0;
          }

          // If product returned 404 error, disable it from the store
          const shouldDisableOn404 = settings.disableOn404 !== false;

          if (is404 && shouldDisableOn404) {
            const updateItem: typeof updatesToApply[0] = {
              productId: prod.id,
              ativo: false,
              stockStatus: 'out_of_stock'
            };
            updatesToApply.push(updateItem);
          } else if (autoApply || settings.autoApply) {
            const updateItem: typeof updatesToApply[0] = {
              productId: prod.id,
              newSupplierPrice: check.supplierPrice || prod.preco,
              newSupplierPromo: check.supplierPromo,
              stockStatus: check.inStock ? 'in_stock' : 'out_of_stock'
            };

            if (check.calculatedPrice && check.calculatedPrice > 0 && check.calculatedPrice !== prod.preco) {
              updateItem.newPrice = check.calculatedPrice;
            }
            if (check.calculatedPromo !== undefined && check.calculatedPromo !== prod.precoPromo) {
              updateItem.newPromo = check.calculatedPromo;
            }

            if (!check.inStock && settings.outOfStockAction === 'pause') {
              updateItem.ativo = false;
            }

            if (updateItem.newPrice || updateItem.newPromo !== undefined || updateItem.ativo !== undefined) {
              updatesToApply.push(updateItem);
            }
          }

          return check;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      let appliedCount = 0;
      if (updatesToApply.length > 0) {
        const updateResult = db.applyBatchPriceUpdates(slug, updatesToApply);
        appliedCount = updateResult.updatedCount;
      }

      // Update last sync time
      db.savePriceMonitorSettings(slug, {
        lastSyncAt: new Date().toISOString()
      });

      const disabled404Count = updatesToApply.filter(u => u.ativo === false).length;

      res.json({
        success: true,
        scannedCount: results.length,
        results,
        appliedCount,
        disabled404Count,
        message: `Varredura concluída em ${results.length} produto(s). ${
          disabled404Count > 0 ? `${disabled404Count} produto(s) com erro 404/esgotados foram desabilitados da loja. ` : ''
        }${appliedCount > 0 ? `${appliedCount} produtos atualizados.` : ''}`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro durante a varredura do catálogo: ' + (err?.message || 'Falha') });
    }
  });

  // Apply batch price updates manually from preview
  app.post('/api/price-monitor/apply-updates', (req, res) => {
    try {
      const { slug = 'achadinhos-da-maria', updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Nenhuma alteração enviada para aplicar.' });
      }

      const result = db.applyBatchPriceUpdates(slug, updates);
      res.json({
        success: true,
        updatedCount: result.updatedCount,
        message: `${result.updatedCount} produto(s) atualizado(s) com sucesso no catálogo!`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao aplicar alterações: ' + (err?.message || 'Falha') });
    }
  });

  // Get price change logs / history
  app.get('/api/price-monitor/logs', (req, res) => {
    const slug = (req.query.slug as string) || 'achadinhos-da-maria';
    const limit = Number(req.query.limit) || 50;
    const logs = db.getPriceLogs(slug, limit);
    res.json(logs);
  });

  // Periodic automatic sync background job (every 30 minutes check if sync is due)
  setInterval(async () => {
    try {
      const storeSlug = 'achadinhos-da-maria';
      const settings = db.getPriceMonitorSettings(storeSlug);
      
      if (!settings.enabled || !settings.autoApply || settings.frequencyHours <= 0) {
        return;
      }

      const now = new Date().getTime();
      const lastSyncTime = settings.lastSyncAt ? new Date(settings.lastSyncAt).getTime() : 0;
      const intervalMs = settings.frequencyHours * 60 * 60 * 1000;

      if (now - lastSyncTime >= intervalMs) {
        console.log(`[PriceMonitor] Iniciando sincronização automática periódica de preços (${settings.frequencyHours}h)...`);
        
        const products = db.getProducts(storeSlug, false).filter(p => !!p.linkAfiliado && (p.linkAfiliado.startsWith('http://') || p.linkAfiliado.startsWith('https://')));
        
        const updatesToApply: any[] = [];
        for (const prod of products.slice(0, 30)) { // limit to 30 per run to avoid spam
          try {
            const check = await fetchSupplierData(prod.linkAfiliado, { timeoutMs: 10000 });
            const is404 = check.status === 'not_found' || check.httpStatus === 404 || check.is404 || (check.error && check.error.toLowerCase().includes('404'));
            const shouldDisableOn404 = settings.disableOn404 !== false;

            if (is404 && shouldDisableOn404) {
              updatesToApply.push({
                productId: prod.id,
                ativo: false,
                stockStatus: 'out_of_stock'
              });
            } else if (check.supplierPrice && check.supplierPrice > 0) {
              const calcPrice = calculateMarkupPrice(check.supplierPrice, settings.markupType, settings.markupValue);
              const calcPromo = check.supplierPromo ? calculateMarkupPrice(check.supplierPromo, settings.markupType, settings.markupValue) : null;
              
              const item: any = {
                productId: prod.id,
                newSupplierPrice: check.supplierPrice,
                newSupplierPromo: check.supplierPromo,
                stockStatus: check.inStock ? 'in_stock' : 'out_of_stock'
              };

              if (calcPrice && calcPrice !== prod.preco) item.newPrice = calcPrice;
              if (calcPromo !== undefined && calcPromo !== prod.precoPromo) item.newPromo = calcPromo;
              if (!check.inStock && settings.outOfStockAction === 'pause') item.ativo = false;

              if (item.newPrice || item.newPromo !== undefined || item.ativo !== undefined) {
                updatesToApply.push(item);
              }
            }
          } catch (e) {
            // skip failed item
          }
        }

        if (updatesToApply.length > 0) {
          db.applyBatchPriceUpdates(storeSlug, updatesToApply);
          console.log(`[PriceMonitor] Sincronização automática concluiu: ${updatesToApply.length} produtos atualizados.`);
        }
        
        db.savePriceMonitorSettings(storeSlug, { lastSyncAt: new Date().toISOString() });
      }
    } catch (e) {
      console.error('[PriceMonitor] Erro na rotina de verificação periódica:', e);
    }
  }, 30 * 60 * 1000); // Check every 30 minutes

  // Catch-all 404 for any unmatched /api/* routes so they never return Vite HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Endpoint de API não encontrado: ${req.method} ${req.originalUrl}`
    });
  });

  // ============================================
  // VITE & STATIC FILES
  // ============================================
  const distIndexExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' && distIndexExists && process.env.npm_lifecycle_event !== 'dev';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meudocelar running on http://localhost:${PORT}`);
  });
}

startServer();
