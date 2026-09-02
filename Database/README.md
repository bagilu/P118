# P118 Supabase 資料庫安裝

本目錄採 P‑SDS 分段 SQL。所有自訂物件均使用 P118 前綴，避免影響同一個 Supabase 專案中的其他系統。

## 安裝前

1. 在 Supabase Dashboard → Database → Extensions 啟用 **PostGIS**。
2. 確認 PostGIS 安裝於 `extensions` schema。
3. 依檔名前綴順序，在 SQL Editor 執行 `01` 至 `08`。

`08_SeedData.sql` 會寫入一筆明確標示的系統示意資料。其多邊形不是學術研究成果；正式建置時應以經校訂的 GeoJSON 或 WKT 取代。

## 網站連線

編輯 `public/config.js`：

```js
window.P118_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TIMELINE_RPC: "P118_GetTimelineFeatures",
};
```

瀏覽器只能使用 Supabase 的 publishable/anon key；不要放入 `service_role` key。未設定連線時，網站會自動載入本機示意資料。
