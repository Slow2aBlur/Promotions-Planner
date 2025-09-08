// TypeScript type definitions

export interface Product {
  product_id: string;
  product_name: string;
  supplier_name: string;
  brand: string;
  regular_price: number;
  sale_price: number;
  purchase_cost: number;
  category: string;
  views: number;
  stock_status: string; // 'instock', 'outofstock', 'onbackorder', etc.
  // Calculated fields
  regular_gp_percentage?: number;
  five_percent_sale_price?: number;
  // Editable fields
  custom_sale_price?: number;
  custom_gp_percentage?: number;
}

export interface DayPlan {
  date: Date;
  dayName: string;
  products: Product[];
  selectedCategories: [string, string, string];
}

export interface WeeklyPlan {
  weekNumber: number;
  days: DayPlan[];
  startDate: Date;
  endDate: Date;
}

export interface MonthlyPlan {
  month: number;
  year: number;
  weeks: WeeklyPlan[];
  totalDays: number;
}

// New types for category selections
export type DailyCategorySelections = Array<[string, string, string]>; // 7 days of 3 categories each
export type WeeklyCategorySelections = Array<string[]>; // Dynamic number of categories per week

export interface PromotionRecord {
  id?: string;
  created_at?: string;
  promotion_date: string;
  product_id: string;
  product_name: string;
  category: string;
  save_name?: string;
}

export type PromotionStrategy = 'category' | 'brand' | 'random';

// Weekly configuration types
export interface WeekConfig {
  startDate: string;
  endDate: string;
  targetGPMargin?: number; // Target GP margin percentage for this week
}

export interface WeeklyConfiguration {
  numberOfWeeks: number;
  weeks: WeekConfig[];
}

// Bundle system types
export interface BundleProduct {
  productId: string;
  product: Product;
  quantity: number; // How many of this product in the bundle
  targetPrice: number; // Target selling price for this product
}

export interface Bundle {
  id: string;
  bundleName: string;
  description?: string;
  products: BundleProduct[];
  bundlePrice: number; // Total price for the entire bundle
  bundleMargin: number; // Total margin for the entire bundle
  individualQuantity: number; // How many of this bundle to sell
  createdAt: Date;
}

// Session management types
export interface SessionSnapshot {
  version: string;
  savedAt: string; // dd/mm/yyyy HH:mm format
  sourceFile: {
    name: string;
    hash: string;
  };
  planningMode: 'Daily' | 'Weekly' | 'Monthly';
  adHocProducts: Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
    supplier: string;
    cost: number;
    promoPrice: number;
    qty: number;
  }>;
  bundles: Array<{
    name: string;
    ids: string[];
    items: Array<{
      id: string;
      name: string;
      cost: number;
      promoPrice: number;
      qty: number;
    }>;
    bundlePrice: number;
    accumCost: number;
    accumSelling: number;
    gpR: number;
    marginPct: number;
    savedR: number;
    savedPct: number;
  }>;
  totals: {
    totalProducts: number;
    totalQuantity: number;
    totalPurchaseCost: number;
    totalSalesValue: number;
    totalMargin: number;
  };
  ui: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    selectedRows: string[];
    scrollPosition: number;
  };
  // Independent bundles created via Bundle Builder
  builderBundles?: BuilderBundle[];
}

export interface SessionIndexEntry {
  id: string;
  name: string;
  savedAt: string;
  updatedAt: string;
  sourceFile: string;
  itemCount: number;
  bundleCount: number;
}

// Bundle Builder types (independent from promotion plans)
export type BuilderPricingMode = 'Manual' | 'Sum' | 'Discount';

export interface BuilderBundleItem {
  productId: string;
  product: Product;
  qty: number;
  proposedPrice?: number; // User's proposed price for this item
}

export interface BuilderBundle {
  id: string;
  name: string; // e.g., "Bundle 1"
  items: BuilderBundleItem[];
  pricingMode: BuilderPricingMode;
  bundlePrice: number; // resolved price based on pricing mode
  discountPct?: number; // when pricingMode === 'Discount'
  createdAt: Date;
}