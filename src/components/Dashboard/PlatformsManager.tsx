import React, { useState } from 'react';
import { Platform, Product } from '../../types';
import { createPlatform, updatePlatform, patchPlatform, deletePlatform } from '../../api/client';
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  Check,
  X,
  Globe,
  Tag,
  AlertTriangle,
  MoveUp,
  MoveDown,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import DynamicIcon from '../DynamicIcon';

interface PlatformsManagerProps {
  storeSlug: string;
  platforms: Platform[];
  products: Product[];
  onRefresh: () => void;
  primaryColor?: string;
}

const PRESET_COLORS = [
  '#FF9900', // Amazon Orange
  '#EE4D2D', // Shopee Red/Orange
  '#EAB308', // Mercado Livre Yellow
  '#0086FF', // Magalu Blue
  '#18181B', // Shein Black
  '#EF4444', // AliExpress Red
  '#F97316', // Hotmart Orange
  '#10B981', // Kiwify Green
  '#F59E0B', // Eduzz Amber
  '#8B5CF6', // Braip Purple
  '#F43F5E', // TikTok Shop Pink
  '#06B6D4', // Cyan
  '#2A5C3F', // Forest Green
  '#4F46E5', // Indigo
];

const PRESET_EMOJIS = ['📦', '🛍️', '🤝', '🏬', '👗', '✈️', '🎓', '💡', '🚀', '💎', '🎵', '🛒', '🏷️', '⭐'];

