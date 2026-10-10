// Stage Radar — public configuration for the web app.
// Fill in from Supabase → Project Settings → API.
// The "anon" key is designed to be public: security comes from the row-level security
// policies in supabase/schema.sql. NEVER put the service_role key here.
window.STAGE_RADAR_CONFIG = {
  supabaseUrl: "https://lpacanurfbnkqrfrlwcd.supabase.co",
  supabaseAnonKey: "sb_publishable_FH_w1EB9ISwis4DfvJi14Q_XDJBxSvx",
  appName: "Stage Radar",
  maxAgeDays: 60,        // offers older than this are hidden
};

