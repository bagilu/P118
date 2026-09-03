-- P118 / 06: 匿名與已登入訪客只能讀取公開文化及公開遺址

drop policy if exists "P118_PublicReadPublishedEntities"
  on public."TblP118HistoricalEntity";
create policy "P118_PublicReadPublishedEntities"
  on public."TblP118HistoricalEntity"
  for select
  to anon, authenticated
  using ("IsPublished" = true);

drop policy if exists "P118_PublicReadPublishedSites"
  on public."TblP118ArchaeologicalSite";
create policy "P118_PublicReadPublishedSites"
  on public."TblP118ArchaeologicalSite"
  for select
  to anon, authenticated
  using ("IsPublished" = true);

drop policy if exists "P118_PublicReadPublishedEntitySites"
  on public."TblP118EntitySite";
create policy "P118_PublicReadPublishedEntitySites"
  on public."TblP118EntitySite"
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public."TblP118HistoricalEntity" e
      where e."EntityID" = "TblP118EntitySite"."EntityID"
        and e."IsPublished" = true
    )
    and exists (
      select 1
      from public."TblP118ArchaeologicalSite" s
      where s."SiteID" = "TblP118EntitySite"."SiteID"
        and s."IsPublished" = true
    )
  );
