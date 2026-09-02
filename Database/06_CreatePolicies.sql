-- P118 / 06: 匿名與已登入訪客只能讀取公開資料

drop policy if exists "P118_PublicReadPublishedEntities"
  on public."TblP118HistoricalEntity";
create policy "P118_PublicReadPublishedEntities"
  on public."TblP118HistoricalEntity"
  for select
  to anon, authenticated
  using ("IsPublished" = true);

drop policy if exists "P118_PublicReadPublishedGeometries"
  on public."TblP118HistoricalGeometry";
create policy "P118_PublicReadPublishedGeometries"
  on public."TblP118HistoricalGeometry"
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public."TblP118HistoricalEntity" e
      where e."EntityID" = "TblP118HistoricalGeometry"."EntityID"
        and e."IsPublished" = true
    )
  );
