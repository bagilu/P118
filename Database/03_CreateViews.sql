-- P118 / 03: 年代拉桿停止點

create or replace view public."VwP118TimelineStops"
with (security_invoker = true)
as
select "StartYear" as "Year"
from public."TblP118HistoricalEntity"
where "IsPublished" = true
union
select "EndYear" as "Year"
from public."TblP118HistoricalEntity"
where "IsPublished" = true;
