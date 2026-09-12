-- P118 / 02: 查詢索引（V0.2 遺址點位版）

create index if not exists "IxP118EntityPublishedYears"
  on public."TblP118HistoricalEntity" ("IsPublished", "StartYear", "EndYear");

create index if not exists "IxP118SitePublished"
  on public."TblP118ArchaeologicalSite" ("IsPublished", "SiteID");

create index if not exists "IxP118EntitySiteEntity"
  on public."TblP118EntitySite" ("EntityID", "SortOrder", "SiteID");

create index if not exists "IxP118EntitySiteSite"
  on public."TblP118EntitySite" ("SiteID", "EntityID");
