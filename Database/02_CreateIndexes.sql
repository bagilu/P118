-- P118 / 02: 查詢與空間索引

create index if not exists "IxP118EntityPublishedYears"
  on public."TblP118HistoricalEntity" ("IsPublished", "StartYear", "EndYear");

create index if not exists "IxP118GeometryEntity"
  on public."TblP118HistoricalGeometry" ("EntityID", "SortOrder");

create index if not exists "IxP118GeometrySpatial"
  on public."TblP118HistoricalGeometry"
  using gist ("Geometry");
