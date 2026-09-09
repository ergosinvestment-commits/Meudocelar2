import React, { useState } from 'react';
import { Category, Product } from '../../types';
import { createCategory, updateCategory, patchCategory, deleteCategory } from '../../api/client';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Tag
} from 'lucide-react';
import DynamicIcon from '../DynamicIcon';

interface CategoriesManagerProps {
  storeSlug: string;
  categories: Category[];
  products: Product[];
  onRefresh: () => void;
  primaryColor?: string;
}

// Helper para determinar com 100% de precisão se a categoria deve ser exibida no menu superior
function isCategoryInMenu(cat: Category): boolean {
  if (!cat) return true;
  if ((cat as any).mostrarNoMenu !== undefined && (cat as any).mostrarNoMenu !== null) {
    return Boolean((cat as any).mostrarNoMenu);
  }
  if ((cat as any).exibirNoMenu !== undefined && (cat as any).exibirNoMenu !== null) {
    return Boolean((cat as any).exibirNoMenu);
  }
  return true;
}

export default function CategoriesManager({
  storeSlug,
  categories,
  products,
  onRefresh,
  primaryColor = '#2A5C3F'
}: CategoriesManagerProps) {
  // Local synchronized categories state for instant optimistic updates
  const [localCategories, setLocalCategories] = React.useState<Category[]>(categories);

  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState<number>(categories.length + 1);
  const [newCatInMenu, setNewCatInMenu] = useState(true);
  const [newSubInput, setNewSubInput] = useState('');
  const [newSubList, setNewSubList] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Category state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editInMenu, setEditInMenu] = useState(true);
  const [editSubs, setEditSubs] = useState<string[]>([]);
  const [editSubInput, setEditSubInput] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Expanded category subcategories manager accordion
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [inlineSubInput, setInlineSubInput] = useState<{ [catId: string]: string }>({});
  const [editingSubInCat, setEditingSubInCat] = useState<{ catId: string; oldName: string; newName: string } | null>(null);
  const [isSubSaving, setIsSubSaving] = useState(false);

  // Feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Deletion Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'subcategory';
    cat: Category;
    subName?: string;
    count: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function showFeedback(text: string, type: 'success' | 'error' = 'success') {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  }

  // Count products per category
  function getProductCount(catName: string): number {
    return products.filter(p => (p.categoria || '').trim().toLowerCase() === catName.trim().toLowerCase()).length;
  }

  // Count products per subcategory
  function getSubProductCount(catName: string, subName: string): number {
    return products.filter(
      p =>
        (p.categoria || '').trim().toLowerCase() === catName.trim().toLowerCase() &&
        (p.subcategoria || '').trim().toLowerCase() === subName.trim().toLowerCase()
    ).length;
  }

  // Get consolidated list of subcategories for a category
  function getCategorySubcategories(cat: Category): string[] {
    if (cat && Array.isArray(cat.subcategorias)) {
      return cat.subcategorias.filter(s => typeof s === 'string' && s.trim().length > 0);
    }
    return [];
  }

  // --- Handlers for New Category Form ---
  function handleAddNewSubTag(e?: React.KeyboardEvent | React.MouseEvent) {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e && 'preventDefault' in e) e.preventDefault();

    const trimmed = newSubInput.trim().replace(/^,|,$/g, '');
    if (!trimmed) return;

    if (!newSubList.includes(trimmed)) {
      setNewSubList(prev => [...prev, trimmed]);
    }
    setNewSubInput('');
  }

  function handleRemoveNewSubTag(index: number) {
    setNewSubList(prev => prev.filter((_, i) => i !== index));
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) {
      showFeedback('Por favor, digite o nome da categoria.', 'error');
      return;
    }

    let finalSubs = [...newSubList];
    if (newSubInput.trim()) {
      const extra = newSubInput.trim().replace(/^,|,$/g, '');
      if (extra && !finalSubs.includes(extra)) {
        finalSubs.push(extra);
      }
    }

    setIsCreating(true);
    try {
      await createCategory(storeSlug, {
        nome: newCatName.trim(),
        ordem: Number(newCatOrder) || categories.length + 1,
        mostrarNoMenu: Boolean(newCatInMenu),
        subcategorias: finalSubs
      });
      setNewCatName('');
      setNewCatOrder(categories.length + 2);
      setNewCatInMenu(true);
      setNewSubList([]);
      setNewSubInput('');
      showFeedback(`Categoria "${newCatName.trim()}" criada com sucesso!`);
      onRefresh();
    } catch (err) {
      console.error('Error creating category:', err);
      showFeedback('Erro ao criar categoria.', 'error');
    } finally {
      setIsCreating(false);
    }
  }

  // --- Handlers for Editing Category ---
  function startEditing(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.nome);
    setEditOrder(cat.ordem || 1);
    setEditInMenu(isCategoryInMenu(cat));
    setEditSubs(getCategorySubcategories(cat));
    setEditSubInput('');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName('');
    setEditSubs([]);
    setEditSubInput('');
  }

  function handleAddEditSubTag(e?: React.KeyboardEvent | React.MouseEvent) {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e && 'preventDefault' in e) e.preventDefault();

    const trimmed = editSubInput.trim().replace(/^,|,$/g, '');
    if (!trimmed) return;

    if (!editSubs.includes(trimmed)) {
      setEditSubs(prev => [...prev, trimmed]);
    }
    setEditSubInput('');
  }

  function handleRemoveEditSubTag(index: number) {
    setEditSubs(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdit(catId: string) {
    if (!editName.trim()) {
      showFeedback('O nome da categoria não pode ficar vazio.', 'error');
      return;
    }

    let finalSubs = [...editSubs];
    if (editSubInput.trim()) {
      const extra = editSubInput.trim().replace(/^,|,$/g, '');
      if (extra && !finalSubs.includes(extra)) {
        finalSubs.push(extra);
      }
    }

    setIsSavingEdit(true);
    const updatedData: Partial<Category> = {
      nome: editName.trim(),
      ordem: Number(editOrder) || 1,
      mostrarNoMenu: Boolean(editInMenu),
      subcategorias: finalSubs
    };

    // 1. Instant local optimistic update
    setLocalCategories(prev =>
      prev.map(c => (c.id === catId ? { ...c, ...updatedData } : c))
    );

    try {
      // 2. Persist to backend
      const saved = await updateCategory(storeSlug, catId, updatedData);
      
      // 3. Update local state with the authoritative server result
      if (saved && saved.id) {
        setLocalCategories(prev =>
          prev.map(c => (c.id === catId ? { ...c, ...saved } : c))
        );
      }

      setEditingId(null);
      showFeedback(
        `Categoria "${editName.trim()}" salva com sucesso! ${
          editInMenu ? 'Exibida na barra superior.' : 'Ocultada da barra superior (visível apenas em Departamentos).'
        }`
      );
      
      // 4. Propagate refresh to parent dashboard & storefront sync
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating category:', err);
      // Fallback try with patch if PUT had an issue
      try {
        await patchCategory(storeSlug, catId, updatedData);
        setEditingId(null);
        showFeedback(`Categoria "${editName.trim()}" salva!`);
        if (typeof onRefresh === 'function') onRefresh();
      } catch (patchErr) {
        showFeedback('Erro ao salvar alterações da categoria.', 'error');
        if (typeof onRefresh === 'function') onRefresh();
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  // --- Inline Subcategories Management for each Category ---
  async function handleAddSubcategoryToCat(cat: Category) {
    const currentInput = (inlineSubInput[cat.id] || '').trim();
    if (!currentInput) return;

    const currentSubs = getCategorySubcategories(cat);
    if (currentSubs.includes(currentInput)) {
      showFeedback(`A subcategoria "${currentInput}" já existe nesta categoria.`, 'error');
      return;
    }

    const updatedSubs = [...currentSubs, currentInput];
    setIsSubSaving(true);
    try {
      await updateCategory(storeSlug, cat.id, {
        ...cat,
        subcategorias: updatedSubs
      });
      setInlineSubInput(prev => ({ ...prev, [cat.id]: '' }));
      showFeedback(`Subcategoria "${currentInput}" adicionada a ${cat.nome}!`);
      onRefresh();
    } catch (err) {
      console.error('Error adding subcategory:', err);
      showFeedback('Erro ao adicionar subcategoria.', 'error');
    } finally {
      setIsSubSaving(false);
    }
  }

  async function handleSaveRenamedSub(cat: Category) {
    if (!editingSubInCat) return;
    const { oldName, newName } = editingSubInCat;
    const trimmedNew = newName.trim();

    if (!trimmedNew) {
      showFeedback('O nome da subcategoria não pode ser vazio.', 'error');
      return;
    }

    if (trimmedNew.toLowerCase() === oldName.toLowerCase()) {
      setEditingSubInCat(null);
      return;
    }

    const currentSubs = getCategorySubcategories(cat);
    const updatedSubs = currentSubs.map(s => (s === oldName ? trimmedNew : s));

    setIsSubSaving(true);
    try {
      await updateCategory(storeSlug, cat.id, {
        ...cat,
        subcategorias: updatedSubs
      });
      setEditingSubInCat(null);
      showFeedback(`Subcategoria renomeada para "${trimmedNew}".`);
      onRefresh();
    } catch (err) {
      console.error('Error renaming subcategory:', err);
      showFeedback('Erro ao renomear subcategoria.', 'error');
    } finally {
      setIsSubSaving(false);
    }
  }

  function promptDeleteSubcategory(cat: Category, subName: string) {
    const pCount = getSubProductCount(cat.nome, subName);
    setDeleteTarget({
      type: 'subcategory',
      cat,
      subName,
      count: pCount
    });
  }

  function promptDeleteCategory(cat: Category) {
    const pCount = getProductCount(cat.nome);
    setDeleteTarget({
      type: 'category',
      cat,
      count: pCount
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory(storeSlug, deleteTarget.cat.id);
        showFeedback(`Categoria "${deleteTarget.cat.nome}" excluída com sucesso.`);
        setDeleteTarget(null);
        onRefresh();
      } else if (deleteTarget.type === 'subcategory' && deleteTarget.subName) {
        const currentSubs = getCategorySubcategories(deleteTarget.cat);
        const updatedSubs = currentSubs.filter(s => s !== deleteTarget.subName);
        await updateCategory(storeSlug, deleteTarget.cat.id, {
          ...deleteTarget.cat,
          subcategorias: updatedSubs
        });
        showFeedback(`Subcategoria "${deleteTarget.subName}" removida.`);
        setDeleteTarget(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      showFeedback('Erro ao realizar a exclusão. Tente novamente.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleMenu(cat: Category) {
    const isCurrentlyInMenu = isCategoryInMenu(cat);
    const nextVal = !isCurrentlyInMenu;

    // Optimistic UI update immediately
    setLocalCategories(prev =>
      prev.map(c => (c.id === cat.id ? { ...c, mostrarNoMenu: nextVal, exibirNoMenu: nextVal } : c))
    );

    try {
      await patchCategory(storeSlug, cat.id, { 
        mostrarNoMenu: nextVal,
        exibirNoMenu: nextVal 
      } as any);
      showFeedback(
        nextVal
          ? `"${cat.nome}" agora é exibida na barra superior.`
          : `"${cat.nome}" removida da barra superior (acessível apenas pelo menu Departamentos).`
      );
      onRefresh();
    } catch (err) {
      console.error('Error toggling category menu visibility:', err);
      showFeedback('Erro ao atualizar visibilidade.', 'error');
      onRefresh();
    }
  }

  async function handleMoveOrder(cat: Category, direction: 'up' | 'down') {
    const sorted = [...localCategories].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const currentIndex = sorted.findIndex(c => c.id === cat.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetCat = sorted[targetIndex];
    const currentOrder = cat.ordem || currentIndex + 1;
    const targetOrder = targetCat.ordem || targetIndex + 1;

    // Optimistic reorder
    setLocalCategories(prev =>
      prev.map(c => {
        if (c.id === cat.id) return { ...c, ordem: targetOrder };
        if (c.id === targetCat.id) return { ...c, ordem: currentOrder };
        return c;
      })
    );

    try {
      await patchCategory(storeSlug, cat.id, { ordem: targetOrder });
      await patchCategory(storeSlug, targetCat.id, { ordem: currentOrder });
      onRefresh();
    } catch (err) {
      console.error('Error reordering categories:', err);
      onRefresh();
    }
  }

  const sortedCategories = [...localCategories].sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  const menuCategoriesCount = sortedCategories.filter(c => isCategoryInMenu(c)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Info & Structure Explanation Card */}
      <div className="bg-gradient-to-br from-neutral-50 to-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#2A5C3F]" style={{ color: primaryColor }} />
            Estrutura de Categorias & Subcategorias
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl">
            Cadastre departamentos e subcategorias da loja. Ao criar subcategorias, o botão <strong>"Departamentos"</strong> no cabeçalho exibirá automaticamente o indicador <strong>+</strong> e o menu lateral expansível com os links diretos para seus clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-neutral-200 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase text-neutral-400">Departamentos</div>
            <div className="text-lg font-bold text-neutral-800">{categories.length}</div>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Na Barra Superior</div>
            <div className="text-lg font-bold text-emerald-800">{menuCategoriesCount}</div>
          </div>
        </div>
      </div>

      {/* Add New Category Form */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <h4 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#2A5C3F]" style={{ color: primaryColor }} />
          Criar Nova Categoria com Subcategorias
        </h4>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                Nome da Categoria / Departamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Gamer & Setup, Livros, Moda Infantil..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                Posição / Ordem
              </label>
              <input
                type="number"
                min="1"
                value={newCatOrder}
                onChange={(e) => setNewCatOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-center outline-none focus:bg-white focus:border-neutral-400"
              />
            </div>

            <div className="sm:col-span-2 flex items-center pb-1">
              <button
                type="button"
                onClick={() => setNewCatInMenu(prev => !prev)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer select-none ${
                  newCatInMenu
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                }`}
                title="Clique para alternar se esta categoria deve aparecer na barra superior horizontal da loja"
              >
                <span className="truncate">{newCatInMenu ? '✓ Na Barra' : '✕ Apenas Menu'}</span>
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${
                    newCatInMenu ? 'bg-emerald-600' : 'bg-neutral-300'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                      newCatInMenu ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isCreating || !newCatName.trim()}
                className="w-full py-2 px-4 bg-[#2A5C3F] hover:bg-[#1E4530] text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? 'Criando...' : 'Adicionar Categoria'}</span>
              </button>
            </div>
          </div>

          {/* Subcategories Tag Input for New Category */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/70">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider">
                <FolderTree className="w-3.5 h-3.5 text-[#2A5C3F]" style={{ color: primaryColor }} />
                Subcategorias deste Departamento (Opcional)
              </label>
              <span className="text-[11px] text-neutral-500">
                Pressione <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px]">Enter</kbd> ou clique em Adicionar
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {newSubList.map((sub, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800 shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-neutral-400" />
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewSubTag(idx)}
                    className="text-neutral-400 hover:text-red-500 transition ml-0.5"
                    title="Remover subcategoria"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: Fones, Teclados, Iluminação, Eletroportáteis..."
                value={newSubInput}
                onChange={(e) => setNewSubInput(e.target.value)}
                onKeyDown={handleAddNewSubTag}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-xl outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={handleAddNewSubTag}
                disabled={!newSubInput.trim()}
                className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 disabled:opacity-40 text-neutral-800 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Sub</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Categories List Table & Subcategories Management */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
            <span>Departamentos & Subcategorias Cadastradas ({sortedCategories.length})</span>
          </div>
          <div className="text-xs text-neutral-500">
            Clique na seta para abrir e gerenciar as subcategorias de cada departamento
          </div>
        </div>

        {sortedCategories.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            Nenhuma categoria cadastrada ainda. Use o formulário acima para adicionar a primeira.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {sortedCategories.map((cat, idx) => {
              const count = getProductCount(cat.nome);
              const isEditing = editingId === cat.id;
              const subs = getCategorySubcategories(cat);
              const isExpanded = expandedCatId === cat.id;

              if (isEditing) {
                return (
                  <div key={cat.id} className="p-5 bg-emerald-50/40 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="w-20 shrink-0">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">Ordem</label>
                        <input
                          type="number"
                          min="1"
                          value={editOrder}
                          onChange={(e) => setEditOrder(parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-center font-bold"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">Nome da Categoria</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(cat.id);
                            }
                          }}
                          autoFocus
                          className="w-full px-3 py-1.5 text-sm bg-white border border-neutral-300 rounded-lg font-medium text-neutral-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditInMenu(prev => !prev);
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer select-none ${
                            editInMenu
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200 hover:text-neutral-900'
                          }`}
                          title={
                            editInMenu
                              ? 'Categoria ativa na Barra Superior. Clique para ocultar e deixar apenas no menu Departamentos.'
                              : 'Categoria oculta da Barra Superior. Clique para exibir na Barra Superior.'
                          }
                        >
                          <div
                            className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${
                              editInMenu ? 'bg-emerald-600' : 'bg-neutral-400'
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                                editInMenu ? 'right-0.5' : 'left-0.5'
                              }`}
                            />
                          </div>
                          <span>{editInMenu ? 'Na Barra Superior' : 'Apenas em Departamentos'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveEdit(cat.id);
                          }}
                          disabled={isSavingEdit}
                          className="px-4 py-2 bg-[#2A5C3F] text-white text-xs font-bold rounded-xl hover:bg-[#1E4530] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isSavingEdit ? 'Salvando...' : 'Salvar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            cancelEditing();
                          }}
                          className="px-3.5 py-2 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-300 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>

                    {/* Subcategories editor in edit mode */}
                    <div className="bg-white p-3 rounded-xl border border-neutral-200">
                      <label className="text-[11px] font-bold text-neutral-600 block mb-1.5 uppercase">
                        Subcategorias de {editName || cat.nome} ({editSubs.length})
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {editSubs.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-md text-xs font-medium text-neutral-800"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditSubTag(sIdx)}
                              className="text-neutral-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Adicionar subcategoria e pressionar Enter..."
                          value={editSubInput}
                          onChange={(e) => setEditSubInput(e.target.value)}
                          onKeyDown={handleAddEditSubTag}
                          className="flex-1 px-2.5 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddEditSubTag}
                          className="px-2.5 py-1 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-300 transition"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cat.id} className="transition">
                  {/* Category Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-neutral-50/70 transition">
                    {/* Left: Accordion Toggle, Reorder & Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Accordion toggle button */}
                      <button
                        onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isExpanded
                            ? 'bg-[#2A5C3F] text-white border-[#2A5C3F]'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                        }`}
                        style={isExpanded ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                        title={isExpanded ? 'Recolher subcategorias' : 'Ver e gerenciar subcategorias'}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {/* Order arrow buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleMoveOrder(cat, 'up')}
                          disabled={idx === 0}
                          title="Mover para cima"
                          className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20 hover:bg-neutral-200/60 rounded cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(cat, 'down')}
                          disabled={idx === sortedCategories.length - 1}
                          title="Mover para baixo"
                          className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20 hover:bg-neutral-200/60 rounded cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-neutral-400">
                          {cat.ordem || idx + 1}
                        </span>
                      </div>

                      {/* Category Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <DynamicIcon icon={cat.icone} className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                          <span className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                            {cat.nome}
                          </span>
                          {subs.length > 0 ? (
                            <span
                              onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                              className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition"
                            >
                              +{subs.length} subcategoria{subs.length !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span
                              onClick={() => setExpandedCatId(cat.id)}
                              className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-pointer hover:bg-neutral-200 transition"
                            >
                              + Adicionar subcategorias
                            </span>
                          )}
                        </div>

                        {/* Preview of subcategory pills */}
                        {subs.length > 0 && !isExpanded && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {subs.slice(0, 5).map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md font-medium"
                              >
                                {s}
                              </span>
                            ))}
                            {subs.length > 5 && (
                              <span className="text-[11px] text-neutral-400 font-bold">
                                +{subs.length - 5} mais
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span className="font-medium">
                            {count} produto{count !== 1 ? 's' : ''} vinculado{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Visibility Toggle & Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Menu Visibility Switch & Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleMenu(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition border cursor-pointer select-none shadow-2xs ${
                          isCategoryInMenu(cat)
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900'
                        }`}
                        title={
                          isCategoryInMenu(cat)
                            ? 'Exibido na Barra Superior. Clique para ocultar e deixar acessível apenas no menu Departamentos.'
                            : 'Oculto da Barra Superior. Clique para exibir diretamente na barra superior da loja.'
                        }
                      >
                        {isCategoryInMenu(cat) ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Na Barra Superior</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-neutral-400" />
                            <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Apenas em Departamentos</span>
                          </>
                        )}
                      </button>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="px-2.5 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Gerenciar Subcategorias"
                        >
                          <FolderTree className="w-3.5 h-3.5 text-[#2A5C3F]" style={{ color: primaryColor }} />
                          <span className="hidden md:inline">Subcategorias</span>
                        </button>

                        <button
                          onClick={() => startEditing(cat)}
                          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                          title="Editar categoria"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => promptDeleteCategory(cat)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title={`Excluir categoria "${cat.nome}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Subcategories Drawer / Panel */}
                  {isExpanded && (
                    <div className="bg-neutral-50/90 p-4 border-t border-b border-neutral-200 pl-6 sm:pl-12 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                          <FolderTree className="w-4 h-4 text-[#2A5C3F]" style={{ color: primaryColor }} />
                          <span>Subcategorias de {cat.nome}</span>
                          <span className="text-[11px] text-neutral-400 font-normal">
                            (Aparecem automaticamente no menu "Departamentos" ao passar o mouse ou clicar)
                          </span>
                        </div>
                      </div>

                      {/* Subcategories List Table/Grid */}
                      {subs.length === 0 ? (
                        <div className="p-4 bg-white rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
                          Nenhuma subcategoria cadastrada para este departamento. Adicione abaixo para ativar o submenu com indicador <strong>+</strong> no botão "Departamentos".
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {subs.map((sub, sIdx) => {
                            const isEditingSub =
                              editingSubInCat?.catId === cat.id && editingSubInCat?.oldName === sub;
                            const subPCount = getSubProductCount(cat.nome, sub);

                            if (isEditingSub) {
                              return (
                                <div
                                  key={sIdx}
                                  className="p-2 bg-white rounded-xl border border-[#2A5C3F] shadow-xs flex items-center gap-1.5"
                                >
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingSubInCat.newName}
                                    onChange={(e) =>
                                      setEditingSubInCat({ ...editingSubInCat, newName: e.target.value })
                                    }
                                    className="flex-1 px-2 py-1 text-xs border border-neutral-200 rounded outline-none font-bold text-neutral-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRenamedSub(cat)}
                                    disabled={isSubSaving}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                    title="Salvar"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubInCat(null)}
                                    className="p-1 bg-neutral-200 text-neutral-600 rounded hover:bg-neutral-300 transition"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sIdx}
                                className="p-2.5 bg-white rounded-xl border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-2 group hover:border-neutral-300 transition"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A5C3F]" style={{ backgroundColor: primaryColor }} />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-neutral-800 truncate">
                                      {sub}
                                    </div>
                                    <div className="text-[10px] text-neutral-400">
                                      {subPCount} produto{subPCount !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSubInCat({
                                        catId: cat.id,
                                        oldName: sub,
                                        newName: sub
                                      })
                                    }
                                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition"
                                    title="Renomear subcategoria"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteSubcategory(cat, sub)}
                                    disabled={isSubSaving}
                                    className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                    title={`Excluir subcategoria "${sub}"`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick Add Subcategory Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder={`+ Nova subcategoria para "${cat.nome}" (ex: Celulares, Cabos, Acessórios)...`}
                          value={inlineSubInput[cat.id] || ''}
                          onChange={(e) =>
                            setInlineSubInput(prev => ({ ...prev, [cat.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubcategoryToCat(cat);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-xl outline-none focus:border-neutral-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSubcategoryToCat(cat)}
                          disabled={isSubSaving || !(inlineSubInput[cat.id] || '').trim()}
                          className="px-3.5 py-1.5 bg-[#2A5C3F] hover:bg-[#1E4530] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deletion Confirmation Modal Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-neutral-900">
                  {deleteTarget.type === 'category' ? 'Excluir Categoria?' : 'Excluir Subcategoria?'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Esta ação é definitiva e removerá o item da estrutura da loja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs sm:text-sm text-neutral-700">
                {deleteTarget.type === 'category' ? (
                  <div>
                    Você está prestes a excluir o departamento:
                    <div className="font-bold text-neutral-900 text-sm mt-1 uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-red-500" />
                      <span>{deleteTarget.cat.nome}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    Você está prestes a excluir a subcategoria:
                    <div className="font-bold text-neutral-900 text-sm mt-1 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-red-500" />
                      <span>{deleteTarget.subName}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      Do departamento: <strong>{deleteTarget.cat.nome}</strong>
                    </div>
                  </div>
                )}
              </div>

              {deleteTarget.count > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Atenção:</strong> Há <strong>{deleteTarget.count} produto(s)</strong> vinculado(s) a este item. Eles continuarão no catálogo, mas terão esta vinculação desfeita.
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500">
                  Nenhum produto está atualmente vinculado a este item.
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
