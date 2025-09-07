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