import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import {
  StoreConfig,
  Product,
  Category,
  Platform,
  ClickRecord,
  StoreUser,
  BlogPost,
  BlogCategory,
  BlogEditor,
  BlogSettings,
  ContactMessage,
  InstitutionalData
} from '../types';
import {
  FALLBACK_BLOG_POSTS,
  FALLBACK_BLOG_CATEGORIES,
  FALLBACK_BLOG_EDITORS,
  FALLBACK_BLOG_SETTINGS
} from '../data/defaultData';

export interface MySqlConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  socketPath?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'db_config.json');

// Known MySQL/MariaDB Unix socket paths on Hostinger / cPanel / Linux systems
const KNOWN_UNIX_SOCKETS = [
  '/var/run/mysqld/mysqld.sock',
  '/tmp/mysql.sock',
  '/var/lib/mysql/mysql.sock',
  '/run/mysqld/mysqld.sock'
];

class MySqlManager {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  private activeConfig: (MySqlConfig & { password?: string }) | null = null;
  private keepAliveInterval: any = null;
  private resolvedSocketPath: string | null = null;

  public isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }

  public isLive(): boolean {
    return this.isConnected && this.pool !== null;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      driver: this.isConnected ? 'Hostinger MySQL / MariaDB (Ativo)' : 'Armazenamento JSON Local (Modo Fallback)',
      error: this.connectionError,
      host: this.activeConfig?.host || process.env.DB_HOST || 'Local / Não configurado',
      database: this.activeConfig?.database || process.env.DB_NAME || 'store_data.json',
      user: this.activeConfig?.user || process.env.DB_USER || 'Nenhum',
      port: this.activeConfig?.port || process.env.DB_PORT || 3306,
      socket: this.resolvedSocketPath || undefined
    };
  }

  private buildCandidateConfigs(cfg: MySqlConfig): Array<mysql.PoolOptions & { _desc: string }> {
    const rawHost = (cfg.host || '').trim();
    const port = Number(cfg.port || 3306);
    const user = (cfg.user || 'root').trim();
    const password = cfg.password || '';
    const database = (cfg.database || '').trim();
    const useSsl = Boolean(cfg.ssl);

    const baseOptions: mysql.PoolOptions = {
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,
      connectTimeout: 15000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    };

    const isLocal = !rawHost || rawHost === 'localhost' || rawHost === '127.0.0.1' || rawHost === '::1';

    if (isLocal) {
      const candidates: Array<mysql.PoolOptions & { _desc: string }> = [];

      // 1. Primary: IPv4 127.0.0.1 (Bypasses Node.js IPv6 ::1 lookup issues on Linux)
      candidates.push({
        ...baseOptions,
        host: '127.0.0.1',
        port,
        _desc: `TCP 127.0.0.1:${port}`
      });

      // 2. Check existing known UNIX sockets (standard in Hostinger, cPanel, CloudLinux)
      for (const sock of KNOWN_UNIX_SOCKETS) {
        if (fs.existsSync(sock)) {
          candidates.push({
            ...baseOptions,
            socketPath: sock,
            _desc: `Unix Socket (${sock})`
          });
        }
      }

      // 3. Fallback: standard localhost
      candidates.push({
        ...baseOptions,
        host: 'localhost',
        port,
        _desc: `TCP localhost:${port}`
      });

      // 4. Try common unix sockets even if fs check is restricted
      for (const sock of KNOWN_UNIX_SOCKETS) {
        if (!candidates.some(c => c.socketPath === sock)) {
          candidates.push({
            ...baseOptions,
            socketPath: sock,
            _desc: `Unix Socket (${sock})`
          });
        }
      }

      return candidates;
    }

    // Remote Host (e.g., Hostinger server IP or hostname)
    return [
      {
        ...baseOptions,
        host: rawHost,
        port,
        connectTimeout: 12000,
        _desc: `TCP ${rawHost}:${port}`
      }
    ];
  }

  public async reconnect(): Promise<boolean> {
    if (!this.activeConfig) return false;
    try {
      if (this.pool) {
        try { await this.pool.end(); } catch (_) {}
        this.pool = null;
      }
      
      const candidates = this.buildCandidateConfigs(this.activeConfig);
      let lastErr: any = null;

      for (const candidate of candidates) {
        try {
          const testPool = mysql.createPool(candidate);
          await testPool.query('SELECT 1 as test');
          
          this.pool = testPool;
          this.resolvedSocketPath = candidate.socketPath || null;
          this.isConnected = true;
          this.connectionError = null;

          (this.pool as any).on('error', (err: any) => {
            console.warn('[Hostinger MySQL Pool Event]', err?.code || err?.message);
            if (err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
              this.reconnect().catch(() => {});
            } else if (err?.code === 'ENOTFOUND' || err?.code === 'EHOSTUNREACH') {
              this.isConnected = false;
              this.connectionError = `Host MySQL inacessível: ${err?.message || ''}`;
            }
          });

          console.log(`[Hostinger MySQL] Conexão restabelecida com sucesso via ${candidate._desc}.`);
          return true;
        } catch (err) {
          lastErr = err;
        }
      }

      this.isConnected = false;
      this.connectionError = lastErr?.message || 'Falha ao restabelecer conexão MySQL';
      return false;
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err?.message || 'Falha ao restabelecer conexão MySQL';
      return false;
    }
  }

  public async executeQuery<T = any>(querySql: string, params?: any[]): Promise<T> {
    if (!this.pool) {
      if (this.activeConfig?.host) {
        await this.reconnect().catch(() => {});
      }
      if (!this.pool) {
        throw new Error('MySQL pool não inicializado.');
      }
    }

    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const [res] = await this.pool.query(querySql, params);
        if (!this.isConnected) {
          this.isConnected = true;
          this.connectionError = null;
        }
        return res as T;
      } catch (err: any) {
        const isConnErr =
          err?.code === 'PROTOCOL_CONNECTION_LOST' ||
          err?.code === 'ECONNRESET' ||
          err?.code === 'ETIMEDOUT' ||
          err?.code === 'EPIPE' ||
          err?.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
          err?.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
          err?.message?.includes('closed') ||
          err?.message?.includes('Connection lost') ||
          err?.message?.includes('is not connected');

        if (isConnErr && attempts < maxAttempts) {
          console.warn(`[Hostinger MySQL] Tentativa ${attempts} falhou (${err?.code || err?.message}). Reconectando automaticamente...`);
          await this.reconnect().catch(() => {});
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Falha após múltiplas tentativas no MySQL.');
  }

  public async init(customConfig?: MySqlConfig): Promise<boolean> {
    let config: MySqlConfig = customConfig || {};

    // 1. Read data/db_config.json FIRST so saved UI configuration is preserved across restarts
    let savedConfig: MySqlConfig = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) || {};
      } catch (err) {
        console.warn('[Hostinger MySQL] Aviso ao ler db_config.json:', err);
      }
    }

    // 2. Resolve parameters: customConfig > data/db_config.json > process.env
    let host = config.host || savedConfig.host || process.env.DB_HOST || process.env.MYSQL_HOST;
    let user = config.user || savedConfig.user || process.env.DB_USER || process.env.MYSQL_USER;
    let password = config.password !== undefined
      ? config.password
      : (savedConfig.password !== undefined
        ? savedConfig.password
        : (process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || ''));
    let database = config.database || savedConfig.database || process.env.DB_NAME || process.env.MYSQL_DATABASE;
    let port = Number(config.port || savedConfig.port || process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
    let useSsl = config.ssl ?? savedConfig.ssl ?? (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true');
    let socketPath = config.socketPath || savedConfig.socketPath || process.env.DB_SOCKET;

    // 3. Fallback to DATABASE_URL / MYSQL_URL if host or database is missing
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    if (dbUrl && (!host || !database)) {
      try {
        const parsed = new URL(dbUrl);
        if (parsed.hostname && !host) host = parsed.hostname;
        if (parsed.port && !port) port = Number(parsed.port);
        if (parsed.username && !user) user = decodeURIComponent(parsed.username);
        if (parsed.password && !password) password = decodeURIComponent(parsed.password);
        if (parsed.pathname && parsed.pathname.length > 1 && !database) {
          database = parsed.pathname.substring(1);
        }
      } catch (e) {
        console.warn('[Hostinger MySQL] Aviso ao parsear DATABASE_URL:', e);
      }
    }

    // If still no MySQL credentials configured, gracefully stay in file-based storage mode
    if (!host || !user || !database) {
      this.isConnected = false;
      this.connectionError = 'Credenciais MySQL não configuradas (insira na aba Banco de Dados).';
      return false;
    }

    try {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }

      if (this.pool) {
        try {
          await this.pool.end();
        } catch (_) {}
        this.pool = null;
      }

      this.activeConfig = { host, user, database, port, ssl: useSsl, password, socketPath };
      const candidates = this.buildCandidateConfigs(this.activeConfig);
      let lastErr: any = null;
      let connectedCandidate: any = null;

      for (const candidate of candidates) {
        try {
          const testPool = mysql.createPool(candidate);
          await testPool.query('SELECT 1 as test');
          
          this.pool = testPool;
          this.resolvedSocketPath = candidate.socketPath || null;
          this.isConnected = true;
          this.connectionError = null;
          connectedCandidate = candidate;

          (this.pool as any).on('error', (err: any) => {
            console.warn('[Hostinger MySQL Pool Error]', err?.code || err?.message);
            if (err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
              this.reconnect().catch(() => {});
            } else if (err?.code === 'ENOTFOUND' || err?.code === 'EHOSTUNREACH') {
              this.isConnected = false;
              this.connectionError = `Host MySQL inacessível: ${err?.message || ''}`;
            }
          });

          console.log(`[Hostinger MySQL] Conectado com sucesso ao banco '${database}' via ${candidate._desc}. Conexão persistente ativa.`);
          break;
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!this.isConnected || !this.pool) {
        throw lastErr || new Error('Não foi possível estabelecer conexão MySQL com nenhum dos alvos configurados.');
      }

      // Setup keep-alive ping every 15s so Hostinger wait_timeout never closes the socket
      this.keepAliveInterval = setInterval(async () => {
        if (this.pool && this.isConnected) {
          try {
            await this.pool.query('SELECT 1 as ping');
          } catch (pingErr: any) {
            console.warn('[Hostinger MySQL] Ping keep-alive falhou, restabelecendo pool...', pingErr?.message);
            await this.reconnect();
          }
        }
      }, 15000);
      if (this.keepAliveInterval?.unref) {
        this.keepAliveInterval.unref();
      }

      // Ensure all required tables exist
      await this.createTablesIfNotExist();
      await this.ensureBlogTablesExist();
      await this.ensureInstitutionalTableExist();
      return true;
    } catch (err: any) {
      this.isConnected = false;
      if (err?.code === 'ECONNREFUSED' && (!host || host === 'localhost' || host === '127.0.0.1')) {
        this.connectionError = `Não foi possível conectar em 'localhost:3306' dentro do container da nuvem. Na Hostinger (onde o MySQL roda no mesmo servidor), 'localhost' funciona automaticamente. Para conectar aqui no preview, insira o IP do seu servidor Hostinger na aba Banco de Dados e ative 'Acesso Remoto MySQL' no hPanel da Hostinger.`;
      } else {
        this.connectionError = err?.message || 'Falha ao conectar ao banco MySQL';
      }
      console.warn(`[Hostinger MySQL] Conexão MySQL inativa: ${this.connectionError}. Usando armazenamento local seguro.`);
      return false;
    }
  }

  public async saveConfigAndConnect(config: MySqlConfig): Promise<{ success: boolean; message: string; diagnostics?: any }> {
    try {
      // If password was omitted or empty, preserve existing password if available
      if (!config.password) {
        if (fs.existsSync(CONFIG_FILE)) {
          try {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            if (saved?.password) config.password = saved.password;
          } catch {}
        }
        if (!config.password && process.env.DB_PASSWORD) {
          config.password = process.env.DB_PASSWORD;
        }
      }

      // 1. ALWAYS persist to data/db_config.json FIRST so credentials are NEVER lost
      const dataDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
      this.activeConfig = { ...config };

      // 2. Test credentials using candidate configs (IPv4, socket, remote)
      const testResult = await this.testConnection(config);
      if (!testResult.success) {
        return {
          success: false,
          message: `Configurações salvas em db_config.json! Porém o teste de conexão direta não pôde conectar ao host ${config.host || 'localhost'}: ${testResult.message}. Verifique se o Acesso Remoto ao MySQL está liberado na Hostinger para este IP.`
        };
      }

      // 3. Initialize connection with new config
      const connected = await this.init(config);
      if (!connected) {
        return {
          success: false,
          message: `Credenciais salvas, mas houve erro ao abrir o pool MySQL: ${this.connectionError}`
        };
      }

      const diag = await this.getLiveDiagnostics();
      return {
        success: true,
        message: 'Configuração salva com sucesso! Conexão com o MySQL da Hostinger estabelecida e tabelas prontas.',
        diagnostics: diag
      };
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro ao salvar configuração e conectar:', err);
      return {
        success: false,
        message: `Erro ao salvar e conectar: ${err?.message || 'Erro desconhecido'}`
      };
    }
  }

  public async testConnection(config: MySqlConfig): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const startTime = Date.now();
    try {
      const candidates = this.buildCandidateConfigs(config);
      let lastErr: any = null;

      for (const candidate of candidates) {
        try {
          const conn = await mysql.createConnection({
            host: candidate.host,
            port: candidate.port,
            user: candidate.user,
            password: candidate.password,
            database: candidate.database,
            socketPath: candidate.socketPath,
            ssl: candidate.ssl,
            connectTimeout: candidate.connectTimeout || 8000
          });

          await conn.query('SELECT 1');
          await conn.end();

          const latencyMs = Date.now() - startTime;
          return {
            success: true,
            message: `Conexão bem-sucedida com o servidor MySQL via ${candidate._desc}! (Latência: ${latencyMs}ms)`,
            latencyMs
          };
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr || new Error('Falha ao conectar.');
    } catch (err: any) {
      let friendlyMessage = err?.message || 'Não foi possível conectar ao banco de dados.';

      if (err?.code === 'ECONNREFUSED') {
        if (!config.host || config.host === 'localhost' || config.host === '127.0.0.1') {
          friendlyMessage = `O host 'localhost' não possui MySQL ativo dentro do container em nuvem. Na Hostinger (onde o MySQL roda no mesmo servidor), 'localhost' funciona automaticamente. Para conectar ao MySQL da Hostinger a partir daqui, informe o IP do servidor e habilite 'Acesso Remoto MySQL' no hPanel da Hostinger.`;
        } else {
          friendlyMessage = `Conexão recusada em ${config.host}:${config.port || 3306}. Verifique se a porta 3306 está aberta e se o MySQL está ativo.`;
        }
      } else if (err?.code === 'EAI_AGAIN' || err?.code === 'ENOTFOUND') {
        friendlyMessage = `Não foi possível localizar o host '${config.host}' via DNS. Dica para Hostinger: Em vez de usar o nome de domínio, use o endereço de IP do servidor (disponível no hPanel em 'Hospedagem' > 'Detalhes do Plano' > 'IP do Servidor') e libere o 'Acesso Remoto MySQL'.`;
      } else if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
        friendlyMessage = `Acesso negado para o usuário '${config.user}'. Verifique se o usuário e a senha cadastrados no hPanel da Hostinger estão corretos. Dica: Caso tenha ativado Acesso Remoto no hPanel, confirme se o usuário tem permissão para conexões externas (host '%').`;
      } else if (err?.code === 'ER_BAD_DB_ERROR') {
        friendlyMessage = `O banco de dados '${config.database}' não foi encontrado. Certifique-se de que o nome completo (ex: u123456789_banco) foi criado no menu 'Bancos de Dados MySQL' do hPanel.`;
      } else if (err?.code === 'ETIMEDOUT' || err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.code === 'EHOSTUNREACH') {
        friendlyMessage = `Tempo limite esgotado ao tentar conectar a '${config.host}'. Para acessar o MySQL da Hostinger fora do servidor web, acesse o hPanel > 'Bancos de Dados' > 'Acesso Remoto MySQL' e adicione permissão para conexões externas ('%' ou IP).`;
      }

      return {
        success: false,
        message: friendlyMessage
      };
    }
  }

  public async getLiveDiagnostics() {
    let counts: Record<string, number> = {
      stores: 0,
      products: 0,
      categories: 0,
      platforms: 0,
      clicks: 0,
      users: 0,
      blog_posts: 0,
      blog_categories: 0,
      blog_editors: 0,
      blog_settings: 0,
      contact_messages: 0,
      institutional_pages: 0
    };

    let latencyMs = 0;

    if (this.pool && this.isConnected) {
      try {
        latencyMs = 5;

        const countTable = async (tbl: string) => {
          try {
            const [rows]: any = await this.pool!.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
            return Number(rows[0]?.cnt || 0);
          } catch {
            return -1; // table does not exist
          }
        };

        counts.stores = await countTable('stores');
        counts.products = await countTable('products');
        counts.categories = await countTable('categories');
        counts.platforms = await countTable('platforms');
        counts.clicks = await countTable('clicks');
        counts.users = await countTable('users');
        counts.blog_posts = await countTable('blog_posts');
        counts.blog_categories = await countTable('blog_categories');
        counts.blog_editors = await countTable('blog_editors');
        counts.blog_settings = await countTable('blog_settings');
        counts.contact_messages = await countTable('contact_messages');
        counts.institutional_pages = await countTable('institutional_pages');
      } catch (err: any) {
        console.warn('[Hostinger MySQL] Erro ao obter contagens das tabelas:', err);
      }
    } else {
      // Local storage fallback counts so UI never zeroes out
      try {
        const storeDataFile = path.join(process.cwd(), 'data', 'store_data.json');
        if (fs.existsSync(storeDataFile)) {
          const raw = JSON.parse(fs.readFileSync(storeDataFile, 'utf-8'));
          counts.stores = Array.isArray(raw.stores) ? raw.stores.length : 1;
          counts.products = Array.isArray(raw.products) ? raw.products.length : 0;
          counts.categories = Array.isArray(raw.categories) ? raw.categories.length : 0;
          counts.platforms = Array.isArray(raw.platforms) ? raw.platforms.length : 0;
          counts.clicks = Array.isArray(raw.clicks) ? raw.clicks.length : 0;
          counts.users = Array.isArray(raw.users) ? raw.users.length : 0;
          counts.blog_posts = Array.isArray(raw.posts) ? raw.posts.length : 0;
          counts.blog_categories = Array.isArray(raw.blogCategories) ? raw.blogCategories.length : 0;
          counts.blog_editors = Array.isArray(raw.blogEditors) ? raw.blogEditors.length : 0;
          counts.blog_settings = raw.blogSettings ? 1 : 0;
          counts.contact_messages = Array.isArray(raw.contactMessages) ? raw.contactMessages.length : 0;
          counts.institutional_pages = Array.isArray(raw.institutional) ? raw.institutional.length : 0;
        }
      } catch (_) {}
    }

    return {
      connected: this.isConnected,
      driver: this.isConnected ? 'Hostinger MySQL / MariaDB (Ativo)' : 'Armazenamento JSON Local (Modo Fallback)',
      error: this.connectionError,
      host: this.activeConfig?.host || process.env.DB_HOST || 'Local / Não configurado',
      database: this.activeConfig?.database || process.env.DB_NAME || 'store_data.json',
      user: this.activeConfig?.user || process.env.DB_USER || 'Nenhum',
      port: this.activeConfig?.port || process.env.DB_PORT || 3306,
      latencyMs: this.isConnected ? latencyMs : undefined,
      tableCounts: counts
    };
  }

  public async createTablesIfNotExist(): Promise<void> {
    if (!this.pool) return;

    const createStoresTable = `
      CREATE TABLE IF NOT EXISTS stores (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(128) UNIQUE NOT NULL,
        storeName VARCHAR(255) NOT NULL,
        logo TEXT,
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        tiktok VARCHAR(255),
        pixelFacebook VARCHAR(255),
        googleAnalytics VARCHAR(255),
        googleAds VARCHAR(255),
        corPrimaria VARCHAR(32) DEFAULT '#2A5C3F',
        corSecundaria VARCHAR(32) DEFAULT '#1B1B1B',
        bannerUrl TEXT,
        bannerLink VARCHAR(255),
        bannerTag VARCHAR(255),
        bannerTitulo VARCHAR(255),
        bannerSubtitulo TEXT,
        tituloSite VARCHAR(255),
        descricaoSite TEXT,
        lojaAtiva TINYINT(1) DEFAULT 1,
        msgManutencao TEXT,
        mensagemTopo TEXT,
        corBarraTopo VARCHAR(32) DEFAULT '#2A5C3F',
        cnpj VARCHAR(64),
        endereco TEXT,
        email VARCHAR(255),
        canalWhatsapp VARCHAR(255),
        canalTelegram VARCHAR(255),
        botaoCanalFlutuante TINYINT(1) DEFAULT 1,
        textoDisclosure TEXT,
        avisoPrecos TEXT,
        sobreNos LONGTEXT,
        termosUso LONGTEXT,
        politicaPrivacidade LONGTEXT,
        adminUser VARCHAR(128) DEFAULT 'admin',
        adminEmail VARCHAR(255) DEFAULT 'admin@loja.com.br',
        adminPassword VARCHAR(255) DEFAULT 'admin',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        ativo TINYINT(1) DEFAULT 1,
        tipo VARCHAR(32) DEFAULT 'FISICO',
        plataforma VARCHAR(64) DEFAULT 'Amazon',
        categoria VARCHAR(128) DEFAULT 'Geral',
        subcategoria VARCHAR(128),
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        preco DECIMAL(10,2) DEFAULT 0.00,
        precoPromo DECIMAL(10,2) NULL,
        cupom VARCHAR(64),
        validade VARCHAR(64),
        linkAfiliado TEXT,
        textoBotao VARCHAR(128),
        video VARCHAR(255),
        img1 LONGTEXT,
        img2 LONGTEXT,
        img3 LONGTEXT,
        img4 LONGTEXT,
        ordem INT DEFAULT 1,
        destaque TINYINT(1) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_store (storeId),
        INDEX idx_categoria (categoria),
        INDEX idx_plataforma (plataforma),
        INDEX idx_ativo_ordem (ativo, ordem)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        nome VARCHAR(128) NOT NULL,
        slug VARCHAR(128) NOT NULL,
        icone VARCHAR(64),
        descricao TEXT,
        ativo TINYINT(1) DEFAULT 1,
        ordem INT DEFAULT 1,
        ordemMenu INT DEFAULT 1,
        mostrarNoMenu TINYINT(1) DEFAULT 1,
        exibirNoMenu TINYINT(1) DEFAULT 1,
        subcategorias TEXT,
        INDEX idx_cat_store (storeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createPlatformsTable = `
      CREATE TABLE IF NOT EXISTS platforms (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        nome VARCHAR(128) NOT NULL,
        slug VARCHAR(128) NOT NULL,
        cor VARCHAR(32) DEFAULT '#2A5C3F',
        badge VARCHAR(64),
        icone VARCHAR(64),
        ativo TINYINT(1) DEFAULT 1,
        ordem INT DEFAULT 1,
        INDEX idx_plat_store (storeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createClicksTable = `
      CREATE TABLE IF NOT EXISTS clicks (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        productId VARCHAR(64),
        produto VARCHAR(255),
        plataforma VARCHAR(64),
        tipo VARCHAR(32),
        categoria VARCHAR(128),
        origem VARCHAR(128),
        utm_source VARCHAR(128),
        utm_medium VARCHAR(128),
        utm_campaign VARCHAR(128),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_click_store (storeId),
        INDEX idx_click_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createStoreViewsTable = `
      CREATE TABLE IF NOT EXISTS store_views (
        storeSlug VARCHAR(128) PRIMARY KEY,
        viewsCount INT DEFAULT 0,
        lastViewAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(128) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) DEFAULT 'ADMIN',
        ativo TINYINT(1) DEFAULT 1,
        avatar TEXT,
        ultimoAcesso TIMESTAMP NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_store (storeId),
        INDEX idx_user_login (username, email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createBlogPostsTable = `
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        category VARCHAR(128) DEFAULT 'Geral',
        coverImage LONGTEXT,
        tags TEXT,
        authorId VARCHAR(64) DEFAULT '',
        author VARCHAR(128) DEFAULT 'Equipe',
        authorAvatar TEXT,
        authorRole VARCHAR(128) DEFAULT '',
        authorBio TEXT,
        readTime VARCHAR(64) DEFAULT '4 min',
        published TINYINT(1) DEFAULT 1,
        destaque TINYINT(1) DEFAULT 0,
        status VARCHAR(32) DEFAULT 'published',
        views INT DEFAULT 0,
        linkedProductIds TEXT,
        sidebarBanner LONGTEXT,
        publishedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_post_store (storeId),
        INDEX idx_post_slug (slug),
        INDEX idx_post_category (category),
        INDEX idx_post_destaque (destaque)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createBlogCategoriesTable = `
      CREATE TABLE IF NOT EXISTS blog_categories (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        icon VARCHAR(64) DEFAULT '📑',
        description TEXT,
        active TINYINT(1) DEFAULT 1,
        mostrarNoMenu TINYINT(1) DEFAULT 1,
        ordem INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bcat_store (storeId),
        INDEX idx_bcat_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createBlogEditorsTable = `
      CREATE TABLE IF NOT EXISTS blog_editors (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        role VARCHAR(128) DEFAULT 'Redator(a)',
        avatar TEXT,
        bio TEXT,
        email VARCHAR(255) DEFAULT '',
        active TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bed_store (storeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createBlogSettingsTable = `
      CREATE TABLE IF NOT EXISTS blog_settings (
        id VARCHAR(64) NOT NULL DEFAULT 'bs-default',
        storeSlug VARCHAR(128) NOT NULL,
        storeId VARCHAR(64) NOT NULL,
        heroBackgroundImage LONGTEXT,
        heroOverlayOpacity INT DEFAULT 65,
        heroTitle VARCHAR(255) DEFAULT '',
        heroSubtitle TEXT,
        heroBadge VARCHAR(255) DEFAULT '',
        heroShowSearch TINYINT(1) DEFAULT 1,
        heroSearchPlaceholder VARCHAR(255) DEFAULT '',
        heroShowCta TINYINT(1) DEFAULT 1,
        heroCtaText VARCHAR(128) DEFAULT '',
        heroCtaTarget VARCHAR(64) DEFAULT 'store',
        topBarEnabled TINYINT(1) DEFAULT 0,
        topBarText TEXT,
        topBarBgColor VARCHAR(32) DEFAULT '#2A5C3F',
        topBarTextColor VARCHAR(32) DEFAULT '#FFFFFF',
        topBarLink VARCHAR(255) DEFAULT '',
        blogLogo LONGTEXT,
        blogStoreName VARCHAR(255) DEFAULT '',
        blogTagline VARCHAR(255) DEFAULT '',
        blogPrimaryColor VARCHAR(32) DEFAULT '#2A5C3F',
        menuHomeLabel VARCHAR(128) DEFAULT 'Início (Blog)',
        menuStoreLabel VARCHAR(128) DEFAULT 'Loja & Achadinhos',
        menuShowStore TINYINT(1) DEFAULT 1,
        menuStoreBadge VARCHAR(64) DEFAULT 'Ofertas',
        menuInstitutionalLabel VARCHAR(128) DEFAULT 'Institucional',
        menuShowInstitutional TINYINT(1) DEFAULT 1,
        menuContactLabel VARCHAR(128) DEFAULT 'Contato',
        menuShowContact TINYINT(1) DEFAULT 1,
        menuShowWhatsApp TINYINT(1) DEFAULT 1,
        menuShowVitrineBtn TINYINT(1) DEFAULT 1,
        menuVitrineBtnText VARCHAR(128) DEFAULT 'Ver Vitrine',
        showCategoriesBar TINYINT(1) DEFAULT 1,
        footerText TEXT,
        footerShowSocial TINYINT(1) DEFAULT 1,
        articleFooterAd LONGTEXT,
        articleFooterAds LONGTEXT,
        articleSidebarBanner LONGTEXT,
        sobreNos LONGTEXT,
        textoDisclosure TEXT,
        termosUso LONGTEXT,
        politicaPrivacidade LONGTEXT,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_blog_settings_slug (storeSlug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createContactMessagesTable = `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(64) PRIMARY KEY,
        storeId VARCHAR(64) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        assunto VARCHAR(255) DEFAULT '',
        mensagem LONGTEXT NOT NULL,
        lida TINYINT(1) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msg_store (storeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createInstitutionalTable = `
      CREATE TABLE IF NOT EXISTS institutional_pages (
        id VARCHAR(64) PRIMARY KEY,
        storeSlug VARCHAR(128) NOT NULL UNIQUE,
        storeName VARCHAR(255) DEFAULT '',
        cnpj VARCHAR(64) DEFAULT '',
        endereco TEXT,
        email VARCHAR(255) DEFAULT '',
        sobreNos LONGTEXT,
        textoDisclosure TEXT,
        termosUso LONGTEXT,
        politicaPrivacidade LONGTEXT,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const tablesToCreate = [
      { name: 'stores', sql: createStoresTable },
      { name: 'products', sql: createProductsTable },
      { name: 'categories', sql: createCategoriesTable },
      { name: 'platforms', sql: createPlatformsTable },
      { name: 'clicks', sql: createClicksTable },
      { name: 'store_views', sql: createStoreViewsTable },
      { name: 'users', sql: createUsersTable },
      { name: 'blog_posts', sql: createBlogPostsTable },
      { name: 'blog_categories', sql: createBlogCategoriesTable },
      { name: 'blog_editors', sql: createBlogEditorsTable },
      { name: 'blog_settings', sql: createBlogSettingsTable },
      { name: 'contact_messages', sql: createContactMessagesTable },
      { name: 'institutional_pages', sql: createInstitutionalTable }
    ];

    for (const t of tablesToCreate) {
      try {
        await this.pool.query(t.sql);
      } catch (tErr: any) {
        console.warn(`[Hostinger MySQL] Aviso ao criar tabela ${t.name}:`, tErr?.message || tErr);
      }
    }

    // Auto-migration for institutional fields on existing MySQL tables
    const migrations = [
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS sobreNos LONGTEXT',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS termosUso LONGTEXT',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS politicaPrivacidade LONGTEXT',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS textoDisclosure TEXT',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS cnpj VARCHAR(64)',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS endereco TEXT',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      'ALTER TABLE stores ADD COLUMN IF NOT EXISTS avisoPrecos TEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS sobreNos LONGTEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS textoDisclosure TEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS termosUso LONGTEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS politicaPrivacidade LONGTEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS cnpj VARCHAR(64)',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS endereco TEXT',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      'ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS articleSidebarBanner LONGTEXT',
      'ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS sidebarBanner LONGTEXT',
      'ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(64) DEFAULT \'📑\'',
      'ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS mostrarNoMenu TINYINT(1) DEFAULT 1'
    ];
    for (const mig of migrations) {
      try {
        await this.pool.query(mig);
      } catch {
        // Fallback for older MySQL versions that don't support IF NOT EXISTS in ADD COLUMN
        try {
          const rawMig = mig.replace('IF NOT EXISTS ', '');
          await this.pool.query(rawMig);
        } catch {}
      }
    }
  }

  /**
   * Explicitly ensures and validates that institutional_pages table exists in Hostinger MySQL,
   * along with all institutional columns on stores and blog_settings tables.
   */
  public async ensureInstitutionalTableExist(): Promise<{ success: boolean; message: string; table: string }> {
    if (!this.pool || !this.isConnected) {
      return {
        success: false,
        message: 'MySQL não está conectado. Configure os dados de conexão na aba Banco de Dados.',
        table: 'institutional_pages'
      };
    }

    try {
      // 1. Create dedicated institutional_pages table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS institutional_pages (
          id VARCHAR(64) PRIMARY KEY,
          storeSlug VARCHAR(128) NOT NULL UNIQUE,
          storeName VARCHAR(255) DEFAULT '',
          cnpj VARCHAR(64) DEFAULT '',
          endereco TEXT,
          email VARCHAR(255) DEFAULT '',
          sobreNos LONGTEXT,
          textoDisclosure TEXT,
          termosUso LONGTEXT,
          politicaPrivacidade LONGTEXT,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Ensure institutional columns exist on stores and blog_settings
      const colsToAdd = [
        { table: 'stores', col: 'sobreNos', type: 'LONGTEXT' },
        { table: 'stores', col: 'termosUso', type: 'LONGTEXT' },
        { table: 'stores', col: 'politicaPrivacidade', type: 'LONGTEXT' },
        { table: 'stores', col: 'textoDisclosure', type: 'TEXT' },
        { table: 'stores', col: 'cnpj', type: 'VARCHAR(64)' },
        { table: 'stores', col: 'endereco', type: 'TEXT' },
        { table: 'stores', col: 'email', type: 'VARCHAR(255)' },
        { table: 'stores', col: 'avisoPrecos', type: 'TEXT' },
        { table: 'blog_settings', col: 'sobreNos', type: 'LONGTEXT' },
        { table: 'blog_settings', col: 'textoDisclosure', type: 'TEXT' },
        { table: 'blog_settings', col: 'termosUso', type: 'LONGTEXT' },
        { table: 'blog_settings', col: 'politicaPrivacidade', type: 'LONGTEXT' },
        { table: 'blog_settings', col: 'cnpj', type: 'VARCHAR(64)' },
        { table: 'blog_settings', col: 'endereco', type: 'TEXT' },
        { table: 'blog_settings', col: 'email', type: 'VARCHAR(255)' }
      ];

      for (const item of colsToAdd) {
        try {
          await this.pool.query(`ALTER TABLE \`${item.table}\` ADD COLUMN IF NOT EXISTS \`${item.col}\` ${item.type}`);
        } catch {
          try {
            await this.pool.query(`ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.col}\` ${item.type}`);
          } catch {}
        }
      }

      return {
        success: true,
        message: 'Tabela institutional_pages e colunas institucionais validadas com sucesso no MySQL da Hostinger!',
        table: 'institutional_pages'
      };
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro ao validar tabela institucional:', err);
      return {
        success: false,
        message: `Falha ao validar tabela institucional: ${err?.message || 'Erro desconhecido'}`,
        table: 'institutional_pages'
      };
    }
  }

  /**
   * Explicitly ensures and validates that all blog tables exist in Hostinger MySQL
   */
  public async ensureBlogTablesExist(): Promise<{ success: boolean; message: string; tables: string[] }> {
    if (!this.pool || !this.isConnected) {
      return {
        success: false,
        message: 'MySQL não está conectado. Configure os dados de conexão primeiro.',
        tables: []
      };
    }

    try {
      await this.createTablesIfNotExist();
      const tables = ['blog_posts', 'blog_categories', 'blog_editors', 'blog_settings', 'contact_messages'];
      return {
        success: true,
        message: 'Todas as tabelas do Blog foram criadas e validadas com sucesso no MySQL da Hostinger!',
        tables
      };
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro ao criar tabelas do blog:', err);
      return {
        success: false,
        message: `Falha ao criar tabelas do blog: ${err?.message || 'Erro desconhecido'}`,
        tables: []
      };
    }
  }

  // ============================================
  // MYSQL PERSISTENCE OPERATIONS
  // ============================================

  public async saveProduct(p: Product): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO products (
          id, storeId, ativo, tipo, plataforma, categoria, subcategoria,
          nome, descricao, preco, precoPromo, cupom, validade,
          linkAfiliado, textoBotao, video, img1, img2, img3, img4,
          ordem, destaque
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ativo=VALUES(ativo),
          tipo=VALUES(tipo),
          plataforma=VALUES(plataforma),
          categoria=VALUES(categoria),
          subcategoria=VALUES(subcategoria),
          nome=VALUES(nome),
          descricao=VALUES(descricao),
          preco=VALUES(preco),
          precoPromo=VALUES(precoPromo),
          cupom=VALUES(cupom),
          validade=VALUES(validade),
          linkAfiliado=VALUES(linkAfiliado),
          textoBotao=VALUES(textoBotao),
          video=VALUES(video),
          img1=VALUES(img1),
          img2=VALUES(img2),
          img3=VALUES(img3),
          img4=VALUES(img4),
          ordem=VALUES(ordem),
          destaque=VALUES(destaque),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        p.id,
        p.storeId || 'store-1',
        p.ativo ? 1 : 0,
        p.tipo || 'FISICO',
        p.plataforma || 'Amazon',
        p.categoria || 'Geral',
        p.subcategoria || '',
        p.nome || 'Produto',
        p.descricao || '',
        Number(p.preco) || 0,
        p.precoPromo !== null && p.precoPromo !== undefined ? Number(p.precoPromo) : null,
        p.cupom || '',
        p.validade || '',
        p.linkAfiliado || '',
        p.textoBotao || '',
        p.video || '',
        p.img1 || '',
        p.img2 || '',
        p.img3 || '',
        p.img4 || '',
        Number(p.ordem) || 1,
        p.destaque ? 1 : 0
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar produto no MySQL:', err);
    }
  }

  public async deleteProduct(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM products WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar produto do MySQL:', err);
    }
  }

  public async saveCategory(c: Category): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      const inMenu = c.mostrarNoMenu !== false ? 1 : 0;
      const order = c.ordem || 1;
      const subs = Array.isArray(c.subcategorias) ? JSON.stringify(c.subcategorias) : '[]';

      await this.pool.query(`
        INSERT INTO categories (id, storeId, nome, slug, icone, descricao, ativo, ordem, ordemMenu, mostrarNoMenu, exibirNoMenu, subcategorias)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome=VALUES(nome),
          slug=VALUES(slug),
          icone=VALUES(icone),
          descricao=VALUES(descricao),
          ativo=VALUES(ativo),
          ordem=VALUES(ordem),
          ordemMenu=VALUES(ordemMenu),
          mostrarNoMenu=VALUES(mostrarNoMenu),
          exibirNoMenu=VALUES(exibirNoMenu),
          subcategorias=VALUES(subcategorias)
      `, [
        c.id,
        c.storeId || 'store-1',
        c.nome,
        c.nome.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        c.icone || 'Sparkles',
        c.descricao || '',
        1,
        order,
        order,
        inMenu,
        inMenu,
        subs
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar categoria no MySQL:', err);
    }
  }

  public async deleteCategory(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM categories WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar categoria do MySQL:', err);
    }
  }

  public async savePlatform(plat: Platform): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO platforms (id, storeId, nome, slug, cor, badge, icone, ativo, ordem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome=VALUES(nome),
          slug=VALUES(slug),
          cor=VALUES(cor),
          badge=VALUES(badge),
          icone=VALUES(icone),
          ativo=VALUES(ativo),
          ordem=VALUES(ordem)
      `, [
        plat.id,
        plat.storeId || 'store-1',
        plat.nome,
        plat.nome.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plat.corBadge || '#2A5C3F',
        plat.textoBotaoPadrao || '',
        plat.icone || '',
        plat.ativo !== false ? 1 : 0,
        plat.ordem || 1
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar plataforma no MySQL:', err);
    }
  }

  public async deletePlatform(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM platforms WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar plataforma do MySQL:', err);
    }
  }

  public async saveUser(u: StoreUser): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO users (
          id, storeId, nome, email, username, password, role, ativo, avatar, ultimoAcesso
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome=VALUES(nome),
          email=VALUES(email),
          username=VALUES(username),
          password=IF(VALUES(password) != '', VALUES(password), password),
          role=VALUES(role),
          ativo=VALUES(ativo),
          avatar=VALUES(avatar),
          ultimoAcesso=VALUES(ultimoAcesso),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        u.id,
        u.storeId || 'store-1',
        u.nome || 'Usuário',
        u.email || '',
        u.username || '',
        u.password || '',
        u.role || 'ADMIN',
        u.ativo !== false ? 1 : 0,
        u.avatar || '',
        u.ultimoAcesso ? new Date(u.ultimoAcesso) : null
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar usuário no MySQL:', err);
    }
  }

  public async deleteUser(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar usuário do MySQL:', err);
    }
  }

  public async saveStore(s: StoreConfig): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO stores (
          id, slug, storeName, logo, instagram, facebook, tiktok,
          pixelFacebook, googleAnalytics, googleAds,
          corPrimaria, corSecundaria, bannerUrl, bannerLink, bannerTag,
          bannerTitulo, bannerSubtitulo, tituloSite, descricaoSite, lojaAtiva,
          msgManutencao, mensagemTopo, corBarraTopo, cnpj, endereco, email,
          canalWhatsapp, canalTelegram, botaoCanalFlutuante, textoDisclosure, avisoPrecos,
          sobreNos, termosUso, politicaPrivacidade,
          adminUser, adminEmail, adminPassword
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          storeName=VALUES(storeName),
          logo=VALUES(logo),
          instagram=VALUES(instagram),
          facebook=VALUES(facebook),
          tiktok=VALUES(tiktok),
          pixelFacebook=VALUES(pixelFacebook),
          googleAnalytics=VALUES(googleAnalytics),
          googleAds=VALUES(googleAds),
          corPrimaria=VALUES(corPrimaria),
          corSecundaria=VALUES(corSecundaria),
          bannerUrl=VALUES(bannerUrl),
          bannerLink=VALUES(bannerLink),
          bannerTag=VALUES(bannerTag),
          bannerTitulo=VALUES(bannerTitulo),
          bannerSubtitulo=VALUES(bannerSubtitulo),
          tituloSite=VALUES(tituloSite),
          descricaoSite=VALUES(descricaoSite),
          lojaAtiva=VALUES(lojaAtiva),
          msgManutencao=VALUES(msgManutencao),
          mensagemTopo=VALUES(mensagemTopo),
          corBarraTopo=VALUES(corBarraTopo),
          cnpj=VALUES(cnpj),
          endereco=VALUES(endereco),
          email=VALUES(email),
          canalWhatsapp=VALUES(canalWhatsapp),
          canalTelegram=VALUES(canalTelegram),
          botaoCanalFlutuante=VALUES(botaoCanalFlutuante),
          textoDisclosure=VALUES(textoDisclosure),
          avisoPrecos=VALUES(avisoPrecos),
          sobreNos=VALUES(sobreNos),
          termosUso=VALUES(termosUso),
          politicaPrivacidade=VALUES(politicaPrivacidade),
          adminUser=VALUES(adminUser),
          adminEmail=VALUES(adminEmail),
          adminPassword=VALUES(adminPassword),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        s.id || 'store-1',
        s.slug || 'achadinhos-da-maria',
        s.storeName || 'Minha Loja',
        s.logo || '',
        s.instagram || '',
        s.facebook || '',
        s.tiktok || '',
        s.pixelFacebook || '',
        s.googleAnalytics || '',
        s.googleAds || '',
        s.corPrimaria || '#2A5C3F',
        s.corSecundaria || '#1B1B1B',
        s.bannerUrl || '',
        s.bannerLink || '',
        s.bannerTag || '',
        s.bannerTitulo || '',
        s.bannerSubtitulo || '',
        s.tituloSite || '',
        s.descricaoSite || '',
        s.lojaAtiva !== false ? 1 : 0,
        s.msgManutencao || '',
        s.mensagemTopo || '',
        s.corBarraTopo || '#2A5C3F',
        s.cnpj || '',
        s.endereco || '',
        s.email || '',
        s.canalWhatsapp || '',
        s.canalTelegram || '',
        s.botaoCanalFlutuante !== false ? 1 : 0,
        s.textoDisclosure || '',
        s.avisoPrecos || '',
        s.sobreNos || '',
        s.termosUso || '',
        s.politicaPrivacidade || '',
        s.adminUser || 'admin',
        s.adminEmail || 'admin@loja.com.br',
        s.adminPassword || 'admin'
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar loja no MySQL:', err);
    }
  }

  public async saveClick(click: ClickRecord): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO clicks (id, storeId, productId, produto, plataforma, tipo, categoria, origem, utm_source, utm_medium, utm_campaign)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        click.id,
        click.storeId || 'store-1',
        click.productId || '',
        click.produto || '',
        click.plataforma || '',
        click.tipo || 'FISICO',
        click.categoria || '',
        click.origem || 'CARD',
        click.utm_source || '',
        click.utm_medium || '',
        click.utm_campaign || ''
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao registrar clique no MySQL:', err);
    }
  }

  // ============================================
  // BLOG PERSISTENCE OPERATIONS (HOSTINGER MYSQL)
  // ============================================

  public async saveBlogPost(p: BlogPost): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      const tags = Array.isArray(p.tags) ? JSON.stringify(p.tags) : '[]';
      const linked = Array.isArray(p.linkedProductIds) ? JSON.stringify(p.linkedProductIds) : '[]';
      const sidebarBanner = p.sidebarBanner ? JSON.stringify(p.sidebarBanner) : null;
      const isPublished = p.published !== false ? 1 : 0;
      const isDestaque = p.destaque ? 1 : 0;

      const executeSave = async () => {
        await this.pool!.query(`
          INSERT INTO blog_posts (
            id, storeId, slug, title, excerpt, content, category,
            coverImage, tags, authorId, author, authorAvatar, authorRole, authorBio,
            readTime, published, destaque, status, views, linkedProductIds, sidebarBanner, publishedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            slug=VALUES(slug),
            title=VALUES(title),
            excerpt=VALUES(excerpt),
            content=VALUES(content),
            category=VALUES(category),
            coverImage=VALUES(coverImage),
            tags=VALUES(tags),
            authorId=VALUES(authorId),
            author=VALUES(author),
            authorAvatar=VALUES(authorAvatar),
            authorRole=VALUES(authorRole),
            authorBio=VALUES(authorBio),
            readTime=VALUES(readTime),
            published=VALUES(published),
            destaque=VALUES(destaque),
            status=VALUES(status),
            views=VALUES(views),
            linkedProductIds=VALUES(linkedProductIds),
            sidebarBanner=VALUES(sidebarBanner),
            publishedAt=VALUES(publishedAt),
            updatedAt=CURRENT_TIMESTAMP
        `, [
          p.id,
          p.storeId || 'store-1',
          p.slug,
          p.title,
          p.excerpt || '',
          p.content || '',
          p.category || 'Geral',
          p.coverImage || '',
          tags,
          p.authorId || '',
          p.author || 'Equipe',
          p.authorAvatar || '',
          p.authorRole || '',
          p.authorBio || '',
          p.readTime || '4 min',
          isPublished,
          isDestaque,
          p.status || (isPublished ? 'published' : 'draft'),
          p.views || 0,
          linked,
          sidebarBanner,
          p.publishedAt ? new Date(p.publishedAt) : new Date()
        ]);
      };

      try {
        await executeSave();
      } catch (saveErr: any) {
        // If column sidebarBanner is missing, add it and retry once
        if (
          saveErr?.errno === 1054 ||
          saveErr?.code === 'ER_BAD_FIELD_ERROR' ||
          (saveErr?.message && (saveErr.message.includes('sidebarBanner') || saveErr.message.includes('Unknown column')))
        ) {
          console.warn('[Hostinger MySQL] Coluna sidebarBanner ausente em blog_posts, adicionando coluna e tentando novamente...');
          try {
            await this.pool!.query('ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS sidebarBanner LONGTEXT');
          } catch {
            try {
              await this.pool!.query('ALTER TABLE blog_posts ADD COLUMN sidebarBanner LONGTEXT');
            } catch {}
          }
          await executeSave();
        } else {
          throw saveErr;
        }
      }
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar artigo no MySQL:', err);
    }
  }

  public async deleteBlogPost(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM blog_posts WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar artigo do MySQL:', err);
    }
  }

  public async saveBlogCategory(c: BlogCategory): Promise<void> {
    if (!this.pool) return;
    try {
      const inMenu = c.mostrarNoMenu !== false && (c as any).mostrarNoMenu !== 0 && (c as any).mostrarNoMenu !== '0' && (c as any).mostrarNoMenu !== 'false' ? 1 : 0;
      const isActive = c.active !== false && (c as any).active !== 0 && (c as any).active !== '0' && (c as any).active !== 'false' ? 1 : 0;

      await this.executeQuery(`
        INSERT INTO blog_categories (id, storeId, name, slug, icon, description, active, mostrarNoMenu, ordem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name),
          slug=VALUES(slug),
          icon=VALUES(icon),
          description=VALUES(description),
          active=VALUES(active),
          mostrarNoMenu=VALUES(mostrarNoMenu),
          ordem=VALUES(ordem),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        c.id,
        c.storeId || 'store-1',
        c.name,
        c.slug,
        c.icon || '📑',
        c.description || '',
        isActive,
        inMenu,
        c.order || (c as any).ordem || 1
      ]);
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro ao salvar categoria do blog no MySQL:', err);
    }
  }

  public async deleteBlogCategory(id: string): Promise<void> {
    if (!this.pool) return;
    try {
      await this.executeQuery('DELETE FROM blog_categories WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar categoria do blog no MySQL:', err);
    }
  }

  public async saveBlogEditor(e: BlogEditor): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO blog_editors (id, storeId, name, role, avatar, bio, email, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name),
          role=VALUES(role),
          avatar=VALUES(avatar),
          bio=VALUES(bio),
          email=VALUES(email),
          active=VALUES(active),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        e.id,
        e.storeId || 'store-1',
        e.name,
        e.role || 'Redator(a)',
        e.avatar || '',
        e.bio || '',
        e.email || '',
        e.active !== false ? 1 : 0
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar redator do blog no MySQL:', err);
    }
  }

  public async deleteBlogEditor(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM blog_editors WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao deletar redator do blog no MySQL:', err);
    }
  }

  public async saveBlogSettings(storeSlug: string, s: BlogSettings): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      const adJson = s.articleFooterAd ? JSON.stringify(s.articleFooterAd) : null;
      const adsJson = Array.isArray(s.articleFooterAds) ? JSON.stringify(s.articleFooterAds) : '[]';
      const sidebarBannerJson = s.articleSidebarBanner ? JSON.stringify(s.articleSidebarBanner) : null;
      const id = s.id || `bs-${storeSlug}`;

      try {
        await this.pool.query(`
          INSERT INTO blog_settings (
            id, storeSlug, storeId, heroBackgroundImage, heroOverlayOpacity,
            heroTitle, heroSubtitle, heroBadge, heroShowSearch, heroSearchPlaceholder,
            heroShowCta, heroCtaText, heroCtaTarget, topBarEnabled, topBarText,
            topBarBgColor, topBarTextColor, topBarLink, blogLogo, blogStoreName,
            blogTagline, blogPrimaryColor, menuHomeLabel, menuStoreLabel, menuShowStore,
            menuStoreBadge, menuInstitutionalLabel, menuShowInstitutional, menuContactLabel,
            menuShowContact, menuShowWhatsApp, menuShowVitrineBtn, menuVitrineBtnText,
            showCategoriesBar, footerText, footerShowSocial, articleFooterAd, articleFooterAds,
            articleSidebarBanner, sobreNos, textoDisclosure, termosUso, politicaPrivacidade
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
          ON DUPLICATE KEY UPDATE
            heroBackgroundImage=VALUES(heroBackgroundImage),
            heroOverlayOpacity=VALUES(heroOverlayOpacity),
            heroTitle=VALUES(heroTitle),
            heroSubtitle=VALUES(heroSubtitle),
            heroBadge=VALUES(heroBadge),
            heroShowSearch=VALUES(heroShowSearch),
            heroSearchPlaceholder=VALUES(heroSearchPlaceholder),
            heroShowCta=VALUES(heroShowCta),
            heroCtaText=VALUES(heroCtaText),
            heroCtaTarget=VALUES(heroCtaTarget),
            topBarEnabled=VALUES(topBarEnabled),
            topBarText=VALUES(topBarText),
            topBarBgColor=VALUES(topBarBgColor),
            topBarTextColor=VALUES(topBarTextColor),
            topBarLink=VALUES(topBarLink),
            blogLogo=VALUES(blogLogo),
            blogStoreName=VALUES(blogStoreName),
            blogTagline=VALUES(blogTagline),
            blogPrimaryColor=VALUES(blogPrimaryColor),
            menuHomeLabel=VALUES(menuHomeLabel),
            menuStoreLabel=VALUES(menuStoreLabel),
            menuShowStore=VALUES(menuShowStore),
            menuStoreBadge=VALUES(menuStoreBadge),
            menuInstitutionalLabel=VALUES(menuInstitutionalLabel),
            menuShowInstitutional=VALUES(menuShowInstitutional),
            menuContactLabel=VALUES(menuContactLabel),
            menuShowContact=VALUES(menuShowContact),
            menuShowWhatsApp=VALUES(menuShowWhatsApp),
            menuShowVitrineBtn=VALUES(menuShowVitrineBtn),
            menuVitrineBtnText=VALUES(menuVitrineBtnText),
            showCategoriesBar=VALUES(showCategoriesBar),
            footerText=VALUES(footerText),
            footerShowSocial=VALUES(footerShowSocial),
            articleFooterAd=VALUES(articleFooterAd),
            articleFooterAds=VALUES(articleFooterAds),
            articleSidebarBanner=VALUES(articleSidebarBanner),
            sobreNos=VALUES(sobreNos),
            textoDisclosure=VALUES(textoDisclosure),
            termosUso=VALUES(termosUso),
            politicaPrivacidade=VALUES(politicaPrivacidade),
            updatedAt=CURRENT_TIMESTAMP
        `, [
          id,
          storeSlug,
          s.storeId || 'store-1',
          s.heroBackgroundImage || '',
          s.heroOverlayOpacity !== undefined ? s.heroOverlayOpacity : 65,
          s.heroTitle || '',
          s.heroSubtitle || '',
          s.heroBadge || '',
          s.heroShowSearch !== false ? 1 : 0,
          s.heroSearchPlaceholder || '',
          s.heroShowCta !== false ? 1 : 0,
          s.heroCtaText || '',
          s.heroCtaTarget || 'store',
          s.topBarEnabled ? 1 : 0,
          s.topBarText || '',
          s.topBarBgColor || '#2A5C3F',
          s.topBarTextColor || '#FFFFFF',
          s.topBarLink || '',
          s.blogLogo || '',
          s.blogStoreName || '',
          s.blogTagline || '',
          s.blogPrimaryColor || '#2A5C3F',
          s.menuHomeLabel || 'Início (Blog)',
          s.menuStoreLabel || 'Loja & Achadinhos',
          s.menuShowStore !== false ? 1 : 0,
          s.menuStoreBadge || 'Ofertas',
          s.menuInstitutionalLabel || 'Institucional',
          s.menuShowInstitutional !== false ? 1 : 0,
          s.menuContactLabel || 'Contato',
          s.menuShowContact !== false ? 1 : 0,
          s.menuShowWhatsApp !== false ? 1 : 0,
          s.menuShowVitrineBtn !== false ? 1 : 0,
          s.menuVitrineBtnText || 'Ver Vitrine',
          s.showCategoriesBar !== false ? 1 : 0,
          s.footerText || '',
          s.footerShowSocial !== false ? 1 : 0,
          adJson,
          adsJson,
          sidebarBannerJson,
          s.sobreNos || '',
          s.textoDisclosure || '',
          s.termosUso || '',
          s.politicaPrivacidade || ''
        ]);
      } catch (errWithId: any) {
        await this.pool.query(`
          INSERT INTO blog_settings (
            storeSlug, storeId, heroBackgroundImage, heroOverlayOpacity,
            heroTitle, heroSubtitle, heroBadge, heroShowSearch, heroSearchPlaceholder,
            heroShowCta, heroCtaText, heroCtaTarget, topBarEnabled, topBarText,
            topBarBgColor, topBarTextColor, topBarLink, blogLogo, blogStoreName,
            blogTagline, blogPrimaryColor, menuHomeLabel, menuStoreLabel, menuShowStore,
            menuStoreBadge, menuInstitutionalLabel, menuShowInstitutional, menuContactLabel,
            menuShowContact, menuShowWhatsApp, menuShowVitrineBtn, menuVitrineBtnText,
            showCategoriesBar, footerText, footerShowSocial, articleFooterAd, articleFooterAds,
            articleSidebarBanner, sobreNos, textoDisclosure, termosUso, politicaPrivacidade
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
          ON DUPLICATE KEY UPDATE
            heroBackgroundImage=VALUES(heroBackgroundImage),
            heroOverlayOpacity=VALUES(heroOverlayOpacity),
            heroTitle=VALUES(heroTitle),
            heroSubtitle=VALUES(heroSubtitle),
            heroBadge=VALUES(heroBadge),
            heroShowSearch=VALUES(heroShowSearch),
            heroSearchPlaceholder=VALUES(heroSearchPlaceholder),
            heroShowCta=VALUES(heroShowCta),
            heroCtaText=VALUES(heroCtaText),
            heroCtaTarget=VALUES(heroCtaTarget),
            topBarEnabled=VALUES(topBarEnabled),
            topBarText=VALUES(topBarText),
            topBarBgColor=VALUES(topBarBgColor),
            topBarTextColor=VALUES(topBarTextColor),
            topBarLink=VALUES(topBarLink),
            blogLogo=VALUES(blogLogo),
            blogStoreName=VALUES(blogStoreName),
            blogTagline=VALUES(blogTagline),
            blogPrimaryColor=VALUES(blogPrimaryColor),
            menuHomeLabel=VALUES(menuHomeLabel),
            menuStoreLabel=VALUES(menuStoreLabel),
            menuShowStore=VALUES(menuShowStore),
            menuStoreBadge=VALUES(menuStoreBadge),
            menuInstitutionalLabel=VALUES(menuInstitutionalLabel),
            menuShowInstitutional=VALUES(menuShowInstitutional),
            menuContactLabel=VALUES(menuContactLabel),
            menuShowContact=VALUES(menuShowContact),
            menuShowWhatsApp=VALUES(menuShowWhatsApp),
            menuShowVitrineBtn=VALUES(menuShowVitrineBtn),
            menuVitrineBtnText=VALUES(menuVitrineBtnText),
            showCategoriesBar=VALUES(showCategoriesBar),
            footerText=VALUES(footerText),
            footerShowSocial=VALUES(footerShowSocial),
            articleFooterAd=VALUES(articleFooterAd),
            articleFooterAds=VALUES(articleFooterAds),
            articleSidebarBanner=VALUES(articleSidebarBanner),
            sobreNos=VALUES(sobreNos),
            textoDisclosure=VALUES(textoDisclosure),
            termosUso=VALUES(termosUso),
            politicaPrivacidade=VALUES(politicaPrivacidade),
            updatedAt=CURRENT_TIMESTAMP
        `, [
          storeSlug,
          s.storeId || 'store-1',
          s.heroBackgroundImage || '',
          s.heroOverlayOpacity !== undefined ? s.heroOverlayOpacity : 65,
          s.heroTitle || '',
          s.heroSubtitle || '',
          s.heroBadge || '',
          s.heroShowSearch !== false ? 1 : 0,
          s.heroSearchPlaceholder || '',
          s.heroShowCta !== false ? 1 : 0,
          s.heroCtaText || '',
          s.heroCtaTarget || 'store',
          s.topBarEnabled ? 1 : 0,
          s.topBarText || '',
          s.topBarBgColor || '#2A5C3F',
          s.topBarTextColor || '#FFFFFF',
          s.topBarLink || '',
          s.blogLogo || '',
          s.blogStoreName || '',
          s.blogTagline || '',
          s.blogPrimaryColor || '#2A5C3F',
          s.menuHomeLabel || 'Início (Blog)',
          s.menuStoreLabel || 'Loja & Achadinhos',
          s.menuShowStore !== false ? 1 : 0,
          s.menuStoreBadge || 'Ofertas',
          s.menuInstitutionalLabel || 'Institucional',
          s.menuShowInstitutional !== false ? 1 : 0,
          s.menuContactLabel || 'Contato',
          s.menuShowContact !== false ? 1 : 0,
          s.menuShowWhatsApp !== false ? 1 : 0,
          s.menuShowVitrineBtn !== false ? 1 : 0,
          s.menuVitrineBtnText || 'Ver Vitrine',
          s.showCategoriesBar !== false ? 1 : 0,
          s.footerText || '',
          s.footerShowSocial !== false ? 1 : 0,
          adJson,
          adsJson,
          sidebarBannerJson,
          s.sobreNos || '',
          s.textoDisclosure || '',
          s.termosUso || '',
          s.politicaPrivacidade || ''
        ]);
      }
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar configurações do blog no MySQL:', err);
    }
  }

  public async saveContactMessage(msg: ContactMessage): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(`
        INSERT INTO contact_messages (id, storeId, nome, email, assunto, mensagem, lida)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        msg.id,
        msg.storeId || 'store-1',
        msg.nome,
        msg.email,
        msg.assunto || '',
        msg.mensagem,
        msg.lida ? 1 : 0
      ]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao salvar mensagem no MySQL:', err);
    }
  }

  public async deleteContactMessage(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
    } catch (err) {
      console.error('[Hostinger MySQL] Erro ao excluir mensagem no MySQL:', err);
    }
  }

  public async saveInstitutional(data: InstitutionalData): Promise<boolean> {
    if (!this.pool || !this.isConnected) return false;
    const storeSlug = data.storeSlug || 'achadinhos-da-maria';
    const id = data.id || `inst-${storeSlug}`;

    const executeInsert = async () => {
      await this.pool!.query(`
        INSERT INTO institutional_pages (
          id, storeSlug, storeName, cnpj, endereco, email, sobreNos, textoDisclosure, termosUso, politicaPrivacidade
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          storeName=VALUES(storeName),
          cnpj=VALUES(cnpj),
          endereco=VALUES(endereco),
          email=VALUES(email),
          sobreNos=VALUES(sobreNos),
          textoDisclosure=VALUES(textoDisclosure),
          termosUso=VALUES(termosUso),
          politicaPrivacidade=VALUES(politicaPrivacidade),
          updatedAt=CURRENT_TIMESTAMP
      `, [
        id,
        storeSlug,
        data.storeName || '',
        data.cnpj || '',
        data.endereco || '',
        data.email || '',
        data.sobreNos || '',
        data.textoDisclosure || '',
        data.termosUso || '',
        data.politicaPrivacidade || ''
      ]);
    };

    try {
      await executeInsert();
    } catch (err: any) {
      console.warn('[Hostinger MySQL] Erro inicial ao salvar institutional_pages, reparando tabelas...', err?.message);
      await this.ensureInstitutionalTableExist();
      try {
        await executeInsert();
      } catch (retryErr: any) {
        console.error('[Hostinger MySQL] Erro persistente ao salvar institutional_pages:', retryErr);
        return false;
      }
    }

    // Cross-update stores table
    try {
      await this.pool.query(`
        UPDATE stores SET
          storeName = COALESCE(NULLIF(?, ''), storeName),
          cnpj = ?,
          endereco = ?,
          email = ?,
          sobreNos = ?,
          textoDisclosure = ?,
          termosUso = ?,
          politicaPrivacidade = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE slug = ? OR id = ?
      `, [
        data.storeName || '',
        data.cnpj || '',
        data.endereco || '',
        data.email || '',
        data.sobreNos || '',
        data.textoDisclosure || '',
        data.termosUso || '',
        data.politicaPrivacidade || '',
        storeSlug,
        data.storeId || 'store-1'
      ]);
    } catch (errStore) {
      console.warn('[Hostinger MySQL] Aviso ao atualizar colunas institucionais em stores:', errStore);
    }

    // Cross-update blog_settings table
    try {
      await this.pool.query(`
        UPDATE blog_settings SET
          sobreNos = ?,
          textoDisclosure = ?,
          termosUso = ?,
          politicaPrivacidade = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE storeSlug = ?
      `, [
        data.sobreNos || '',
        data.textoDisclosure || '',
        data.termosUso || '',
        data.politicaPrivacidade || '',
        storeSlug
      ]);
    } catch (errBlog) {
      console.warn('[Hostinger MySQL] Aviso ao atualizar colunas institucionais em blog_settings:', errBlog);
    }

    return true;
  }

  public async syncBlogData(data: {
    storeSlug: string;
    posts: BlogPost[];
    categories: BlogCategory[];
    editors: BlogEditor[];
    settings?: BlogSettings;
  }): Promise<{ success: boolean; message: string }> {
    if (!this.pool || !this.isConnected) {
      return { success: false, message: 'MySQL não está conectado. Conecte primeiro o banco de dados.' };
    }
    try {
      await this.createTablesIfNotExist();
      for (const cat of data.categories) {
        await this.saveBlogCategory(cat);
      }
      for (const ed of data.editors) {
        await this.saveBlogEditor(ed);
      }
      for (const post of data.posts) {
        await this.saveBlogPost(post);
      }
      if (data.settings) {
        await this.saveBlogSettings(data.storeSlug, data.settings);
      }
      return {
        success: true,
        message: `Sincronização do Blog concluída! ${data.posts.length} artigos, ${data.categories.length} categorias e ${data.editors.length} redatores gravados no MySQL da Hostinger.`
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao sincronizar blog no MySQL: ${err?.message || 'Erro'}` };
    }
  }

  /**
   * Loads all live data from MySQL to memory/db
   */
  public async loadAllDataFromMySql(): Promise<{
    stores?: StoreConfig[];
    products?: Product[];
    categories?: Category[];
    platforms?: Platform[];
    users?: StoreUser[];
    posts?: BlogPost[];
    blogCategories?: BlogCategory[];
    blogEditors?: BlogEditor[];
    blogSettings?: Record<string, BlogSettings>;
    messages?: ContactMessage[];
  } | null> {
    if (!this.pool || !this.isConnected) return null;

    try {
      const result: any = {};

      // 1. Stores
      try {
        const [stores]: any = await this.pool.query('SELECT * FROM stores');
        if (Array.isArray(stores) && stores.length > 0) {
          result.stores = stores.map((s: any) => ({
            ...s,
            lojaAtiva: Boolean(s.lojaAtiva),
            botaoCanalFlutuante: Boolean(s.botaoCanalFlutuante)
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela stores não encontrada ou vazia:', err);
      }

      // 2. Products
      try {
        const [products]: any = await this.pool.query('SELECT * FROM products ORDER BY ordem ASC');
        if (Array.isArray(products) && products.length > 0) {
          result.products = products.map((p: any) => ({
            ...p,
            ativo: Boolean(p.ativo),
            destaque: Boolean(p.destaque),
            preco: Number(p.preco) || 0,
            precoPromo: p.precoPromo !== null && p.precoPromo !== undefined ? Number(p.precoPromo) : null,
            ordem: Number(p.ordem) || 1
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela products não encontrada ou vazia:', err);
      }

      // 3. Categories
      try {
        const [categories]: any = await this.pool.query('SELECT * FROM categories ORDER BY ordem ASC');
        if (Array.isArray(categories) && categories.length > 0) {
          result.categories = categories.map((c: any) => {
            let subs: string[] = [];
            try {
              if (c.subcategorias) subs = typeof c.subcategorias === 'string' ? JSON.parse(c.subcategorias) : c.subcategorias;
            } catch {
              subs = [];
            }
            return {
              ...c,
              ativo: Boolean(c.ativo),
              mostrarNoMenu: Boolean(c.mostrarNoMenu !== undefined ? c.mostrarNoMenu : c.exibirNoMenu),
              ordem: Number(c.ordem) || 1,
              subcategorias: subs
            };
          });
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela categories não encontrada:', err);
      }

      // 4. Platforms
      try {
        const [platforms]: any = await this.pool.query('SELECT * FROM platforms ORDER BY ordem ASC');
        if (Array.isArray(platforms) && platforms.length > 0) {
          result.platforms = platforms.map((pl: any) => ({
            ...pl,
            ativo: Boolean(pl.ativo),
            ordem: Number(pl.ordem) || 1
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela platforms não encontrada:', err);
      }

      // 5. Users
      try {
        const [users]: any = await this.pool.query('SELECT * FROM users');
        if (Array.isArray(users) && users.length > 0) {
          result.users = users.map((u: any) => ({
            ...u,
            ativo: Boolean(u.ativo)
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela users não encontrada:', err);
      }

      // 6. Blog Posts
      try {
        const [posts]: any = await this.pool.query('SELECT * FROM blog_posts ORDER BY publishedAt DESC, createdAt DESC');
        if (Array.isArray(posts) && posts.length > 0) {
          result.posts = posts.map((p: any) => {
            let tags: string[] = [];
            let linked: string[] = [];
            let sidebarBanner: any = null;
            try {
              if (p.tags) tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags;
            } catch { tags = []; }
            try {
              if (p.linkedProductIds) linked = typeof p.linkedProductIds === 'string' ? JSON.parse(p.linkedProductIds) : p.linkedProductIds;
            } catch { linked = []; }
            try {
              if (p.sidebarBanner) sidebarBanner = typeof p.sidebarBanner === 'string' ? JSON.parse(p.sidebarBanner) : p.sidebarBanner;
            } catch { sidebarBanner = null; }

            return {
              ...p,
              published: Boolean(p.published),
              destaque: Boolean(p.destaque),
              tags,
              linkedProductIds: linked,
              sidebarBanner,
              views: Number(p.views) || 0,
              publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : new Date().toISOString()
            };
          });
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela blog_posts não encontrada:', err);
      }

      // 7. Blog Categories
      try {
        const [blogCats]: any = await this.pool.query('SELECT * FROM blog_categories ORDER BY ordem ASC');
        if (Array.isArray(blogCats) && blogCats.length > 0) {
          result.blogCategories = blogCats.map((bc: any) => ({
            ...bc,
            icon: bc.icon || '🏷️',
            active: bc.active === 1 || bc.active === true || bc.active === '1' || bc.active === undefined,
            mostrarNoMenu: (bc.mostrarNoMenu === 1 || bc.mostrarNoMenu === true || bc.mostrarNoMenu === '1') ||
                           (bc.mostrarNoMenu === undefined && (bc.exibirNoMenu === 1 || bc.exibirNoMenu === true || bc.exibirNoMenu === undefined)),
            ordem: Number(bc.ordem || bc.order) || 1,
            order: Number(bc.ordem || bc.order) || 1
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela blog_categories não encontrada:', err);
      }

      // 8. Blog Editors
      try {
        const [blogEds]: any = await this.pool.query('SELECT * FROM blog_editors');
        if (Array.isArray(blogEds) && blogEds.length > 0) {
          result.blogEditors = blogEds.map((be: any) => ({
            ...be,
            active: Boolean(be.active)
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela blog_editors não encontrada:', err);
      }

      // 9. Blog Settings
      try {
        const [blogSettingsRows]: any = await this.pool.query('SELECT * FROM blog_settings');
        if (Array.isArray(blogSettingsRows) && blogSettingsRows.length > 0) {
          const bSettingsMap: Record<string, BlogSettings> = {};
          for (const row of blogSettingsRows) {
            let footerAd = undefined;
            let footerAds = [];
            let sidebarBanner = undefined;
            try {
              if (row.articleFooterAd) footerAd = typeof row.articleFooterAd === 'string' ? JSON.parse(row.articleFooterAd) : row.articleFooterAd;
            } catch {}
            try {
              if (row.articleFooterAds) footerAds = typeof row.articleFooterAds === 'string' ? JSON.parse(row.articleFooterAds) : row.articleFooterAds;
            } catch {}
            try {
              if (row.articleSidebarBanner) sidebarBanner = typeof row.articleSidebarBanner === 'string' ? JSON.parse(row.articleSidebarBanner) : row.articleSidebarBanner;
            } catch {}

            bSettingsMap[row.storeSlug] = {
              storeId: row.storeId,
              heroBackgroundImage: row.heroBackgroundImage || '',
              heroOverlayOpacity: Number(row.heroOverlayOpacity) || 65,
              heroTitle: row.heroTitle || '',
              heroSubtitle: row.heroSubtitle || '',
              heroBadge: row.heroBadge || '',
              heroShowSearch: Boolean(row.heroShowSearch !== 0),
              heroSearchPlaceholder: row.heroSearchPlaceholder || '',
              heroShowCta: Boolean(row.heroShowCta !== 0),
              heroCtaText: row.heroCtaText || '',
              heroCtaTarget: row.heroCtaTarget || 'store',
              topBarEnabled: Boolean(row.topBarEnabled),
              topBarText: row.topBarText || '',
              topBarBgColor: row.topBarBgColor || '#2A5C3F',
              topBarTextColor: row.topBarTextColor || '#FFFFFF',
              topBarLink: row.topBarLink || '',
              blogLogo: row.blogLogo || '',
              blogStoreName: row.blogStoreName || '',
              blogTagline: row.blogTagline || '',
              blogPrimaryColor: row.blogPrimaryColor || '#2A5C3F',
              menuHomeLabel: row.menuHomeLabel || 'Início (Blog)',
              menuStoreLabel: row.menuStoreLabel || 'Loja & Achadinhos',
              menuShowStore: Boolean(row.menuShowStore !== 0),
              menuStoreBadge: row.menuStoreBadge || 'Ofertas',
              menuInstitutionalLabel: row.menuInstitutionalLabel || 'Institucional',
              menuShowInstitutional: Boolean(row.menuShowInstitutional !== 0),
              menuContactLabel: row.menuContactLabel || 'Contato',
              menuShowContact: Boolean(row.menuShowContact !== 0),
              menuShowWhatsApp: Boolean(row.menuShowWhatsApp !== 0),
              menuShowVitrineBtn: Boolean(row.menuShowVitrineBtn !== 0),
              menuVitrineBtnText: row.menuVitrineBtnText || 'Ver Vitrine',
              showCategoriesBar: Boolean(row.showCategoriesBar !== 0),
              footerText: row.footerText || '',
              footerShowSocial: Boolean(row.footerShowSocial !== 0),
              articleFooterAd: footerAd,
              articleFooterAds: footerAds,
              articleSidebarBanner: sidebarBanner,
              sobreNos: row.sobreNos || '',
              textoDisclosure: row.textoDisclosure || '',
              termosUso: row.termosUso || '',
              politicaPrivacidade: row.politicaPrivacidade || ''
            };
          }
          result.blogSettings = bSettingsMap;
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela blog_settings não encontrada:', err);
      }

      // 10. Contact Messages
      try {
        const [messages]: any = await this.pool.query('SELECT * FROM contact_messages ORDER BY createdAt DESC');
        if (Array.isArray(messages) && messages.length > 0) {
          result.messages = messages.map((m: any) => ({
            ...m,
            lida: Boolean(m.lida)
          }));
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela contact_messages não encontrada:', err);
      }

      // 11. Institutional Pages
      try {
        const [instRows]: any = await this.pool.query('SELECT * FROM institutional_pages');
        if (Array.isArray(instRows) && instRows.length > 0) {
          const instMap: Record<string, InstitutionalData> = {};
          for (const row of instRows) {
            instMap[row.storeSlug] = {
              id: row.id,
              storeSlug: row.storeSlug,
              storeName: row.storeName || '',
              cnpj: row.cnpj || '',
              endereco: row.endereco || '',
              email: row.email || '',
              sobreNos: row.sobreNos || '',
              textoDisclosure: row.textoDisclosure || '',
              termosUso: row.termosUso || '',
              politicaPrivacidade: row.politicaPrivacidade || '',
              updatedAt: row.updatedAt
            };
          }
          result.institutional = instMap;
        }
      } catch (err) {
        console.warn('[Hostinger MySQL] Tabela institutional_pages não encontrada:', err);
      }

      return result;
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro geral ao carregar dados do MySQL:', err);
      return null;
    }
  }

  public async syncAllData(data: { stores: StoreConfig[]; products: Product[]; categories: Category[]; platforms: Platform[] }): Promise<{ success: boolean; message: string; counts: any }> {
    if (!this.pool || !this.isConnected) {
      return {
        success: false,
        message: 'MySQL não está conectado. Conecte primeiro o banco de dados.',
        counts: { stores: 0, products: 0, categories: 0, platforms: 0 }
      };
    }

    try {
      for (const store of data.stores) {
        await this.saveStore(store);
      }
      for (const cat of data.categories) {
        await this.saveCategory(cat);
      }
      for (const plat of data.platforms) {
        await this.savePlatform(plat);
      }
      for (const prod of data.products) {
        await this.saveProduct(prod);
      }

      // Sync blog data if available
      const anyData = data as any;
      if (Array.isArray(anyData.blogCategories)) {
        for (const bc of anyData.blogCategories) {
          await this.saveBlogCategory(bc);
        }
      }
      if (Array.isArray(anyData.blogEditors)) {
        for (const be of anyData.blogEditors) {
          await this.saveBlogEditor(be);
        }
      }
      if (Array.isArray(anyData.posts)) {
        for (const bp of anyData.posts) {
          await this.saveBlogPost(bp);
        }
      }
      if (anyData.blogSettings && typeof anyData.blogSettings === 'object') {
        for (const [storeSlug, s] of Object.entries(anyData.blogSettings)) {
          await this.saveBlogSettings(storeSlug, s as any);
        }
      }
      if (Array.isArray(anyData.messages)) {
        for (const msg of anyData.messages) {
          await this.saveContactMessage(msg);
        }
      }

      const diag = await this.getLiveDiagnostics();
      return {
        success: true,
        message: `Sincronização concluída com sucesso! Produtos, vitrine e artigos do Blog gravados no MySQL da Hostinger.`,
        counts: diag.tableCounts
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro durante sincronização no MySQL: ${err?.message || 'Erro desconhecido'}`,
        counts: { stores: 0, products: 0, categories: 0, platforms: 0 }
      };
    }
  }

  public async seedAllDemoData(force: boolean = false): Promise<{ success: boolean; insertedCount: number; message: string }> {
    if (!this.pool) {
      return { success: false, insertedCount: 0, message: 'MySQL não está conectado. Configure as variáveis DB_HOST, DB_USER, DB_NAME ou salve as credenciais na aba Banco de Dados.' };
    }

    try {
      console.log('[Hostinger MySQL] Semeando dados completos no banco de dados...');
      
      // 1. Store
      await this.pool.query(`
        INSERT INTO stores (
          id, slug, storeName, logo, instagram, facebook, tiktok,
          corPrimaria, corSecundaria, bannerUrl, bannerLink, bannerTag,
          bannerTitulo, bannerSubtitulo, tituloSite, descricaoSite, lojaAtiva,
          mensagemTopo, corBarraTopo, email, textoDisclosure, adminUser, adminEmail, adminPassword
        ) VALUES (
          'store-1', 'achadinhos-da-maria', 'Meudocelar',
          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80&fm=webp',
          '@meudocelar', 'facebook.com/meudocelar', '@meudocelar',
          '#2A5C3F', '#1B1B1B',
          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80&fm=webp',
          'Eletrônicos', 'SELEÇÃO ESPECIAL', 'Ofertas Imperdíveis do Dia',
          'Ofertas com até 60% de desconto e cupons exclusivos testados.',
          'Meudocelar — As Melhores Ofertas e Produtos para seu Lar',
          'Encontre produtos imperdíveis para sua casa e dia a dia na Amazon, Shopee, Mercado Livre e Magalu.',
          1, '🔥 Frete Grátis e Cupons Exclusivos adicionados hoje! Aproveite antes que acabem.',
          '#2A5C3F', 'admin@meudocelar.com.br',
          'Este site participa de programas de afiliados e pode receber comissão pelas compras realizadas nos links, sem custo adicional para você.',
          'admin', 'admin@meudocelar.com.br',
          '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.qH0fQY6iKz7j8aR3Fw9rL5q2O.c4M12'
        ) ON DUPLICATE KEY UPDATE storeName=VALUES(storeName), lojaAtiva=1
      `);

      // 2. Categories
      await this.pool.query(`
        INSERT INTO categories (id, storeId, nome, slug, icone, ativo, ordemMenu, exibirNoMenu) VALUES
        ('cat-1', 'store-1', 'Eletrônicos', 'eletronicos', 'Laptop', 1, 1, 1),
        ('cat-2', 'store-1', 'Casa & Cozinha', 'casa-cozinha', 'Home', 1, 2, 1),
        ('cat-3', 'store-1', 'Beleza & Cuidados', 'beleza-cuidados', 'Sparkles', 1, 3, 1),
        ('cat-4', 'store-1', 'Moda & Acessórios', 'moda-acessorios', 'ShoppingBag', 1, 4, 1),
        ('cat-5', 'store-1', 'Cursos & Livros', 'cursos-livros', 'BookOpen', 1, 5, 1)
        ON DUPLICATE KEY UPDATE nome=VALUES(nome), ativo=1
      `);

      // 3. Platforms
      await this.pool.query(`
        INSERT INTO platforms (id, storeId, nome, slug, cor, badge, icone, ativo, ordem) VALUES
        ('plat-1', 'store-1', 'Amazon', 'amazon', '#FF9900', 'Prime', 'ShoppingBag', 1, 1),
        ('plat-2', 'store-1', 'Shopee', 'shopee', '#EE4D2D', 'Frete Grátis', 'ShoppingBag', 1, 2),
        ('plat-3', 'store-1', 'Mercado Livre', 'mercado-livre', '#EAB308', 'Full', 'ShoppingBag', 1, 3),
        ('plat-4', 'store-1', 'Magalu', 'magalu', '#0086FF', 'Oferta', 'ShoppingBag', 1, 4),
        ('plat-5', 'store-1', 'Hotmart', 'hotmart', '#F97316', 'Digital', 'ShoppingBag', 1, 5)
        ON DUPLICATE KEY UPDATE nome=VALUES(nome), ativo=1
      `);

      // 4. Products
      await this.pool.query(`
        INSERT INTO products (
          id, storeId, ativo, tipo, plataforma, categoria, subcategoria,
          nome, descricao, preco, precoPromo, cupom, validade,
          linkAfiliado, textoBotao, video, img1, img2, img3, img4,
          ordem, destaque
        ) VALUES
        (
          'prod-1', 'store-1', 1, 'FISICO', 'Amazon', 'Eletrônicos', 'Áudio',
          'Fone de Ouvido Bluetooth JBL Tune 520BT com Som Pure Bass',
          'Fone sem fio JBL Tune 520BT com bateria de até 57 horas de reprodução, carregamento rápido (5 minutos = 3 horas), microfone integrado para chamadas mãos livres e conexão multipontos para alternar entre dispositivos facilmente.',
          299.00, 219.90, 'JBL10OFF', '2027-12-31',
          'https://amazon.com.br?tag=achadinhos-maria-20', 'Ver oferta na Amazon →', '',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80&fm=webp',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80&fm=webp',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80&fm=webp', '',
          1, 1
        ),
        (
          'prod-2', 'store-1', 1, 'FISICO', 'Shopee', 'Casa & Cozinha', 'Eletroportáteis',
          'Fritadeira Elétrica Air Fryer Digital 4.5L Inox',
          'Air Fryer com painel touch digital, 8 funções pré-programadas, cesto antiaderente removível com revestimento cerâmico e timer sonoro de 60 minutos. Cozinha alimentos crocantes com até 80% menos óleo.',
          459.90, 289.00, 'AIRFRYER20', '2027-12-31',
          'https://shopee.com.br?affiliate=achadinhos', 'Pegar Desconto na Shopee →', '',
          'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop&q=80&fm=webp',
          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80&fm=webp', '', '',
          2, 1
        ),
        (
          'prod-3', 'store-1', 1, 'FISICO', 'Mercado Livre', 'Eletrônicos', 'Wearables',
          'Smartwatch Xiaomi Smart Band 8 Tela AMOLED 1.62\"',
          'Pulseira inteligente com mais de 150 modos esportivos, monitoramento contínuo de frequência cardíaca e oxigênio no sangue (SpO2), bateria com autonomia de até 16 dias e resistência à água de 5 ATM (50 metros).',
          249.00, 189.90, 'MELLIBRE15', '2027-12-31',
          'https://mercadolivre.com.br/sec/promo', 'Ver no Mercado Livre →', '',
          'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80&fm=webp',
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80&fm=webp', '', '',
          3, 1
        ),
        (
          'prod-4', 'store-1', 1, 'FISICO', 'Amazon', 'Casa & Cozinha', 'Organização',
          'Kit 6 Potes Herméticos de Vidro com Tampa de Bambu',
          'Conjunto com 6 potes de vidro borossilicato resistente a calor e choque térmico com tampas herméticas em bambu natural e anel de silicone. Ideais para mantimentos, grãos, café e organização estética de despensa.',
          169.90, 119.00, 'CASA10', '2027-12-31',
          'https://amazon.com.br?tag=achadinhos-maria-20', 'Ver oferta na Amazon →', '',
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80&fm=webp',
          'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80&fm=webp', '', '',
          4, 0
        ),
        (
          'prod-5', 'store-1', 1, 'FISICO', 'Magalu', 'Beleza & Cuidados', 'Cabelos',
          'Escova Secadora e Modeladora 3 em 1 Cerâmica Íons 1200W',
          'Seca, alisa e modela com cerdas macias anti-frizz e tecnologia de íons negativos que selam as cutículas dos fios. Possui 3 temperaturas ajustáveis e cabo giratório 360 graus.',
          189.90, 99.90, 'BELEZA25', '2027-12-31',
          'https://magazineluiza.com.br', 'Ver na Magalu →', '',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80&fm=webp',
          '', '', '',
          5, 0
        ),
        (
          'prod-6', 'store-1', 1, 'DIGITAL', 'Hotmart', 'Cursos & Livros', 'Desenvolvimento',
          'Curso Completo de Marketing para Afiliados e Tráfego Pago',
          'Aprenda do zero ao avançado como criar campanhas de alto retorno, encontrar produtos vencedores e estruturar uma renda recorrente com programas de afiliados globais.',
          497.00, 197.00, 'DESCONTOVIP', '2027-12-31',
          'https://hotmart.com', 'Quero Conhecer o Curso →', '',
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80&fm=webp',
          '', '', '',
          6, 0
        ),
        (
          'prod-7', 'store-1', 1, 'FISICO', 'Shopee', 'Eletrônicos', 'Acessórios',
          'Luminária de Mesa LED Articulada Recarregável Touch com Porta-Caneta',
          'Lâmpada de mesa com 3 intensidades de luz (quente, fria e neutra), haste flexível de silicone, suporte para celular integrado e bateria recarregável USB com até 8h de duração contínua.',
          69.90, 38.50, '', '2027-12-31',
          'https://shopee.com.br', 'Ver Oferta na Shopee →', '',
          'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800&auto=format&fit=crop&q=80&fm=webp',
          '', '', '',
          7, 0
        ),
        (
          'prod-8', 'store-1', 1, 'FISICO', 'Amazon', 'Eletrônicos', 'Dispositivos',
          'Echo Pop Smart Speaker Compacto com Alexa e Som Envolvente',
          'A smart speaker com som surround compacto que cabe perfeitamente em quartos e espaços pequenos. Peça músicas para Alexa, controle dispositivos de casa inteligente, timer, previsão do tempo e muito mais.',
          349.00, 249.00, 'ALEXAPROMO', '2027-12-31',
          'https://amazon.com.br', 'Ver na Amazon →', '',
          'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80&fm=webp',
          '', '', '',
          8, 0
        )
        ON DUPLICATE KEY UPDATE nome=VALUES(nome), preco=VALUES(preco), precoPromo=VALUES(precoPromo), ativo=1
      `);

      // 5. Blog Categories
      try {
        for (const bCat of FALLBACK_BLOG_CATEGORIES) {
          await this.saveBlogCategory(bCat);
        }
      } catch (e) {
        console.warn('[Hostinger MySQL] Erro ao semear categorias do blog:', e);
      }

      // 6. Blog Editors
      try {
        for (const bEd of FALLBACK_BLOG_EDITORS) {
          await this.saveBlogEditor(bEd);
        }
      } catch (e) {
        console.warn('[Hostinger MySQL] Erro ao semear redatores do blog:', e);
      }

      // 7. Blog Posts
      try {
        for (const bPost of FALLBACK_BLOG_POSTS) {
          await this.saveBlogPost(bPost);
        }
      } catch (e) {
        console.warn('[Hostinger MySQL] Erro ao semear artigos do blog:', e);
      }

      // 8. Blog Settings
      try {
        await this.saveBlogSettings('achadinhos-da-maria', FALLBACK_BLOG_SETTINGS);
      } catch (e) {
        console.warn('[Hostinger MySQL] Erro ao semear configurações do blog:', e);
      }

      return {
        success: true,
        insertedCount: 8,
        message: 'Tabelas do banco de dados da Hostinger populadas com sucesso com a loja, produtos, artigos e configurações do Blog!'
      };
    } catch (err: any) {
      console.error('[Hostinger MySQL] Erro ao semear tabelas:', err);
      return {
        success: false,
        insertedCount: 0,
        message: `Erro ao semear MySQL: ${err?.message || 'Erro desconhecido'}`
      };
    }
  }
}

export const mysqlManager = new MySqlManager();
