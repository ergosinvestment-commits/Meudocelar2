-- ====================================================================
-- TABELAS DO BLOG PARA O BANCO DE DADOS NA HOSTINGER (phpMyAdmin)
-- Projeto: Meudocelar
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------
-- 1. TABELA: blog_categories (Categorias do Blog)
-- --------------------------------------------------------------------
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

-- Dados Iniciais de Categorias do Blog
INSERT INTO `blog_categories` (`id`, `storeId`, `name`, `slug`, `description`, `icon`, `active`, `ordem`) VALUES
('blog-cat-1', 'store-1', 'Casa & Cozinha', 'casa-cozinha', 'Eletroportáteis, utensílios inteligentes e truques culinários.', '🍳', 1, 1),
('blog-cat-2', 'store-1', 'Organização', 'organizacao', 'Dicas práticas para closets, despensas e otimização de espaço.', '📦', 1, 2),
('blog-cat-3', 'store-1', 'Decoração', 'decoracao', 'Ideias aconchegantes, iluminação, paletas e ambientação.', '🛋️', 1, 3),
('blog-cat-4', 'store-1', 'Dicas de Compras', 'dicas-de-compras', 'Guia de cupons, comparativos de preços e garimpos confiáveis.', '🛍️', 1, 4),
('blog-cat-5', 'store-1', 'Tecnologia & Smart Home', 'smart-home', 'Dispositivos inteligentes, automação e gadgets práticos.', '💡', 1, 5)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `icon`=VALUES(`icon`);

-- --------------------------------------------------------------------
-- 2. TABELA: blog_editors (Redatores e Autores)
-- --------------------------------------------------------------------
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

-- Dados Iniciais de Redatores
INSERT INTO `blog_editors` (`id`, `storeId`, `name`, `avatar`, `role`, `bio`, `socialLink`, `email`, `active`) VALUES
('editor-1', 'store-1', 'Maria Clara', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80&fm=webp', 'Editora-Chefe & Curadora', 'Pesquisadora obsessiva por produtos de alta qualidade com o melhor custo-benefício para transformar lares em refúgios confortáveis.', 'https://instagram.com/meudocelar', 'mariaclara@achadinhosdamaria.com.br', 1),
('editor-2', 'store-1', 'Equipe Meu Doce Lar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp', 'Equipe Editorial & Testes Práticos', 'Nosso time multidisciplinar que testa produtos, valida cupons de desconto em tempo real e compartilha guias sinceros.', 'https://instagram.com/meudocelar', 'contato@achadinhosdamaria.com.br', 1),
('editor-3', 'store-1', 'Lucas Brandão', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80&fm=webp', 'Especialista em Smart Home', 'Entusiasta de automação residencial, gadgets úteis e tecnologia que simplifica a rotina doméstica sem custar uma fortuna.', 'https://instagram.com', 'lucas@achadinhosdamaria.com.br', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`), `avatar`=VALUES(`avatar`);

-- --------------------------------------------------------------------
-- 3. TABELA: blog_posts (Artigos do Blog)
-- --------------------------------------------------------------------
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

-- Dados Iniciais de Artigos do Blog
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

-- --------------------------------------------------------------------
-- 4. TABELA: blog_settings (Configurações e Aparência do Blog)
-- --------------------------------------------------------------------
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

-- Dados Iniciais de Configurações do Blog
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

-- --------------------------------------------------------------------
-- 5. TABELA: contact_messages (Mensagens de Contato Enviadas)
-- --------------------------------------------------------------------
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
