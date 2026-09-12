-- P118 / 04: 前端取得文化與遺址點位的 RPC（V0.2）
-- V0.1 的 P118_GetTimelineFeatures() 保留不動，供必要時回復舊版。

create or replace function public."P118_GetTimelineSites"()
returns table (
  "EntitySiteID" bigint,
  "EntityID" bigint,
  "SiteID" bigint,
  "CultureSlug" text,
  "TitleZh" text,
  "TitleEn" text,
  "StartYear" integer,
  "EndYear" integer,
  "SummaryZh" text,
  "CultureSourceCitation" text,
  "CultureSourceURL" text,
  "DisplayColor" text,
  "SiteSlug" text,
  "SiteNameZh" text,
  "SiteNameEn" text,
  "Longitude" double precision,
  "Latitude" double precision,
  "LocationNote" text,
  "SiteSourceCitation" text,
  "SiteSourceURL" text,
  "EvidenceNote" text,
  "IsPrimary" boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    es."EntitySiteID",
    e."EntityID",
    s."SiteID",
    e."Slug",
    e."TitleZh",
    e."TitleEn",
    e."StartYear",
    e."EndYear",
    e."SummaryZh",
    e."SourceCitation",
    e."SourceURL",
    e."DisplayColor",
    s."Slug",
    s."SiteNameZh",
    s."SiteNameEn",
    s."Longitude",
    s."Latitude",
    s."LocationNote",
    s."SourceCitation",
    s."SourceURL",
    es."EvidenceNote",
    es."IsPrimary"
  from public."TblP118HistoricalEntity" e
  join public."TblP118EntitySite" es on es."EntityID" = e."EntityID"
  join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
  where e."IsPublished" = true
    and s."IsPublished" = true
  order by e."StartYear", e."EntityID", es."SortOrder", s."SiteID";
$$;
