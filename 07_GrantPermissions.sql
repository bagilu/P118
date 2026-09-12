-- P118 / 07: 僅授予 P118 V0.2 物件的讀取權限
-- 不在本專案內變更 public schema 的整體權限。

grant select on public."TblP118HistoricalEntity" to anon, authenticated;
grant select on public."TblP118ArchaeologicalSite" to anon, authenticated;
grant select on public."TblP118EntitySite" to anon, authenticated;
grant select on public."VwP118TimelineStops" to anon, authenticated;
grant execute on function public."P118_GetTimelineSites"() to anon, authenticated;
