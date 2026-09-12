// 複製此檔為 config.js，再填入自己的 Supabase 連線資料。
// GitHub 版本庫可保留 config-sample.js；請勿把 service_role key 放入前端。
window.P118_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TIMELINE_RPC: "P118_GetTimelineSites",
  CONTEXT_RPC: "P118_GetContextEvents"
};
