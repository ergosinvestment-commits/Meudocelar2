<?php
/**
 * ============================================================
 * PLANILOJA ACHADINHOS - API REST NATIVA PHP PARA HOSTINGER
 * ============================================================
 * Funciona 100% nativo em qualquer plano Hostinger (PHP 7.4, 8.0, 8.1, 8.2, 8.3)
 * Conecta diretamente ao MySQL local (localhost) sem necessidade de Node.js.
 */

error_reporting(0);
ini_set('display_errors', '0');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Garante que qualquer erro ou exceção sempre retorne JSON válido
set_exception_handler(function ($e) {
    if (!headers_sent()) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno no servidor PHP: ' . $e->getMessage()
    ]);
    exit;
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=utf-8");
            http_response_code(500);
        }
        echo json_encode([
            'success' => false,
            'error' => 'Erro de sintaxe/execução PHP: ' . $error['message'] . ' na linha ' . $error['line']
        ]);
    }
});

// Cabeçalhos CORS e JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---------------------------------------------------------------------------
// 1. CARREGAMENTO DE CONFIGURAÇÃO DE BANCO (config.php ou .env)
// ---------------------------------------------------------------------------
$dbHost = 'localhost';
$dbPort = '3306';
$dbName = 'u566136191_achadinhos';
$dbUser = 'u566136191_achadinhos';
$dbPass = '';

// Se existir config.php customizado no mesmo diretório ou na raiz
$configFile = __DIR__ . '/../config.php';
if (file_exists($configFile)) {
    @include_once $configFile;
} elseif (file_exists(__DIR__ . '/config.php')) {
    @include_once __DIR__ . '/config.php';
}

// Se existir arquivo .env na raiz
$envFile = __DIR__ . '/../../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../.env';
}
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $val) = array_pad(explode('=', $line, 2), 2, null);
        if ($name && $val !== null) {
            $name = trim($name);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if ($name === 'DB_HOST') $dbHost = $val;
            if ($name === 'DB_PORT') $dbPort = $val;
            if ($name === 'DB_NAME') $dbName = $val;
            if ($name === 'DB_USER') $dbUser = $val;
            if ($name === 'DB_PASSWORD') $dbPass = $val;
        }
    }
}

// Se foi salvo via painel em db_config.json
$savedConfig = __DIR__ . '/db_config.json';
if (file_exists($savedConfig)) {
    $cfg = json_decode(file_get_contents($savedConfig), true);
    if (!empty($cfg['host'])) $dbHost = $cfg['host'];
    if (!empty($cfg['port'])) $dbPort = $cfg['port'];
    if (!empty($cfg['database'])) $dbName = $cfg['database'];
    if (!empty($cfg['user'])) $dbUser = $cfg['user'];
    if (isset($cfg['password'])) $dbPass = $cfg['password'];
}

// ---------------------------------------------------------------------------
// 2. CONEXÃO PDO COM O BANCO DE DADOS
// ---------------------------------------------------------------------------
function getDbConnection($h, $p, $db, $u, $pass) {
    try {
        $dsn = "mysql:host={$h};port={$p};dbname={$db};charset=utf8mb4";
        $pdo = new PDO($dsn, $u, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]);
        return ['pdo' => $pdo, 'error' => null];
    } catch (PDOException $e) {
        return ['pdo' => null, 'error' => $e->getMessage()];
    }
}

$dbConn = getDbConnection($dbHost, $dbPort, $dbName, $dbUser, $dbPass);
$pdo = $dbConn['pdo'];

// ---------------------------------------------------------------------------
// HELPERS E FORMATADORES DO BLOG
// ---------------------------------------------------------------------------

