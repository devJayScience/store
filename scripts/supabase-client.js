
// Initialize Supabase Client
// TODO: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://hbjomyoxrttvgzmogtgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ePIFHw7NcghaUNggYpspBw_wzTgjEUw';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Supabase credentials not set in scripts/supabase-client.js');
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