export default function PlatformsManager({
  storeSlug,
  platforms,
  products,
  onRefresh,
  primaryColor = '#2A5C3F'
}: PlatformsManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Partial<Platform> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Count products for each platform
  function getProductCountForPlatform(platformName: string): number {
    return products.filter(p => p.plataforma?.trim().toLowerCase() === platformName?.trim().toLowerCase()).length;
  }

  function handleOpenCreate() {
    setEditingPlatform({
      nome: '',
      corBadge: '#FF9900',
      icone: '🛍️',
      textoBotaoPadrao: 'Ver oferta →',
      urlPadrao: '',
      descricao: '',
      ordem: platforms.length + 1,
      ativo: true
    });
    setModalOpen(true);
  }

  function handleOpenEdit(plat: Platform) {
    setEditingPlatform({ ...plat });
    setModalOpen(true);
  }

  async function handleToggleActive(plat: Platform) {
    try {
      await patchPlatform(storeSlug, plat.id, { ativo: !plat.ativo });
      onRefresh();
    } catch (err) {
      console.error('Error toggling platform active status:', err);
    }
  }

  async function handleSavePlatform(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlatform || !editingPlatform.nome?.trim()) return;
    setIsSaving(true);

    try {
      if (editingPlatform.id) {
        await updatePlatform(storeSlug, editingPlatform.id, editingPlatform);
      } else {
        await createPlatform(storeSlug, editingPlatform);
      }
      setModalOpen(false);
      setEditingPlatform(null);
      onRefresh();
    } catch (err) {
      console.error('Error saving platform:', err);
      alert('Erro ao salvar plataforma.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!platformToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlatform(storeSlug, platformToDelete.id);
      setPlatformToDelete(null);
      onRefresh();
    } catch (err) {
      console.error('Error deleting platform:', err);
      alert('Erro ao excluir plataforma.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMoveOrder(plat: Platform, direction: 'up' | 'down') {
    const sorted = [...platforms].sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
    const currentIndex = sorted.findIndex(p => p.id === plat.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentPlat = sorted[currentIndex];
    const targetPlat = sorted[targetIndex];

    const currentOrder = currentPlat.ordem || currentIndex + 1;
    const targetOrder = targetPlat.ordem || targetIndex + 1;

    try {
      await Promise.all([
        patchPlatform(storeSlug, currentPlat.id, { ordem: targetOrder }),
        patchPlatform(storeSlug, targetPlat.id, { ordem: currentOrder })
      ]);
      onRefresh();
    } catch (err) {
      console.error('Error updating platform order:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Gerenciador de Plataformas de Afiliados
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Cadastre, edite e personalize as plataformas parceiras (Amazon, Shopee, Mercado Livre, Hotmart, etc.) com cores e textos de botões automáticos.
          </p>
        </div>

        <button
          id="btn-nova-plataforma"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-4 h-4" />
          <span>Nova Plataforma</span>
        </button>
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((plat, idx) => {
          const productCount = getProductCountForPlatform(plat.nome);
          const badgeColor = plat.corBadge || '#2A5C3F';

          return (
            <div
              key={plat.id}
              className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                plat.ativo ? 'border-neutral-200/90' : 'border-neutral-200/60 opacity-60 bg-neutral-50/50'
              }`}
            >
              <div>
                {/* Card Top: Icon, Name, Badge, Active Toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xs border border-neutral-100"
                      style={{ backgroundColor: `${badgeColor}15` }}
                    >
                      <DynamicIcon icon={plat.icone} className="w-5 h-5" fallback="🛍️" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                        {plat.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {plat.nome}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          • #{plat.ordem || idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active status pill */}
                  <button
                    onClick={() => handleToggleActive(plat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                      plat.ativo
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 border border-neutral-200'
                    }`}
                    title={plat.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${plat.ativo ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                    {plat.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                </div>

                {/* Description or details */}
                {plat.descricao && (
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                    {plat.descricao}
                  </p>
                )}

                {/* Default button text preview */}
                <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 mb-3 space-y-1.5 text-xs">
                  <div className="text-[10px] font-bold uppercase text-neutral-400">Botão Padrão:</div>
                  <div className="text-neutral-700 font-semibold text-xs flex items-center justify-between">
                    <span>{plat.textoBotaoPadrao || `Ver oferta na ${plat.nome} →`}</span>
                    {plat.urlPadrao && (
                      <a
                        href={plat.urlPadrao}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Visitar URL Padrão"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Products Count & Actions */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs mt-2">
                <div className="text-neutral-500 font-medium flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    <strong className="text-neutral-900">{productCount}</strong> {productCount === 1 ? 'produto vinculado' : 'produtos vinculados'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Order controls */}
                  <button
                    onClick={() => handleMoveOrder(plat, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(plat, 'down')}
                    disabled={idx === platforms.length - 1}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-[1px] bg-neutral-200 mx-0.5" />

                  {/* Edit button */}
                  <button
                    onClick={() => handleOpenEdit(plat)}
                    className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                    title="Editar plataforma"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setPlatformToDelete(plat)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Excluir plataforma"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {platforms.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-neutral-200 text-center space-y-4">
          <Globe className="w-12 h-12 text-neutral-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-neutral-800">Nenhuma plataforma cadastrada</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
              Cadastre suas plataformas de afiliação para organizar produtos e botões de chamada.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition"
          >
            Cadastrar Primeira Plataforma
          </button>
        </div>
      )}

      {/* Modal Create / Edit Platform */}
      {modalOpen && editingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                {editingPlatform.id ? 'Editar Plataforma' : 'Nova Plataforma'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlatform} className="space-y-4">
              {/* Nome da Plataforma */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Nome da Plataforma <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amazon, Shopee, Mercado Livre..."
                  value={editingPlatform.nome || ''}
                  onChange={(e) => {
                    const nome = e.target.value;
                    setEditingPlatform(prev => ({
                      ...prev,
                      nome,
                      textoBotaoPadrao: prev?.textoBotaoPadrao && prev.textoBotaoPadrao !== 'Ver oferta →' && !prev.textoBotaoPadrao.startsWith('Ver oferta na ')
                        ? prev.textoBotaoPadrao
                        : `Ver oferta na ${nome || 'loja'} →`
                    }));
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400 font-medium"
                />
              </div>

              {/* Ícone / Emoji Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Ícone / Emoji
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_EMOJIS.map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setEditingPlatform(prev => ({ ...prev, icone: emoji }))}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition border ${
                        editingPlatform.icone === emoji
                          ? 'border-neutral-900 bg-neutral-100 shadow-xs scale-110'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Custom"
                    maxLength={3}
                    value={editingPlatform.icone || ''}
                    onChange={(e) => setEditingPlatform(prev => ({ ...prev, icone: e.target.value }))}
                    className="w-14 px-2 py-1.5 text-center text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Cor da Tag / Badge */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Cor da Tag / Badge
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setEditingPlatform(prev => ({ ...prev, corBadge: color }))}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        editingPlatform.corBadge === color
                          ? 'border-neutral-900 scale-125 shadow-xs'
                          : 'border-white shadow-2xs hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="color"
                      value={editingPlatform.corBadge || '#2A5C3F'}
                      onChange={(e) => setEditingPlatform(prev => ({ ...prev, corBadge: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={editingPlatform.corBadge || '#2A5C3F'}
                      onChange={(e) => setEditingPlatform(prev => ({ ...prev, corBadge: e.target.value }))}
                      className="w-20 px-2 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Badge Live Preview */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500 font-medium">Prévia do Selo:</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: editingPlatform.corBadge || '#2A5C3F' }}
                  >
                    <DynamicIcon icon={editingPlatform.icone} className="w-3.5 h-3.5" fallback="🛍️" />
                    <span>{editingPlatform.nome || 'Nome da Plataforma'}</span>
                  </span>
                </div>
              </div>

              {/* Texto Padrão do Botão */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Texto Padrão do Botão de Compra
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ver oferta na Amazon →"
                  value={editingPlatform.textoBotaoPadrao || ''}
                  onChange={(e) => setEditingPlatform(prev => ({ ...prev, textoBotaoPadrao: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Sugestão automática preenchida ao cadastrar novos produtos dessa plataforma.
                </p>
              </div>

              {/* URL / Domínio Oficial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  URL / Domínio Padrão (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://amazon.com.br"
                  value={editingPlatform.urlPadrao || ''}
                  onChange={(e) => setEditingPlatform(prev => ({ ...prev, urlPadrao: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
              </div>

              {/* Descrição / Observações */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Descrição / Notas Internas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Programa de associados Amazon Brasil com comissões de até 15%"
                  value={editingPlatform.descricao || ''}
                  onChange={(e) => setEditingPlatform(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
              </div>

              {/* Ativo Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlatform.ativo !== false}
                    onChange={(e) => setEditingPlatform(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-neutral-800">
                    Plataforma Ativa (Disponível para seleção nos produtos)
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editingPlatform.nome?.trim()}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingPlatform.id ? 'Salvar Alterações' : 'Criar Plataforma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {platformToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900">
                Excluir Plataforma "{platformToDelete.nome}"?
              </h3>
              <p className="text-xs text-neutral-500">
                Esta ação removerá a plataforma da lista de opções.
                {getProductCountForPlatform(platformToDelete.nome) > 0 && (
                  <span className="block text-amber-600 font-semibold mt-1">
                    Atenção: Existem {getProductCountForPlatform(platformToDelete.nome)} produtos vinculados a esta plataforma!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlatformToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
