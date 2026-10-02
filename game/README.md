# P118 紅白對抗 V0.1 Game Preview

本資料夾是P118的獨立附加遊戲，不取代探索模式。

## 隔離原則

- 不修改根目錄 `index.html`、`app.js`、`styles.css`。
- 唯讀呼叫既有 `P118_GetTimelineSites()`。
- 不新增或修改資料表、RPC、View、RLS、Policy。
- 不儲存玩家答案或分數；重新整理即清除。
- 所有CSS與JavaScript使用 `p118-game`／`P118Game`命名空間。

## 測試網址

將本資料夾放入P118根目錄後，開啟：

`/P118/game/`

遊戲會優先讀取現有Supabase公開資料；若未設定 `config.js`，則使用八題內建展示資料。

正式回合共六題且不重複；若平手，使用另外兩題進行紅白各一題的延長賽。
