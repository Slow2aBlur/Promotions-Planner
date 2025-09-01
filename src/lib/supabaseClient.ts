import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing (for development)
const createMockClient = () => ({
  from: () => ({
    select: () => ({
      gte: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null })
  })
});

export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? createMockClient() as any
  : createClient(supabaseUrl, supabaseAnonKey);