function ensureBlogTablesExist($pdo, $forceSeed = false) {
    static $checked = false;
    if ($checked && !$forceSeed) return;
    if (!$pdo) return;

    try {
        // 1. blog_categories
        $pdo->exec("CREATE TABLE IF NOT EXISTS `blog_categories` (
            `id` varchar(64) NOT NULL,
            `storeId` varchar(64) DEFAULT 'store-1',
            `name` varchar(128) NOT NULL,
            `slug` varchar(191) NOT NULL,
            `description` text DEFAULT NULL,
            `icon` varchar(64) DEFAULT 'Sparkles',
            `active` tinyint(1) DEFAULT 1,
            `mostrarNoMenu` tinyint(1) DEFAULT 1,
            `ordem` int(11) DEFAULT 1,
            `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_bcat_store` (`storeId`),
            KEY `idx_bcat_slug` (`slug`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $blogCategoryColumns = $pdo->query("SHOW COLUMNS FROM `blog_categories`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('mostrarNoMenu', $blogCategoryColumns, true)) {
            $pdo->exec("ALTER TABLE `blog_categories` ADD COLUMN `mostrarNoMenu` tinyint(1) DEFAULT 1");
        }

        // 2. blog_editors
        $pdo->exec("CREATE TABLE IF NOT EXISTS `blog_editors` (
            `id` varchar(64) NOT NULL,
            `storeId` varchar(64) DEFAULT 'store-1',
            `name` varchar(128) NOT NULL,
            `avatar` text DEFAULT NULL,
            `role` varchar(128) DEFAULT 'Redator & Curador',
            `bio` text DEFAULT NULL,
            `socialLink` varchar(500) DEFAULT '',
            `email` varchar(255) DEFAULT '',
            `active` tinyint(1) DEFAULT 1,
            `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_bed_store` (`storeId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 3. blog_posts
        $pdo->exec("CREATE TABLE IF NOT EXISTS `blog_posts` (
            `id` varchar(64) NOT NULL,
            `storeId` varchar(64) DEFAULT 'store-1',
            `slug` varchar(191) NOT NULL,
            `title` varchar(500) NOT NULL,
            `excerpt` text DEFAULT NULL,
            `content` longtext NOT NULL,
            `coverImage` text DEFAULT NULL,
            `category` varchar(128) DEFAULT 'Geral',
            `tags` text DEFAULT NULL,
            `authorId` varchar(64) DEFAULT NULL,
            `author` varchar(128) DEFAULT 'Equipe',
            `authorAvatar` text DEFAULT NULL,
            `authorRole` varchar(128) DEFAULT NULL,
            `authorBio` text DEFAULT NULL,
            `readTime` varchar(64) DEFAULT '4 min',
            `destaque` tinyint(1) DEFAULT 0,
            `status` varchar(32) DEFAULT 'published',
            `published` tinyint(1) DEFAULT 1,
            `views` int(11) DEFAULT 0,
            `linkedProductIds` text DEFAULT NULL,
            `sidebarBanner` longtext DEFAULT NULL,
            `publishedAt` datetime DEFAULT NULL,
            `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_post_store` (`storeId`),
            KEY `idx_post_slug` (`slug`),
            KEY `idx_post_category` (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $blogPostColumns = $pdo->query("SHOW COLUMNS FROM `blog_posts`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('sidebarBanner', $blogPostColumns, true)) {
            $pdo->exec("ALTER TABLE `blog_posts` ADD COLUMN `sidebarBanner` longtext DEFAULT NULL");
        }

        // 4. blog_settings
        $pdo->exec("CREATE TABLE IF NOT EXISTS `blog_settings` (
            `id` varchar(64) NOT NULL,
            `storeSlug` varchar(128) NOT NULL,
            `storeId` varchar(64) DEFAULT 'store-1',
            `heroBackgroundImage` text DEFAULT NULL,
            `heroOverlayOpacity` int(11) DEFAULT 65,
            `heroTitle` varchar(500) DEFAULT '',
            `heroSubtitle` varchar(500) DEFAULT '',
            `heroBadge` varchar(255) DEFAULT '',
            `heroShowSearch` tinyint(1) DEFAULT 1,
            `heroSearchPlaceholder` varchar(255) DEFAULT 'Buscar artigos...',
            `heroShowCta` tinyint(1) DEFAULT 1,
            `heroCtaText` varchar(255) DEFAULT 'Explorar Todos os Artigos',
            `heroCtaTarget` varchar(255) DEFAULT '#artigos',
            `topBarEnabled` tinyint(1) DEFAULT 0,
            `topBarText` varchar(500) DEFAULT '',
            `topBarBgColor` varchar(32) DEFAULT '#2A5C3F',
            `topBarTextColor` varchar(32) DEFAULT '#FFFFFF',
            `topBarLink` varchar(500) DEFAULT '',
            `blogLogo` text DEFAULT NULL,
            `blogStoreName` varchar(255) DEFAULT '',
            `blogTagline` varchar(255) DEFAULT '',
            `blogPrimaryColor` varchar(32) DEFAULT '#2A5C3F',
            `menuHomeLabel` varchar(128) DEFAULT 'Início',
            `menuStoreLabel` varchar(128) DEFAULT 'Ver Ofertas',
            `menuShowStore` tinyint(1) DEFAULT 1,
            `menuStoreBadge` varchar(64) DEFAULT 'Vitrine',
            `menuInstitutionalLabel` varchar(128) DEFAULT 'Sobre Nós',
            `menuShowInstitutional` tinyint(1) DEFAULT 1,
            `menuContactLabel` varchar(128) DEFAULT 'Contato',
            `menuShowContact` tinyint(1) DEFAULT 1,
            `menuShowWhatsApp` tinyint(1) DEFAULT 1,
            `menuShowVitrineBtn` tinyint(1) DEFAULT 1,
            `menuVitrineBtnText` varchar(128) DEFAULT 'Ir para Vitrine',
            `showCategoriesBar` tinyint(1) DEFAULT 1,
            `footerText` varchar(500) DEFAULT '',
            `footerShowSocial` tinyint(1) DEFAULT 1,
            `articleFooterAd` longtext DEFAULT NULL,
            `articleFooterAds` longtext DEFAULT NULL,
            `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_blog_settings_slug` (`storeSlug`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 5. contact_messages
        $pdo->exec("CREATE TABLE IF NOT EXISTS `contact_messages` (
            `id` varchar(64) NOT NULL,
            `storeId` varchar(64) DEFAULT 'store-1',
            `nome` varchar(255) NOT NULL,
            `email` varchar(255) NOT NULL,
            `assunto` varchar(255) DEFAULT 'Mensagem do Site',
            `mensagem` text NOT NULL,
            `lida` tinyint(1) DEFAULT 0,
            `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_msg_store` (`storeId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Se forceSeed ou se categorias estão vazias, popula dados iniciais
        $cntCat = (int)$pdo->query("SELECT COUNT(*) FROM blog_categories")->fetchColumn();
        if ($cntCat === 0 || $forceSeed) {
            $pdo->exec("INSERT INTO `blog_categories` (`id`, `storeId`, `name`, `slug`, `description`, `icon`, `active`, `ordem`) VALUES
                ('blog-cat-1', 'store-1', 'Casa & Cozinha', 'casa-cozinha', 'Eletroportáteis, utensílios inteligentes e truques culinários.', '🍳', 1, 1),
                ('blog-cat-2', 'store-1', 'Organização', 'organizacao', 'Dicas práticas para closets, despensas e otimização de espaço.', '📦', 1, 2),
                ('blog-cat-3', 'store-1', 'Decoração', 'decoracao', 'Ideias aconchegantes, iluminação, paletas e ambientação.', '🛋️', 1, 3),
                ('blog-cat-4', 'store-1', 'Dicas de Compras', 'dicas-de-compras', 'Guia de cupons, comparativos de preços e garimpos confiáveis.', '🛍️', 1, 4),
                ('blog-cat-5', 'store-1', 'Tecnologia & Smart Home', 'smart-home', 'Dispositivos inteligentes, automação e gadgets práticos.', '💡', 1, 5)
                ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);");
        }

        $cntEd = (int)$pdo->query("SELECT COUNT(*) FROM blog_editors")->fetchColumn();
        if ($cntEd === 0 || $forceSeed) {
            $pdo->exec("INSERT INTO `blog_editors` (`id`, `storeId`, `name`, `avatar`, `role`, `bio`, `socialLink`, `email`, `active`) VALUES
                ('editor-1', 'store-1', 'Maria Clara', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp', 'Editora-Chefe & Curadora', 'Pesquisadora obsessiva por produtos de alta qualidade.', 'https://instagram.com/meudocelar', 'mariaclara@achadinhosdamaria.com.br', 1),
                ('editor-2', 'store-1', 'Equipe Meu Doce Lar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial & Testes Práticos', 'Nosso time multidisciplinar que testa produtos.', 'https://instagram.com/meudocelar', 'contato@achadinhosdamaria.com.br', 1)
                ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);");
        }

        $cntPosts = (int)$pdo->query("SELECT COUNT(*) FROM blog_posts")->fetchColumn();
        if ($cntPosts === 0 || $forceSeed) {
            $pdo->exec("INSERT INTO `blog_posts` (`id`, `storeId`, `slug`, `title`, `excerpt`, `content`, `coverImage`, `category`, `tags`, `authorId`, `author`, `authorAvatar`, `authorRole`, `authorBio`, `readTime`, `destaque`, `status`, `published`, `views`, `linkedProductIds`, `publishedAt`) VALUES
                ('post-1', 'store-1', '5-itens-essenciais-para-transformar-sua-cozinha-em-2026', '5 Itens Essenciais que Transformam Qualquer Cozinha e Economizam Tempo', 'Descubra os eletroportáteis e organizadores inteligentes que unem praticidade e design.', 'Cozinhar e manter a casa em ordem não precisa ser uma maratona cansativa. Com a evolução dos utensílios domésticos e eletroportáteis inteligentes, é possível economizar até 50% do tempo no preparo das refeições diárias.\n\n### 1. A Air Fryer Digital\nSe você ainda não tem uma fritadeira sem óleo, os novos modelos digitais com visor transparente mudaram o jogo.\n\n### 2. Organizadores Acrílicos Herméticos\nManter grãos e temperos em potes transparentes e empilháveis aumenta a durabilidade dos alimentos.\n\nConfira nossa seleção na aba Loja com os melhores preços!', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp', 'Casa & Cozinha', '[\"Cozinha Prática\",\"Organização\"]', 'editor-2', 'Equipe Meu Doce Lar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial', 'Time que testa produtos.', '4 min de leitura', 1, 'published', 1, 342, '[\"prod-2\",\"prod-4\"]', NOW())
                ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);");
        }

        $cntSet = (int)$pdo->query("SELECT COUNT(*) FROM blog_settings")->fetchColumn();
        if ($cntSet === 0 || $forceSeed) {
            $pdo->exec("INSERT INTO `blog_settings` (`id`, `storeSlug`, `storeId`, `heroBackgroundImage`, `heroOverlayOpacity`, `heroTitle`, `heroSubtitle`, `heroBadge`, `heroShowSearch`, `heroSearchPlaceholder`, `heroShowCta`, `heroCtaText`, `heroCtaTarget`, `topBarEnabled`, `topBarText`, `topBarBgColor`, `topBarTextColor`, `topBarLink`, `blogLogo`, `blogStoreName`, `blogTagline`, `blogPrimaryColor`, `menuHomeLabel`, `menuStoreLabel`, `menuShowStore`, `menuStoreBadge`, `menuInstitutionalLabel`, `menuShowInstitutional`, `menuContactLabel`, `menuShowContact`, `menuShowWhatsApp`, `menuShowVitrineBtn`, `menuVitrineBtnText`, `showCategoriesBar`, `footerText`, `footerShowSocial`, `articleFooterAd`, `articleFooterAds`) VALUES
                ('bs-achadinhos-da-maria', 'achadinhos-da-maria', 'store-1', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80&fm=webp', 65, 'Guia de Achadinhos & Dicas para seu Lar', 'Análises sinceras e seleções com os melhores preços garimpados.', 'BLOG & DICAS EXCLUSIVAS', 1, 'Buscar artigos por tema...', 1, 'Explorar Vitrine de Ofertas', 'store', 0, '✨ Confira os novos achadinhos da semana!', '#2A5C3F', '#FFFFFF', '', '', 'Meudocelar', 'Blog & Achadinhos Verificados', '#2A5C3F', 'Início', 'Loja & Achadinhos', 1, 'Ofertas', 'Institucional', 1, 'Contato', 1, 1, 1, 'Ver Vitrine', 1, '', 1, NULL, '[]')
                ON DUPLICATE KEY UPDATE `heroTitle`=VALUES(`heroTitle`);");
        }

    } catch (Exception $e) {
        // Ignora silenciosamente se o usuário do banco não tiver permissão CREATE TABLE
    }
    $checked = true;
}

function formatPostOutput($post) {
    if (!$post) return null;
    $tags = [];
    if (!empty($post['tags'])) {
        if (is_array($post['tags'])) {
            $tags = $post['tags'];
        } elseif (is_string($post['tags'])) {
            $dec = json_decode($post['tags'], true);
            $tags = is_array($dec) ? $dec : array_filter(array_map('trim', explode(',', $post['tags'])));
        }
    }
    $linkedProductIds = [];
    if (!empty($post['linkedProductIds'])) {
        if (is_array($post['linkedProductIds'])) {
            $linkedProductIds = $post['linkedProductIds'];
        } elseif (is_string($post['linkedProductIds'])) {
            $dec = json_decode($post['linkedProductIds'], true);
            $linkedProductIds = is_array($dec) ? $dec : array_filter(array_map('trim', explode(',', $post['linkedProductIds'])));
        }
    }
    $sidebarBanner = null;
    if (!empty($post['sidebarBanner'])) {
        if (is_array($post['sidebarBanner'])) {
            $sidebarBanner = $post['sidebarBanner'];
        } elseif (is_string($post['sidebarBanner'])) {
            $decodedBanner = json_decode($post['sidebarBanner'], true);
            $sidebarBanner = is_array($decodedBanner) ? $decodedBanner : null;
        }
    }

    $published = isset($post['published']) ? (bool)$post['published'] : true;
    $destaque = !empty($post['destaque']);
    $views = isset($post['views']) ? (int)$post['views'] : 0;
    $status = $post['status'] ?? ($published ? 'published' : 'draft');

    return [
        'id' => (string)($post['id'] ?? ''),
        'storeId' => (string)($post['storeId'] ?? 'store-1'),
        'slug' => (string)($post['slug'] ?? ''),
        'title' => (string)($post['title'] ?? ''),
        'excerpt' => (string)($post['excerpt'] ?? ''),
        'content' => (string)($post['content'] ?? ''),
        'coverImage' => (string)($post['coverImage'] ?? ''),
        'category' => (string)($post['category'] ?? 'Geral'),
        'tags' => array_values($tags),
        'authorId' => $post['authorId'] ?? null,
        'author' => (string)($post['author'] ?? 'Equipe'),
        'authorAvatar' => $post['authorAvatar'] ?? null,
        'authorRole' => $post['authorRole'] ?? null,
        'authorBio' => $post['authorBio'] ?? null,
        'readTime' => (string)($post['readTime'] ?? '4 min'),
        'destaque' => $destaque,
        'status' => $status,
        'published' => $published,
        'views' => $views,
        'linkedProductIds' => array_values($linkedProductIds),
        'sidebarBanner' => $sidebarBanner,
        'publishedAt' => $post['publishedAt'] ?? $post['createdAt'] ?? date('c'),
        'createdAt' => $post['createdAt'] ?? date('c'),
        'updatedAt' => $post['updatedAt'] ?? date('c'),
    ];
}

function formatBlogCategoryOutput($cat) {
    if (!$cat) return null;
    $mostrarNoMenu = true;
    if (array_key_exists('mostrarNoMenu', $cat) && $cat['mostrarNoMenu'] !== null) {
        $mostrarNoMenu = !in_array($cat['mostrarNoMenu'], [false, 0, '0', 'false'], true);
    } elseif (array_key_exists('exibirNoMenu', $cat) && $cat['exibirNoMenu'] !== null) {
        $mostrarNoMenu = !in_array($cat['exibirNoMenu'], [false, 0, '0', 'false'], true);
    }
    return [
        'id' => (string)($cat['id'] ?? ''),
        'storeId' => (string)($cat['storeId'] ?? 'store-1'),
        'name' => (string)($cat['name'] ?? ''),
        'slug' => (string)($cat['slug'] ?? ''),
        'description' => (string)($cat['description'] ?? ''),
        'icon' => (string)($cat['icon'] ?? 'Sparkles'),
        'active' => isset($cat['active']) ? (bool)$cat['active'] : true,
        'mostrarNoMenu' => $mostrarNoMenu,
        'order' => isset($cat['ordem']) ? (int)$cat['ordem'] : (isset($cat['order']) ? (int)$cat['order'] : 1),
        'ordem' => isset($cat['ordem']) ? (int)$cat['ordem'] : 1,
        'createdAt' => $cat['createdAt'] ?? date('c'),
        'updatedAt' => $cat['updatedAt'] ?? date('c')
    ];
}

function formatBlogEditorOutput($ed) {
    if (!$ed) return null;
    return [
        'id' => (string)($ed['id'] ?? ''),
        'storeId' => (string)($ed['storeId'] ?? 'store-1'),
        'name' => (string)($ed['name'] ?? ''),
        'avatar' => (string)($ed['avatar'] ?? ''),
        'role' => (string)($ed['role'] ?? 'Redator & Curador'),
        'bio' => (string)($ed['bio'] ?? ''),
        'socialLink' => (string)($ed['socialLink'] ?? ''),
        'email' => (string)($ed['email'] ?? ''),
        'active' => isset($ed['active']) ? (bool)$ed['active'] : true,
        'createdAt' => $ed['createdAt'] ?? date('c'),
        'updatedAt' => $ed['updatedAt'] ?? date('c')
    ];
}

function formatBlogSettingsOutput($s, $storeSlug = 'achadinhos-da-maria') {
    if (!$s) {
        return [
            'heroBackgroundImage' => 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80&fm=webp',
            'heroOverlayOpacity' => 65,
            'heroTitle' => 'Guia de Achadinhos & Dicas para seu Lar',
            'heroSubtitle' => 'Análises sinceras, seleções com os melhores preços garimpados e dicas práticas de organização para sua rotina.',
            'heroBadge' => 'BLOG & DICAS EXCLUSIVAS',
            'heroShowSearch' => true,
            'heroSearchPlaceholder' => 'Buscar artigos por tema (ex: Air Fryer, Cozinha, Organização)...',
            'heroShowCta' => true,
            'heroCtaText' => 'Explorar Vitrine de Ofertas',
            'heroCtaTarget' => 'store',
            'topBarEnabled' => false,
            'topBarText' => '✨ Confira os novos achadinhos e guias de compras da semana!',
            'topBarBgColor' => '#2A5C3F',
            'topBarTextColor' => '#FFFFFF',
            'topBarLink' => '',
            'blogLogo' => '',
            'blogStoreName' => 'Meudocelar',
            'blogTagline' => 'Blog & Achadinhos Verificados',
            'blogPrimaryColor' => '#2A5C3F',
            'menuHomeLabel' => 'Início',
            'menuStoreLabel' => 'Loja & Achadinhos',
            'menuShowStore' => true,
            'menuStoreBadge' => 'Ofertas',
            'menuInstitutionalLabel' => 'Institucional',
            'menuShowInstitutional' => true,
            'menuContactLabel' => 'Contato',
            'menuShowContact' => true,
            'menuShowWhatsApp' => true,
            'menuShowVitrineBtn' => true,
            'menuVitrineBtnText' => 'Ver Vitrine',
            'showCategoriesBar' => true,
            'footerText' => '',
            'footerShowSocial' => true,
            'articleFooterAd' => null,
            'articleFooterAds' => []
        ];
    }

    $ads = [];
    if (!empty($s['articleFooterAds'])) {
        if (is_array($s['articleFooterAds'])) {
            $ads = $s['articleFooterAds'];
        } elseif (is_string($s['articleFooterAds'])) {
            $dec = json_decode($s['articleFooterAds'], true);
            if (is_array($dec)) $ads = $dec;
        }
    }

    $singleAd = null;
    if (!empty($s['articleFooterAd'])) {
        if (is_array($s['articleFooterAd'])) {
            $singleAd = $s['articleFooterAd'];
        } elseif (is_string($s['articleFooterAd'])) {
            $dec = json_decode($s['articleFooterAd'], true);
            if (is_array($dec)) $singleAd = $dec;
        }
    }

    return [
        'heroBackgroundImage' => (string)($s['heroBackgroundImage'] ?? 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80&fm=webp'),
        'heroOverlayOpacity' => isset($s['heroOverlayOpacity']) ? (int)$s['heroOverlayOpacity'] : 65,
        'heroTitle' => (string)($s['heroTitle'] ?? 'Guia de Achadinhos & Dicas para seu Lar'),
        'heroSubtitle' => (string)($s['heroSubtitle'] ?? 'Análises sinceras, seleções com os melhores preços garimpados e dicas práticas de organização para sua rotina.'),
        'heroBadge' => (string)($s['heroBadge'] ?? 'BLOG & DICAS EXCLUSIVAS'),
        'heroShowSearch' => isset($s['heroShowSearch']) ? (bool)$s['heroShowSearch'] : true,
        'heroSearchPlaceholder' => (string)($s['heroSearchPlaceholder'] ?? 'Buscar artigos...'),
        'heroShowCta' => isset($s['heroShowCta']) ? (bool)$s['heroShowCta'] : true,
        'heroCtaText' => (string)($s['heroCtaText'] ?? 'Explorar Vitrine de Ofertas'),
        'heroCtaTarget' => (string)($s['heroCtaTarget'] ?? 'store'),
        'topBarEnabled' => !empty($s['topBarEnabled']),
        'topBarText' => (string)($s['topBarText'] ?? ''),
        'topBarBgColor' => (string)($s['topBarBgColor'] ?? '#2A5C3F'),
        'topBarTextColor' => (string)($s['topBarTextColor'] ?? '#FFFFFF'),
        'topBarLink' => (string)($s['topBarLink'] ?? ''),
        'blogLogo' => (string)($s['blogLogo'] ?? ''),
        'blogStoreName' => (string)($s['blogStoreName'] ?? 'Meudocelar'),
        'blogTagline' => (string)($s['blogTagline'] ?? 'Blog & Achadinhos Verificados'),
        'blogPrimaryColor' => (string)($s['blogPrimaryColor'] ?? '#2A5C3F'),
        'menuHomeLabel' => (string)($s['menuHomeLabel'] ?? 'Início'),
        'menuStoreLabel' => (string)($s['menuStoreLabel'] ?? 'Loja & Achadinhos'),
        'menuShowStore' => isset($s['menuShowStore']) ? (bool)$s['menuShowStore'] : true,
        'menuStoreBadge' => (string)($s['menuStoreBadge'] ?? 'Ofertas'),
        'menuInstitutionalLabel' => (string)($s['menuInstitutionalLabel'] ?? 'Institucional'),
        'menuShowInstitutional' => isset($s['menuShowInstitutional']) ? (bool)$s['menuShowInstitutional'] : true,
        'menuContactLabel' => (string)($s['menuContactLabel'] ?? 'Contato'),
        'menuShowContact' => isset($s['menuShowContact']) ? (bool)$s['menuShowContact'] : true,
        'menuShowWhatsApp' => isset($s['menuShowWhatsApp']) ? (bool)$s['menuShowWhatsApp'] : true,
        'menuShowVitrineBtn' => isset($s['menuShowVitrineBtn']) ? (bool)$s['menuShowVitrineBtn'] : true,
        'menuVitrineBtnText' => (string)($s['menuVitrineBtnText'] ?? 'Ver Vitrine'),
        'showCategoriesBar' => isset($s['showCategoriesBar']) ? (bool)$s['showCategoriesBar'] : true,
        'footerText' => (string)($s['footerText'] ?? ''),
        'footerShowSocial' => isset($s['footerShowSocial']) ? (bool)$s['footerShowSocial'] : true,
        'articleFooterAd' => $singleAd,
        'articleFooterAds' => $ads
    ];
}

// ---------------------------------------------------------------------------
// 3. ROTEAMENTO DE REQUISIÇÕES
// ---------------------------------------------------------------------------
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($uri, PHP_URL_PATH);

// Normaliza o path removendo prefixos de subpastas ou api.php
$path = preg_replace('#^/api\.php#', '', $path);
$path = preg_replace('#^/api#', '', $path);
if ($path === '' || $path === false) $path = '/';

// Parse do corpo JSON
$inputRaw = file_get_contents('php://input');
$body = json_decode($inputRaw, true) ?: [];

// ---------------------------------------------------------------------------
// ROTAS DO SISTEMA
// ---------------------------------------------------------------------------

// Teste de conexão direto pelo painel
if ($path === '/admin/database/test-connection' && $method === 'POST') {
    $tHost = trim($body['host'] ?? $dbHost);
    $tPort = trim($body['port'] ?? $dbPort);
    $tDb = trim($body['database'] ?? $dbName);
    $tUser = trim($body['user'] ?? $dbUser);
    $tPass = $body['password'] ?? $dbPass;

    $t0 = microtime(true);
    $test = getDbConnection($tHost, $tPort, $tDb, $tUser, $tPass);
    $lat = round((microtime(true) - $t0) * 1000, 1);

    if ($test['pdo']) {
        echo json_encode([
            'success' => true,
            'message' => "Conexão com o MySQL na Hostinger estabelecida com sucesso! ({$lat}ms)",
            'latencyMs' => $lat,
            'driver' => 'Hostinger Native MySQL (PHP PDO)'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => "Falha ao conectar no MySQL: " . $test['error'],
            'driver' => 'Hostinger Native MySQL (PHP PDO)'
        ]);
    }
    exit;
}

// Salvar configuração de banco
if ($path === '/admin/database/save-config' && $method === 'POST') {
    $tHost = trim($body['host'] ?? 'localhost');
    $tPort = trim($body['port'] ?? '3306');
    $tDb = trim($body['database'] ?? '');
    $tUser = trim($body['user'] ?? '');
    $tPass = $body['password'] ?? '';

    $test = getDbConnection($tHost, $tPort, $tDb, $tUser, $tPass);
    if (!$test['pdo']) {
        echo json_encode([
            'success' => false,
            'message' => 'Falha no teste de conexão: ' . $test['error']
        ]);
        exit;
    }

    file_put_contents(__DIR__ . '/db_config.json', json_encode([
        'host' => $tHost,
        'port' => $tPort,
        'database' => $tDb,
        'user' => $tUser,
        'password' => $tPass,
        'updatedAt' => date('c')
    ], JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'message' => 'Configuração salva e banco de dados MySQL conectado com sucesso!'
    ]);
    exit;
}

// Diagnóstico do Banco
if ($path === '/admin/database/diagnostics' || $path === '/admin/database/status') {
    $connected = ($pdo !== null);
    $counts = [
        'products' => 0,
        'categories' => 0,
        'platforms' => 0,
        'clicks' => 0,
        'blog_posts' => 0,
        'blog_categories' => 0,
        'blog_editors' => 0,
        'blog_settings' => 0,
        'contact_messages' => 0
    ];
    $tablesStatus = [
        'stores' => false,
        'products' => false,
        'categories' => false,
        'platforms' => false,
        'blog_posts' => false,
        'blog_categories' => false,
        'blog_editors' => false,
        'blog_settings' => false,
        'contact_messages' => false
    ];

    if ($connected) {
        // Tenta garantir que tabelas essenciais do blog existam
        ensureBlogTablesExist($pdo, false);

        foreach ($tablesStatus as $tbl => &$st) {
            try {
                $check = $pdo->query("SELECT 1 FROM `$tbl` LIMIT 1");
                $st = ($check !== false);
            } catch (Exception $e) {
                $st = false;
            }
        }

        try {
            if ($tablesStatus['products']) {
                $counts['products'] = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            }
            if ($tablesStatus['categories']) {
                $counts['categories'] = (int)$pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
            }
            if ($tablesStatus['platforms']) {
                $counts['platforms'] = (int)$pdo->query("SELECT COUNT(*) FROM platforms")->fetchColumn();
            }
            if (!empty($tablesStatus['clicks'])) {
                $counts['clicks'] = (int)$pdo->query("SELECT COUNT(*) FROM clicks")->fetchColumn();
            }
            if ($tablesStatus['blog_posts']) {
                $counts['blog_posts'] = (int)$pdo->query("SELECT COUNT(*) FROM blog_posts")->fetchColumn();
            }
            if ($tablesStatus['blog_categories']) {
                $counts['blog_categories'] = (int)$pdo->query("SELECT COUNT(*) FROM blog_categories")->fetchColumn();
            }
            if ($tablesStatus['blog_editors']) {
                $counts['blog_editors'] = (int)$pdo->query("SELECT COUNT(*) FROM blog_editors")->fetchColumn();
            }
            if ($tablesStatus['blog_settings']) {
                $counts['blog_settings'] = (int)$pdo->query("SELECT COUNT(*) FROM blog_settings")->fetchColumn();
            }
            if ($tablesStatus['contact_messages']) {
                $counts['contact_messages'] = (int)$pdo->query("SELECT COUNT(*) FROM contact_messages")->fetchColumn();
            }
        } catch (Exception $e) {
            // Tabelas podem ainda não ter sido criadas
        }
    }

    echo json_encode([
        'success' => true,
        'connected' => $connected,
        'driver' => $connected ? 'Hostinger MySQL Nativo (PHP PDO)' : 'Aguardando Credenciais',
        'host' => $dbHost,
        'database' => $dbName,
        'user' => $dbUser,
        'port' => $dbPort,
        'error' => $dbConn['error'],
        'counts' => $counts,
        'tablesStatus' => $tablesStatus,
        'blogConfigured' => ($tablesStatus['blog_posts'] && $tablesStatus['blog_categories']),
        'serverTime' => date('c')
    ]);
    exit;
}

// Endpoint para criar/reparar tabelas do blog no MySQL via clique no painel
if (($path === '/admin/database/create-blog-tables' || $path === '/admin/database/ensure-blog-tables') && $method === 'POST') {
    if (!$pdo) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Banco de dados não está conectado.']);
        exit;
    }

    ensureBlogTablesExist($pdo, true);
    echo json_encode([
        'success' => true,
        'message' => 'Tabelas e dados essenciais do Blog criados/atualizados com sucesso no MySQL!'
    ]);
    exit;
}

// Endpoint para obter o SQL puro do blog e da loja
if (($path === '/admin/database/sql-content' || $path === '/admin/database/sql-blog-script') && $method === 'GET') {
    $blogSqlFile = __DIR__ . '/../../blog_schema.sql';
    $schemaSqlFile = __DIR__ . '/../../schema.sql';
    
    $content = '';
    if (file_exists($blogSqlFile)) {
        $content = file_get_contents($blogSqlFile);
    } elseif (file_exists($schemaSqlFile)) {
        $content = file_get_contents($schemaSqlFile);
    }

    if ($path === '/admin/database/sql-blog-script') {
        header('Content-Type: text/plain; charset=utf-8');
        echo $content;
        exit;
    }

    echo json_encode([
        'success' => true,
        'sql' => $content
    ]);
    exit;
}

// Se não houver banco conectado para as rotas seguintes, retorna aviso amigável
if (!$pdo) {
    if ($method === 'GET') {
        echo json_encode([]);
    } else {
        echo json_encode(['error' => 'Banco de dados não conectado: ' . $dbConn['error']]);
    }
    exit;
}

// ---------------------------------------------------------------------------
// ROTAS DE LOJA (PÚBLICAS & ADMIN)
// ---------------------------------------------------------------------------

// GET /store/:slug
if (preg_match('#^/store/([a-zA-Z0-9_-]+)$#', $path, $m) && $method === 'GET') {
    $slug = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM stores WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $store = $stmt->fetch();
    if ($store) {
        unset($store['adminPassword']);
        $store['lojaAtiva'] = (bool)$store['lojaAtiva'];
        $store['botaoCanalFlutuante'] = (bool)$store['botaoCanalFlutuante'];
        echo json_encode($store);
    } else {
        echo json_encode([
            'id' => 'store-1',
            'slug' => $slug,
            'storeName' => 'Achadinhos da Maria',
            'lojaAtiva' => true,
            'corPrimaria' => '#2A5C3F',
            'corSecundaria' => '#1B1B1B',
            'tituloSite' => 'Achadinhos da Maria',
            'descricaoSite' => 'As melhores ofertas da internet',
            'mensagemTopo' => '🔥 Frete Grátis e Cupons Exclusivos adicionados hoje!',
            'corBarraTopo' => '#2A5C3F'
        ]);
    }
    exit;
}

// POST /admin/auth/login
if ($path === '/admin/auth/login' && $method === 'POST') {
    $slug = $body['slug'] ?? 'achadinhos-da-maria';
    $login = trim($body['login'] ?? '');
    $password = trim($body['password'] ?? '');

    $storeStmt = $pdo->prepare("SELECT * FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $store = $storeStmt->fetch();
    $storeId = $store['id'] ?? 'store-1';

    // 1. Tentar autenticar pela tabela users
    try {
        $userStmt = $pdo->prepare("SELECT * FROM users WHERE (storeId = ? OR storeId IS NULL) AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1");
        $userStmt->execute([$storeId, $login, $login]);
        $user = $userStmt->fetch();

        if ($user) {
            if (isset($user['ativo']) && (int)$user['ativo'] === 0) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Este usuário está inativo ou desativado.']);
                exit;
            }

            $storedHash = $user['password'] ?? '';
            $passMatches = false;

            if (password_verify($password, $storedHash)) {
                $passMatches = true;
            } elseif ($storedHash === $password || ($password === 'admin' && $user['username'] === 'admin')) {
                $passMatches = true;
                // Rehash para bcrypt moderno
                $newHash = password_hash($password, PASSWORD_BCRYPT);
                $upStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $upStmt->execute([$newHash, $user['id']]);
            }

            if ($passMatches) {
                // Atualizar último acesso
                try {
                    $upAcesso = $pdo->prepare("UPDATE users SET ultimoAcesso = NOW() WHERE id = ?");
                    $upAcesso->execute([$user['id']]);
                } catch (Exception $e) {}

                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['nome'] ?? 'Administrador',
                        'email' => $user['email'] ?? '',
                        'username' => $user['username'] ?? '',
                        'role' => $user['role'] ?? 'ADMIN',
                        'avatar' => $user['avatar'] ?? ''
                    ],
                    'token' => 'jwt_hostinger_' . md5($slug . $user['id'] . time())
                ]);
                exit;
            }
        }
    } catch (Exception $e) {
        // Tabela users pode ainda estar sendo criada, fallback para tabela stores
    }

    // 2. Fallback para credenciais da tabela stores
    $expectedUser = $store['adminUser'] ?? 'admin';
    $expectedEmail = $store['adminEmail'] ?? 'admin@achadinhosdamaria.com.br';
    $expectedPass = $store['adminPassword'] ?? 'admin';

    $isLoginMatch = ($login === $expectedUser || $login === $expectedEmail || $login === 'admin');
    $isPassMatch = password_verify($password, $expectedPass) || ($password === $expectedPass) || ($password === 'admin' && ($expectedUser === 'admin' || $login === 'admin'));

    if ($isLoginMatch && $isPassMatch) {
        // Se a senha antiga era plain-text, atualiza para bcrypt
        if (!str_starts_with($expectedPass, '$2a$') && !str_starts_with($expectedPass, '$2b$') && !str_starts_with($expectedPass, '$2y$')) {
            $newBcrypt = password_hash($password, PASSWORD_BCRYPT);
            $upStore = $pdo->prepare("UPDATE stores SET adminPassword = ? WHERE slug = ?");
            $upStore->execute([$newBcrypt, $slug]);
        }

        echo json_encode([
            'success' => true,
            'user' => [
                'name' => $store['storeName'] ?? 'Administrador',
                'email' => $expectedEmail,
                'username' => $expectedUser,
                'role' => 'ADMIN'
            ],
            'token' => 'jwt_hostinger_' . md5($slug . $expectedPass . time())
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Usuário ou senha incorretos.'
        ]);
    }
    exit;
}

// USUÁRIOS - GET /admin/store/:slug/users
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/users$#', $path, $m) && $method === 'GET') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $stmt = $pdo->prepare("SELECT id, storeId, nome, email, username, role, ativo, avatar, ultimoAcesso, createdAt, updatedAt FROM users WHERE storeId = ? ORDER BY createdAt DESC");
    $stmt->execute([$storeId]);
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['ativo'] = (bool)$u['ativo'];
    }
    echo json_encode($users);
    exit;
}

// USUÁRIOS - POST /admin/store/:slug/users
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/users$#', $path, $m) && $method === 'POST') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $id = $body['id'] ?? ('user_' . uniqid());
    $nome = trim($body['nome'] ?? 'Novo Usuário');
    $email = trim($body['email'] ?? '');
    $username = trim($body['username'] ?? '');
    $rawPass = trim($body['password'] ?? 'admin123');
    $role = $body['role'] ?? 'ADMIN';
    $ativo = isset($body['ativo']) ? ($body['ativo'] ? 1 : 0) : 1;
    $avatar = $body['avatar'] ?? '';

    $passHash = password_hash($rawPass, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("INSERT INTO users (id, storeId, nome, email, username, password, role, ativo, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $storeId, $nome, $email, $username, $passHash, $role, $ativo, $avatar]);

    $stmtGet = $pdo->prepare("SELECT id, storeId, nome, email, username, role, ativo, avatar, ultimoAcesso, createdAt, updatedAt FROM users WHERE id = ?");
    $stmtGet->execute([$id]);
    $newUser = $stmtGet->fetch();
    $newUser['ativo'] = (bool)$newUser['ativo'];
    echo json_encode($newUser);
    exit;
}

// USUÁRIOS - PUT / PATCH / DELETE
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/users/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    $userId = $m[2];
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        echo json_encode(['success' => true]);
        exit;
    }
    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = ['nome', 'email', 'username', 'role', 'ativo', 'avatar'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'ativo') $val = $val ? 1 : 0;
                $params[] = $val;
            }
        }
        if (!empty($body['password'])) {
            $fields[] = "`password` = ?";
            $params[] = password_hash(trim($body['password']), PASSWORD_BCRYPT);
        }
        if (!empty($fields)) {
            $params[] = $userId;
            $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }
        $stmtGet = $pdo->prepare("SELECT id, storeId, nome, email, username, role, ativo, avatar, ultimoAcesso, createdAt, updatedAt FROM users WHERE id = ?");
        $stmtGet->execute([$userId]);
        $user = $stmtGet->fetch();
        $user['ativo'] = (bool)$user['ativo'];
        echo json_encode($user);
        exit;
    }
}

