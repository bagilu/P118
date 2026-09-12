# P118 先民地圖 V0.3.1（證據與遺址版）

本版將主要呈現方式由推定文化多邊形改為考古遺址點位。網站可直接放在 GitHub Pages，不需要 Node.js、npm 或編譯程序；Repository 根目錄直接包含 `index.html`。

## V0.3.1 重點

- 文化資料與考古遺址資料分開管理。
- 經緯度直接保存為 `Longitude`、`Latitude` 數字，不需編寫 WKT、GeoJSON 或 EWKB。
- 同一文化可連結多個遺址；同一遺址也可連結多個文化層。
- 地圖圓點大小隨縮放層級調整，但圓點不表示遺址面積或文化範圍。
- 年代拉桿、滑鼠滾輪、透明 PNG、可編輯 SVG、現代縣市界及城市圖層均保留。
- SVG 中每個遺址均為獨立的 `<circle>` 與 `<text>`，可在向量軟體中編輯。
- 加入縣市、鄉鎮市區、位置精度，以及文化—遺址關係的證據狀態與來源。
- 第一批收入長濱文化2處、牛罵頭文化9處、卑南文化6處，共17個文化—遺址關聯。
- 網站左上角標示「慈濟大學 經營管理學系 好玩實驗室 作品」。
- 修復V0.3中遭截斷而無法解析的臺灣縣市界與海岸線GeoJSON。

## GitHub Pages

1. 將 ZIP 解壓縮。
2. 把解壓縮後資料夾內的所有內容上傳至 GitHub repository 根目錄。
3. 確認 repository 首頁直接看得到 `index.html`。
4. 到 Settings → Pages，選擇 `Deploy from a branch`、`main`、`/(root)`。

## 資料庫安裝或升級

全新安裝請在 Supabase SQL Editor 依序執行 `Database/01_CreateTables.sql` 至 `09_AddEvidenceAndSites.sql`。

已完成 V0.2 的01至08者，只需再執行 `Database/09_AddEvidenceAndSites.sql`，不必重跑01至08。

升級會新增：

- `TblP118ArchaeologicalSite`
- `TblP118EntitySite`
- `P118_GetTimelineSites()`

既有的 `TblP118HistoricalGeometry`、多邊形資料及舊 RPC 不會被刪除或修改，但 V0.2 網站不會再讀取它們。

## Supabase 連線

將 `config-sample.js` 複製為 `config.js`，再填入 Project URL 與 publishable/anon key。不可使用 `service_role` key。新版ZIP不包含實際 `config.js`，因此不會覆蓋網站上既有的連線設定。

```js
window.P118_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TIMELINE_RPC: "P118_GetTimelineSites"
};
```

## 自行新增遺址

可直接在 Supabase Table Editor 的 `TblP118ArchaeologicalSite` 新增資料。最重要的欄位是：

```text
Slug          唯一英文代碼
SiteNameZh    中文遺址名稱
Longitude     經度，例如 121.476676
Latitude      緯度，例如 23.397167
IsPublished   是否公開
```

新增遺址後，還需在 `TblP118EntitySite` 建立它與文化的關聯，網站才會顯示。

## P-SDS 隔離範圍

01–09 只操作名稱帶有 P118 的資料表、View、Function、Policy、Index 與 Constraint。不建立或刪除 schema、不變更 public schema 整體權限，也不操作其他 P 系列專案物件。

## 圖資與研究限制

- 縣市界：內政部國土測繪中心公開資料，原始檔日期 114-03-18。
- 城市點：Natural Earth Populated Places。
- 海岸線：由縣市界幾何合併產生，以維持岸線與陸域貼合。
- 遺址圓點只表示定位，不等於遺址邊界、文化涵蓋範圍或政治疆界。
- 小馬洞穴目前為展示用概略座標，正式研究使用前須再校訂。

地圖引擎使用固定版本 MapLibre GL JS 5.9.0，由 unpkg CDN 載入。
