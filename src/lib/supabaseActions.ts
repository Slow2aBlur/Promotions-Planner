import { supabase } from './supabaseClient';
import { PromotionRecord, WeeklyPlan } from './types';

// Fetch recent promotions from the database
export async function getRecentPromotions(days: number): Promise<PromotionRecord[]> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .gte('promotion_date', dateThreshold.toISOString().split('T')[0])
    .order('promotion_date', { ascending: false });

  if (error) {
    throw new Error(`Error fetching promotions: ${error.message}`);
  }

  return data || [];
}

// Save a weekly promotion plan to the database
export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<void> {
  const promotionRecords: Omit<PromotionRecord, 'id' | 'created_at'>[] = [];

  // Flatten the weekly plan into individual promotion records
  plan.days.forEach(day => {
    day.products.forEach(product => {
      promotionRecords.push({
        promotion_date: day.date.toISOString().split('T')[0],
        product_id: product.product_id,
        product_name: product.product_name,
        category: product.category
      });
    });
  });

  const { error } = await supabase
    .from('promotions')
    .insert(promotionRecords);

  if (error) {
    throw new Error(`Error saving weekly plan: ${error.message}`);
  }
}
