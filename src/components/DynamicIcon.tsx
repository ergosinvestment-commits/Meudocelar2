import React from 'react';
import {
  Laptop,
  Home,
  Sparkles,
  BookOpen,
  Heart,
  ShoppingBag,
  Package,
  Shirt,
  Smartphone,
  Headphones,
  Tv,
  Utensils,
  ChefHat,
  Coffee,
  Armchair,
  Lamp,
  Tag,
  Flame,
  Zap,
  Star,
  Gift,
  Globe,
  Percent,
  Award,
  TrendingUp,
  Folder,
  Layers,
  Boxes,
  Store,
  Monitor,
  Truck,
  Smile,
  ShieldCheck,
  Watch,
  Glasses,
  Camera,
  Music,
  Dumbbell,
  GraduationCap,
  Baby,
  Gamepad2,
  Car,
  Wrench,
  Palette,
  CheckCircle,
  LucideIcon
} from 'lucide-react';

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  laptop: Laptop,
  home: Home,
  sparkles: Sparkles,
  bookopen: BookOpen,
  book: BookOpen,
  heart: Heart,
  shoppingbag: ShoppingBag,
  bag: ShoppingBag,
  package: Package,
  box: Package,
  shirt: Shirt,
  smartphone: Smartphone,
  phone: Smartphone,
  cellphone: Smartphone,
  headphones: Headphones,
  tv: Tv,
  utensils: Utensils,
  chefhat: ChefHat,
  coffee: Coffee,
  armchair: Armchair,
  lamp: Lamp,
  tag: Tag,
  flame: Flame,
  zap: Zap,
  star: Star,
  gift: Gift,
  globe: Globe,
  percent: Percent,
  award: Award,
  trendingup: TrendingUp,
  folder: Folder,
  layers: Layers,
  boxes: Boxes,
  store: Store,
  monitor: Monitor,
  truck: Truck,
  smile: Smile,
  shieldcheck: ShieldCheck,
  watch: Watch,
  glasses: Glasses,
  camera: Camera,
  music: Music,
  dumbbell: Dumbbell,
  fitness: Dumbbell,
  graduationcap: GraduationCap,
  cursos: GraduationCap,
  livros: BookOpen,
  baby: Baby,
  gamepad2: Gamepad2,
  car: Car,
  wrench: Wrench,
  palette: Palette,
  checkcircle: CheckCircle
};

// Common emojis mapped by name if needed
const EMOJI_KEYWORD_MAP: Record<string, string> = {
  eletronicos: '💻',
  tech: '💻',
  tecnologia: '💻',
  casa: '🏠',
  cozinha: '🍳',
  beleza: '✨',
  cuidados: '💄',
  moda: '👗',
  acessorios: '👜',
  livros: '📚',
  cursos: '🎓',
  saude: '❤️',
  fitness: '💪',
  amazon: '📦',
  shopee: '🛍️',
  mercadolivre: '🤝',
  magalu: '🏬',
  shein: '👗',
  aliexpress: '✈️',
  hotmart: '🎓',
  kiwify: '💡',
  eduzz: '🚀',
  braip: '💎',
  tiktok: '🎵'
};

interface DynamicIconProps {
  icon?: string | null;
  className?: string;
  fallback?: string | React.ReactNode;
  size?: number | string;
}

// Function to check if a string is an actual emoji
function isEmoji(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  // If it contains ASCII letters/words with length > 2, it's likely a word name like "Laptop" or "ShoppingBag"
  if (/^[a-zA-Z0-9_\-\s]{2,}$/.test(trimmed)) {
    return false;
  }
  // Emoji regex detection
  const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji})/u;
  return emojiRegex.test(trimmed);
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  icon,
  className = 'w-4 h-4',
  fallback = null
}) => {
  if (!icon || !icon.trim()) {
    if (fallback) {
      if (typeof fallback === 'string') {
        return <span className={className}>{fallback}</span>;
      }
      return <>{fallback}</>;
    }
    return null;
  }

  const clean = icon.trim();

  // 1. If it's a real emoji (e.g. 💻, 🏠, ✨, 🛍️, 📦), render as text emoji
  if (isEmoji(clean)) {
    return <span className={`inline-flex items-center justify-center leading-none ${className}`}>{clean}</span>;
  }

  // 2. Normalize string for lookup (remove spaces, hyphens, lowercase)
  const normalizedKey = clean.toLowerCase().replace(/[\s\-_]/g, '');

  // 3. Check if we have a Lucide component match
  if (LUCIDE_ICON_MAP[normalizedKey]) {
    const IconComp = LUCIDE_ICON_MAP[normalizedKey];
    return <IconComp className={className} />;
  }

  // 4. Check if keyword maps to an emoji
  if (EMOJI_KEYWORD_MAP[normalizedKey]) {
    return (
      <span className={`inline-flex items-center justify-center leading-none ${className}`}>
        {EMOJI_KEYWORD_MAP[normalizedKey]}
      </span>
    );
  }

  // 5. If it's a single non-letter char (e.g. symbol), render it
  if (clean.length === 1) {
    return <span className={className}>{clean}</span>;
  }

  // 6. If it was an unknown text like "SomeUnknownWord", don't leak raw text string! Render fallback or a clean neutral icon
  if (fallback) {
    if (typeof fallback === 'string') {
      return <span className={className}>{fallback}</span>;
    }
    return <>{fallback}</>;
  }

  return <Tag className={className} />;
};

export default DynamicIcon;