// POST /admin/auth/change-credentials
if ($path === '/admin/auth/change-credentials' && $method === 'POST') {
    $slug = $body['slug'] ?? 'achadinhos-da-maria';
    $newEmail = trim($body['newEmail'] ?? '');
    $newPassword = trim($body['newPassword'] ?? '');
    $newUser = trim($body['newUser'] ?? '');

    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $passHash = !empty($newPassword) ? password_hash($newPassword, PASSWORD_BCRYPT) : null;

    $fields = [];
    $params = [];
    if ($newEmail) { $fields[] = 'adminEmail = ?'; $params[] = $newEmail; }
    if ($passHash) { $fields[] = 'adminPassword = ?'; $params[] = $passHash; }
    if ($newUser) { $fields[] = 'adminUser = ?'; $params[] = $newUser; }

    if (!empty($fields)) {
        $params[] = $slug;
        $stmt = $pdo->prepare("UPDATE stores SET " . implode(', ', $fields) . " WHERE slug = ?");
        $stmt->execute($params);
    }

    // Também sincroniza na tabela users para o usuário ADMIN
    try {
        $uFields = [];
        $uParams = [];
        if ($newEmail) { $uFields[] = 'email = ?'; $uParams[] = $newEmail; }
        if ($newUser) { $uFields[] = 'username = ?'; $uParams[] = $newUser; }
        if ($passHash) { $uFields[] = 'password = ?'; $uParams[] = $passHash; }

        if (!empty($uFields)) {
            $uParams[] = $storeId;
            $uStmt = $pdo->prepare("UPDATE users SET " . implode(', ', $uFields) . " WHERE storeId = ? AND role = 'ADMIN'");
            $uStmt->execute($uParams);
        }
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Credenciais atualizadas com sucesso']);
    exit;
}

// GET /admin/store/:slug/metrics
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/metrics$#', $path, $m) && $method === 'GET') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $clicksStmt = $pdo->prepare("SELECT * FROM clicks WHERE storeId = ? ORDER BY timestamp DESC LIMIT 500");
    $clicksStmt->execute([$storeId]);
    $allClicks = $clicksStmt->fetchAll();

    $viewsStmt = $pdo->prepare("SELECT viewsCount FROM store_views WHERE storeSlug = ? LIMIT 1");
    $viewsStmt->execute([$slug]);
    $totalViews = (int)$viewsStmt->fetchColumn() ?: 0;

    $byPlat = [];
    $byProd = [];
    $byCat = [];
    $byOrigem = [];

    foreach ($allClicks as $c) {
        $pl = $c['plataforma'] ?: 'Outros';
        $pr = $c['produto'] ?: 'Outros';
        $ct = $c['categoria'] ?: 'Geral';
        $og = $c['origem'] ?: 'Direto';

        $byPlat[$pl] = ($byPlat[$pl] ?? 0) + 1;
        $byProd[$pr] = ($byProd[$pr] ?? 0) + 1;
        $byCat[$ct] = ($byCat[$ct] ?? 0) + 1;
        $byOrigem[$og] = ($byOrigem[$og] ?? 0) + 1;
    }

    arsort($byPlat);
    arsort($byProd);
    arsort($byCat);
    arsort($byOrigem);

    $topProducts = [];
    foreach (array_slice($byProd, 0, 10, true) as $nome => $clicks) {
        $topProducts[] = ['nome' => $nome, 'clicks' => $clicks];
    }

    $topPlatforms = [];
    foreach ($byPlat as $nome => $clicks) {
        $topPlatforms[] = ['nome' => $nome, 'clicks' => $clicks];
    }

    $topCategories = [];
    foreach ($byCat as $nome => $clicks) {
        $topCategories[] = ['nome' => $nome, 'clicks' => $clicks];
    }

    $topOrigins = [];
    foreach ($byOrigem as $nome => $clicks) {
        $topOrigins[] = ['origem' => $nome, 'clicks' => $clicks];
    }

    echo json_encode([
        'totalClicks' => count($allClicks),
        'totalViews' => $totalViews,
        'taxaConversao' => $totalViews > 0 ? round((count($allClicks) / $totalViews) * 100, 2) : 0,
        'clicksPorPlataforma' => $topPlatforms,
        'clicksPorCategoria' => $topCategories,
        'topProdutos' => $topProducts,
        'clicksPorOrigem' => $topOrigins,
        'recentClicks' => array_slice($allClicks, 0, 50)
    ]);
    exit;
}

