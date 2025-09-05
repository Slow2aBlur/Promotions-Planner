-- Enhanced SQL schema for comprehensive data backup
-- Run this in your Supabase SQL editor

-- 1. User Sessions Table (to track different work sessions)
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  session_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT
);

-- 2. Products Table (store uploaded product data)
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  supplier TEXT,
  supplier_name TEXT,
  purchase_cost DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  five_percent_sale_price DECIMAL(10,2),
  custom_sale_price DECIMAL(10,2),
  custom_gp_percentage DECIMAL(5,2),
  views INTEGER DEFAULT 0,
  stock_status TEXT,
  description TEXT,
  UNIQUE(session_id, product_id)
);

-- 3. Daily Plans Table
CREATE TABLE daily_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  plan_name TEXT NOT NULL,
  date DATE NOT NULL,
  categories JSONB NOT NULL, -- Store category selections as JSON
  products JSONB NOT NULL, -- Store product data as JSON
  total_products INTEGER NOT NULL,
  UNIQUE(session_id, plan_name)
);

-- 4. Weekly Plans Table
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  plan_name TEXT NOT NULL,
  number_of_weeks INTEGER NOT NULL,
  weekly_config JSONB NOT NULL, -- Store weekly configuration
  weekly_selections JSONB NOT NULL, -- Store category selections
  weekly_category_config JSONB NOT NULL, -- Store category config
  days JSONB NOT NULL, -- Store all days and products as JSON
  total_products INTEGER NOT NULL,
  UNIQUE(session_id, plan_name)
);

-- 5. Monthly Plans Table
CREATE TABLE monthly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  plan_name TEXT NOT NULL,
  month_year TEXT NOT NULL, -- e.g., "2024-01"
  weeks JSONB NOT NULL, -- Store all weeks and products as JSON
  total_products INTEGER NOT NULL,
  UNIQUE(session_id, plan_name)
);

-- 6. Ad-hoc Plans Table
CREATE TABLE adhoc_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  plan_name TEXT NOT NULL,
  max_products INTEGER DEFAULT 30,
  current_product_id TEXT,
  products JSONB NOT NULL, -- Store current analysis products
  approved_products JSONB NOT NULL, -- Store approved products
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, plan_name)
);

-- 7. Application Settings Table
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  UNIQUE(session_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX idx_products_session_id ON products(session_id);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_daily_plans_session_id ON daily_plans(session_id);
CREATE INDEX idx_weekly_plans_session_id ON weekly_plans(session_id);
CREATE INDEX idx_monthly_plans_session_id ON monthly_plans(session_id);
CREATE INDEX idx_adhoc_plans_session_id ON adhoc_plans(session_id);
CREATE INDEX idx_app_settings_session_id ON app_settings(session_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adhoc_plans_updated_at BEFORE UPDATE ON adhoc_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
