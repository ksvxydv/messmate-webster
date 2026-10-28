import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gacxmkewwyuoqeyaxzmr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dlOK7ncQgNBiuS8sV2Fp9Q_zfRb6F0W";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