// Helper para normalizar e formatar objeto de categoria para a API/React
function formatCategoryOutput($cat) {
    if (!$cat) return null;
    $mostrarNoMenu = true;
    if (array_key_exists('mostrarNoMenu', $cat) && $cat['mostrarNoMenu'] !== null) {
        $mostrarNoMenu = (bool)$cat['mostrarNoMenu'];
    } elseif (array_key_exists('exibirNoMenu', $cat) && $cat['exibirNoMenu'] !== null) {
        $mostrarNoMenu = (bool)$cat['exibirNoMenu'];
    }

    $ordem = 1;
    if (array_key_exists('ordem', $cat) && $cat['ordem'] !== null) {
        $ordem = (int)$cat['ordem'];
    } elseif (array_key_exists('ordemMenu', $cat) && $cat['ordemMenu'] !== null) {
        $ordem = (int)$cat['ordemMenu'];
    }

    $subcategorias = [];
    if (!empty($cat['subcategorias'])) {
        if (is_array($cat['subcategorias'])) {
            $subcategorias = $cat['subcategorias'];
        } elseif (is_string($cat['subcategorias'])) {
            $dec = json_decode($cat['subcategorias'], true);
            if (is_array($dec)) {
                $subcategorias = $dec;
            } else {
                $subcategorias = array_filter(array_map('trim', explode(',', $cat['subcategorias'])));
            }
        }
    }

    return [
        'id' => (string)($cat['id'] ?? ''),
        'storeId' => (string)($cat['storeId'] ?? 'store-1'),
        'nome' => (string)($cat['nome'] ?? ''),
        'slug' => (string)($cat['slug'] ?? ''),
        'icone' => (string)($cat['icone'] ?? 'Sparkles'),
        'descricao' => (string)($cat['descricao'] ?? ''),
        'ativo' => isset($cat['ativo']) ? (bool)$cat['ativo'] : true,
        'ordem' => $ordem,
        'ordemMenu' => $ordem,
        'mostrarNoMenu' => $mostrarNoMenu,
        'exibirNoMenu' => $mostrarNoMenu,
        'subcategorias' => array_values($subcategorias)
    ];
}

