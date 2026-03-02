import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client is now ready for Phase 2: Supabase Sync
export const supabase = createClient(supabaseUrl, supabaseAnonKey);