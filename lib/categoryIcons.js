import { 
    ShoppingCart, 
    ArrowDownLeft, 
    Briefcase, 
    Coffee, 
    Home, 
    Zap, 
    Heart, 
    Truck, 
    Plane, 
    Globe, 
    Smartphone, 
    Music,
    Utensils,
    Car,
    Clapperboard,
    ShoppingBag,
    Package
} from "lucide-react";

export const CATEGORY_ICONS = {
    // Default/System icons matching the seed data or intuitive names
    ShoppingCart: ShoppingCart,
    ArrowDownLeft: ArrowDownLeft,
    Briefcase: Briefcase,
    Coffee: Coffee,
    Home: Home,
    Zap: Zap,
    Heart: Heart,
    Truck: Truck,
    Plane: Plane,
    Globe: Globe,
    Smartphone: Smartphone,
    Music: Music,
    
    // Icons likely used in the screenshot or existing data
    Food: Utensils,
    Transport: Car,
    Entertainment: Clapperboard,
    Shopping: ShoppingBag,
    Other: Package,
    
    // Mapping legacy emoji icons to Lucide components
    "🍔": Utensils,
    "🚗": Car,
    "🎬": Clapperboard,
    "🛍️": ShoppingBag,
    "📦": Package,
    "💊": Heart, // Health fallback
    "🎓": Briefcase, // Education fallback
    "💸": ArrowDownLeft, // Income fallback
    "🛒": ShoppingCart,
    "🏠": Home,
    "⚡": Zap,
    "✈️": Plane,
    "🎮": Smartphone,
    "🎵": Music
};

export const getCategoryIcon = (iconName) => {
    const IconComponent = CATEGORY_ICONS[iconName] || CATEGORY_ICONS.ShoppingCart;
    return IconComponent;
};