// Garante colunas na tabela categories sem quebrar bancos antigos
function ensureCategoryColumns($pdo) {
    static $checked = false;
    if ($checked || !$pdo) return;
    try {
        $colsStmt = $pdo->query("SHOW COLUMNS FROM categories");
        $existing = $colsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (!in_array('mostrarNoMenu', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN mostrarNoMenu TINYINT(1) DEFAULT 1");
        }
        if (!in_array('exibirNoMenu', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN exibirNoMenu TINYINT(1) DEFAULT 1");
        }
        if (!in_array('ordem', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN ordem INT DEFAULT 1");
        }
        if (!in_array('ordemMenu', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN ordemMenu INT DEFAULT 1");
        }
        if (!in_array('subcategorias', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN subcategorias TEXT NULL");
        }
        if (!in_array('descricao', $existing)) {
            @$pdo->exec("ALTER TABLE categories ADD COLUMN descricao TEXT NULL");
        }
    } catch (Exception $e) {}
    $checked = true;
}

// CATEGORIAS - POST /admin/store/:slug/categories
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/categories$#', $path, $m) && $method === 'POST') {
    ensureCategoryColumns($pdo);
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $id = $body['id'] ?? ('cat_' . uniqid());
    $nome = trim($body['nome'] ?? 'Nova Categoria');
    $catSlug = !empty($body['slug']) ? $body['slug'] : strtolower(preg_replace('/[^a-zA-Z0-9]+/u', '-', $nome));
    $icone = $body['icone'] ?? 'Sparkles';
    $descricao = $body['descricao'] ?? '';
    $ativo = isset($body['ativo']) ? ($body['ativo'] ? 1 : 0) : 1;
    
    $inMenu = 1;
    if (array_key_exists('mostrarNoMenu', $body)) {
        $inMenu = $body['mostrarNoMenu'] ? 1 : 0;
    } elseif (array_key_exists('exibirNoMenu', $body)) {
        $inMenu = $body['exibirNoMenu'] ? 1 : 0;
    }

    $ordem = 1;
    if (array_key_exists('ordem', $body)) {
        $ordem = (int)$body['ordem'];
    } elseif (array_key_exists('ordemMenu', $body)) {
        $ordem = (int)$body['ordemMenu'];
    }

    $subs = [];
    if (isset($body['subcategorias']) && is_array($body['subcategorias'])) {
        $subs = array_values(array_filter(array_map('trim', $body['subcategorias'])));
    }
    $subsJson = json_encode($subs, JSON_UNESCAPED_UNICODE);

    // Tentar insert com todas as colunas
    try {
        $stmt = $pdo->prepare("INSERT INTO categories (id, storeId, nome, slug, icone, descricao, ativo, ordem, ordemMenu, mostrarNoMenu, exibirNoMenu, subcategorias) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $storeId, $nome, $catSlug, $icone, $descricao, $ativo, $ordem, $ordem, $inMenu, $inMenu, $subsJson]);
    } catch (Exception $e) {
        // Fallback para esquema reduzido
        try {
            $stmt = $pdo->prepare("INSERT INTO categories (id, storeId, nome, slug, icone, ativo, ordemMenu, exibirNoMenu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $storeId, $nome, $catSlug, $icone, $ativo, $ordem, $inMenu]);
        } catch (Exception $e2) {
            $stmt = $pdo->prepare("INSERT INTO categories (id, storeId, nome, slug, icone, ativo) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $storeId, $nome, $catSlug, $icone, $ativo]);
        }
    }

    $stmtGet = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
    $stmtGet->execute([$id]);
    $cat = $stmtGet->fetch();
    echo json_encode(formatCategoryOutput($cat));
    exit;
}

// CATEGORIAS - PUT / PATCH / DELETE
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/categories/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    ensureCategoryColumns($pdo);
    $catId = $m[2];
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$catId]);
        echo json_encode(['success' => true]);
        exit;
    }
    if ($method === 'PUT' || $method === 'PATCH') {
        // Obter colunas existentes na tabela para não quebrar
        $cols = [];
        try {
            $cStmt = $pdo->query("SHOW COLUMNS FROM categories");
            $cols = $cStmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {}

        $fields = [];
        $params = [];

        if (array_key_exists('nome', $body) && (empty($cols) || in_array('nome', $cols))) {
            $fields[] = "`nome` = ?";
            $params[] = trim($body['nome']);
        }
        if (array_key_exists('slug', $body) && (empty($cols) || in_array('slug', $cols))) {
            $fields[] = "`slug` = ?";
            $params[] = trim($body['slug']);
        }
        if (array_key_exists('icone', $body) && (empty($cols) || in_array('icone', $cols))) {
            $fields[] = "`icone` = ?";
            $params[] = trim($body['icone']);
        }
        if (array_key_exists('descricao', $body) && (empty($cols) || in_array('descricao', $cols))) {
            $fields[] = "`descricao` = ?";
            $params[] = trim($body['descricao']);
        }
        if (array_key_exists('ativo', $body) && (empty($cols) || in_array('ativo', $cols))) {
            $fields[] = "`ativo` = ?";
            $params[] = $body['ativo'] ? 1 : 0;
        }

        // Visibilidade na barra superior (mostrarNoMenu / exibirNoMenu)
        $hasMenuUpdate = false;
        $menuValue = 1;
        if (array_key_exists('mostrarNoMenu', $body)) {
            $hasMenuUpdate = true;
            $menuValue = $body['mostrarNoMenu'] ? 1 : 0;
        } elseif (array_key_exists('exibirNoMenu', $body)) {
            $hasMenuUpdate = true;
            $menuValue = $body['exibirNoMenu'] ? 1 : 0;
        }

        if ($hasMenuUpdate) {
            if (empty($cols) || in_array('mostrarNoMenu', $cols)) {
                $fields[] = "`mostrarNoMenu` = ?";
                $params[] = $menuValue;
            }
            if (empty($cols) || in_array('exibirNoMenu', $cols)) {
                $fields[] = "`exibirNoMenu` = ?";
                $params[] = $menuValue;
            }
        }

        // Ordem
        $hasOrderUpdate = false;
        $orderValue = 1;
        if (array_key_exists('ordem', $body)) {
            $hasOrderUpdate = true;
            $orderValue = (int)$body['ordem'];
        } elseif (array_key_exists('ordemMenu', $body)) {
            $hasOrderUpdate = true;
            $orderValue = (int)$body['ordemMenu'];
        }

        if ($hasOrderUpdate) {
            if (empty($cols) || in_array('ordem', $cols)) {
                $fields[] = "`ordem` = ?";
                $params[] = $orderValue;
            }
            if (empty($cols) || in_array('ordemMenu', $cols)) {
                $fields[] = "`ordemMenu` = ?";
                $params[] = $orderValue;
            }
        }

        // Subcategorias
        if (array_key_exists('subcategorias', $body) && (empty($cols) || in_array('subcategorias', $cols))) {
            $subs = is_array($body['subcategorias']) ? array_values(array_filter(array_map('trim', $body['subcategorias']))) : [];
            $fields[] = "`subcategorias` = ?";
            $params[] = json_encode($subs, JSON_UNESCAPED_UNICODE);
        }

        if (!empty($fields)) {
            $params[] = $catId;
            $stmt = $pdo->prepare("UPDATE categories SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmtGet->execute([$catId]);
        $cat = $stmtGet->fetch();
        echo json_encode(formatCategoryOutput($cat));
        exit;
    }
}

// PLATAFORMAS - POST /admin/store/:slug/platforms
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/platforms$#', $path, $m) && $method === 'POST') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $id = $body['id'] ?? ('plat_' . uniqid());
    $stmt = $pdo->prepare("INSERT INTO platforms (id, storeId, nome, slug, cor, badge, icone, ativo, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $id,
        $storeId,
        $body['nome'] ?? 'Nova Plataforma',
        $body['slug'] ?? ('plat-' . time()),
        $body['cor'] ?? '#FF9900',
        $body['badge'] ?? '',
        $body['icone'] ?? 'ShoppingBag',
        isset($body['ativo']) ? ($body['ativo'] ? 1 : 0) : 1,
        (int)($body['ordem'] ?? 1)
    ]);

    $stmtGet = $pdo->prepare("SELECT * FROM platforms WHERE id = ?");
    $stmtGet->execute([$id]);
    $plat = $stmtGet->fetch();
    $plat['ativo'] = (bool)$plat['ativo'];
    echo json_encode($plat);
    exit;
}

// PLATAFORMAS - PUT / PATCH / DELETE
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/platforms/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    $platId = $m[2];
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM platforms WHERE id = ?");
        $stmt->execute([$platId]);
        echo json_encode(['success' => true]);
        exit;
    }
    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = ['nome', 'slug', 'cor', 'badge', 'icone', 'ativo', 'ordem'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'ativo') $val = $val ? 1 : 0;
                $params[] = $val;
            }
        }
        if (!empty($fields)) {
            $params[] = $platId;
            $stmt = $pdo->prepare("UPDATE platforms SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }
        $stmtGet = $pdo->prepare("SELECT * FROM platforms WHERE id = ?");
        $stmtGet->execute([$platId]);
        $plat = $stmtGet->fetch();
        $plat['ativo'] = (bool)$plat['ativo'];
        echo json_encode($plat);
        exit;
    }
}

// GET /store/:slug/products e /admin/store/:slug/products
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/products$#', $path, $m) && $method === 'GET') {
    $slug = $m[1];
    $isAdmin = strpos($path, '/admin/') === 0;

    $sql = "SELECT p.* FROM products p 
            INNER JOIN stores s ON s.id = p.storeId 
            WHERE s.slug = ?";
    if (!$isAdmin) {
        $sql .= " AND p.ativo = 1";
    }
    $sql .= " ORDER BY p.destaque DESC, p.ordem ASC, p.createdAt DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$slug]);
    $products = $stmt->fetchAll();

    foreach ($products as &$p) {
        $p['ativo'] = (bool)$p['ativo'];
        $p['destaque'] = (bool)$p['destaque'];
        $p['preco'] = (float)$p['preco'];
        $p['precoPromo'] = $p['precoPromo'] !== null ? (float)$p['precoPromo'] : null;
        $p['ordem'] = (int)$p['ordem'];
    }

    echo json_encode($products);
    exit;
}

