-- P118 / 03: 有公開遺址之文化年代停止點

create or replace view public."VwP118TimelineStops"
with (security_invoker = true)
as
select e."StartYear" as "Year"
from public."TblP118HistoricalEntity" e
where e."IsPublished" = true
  and exists (
    select 1
    from public."TblP118EntitySite" es
    join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
    where es."EntityID" = e."EntityID"
      and s."IsPublished" = true
  )
union
select e."EndYear" as "Year"
from public."TblP118HistoricalEntity" e
where e."IsPublished" = true
  and exists (
    select 1
    from public."TblP118EntitySite" es
    join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
    where es."EntityID" = e."EntityID"
      and s."IsPublished" = true
  );
