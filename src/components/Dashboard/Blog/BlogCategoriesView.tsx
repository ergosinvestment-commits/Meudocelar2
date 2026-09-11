import React, { useState, useEffect } from 'react';
import { BlogCategory, BlogPost } from '../../../types';
import {
  fetchAdminBlogCategories,
  saveAdminBlogCategory,
  deleteAdminBlogCategory,
  fetchAdminBlogPosts
} from '../../../api/client';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Save,
  Search,
  FolderOpen
} from 'lucide-react';

interface BlogCategoriesViewProps {
  storeSlug: string;
  onCategoriesUpdated?: () => void;
}

// Helpers robustos para interpretar booleans evitando problemas com 0 !== false ou strings
function isCatInMenu(cat: BlogCategory | any): boolean {
  if (!cat) return true;
  const val = cat.mostrarNoMenu !== undefined ? cat.mostrarNoMenu : cat.exibirNoMenu;
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return true;
}

function isCatActive(cat: BlogCategory | any): boolean {
  if (!cat) return true;
  const val = cat.active !== undefined ? cat.active : cat.ativo;
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return true;
}

export default function BlogCategoriesView({ storeSlug, onCategoriesUpdated }: BlogCategoriesViewProps) {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('📑');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [formMostrarNoMenu, setFormMostrarNoMenu] = useState(true);

  useEffect(() => {
    loadData();
  }, [storeSlug]);

  async function loadData() {
    try {
      setLoading(true);
      const [cats, postsData] = await Promise.all([
        fetchAdminBlogCategories(storeSlug),
        fetchAdminBlogPosts(storeSlug).catch(() => [])
      ]);
      setCategories(cats || []);
      setPosts(postsData || []);
    } catch (err) {
      console.error('Error loading blog categories:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormIcon('🏷️');
    setFormDescription('');
    setFormOrder(categories.length + 1);
    setFormActive(true);
    setFormMostrarNoMenu(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(cat: BlogCategory) {
    setEditingCategory(cat);
    setFormName(cat.name || '');
    setFormSlug(cat.slug || '');
    setFormIcon(cat.icon || '🏷️');
    setFormDescription(cat.description || '');
    setFormOrder(cat.order || 1);
    setFormActive(isCatActive(cat));
    setFormMostrarNoMenu(isCatInMenu(cat));
    setIsModalOpen(true);
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

  function handleNameChange(val: string) {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(slugify(val));
    }
  }

  async function handleToggleMenu(cat: BlogCategory) {
    const currentInMenu = isCatInMenu(cat);
    const nextInMenu = !currentInMenu;

    // Atualização otimista imediata na UI
    setCategories(prev =>
      prev.map(c => (c.id === cat.id ? { ...c, mostrarNoMenu: nextInMenu } : c))
    );

    try {
      setTogglingId(cat.id);
      const payload: Partial<BlogCategory> & { exibirNoMenu?: boolean } = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || '📑',
        description: cat.description || '',
        order: cat.order || 1,
        active: isCatActive(cat),
        mostrarNoMenu: nextInMenu,
        exibirNoMenu: nextInMenu
      };

      const saved = await saveAdminBlogCategory(storeSlug, payload);
      setCategories(prev => prev.map(c => (c.id === saved.id ? saved : c)));
      setFeedback({
        type: 'success',
        message: nextInMenu
          ? `Categoria "${cat.name}" agora é exibida no menu superior do Blog!`
          : `Categoria "${cat.name}" removida do menu superior (fica visível no botão "Categorias").`
      });
      if (onCategoriesUpdated) onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      // Reverte em caso de erro
      setCategories(prev =>
        prev.map(c => (c.id === cat.id ? { ...c, mostrarNoMenu: currentInMenu } : c))
      );
      setFeedback({ type: 'error', message: err?.message || 'Erro ao alterar exibição no menu.' });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleActive(cat: BlogCategory) {
    const currentActive = isCatActive(cat);
    const nextActive = !currentActive;

    // Atualização otimista imediata
    setCategories(prev =>
      prev.map(c => (c.id === cat.id ? { ...c, active: nextActive } : c))
    );

    try {
      setTogglingId(cat.id);
      const payload: Partial<BlogCategory> = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || '📑',
        description: cat.description || '',
        order: cat.order || 1,
        active: nextActive,
        mostrarNoMenu: isCatInMenu(cat)
      };

      const saved = await saveAdminBlogCategory(storeSlug, payload);
      setCategories(prev => prev.map(c => (c.id === saved.id ? saved : c)));
      setFeedback({
        type: 'success',
        message: nextActive
          ? `Categoria "${cat.name}" ativada!`
          : `Categoria "${cat.name}" desativada!`
      });
      if (onCategoriesUpdated) onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setCategories(prev =>
        prev.map(c => (c.id === cat.id ? { ...c, active: currentActive } : c))
      );
      setFeedback({ type: 'error', message: err?.message || 'Erro ao alterar status da categoria.' });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'O nome da categoria é obrigatório.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const payload: Partial<BlogCategory> & { exibirNoMenu?: boolean } = {
        id: editingCategory?.id,
        name: formName.trim(),
        slug: formSlug.trim() || slugify(formName),
        icon: formIcon.trim() || '📑',
        description: formDescription.trim(),
        order: Number(formOrder) || 1,
        active: Boolean(formActive),
        mostrarNoMenu: Boolean(formMostrarNoMenu),
        exibirNoMenu: Boolean(formMostrarNoMenu)
      };

      const saved = await saveAdminBlogCategory(storeSlug, payload);

      if (editingCategory) {
        setCategories(prev => prev.map(c => c.id === saved.id ? saved : c));
        setFeedback({ type: 'success', message: `Categoria "${saved.name}" atualizada com sucesso!` });
      } else {
        setCategories(prev => [...prev, saved]);
        setFeedback({ type: 'success', message: `Categoria "${saved.name}" criada com sucesso!` });
      }

      setIsModalOpen(false);
      if (onCategoriesUpdated) onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar categoria.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteCategory() {
    if (!categoryToDelete) return;
    const { id, name } = categoryToDelete;

    try {
      setDeletingId(id);
      const success = await deleteAdminBlogCategory(storeSlug, id);
      if (success) {
        setCategories(prev => prev.filter(c => c.id !== id));
        setFeedback({ type: 'success', message: `Categoria "${name}" excluída com sucesso.` });
        setCategoryToDelete(null);
        if (onCategoriesUpdated) onCategoriesUpdated();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: 'Erro ao excluir categoria.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao excluir categoria.' });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            Gestão de Categorias dos Artigos
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Crie, edite e organize os tópicos editoriais do blog. Os artigos podem ser filtrados por essas categorias na Home e no leitor.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <span className="text-xs text-neutral-500 font-medium self-end sm:self-auto">
          Total: <strong className="text-neutral-900 font-bold">{categories.length}</strong> categorias cadastradas
        </span>
      </div>

      {/* Categories Grid / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-neutral-600">Carregando categorias...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-neutral-300">
          <FolderOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800">Nenhuma categoria encontrada</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Nenhum resultado para a busca.' : 'Clique no botão acima para criar a primeira categoria de artigos do seu blog.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const articleCount = posts.filter(
              p => p.category?.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const inMenu = isCatInMenu(cat);
            const isActive = isCatActive(cat);
            const isToggling = togglingId === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 bg-neutral-50 rounded-xl border border-neutral-100 group-hover:scale-110 transition-transform">
                        {cat.icon || '📑'}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-700 transition">
                          {cat.name}
                        </h4>
                        <span className="text-[11px] font-mono text-neutral-400">
                          slug: {cat.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        disabled={isToggling}
                        title={isActive ? 'Clique para desativar' : 'Clique para ativar'}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition active:scale-95 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        }`}
                      >
                        {isActive ? '● Ativa' : '○ Inativa'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMenu(cat)}
                        disabled={isToggling}
                        title={inMenu ? 'Clique para ocultar do menu superior' : 'Clique para exibir no menu superior'}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer transition active:scale-95 flex items-center gap-1 ${
                          inMenu
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        }`}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : null}
                        <span>{inMenu ? '✓ No Menu Superior' : '✕ Apenas em Categorias'}</span>
                      </button>
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-xs text-neutral-600 line-clamp-2 mt-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {articleCount} {articleCount === 1 ? 'artigo' : 'artigos'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setCategoryToDelete(cat)}
                      disabled={deletingId === cat.id}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      title="Excluir Categoria"
                    >
                      {deletingId === cat.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                {editingCategory ? 'Editar Categoria do Blog' : 'Criar Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Ícone / Emoji
                  </label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    placeholder="🍳"
                    className="w-full text-center text-lg px-2 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="col-span-9">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Casa & Cozinha"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Slug URL (Identificador)
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="ex: casa-cozinha"
                  className="w-full text-xs font-mono px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Descrição Curta (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Eletroportáteis, utensílios inteligentes e receitas..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(formActive)}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-neutral-800">Categoria Ativa</span>
                      <p className="text-[10px] text-neutral-400">Visível no site</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formMostrarNoMenu)}
                    onChange={(e) => setFormMostrarNoMenu(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800">Exibir no menu superior do Blog</span>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                      {formMostrarNoMenu
                        ? '✓ Marcado: Aparece diretamente como botão de atalho na barra superior do Blog.'
                        : '○ Desmarcado: Oculto da barra superior. Permanece visível no botão suspenso "Categorias".'}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Categoria</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-neutral-900">Excluir Categoria</h3>
              <p className="text-xs text-neutral-600">
                Tem certeza que deseja excluir a categoria{' '}
                <strong className="text-neutral-900">"{categoryToDelete.name}"</strong>?
              </p>
              {posts.filter(p => p.category?.toLowerCase() === categoryToDelete.name.toLowerCase()).length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] text-left">
                  ⚠️ <strong>Atenção:</strong> Existem{' '}
                  {posts.filter(p => p.category?.toLowerCase() === categoryToDelete.name.toLowerCase()).length}{' '}
                  artigo(s) associado(s) a esta categoria.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
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
