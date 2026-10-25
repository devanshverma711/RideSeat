import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDemoClient } from '@/lib/demoClient';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// No keys in .env.local = demo mode (fake data kept in this browser only).
export const isDemo = !url || !key;

export const supabase = (isDemo ? createDemoClient() : createClient(url!, key!)) as unknown as SupabaseClient;
