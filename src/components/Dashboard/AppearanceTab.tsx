import React, { useState } from 'react';
import { StoreConfig } from '../../types';
import { updateStoreConfig, uploadImageToServer } from '../../api/client';
import { compressImageToWebP, formatToWebPUrl } from '../../utils';
import { Palette, Image as ImageIcon, Sparkles, Check, Eye, Loader2 } from 'lucide-react';

interface AppearanceTabProps {
  storeSlug: string;
  config: StoreConfig;
  onRefresh: () => void;
}

const COLOR_PRESETS = [
  { name: 'Verde Esmeralda', hex: '#2A5C3F' },
  { name: 'Azul Royal', hex: '#2563EB' },
  { name: 'Roxo Moderno', hex: '#7C3AED' },
  { name: 'Vermelho Rubi', hex: '#DC2626' },
  { name: 'Laranja Coral', hex: '#EA580C' },
  { name: 'Dourado Elegante', hex: '#B8860B' },
  { name: 'Turquesa', hex: '#0D9488' },
  { name: 'Preto Luxo', hex: '#1B1B1B' }
];

export default function AppearanceTab({ storeSlug, config, onRefresh }: AppearanceTabProps) {
  const [formData, setFormData] = useState<StoreConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStoreConfig(storeSlug, formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      console.error('Error updating appearance:', err);
      alert('Erro ao salvar configurações de aparência.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingLogo(true);
    try {
      const webp = await compressImageToWebP(file, { maxWidth: 600, maxHeight: 600, quality: 0.85, format: 'image/webp' });
      if (webp) {
        const serverUrl = await uploadImageToServer(webp, file.name);
        setFormData(prev => ({ ...prev, logo: serverUrl || webp }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string' && reader.result) {
            setFormData(prev => ({ ...prev, logo: reader.result as string }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error compressing logo:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result) {
          setFormData(prev => ({ ...prev, logo: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingLogo(false);
      e.target.value = '';
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingBanner(true);
    try {
      const webp = await compressImageToWebP(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85, format: 'image/webp' });
      if (webp) {
        const serverUrl = await uploadImageToServer(webp, file.name);
        setFormData(prev => ({ ...prev, bannerUrl: serverUrl || webp }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string' && reader.result) {
            setFormData(prev => ({ ...prev, bannerUrl: reader.result as string }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error compressing banner:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result) {
          setFormData(prev => ({ ...prev, bannerUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingBanner(false);
      e.target.value = '';
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Live Preview Box */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Eye className="w-4 h-4 text-neutral-400" />
            <span>Pré-visualização da Identidade Visual</span>
          </div>
          <span className="text-xs text-neutral-400">Atualizado em tempo real</span>
        </div>

        {/* Mock Header Preview */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          {/* Top Bar */}
          {formData.mensagemTopo && (
            <div
              className="py-1.5 px-3 text-center text-xs font-semibold text-white truncate"
              style={{ backgroundColor: formData.corBarraTopo || formData.corPrimaria || '#2A5C3F' }}
            >
              {formData.mensagemTopo}
            </div>
          )}

          {/* Header */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="max-h-8 max-w-[120px] object-contain rounded" />
              ) : null}
              <span className="font-bold text-sm text-neutral-900">{formData.storeName || 'Nome da Loja'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full text-white font-semibold" style={{ backgroundColor: formData.corPrimaria || '#2A5C3F' }}>
                Ver Ofertas
              </span>
            </div>
          </div>

          {/* Mock Banner */}
          {formData.bannerUrl && (
            <div className="relative h-28 sm:h-32 overflow-hidden bg-neutral-100 rounded-xl border border-neutral-200">
              <img
                src={formData.bannerUrl}
                alt="Banner"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              {(formData.bannerTag || formData.bannerTitulo || formData.bannerSubtitulo) && (
                <div
                  className="absolute inset-0 flex flex-col justify-center px-4"
                  style={{
                    background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 28%, rgba(0,0,0,0.15) 50%, transparent 68%)'
                  }}
                >
                  <div className="max-w-[70%]">
                    {formData.bannerTag && <div className="text-[9px] font-bold text-white/95 uppercase tracking-wider">{formData.bannerTag}</div>}
                    {formData.bannerTitulo && <div className="text-sm font-bold text-white leading-tight mt-0.5">{formData.bannerTitulo}</div>}
                    {formData.bannerSubtitulo && <div className="text-[11px] text-white/90 line-clamp-1 mt-0.5">{formData.bannerSubtitulo}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Appearance Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand & Identity */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-500" />
            Identidade & Nome
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Nome da Loja *
            </label>
            <input
              type="text"
              required
              value={formData.storeName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Título da Página (SEO / Aba do Navegador)
            </label>
            <input
              type="text"
              value={formData.tituloSite || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, tituloSite: e.target.value }))}
              placeholder="Ex: Meudocelar — Ofertas e Cupons Imperdíveis"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Descrição do Site (Meta Description)
            </label>
            <textarea
              rows={2}
              value={formData.descricaoSite || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, descricaoSite: e.target.value }))}
              placeholder="Descrição para buscas do Google e prévias em redes sociais..."
              className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Logo da Loja
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                WebP automático
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {isCompressingLogo ? (
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                ) : formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-neutral-300" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  placeholder="URL da logo (PNG, WebP ou SVG)..."
                  value={formData.logo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: formatToWebPUrl(e.target.value) }))}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none"
                />
                <label className="inline-block px-3 py-1 text-xs bg-neutral-100 hover:bg-emerald-50 hover:border-emerald-300 text-neutral-700 font-semibold rounded cursor-pointer transition">
                  {isCompressingLogo ? 'Compactando WebP...' : 'Fazer upload de arquivo'}
                  <input type="file" accept="image/*" disabled={isCompressingLogo} className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Colors & Palette */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 text-neutral-500" />
            Paleta de Cores
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
              Cor Primária da Vitrine
            </label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={formData.corPrimaria || '#2A5C3F'}
                onChange={(e) => setFormData(prev => ({ ...prev, corPrimaria: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={formData.corPrimaria || '#2A5C3F'}
                onChange={(e) => setFormData(prev => ({ ...prev, corPrimaria: e.target.value }))}
                className="w-28 px-3 py-2 text-sm font-mono uppercase bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
              <span className="text-xs text-neutral-400">Usada nos botões, badges, destaques e preços</span>
            </div>

            <div className="text-xs text-neutral-500 mb-1.5 font-medium">Cores sugeridas:</div>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((p) => {
                const isSelected = (formData.corPrimaria || '').toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, corPrimaria: p.hex }))}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                      isSelected ? 'border-neutral-900 bg-neutral-50 shadow-xs font-bold' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.hex }} />
                    <span className="text-[11px] text-neutral-700 truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Barra Superior de Aviso (Top Announcement)
            </label>
            <input
              type="text"
              placeholder="Ex: 🔥 Frete Grátis e Cupons Exclusivos adicionados hoje!"
              value={formData.mensagemTopo || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, mensagemTopo: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:border-neutral-400 mb-2"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">Cor de fundo da barra:</span>
              <input
                type="color"
                value={formData.corBarraTopo || formData.corPrimaria || '#2A5C3F'}
                onChange={(e) => setFormData(prev => ({ ...prev, corBarraTopo: e.target.value }))}
                className="w-7 h-7 rounded border border-neutral-300 cursor-pointer"
              />
              <input
                type="text"
                value={formData.corBarraTopo || ''}
                placeholder="Mesma da primária"
                onChange={(e) => setFormData(prev => ({ ...prev, corBarraTopo: e.target.value }))}
                className="w-32 px-2 py-1 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Banner Configuration */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-neutral-500" />
          Banner Principal de Destaque
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Imagem do Banner (URL ou Arquivo)
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  WebP automático
                </span>
              </div>
              <input
                type="text"
                placeholder="https://..."
                value={formData.bannerUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerUrl: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none mb-1.5"
              />
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <label className="inline-block px-3 py-1.5 text-xs bg-neutral-100 hover:bg-emerald-50 hover:border-emerald-300 text-neutral-700 font-semibold rounded-lg cursor-pointer transition">
                  {isCompressingBanner ? 'Compactando WebP...' : 'Carregar imagem do computador'}
                  <input type="file" accept="image/*" disabled={isCompressingBanner} className="hidden" onChange={handleBannerUpload} />
                </label>
                <span className="text-[11px] text-neutral-500">
                  ✨ Adaptação automática a qualquer formato e proporção
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Link de Destino ao Clicar no Banner
              </label>
              <input
                type="text"
                placeholder="Ex: Eletrônicos (filtra a categoria) ou https://link.com"
                value={formData.bannerLink || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerLink: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Tag Superior do Banner
              </label>
              <input
                type="text"
                placeholder="Ex: SELEÇÃO ESPECIAL"
                value={formData.bannerTag || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerTag: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Título do Banner
              </label>
              <input
                type="text"
                placeholder="Ex: Ofertas Imperdíveis do Dia"
                value={formData.bannerTitulo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerTitulo: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Subtítulo do Banner
              </label>
              <input
                type="text"
                placeholder="Ex: Ofertas com até 60% de desconto e cupons exclusivos."
                value={formData.bannerSubtitulo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerSubtitulo: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {savedSuccess && (
          <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" /> Alterações visuais salvas com sucesso!
          </span>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Aparência'}
        </button>
      </div>
    </form>
  );
}
