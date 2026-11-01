// Project defaults. The Supabase *publishable* key is public by design (protected by RLS in supabase/schema.sql).
// NEVER put a secret / service_role key here. Leave empty to let each user enter their own project in Settings.
window.SB_DEFAULTS = {
  url: "",        // e.g. "https://abcdxyz.supabase.co"
  key: "",        // e.g. "sb_publishable_xxxxxxxx"
  siteUrl: ""     // e.g. "https://yourname.github.io/second-brain/"  (used for email-confirm / reset links)
};
