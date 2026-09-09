import React, { useState, useEffect } from 'react';
import { Product, Category, Platform } from '../../types';
import { createProduct, updateProduct, patchProduct, deleteProduct, fetchAdminCategories, fetchAdminPlatforms, uploadImageToServer, checkSupplierUrl } from '../../api/client';
import { compressImageToWebP, formatToWebPUrl, normalizeImageUrl, getProxiedImageUrl } from '../../utils';
import CategoriesManager from './CategoriesManager';
import PlatformsManager from './PlatformsManager';
import { Plus, Search, Star, Trash2, Edit3, Image as ImageIcon, ExternalLink, Filter, Check, X, Copy, Layers, Package, Globe, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface ProductsTabProps {
  storeSlug: string;
  products: Product[];
  onRefresh: () => void;
  primaryColor?: string;
}

export default function ProductsTab({ storeSlug, products, onRefresh, primaryColor = '#2A5C3F' }: ProductsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'platforms'>('products');
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [platformsList, setPlatformsList] = useState<Platform[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Todas');
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');

  // Edit / Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingLinkData, setIsExtractingLinkData] = useState(false);
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [compressingField, setCompressingField] = useState<string | null>(null);

  // Quick inline edit state
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'preco' | 'precoPromo' | 'ordem' } | null>(null);
  const [cellValue, setCellValue] = useState('');

  // Fetch categories and platforms from backend
  const loadData = async () => {
    try {
      const [cats, plats] = await Promise.all([
        fetchAdminCategories(storeSlug).catch(() => []),
        fetchAdminPlatforms(storeSlug).catch(() => [])
      ]);
      setCategoriesList(cats);
      setPlatformsList(plats);
    } catch (err) {
      console.error('Failed to load categories or platforms in ProductsTab:', err);
    }
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  useEffect(() => {
    loadData();
  }, [storeSlug]);

  const handleGlobalRefresh = () => {
    loadData();
    onRefresh();
  };

  // Extract categories and platforms for filtering
  const dynamicCategories = categoriesList.length > 0
    ? ['Todas', ...categoriesList.map(c => c.nome)]
    : ['Todas', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))];

  const dynamicPlatforms = platformsList.length > 0
    ? ['Todas', ...platformsList.map(p => p.nome)]
    : ['Todas', ...Array.from(new Set(products.map(p => p.plataforma).filter(Boolean)))];

  const dynamicSubcategories = React.useMemo(() => {
    if (selectedCategory === 'Todas') return [];
    const cat = categoriesList.find(c => c.nome.toLowerCase() === selectedCategory.toLowerCase());
    const list = new Set<string>(cat?.subcategorias || []);
    products.forEach(p => {
      if (p.categoria?.toLowerCase() === selectedCategory.toLowerCase() && p.subcategoria) {
        list.add(p.subcategoria);
      }
    });
    return ['Todas', ...Array.from(list)];
  }, [selectedCategory, categoriesList, products]);

  // Subcategories for the product being edited
  const currentCatSubcategories = React.useMemo(() => {
    if (!editingProduct?.categoria) return [];
    const cat = categoriesList.find(c => c.nome.toLowerCase() === (editingProduct.categoria || '').toLowerCase());
    const list = new Set<string>(cat?.subcategorias || []);
    products.forEach(p => {
      if (p.categoria?.toLowerCase() === (editingProduct.categoria || '').toLowerCase() && p.subcategoria) {
        list.add(p.subcategoria);
      }
    });
    return Array.from(list);
  }, [editingProduct?.categoria, categoriesList, products]);

  const platforms = ['Todas', ...Array.from(new Set(products.map(p => p.plataforma).filter(Boolean)))];

  // Filtered products
  const filtered = products.filter(p => {
    if (selectedCategory !== 'Todas' && p.categoria !== selectedCategory) return false;
    if (selectedCategory !== 'Todas' && selectedSubcategory !== 'Todas' && p.subcategoria !== selectedSubcategory) return false;
    if (selectedPlatform !== 'Todas' && p.plataforma !== selectedPlatform) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q) || (p.cupom || '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

  // Quick toggle handlers
  async function handleToggleActive(p: Product) {
    try {
      await patchProduct(storeSlug, p.id, { ativo: !p.ativo });
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handleToggleFeatured(p: Product) {
    try {
      await patchProduct(storeSlug, p.id, { destaque: !p.destaque });
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error updating featured:', err);
    }
  }

  async function handleSaveInlineCell(id: string, field: 'preco' | 'precoPromo' | 'ordem') {
    try {
      const val = parseFloat(cellValue.replace(',', '.'));
      await patchProduct(storeSlug, id, { [field]: isNaN(val) ? (field === 'precoPromo' ? null : 0) : val });
      setEditingCell(null);
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error saving inline cell:', err);
    }
  }

  function handleOpenCreate() {
    const defaultCat = categoriesList[0]?.nome || 'Eletrônicos';
    setEditingProduct({
      ativo: true,
      tipo: 'FISICO',
      plataforma: 'Amazon',
      categoria: defaultCat,
      subcategoria: '',
      nome: '',
      descricao: '',
      preco: 0,
      precoPromo: null,
      cupom: '',
      validade: '',
      linkAfiliado: '',
      textoBotao: 'Ver oferta →',
      video: '',
      img1: '',
      img2: '',
      img3: '',
      img4: '',
      ordem: products.length + 1,
      destaque: false
    });
    setModalOpen(true);
  }

  function handleOpenEdit(p: Product) {
    setEditingProduct({ ...p });
    setModalOpen(true);
  }

  function promptDeleteProduct(p: Product) {
    setProductToDelete(p);
  }

  async function handleConfirmDeleteProduct() {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await deleteProduct(storeSlug, productToDelete.id);
      setProductToDelete(null);
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error deleting product:', err);
    } finally {
      setIsDeletingProduct(false);
    }
  }

  async function handleDuplicate(p: Product) {
    try {
      await createProduct(storeSlug, {
        ...p,
        id: undefined,
        nome: `${p.nome} (Cópia)`,
        ordem: products.length + 1
      });
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error duplicating product:', err);
    }
  }

  async function handleSaveProductForm(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);

    try {
      if (editingProduct.id) {
        await updateProduct(storeSlug, editingProduct.id, editingProduct);
      } else {
        await createProduct(storeSlug, editingProduct);
      }
      setModalOpen(false);
      setEditingProduct(null);
      handleGlobalRefresh();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  }

  // Auto-fetch data from affiliate link (Hotmart, AliExpress, Shopee, Magalu, Amazon, Kiwify, etc.)
  async function handleExtractSupplierData() {
    if (!editingProduct?.linkAfiliado) return;
    try {
      setIsExtractingLinkData(true);
      setExtractMessage(null);
      const data = await checkSupplierUrl(editingProduct.linkAfiliado);

      setEditingProduct(prev => {
        if (!prev) return null;
        const updated = { ...prev };

        if (data.detectedName && (!prev.nome || prev.nome.trim() === '')) {
          updated.nome = data.detectedName;
        }
        if (data.supplierPrice && data.supplierPrice > 0) {
          updated.preco = data.supplierPrice;
        }
        if (data.supplierPromo && data.supplierPromo > 0) {
          updated.precoPromo = data.supplierPromo;
        }
        if (data.detectedImage && (!prev.img1 || prev.img1.trim() === '')) {
          updated.img1 = data.detectedImage;
        }
        if (data.platform && data.platform !== 'Outro Fornecedor') {
          updated.plataforma = data.platform;
        }
        if (!prev.textoBotao || prev.textoBotao.trim() === '') {
          updated.textoBotao = `Ver Oferta na ${data.platform || 'Loja'} →`;
        }

        return updated;
      });

      if (data.supplierPrice) {
        setExtractMessage(`Preço detectado: R$ ${data.supplierPrice.toFixed(2)}${data.platform ? ` (${data.platform})` : ''}`);
      } else {
        setExtractMessage(data.message || 'Dados estruturados extraídos com sucesso.');
      }
      setTimeout(() => setExtractMessage(null), 5000);
    } catch (err: any) {
      setExtractMessage('Não foi possível extrair dados automaticamente deste link: ' + (err?.message || 'Erro'));
      setTimeout(() => setExtractMessage(null), 6000);
    } finally {
      setIsExtractingLinkData(false);
    }
  }

  // Handle image upload from file input with WebP compression
  async function processImageFile(file: File, fieldName: 'img1' | 'img2' | 'img3' | 'img4') {
    if (!file) return;
    setCompressingField(fieldName);

    try {
      // 1. Read immediate Data URL for zero-delay preview
      const localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      if (localDataUrl) {
        setEditingProduct(prev => prev ? { ...prev, [fieldName]: localDataUrl } : null);
      }

      // 2. Compress to optimized WebP
      const webpDataUrl = await compressImageToWebP(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: 'image/webp'
      });

      let finalUrl = webpDataUrl && webpDataUrl.length > 300 ? webpDataUrl : localDataUrl;
      try {
        const serverUrl = await uploadImageToServer(finalUrl, file.name);
        if (serverUrl) {
          finalUrl = serverUrl;
        }
      } catch (err) {
        console.warn('Fallback to dataUrl:', err);
      }

      if (finalUrl) {
        setEditingProduct(prev => prev ? { ...prev, [fieldName]: finalUrl } : null);
      }
    } catch (err) {
      console.error('Error processing uploaded image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result) {
          setEditingProduct(prev => prev ? { ...prev, [fieldName]: reader.result as string } : null);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setCompressingField(null);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: 'img1' | 'img2' | 'img3' | 'img4') {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, fieldName);
    }
    e.target.value = '';
  }

  function handleImgError(e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl?: string) {
    const target = e.currentTarget;
    if (!target.dataset.triedProxy && originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
      target.dataset.triedProxy = 'true';
      target.src = getProxiedImageUrl(originalUrl);
      return;
    }
    target.onerror = null;
  }

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs: Produtos vs Categorias vs Plataformas */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeSubTab === 'products'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
            style={activeSubTab === 'products' ? { backgroundColor: primaryColor } : {}}
          >
            <Package className="w-4 h-4" />
            <span>Produtos Cadastrados ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeSubTab === 'categories'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
            style={activeSubTab === 'categories' ? { backgroundColor: primaryColor } : {}}
          >
            <Layers className="w-4 h-4" />
            <span>Gerenciar Categorias & Menu ({categoriesList.length})</span>
          </button>

          <button
            id="btn-gerenciador-plataformas"
            onClick={() => setActiveSubTab('platforms')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeSubTab === 'platforms'
                ? 'bg-[#2A5C3F] text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
            style={activeSubTab === 'platforms' ? { backgroundColor: primaryColor } : {}}
          >
            <Globe className="w-4 h-4" />
            <span>Gerenciador de Plataformas ({platformsList.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'categories' ? (
        <CategoriesManager
          storeSlug={storeSlug}
          categories={categoriesList}
          products={products}
          onRefresh={handleGlobalRefresh}
          primaryColor={primaryColor}
        />
      ) : activeSubTab === 'platforms' ? (
        <PlatformsManager
          storeSlug={storeSlug}
          platforms={platformsList}
          products={products}
          onRefresh={handleGlobalRefresh}
          primaryColor={primaryColor}
        />
      ) : (
        <>
          {/* Top Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
              <div className="text-xs font-semibold uppercase text-neutral-400">Total Produtos</div>
              <div className="text-2xl font-bold text-neutral-900 mt-1">{products.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
              <div className="text-xs font-semibold uppercase text-neutral-400">Ativos na Vitrine</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{products.filter(p => p.ativo).length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
              <div className="text-xs font-semibold uppercase text-neutral-400">Destaques</div>
              <div className="text-2xl font-bold text-amber-500 mt-1">{products.filter(p => p.destaque).length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
              <div className="text-xs font-semibold uppercase text-neutral-400">Com Cupons</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">{products.filter(p => p.cupom).length}</div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Pesquisar produto ou cupom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:bg-white focus:border-neutral-400 transition"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>Categoria:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('Todas');
                  }}
                  className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 outline-none"
                >
                  {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Subcategory Filter (if category selected) */}
              {selectedCategory !== 'Todas' && dynamicSubcategories.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 animate-in fade-in">
                  <span>Subcategoria:</span>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="px-2.5 py-1.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 outline-none"
                  >
                    {dynamicSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Platform Filter */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>Plataforma:</span>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 outline-none"
                >
                  {dynamicPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveSubTab('categories')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-semibold rounded-xl transition border border-neutral-200"
              >
                <Layers className="w-4 h-4 text-neutral-500" />
                <span>Gerenciar Categorias</span>
              </button>

              <button
                id="btn-filter-gerenciador-plataformas"
                onClick={() => setActiveSubTab('platforms')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-semibold rounded-xl transition border border-neutral-200"
              >
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Gerenciador de Plataformas</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2A5C3F] hover:bg-[#1E4530] text-white text-sm font-semibold rounded-xl transition shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Produto</span>
              </button>
            </div>
          </div>

          {/* Spreadsheet-like Table */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">Ativo</th>
                    <th className="py-3 px-3 w-12 text-center">⭐</th>
                    <th className="py-3 px-3 w-16 text-center">Ordem</th>
                    <th className="py-3 px-3 w-16">Foto</th>
                    <th className="py-3 px-4 min-w-[220px]">Produto / Categoria</th>
                    <th className="py-3 px-3 min-w-[100px]">Plataforma</th>
                    <th className="py-3 px-3 min-w-[110px]">Preço Original</th>
                    <th className="py-3 px-3 min-w-[110px]">Preço Promo</th>
                    <th className="py-3 px-3 min-w-[90px]">Cupom</th>
                    <th className="py-3 px-3 text-right min-w-[130px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-400">
                        Nenhum produto encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const isEditingPrice = editingCell?.id === p.id && editingCell?.field === 'preco';
                      const isEditingPromo = editingCell?.id === p.id && editingCell?.field === 'precoPromo';
                      const isEditingOrder = editingCell?.id === p.id && editingCell?.field === 'ordem';

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-neutral-50/80 transition group ${!p.ativo ? 'opacity-60 bg-neutral-50/40' : ''}`}
                        >
                          {/* Active Toggle Switch */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleActive(p)}
                              title={p.ativo ? 'Desativar da vitrine' : 'Ativar na vitrine'}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition mx-auto ${
                                p.ativo
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-neutral-300 text-transparent hover:border-neutral-400'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* Featured Star Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleFeatured(p)}
                              title={p.destaque ? 'Remover dos destaques' : 'Adicionar aos destaques'}
                              className={`p-1 rounded-md transition ${
                                p.destaque
                                  ? 'text-amber-400 hover:text-amber-500'
                                  : 'text-neutral-300 hover:text-neutral-400'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${p.destaque ? 'fill-amber-400' : ''}`} />
                            </button>
                          </td>

                          {/* Order Inline Edit */}
                          <td className="py-3 px-3 text-center font-mono text-xs">
                            {isEditingOrder ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineCell(p.id, 'ordem')}
                                  className="w-12 px-1 py-0.5 text-xs text-center border border-neutral-400 rounded bg-white"
                                />
                                <button
                                  onClick={() => handleSaveInlineCell(p.id, 'ordem')}
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingCell({ id: p.id, field: 'ordem' });
                                  setCellValue(String(p.ordem || 1));
                                }}
                                className="cursor-pointer hover:bg-neutral-100 px-2 py-1 rounded text-neutral-600"
                                title="Clique para editar ordem"
                              >
                                {p.ordem || 1}
                              </span>
                            )}
                          </td>

                          {/* Image Thumbnail */}
                          <td className="py-3 px-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 relative">
                              {p.img1 ? (
                                <img
                                  src={p.img1}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => handleImgError(e, p.img1)}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Title and Category */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-900 line-clamp-1 max-w-sm">
                              {p.nome}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                              <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                                {p.categoria}
                              </span>
                              {p.subcategoria && (
                                <span className="text-neutral-400">› {p.subcategoria}</span>
                              )}
                            </div>
                          </td>

                          {/* Platform Badge */}
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700">
                              {p.plataforma}
                            </span>
                          </td>

                          {/* Price Inline Edit */}
                          <td className="py-3 px-3 font-mono text-xs text-neutral-700">
                            {isEditingPrice ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineCell(p.id, 'preco')}
                                  className="w-16 px-1 py-0.5 text-xs border border-neutral-400 rounded bg-white"
                                />
                                <button
                                  onClick={() => handleSaveInlineCell(p.id, 'preco')}
                                  className="text-emerald-600"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingCell({ id: p.id, field: 'preco' });
                                  setCellValue(p.preco ? p.preco.toFixed(2).replace('.', ',') : '0,00');
                                }}
                                className="cursor-pointer hover:bg-neutral-100 px-1.5 py-0.5 rounded"
                                title="Clique para editar preço"
                              >
                                R$ {p.preco ? p.preco.toFixed(2).replace('.', ',') : '0,00'}
                              </span>
                            )}
                          </td>

                          {/* Promo Price Inline Edit */}
                          <td className="py-3 px-3 font-mono text-xs font-bold text-emerald-700">
                            {isEditingPromo ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineCell(p.id, 'precoPromo')}
                                  className="w-16 px-1 py-0.5 text-xs border border-neutral-400 rounded bg-white text-emerald-700"
                                />
                                <button
                                  onClick={() => handleSaveInlineCell(p.id, 'precoPromo')}
                                  className="text-emerald-600"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingCell({ id: p.id, field: 'precoPromo' });
                                  setCellValue(p.precoPromo ? p.precoPromo.toFixed(2).replace('.', ',') : '');
                                }}
                                className="cursor-pointer hover:bg-emerald-50 px-1.5 py-0.5 rounded"
                                title="Clique para editar preço promocional"
                              >
                                {p.precoPromo ? `R$ ${p.precoPromo.toFixed(2).replace('.', ',')}` : '-'}
                              </span>
                            )}
                          </td>

                          {/* Coupon */}
                          <td className="py-3 px-3 font-mono text-xs">
                            {p.cupom ? (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-[11px] font-bold">
                                {p.cupom}
                              </span>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.linkAfiliado && (
                                <a
                                  href={p.linkAfiliado}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
                                  title="Testar Link Afiliado"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDuplicate(p)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
                                title="Duplicar Produto"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                                title="Editar Completo"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => promptDeleteProduct(p)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Product Create / Edit Modal */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-neutral-900">
                {editingProduct.id ? 'Editar Produto' : 'Novo Produto para a Vitrine'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Título / Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fone Bluetooth JBL Tune 520BT com Som Pure Bass"
                  value={editingProduct.nome || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, nome: e.target.value } : null)}
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Descrição Completa
                </label>
                <textarea
                  rows={3}
                  placeholder="Destaque as principais qualidades, recursos, autonomia ou garantia..."
                  value={editingProduct.descricao || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
              </div>

              {/* Platform, Type, Category, Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Plataforma
                  </label>
                  <input
                    type="text"
                    list="platforms-list"
                    placeholder="Amazon, Shopee..."
                    value={editingProduct.plataforma || ''}
                    onChange={(e) => {
                      const platName = e.target.value;
                      const matchedPlat = platformsList.find(p => p.nome.toLowerCase() === platName.toLowerCase());
                      setEditingProduct(prev => {
                        if (!prev) return null;
                        const newBtnText = matchedPlat?.textoBotaoPadrao && (!prev.textoBotao || prev.textoBotao.startsWith('Ver oferta'))
                          ? matchedPlat.textoBotaoPadrao
                          : prev.textoBotao;
                        return { ...prev, plataforma: platName, textoBotao: newBtnText };
                      });
                    }}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                  />
                  <datalist id="platforms-list">
                    {platformsList.map(p => (
                      <option key={p.id} value={p.nome} />
                    ))}
                    <option value="Amazon" />
                    <option value="Shopee" />
                    <option value="Mercado Livre" />
                    <option value="Magalu" />
                    <option value="AliExpress" />
                    <option value="Hotmart" />
                    <option value="Kiwify" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={editingProduct.tipo || 'FISICO'}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, tipo: e.target.value as any } : null)}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  >
                    <option value="FISICO">Físico</option>
                    <option value="DIGITAL">Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Categoria *
                  </label>
                  <input
                    type="text"
                    list="categories-list"
                    required
                    placeholder="Eletrônicos, Casa..."
                    value={editingProduct.categoria || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, categoria: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                  />
                  <datalist id="categories-list">
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.nome} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Subcategoria
                  </label>
                  <input
                    type="text"
                    list="subcategories-list"
                    placeholder="Áudio, Eletro..."
                    value={editingProduct.subcategoria || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, subcategoria: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                  />
                  <datalist id="subcategories-list">
                    {currentCatSubcategories.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Pricing, Coupon & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50/80 p-4 rounded-xl border border-neutral-200/80">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Preço Original (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="299.00"
                    value={editingProduct.preco !== undefined ? editingProduct.preco : ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, preco: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">
                    Preço Promo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="199.90"
                    value={editingProduct.precoPromo !== null && editingProduct.precoPromo !== undefined ? editingProduct.precoPromo : ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      setEditingProduct(prev => prev ? { ...prev, precoPromo: val } : null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">
                    Cupom de Desconto
                  </label>
                  <input
                    type="text"
                    placeholder="PROMO10"
                    value={editingProduct.cupom || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, cupom: e.target.value.toUpperCase() } : null)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-indigo-200 rounded-lg outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Validade da Oferta
                  </label>
                  <input
                    type="date"
                    value={editingProduct.validade ? editingProduct.validade.split('T')[0] : ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, validade: e.target.value || null } : null)}
                    className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Affiliate Link & CTA Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                      Link de Afiliado *
                    </label>
                    {editingProduct.linkAfiliado && (
                      <button
                        type="button"
                        onClick={handleExtractSupplierData}
                        disabled={isExtractingLinkData}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
                        title="Puxar automaticamente preço, foto e nome do produto"
                      >
                        <Sparkles className={`w-3 h-3 ${isExtractingLinkData ? 'animate-spin' : ''}`} />
                        {isExtractingLinkData ? 'Consultando...' : 'Puxar Dados'}
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://amazon.com.br?tag=sua-tag"
                    value={editingProduct.linkAfiliado || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, linkAfiliado: e.target.value } : null)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                  />
                  {extractMessage && (
                    <p className="text-[11px] text-pink-700 mt-1 font-medium bg-pink-50/70 p-1.5 rounded border border-pink-100">
                      {extractMessage}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ver oferta na Amazon →"
                    value={editingProduct.textoBotao || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, textoBotao: e.target.value } : null)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                  />
                </div>
              </div>

              {/* YouTube Video URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Vídeo do YouTube (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editingProduct.video || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, video: e.target.value } : null)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
                />
              </div>

              {/* Product Images (4 Slots with File Upload or URL) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Imagens do Produto (Até 4 fotos)
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Compactação WebP Automática
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['img1', 'img2', 'img3', 'img4'] as const).map((field, idx) => {
                    const imgUrl = editingProduct[field];
                    const isCompressing = compressingField === field;

                    return (
                      <div
                        key={field}
                        className="border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 flex flex-col justify-between hover:border-neutral-300 transition"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const droppedFile = e.dataTransfer.files?.[0];
                          if (droppedFile && droppedFile.type.startsWith('image/')) {
                            processImageFile(droppedFile, field);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 mb-1">
                          <span>Foto {idx + 1} {idx === 0 ? '(Principal)' : ''}</span>
                          {imgUrl && (
                            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-100/70 px-1 py-0.2 rounded">
                              Salva
                            </span>
                          )}
                        </div>

                        {/* Thumbnail Box / Click to upload */}
                        <label
                          className={`aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 mb-2 relative flex items-center justify-center cursor-pointer group hover:border-emerald-400 transition ${
                            isCompressing ? 'pointer-events-none' : ''
                          }`}
                          title="Clique para selecionar uma foto do seu computador"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isCompressing}
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, field)}
                          />

                          {isCompressing ? (
                            <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                              <span className="text-[9px] font-semibold text-neutral-600">Processando foto...</span>
                            </div>
                          ) : imgUrl ? (
                            <img
                              src={imgUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                              onError={(e) => handleImgError(e, imgUrl)}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-neutral-400 group-hover:text-emerald-600 transition p-2 text-center">
                              <ImageIcon className="w-6 h-6" />
                              <span className="text-[9px] font-medium leading-tight">Clique ou arraste</span>
                            </div>
                          )}

                          {imgUrl && !isCompressing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingProduct(prev => prev ? { ...prev, [field]: '' } : null);
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow-md transition z-10"
                              title="Remover foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </label>

                        {/* Controls */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Ou cole a URL..."
                            value={imgUrl || ''}
                            onChange={(e) => {
                              const val = normalizeImageUrl(e.target.value);
                              setEditingProduct(prev => prev ? { ...prev, [field]: val } : null);
                            }}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 font-mono"
                          />

                          <label className="w-full py-1 text-[10px] bg-white border border-neutral-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-center block cursor-pointer font-semibold text-neutral-700 transition">
                            {isCompressing ? 'Compactando...' : imgUrl ? 'Trocar Imagem' : 'Carregar foto'}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isCompressing}
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, field)}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Switches: Active, Featured, Sort Order */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={editingProduct.ativo !== false}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, ativo: e.target.checked } : null)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  Produto Ativo na Vitrine
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-amber-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.destaque)}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, destaque: e.target.checked } : null)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  Destacar na Página Inicial
                </label>

                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
                  <span>Posição/Ordem:</span>
                  <input
                    type="number"
                    value={editingProduct.ordem || 1}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, ordem: parseInt(e.target.value) || 1 } : null)}
                    className="w-16 px-2 py-1 bg-white border border-neutral-200 rounded text-center"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#2A5C3F] hover:bg-[#1E4530] text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSaving ? 'Salvando...' : editingProduct.id ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Product Deletion Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-neutral-900">
                  Excluir Produto?
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Esta ação removerá o produto do catálogo da sua loja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0 border border-neutral-200">
                  {productToDelete.img1 ? (
                    <img
                      src={productToDelete.img1}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImgError(e, productToDelete.img1)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-neutral-900 text-sm truncate">
                    {productToDelete.nome}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {productToDelete.categoria} {productToDelete.subcategoria ? `› ${productToDelete.subcategoria}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProduct ? 'Excluindo...' : 'Sim, Excluir Produto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
