-- P118 / 08: 系統功能測試資料
-- 重要：此多邊形是介面測試用草圖，不是經同行審查的文化分布範圍。

with inserted_entity as (
  insert into public."TblP118HistoricalEntity" (
    "Slug", "TitleZh", "TitleEn", "StartYear", "EndYear",
    "SummaryZh", "SourceCitation", "DisplayColor", "IsPublished"
  )
  values (
    'tapenkeng-demo',
    '大坌坑文化（示意圖層）',
    'Tapenkeng Culture (demonstration layer)',
    -5000,
    -2700,
    '本筆資料僅用於測試年代節點、空間圖層、文字說明與輸出功能；文化範圍尚待研究資料校訂。',
    'P118 V0.1 system demonstration data; not for scholarly citation.',
    '#D06A42',
    true
  )
  on conflict ("Slug") do update set
    "TitleZh" = excluded."TitleZh",
    "TitleEn" = excluded."TitleEn",
    "StartYear" = excluded."StartYear",
    "EndYear" = excluded."EndYear",
    "SummaryZh" = excluded."SummaryZh",
    "SourceCitation" = excluded."SourceCitation",
    "DisplayColor" = excluded."DisplayColor",
    "IsPublished" = excluded."IsPublished",
    "UpdatedAt" = now()
  returning "EntityID"
)
insert into public."TblP118HistoricalGeometry" (
  "EntityID", "Geometry", "LabelPoint", "GeometryNote"
)
select
  "EntityID",
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((120.02 25.25,120.68 25.35,121.12 24.98,121.18 24.42,120.82 23.98,120.34 24.12,119.98 24.63,120.02 25.25)))',
    4326
  ),
  extensions.st_setsrid(extensions.st_makepoint(120.45, 24.72), 4326),
  '介面測試用概略多邊形；不得作為研究上的文化分布界線。'
from inserted_entity
where not exists (
  select 1
  from public."TblP118HistoricalGeometry" g
  where g."EntityID" = inserted_entity."EntityID"
);
