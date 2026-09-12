-- P118 / 08: 三個文化與四個遺址的展示資料（V0.2）
-- 年代全部使用 BC/AD 整數；負數為 BC，資料庫不儲存 BP 年代。
-- 遺址點是定位資料，不表示文化疆界或文化分布半徑。

begin;

insert into public."TblP118HistoricalEntity" (
  "Slug", "TitleZh", "TitleEn", "StartYear", "EndYear",
  "SummaryZh", "SummaryEn", "SourceCitation", "SourceURL",
  "DisplayColor", "IsPublished"
)
values
  (
    'changbin-culture', '長濱文化', 'Changbin Culture', -28050, -3050,
    '臺灣舊石器時代晚期的代表性文化。八仙洞與小馬洞穴等遺址出土礫石砍器、石片器、尖器及骨角器等遺物，反映採集、狩獵與漁撈等生業活動。',
    'A representative Late Paleolithic culture of Taiwan, known from sites including Baxian Caves and Xiaoma Cave.',
    '中央研究院「臺灣史前文化：八仙洞遺址」；P118 年代統一表示為 BC 28,050–BC 3,050。',
    'https://twstudy.iis.sinica.edu.tw/preHistory/site_7.html',
    '#8B5E3C', true
  ),
  (
    'niumatou-culture', '牛罵頭文化', 'Niumatou Culture', -2550, -1450,
    '臺灣中部新石器時代中期的代表性文化，以紅、褐色繩紋陶器為主要特徵，並見石斧、石錛、石刀、石鏃及網墜等遺物。相關遺址主要見於臺中盆地周緣、海岸階地及河階。',
    'A representative Middle Neolithic culture of central Taiwan, characterized especially by red and brown cord-marked pottery.',
    '臺中市文化資產處「牛罵頭遺址文化園區」；P118 年代統一表示為 BC 2,550–BC 1,450。',
    'https://www.tchac.taichung.gov.tw/attractioninfo?pid=19&uid=69',
    '#C56A32', true
  ),
  (
    'peinan-culture', '卑南文化', 'Peinan Culture', -1550, -350,
    '臺灣東部新石器時代晚期的重要文化。卑南遺址呈現大型聚落、石板棺墓葬，以及農耕、狩獵、玉石器製作與交換等活動。',
    'An important Late Neolithic culture of eastern Taiwan, represented prominently at the Peinan archaeological site.',
    '國家文化資產網「卑南考古遺址」；P118 年代統一表示為 BC 1,550–BC 350。',
    'https://nhsrc.boch.gov.tw/SiteDetail?id=20060501000006',
    '#5B6E9C', true
  )
on conflict ("Slug") do update set
  "TitleZh" = excluded."TitleZh",
  "TitleEn" = excluded."TitleEn",
  "StartYear" = excluded."StartYear",
  "EndYear" = excluded."EndYear",
  "SummaryZh" = excluded."SummaryZh",
  "SummaryEn" = excluded."SummaryEn",
  "SourceCitation" = excluded."SourceCitation",
  "SourceURL" = excluded."SourceURL",
  "DisplayColor" = excluded."DisplayColor",
  "IsPublished" = excluded."IsPublished",
  "UpdatedAt" = now();

insert into public."TblP118ArchaeologicalSite" (
  "Slug", "SiteNameZh", "SiteNameEn", "Longitude", "Latitude",
  "LocationNote", "SourceCitation", "SourceURL", "IsPublished"
)
values
  (
    'baxian-caves', '八仙洞考古遺址', 'Baxian Caves Archaeological Site',
    121.476676, 23.397167,
    '臺東縣長濱鄉。座標為遺址定位點；不表示遺址邊界。',
    '中央研究院「臺灣史前文化：八仙洞遺址」。',
    'https://twstudy.iis.sinica.edu.tw/preHistory/site_7.html', true
  ),
  (
    'xiaoma-cave', '小馬洞穴遺址', 'Xiaoma Cave Archaeological Site',
    121.305000, 22.975000,
    '臺東縣馬武窟溪口北側附近。此為展示用概略定位，正式研究版仍須以考古GIS資料校訂。',
    '國家文化記憶庫「小馬海蝕洞（小馬Ⅲ）遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=263314&indexCode=Culture_Object', true
  ),
  (
    'niumatou-site', '牛罵頭考古遺址', 'Niumatou Archaeological Site',
    120.580833, 24.268889,
    '臺中市清水區鰲峰山一帶。座標為遺址文化園區定位點；不表示遺址邊界。',
    '臺中市文化資產處「牛罵頭遺址文化園區」。',
    'https://www.tchac.taichung.gov.tw/attractioninfo?pid=19&uid=69', true
  ),
  (
    'peinan-site', '卑南考古遺址', 'Peinan Archaeological Site',
    121.113333, 22.794444,
    '臺東市卑南山東南側山麓。座標採卑南遺址研究資料所載中心位置。',
    '國立臺灣史前文化博物館「卑南遺址國際學術資料網：研究史」。',
    'https://peinansite.nmp.gov.tw/ResearchOverview', true
  )
on conflict ("Slug") do update set
  "SiteNameZh" = excluded."SiteNameZh",
  "SiteNameEn" = excluded."SiteNameEn",
  "Longitude" = excluded."Longitude",
  "Latitude" = excluded."Latitude",
  "LocationNote" = excluded."LocationNote",
  "SourceCitation" = excluded."SourceCitation",
  "SourceURL" = excluded."SourceURL",
  "IsPublished" = excluded."IsPublished",
  "UpdatedAt" = now();

with links (
  "CultureSlug", "SiteSlug", "EvidenceNote", "IsPrimary", "SortOrder"
) as (
  values
    ('changbin-culture', 'baxian-caves', '長濱文化的代表性與命名相關遺址。', true, 1),
    ('changbin-culture', 'xiaoma-cave', '先陶文化層出土與長濱文化相關的石片器與砍器。', false, 2),
    ('niumatou-culture', 'niumatou-site', '牛罵頭文化的命名遺址。', true, 1),
    ('peinan-culture', 'peinan-site', '卑南文化的重要代表性遺址。', true, 1)
), resolved as (
  select e."EntityID", s."SiteID", l."EvidenceNote", l."IsPrimary", l."SortOrder"
  from links l
  join public."TblP118HistoricalEntity" e on e."Slug" = l."CultureSlug"
  join public."TblP118ArchaeologicalSite" s on s."Slug" = l."SiteSlug"
)
insert into public."TblP118EntitySite" (
  "EntityID", "SiteID", "EvidenceNote", "IsPrimary", "SortOrder"
)
select "EntityID", "SiteID", "EvidenceNote", "IsPrimary", "SortOrder"
from resolved
on conflict ("EntityID", "SiteID") do update set
  "EvidenceNote" = excluded."EvidenceNote",
  "IsPrimary" = excluded."IsPrimary",
  "SortOrder" = excluded."SortOrder",
  "UpdatedAt" = now();

commit;

-- 執行後檢查：應看到三個文化、四個遺址關聯。
select
  e."TitleZh",
  s."SiteNameZh",
  s."Longitude",
  s."Latitude"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" in ('changbin-culture', 'niumatou-culture', 'peinan-culture')
order by e."StartYear", es."SortOrder";
