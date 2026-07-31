// Tawel Style — Supabase client.
// Fill these in from Supabase Dashboard → Project Settings → API.
// The anon key is safe to expose publicly — Row Level Security (see
// supabase/schema.sql) is what actually restricts writes to logged-in users.
const SUPABASE_URL = 'https://gnbmbvsumegybmuqvbkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYm1idnN1bWVneWJtdXF2YmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTY3NzksImV4cCI6MjEwMDczMjc3OX0.vJ4-fkiGNe_mGsK26NqHATZQ4YMe3yEQATaDKfr5QvQ';

const supabaseClient = (SUPABASE_URL.startsWith('http') && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
