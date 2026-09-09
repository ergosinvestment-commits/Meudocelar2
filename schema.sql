-- ==========================================================
-- MEUDOCELAR - ESQUEMA DE BANCO DE DADOS HOSTINGER
-- Compatível com: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Execução: phpMyAdmin / Hostinger hPanel / Console MySQL
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. TABELA DE CONFIGURAÇÃO DA LOJA (STORES)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stores` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(128) NOT NULL,
  `storeName` VARCHAR(255) NOT NULL,
  `logo` TEXT,
  `instagram` VARCHAR(255) DEFAULT '',
  `facebook` VARCHAR(255) DEFAULT '',
  `tiktok` VARCHAR(255) DEFAULT '',
  `pixelFacebook` VARCHAR(255) DEFAULT '',
  `googleAnalytics` VARCHAR(255) DEFAULT '',
  `googleAds` VARCHAR(255) DEFAULT '',
  `corPrimaria` VARCHAR(32) DEFAULT '#2A5C3F',
  `corSecundaria` VARCHAR(32) DEFAULT '#1B1B1B',
  `bannerUrl` TEXT,
  `bannerLink` VARCHAR(255) DEFAULT '',
  `bannerTag` VARCHAR(255) DEFAULT 'SELEÇÃO ESPECIAL',
  `bannerTitulo` VARCHAR(255) DEFAULT 'Ofertas Imperdíveis do Dia',
  `bannerSubtitulo` TEXT,
  `tituloSite` VARCHAR(255) DEFAULT 'Meudocelar — As Melhores Ofertas',
  `descricaoSite` TEXT,
  `lojaAtiva` TINYINT(1) DEFAULT 1,
  `msgManutencao` TEXT,
  `mensagemTopo` TEXT,
  `corBarraTopo` VARCHAR(32) DEFAULT '#2A5C3F',
  `cnpj` VARCHAR(64) DEFAULT '',
  `endereco` TEXT,
  `email` VARCHAR(255) DEFAULT '',
  `canalWhatsapp` VARCHAR(255) DEFAULT '',
  `canalTelegram` VARCHAR(255) DEFAULT '',
  `botaoCanalFlutuante` TINYINT(1) DEFAULT 1,
  `textoDisclosure` TEXT,
  `avisoPrecos` TEXT,
  `adminUser` VARCHAR(128) DEFAULT 'admin',
  `adminEmail` VARCHAR(255) DEFAULT 'admin@meudocelar.com.br',
  `adminPassword` VARCHAR(255) DEFAULT 'admin',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. TABELA DE PRODUTOS (PRODUCTS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `storeId` VARCHAR(64) NOT NULL,
  `ativo` TINYINT(1) DEFAULT 1,
  `tipo` VARCHAR(32) DEFAULT 'FISICO',
  `plataforma` VARCHAR(64) DEFAULT 'Amazon',
  `categoria` VARCHAR(128) DEFAULT 'Geral',
  `subcategoria` VARCHAR(128) DEFAULT '',
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT,
  `preco` DECIMAL(10,2) DEFAULT 0.00,
  `precoPromo` DECIMAL(10,2) NULL,
  `cupom` VARCHAR(64) DEFAULT '',
  `validade` VARCHAR(64) NULL,
  `linkAfiliado` TEXT,
  `textoBotao` VARCHAR(128) DEFAULT 'Ver oferta na loja →',
  `video` VARCHAR(255) DEFAULT '',
  `img1` TEXT,
  `img2` TEXT,
  `img3` TEXT,
  `img4` TEXT,
  `ordem` INT DEFAULT 1,
  `destaque` TINYINT(1) DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_store` (`storeId`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_plataforma` (`plataforma`),
  KEY `idx_ativo_ordem` (`ativo`, `ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. TABELA DE CATEGORIAS (CATEGORIES)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `storeId` VARCHAR(64) NOT NULL,
  `nome` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(128) NOT NULL,
  `icone` VARCHAR(64) DEFAULT 'Sparkles',
  `descricao` TEXT NULL,
  `ativo` TINYINT(1) DEFAULT 1,
  `ordem` INT DEFAULT 1,
  `ordemMenu` INT DEFAULT 1,
  `mostrarNoMenu` TINYINT(1) DEFAULT 1,
  `exibirNoMenu` TINYINT(1) DEFAULT 1,
  `subcategorias` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cat_store` (`storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. TABELA DE PLATAFORMAS DE AFILIADOS (PLATFORMS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `platforms` (
  `id` VARCHAR(64) NOT NULL,
  `storeId` VARCHAR(64) NOT NULL,
  `nome` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(128) NOT NULL,
  `cor` VARCHAR(32) DEFAULT '#2A5C3F',
  `badge` VARCHAR(64) DEFAULT '',
  `icone` VARCHAR(64) DEFAULT 'ShoppingBag',
  `ativo` TINYINT(1) DEFAULT 1,
  `ordem` INT DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_plat_store` (`storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. TABELA DE CLIQUE & ANALYTICS (CLICKS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clicks` (
  `id` VARCHAR(64) NOT NULL,
  `storeId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) DEFAULT NULL,
  `produto` VARCHAR(255) DEFAULT '',
  `plataforma` VARCHAR(64) DEFAULT '',
  `tipo` VARCHAR(32) DEFAULT 'FISICO',
  `categoria` VARCHAR(128) DEFAULT '',
  `origem` VARCHAR(128) DEFAULT 'Direto',
  `utm_source` VARCHAR(128) DEFAULT NULL,
  `utm_medium` VARCHAR(128) DEFAULT NULL,
  `utm_campaign` VARCHAR(128) DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_click_store` (`storeId`),
  KEY `idx_click_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. TABELA DE VISITAS DA LOJA (STORE_VIEWS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `store_views` (
  `storeSlug` VARCHAR(128) NOT NULL,
  `viewsCount` INT DEFAULT 0,
  `lastViewAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`storeSlug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. TABELA DE USUÁRIOS E ACESSOS (USERS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `storeId` VARCHAR(64) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `username` VARCHAR(128) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) DEFAULT 'ADMIN',
  `ativo` TINYINT(1) DEFAULT 1,
  `avatar` TEXT,
  `ultimoAcesso` TIMESTAMP NULL DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_store` (`storeId`),
  KEY `idx_user_login` (`username`, `email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- DADOS INICIAIS DA LOJA EXEMPLO
-- ----------------------------------------------------------
INSERT INTO `stores` (
  `id`, `slug`, `storeName`, `logo`, `instagram`, `facebook`, `tiktok`,
  `corPrimaria`, `corSecundaria`, `bannerUrl`, `bannerLink`, `bannerTag`,
  `bannerTitulo`, `bannerSubtitulo`, `tituloSite`, `descricaoSite`, `lojaAtiva`,
  `mensagemTopo`, `corBarraTopo`, `email`, `textoDisclosure`, `adminUser`, `adminEmail`, `adminPassword`
) VALUES (
  'store-1',
  'achadinhos-da-maria',
  'Meudocelar',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&auto=format&fit=crop&q=80&fm=webp',
  '@meudocelar',
  'facebook.com/meudocelar',
  '@meudocelar',
  '#2A5C3F',
  '#1B1B1B',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80&fm=webp',
  'Eletrônicos',
  'SELEÇÃO ESPECIAL',
  'Ofertas Imperdíveis do Dia',
  'Ofertas com até 60% de desconto e cupons exclusivos testados.',
  'Meudocelar — As Melhores Ofertas e Produtos para seu Lar',
  'Encontre produtos imperdíveis para sua casa e dia a dia na Amazon, Shopee, Mercado Livre e Magalu.',
  1,
  '🔥 Frete Grátis e Cupons Exclusivos adicionados hoje! Aproveite antes que acabem.',
  '#2A5C3F',
  'admin@meudocelar.com.br',
  'Este site participa de programas de afiliados e pode receber comissão pelas compras realizadas nos links, sem custo adicional para você.',
  'admin',
  'admin@meudocelar.com.br',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.qH0fQY6iKz7j8aR3Fw9rL5q2O.c4M12'
) ON DUPLICATE KEY UPDATE `storeName`=VALUES(`storeName`);

-- ----------------------------------------------------------
-- CATEGORIAS PADRÃO
-- ----------------------------------------------------------
INSERT INTO `categories` (`id`, `storeId`, `nome`, `slug`, `icone`, `ativo`, `ordemMenu`, `exibirNoMenu`) VALUES
('cat-1', 'store-1', 'Eletrônicos & Tech', 'eletronicos', 'Laptop', 1, 1, 1),
('cat-2', 'store-1', 'Casa & Cozinha', 'casa-cozinha', 'Home', 1, 2, 1),
('cat-3', 'store-1', 'Moda & Beleza', 'moda-beleza', 'Sparkles', 1, 3, 1),
('cat-4', 'store-1', 'Livros & Cursos', 'livros-cursos', 'BookOpen', 1, 4, 1),
('cat-5', 'store-1', 'Saúde & Fitness', 'saude-fitness', 'Heart', 1, 5, 1)
ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`);

-- ----------------------------------------------------------
-- PLATAFORMAS PADRÃO
-- ----------------------------------------------------------
INSERT INTO `platforms` (`id`, `storeId`, `nome`, `slug`, `cor`, `badge`, `icone`, `ativo`, `ordem`) VALUES
('plat-1', 'store-1', 'Amazon', 'amazon', '#FF9900', 'Prime', 'ShoppingBag', 1, 1),
('plat-2', 'store-1', 'Shopee', 'shopee', '#EE4D2D', 'Frete Grátis', 'ShoppingBag', 1, 2),
('plat-3', 'store-1', 'Mercado Livre', 'mercado-livre', '#FFE600', 'Full', 'ShoppingBag', 1, 3),
('plat-4', 'store-1', 'Magalu', 'magalu', '#0086FF', 'Oferta', 'ShoppingBag', 1, 4),
('plat-5', 'store-1', 'Hotmart', 'hotmart', '#F04E23', 'Digital', 'ShoppingBag', 1, 5)
ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`);

-- ----------------------------------------------------------
-- PRODUTOS PADRÃO (CATÁLOGO INICIAL COMPLETO)
-- ----------------------------------------------------------
INSERT INTO `products` (
  `id`, `storeId`, `ativo`, `tipo`, `plataforma`, `categoria`, `subcategoria`,
  `nome`, `descricao`, `preco`, `precoPromo`, `cupom`, `validade`,
  `linkAfiliado`, `textoBotao`, `video`, `img1`, `img2`, `img3`, `img4`,
  `ordem`, `destaque`
) VALUES
(
  'prod-1', 'store-1', 1, 'FISICO', 'Amazon', 'Eletrônicos & Tech', 'Áudio',
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
  'prod-3', 'store-1', 1, 'FISICO', 'Mercado Livre', 'Eletrônicos & Tech', 'Wearables',
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
  'prod-5', 'store-1', 1, 'FISICO', 'Magalu', 'Moda & Beleza', 'Cabelos',
  'Escova Secadora e Modeladora 3 em 1 Cerâmica Íons 1200W',
  'Seca, alisa e modela com cerdas macias anti-frizz e tecnologia de íons negativos que selam as cutículas dos fios. Possui 3 temperaturas ajustáveis e cabo giratório 360 graus.',
  189.90, 99.90, 'BELEZA25', '2027-12-31',
  'https://magazineluiza.com.br', 'Ver na Magalu →', '',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80&fm=webp',
  '', '', '',
  5, 0
),
(
  'prod-6', 'store-1', 1, 'DIGITAL', 'Hotmart', 'Livros & Cursos', 'Desenvolvimento',
  'Curso Completo de Marketing para Afiliados e Tráfego Pago',
  'Aprenda do zero ao avançado como criar campanhas de alto retorno, encontrar produtos vencedores e estruturar uma renda recorrente com programas de afiliados globais.',
  497.00, 197.00, 'DESCONTOVIP', '2027-12-31',
  'https://hotmart.com', 'Quero Conhecer o Curso →', '',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80&fm=webp',
  '', '', '',
  6, 0
),
(
  'prod-7', 'store-1', 1, 'FISICO', 'Shopee', 'Eletrônicos & Tech', 'Acessórios',
  'Luminária de Mesa LED Articulada Recarregável Touch com Porta-Caneta',
  'Lâmpada de mesa com 3 intensidades de luz (quente, fria e neutra), haste flexível de silicone, suporte para celular integrado e bateria recarregável USB com até 8h de duração contínua.',
  69.90, 38.50, '', '2027-12-31',
  'https://shopee.com.br', 'Ver Oferta na Shopee →', '',
  'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800&auto=format&fit=crop&q=80&fm=webp',
  '', '', '',
  7, 0
),
(
  'prod-8', 'store-1', 1, 'FISICO', 'Amazon', 'Eletrônicos & Tech', 'Dispositivos',
  'Echo Pop Smart Speaker Compacto com Alexa e Som Envolvente',
  'A smart speaker com som surround compacto que cabe perfeitamente em quartos e espaços pequenos. Peça músicas para Alexa, controle dispositivos de casa inteligente, timer, previsão do tempo e muito mais.',
  349.00, 249.00, 'ALEXAPROMO', '2027-12-31',
  'https://amazon.com.br', 'Ver na Amazon →', '',
  'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80&fm=webp',
  '', '', '',
  8, 0
)
ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`), `preco`=VALUES(`preco`), `precoPromo`=VALUES(`precoPromo`);

-- ----------------------------------------------------------
-- USUÁRIO ADMINISTRADOR PADRÃO
-- ----------------------------------------------------------
INSERT INTO `users` (
  `id`, `storeId`, `nome`, `email`, `username`, `password`, `role`, `ativo`
) VALUES (
  'user-admin-1', 'store-1', 'Administrador Principal', 'admin@meudocelar.com.br', 'admin', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.qH0fQY6iKz7j8aR3Fw9rL5q2O.c4M12', 'ADMIN', 1
) ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`);

-- ----------------------------------------------------------
-- 6. TABELA: blog_categories (Categorias do Blog)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_categories` (
  `id` varchar(64) NOT NULL,
  `storeId` varchar(64) DEFAULT 'store-1',
  `name` varchar(128) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(64) DEFAULT 'Sparkles',
  `active` tinyint(1) DEFAULT 1,
  `ordem` int(11) DEFAULT 1,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bcat_store` (`storeId`),
  KEY `idx_bcat_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `blog_categories` (`id`, `storeId`, `name`, `slug`, `description`, `icon`, `active`, `ordem`) VALUES
('blog-cat-1', 'store-1', 'Casa & Cozinha', 'casa-cozinha', 'Eletroportáteis, utensílios inteligentes e truques culinários.', '🍳', 1, 1),
('blog-cat-2', 'store-1', 'Organização', 'organizacao', 'Dicas práticas para closets, despensas e otimização de espaço.', '📦', 1, 2),
('blog-cat-3', 'store-1', 'Decoração', 'decoracao', 'Ideias aconchegantes, iluminação, paletas e ambientação.', '🛋️', 1, 3),
('blog-cat-4', 'store-1', 'Dicas de Compras', 'dicas-de-compras', 'Guia de cupons, comparativos de preços e garimpos confiáveis.', '🛍️', 1, 4),
('blog-cat-5', 'store-1', 'Tecnologia & Smart Home', 'smart-home', 'Dispositivos inteligentes, automação e gadgets práticos.', '💡', 1, 5)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `icon`=VALUES(`icon`);

-- ----------------------------------------------------------
-- 7. TABELA: blog_editors (Redatores e Autores)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_editors` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `blog_editors` (`id`, `storeId`, `name`, `avatar`, `role`, `bio`, `socialLink`, `email`, `active`) VALUES
('editor-1', 'store-1', 'Maria Clara', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp', 'Editora-Chefe & Curadora', 'Pesquisadora obsessiva por produtos de alta qualidade com o melhor custo-benefício para transformar lares em refúgios confortáveis.', 'https://instagram.com/meudocelar', 'mariaclara@achadinhosdamaria.com.br', 1),
('editor-2', 'store-1', 'Equipe Meu Doce Lar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial & Testes Práticos', 'Nosso time multidisciplinar que testa produtos, valida cupons de desconto em tempo real e compartilha guias sinceros.', 'https://instagram.com/meudocelar', 'contato@achadinhosdamaria.com.br', 1),
('editor-3', 'store-1', 'Lucas Brandão', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80&fm=webp', 'Especialista em Smart Home', 'Entusiasta de automação residencial, gadgets úteis e tecnologia que simplifica a rotina doméstica sem custar uma fortuna.', 'https://instagram.com', 'lucas@achadinhosdamaria.com.br', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`), `avatar`=VALUES(`avatar`);

-- ----------------------------------------------------------
-- 8. TABELA: blog_posts (Artigos do Blog)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_posts` (
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
  `publishedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_store` (`storeId`),
  KEY `idx_post_slug` (`slug`),
  KEY `idx_post_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `blog_posts` (
  `id`, `storeId`, `slug`, `title`, `excerpt`, `content`, `coverImage`,
  `category`, `tags`, `authorId`, `author`, `authorAvatar`, `authorRole`, `authorBio`,
  `readTime`, `destaque`, `status`, `published`, `views`, `linkedProductIds`, `publishedAt`
) VALUES
(
  'post-1', 'store-1', '5-itens-essenciais-para-transformar-sua-cozinha-em-2026',
  '5 Itens Essenciais que Transformam Qualquer Cozinha e Economizam Tempo',
  'Descubra os eletroportáteis e organizadores inteligentes que estão fazendo sucesso por unir praticidade, design elegante e ótimo custo-benefício.',
  'Cozinhar e manter a casa em ordem não precisa ser uma maratona cansativa. Com a evolução dos utensílios domésticos e eletroportáteis inteligentes, é possível economizar até 50% do tempo no preparo das refeições diárias e ainda deixar sua bancada com visual de revista.\n\n### 1. A Air Fryer Digital com Janela de Visualização\nSe você ainda não tem uma fritadeira sem óleo ou tem um modelo muito antigo, os novos modelos digitais com visor transparente mudaram o jogo. Você acompanha o ponto exato dos alimentos sem perder calor abrindo a gaveta.\n\n### 2. Organizadores Acrílicos Herméticos\nManter grãos, massas e temperos em potes transparentes e empilháveis não é só estética: aumenta a durabilidade dos alimentos em até 3 vezes e evita desperdício na despensa.\n\n### 3. Moedores Elétricos e Mini Processadores Recarregáveis\nPicar alho, cebola e nozes em segundos com um clique elimina odores nas mãos e agiliza todo o refogado.\n\n### 4. Panelas com Revestimento Cerâmico Atóxico\nMais saudáveis, exigem menos óleo e são extremamente fáceis de limpar — a esponja desliza sem esforço.\n\n### 5. Balança Digital de Alta Precisão\nFundamental para acertar o ponto de bolos, pães e porções equilibradas sem erro.\n\nConfira nossa seleção completa na aba Loja com os melhores preços garimpados diretamente na Amazon, Shopee e Mercado Livre!',
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp',
  'Casa & Cozinha', '[\"Cozinha Prática\",\"Organização\",\"Achadinhos\",\"Guia de Compras\"]', 'editor-2', 'Equipe Meu Doce Lar',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial & Testes Práticos', 'Nosso time multidisciplinar que testa produtos.',
  '4 min de leitura', 1, 'published', 1, 342, '[\"prod-2\",\"prod-4\"]', '2026-08-28 14:00:00'
),
(
  'post-2', 'store-1', 'guia-definitivo-de-organizacao-de-armarios-e-closet',
  'Guia Definitivo: Como Dobrar o Espaço Útil do seu Armário e Closet',
  'Técnicas práticas de dobras verticais, cabides padronizados e organizadores modulares para manter tudo visível e acessível.',
  'Você já teve a sensação de abrir o armário cheio de roupas e achar que não tem nada para vestir? Esse problema quase sempre é de visibilidade, não de quantidade de peças.\n\nQuando as roupas ficam empilhadas uma sobre a outra, as peças de baixo são esquecidas. Aqui estão as regras de ouro dos Personal Organizers:\n\n1. Padronize os Cabides: Cabides finos de veludo ocupam 60% menos espaço que os de madeira ou plástico grosso e evitam que tecidos finos escorreguem.\n2. Use Colmeias Organizadoras: Perfeitas para gavetas de roupas íntimas, meias, camisetas e roupas de academia.\n3. Aproveite a Altura dos Prateleiras: Use cestos suspensos aramados para aproveitar o vão vertical que normalmente fica vazio.\n4. Desapego Sazonal: A cada mudança de estação, separe o que não usou nos últimos 6 meses para doação.\n\nVisite nossa Loja para encontrar os cabides de veludo e colmeias organizadoras com os melhores cupons ativos!',
  'https://images.unsplash.com/photo-1558997519-83ea9252def8?w=1200&auto=format&fit=crop&q=80&fm=webp',
  'Organização', '[\"Closet\",\"Dicas Práticas\",\"Casa Organizada\"]', 'editor-1', 'Maria Clara',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp', 'Editora-Chefe & Curadora', 'Pesquisadora obsessiva por produtos de alta qualidade.',
  '5 min de leitura', 0, 'published', 1, 218, '[]', '2026-08-25 10:30:00'
),
(
  'post-3', 'store-1', 'iluminacao-aconchegante-truques-para-transformar-sua-sala',
  'Iluminação Aconchegante: 4 Truques Simples para Deixar sua Sala Quentinha',
  'Aprenda como luzes indiretas, lâmpadas com temperatura de cor quente e luminárias de apoio criam um clima acolhedor de refúgio.',
  'A iluminação tem o poder de transformar completamente o humor de uma casa. Uma luz direta de teto, muito branca e forte, pode deixar a sala com clima de consultório médico. Já pontos de luz suaves criam a atmosfera de aconchego que todos buscamos ao chegar do trabalho.\n\n- Temperatura de Cor: Opte sempre por lâmpadas de 2700K a 3000K (luz amarelada/quente) nas áreas de descanso como sala e quartos.\n- Luminárias Articuladas de Mesa e Chão: Criam cantinhos de leitura charmosos sem precisar de reforma elétrica.\n- Fitas de LED Embutidas: Perfeitas atrás da TV ou embaixo de prateleiras para dar um efeito moderno e flutuante.\n- Velas Aromáticas e Difusores: Complementam o estímulo visual com um aroma acolhedor de baunilha, lavanda ou alecrim.\n\nTodos esses itens estão catalogados na nossa seção de Eletrônicos & Casa com links diretos para compras seguras!',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80&fm=webp',
  'Decoração', '[\"Iluminação\",\"Decoração\",\"Conforto\"]', 'editor-2', 'Equipe Meu Doce Lar',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial & Testes Práticos', 'Nosso time multidisciplinar que testa produtos.',
  '3 min de leitura', 0, 'published', 1, 185, '[\"prod-7\"]', '2026-08-20 16:15:00'
)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `content`=VALUES(`content`), `coverImage`=VALUES(`coverImage`);

-- ----------------------------------------------------------
-- 9. TABELA: blog_settings (Configurações e Aparência do Blog)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_settings` (
  `id` varchar(64) NOT NULL,
  `storeSlug` varchar(128) NOT NULL,
  `storeId` varchar(64) DEFAULT 'store-1',
  `heroBackgroundImage` text DEFAULT NULL,
  `heroOverlayOpacity` int(11) DEFAULT 65,
  `heroTitle` varchar(500) DEFAULT '',
  `heroSubtitle` varchar(500) DEFAULT '',
  `heroBadge` varchar(255) DEFAULT '',
  `heroShowSearch` tinyint(1) DEFAULT 1,
  `heroSearchPlaceholder` varchar(255) DEFAULT 'Buscar artigos, dicas e achadinhos...',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `blog_settings` (
  `id`, `storeSlug`, `storeId`, `heroBackgroundImage`, `heroOverlayOpacity`,
  `heroTitle`, `heroSubtitle`, `heroBadge`, `heroShowSearch`, `heroSearchPlaceholder`,
  `heroShowCta`, `heroCtaText`, `heroCtaTarget`, `topBarEnabled`, `topBarText`,
  `topBarBgColor`, `topBarTextColor`, `topBarLink`, `blogLogo`, `blogStoreName`,
  `blogTagline`, `blogPrimaryColor`, `menuHomeLabel`, `menuStoreLabel`, `menuShowStore`,
  `menuStoreBadge`, `menuInstitutionalLabel`, `menuShowInstitutional`, `menuContactLabel`,
  `menuShowContact`, `menuShowWhatsApp`, `menuShowVitrineBtn`, `menuVitrineBtnText`,
  `showCategoriesBar`, `footerText`, `footerShowSocial`, `articleFooterAd`, `articleFooterAds`
) VALUES (
  'bs-achadinhos-da-maria', 'achadinhos-da-maria', 'store-1',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80&fm=webp',
  65, 'Guia de Achadinhos & Dicas para seu Lar',
  'Análises sinceras, seleções com os melhores preços garimpados e dicas práticas de organização para sua rotina.',
  'BLOG & DICAS EXCLUSIVAS', 1, 'Buscar artigos por tema (ex: Air Fryer, Cozinha, Organização)...',
  1, 'Explorar Vitrine de Ofertas', 'store', 0, '✨ Confira os novos achadinhos e guias de compras da semana!',
  '#2A5C3F', '#FFFFFF', '', '', 'Meudocelar', 'Blog & Achadinhos Verificados', '#2A5C3F',
  'Início', 'Loja & Achadinhos', 1, 'Ofertas', 'Institucional', 1, 'Contato', 1, 1, 1, 'Ver Vitrine',
  1, '', 1, NULL, '[]'
) ON DUPLICATE KEY UPDATE `heroTitle`=VALUES(`heroTitle`), `heroBackgroundImage`=VALUES(`heroBackgroundImage`);

-- ----------------------------------------------------------
-- 10. TABELA: contact_messages (Mensagens de Contato Enviadas)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contact_messages` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
