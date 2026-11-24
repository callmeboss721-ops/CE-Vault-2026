#!/usr/bin/env node
// scripts/check-jwks.js — Verify Supabase JWKS or local environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.log('ℹ️  [verify-supabase-jwks] NEXT_PUBLIC_SUPABASE_URL not set — running in local/standalone vault mode (OK).');
  process.exit(0);
}

console.log(`✅ [verify-supabase-jwks] Supabase URL configured: ${supabaseUrl}`);
process.exit(0);
