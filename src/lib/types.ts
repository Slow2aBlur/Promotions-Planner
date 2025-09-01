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
export type WeeklyCategorySelections = Array<[string, string, string]>; // 4-5 weeks of 3 categories each

export interface PromotionRecord {
  id?: string;
  created_at?: string;
  promotion_date: string;
  product_id: string;
  product_name: string;
  category: string;
}

export type PromotionStrategy = 'category' | 'brand' | 'random';