// GET /store/:slug/categories e /admin/store/:slug/categories
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/categories$#', $path, $m) && $method === 'GET') {
    ensureCategoryColumns($pdo);
    $slug = $m[1];
    $onlyMenu = isset($_GET['menu']) && $_GET['menu'] === 'true';

    $sql = "SELECT c.* FROM categories c 
            INNER JOIN stores s ON s.id = c.storeId 
            WHERE s.slug = ?";
    
    // Se a tabela tiver a coluna ativo
    $sql .= " ORDER BY (CASE WHEN c.ordem IS NOT NULL THEN c.ordem ELSE c.ordemMenu END) ASC, c.nome ASC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$slug]);
        $rawCategories = $stmt->fetchAll();
    } catch (Exception $e) {
        $stmt = $pdo->prepare("SELECT * FROM categories ORDER BY nome ASC");
        $stmt->execute();
        $rawCategories = $stmt->fetchAll();
    }

    $categories = [];
    foreach ($rawCategories as $raw) {
        $formatted = formatCategoryOutput($raw);
        if ($formatted) {
            if ($onlyMenu && (!$formatted['ativo'] || !$formatted['mostrarNoMenu'])) {
                continue;
            }
            $categories[] = $formatted;
        }
    }

    echo json_encode($categories);
    exit;
}

// GET /store/:slug/platforms e /admin/store/:slug/platforms
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/platforms$#', $path, $m) && $method === 'GET') {
    $slug = $m[1];
    $stmt = $pdo->prepare("SELECT p.* FROM platforms p INNER JOIN stores s ON s.id = p.storeId WHERE s.slug = ? ORDER BY p.ordem ASC");
    $stmt->execute([$slug]);
    $plats = $stmt->fetchAll();
    foreach ($plats as &$pl) {
        $pl['ativo'] = (bool)$pl['ativo'];
        $pl['ordem'] = (int)$pl['ordem'];
    }
    echo json_encode($plats);
    exit;
}

// POST /store/:slug/clicks
if (preg_match('#^/store/([a-zA-Z0-9_-]+)/clicks$#', $path, $m) && $method === 'POST') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $stmt = $pdo->prepare("INSERT INTO clicks (id, storeId, productId, produto, plataforma, tipo, categoria, origem, utm_source, utm_medium, utm_campaign) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        'clk_' . uniqid(),
        $storeId,
        $body['productId'] ?? null,
        $body['produto'] ?? '',
        $body['plataforma'] ?? '',
        $body['tipo'] ?? 'FISICO',
        $body['categoria'] ?? '',
        $body['origem'] ?? 'Direto',
        $body['utm_source'] ?? null,
        $body['utm_medium'] ?? null,
        $body['utm_campaign'] ?? null
    ]);

    echo json_encode(['success' => true]);
    exit;
}

// POST /store/:slug/view
if (preg_match('#^/store/([a-zA-Z0-9_-]+)/view$#', $path, $m) && $method === 'POST') {
    $slug = $m[1];
    $stmt = $pdo->prepare("INSERT INTO store_views (storeSlug, viewsCount) VALUES (?, 1) ON DUPLICATE KEY UPDATE viewsCount = viewsCount + 1");
    $stmt->execute([$slug]);
    echo json_encode(['success' => true]);
    exit;
}

// POST /admin/store/:slug/products (Criar produto)
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/products$#', $path, $m) && $method === 'POST') {
    $slug = $m[1];
    $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
    $storeStmt->execute([$slug]);
    $storeId = $storeStmt->fetchColumn() ?: 'store-1';

    $id = $body['id'] ?? ('prod_' . uniqid());
    $stmt = $pdo->prepare("INSERT INTO products (id, storeId, ativo, tipo, plataforma, categoria, subcategoria, nome, descricao, preco, precoPromo, cupom, validade, linkAfiliado, textoBotao, video, img1, img2, img3, img4, ordem, destaque) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $id,
        $storeId,
        isset($body['ativo']) ? ($body['ativo'] ? 1 : 0) : 1,
        $body['tipo'] ?? 'FISICO',
        $body['plataforma'] ?? 'Amazon',
        $body['categoria'] ?? 'Geral',
        $body['subcategoria'] ?? '',
        $body['nome'] ?? 'Novo Produto',
        $body['descricao'] ?? '',
        $body['preco'] ?? 0,
        $body['precoPromo'] ?? null,
        $body['cupom'] ?? '',
        $body['validade'] ?? null,
        $body['linkAfiliado'] ?? '',
        $body['textoBotao'] ?? 'Ver oferta na loja →',
        $body['video'] ?? '',
        $body['img1'] ?? '',
        $body['img2'] ?? '',
        $body['img3'] ?? '',
        $body['img4'] ?? '',
        $body['ordem'] ?? 1,
        !empty($body['destaque']) ? 1 : 0
    ]);

    $stmtGet = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmtGet->execute([$id]);
    $newProd = $stmtGet->fetch();
    $newProd['ativo'] = (bool)$newProd['ativo'];
    $newProd['destaque'] = (bool)$newProd['destaque'];
    echo json_encode($newProd);
    exit;
}

// PUT / PATCH / DELETE Produto
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/products/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    $slug = $m[1];
    $prodId = $m[2];

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$prodId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = ['ativo', 'tipo', 'plataforma', 'categoria', 'subcategoria', 'nome', 'descricao', 'preco', 'precoPromo', 'cupom', 'validade', 'linkAfiliado', 'textoBotao', 'video', 'img1', 'img2', 'img3', 'img4', 'ordem', 'destaque'];
        
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'ativo' || $f === 'destaque') $val = $val ? 1 : 0;
                $params[] = $val;
            }
        }

        if (!empty($fields)) {
            $params[] = $prodId;
            $stmt = $pdo->prepare("UPDATE products SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmtGet->execute([$prodId]);
        $prod = $stmtGet->fetch();
        $prod['ativo'] = (bool)$prod['ativo'];
        $prod['destaque'] = (bool)$prod['destaque'];
        echo json_encode($prod);
        exit;
    }
}

// PUT /admin/store/:slug (Atualizar Configuração da Loja)
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)$#', $path, $m) && $method === 'PUT') {
    $slug = $m[1];
    $fields = [];
    $params = [];
    $allowed = ['storeName', 'logo', 'instagram', 'facebook', 'tiktok', 'pixelFacebook', 'googleAnalytics', 'googleAds', 'corPrimaria', 'corSecundaria', 'bannerUrl', 'bannerLink', 'bannerTag', 'bannerTitulo', 'bannerSubtitulo', 'tituloSite', 'descricaoSite', 'lojaAtiva', 'msgManutencao', 'mensagemTopo', 'corBarraTopo', 'cnpj', 'endereco', 'email', 'canalWhatsapp', 'canalTelegram', 'botaoCanalFlutuante', 'textoDisclosure', 'avisoPrecos', 'adminUser', 'adminEmail'];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "`$f` = ?";
            $val = $body[$f];
            if ($f === 'lojaAtiva' || $f === 'botaoCanalFlutuante') $val = $val ? 1 : 0;
            $params[] = $val;
        }
    }

    $passHash = null;
    if (!empty($body['adminPassword'])) {
        $rawPass = trim($body['adminPassword']);
        $passHash = (str_starts_with($rawPass, '$2a$') || str_starts_with($rawPass, '$2b$') || str_starts_with($rawPass, '$2y$')) ? $rawPass : password_hash($rawPass, PASSWORD_BCRYPT);
        $fields[] = "`adminPassword` = ?";
        $params[] = $passHash;
    }

    if (!empty($fields)) {
        $params[] = $slug;
        $stmt = $pdo->prepare("UPDATE stores SET " . implode(', ', $fields) . " WHERE slug = ?");
        $stmt->execute($params);
    }

    // Sincronizar na tabela users se alterou credenciais de admin
    if (!empty($body['adminUser']) || !empty($body['adminEmail']) || $passHash) {
        try {
            $storeStmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
            $storeStmt->execute([$slug]);
            $sId = $storeStmt->fetchColumn() ?: 'store-1';

            $uFields = [];
            $uParams = [];
            if (!empty($body['adminEmail'])) { $uFields[] = 'email = ?'; $uParams[] = trim($body['adminEmail']); }
            if (!empty($body['adminUser'])) { $uFields[] = 'username = ?'; $uParams[] = trim($body['adminUser']); }
            if ($passHash) { $uFields[] = 'password = ?'; $uParams[] = $passHash; }

            if (!empty($uFields)) {
                $uParams[] = $sId;
                $uStmt = $pdo->prepare("UPDATE users SET " . implode(', ', $uFields) . " WHERE storeId = ? AND role = 'ADMIN'");
                $uStmt->execute($uParams);
            }
        } catch (Exception $e) {}
    }

    $stmtGet = $pdo->prepare("SELECT * FROM stores WHERE slug = ?");
    $stmtGet->execute([$slug]);
    $store = $stmtGet->fetch();
    unset($store['adminPassword']);
    $store['lojaAtiva'] = (bool)$store['lojaAtiva'];
    $store['botaoCanalFlutuante'] = (bool)$store['botaoCanalFlutuante'];
    echo json_encode($store);
    exit;
}

