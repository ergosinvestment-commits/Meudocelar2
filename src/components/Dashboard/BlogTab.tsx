import React, { useState, useEffect } from 'react';
import { BlogPost, ContactMessage, Product, Category, BlogCategory, BlogEditor } from '../../types';
import {
  fetchAdminBlogPosts,
  saveAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminMessages,
  deleteAdminMessage,
  fetchStoreProducts,
  fetchAdminBlogCategories,
  fetchAdminBlogEditors,
  uploadImageToServerDetailed
} from '../../api/client';
import { normalizeImageUrl } from '../../utils';
import { compressImageToWebP } from '../../utils/imageCompressor';
import BlogSettingsView from './Blog/BlogSettingsView';
import BlogCategoriesView from './Blog/BlogCategoriesView';
import BlogEditorsView from './Blog/BlogEditorsView';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Sparkles,
  Mail,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  Save,
  ChevronRight,
  Filter,
  CheckCircle2,
  Settings,
  Users,
  Megaphone,
  UserCheck,
  Upload,
  UploadCloud,
  Loader2
} from 'lucide-react';

interface BlogTabProps {
  storeSlug: string;
  onPreviewPost?: (post: BlogPost) => void;
}

export default function BlogTab({ storeSlug, onPreviewPost }: BlogTabProps) {
  const [subTab, setSubTab] = useState<'posts' | 'categories' | 'editors' | 'settings' | 'messages'>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [blogEditors, setBlogEditors] = useState<BlogEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete Confirmation State
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Casa & Cozinha');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [coverOptimizationInfo, setCoverOptimizationInfo] = useState<{
    originalKb?: number;
    newKb?: number;
    savedPercent?: number;
    format?: string;
  } | null>(null);
  const [isUploadingInlineImg, setIsUploadingInlineImg] = useState(false);
  const [formAuthorId, setFormAuthorId] = useState('');
  const [formAuthor, setFormAuthor] = useState('Equipe Meu Doce Lar');
  const [formAuthorAvatar, setFormAuthorAvatar] = useState('');
  const [formAuthorRole, setFormAuthorRole] = useState('');
  const [formAuthorBio, setFormAuthorBio] = useState('');
  const [formReadTime, setFormReadTime] = useState('4 min');
  const [formPublished, setFormPublished] = useState(true);
  const [formDestaque, setFormDestaque] = useState(false);
  const [formTags, setFormTags] = useState('');
  const [formLinkedProducts, setFormLinkedProducts] = useState<string[]>([]);
  const [formBannerEnabled, setFormBannerEnabled] = useState(false);
  const [formBannerImg, setFormBannerImg] = useState('');
  const [formBannerTitle, setFormBannerTitle] = useState('');
  const [formBannerDesc, setFormBannerDesc] = useState('');
  const [formBannerBadge, setFormBannerBadge] = useState('DESTAQUE');
  const [formBannerBtn, setFormBannerBtn] = useState('Quero Conhecer →');
  const [formBannerLink, setFormBannerLink] = useState('');
  const [formBannerNewTab, setFormBannerNewTab] = useState(true);

  useEffect(() => {
    loadData();
  }, [storeSlug]);

  async function loadData() {
    try {
      setLoading(true);
      const [postsRes, msgsRes, prodsRes, blogCatsRes, blogEdsRes] = await Promise.all([
        fetchAdminBlogPosts(storeSlug),
        fetchAdminMessages(storeSlug),
        fetchStoreProducts(storeSlug).catch(() => []),
        fetchAdminBlogCategories(storeSlug).catch(() => []),
        fetchAdminBlogEditors(storeSlug).catch(() => [])
      ]);
      setPosts(postsRes || []);
      setMessages(msgsRes || []);
      setProducts(prodsRes || []);
      setBlogCategories(blogCatsRes || []);
      setBlogEditors(blogEdsRes || []);
    } catch (err) {
      console.error('Error loading blog tab data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenNewPost() {
    const defaultEditor = blogEditors.find(e => e.active !== false) || blogEditors[0];
    const defaultCat = blogCategories.find(c => c.active !== false)?.name || 'Casa & Cozinha';

    setEditingPost(null);
    setFormTitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormContent(
      '## Introdução\n\nEscreva aqui o primeiro parágrafo do seu artigo...\n\n### O que você vai encontrar neste guia:\n\n- Dica 1\n- Dica 2\n- Dica 3\n\n## Melhores Opções para Escolher\n\nDetalhes sobre os produtos recomendados...'
    );
    setFormCategory(defaultCat);
    setFormCoverImage('https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80&fm=webp');
    setFormAuthorId(defaultEditor?.id || '');
    setFormAuthor(defaultEditor?.name || 'Equipe Meu Doce Lar');
    setFormAuthorAvatar(defaultEditor?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp');
    setFormAuthorRole(defaultEditor?.role || 'Redator & Curador');
    setFormAuthorBio(defaultEditor?.bio || '');
    setFormReadTime('4 min');
    setFormPublished(true);
    setFormDestaque(false);
    setFormTags('dicas, organização, achadinhos');
    setFormLinkedProducts([]);
    setFormBannerEnabled(false);
    setFormBannerImg('');
    setFormBannerTitle('');
    setFormBannerDesc('');
    setFormBannerBadge('DESTAQUE');
    setFormBannerBtn('Quero Conhecer →');
    setFormBannerLink('');
    setFormBannerNewTab(true);
    setCoverOptimizationInfo(null);
    setIsDraggingCover(false);
    setIsCompressingCover(false);
    setIsModalOpen(true);
  }

  function handleOpenEditPost(post: BlogPost) {
    setEditingPost(post);
    setFormTitle(post.title || '');
    setFormSlug(post.slug || '');
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content || '');
    setFormCategory(post.category || 'Casa & Cozinha');
    setFormCoverImage(post.coverImage || '');
    setFormAuthorId(post.authorId || '');
    setFormAuthor(post.author || 'Equipe Meu Doce Lar');
    setFormAuthorAvatar(post.authorAvatar || '');
    setFormAuthorRole(post.authorRole || '');
    setFormAuthorBio(post.authorBio || '');
    setFormReadTime(post.readTime || '4 min');
    setFormPublished(post.published ?? true);
    setFormDestaque(post.destaque ?? false);
    setFormTags(post.tags ? post.tags.join(', ') : '');
    setFormLinkedProducts(post.linkedProductIds || []);
    setFormBannerEnabled(Boolean(post.sidebarBanner?.enabled));
    setFormBannerImg(post.sidebarBanner?.imageUrl || '');
    setFormBannerTitle(post.sidebarBanner?.title || '');
    setFormBannerDesc(post.sidebarBanner?.description || '');
    setFormBannerBadge(post.sidebarBanner?.badge || 'DESTAQUE');
    setFormBannerBtn(post.sidebarBanner?.buttonText || 'Quero Conhecer →');
    setFormBannerLink(post.sidebarBanner?.linkUrl || '');
    setFormBannerNewTab(post.sidebarBanner?.openInNewTab !== false);
    setCoverOptimizationInfo(null);
    setIsDraggingCover(false);
    setIsCompressingCover(false);
    setIsModalOpen(true);
  }

  function handleAuthorSelect(editorId: string) {
    setFormAuthorId(editorId);
    if (!editorId) {
      setFormAuthor('Equipe Editorial');
      return;
    }
    const selected = blogEditors.find(e => e.id === editorId);
    if (selected) {
      setFormAuthor(selected.name);
      setFormAuthorAvatar(selected.avatar);
      setFormAuthorRole(selected.role || '');
      setFormAuthorBio(selected.bio || '');
    }
  }

  async function processCoverImageFile(file: File) {
    if (!file) return;
    setIsCompressingCover(true);
    setCoverOptimizationInfo(null);

    try {
      const originalBytes = file.size;

      // 1. Immediate local Data URL preview for instant visual feedback
      const localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      if (localDataUrl) {
        setFormCoverImage(localDataUrl);
      }

      // 2. High-efficiency client compression testing WebP vs AVIF
      const compressedDataUrl = await compressImageToWebP(file, {
        maxWidth: 1600,
        maxHeight: 1080,
        quality: 0.85,
        format: 'image/webp'
      });

      const payload = compressedDataUrl && compressedDataUrl.length > 300 ? compressedDataUrl : localDataUrl;

      // 3. Save to server persistent storage (/uploads/img_....webp) via server-side sharp optimizer
      const uploadRes = await uploadImageToServerDetailed(payload, file.name);

      const finalUrl = uploadRes.success && uploadRes.url ? uploadRes.url : payload;
      setFormCoverImage(finalUrl);

      // 4. Calculate compression stats
      const origSize = uploadRes.originalSize || originalBytes;
      const newSize = uploadRes.newSize || Math.round(payload.length * 0.75);
      const savedPct = origSize > 0 && newSize < origSize ? Math.round(((origSize - newSize) / origSize) * 100) : 0;

      setCoverOptimizationInfo({
        originalKb: Math.round(origSize / 1024),
        newKb: Math.round(newSize / 1024),
        savedPercent: savedPct,
        format: uploadRes.format || 'webp'
      });

      setFeedback({
        type: 'success',
        message: 'Foto de capa compactada e salva com sucesso em formato WebP/AVIF!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao processar imagem de capa:', err);
      setFeedback({
        type: 'error',
        message: 'Não foi possível compactar a imagem. Tente outro arquivo.'
      });
    } finally {
      setIsCompressingCover(false);
    }
  }

  function handleCoverFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processCoverImageFile(file);
    }
    e.target.value = '';
  }

  async function handleInlineImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInlineImg(true);
    try {
      const compressed = await compressImageToWebP(file, {
        maxWidth: 1400,
        maxHeight: 1000,
        quality: 0.85,
        format: 'image/webp'
      });
      const uploadRes = await uploadImageToServerDetailed(compressed, file.name);
      const url = uploadRes.url || compressed;
      const label = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormContent(prev => prev + `\n\n![${label}](${url})\n\n`);
      setFeedback({
        type: 'success',
        message: 'Imagem inserida no artigo em formato WebP otimizado!'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao inserir imagem inline:', err);
    } finally {
      setIsUploadingInlineImg(false);
      e.target.value = '';
    }
  }

  function slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  function handleTitleChange(val: string) {
    setFormTitle(val);
    if (!editingPost) {
      setFormSlug(slugify(val));
    }
  }

  async function handleSavePost(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o título e o conteúdo do artigo.' });
      return;
    }

    try {
      setSaving(true);
      const postPayload: Partial<BlogPost> = {
        id: editingPost?.id,
        title: formTitle.trim(),
        slug: formSlug.trim() || slugify(formTitle),
        excerpt: formExcerpt.trim(),
        content: formContent,
        category: formCategory.trim(),
        coverImage: formCoverImage.trim(),
        authorId: formAuthorId,
        author: formAuthor.trim(),
        authorAvatar: formAuthorAvatar.trim(),
        authorRole: formAuthorRole.trim(),
        authorBio: formAuthorBio.trim(),
        readTime: formReadTime.trim(),
        published: formPublished,
        destaque: formDestaque,
        tags: formTags
          ? formTags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
        linkedProductIds: formLinkedProducts,
        sidebarBanner: formBannerEnabled && formBannerImg.trim() ? {
          enabled: true,
          imageUrl: formBannerImg.trim(),
          title: formBannerTitle.trim(),
          description: formBannerDesc.trim(),
          badge: formBannerBadge.trim() || 'DESTAQUE',
          buttonText: formBannerBtn.trim() || 'Quero Conhecer →',
          linkUrl: formBannerLink.trim(),
          openInNewTab: formBannerNewTab
        } : undefined
      };

      const saved = await saveAdminBlogPost(storeSlug, postPayload);
      setFeedback({ type: 'success', message: 'Artigo salvo com sucesso!' });
      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar artigo.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeletePost() {
    if (!postToDelete) return;
    try {
      setIsDeleting(true);
      const ok = await deleteAdminBlogPost(storeSlug, postToDelete.id);
      if (ok) {
        setPosts(posts.filter(p => p.id !== postToDelete.id));
        setFeedback({ type: 'success', message: 'Artigo excluído com sucesso.' });
        setPostToDelete(null);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: 'Não foi possível excluir o artigo.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao excluir artigo.' });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmDeleteMessage() {
    if (!messageToDelete) return;
    try {
      setIsDeleting(true);
      const ok = await deleteAdminMessage(storeSlug, messageToDelete.id);
      if (ok) {
        setMessages(messages.filter(m => m.id !== messageToDelete.id));
        setFeedback({ type: 'success', message: 'Mensagem removida com sucesso.' });
        setMessageToDelete(null);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: 'Não foi possível excluir a mensagem.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao remover mensagem.' });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleTogglePublish(post: BlogPost) {
    try {
      const updated = { ...post, published: !post.published };
      await saveAdminBlogPost(storeSlug, updated);
      setPosts(posts.map(p => (p.id === post.id ? updated : p)));
    } catch {
      alert('Erro ao atualizar status.');
    }
  }

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCat = filterCategory === 'Todos' || post.category === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const uniqueCategories = [
    'Todos',
    ...Array.from(new Set([...blogCategories.map(c => c.name), ...posts.map(p => p.category)].filter(Boolean)))
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border border-emerald-700'
              : 'bg-rose-900 text-rose-100 border border-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar with Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* SubTab: Posts */}
          <button
            onClick={() => setSubTab('posts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'posts'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Artigos ({posts.length})</span>
          </button>

          {/* SubTab: Categorias */}
          <button
            onClick={() => setSubTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'categories'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categorias ({blogCategories.length})</span>
          </button>

          {/* SubTab: Editores */}
          <button
            onClick={() => setSubTab('editors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'editors'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Perfis de Editores ({blogEditors.length})</span>
          </button>

          {/* SubTab: Anúncios nos Artigos */}
          <button
            onClick={() => setSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'settings'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Anúncios nos Artigos</span>
          </button>

          {/* SubTab: Mensagens */}
          <button
            onClick={() => setSubTab('messages')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition relative cursor-pointer ${
              subTab === 'messages'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Mensagens</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-neutral-950">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        {subTab === 'posts' && (
          <button
            onClick={handleOpenNewPost}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-neutral-950 hover:bg-neutral-100 transition shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Artigo</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: POSTS */}
      {subTab === 'posts' && (
        <div className="space-y-4">
          {/* Filter / Search bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artigos por título ou resumo..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-neutral-700"
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Posts Table */}
          {loading ? (
            <div className="py-16 text-center text-neutral-500 text-xs">
              Carregando artigos do blog...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 text-center bg-neutral-900/50 rounded-2xl border border-neutral-800 p-8 space-y-3">
              <BookOpen className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-400">Nenhum artigo encontrado.</p>
              <p className="text-xs text-neutral-500">
                {searchQuery ? 'Tente mudar sua busca ou categoria.' : 'Clique em "Criar Novo Artigo" para começar a postar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Cover thumbnail */}
                    <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                      {post.coverImage ? (
                        <img
                          src={normalizeImageUrl(post.coverImage)}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-700">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A5C3F]/30 text-emerald-400 border border-emerald-500/20">
                          {post.category}
                        </span>
                        {post.destaque && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Destaque
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            post.published
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {post.published ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-1">{post.title}</h4>
                      <p className="text-xs text-neutral-400 line-clamp-1">{post.excerpt}</p>

                      <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {post.readTime || '3 min'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {post.views || 0} visualizações
                        </span>
                        {post.author && (
                          <span className="flex items-center gap-1 text-neutral-400">
                            ✍️ {post.author}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        post.published
                          ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {post.published ? 'Despublicar' : 'Publicar'}
                    </button>

                    <button
                      onClick={() => handleOpenEditPost(post)}
                      className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition cursor-pointer"
                      title="Editar Artigo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setPostToDelete(post)}
                      className="p-2 rounded-xl bg-neutral-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
                      title="Excluir Artigo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CATEGORIAS */}
      {subTab === 'categories' && (
        <BlogCategoriesView storeSlug={storeSlug} onCategoriesUpdated={loadData} />
      )}

      {/* SUB-TAB 3: EDITORES */}
      {subTab === 'editors' && (
        <BlogEditorsView storeSlug={storeSlug} onEditorsUpdated={loadData} />
      )}

      {/* SUB-TAB 4: ANÚNCIOS NOS ARTIGOS */}
      {subTab === 'settings' && (
        <BlogSettingsView
          storeSlug={storeSlug}
          hideHeroAndFooter={true}
          defaultSection="ads"
        />
      )}

      {/* SUB-TAB 5: MESSAGES */}
      {subTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-white">Mensagens Enviadas pelo Formulário de Contato</h3>
            <span className="text-xs text-neutral-500">Total: {messages.length}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-neutral-500 text-xs">Carregando mensagens...</div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center bg-neutral-900/50 rounded-2xl border border-neutral-800 p-8 space-y-2">
              <Mail className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-400">Nenhuma mensagem recebida ainda.</p>
              <p className="text-xs text-neutral-500">As dúvidas e sugestões dos leitores aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{msg.name}</span>
                        <span className="text-xs text-emerald-400 font-mono">({msg.email})</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        Enviado em: {new Date(msg.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2A5C3F] text-white hover:opacity-90 transition flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Responder
                      </a>
                      <button
                        onClick={() => setMessageToDelete(msg)}
                        className="p-1.5 rounded-xl bg-neutral-800 text-rose-400 hover:bg-rose-950 transition cursor-pointer"
                        title="Excluir Mensagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                    <span className="text-xs font-bold text-amber-400 block mb-1">
                      Assunto: {msg.subject}
                    </span>
                    <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT ARTICLE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2A5C3F]" />
                <h3 className="font-extrabold text-base text-white">
                  {editingPost ? 'Editar Artigo' : 'Novo Artigo para o Blog'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePost} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Título do Artigo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: 7 Achadinhos que Transformam a Organização da sua Cozinha"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Categoria do Artigo *
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                    >
                      {blogCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon || '🏷️'} {cat.name}
                        </option>
                      ))}
                      <option value="custom">+ Outra / Digitar personalizada</option>
                    </select>

                    {formCategory === 'custom' && (
                      <input
                        type="text"
                        placeholder="Digite o nome da categoria..."
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Author / Editor Selection */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Perfil do Autor / Editor que Assina o Artigo
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Selecione um editor cadastrado
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Escolher Editor
                    </label>
                    <select
                      value={formAuthorId}
                      onChange={(e) => handleAuthorSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Personalizado / Manual --</option>
                      {blogEditors.map(ed => (
                        <option key={ed.id} value={ed.id}>
                          {ed.name} ({ed.role || 'Redator'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Nome de Exibição
                    </label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Cargo / Especialidade
                    </label>
                    <input
                      type="text"
                      value={formAuthorRole}
                      onChange={(e) => setFormAuthorRole(e.target.value)}
                      placeholder="Ex: Curador de Decoração"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Slug & Excerpt */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    URL Amigável (Slug)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="organize-sua-cozinha"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Resumo do Artigo (Exibido no Card e SEO)
                  </label>
                  <input
                    type="text"
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Breve resumo atraente para o leitor..."
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                  />
                </div>
              </div>

              {/* Row 4: Cover Image (Upload from Computer + WebP/AVIF Compression + URL fallback) */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      Imagem de Capa do Artigo *
                    </label>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Suba uma foto do seu computador ou informe um link externo.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/80 w-fit">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Compactação WebP / AVIF Automática
                  </span>
                </div>

                {/* Dropzone & Preview Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCover(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCover(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCover(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile && droppedFile.type.startsWith('image/')) {
                      processCoverImageFile(droppedFile);
                    }
                  }}
                  className={`relative rounded-xl border-2 border-dashed transition p-4 flex flex-col items-center justify-center text-center ${
                    isDraggingCover
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : formCoverImage
                      ? 'border-neutral-800 bg-neutral-900/60'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-emerald-600/70 hover:bg-neutral-900/80'
                  }`}
                >
                  {isCompressingCover ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <p className="text-xs font-bold text-white">
                        Compactando e convertendo para WebP/AVIF...
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Otimizando nitidez e reduzindo o peso do arquivo para carregamento ultra-rápido.
                      </p>
                    </div>
                  ) : formCoverImage ? (
                    <div className="w-full space-y-3">
                      {/* Image Preview Container */}
                      <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 group">
                        <img
                          src={normalizeImageUrl(formCoverImage)}
                          alt="Capa do Artigo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                        />

                        {/* Status tag */}
                        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-2 z-10">
                          <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1 shadow-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {formCoverImage.startsWith('/uploads/') ? 'Salva no Servidor (.webp)' : 'Imagem Otimizada'}
                          </span>
                          {coverOptimizationInfo && coverOptimizationInfo.savedPercent !== undefined && coverOptimizationInfo.savedPercent > 0 && (
                            <span className="px-2 py-1 rounded-lg bg-emerald-900/90 text-white text-[10px] font-bold border border-emerald-600 shadow-md">
                              ↓ {coverOptimizationInfo.savedPercent}% menor ({coverOptimizationInfo.originalKb}KB → {coverOptimizationInfo.newKb}KB)
                            </span>
                          )}
                        </div>

                        {/* Top action buttons */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                          <label
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-700 cursor-pointer shadow-md transition"
                            title="Trocar por outra imagem do computador"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Trocar Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleCoverFileInput}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setFormCoverImage('');
                              setCoverOptimizationInfo(null);
                            }}
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 shadow-md transition"
                            title="Remover imagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 text-emerald-400 border border-neutral-700 flex items-center justify-center shadow-inner">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-neutral-200">
                          Clique no botão abaixo ou arraste uma foto aqui
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Formatos aceitos: JPG, PNG, WEBP, GIF, AVIF (Convertida e compactada automaticamente)
                        </p>
                      </div>

                      {/* Prominent Upload Button from Computer */}
                      <label className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950/50 transition">
                        <Upload className="w-4 h-4" />
                        <span>Subir Imagem do Computador</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverFileInput}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Secondary Option: Direct URL */}
                <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap">
                    Ou cole a URL direta:
                  </span>
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="text"
                      value={formCoverImage}
                      onChange={(e) => {
                        const val = normalizeImageUrl(e.target.value);
                        setFormCoverImage(val);
                        setCoverOptimizationInfo(null);
                      }}
                      placeholder="https://images.unsplash.com/... (auto-converte para WebP)"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {formCoverImage && !formCoverImage.startsWith('data:') && (
                      <a
                        href={normalizeImageUrl(formCoverImage)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 shrink-0"
                        title="Abrir imagem em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 5: Content Body (Markdown) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-300">
                    Conteúdo Completo do Artigo (Suporta Markdown) *
                  </label>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setFormContent(prev => prev + '\n\n## Subtítulo')}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:text-white"
                    >
                      + H2
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormContent(prev => prev + '\n\n### Título Menor')}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:text-white"
                    >
                      + H3
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormContent(prev => prev + '\n- Item de lista')}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:text-white"
                    >
                      + Lista
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormContent(prev => prev + '\n> Destaque em citação...')}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:text-white"
                    >
                      + Citação
                    </button>
                    <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900 cursor-pointer transition">
                      <ImageIcon className="w-3 h-3" />
                      <span>{isUploadingInlineImg ? 'Enviando...' : '+ Imagem do Computador'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingInlineImg}
                        className="hidden"
                        onChange={handleInlineImageUpload}
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  rows={10}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Escreva seu artigo completo aqui..."
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-[#2A5C3F] font-mono leading-relaxed"
                />
              </div>

              {/* Per-Article Sidebar Banner Configuration */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-400">
                    <input
                      type="checkbox"
                      checked={formBannerEnabled}
                      onChange={(e) => setFormBannerEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-neutral-900 border-neutral-700"
                    />
                    <span>Exibir Banner Vertical na Lateral deste Artigo</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Se desmarcado, nenhum banner lateral aparece neste artigo.
                  </span>
                </div>

                {formBannerEnabled && (
                  <div className="space-y-3 pt-2 border-t border-neutral-800">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                        Carregar do Produto da Loja (Opcional)
                      </label>
                      <select
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const prod = products.find(p => p.id === prodId);
                          if (!prod) return;
                          setFormBannerImg(prod.img1 || '');
                          setFormBannerLink(prod.linkAfiliado || prod.link || '');
                          setFormBannerTitle(prod.nome || '');
                          setFormBannerDesc(prod.descricao || `R$ ${(prod.precoPromo || prod.preco).toFixed(2).replace('.', ',')}`);
                          setFormBannerBadge(prod.plataforma ? `ACHADINHO ${prod.plataforma.toUpperCase()}` : 'DESTAQUE');
                          setFormBannerBtn(prod.plataforma ? `Ver na ${prod.plataforma} →` : 'Aproveitar Oferta →');
                        }}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                      >
                        <option value="">-- Escolher produto da vitrine para preencher --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.nome} ({p.plataforma || 'Geral'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                          Imagem Vertical (URL ou Computador)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={formBannerImg}
                            onChange={(e) => setFormBannerImg(e.target.value)}
                            placeholder="https://... ou faça upload"
                            className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white font-mono"
                          />
                          <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Pc</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const res = event.target?.result as string;
                                  if (res) setFormBannerImg(res);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                          Título do Banner
                        </label>
                        <input
                          type="text"
                          value={formBannerTitle}
                          onChange={(e) => setFormBannerTitle(e.target.value)}
                          placeholder="Ex: Organizador 360°"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-300 mb-1">Badge (Ex: DESTAQUE)</label>
                        <input
                          type="text"
                          value={formBannerBadge}
                          onChange={(e) => setFormBannerBadge(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-300 mb-1">Texto do Botão</label>
                        <input
                          type="text"
                          value={formBannerBtn}
                          onChange={(e) => setFormBannerBtn(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-300 mb-1">Link de Destino / Afiliado</label>
                        <input
                          type="url"
                          value={formBannerLink}
                          onChange={(e) => setFormBannerLink(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">Descrição curta</label>
                      <input
                        type="text"
                        value={formBannerDesc}
                        onChange={(e) => setFormBannerDesc(e.target.value)}
                        placeholder="Frete grátis e desconto..."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 6: Read Time & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Tempo Estimado de Leitura
                  </label>
                  <input
                    type="text"
                    value={formReadTime}
                    onChange={(e) => setFormReadTime(e.target.value)}
                    placeholder="4 min"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Tags (Separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="cozinha, dicas, economia"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#2A5C3F]"
                  />
                </div>
              </div>

              {/* Row 7: Toggles */}
              <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                    <input
                      type="checkbox"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 bg-neutral-950 border-neutral-700"
                    />
                    <span>Publicar Imediatamente</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-400">
                    <input
                      type="checkbox"
                      checked={formDestaque}
                      onChange={(e) => setFormDestaque(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-neutral-950 border-neutral-700"
                    />
                    <span>Destaque Principal na Página Inicial</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#2A5C3F] text-white hover:opacity-90 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingPost ? 'Salvar Alterações' : 'Publicar Artigo'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Article */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-white">Excluir Artigo</h3>
              <p className="text-xs text-neutral-300">
                Tem certeza que deseja excluir permanentemente o artigo{' '}
                <strong className="text-rose-400">"{postToDelete.title}"</strong>?
              </p>
              <p className="text-[11px] text-neutral-500">
                Esta ação não pode ser desfeita e o artigo será removido do blog imediatamente.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Contact Message */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-white">Excluir Mensagem</h3>
              <p className="text-xs text-neutral-300">
                Deseja realmente excluir a mensagem de <strong className="text-white">{messageToDelete.name}</strong> ({messageToDelete.email})?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMessage}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Mensagem</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
