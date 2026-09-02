# P118 先民地圖 V0.1

P118 是一個可擴充的時空文化地圖原型。第一版以臺灣為工作範圍，提供年代節點、史前文化多邊形、現代參考圖層，以及透明 PNG／可編輯 SVG 輸出。

## V0.1 已完成

- 臺灣海岸線、22 縣市界與六個主要城市，皆使用專案內 GeoJSON。
- 年代拉桿的停止點由文化資料的起訖年自動產生。
- 滑鼠滾輪可逐一切換年代節點。
- 歷史文化圖層可由 Supabase RPC 載入；未設定時使用明確標示的示意資料。
- 現代縣市與城市可個別顯示或隱藏。
- 下載目前視窗為透明背景 PNG。
- 下載具有圖層群組與可移動文字的 SVG。
- 響應式桌面、平板與手機介面。

## 本機執行

需求：Node.js 22。

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。正式建置：

```bash
npm run build
```

靜態網站輸出位於 `dist/client`。

## Supabase

1. 依序執行 `Database/01_CreateTables.sql` 至 `Database/08_SeedData.sql`。
2. 依照 `Database/README.md` 編輯 `public/config.js`。
3. 僅在瀏覽器端放置 publishable/anon key，不可放置 service role key。

資料庫只保存歷史文化的年代、說明與幾何；基礎海岸線、縣市、城市維持為版本控制內的 GeoJSON。因此加入 SVG 輸出並不會增加資料表欄位。

## GitHub Pages

將本專案推送至 GitHub 的 `main` branch，再到 Repository Settings → Pages，將 Source 設為 **GitHub Actions**。內附 workflow 會自動設定 repository 子路徑並發布 `dist/client`。

若 Supabase 的 CORS／API 設定需要允許網站來源，請加入實際的 GitHub Pages 網址。

## 資料目錄

| 路徑 | 用途 |
|---|---|
| `public/data/base/taiwan_coastline.geojson` | 海岸線 |
| `public/data/base/taiwan_counties.geojson` | 現代縣市界 |
| `public/data/base/taiwan_cities.geojson` | 主要城市 |
| `public/data/demo/historical_features.geojson` | 離線系統示意資料 |
| `Database/` | Supabase P‑SDS SQL |

## 基礎圖資來源與提醒

- 縣市界：內政部國土測繪中心公開資料，原始資料日期 114-03-18。
- 城市點：Natural Earth, Populated Places。
- 海岸線：由同一份縣市界幾何 dissolve 產生，使 V0.1 的岸線與陸域完全貼合；專案亦保留 Natural Earth 原始下載來源的處理脈絡。

現代界線與城市只供定位，不代表史前行政區或文化疆域。V0.1 的「大坌坑文化」多邊形是功能測試草圖，不得作為學術引證。

## 擴充方向

資料與地圖投影均採 WGS84 經緯度輸入，之後可加入太平洋南島、長江與黃河流域。大範圍、多年代資料增加後，建議改用向量圖磚或依視窗範圍查詢 Supabase。
