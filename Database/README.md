# P118 Supabase 資料庫安裝（V0.2 遺址點位版）

本目錄採 P-SDS 分段 SQL。所有自訂物件均使用 P118 前綴，避免影響同一個 Supabase Project 中的其他系統。

## 安裝或升級

依檔名前綴順序，在 Supabase SQL Editor 執行 `01` 至 `08`。

- 全新安裝：建立文化、遺址及文化—遺址關聯資料。
- 從 V0.1 升級：新增 V0.2 物件，保留舊多邊形資料表與舊 RPC。
- `08_SeedData.sql`：寫入長濱、牛罵頭、卑南三個文化，以及八仙洞、小馬、牛罵頭、卑南四個遺址點。

V0.2 的點位架構不需要 PostGIS。若 V0.1 已啟用 PostGIS，不必停用；其他專案可能仍會使用它。

## 主要資料表

### TblP118HistoricalEntity

保存文化名稱、BC/AD 起訖年、文字說明、來源及顯示顏色。

### TblP118ArchaeologicalSite

保存遺址名稱及可直接閱讀、編輯的經緯度：

```text
Longitude：經度，範圍 -180 至 180
Latitude：緯度，範圍 -90 至 90
```

### TblP118EntitySite

建立文化與遺址的多對多關聯。同一遺址若有不同文化層，可建立多筆關聯，不必重複保存經緯度。

## 網站連線

`config.js` 必須使用：

```js
TIMELINE_RPC: "P118_GetTimelineSites"
```

瀏覽器只能使用 Supabase publishable/anon key，不可使用 `service_role` key。

## 安全範圍

SQL 不會刪除 V0.1 的 `TblP118HistoricalGeometry`，也不會刪除舊資料。所有建立、修改與授權均明確限定於 P118 物件。
