-- P118 / 04: 前端取得文化圖徵的 RPC

create or replace function public."P118_GetTimelineFeatures"()
returns table (
  "EntityID" bigint,
  "GeometryID" bigint,
  "Slug" text,
  "TitleZh" text,
  "TitleEn" text,
  "StartYear" integer,
  "EndYear" integer,
  "SummaryZh" text,
  "SourceCitation" text,
  "SourceURL" text,
  "DisplayColor" text,
  "GeometryGeoJSON" jsonb,
  "LabelLongitude" double precision,
  "LabelLatitude" double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e."EntityID",
    g."GeometryID",
    e."Slug",
    e."TitleZh",
    e."TitleEn",
    e."StartYear",
    e."EndYear",
    e."SummaryZh",
    e."SourceCitation",
    e."SourceURL",
    e."DisplayColor",
    extensions.st_asgeojson(g."Geometry")::jsonb,
    case when g."LabelPoint" is null then null else extensions.st_x(g."LabelPoint") end,
    case when g."LabelPoint" is null then null else extensions.st_y(g."LabelPoint") end
  from public."TblP118HistoricalEntity" e
  join public."TblP118HistoricalGeometry" g
    on g."EntityID" = e."EntityID"
  where e."IsPublished" = true
  order by e."StartYear", e."EntityID", g."SortOrder", g."GeometryID";
$$;
