# P118 先民地圖 V0.1（精簡靜態版）

本版是可直接放在 GitHub Pages 的純靜態網站，不需要 Node.js、React、npm 或編譯程序。Repository 根目錄直接包含 `index.html`。

## 檔案結構

```text
index.html
styles.css
app.js
config.js
icon.svg
data/
  base/
  demo/
Database/
```

## GitHub Pages

1. 將本 ZIP 解壓縮。
2. 把解壓縮後資料夾內的所有內容放到 GitHub repository 根目錄。
3. 確認 repository 首頁直接看得到 `index.html`。
4. 到 Settings → Pages。
5. Source 選擇 **Deploy from a branch**。
6. Branch 選擇 `main`，資料夾選擇 `/(root)`。

## 本機測試

因為瀏覽器通常禁止 `file://` 頁面讀取 GeoJSON，請用任一靜態網站伺服器開啟。例如：

```bash
python -m http.server 8000
```

再開啟 `http://localhost:8000`。

## Supabase

1. 在 Supabase 啟用 PostGIS，確認其 schema 為 `extensions`。
2. 依序執行 `Database/01_CreateTables.sql` 至 `08_SeedData.sql`。
3. 將 Supabase Project URL 與 publishable/anon key 填入 `config.js`。

不得把 `service_role` key 放入網站。若 `config.js` 未設定，網站會使用 `data/demo/` 的明確標示示意資料。

## P-SDS 隔離範圍

01–08 只建立、修改或授權以下 P118 物件：

- `TblP118HistoricalEntity`
- `TblP118HistoricalGeometry`
- `VwP118TimelineStops`
- `P118_GetTimelineFeatures()`
- 名稱以 `P118` 開頭的 policies、constraints 與 indexes

腳本不建立或刪除 schema、不建立 extension、不授予 `public` schema 整體權限，也不操作其他 P 系列專案物件。

## 圖資

- 縣市界：內政部國土測繪中心公開資料，原始檔日期 114-03-18。
- 城市點：Natural Earth Populated Places。
- 海岸線：由同一份縣市界幾何合併產生，以維持岸線與陸域貼合。

現代縣市與城市只供定位。V0.1 的大坌坑文化多邊形是功能測試草圖，不得作為學術引證。

地圖引擎使用固定版本的 MapLibre GL JS 5.9.0，由 unpkg CDN 載入；網站本身仍不需要安裝或編譯。
