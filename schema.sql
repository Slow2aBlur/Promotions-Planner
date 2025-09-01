-- SQL schema for the promotions table
-- Create this table in your Supabase database

CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  promotion_date DATE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Create an index on promotion_date for better query performance
CREATE INDEX idx_promotions_date ON promotions(promotion_date);

-- Create an index on product_id for better query performance
CREATE INDEX idx_promotions_product_id ON promotions(product_id);