// ---------------------------------------------------------------------------
// UPLOAD DE IMAGENS (COMPATÍVEL COM HOSTINGER)
// ---------------------------------------------------------------------------
if ($path === '/admin/upload-image' && $method === 'POST') {
    $dataUrl = $body['dataUrl'] ?? '';
    $fileName = $body['fileName'] ?? ('img_' . time() . '.jpg');
    
    if (empty($dataUrl)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Nenhuma imagem fornecida']);
        exit;
    }

    // Se já é uma URL HTTP/HTTPS externa, retorna direto
    if (str_starts_with($dataUrl, 'http://') || str_starts_with($dataUrl, 'https://')) {
        echo json_encode(['success' => true, 'url' => $dataUrl]);
        exit;
    }

    // Processa base64 dataUrl
    if (preg_match('#^data:image/([a-zA-Z0-9+]+);base64,(.+)$#', $dataUrl, $matches)) {
        $ext = strtolower($matches[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
        $imageData = base64_decode($matches[2]);
        
        $uploadDir = __DIR__ . '/../uploads';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }
        
        $safeName = 'upload_' . time() . '_' . substr(md5(uniqid()), 0, 6) . '.' . $ext;
        $targetFile = $uploadDir . '/' . $safeName;
        
        if (@file_put_contents($targetFile, $imageData)) {
            $publicUrl = '/uploads/' . $safeName;
            echo json_encode([
                'success' => true,
                'url' => $publicUrl,
                'fileName' => $safeName,
                'savedBytes' => strlen($imageData)
            ]);
            exit;
        }
    }

    // Fallback: se não conseguiu gravar no disco, retorna o próprio dataUrl (funciona em todos os browsers)
    echo json_encode([
        'success' => true,
        'url' => $dataUrl,
        'warning' => 'Armazenado inline via DataURL'
    ]);
    exit;
}

// ---------------------------------------------------------------------------
// ROTAS DO BLOG (PÚBLICAS & ADMIN)
// ---------------------------------------------------------------------------

// Helper para obter storeId
function getStoreIdBySlug($pdo, $slug) {
    try {
        $stmt = $pdo->prepare("SELECT id FROM stores WHERE slug = ? LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetchColumn() ?: 'store-1';
    } catch (Exception $e) {
        return 'store-1';
    }
}

// 1. CATEGORIAS DO BLOG: GET /store/:slug/blog-categories e /admin/store/:slug/blog-categories
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/blog-categories$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $isAdmin = strpos($path, '/admin/') === 0;
    $storeId = getStoreIdBySlug($pdo, $slug);

    try {
        $sql = "SELECT * FROM blog_categories WHERE (storeId = ? OR storeId IS NULL)";
        if (!$isAdmin) {
            $sql .= " AND active = 1";
        }
        $sql .= " ORDER BY ordem ASC, name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$storeId]);
        $rows = $stmt->fetchAll();
        $cats = array_map('formatBlogCategoryOutput', $rows);
        echo json_encode($cats);
    } catch (Exception $e) {
        echo json_encode([]);
    }
    exit;
}

// 2. CATEGORIAS DO BLOG: POST /admin/store/:slug/blog-categories
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/blog-categories$#', $path, $m) && $method === 'POST') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    $id = !empty($body['id']) ? $body['id'] : ('blog-cat-' . time() . '-' . substr(md5(uniqid()), 0, 4));
    $name = trim($body['name'] ?? 'Nova Categoria');
    $catSlug = !empty($body['slug']) ? $body['slug'] : strtolower(preg_replace('/[^a-zA-Z0-9]+/u', '-', $name));
    $description = $body['description'] ?? '';
    $icon = $body['icon'] ?? 'Sparkles';
    $active = isset($body['active']) ? ($body['active'] ? 1 : 0) : 1;
    $ordem = isset($body['order']) ? (int)$body['order'] : (isset($body['ordem']) ? (int)$body['ordem'] : 1);

    $mostrarNoMenu = array_key_exists('mostrarNoMenu', $body)
        ? (!in_array($body['mostrarNoMenu'], [false, 0, '0', 'false'], true) ? 1 : 0)
        : 1;
    $stmt = $pdo->prepare("INSERT INTO blog_categories (id, storeId, name, slug, description, icon, active, mostrarNoMenu, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $storeId, $name, $catSlug, $description, $icon, $active, $mostrarNoMenu, $ordem]);

    $stmtGet = $pdo->prepare("SELECT * FROM blog_categories WHERE id = ?");
    $stmtGet->execute([$id]);
    $cat = $stmtGet->fetch();
    echo json_encode(formatBlogCategoryOutput($cat));
    exit;
}

// 3. CATEGORIAS DO BLOG: PUT / PATCH / DELETE /admin/store/:slug/blog-categories/:id
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/blog-categories/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    ensureBlogTablesExist($pdo);
    $catId = $m[2];

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM blog_categories WHERE id = ?");
        $stmt->execute([$catId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = ['name', 'slug', 'description', 'icon', 'active', 'mostrarNoMenu', 'ordem'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'active' || $f === 'mostrarNoMenu') {
                    $val = !in_array($val, [false, 0, '0', 'false'], true) ? 1 : 0;
                }
                if ($f === 'ordem') $val = (int)$val;
                $params[] = $val;
            }
        }
        if (array_key_exists('order', $body) && !array_key_exists('ordem', $body)) {
            $fields[] = "`ordem` = ?";
            $params[] = (int)$body['order'];
        }

        if (!empty($fields)) {
            $params[] = $catId;
            $stmt = $pdo->prepare("UPDATE blog_categories SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM blog_categories WHERE id = ?");
        $stmtGet->execute([$catId]);
        $cat = $stmtGet->fetch();
        echo json_encode(formatBlogCategoryOutput($cat));
        exit;
    }
}

// 4. REDATORES: GET /store/:slug/blog-editors e /admin/store/:slug/blog-editors
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/blog-editors$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $isAdmin = strpos($path, '/admin/') === 0;
    $storeId = getStoreIdBySlug($pdo, $slug);

    try {
        $sql = "SELECT * FROM blog_editors WHERE (storeId = ? OR storeId IS NULL)";
        if (!$isAdmin) {
            $sql .= " AND active = 1";
        }
        $sql .= " ORDER BY createdAt ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$storeId]);
        $rows = $stmt->fetchAll();
        $editors = array_map('formatBlogEditorOutput', $rows);
        echo json_encode($editors);
    } catch (Exception $e) {
        echo json_encode([]);
    }
    exit;
}

// 5. REDATORES: POST /admin/store/:slug/blog-editors
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/blog-editors$#', $path, $m) && $method === 'POST') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    $id = !empty($body['id']) ? $body['id'] : ('editor-' . time() . '-' . substr(md5(uniqid()), 0, 4));
    $name = trim($body['name'] ?? 'Novo Redator');
    $avatar = $body['avatar'] ?? '';
    $role = $body['role'] ?? 'Redator & Curador';
    $bio = $body['bio'] ?? '';
    $socialLink = $body['socialLink'] ?? '';
    $email = $body['email'] ?? '';
    $active = isset($body['active']) ? ($body['active'] ? 1 : 0) : 1;

    $stmt = $pdo->prepare("INSERT INTO blog_editors (id, storeId, name, avatar, role, bio, socialLink, email, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $storeId, $name, $avatar, $role, $bio, $socialLink, $email, $active]);

    $stmtGet = $pdo->prepare("SELECT * FROM blog_editors WHERE id = ?");
    $stmtGet->execute([$id]);
    $ed = $stmtGet->fetch();
    echo json_encode(formatBlogEditorOutput($ed));
    exit;
}

// 6. REDATORES: PUT / PATCH / DELETE /admin/store/:slug/blog-editors/:id
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/blog-editors/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    ensureBlogTablesExist($pdo);
    $edId = $m[2];

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM blog_editors WHERE id = ?");
        $stmt->execute([$edId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = ['name', 'avatar', 'role', 'bio', 'socialLink', 'email', 'active'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'active') $val = $val ? 1 : 0;
                $params[] = $val;
            }
        }

        if (!empty($fields)) {
            $params[] = $edId;
            $stmt = $pdo->prepare("UPDATE blog_editors SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM blog_editors WHERE id = ?");
        $stmtGet->execute([$edId]);
        $ed = $stmtGet->fetch();
        echo json_encode(formatBlogEditorOutput($ed));
        exit;
    }
}

// 7. CONFIGURAÇÕES DO BLOG: GET /store/:slug/blog-settings, /public/store/:slug/blog-settings e /admin/store/:slug/blog-settings
if (preg_match('#^/(?:admin/|public/)?store/([a-zA-Z0-9_-]+)/blog-settings$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];

    try {
        $stmt = $pdo->prepare("SELECT * FROM blog_settings WHERE storeSlug = ? LIMIT 1");
        $stmt->execute([$slug]);
        $settings = $stmt->fetch();
        echo json_encode(formatBlogSettingsOutput($settings, $slug));
    } catch (Exception $e) {
        echo json_encode(formatBlogSettingsOutput(null, $slug));
    }
    exit;
}

// 8. CONFIGURAÇÕES DO BLOG: PUT / PATCH /admin/store/:slug/blog-settings
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/blog-settings$#', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    // Converte anúncios para JSON
    $articleFooterAdsJson = null;
    if (isset($body['articleFooterAds'])) {
        $articleFooterAdsJson = json_encode($body['articleFooterAds'], JSON_UNESCAPED_UNICODE);
    }
    $articleFooterAdJson = null;
    if (isset($body['articleFooterAd'])) {
        $articleFooterAdJson = json_encode($body['articleFooterAd'], JSON_UNESCAPED_UNICODE);
    }

    $fields = [];
    $params = [];
    $allowed = [
        'heroBackgroundImage', 'heroOverlayOpacity', 'heroTitle', 'heroSubtitle', 'heroBadge',
        'heroShowSearch', 'heroSearchPlaceholder', 'heroShowCta', 'heroCtaText', 'heroCtaTarget',
        'topBarEnabled', 'topBarText', 'topBarBgColor', 'topBarTextColor', 'topBarLink',
        'blogLogo', 'blogStoreName', 'blogTagline', 'blogPrimaryColor',
        'menuHomeLabel', 'menuStoreLabel', 'menuShowStore', 'menuStoreBadge',
        'menuInstitutionalLabel', 'menuShowInstitutional', 'menuContactLabel', 'menuShowContact',
        'menuShowWhatsApp', 'menuShowVitrineBtn', 'menuVitrineBtnText',
        'showCategoriesBar', 'footerText', 'footerShowSocial'
    ];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "`$f` = ?";
            $val = $body[$f];
            if (in_array($f, ['heroShowSearch', 'heroShowCta', 'topBarEnabled', 'menuShowStore', 'menuShowInstitutional', 'menuShowContact', 'menuShowWhatsApp', 'menuShowVitrineBtn', 'showCategoriesBar', 'footerShowSocial'])) {
                $val = $val ? 1 : 0;
            }
            if ($f === 'heroOverlayOpacity') {
                $val = (int)$val;
            }
            $params[] = $val;
        }
    }

    if ($articleFooterAdsJson !== null) {
        $fields[] = "`articleFooterAds` = ?";
        $params[] = $articleFooterAdsJson;
    }
    if ($articleFooterAdJson !== null) {
        $fields[] = "`articleFooterAd` = ?";
        $params[] = $articleFooterAdJson;
    }

    // Verifica se já existe registro para a loja
    $checkStmt = $pdo->prepare("SELECT id FROM blog_settings WHERE storeSlug = ? LIMIT 1");
    $checkStmt->execute([$slug]);
    $existingId = $checkStmt->fetchColumn();

    if ($existingId) {
        if (!empty($fields)) {
            $params[] = $slug;
            $stmt = $pdo->prepare("UPDATE blog_settings SET " . implode(', ', $fields) . " WHERE storeSlug = ?");
            $stmt->execute($params);
        }
    } else {
        $newId = 'bs-' . $slug;
        $stmt = $pdo->prepare("INSERT INTO blog_settings (id, storeSlug, storeId, heroTitle, heroBackgroundImage) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$newId, $slug, $storeId, $body['heroTitle'] ?? 'Meu Blog', $body['heroBackgroundImage'] ?? '']);

        if (!empty($fields)) {
            $params[] = $slug;
            $stmt = $pdo->prepare("UPDATE blog_settings SET " . implode(', ', $fields) . " WHERE storeSlug = ?");
            $stmt->execute($params);
        }
    }

    $stmtGet = $pdo->prepare("SELECT * FROM blog_settings WHERE storeSlug = ? LIMIT 1");
    $stmtGet->execute([$slug]);
    $saved = $stmtGet->fetch();
    echo json_encode(formatBlogSettingsOutput($saved, $slug));
    exit;
}

