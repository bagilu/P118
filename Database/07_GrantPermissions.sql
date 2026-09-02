-- P118 / 07: 僅授予讀取公開地圖所需權限

grant usage on schema public to anon, authenticated;
grant select on public."TblP118HistoricalEntity" to anon, authenticated;
grant select on public."TblP118HistoricalGeometry" to anon, authenticated;
grant select on public."VwP118TimelineStops" to anon, authenticated;
grant execute on function public."P118_GetTimelineFeatures"() to anon, authenticated;
