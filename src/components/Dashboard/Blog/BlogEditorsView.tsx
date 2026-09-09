import React, { useState, useEffect } from 'react';
import { BlogEditor, BlogPost } from '../../../types';
import {
  fetchAdminBlogEditors,
  saveAdminBlogEditor,
  deleteAdminBlogEditor,
  fetchAdminBlogPosts,
  uploadImageToServer
} from '../../../api/client';
import { normalizeImageUrl } from '../../../utils';
import { compressImageToWebP } from '../../../utils/imageCompressor';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Save,
  Search,
  Mail,
  ExternalLink,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

interface BlogEditorsViewProps {
  storeSlug: string;
  onEditorsUpdated?: () => void;
}

export default function BlogEditorsView({ storeSlug, onEditorsUpdated }: BlogEditorsViewProps) {
  const [editors, setEditors] = useState<BlogEditor[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEditor, setEditingEditor] = useState<BlogEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editorToDelete, setEditorToDelete] = useState<BlogEditor | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formRole, setFormRole] = useState('Redator & Curador');
  const [formBio, setFormBio] = useState('');
  const [formSocialLink, setFormSocialLink] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    loadData();
  }, [storeSlug]);

  async function loadData() {
    try {
      setLoading(true);
      const [editorsData, postsData] = await Promise.all([
        fetchAdminBlogEditors(storeSlug),
        fetchAdminBlogPosts(storeSlug).catch(() => [])
      ]);
      setEditors(editorsData || []);
      setPosts(postsData || []);
    } catch (err) {
      console.error('Error loading blog editors:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingEditor(null);
    setFormName('');
    setFormAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80&fm=webp');
    setFormRole('Redator & Curador de Achadinhos');
    setFormBio('Apaixonado(a) por garimpar produtos de alta qualidade, custo-benefício e organização para o lar.');
    setFormSocialLink('https://instagram.com');
    setFormEmail('');
    setFormActive(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(editor: BlogEditor) {
    setEditingEditor(editor);
    setFormName(editor.name || '');
    setFormAvatar(editor.avatar || '');
    setFormRole(editor.role || '');
    setFormBio(editor.bio || '');
    setFormSocialLink(editor.socialLink || '');
    setFormEmail(editor.email || '');
    setFormActive(editor.active !== false);
    setIsModalOpen(true);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageToWebP(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85
      });
      const serverUrl = await uploadImageToServer(compressedDataUrl, file.name);
      setFormAvatar(serverUrl || compressedDataUrl);
    } catch (err) {
      console.error('Erro ao comprimir avatar:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setFormAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      e.target.value = '';
    }
  }

  async function handleSaveEditor(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'O nome do editor é obrigatório.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const payload: Partial<BlogEditor> = {
        id: editingEditor?.id,
        name: formName.trim(),
        avatar: formAvatar.trim(),
        role: formRole.trim(),
        bio: formBio.trim(),
        socialLink: formSocialLink.trim(),
        email: formEmail.trim(),
        active: formActive
      };

      const saved = await saveAdminBlogEditor(storeSlug, payload);

      if (editingEditor) {
        setEditors(prev => prev.map(e => e.id === saved.id ? saved : e));
        setFeedback({ type: 'success', message: `Perfil de "${saved.name}" atualizado com sucesso!` });
      } else {
        setEditors(prev => [...prev, saved]);
        setFeedback({ type: 'success', message: `Perfil de "${saved.name}" criado com sucesso!` });
      }

      setIsModalOpen(false);
      if (onEditorsUpdated) onEditorsUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar perfil do editor.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteEditor() {
    if (!editorToDelete) return;
    const { id, name } = editorToDelete;

    try {
      setDeletingId(id);
      const success = await deleteAdminBlogEditor(storeSlug, id);
      if (success) {
        setEditors(prev => prev.filter(e => e.id !== id));
        setFeedback({ type: 'success', message: `Perfil de "${name}" removido com sucesso.` });
        setEditorToDelete(null);
        if (onEditorsUpdated) onEditorsUpdated();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: 'Erro ao remover editor.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao remover editor.' });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredEditors = editors.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.role && e.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (e.bio && e.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Perfis de Editores & Redatores
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cadastre os autores e redatores que assinam os artigos do Blog. Ao criar um novo post, você pode selecionar o autor para exibir sua foto, cargo e mini biografia.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Editor</span>
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

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar editores por nome, cargo ou bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <span className="text-xs text-neutral-500 font-medium self-end sm:self-auto">
          Total: <strong className="text-neutral-900 font-bold">{editors.length}</strong> perfis cadastrados
        </span>
      </div>

      {/* Editors Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-neutral-600">Carregando editores...</p>
        </div>
      ) : filteredEditors.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-neutral-300">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800">Nenhum editor encontrado</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Nenhum resultado para a busca.' : 'Clique no botão acima para adicionar o primeiro autor do seu Blog.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEditors.map((editor) => {
            const articleCount = posts.filter(
              p => p.authorId === editor.id || p.author?.toLowerCase() === editor.name?.toLowerCase()
            ).length;

            return (
              <div
                key={editor.id}
                className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={normalizeImageUrl(editor.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={editor.name}
                        className="w-13 h-13 rounded-full object-cover border-2 border-emerald-500/20 shadow-xs shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-700 transition">
                          {editor.name}
                        </h4>
                        <span className="text-xs text-emerald-700 font-semibold block">
                          {editor.role || 'Redator'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        editor.active !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {editor.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {editor.bio && (
                    <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed mb-3">
                      {editor.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-[11px] text-neutral-500">
                    {editor.email && (
                      <span className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                        <Mail className="w-3 h-3 text-neutral-400" />
                        {editor.email}
                      </span>
                    )}
                    {editor.socialLink && (
                      <a
                        href={editor.socialLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 bg-neutral-50 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-md border border-neutral-100 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-neutral-400" />
                        Rede Social
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    {articleCount} {articleCount === 1 ? 'artigo assinado' : 'artigos assinados'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(editor)}
                      className="p-2 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Editar Perfil"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setEditorToDelete(editor)}
                      disabled={deletingId === editor.id}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      title="Excluir Perfil"
                    >
                      {deletingId === editor.id ? (
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {editingEditor ? 'Editar Perfil do Editor' : 'Criar Perfil de Editor'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditor} className="space-y-4 mt-4">
              {/* Avatar Preview & Inputs */}
              <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <img
                  src={normalizeImageUrl(formAvatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                />
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700">
                    Foto do Perfil (URL ou Arquivo)
                  </label>
                  <input
                    type="text"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload de Foto (JPG/PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Maria Clara"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Cargo / Especialidade
                  </label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="Ex: Especialista em Decoração"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Mini Biografia (Exibida no final dos artigos)
                </label>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Conte um pouco sobre as experiências, formação e paixão do autor em garimpar produtos..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    E-mail de Contato (Opcional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="maria@email.com"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Link de Rede Social / Perfil
                  </label>
                  <input
                    type="url"
                    value={formSocialLink}
                    onChange={(e) => setFormSocialLink(e.target.value)}
                    placeholder="https://instagram.com/perfil"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-neutral-700">Editor Ativo (disponível para assinar novos artigos)</span>
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
                      <span>Salvar Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Editor Confirmation Modal */}
      {editorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-neutral-900">Remover Perfil de Editor</h3>
              <p className="text-xs text-neutral-600">
                Tem certeza que deseja remover o perfil de{' '}
                <strong className="text-neutral-900">"{editorToDelete.name}"</strong>?
              </p>
              {posts.filter(p => p.authorId === editorToDelete.id || p.author === editorToDelete.name).length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] text-left">
                  ⚠️ <strong>Atenção:</strong> Este editor possui{' '}
                  {posts.filter(p => p.authorId === editorToDelete.id || p.author === editorToDelete.name).length}{' '}
                  artigo(s) publicado(s).
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditorToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEditor}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Remoção</span>
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
