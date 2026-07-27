// Tawel Style — Supabase client.
// Fill these in from Supabase Dashboard → Project Settings → API.
// The anon key is safe to expose publicly — Row Level Security (see
// supabase/schema.sql) is what actually restricts writes to logged-in users.
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient = (SUPABASE_URL.startsWith('http') && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