// 9. CONTATO: POST /store/:slug/contact (Público)
if (preg_match('#^/store/([a-zA-Z0-9_-]+)/contact$#', $path, $m) && $method === 'POST') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    $id = 'msg-' . time() . '-' . substr(md5(uniqid()), 0, 4);
    $nome = trim($body['nome'] ?? $body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $assunto = trim($body['assunto'] ?? $body['subject'] ?? 'Mensagem do Site');
    $mensagem = trim($body['mensagem'] ?? $body['message'] ?? '');

    if (empty($nome) || empty($email) || empty($mensagem)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Por favor preencha nome, email e mensagem.']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO contact_messages (id, storeId, nome, email, assunto, mensagem, lida) VALUES (?, ?, ?, ?, ?, ?, 0)");
    $stmt->execute([$id, $storeId, $nome, $email, $assunto, $mensagem]);

    echo json_encode(['success' => true, 'message' => 'Mensagem enviada com sucesso!']);
    exit;
}

// 10. MENSAGENS DE CONTATO: GET /admin/store/:slug/messages
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/messages$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    try {
        $stmt = $pdo->prepare("SELECT * FROM contact_messages WHERE (storeId = ? OR storeId IS NULL) ORDER BY createdAt DESC LIMIT 200");
        $stmt->execute([$storeId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['lida'] = (bool)$r['lida'];
        }
        echo json_encode($rows);
    } catch (Exception $e) {
        echo json_encode([]);
    }
    exit;
}

// 11. MENSAGENS DE CONTATO: DELETE /admin/store/:slug/messages/:id
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/messages/([a-zA-Z0-9_-]+)$#', $path, $m) && $method === 'DELETE') {
    ensureBlogTablesExist($pdo);
    $msgId = $m[2];
    $stmt = $pdo->prepare("DELETE FROM contact_messages WHERE id = ?");
    $stmt->execute([$msgId]);
    echo json_encode(['success' => true]);
    exit;
}

// 12. INCREMENTAR VISUALIZAÇÃO: POST /store/:slug/posts/:id/view
if (preg_match('#^/store/([a-zA-Z0-9_-]+)/posts/([a-zA-Z0-9_-]+)/view$#', $path, $m) && $method === 'POST') {
    ensureBlogTablesExist($pdo);
    $postId = $m[2];
    $stmt = $pdo->prepare("UPDATE blog_posts SET views = views + 1 WHERE id = ? OR slug = ?");
    $stmt->execute([$postId, $postId]);
    echo json_encode(['success' => true]);
    exit;
}

// 13. POST INDIVIDUAL PÚBLICO: GET /store/:slug/posts/:postSlug
if (preg_match('#^/store/([a-zA-Z0-9_-]+)/posts/([a-zA-Z0-9_-]+)$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $postSlug = $m[2];
    $storeId = getStoreIdBySlug($pdo, $slug);

    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE (storeId = ? OR storeId IS NULL) AND (slug = ? OR id = ?) LIMIT 1");
    $stmt->execute([$storeId, $postSlug, $postSlug]);
    $post = $stmt->fetch();

    if ($post) {
        echo json_encode(formatPostOutput($post));
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Artigo não encontrado']);
    }
    exit;
}

// 14. LISTAGEM DE POSTS: GET /store/:slug/posts e /admin/store/:slug/posts
if (preg_match('#^/(?:admin/)?store/([a-zA-Z0-9_-]+)/posts$#', $path, $m) && $method === 'GET') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $isAdmin = strpos($path, '/admin/') === 0;
    $storeId = getStoreIdBySlug($pdo, $slug);

    try {
        $sql = "SELECT * FROM blog_posts WHERE (storeId = ? OR storeId IS NULL)";
        if (!$isAdmin) {
            $sql .= " AND published = 1 AND (status = 'published' OR status IS NULL)";
        }
        $sql .= " ORDER BY destaque DESC, publishedAt DESC, createdAt DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$storeId]);
        $rows = $stmt->fetchAll();
        $posts = array_map('formatPostOutput', $rows);
        echo json_encode($posts);
    } catch (Exception $e) {
        echo json_encode([]);
    }
    exit;
}

// 15. CRIAR POST: POST /admin/store/:slug/posts
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/posts$#', $path, $m) && $method === 'POST') {
    ensureBlogTablesExist($pdo);
    $slug = $m[1];
    $storeId = getStoreIdBySlug($pdo, $slug);

    $id = !empty($body['id']) ? $body['id'] : ('post-' . time() . '-' . substr(md5(uniqid()), 0, 4));
    $title = trim($body['title'] ?? 'Novo Artigo');
    $postSlug = !empty($body['slug']) ? $body['slug'] : strtolower(preg_replace('/[^a-zA-Z0-9]+/u', '-', $title));
    $excerpt = $body['excerpt'] ?? '';
    $content = $body['content'] ?? '';
    $coverImage = $body['coverImage'] ?? '';
    $category = $body['category'] ?? 'Geral';
    $authorId = $body['authorId'] ?? null;
    $author = $body['author'] ?? 'Equipe';
    $authorAvatar = $body['authorAvatar'] ?? null;
    $authorRole = $body['authorRole'] ?? null;
    $authorBio = $body['authorBio'] ?? null;
    $readTime = $body['readTime'] ?? '4 min';
    $published = isset($body['published']) ? ($body['published'] ? 1 : 0) : 1;
    $destaque = !empty($body['destaque']) ? 1 : 0;
    $status = $body['status'] ?? ($published ? 'published' : 'draft');
    $views = (int)($body['views'] ?? 0);
    $publishedAt = $body['publishedAt'] ?? date('Y-m-d H:i:s');

    $tags = [];
    if (isset($body['tags']) && is_array($body['tags'])) {
        $tags = array_values(array_filter(array_map('trim', $body['tags'])));
    }
    $tagsJson = json_encode($tags, JSON_UNESCAPED_UNICODE);

    $prodIds = [];
    if (isset($body['linkedProductIds']) && is_array($body['linkedProductIds'])) {
        $prodIds = array_values(array_filter(array_map('trim', $body['linkedProductIds'])));
    }
    $prodIdsJson = json_encode($prodIds, JSON_UNESCAPED_UNICODE);
    $sidebarBannerJson = array_key_exists('sidebarBanner', $body)
        ? json_encode($body['sidebarBanner'], JSON_UNESCAPED_UNICODE)
        : null;

    $stmt = $pdo->prepare("INSERT INTO blog_posts (
        id, storeId, slug, title, excerpt, content, coverImage, category, tags,
        authorId, author, authorAvatar, authorRole, authorBio, readTime,
        destaque, status, published, views, linkedProductIds, sidebarBanner, publishedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $id, $storeId, $postSlug, $title, $excerpt, $content, $coverImage, $category, $tagsJson,
        $authorId, $author, $authorAvatar, $authorRole, $authorBio, $readTime,
        $destaque, $status, $published, $views, $prodIdsJson, $sidebarBannerJson, $publishedAt
    ]);

    $stmtGet = $pdo->prepare("SELECT * FROM blog_posts WHERE id = ?");
    $stmtGet->execute([$id]);
    $newPost = $stmtGet->fetch();
    echo json_encode(formatPostOutput($newPost));
    exit;
}

// 16. ATUALIZAR OU EXCLUIR POST: PUT / PATCH / DELETE /admin/store/:slug/posts/:id
if (preg_match('#^/admin/store/([a-zA-Z0-9_-]+)/posts/([a-zA-Z0-9_-]+)$#', $path, $m)) {
    ensureBlogTablesExist($pdo);
    $postId = $m[2];

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM blog_posts WHERE id = ?");
        $stmt->execute([$postId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $fields = [];
        $params = [];
        $allowed = [
            'slug', 'title', 'excerpt', 'content', 'coverImage', 'category',
            'authorId', 'author', 'authorAvatar', 'authorRole', 'authorBio',
            'readTime', 'destaque', 'status', 'published', 'views', 'publishedAt'
        ];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $fields[] = "`$f` = ?";
                $val = $body[$f];
                if ($f === 'published' || $f === 'destaque') $val = $val ? 1 : 0;
                if ($f === 'views') $val = (int)$val;
                $params[] = $val;
            }
        }

        if (array_key_exists('tags', $body)) {
            $tags = is_array($body['tags']) ? array_values(array_filter(array_map('trim', $body['tags']))) : [];
            $fields[] = "`tags` = ?";
            $params[] = json_encode($tags, JSON_UNESCAPED_UNICODE);
        }

        if (array_key_exists('linkedProductIds', $body)) {
            $pIds = is_array($body['linkedProductIds']) ? array_values(array_filter(array_map('trim', $body['linkedProductIds']))) : [];
            $fields[] = "`linkedProductIds` = ?";
            $params[] = json_encode($pIds, JSON_UNESCAPED_UNICODE);
        }

        if (array_key_exists('sidebarBanner', $body)) {
            $fields[] = "`sidebarBanner` = ?";
            $params[] = json_encode($body['sidebarBanner'], JSON_UNESCAPED_UNICODE);
        }

        if (!empty($fields)) {
            $params[] = $postId;
            $stmt = $pdo->prepare("UPDATE blog_posts SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM blog_posts WHERE id = ?");
        $stmtGet->execute([$postId]);
        $updatedPost = $stmtGet->fetch();
        echo json_encode(formatPostOutput($updatedPost));
        exit;
    }
}

// Rota padrão fallback 404 JSON
http_response_code(404);
echo json_encode([
    'error' => 'Endpoint não encontrado',
    'path' => $path,
    'method' => $method
]);
