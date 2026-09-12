# P118 先民地圖 V0.4.1（導覽式年代播放）

本版將主要呈現方式由推定文化多邊形改為考古遺址點位。網站可直接放在 GitHub Pages，不需要 Node.js、npm 或編譯程序；Repository 根目錄直接包含 `index.html`。

## V0.4.1 重點

- 新增「往古代／暫停／往現代」自動播放，可選慢速、標準、快速。
- 自動播放會沿用連續年代與事件磁吸；遇到全球事件會停留約3秒，其他年代斷點短暫停留。
- 年代拉桿或滑鼠滾輪一經操作，即自動切回人工模式；空白鍵可暫停或繼續原方向。
- 全球事件卡改為半透明：停在事件年代時持續保留；年代持續移動超過3秒才淡出，下一事件出現時直接換卡。
- 播放速度會保存在目前瀏覽器中。

## 原有功能

- 主年代維持BC／AD，並自動顯示以AD 1950為基準的近似BP換算。
- 年代拉桿改為逐年連續值；滾輪依距離下一事件自動變速、磁吸並短暫停留。
- Ctrl＋滾輪採1年或5年的精細移動；游標在地圖上時，一般滾輪仍用於地圖縮放。
- 新增全球同期事件淡入卡，可關閉並可開啟證據來源。
- 第一批全球事件共10筆，涵蓋BC9600至BC221。

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

全新安裝請在 Supabase SQL Editor 依序執行 `Database/01_CreateTables.sql` 至 `11_AddWorldContext.sql`。

已完成V0.4且大坌坑文化與全球同期事件均正常顯示者，不需再執行任何SQL；V0.4.1只更新網站前端。

已完成V0.3.1且大坌坑文化已正常顯示者，只需執行 `Database/11_AddWorldContext.sql`。

升級會新增：

- `TblP118ArchaeologicalSite`
- `TblP118EntitySite`
- `TblP118ContextEvent`
- `P118_GetTimelineSites()`
- `P118_GetContextEvents()`

既有的 `TblP118HistoricalGeometry`、多邊形資料及舊 RPC 不會被刪除或修改，但 V0.2 網站不會再讀取它們。

## Supabase 連線

將 `config-sample.js` 複製為 `config.js`，再填入 Project URL 與 publishable/anon key。不可使用 `service_role` key。新版ZIP不包含實際 `config.js`，因此不會覆蓋網站上既有的連線設定。

```js
window.P118_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TIMELINE_RPC: "P118_GetTimelineSites",
  CONTEXT_RPC: "P118_GetContextEvents"
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

01–11 只操作名稱帶有 P118 的資料表、View、Function、Policy、Index 與 Constraint。不建立或刪除 schema、不變更 public schema 整體權限，也不操作其他 P 系列專案物件。

## 圖資與研究限制

- 縣市界：內政部國土測繪中心公開資料，原始檔日期 114-03-18。
- 城市點：Natural Earth Populated Places。
- 海岸線：由縣市界幾何合併產生，以維持岸線與陸域貼合。
- 遺址圓點只表示定位，不等於遺址邊界、文化涵蓋範圍或政治疆界。
- BP是由BC／AD依1950基準產生的閱讀輔助，不等於特定標本的14C BP或cal BP測定結果。
- 小馬洞穴目前為展示用概略座標，正式研究使用前須再校訂。

地圖引擎使用固定版本 MapLibre GL JS 5.9.0，由 unpkg CDN 載入。
