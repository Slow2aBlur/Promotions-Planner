import { supabase } from './supabaseClient';
import { Product, DayPlan, WeeklyPlan, MonthlyPlan } from './types';

// Types for backup data
export interface BackupSession {
  id: string;
  session_name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  description?: string;
}

export interface FullApplicationState {
  products: Product[];
  dailyPlan: DayPlan | null;
  weeklyPlan: WeeklyPlan | null;
  monthlyPlan: MonthlyPlan | null;
  adHocPlan: any;
  dailySelections: any;
  weeklySelections: any;
  weeklyConfig: any;
  weeklyCategoryConfig: any;
  planningMode: string;
  uniqueCategories: string[];
  uploadedFileName: string;
  lastUploadedFile: File | null;
  expectedQuantity: number;
}

// 1. SESSION MANAGEMENT
export async function createNewSession(sessionName: string, description?: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      session_name: sessionName,
      description: description || `Session created on ${new Date().toLocaleDateString()}`
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Error creating session: ${error.message}`);
  }

  return data.id;
}

export async function getActiveSessions(): Promise<BackupSession[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching sessions: ${error.message}`);
  }

  return data || [];
}

export async function setActiveSession(sessionId: string): Promise<void> {
  // Deactivate all sessions
  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .neq('id', sessionId);

  // Activate the selected session
  const { error } = await supabase
    .from('user_sessions')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Error setting active session: ${error.message}`);
  }
}

// 2. COMPREHENSIVE BACKUP
export async function saveFullApplicationState(
  sessionId: string,
  state: FullApplicationState,
  planName?: string
): Promise<void> {
  try {
    // Save products
    if (state.products.length > 0) {
      await saveProducts(sessionId, state.products);
    }

    // Save daily plan
    if (state.dailyPlan) {
      await saveDailyPlan(sessionId, state.dailyPlan, planName || 'Daily Plan');
    }

    // Save weekly plan
    if (state.weeklyPlan) {
      await saveWeeklyPlan(sessionId, state.weeklyPlan, planName || 'Weekly Plan');
    }

    // Save monthly plan
    if (state.monthlyPlan) {
      await saveMonthlyPlan(sessionId, state.monthlyPlan, planName || 'Monthly Plan');
    }

    // Save ad-hoc plan
    if (state.adHocPlan && (state.adHocPlan.products.length > 0 || state.adHocPlan.approvedProducts.length > 0)) {
      await saveAdHocPlan(sessionId, state.adHocPlan, planName || 'Ad-hoc Plan');
    }

    // Save application settings
    await saveAppSettings(sessionId, {
      dailySelections: state.dailySelections,
      weeklySelections: state.weeklySelections,
      weeklyConfig: state.weeklyConfig,
      weeklyCategoryConfig: state.weeklyCategoryConfig,
      planningMode: state.planningMode,
      uniqueCategories: state.uniqueCategories,
      uploadedFileName: state.uploadedFileName,
      expectedQuantity: state.expectedQuantity
    });

    // Update session timestamp
    await supabase
      .from('user_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

  } catch (error) {
    throw new Error(`Error saving application state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 3. INDIVIDUAL DATA SAVERS
export async function saveProducts(sessionId: string, products: Product[]): Promise<void> {
  const { error } = await supabase
    .from('products')
    .upsert(
      products.map(product => ({
        session_id: sessionId,
        product_id: product.product_id,
        product_name: product.product_name,
        brand: product.brand,
        category: product.category,
        supplier: product.supplier,
        supplier_name: product.supplier_name,
        purchase_cost: product.purchase_cost,
        regular_price: product.regular_price,
        five_percent_sale_price: product.five_percent_sale_price,
        custom_sale_price: product.custom_sale_price,
        custom_gp_percentage: product.custom_gp_percentage,
        views: product.views,
        stock_status: product.stock_status,
        description: product.description
      })),
      { onConflict: 'session_id,product_id' }
    );

  if (error) {
    throw new Error(`Error saving products: ${error.message}`);
  }
}

export async function saveDailyPlan(sessionId: string, plan: DayPlan, planName: string): Promise<void> {
  const { error } = await supabase
    .from('daily_plans')
    .upsert({
      session_id: sessionId,
      plan_name: planName,
      date: plan.date.toISOString().split('T')[0],
      categories: plan.categories,
      products: plan.products,
      total_products: plan.products.length
    }, { onConflict: 'session_id,plan_name' });

  if (error) {
    throw new Error(`Error saving daily plan: ${error.message}`);
  }
}

export async function saveWeeklyPlan(sessionId: string, plan: WeeklyPlan, planName: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_plans')
    .upsert({
      session_id: sessionId,
      plan_name: planName,
      number_of_weeks: plan.days.length,
      weekly_config: plan.weeklyConfig,
      weekly_selections: plan.weeklySelections,
      weekly_category_config: plan.weeklyCategoryConfig,
      days: plan.days,
      total_products: plan.days.reduce((total, day) => total + day.products.length, 0)
    }, { onConflict: 'session_id,plan_name' });

  if (error) {
    throw new Error(`Error saving weekly plan: ${error.message}`);
  }
}

export async function saveMonthlyPlan(sessionId: string, plan: MonthlyPlan, planName: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_plans')
    .upsert({
      session_id: sessionId,
      plan_name: planName,
      month_year: plan.monthYear,
      weeks: plan.weeks,
      total_products: plan.weeks.reduce((total, week) => 
        total + week.days.reduce((weekTotal, day) => weekTotal + day.products.length, 0), 0)
    }, { onConflict: 'session_id,plan_name' });

  if (error) {
    throw new Error(`Error saving monthly plan: ${error.message}`);
  }
}

export async function saveAdHocPlan(sessionId: string, adHocPlan: any, planName: string): Promise<void> {
  const { error } = await supabase
    .from('adhoc_plans')
    .upsert({
      session_id: sessionId,
      plan_name: planName,
      max_products: adHocPlan.maxProducts,
      current_product_id: adHocPlan.currentProductId,
      products: adHocPlan.products,
      approved_products: adHocPlan.approvedProducts,
      is_active: adHocPlan.isOpen
    }, { onConflict: 'session_id,plan_name' });

  if (error) {
    throw new Error(`Error saving ad-hoc plan: ${error.message}`);
  }
}

export async function saveAppSettings(sessionId: string, settings: any): Promise<void> {
  const settingsArray = Object.entries(settings).map(([key, value]) => ({
    session_id: sessionId,
    setting_key: key,
    setting_value: value
  }));

  const { error } = await supabase
    .from('app_settings')
    .upsert(settingsArray, { onConflict: 'session_id,setting_key' });

  if (error) {
    throw new Error(`Error saving app settings: ${error.message}`);
  }
}

// 4. LOAD FUNCTIONS
export async function loadFullApplicationState(sessionId: string): Promise<FullApplicationState> {
  try {
    // Load products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('session_id', sessionId);

    if (productsError) throw productsError;

    // Load daily plan
    const { data: dailyPlan, error: dailyError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load weekly plan
    const { data: weeklyPlan, error: weeklyError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load monthly plan
    const { data: monthlyPlan, error: monthlyError } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load ad-hoc plan
    const { data: adHocPlan, error: adHocError } = await supabase
      .from('adhoc_plans')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load app settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('session_id', sessionId);

    if (settingsError) throw settingsError;

    // Convert settings array to object
    const settingsObj = settings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as any) || {};

    return {
      products: products || [],
      dailyPlan: dailyPlan ? {
        ...dailyPlan,
        date: new Date(dailyPlan.date),
        products: dailyPlan.products
      } : null,
      weeklyPlan: weeklyPlan ? {
        ...weeklyPlan,
        days: weeklyPlan.days.map((day: any) => ({
          ...day,
          date: new Date(day.date),
          products: day.products
        }))
      } : null,
      monthlyPlan: monthlyPlan ? {
        ...monthlyPlan,
        weeks: monthlyPlan.weeks.map((week: any) => ({
          ...week,
          days: week.days.map((day: any) => ({
            ...day,
            date: new Date(day.date),
            products: day.products
          }))
        }))
      } : null,
      adHocPlan: adHocPlan ? {
        ...adHocPlan,
        isOpen: adHocPlan.is_active
      } : {
        isOpen: false,
        products: [],
        approvedProducts: [],
        currentProductId: '',
        maxProducts: 30
      },
      dailySelections: settingsObj.dailySelections || [],
      weeklySelections: settingsObj.weeklySelections || [],
      weeklyConfig: settingsObj.weeklyConfig || { numberOfWeeks: 1, weeks: [{ startDate: '', endDate: '', targetGPMargin: 0 }] },
      weeklyCategoryConfig: settingsObj.weeklyCategoryConfig || { numberOfCategories: 3, productsPerCategory: 3 },
      planningMode: settingsObj.planningMode || 'daily',
      uniqueCategories: settingsObj.uniqueCategories || [],
      uploadedFileName: settingsObj.uploadedFileName || '',
      lastUploadedFile: null, // Can't restore File objects
      expectedQuantity: settingsObj.expectedQuantity || 5
    };

  } catch (error) {
    throw new Error(`Error loading application state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 5. AUTO-SAVE FUNCTIONALITY
export async function autoSaveApplicationState(sessionId: string, state: FullApplicationState): Promise<void> {
  try {
    await saveFullApplicationState(sessionId, state, 'Auto-save');
  } catch (error) {
    console.warn('Auto-save failed:', error);
    // Don't throw error for auto-save failures
  }
}
