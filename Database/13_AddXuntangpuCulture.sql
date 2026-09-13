-- P118 / 13: 訊塘埔文化與第一批8處考古遺址關聯
--
-- 安全範圍：
--   1. 僅新增或更新 P118 的 TblP118HistoricalEntity、
--      TblP118ArchaeologicalSite、TblP118EntitySite 指定資料。
--   2. 不建立、刪除或變更 schema、資料表、RLS、Policy、RPC 或全域權限。
--   3. 不刪除任何資料，不操作其他專案物件。
--   4. 可重複執行；相同 Slug 或文化—遺址關聯只會更新。
--
-- 年代原則：
--   * 資料庫只存 BC／AD 整數年；負數代表 BC，不使用西元0年。
--   * BP 以 1950 年為基準近似換算，僅供網站時間軸呈現。
--   * 學術資料對訊塘埔文化年代界定不完全一致：常見約 4800–3500 BP，
--     大竹圍文化層資料可延伸至約 3200 BP。本檔採寬幅 BC 2850–BC 1250。
--   * 個別遺址若欠缺可核對的起訖年，保留 NULL 並沿用文化總年代。

begin;

do $P118$
begin
  if to_regclass('public."TblP118HistoricalEntity"') is null then
    raise exception '找不到 P118 資料表 TblP118HistoricalEntity。請先完成 01–12。';
  end if;
  if to_regclass('public."TblP118ArchaeologicalSite"') is null then
    raise exception '找不到 P118 資料表 TblP118ArchaeologicalSite。請先完成 01–12。';
  end if;
  if to_regclass('public."TblP118EntitySite"') is null then
    raise exception '找不到 P118 資料表 TblP118EntitySite。請先完成 01–12。';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'TblP118EntitySite'
      and column_name = 'SiteStartYear'
  ) then
    raise exception 'P118 尚未完成 10_AddDapenkengCulture.sql，缺少遺址個別年代欄位。';
  end if;
end
$P118$;

insert into public."TblP118HistoricalEntity" (
  "Slug", "TitleZh", "TitleEn", "StartYear", "EndYear",
  "SummaryZh", "SummaryEn", "SourceCitation", "SourceURL",
  "DisplayColor", "IsPublished"
)
values (
  'xuntangpu-culture', '訊塘埔文化', 'Xuntangpu Culture', -2850, -1250,
  '臺灣北部新石器時代中期的重要考古學文化，主要分布於臺北盆地、淡水河口兩側、北海岸、東北海岸、宜蘭平原北部及桃竹地區。陶器承續大坌坑文化的繩紋傳統，並出現較細緻的繩紋、方格印紋與網印紋；石器種類亦較多。不同研究對年代與區域類型的界定略有差異，本系統採約4800至3200 BP的寬幅展示範圍，各遺址另依證據設定年代與關係狀態。',
  'A Middle Neolithic archaeological culture of northern Taiwan, distributed around the Taipei Basin, the Tamsui River estuary, northern and northeastern coasts, northern Yilan Plain, and the Taoyuan-Hsinchu area. Chronological and regional classifications vary among studies, so individual sites retain separate evidence notes and dates.',
  '郭素秋，〈臺灣北部訊塘埔文化的內涵探討〉；國立臺灣史前文化博物館「臺灣的史前時代：訊塘埔文化」；文化部考古遺址資料。',
  'https://icloud.nmp.gov.tw/Classroom/Prehistoric?a=75',
  '#C9823B', true
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

-- 圓山、芝山岩、大坌坑三處已由 10_AddDapenkengCulture.sql 建立。
-- 本段新增或更新另外五處；座標是地圖標示點，不表示遺址公告邊界。
insert into public."TblP118ArchaeologicalSite" (
  "Slug", "SiteNameZh", "SiteNameEn", "Longitude", "Latitude",
  "CountyName", "TownshipName", "LocationAccuracy", "LocationNote",
  "SourceCitation", "SourceURL", "IsPublished"
)
values
  (
    'xuntangpu-site', '訊塘埔考古遺址', 'Xuntangpu Archaeological Site',
    121.399500, 25.144000,
    '新北市', '八里區', 'approximate',
    '位於訊塘埔聚落南側，新台15線、105線與北49線交會處附近。公開文字資料未提供可直接核對的WGS84代表點，本座標僅供區域視覺定位。',
    '臺灣原住民族事典「訊塘埔考古遺址」；郭素秋〈臺灣北部訊塘埔文化的內涵探討〉。',
    'https://aborgpedia.alcd.center/detail?cat=0&id=2745&race=19', true
  ),
  (
    'dayuan-jianshan-site', '大園尖山考古遺址', 'Dayuan Jianshan Archaeological Site',
    121.202671, 25.059085,
    '桃園市', '大園區', 'exact',
    '遺址範圍包含大園國小校地與西側田地。座標取自文化部國家文化記憶庫的所在地代表點，不表示完整遺址範圍。',
    '文化部國家文化記憶庫「大園尖山遺址」；國立臺灣史前文化博物館「大園尖山考古遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=113612&indexCode=Culture_Place', true
  ),
  (
    'hongmaogang-site', '紅毛港考古遺址', 'Hongmaogang Archaeological Site',
    120.969722, 24.913889,
    '新竹縣', '新豐鄉', 'exact',
    '位於新豐溪出海口紅毛港北側的濱海沙丘。座標依公開調查資料所列東經120度58分11秒、北緯24度54分50秒換算。',
    '新竹市地方寶藏資料庫「紅毛港系統」；臺灣原住民族事典「紅毛港考古遺址」。',
    'https://aborgpedia.alcd.center/', true
  ),
  (
    'dazhuwei-site', '大竹圍考古遺址', 'Dazhuwei Archaeological Site',
    121.793228, 24.829000,
    '宜蘭縣', '礁溪鄉', 'exact',
    '位於礁溪鄉白雲村大竹圍聚落內外的古沙丘。座標依宜蘭縣公開考古資料所列北緯24度49分44.40秒、東經121度47分35.62秒換算。',
    '蘭陽博物館「大竹圍考古遺址」；宜蘭縣考古遺址資料。',
    'https://www.lym.gov.tw/ch/education/learning-source/yilan-prehistoric-sites/TSLymContentPage-000008/', true
  ),
  (
    'wanli-jiatou-site', '萬里加投考古遺址', 'Wanli Jiatou Archaeological Site',
    121.633611, 25.212778,
    '新北市', '萬里區', 'exact',
    '位於新北市萬里區沿海地帶。座標依臺灣史前文化雲所列東經121度38分1秒、北緯25度12分46秒換算。',
    '國立臺灣史前文化博物館「萬里加投遺址」；郭素秋〈臺灣北部訊塘埔文化的內涵探討〉。',
    'https://icloud.nmp.gov.tw/', true
  )
on conflict ("Slug") do update set
  "SiteNameZh" = excluded."SiteNameZh",
  "SiteNameEn" = excluded."SiteNameEn",
  "Longitude" = excluded."Longitude",
  "Latitude" = excluded."Latitude",
  "CountyName" = excluded."CountyName",
  "TownshipName" = excluded."TownshipName",
  "LocationAccuracy" = excluded."LocationAccuracy",
  "LocationNote" = excluded."LocationNote",
  "SourceCitation" = excluded."SourceCitation",
  "SourceURL" = excluded."SourceURL",
  "IsPublished" = excluded."IsPublished",
  "UpdatedAt" = now();

-- 確認八處遺址均已存在；若缺少先前檔案建立的遺址，整筆交易回復。
do $P118$
declare
  missing_sites text;
begin
  select string_agg(v."SiteSlug", ', ' order by v."SiteSlug")
  into missing_sites
  from (values
    ('xuntangpu-site'),
    ('dayuan-jianshan-site'),
    ('hongmaogang-site'),
    ('dazhuwei-site'),
    ('yuanshan-site'),
    ('zhishanyan-site'),
    ('dapenkeng-site'),
    ('wanli-jiatou-site')
  ) as v("SiteSlug")
  where not exists (
    select 1
    from public."TblP118ArchaeologicalSite" s
    where s."Slug" = v."SiteSlug"
  );

  if missing_sites is not null then
    raise exception '缺少必要的 P118 遺址：%。請先確認 10_AddDapenkengCulture.sql 已執行。', missing_sites;
  end if;
end
$P118$;

with links (
  "SiteSlug", "SiteStartYear", "SiteEndYear", "EvidenceStatus",
  "EvidenceNote", "EvidenceSourceCitation", "EvidenceSourceURL",
  "IsPrimary", "SortOrder"
) as (
  values
    ('xuntangpu-site', -2550, -1550, 'confirmed',
      '訊塘埔文化命名遺址。公開資料列遺址的訊塘埔文化年代約4500至3500 BP，近似換算為BC2550至BC1550。',
      '臺灣原住民族事典「訊塘埔考古遺址」；郭素秋〈臺灣北部訊塘埔文化的內涵探討〉。',
      'https://aborgpedia.alcd.center/detail?cat=0&id=2745&race=19', true, 1),
    ('dayuan-jianshan-site', null, null, 'confirmed',
      '國立臺灣史前文化博物館將大園尖山列為訊塘埔文化代表性遺址；文化資產資料稱其含零星新石器時代中期訊塘埔文化堆積。公開資料未提供該文化層的獨立起訖年，故沿用文化總年代。',
      '國立臺灣史前文化博物館「臺灣的史前時代：訊塘埔文化」；文化部國家文化記憶庫「大園尖山遺址」。',
      'https://icloud.nmp.gov.tw/Classroom/Prehistoric?a=75', false, 2),
    ('hongmaogang-site', -2550, -1550, 'mixed',
      '史前文化雲將紅毛港列為北部訊塘埔文化代表性遺址；部分研究則將桃竹苗沿海材料另稱紅毛港系統或紅毛港類型，且試掘資料僅見少量典型訊塘埔文化質地陶片。因此保留「分類混合」標記，不把兩者完全等同。年代約4500至3500 BP。',
      '國立臺灣史前文化博物館「臺灣的史前時代：訊塘埔文化」；新竹市地方寶藏資料庫「紅毛港系統」。',
      'https://icloud.nmp.gov.tw/Classroom/Prehistoric?a=75', false, 3),
    ('dazhuwei-site', -2250, -1250, 'confirmed',
      '大竹圍下層繩紋陶文化與訊塘埔文化關係密切。蘭陽博物館所列文化內涵年代約4200至3200 BP，近似換算為BC2250至BC1250。',
      '蘭陽博物館「大竹圍考古遺址」；劉益昌《宜蘭縣大竹圍遺址初步調查報告》。',
      'https://www.lym.gov.tw/ch/education/learning-source/yilan-prehistoric-sites/TSLymContentPage-000008/', false, 4),
    ('yuanshan-site', -2550, -1550, 'confirmed',
      '文化部考古遺址資料明列圓山遺址包含訊塘埔文化層，年代約4500至3500 BP，近似換算為BC2550至BC1550。',
      '文化部國家考古遺址出土遺物典藏系統「圓山考古遺址」。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20060501000002', false, 5),
    ('zhishanyan-site', -2550, -1550, 'confirmed',
      '芝山岩考古遺址公告資料明列其史前地層包含訊塘埔文化。年代採北部訊塘埔文化常見約4500至3500 BP的近似換算。',
      '文化部國家文化記憶庫「芝山岩考古遺址」；行政院公報指定公告。',
      'https://tcmb.culture.tw/zh-tw/detail?id=20250602000001&indexCode=BOCH_CountryCulture_21', false, 6),
    ('dapenkeng-site', -2850, -1550, 'confirmed',
      '大坌坑為多文化層遺址，官方資料明列少量訊塘埔文化遺物，年代約4800至3500 BP，近似換算為BC2850至BC1550。',
      '文化部國家考古遺址出土遺物典藏系統「大坌坑考古遺址」；行政院公報。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20060501000004', false, 7),
    ('wanli-jiatou-site', -2850, -1550, 'confirmed',
      '研究資料指出萬里加投遺址可見訊塘埔文化早、晚兩階段遺留；本檔以約4800至3500 BP作為寬幅近似年代。',
      '郭素秋〈臺灣北部訊塘埔文化的內涵探討〉；國立臺灣史前文化博物館「萬里加投遺址」。',
      'https://icloud.nmp.gov.tw/', false, 8)
), resolved as (
  select
    e."EntityID", s."SiteID", l."SiteStartYear", l."SiteEndYear",
    l."EvidenceStatus", l."EvidenceNote", l."EvidenceSourceCitation",
    l."EvidenceSourceURL", l."IsPrimary", l."SortOrder"
  from links l
  join public."TblP118HistoricalEntity" e on e."Slug" = 'xuntangpu-culture'
  join public."TblP118ArchaeologicalSite" s on s."Slug" = l."SiteSlug"
)
insert into public."TblP118EntitySite" (
  "EntityID", "SiteID", "SiteStartYear", "SiteEndYear",
  "EvidenceStatus", "EvidenceNote", "EvidenceSourceCitation",
  "EvidenceSourceURL", "IsPrimary", "SortOrder"
)
select
  "EntityID", "SiteID", "SiteStartYear", "SiteEndYear",
  "EvidenceStatus", "EvidenceNote", "EvidenceSourceCitation",
  "EvidenceSourceURL", "IsPrimary", "SortOrder"
from resolved
on conflict ("EntityID", "SiteID") do update set
  "SiteStartYear" = excluded."SiteStartYear",
  "SiteEndYear" = excluded."SiteEndYear",
  "EvidenceStatus" = excluded."EvidenceStatus",
  "EvidenceNote" = excluded."EvidenceNote",
  "EvidenceSourceCitation" = excluded."EvidenceSourceCitation",
  "EvidenceSourceURL" = excluded."EvidenceSourceURL",
  "IsPrimary" = excluded."IsPrimary",
  "SortOrder" = excluded."SortOrder",
  "UpdatedAt" = now();

commit;

-- 執行後檢查：應顯示訊塘埔文化8處關聯，其中紅毛港為 mixed。
select
  e."TitleZh" as "文化",
  e."StartYear" as "文化起年",
  e."EndYear" as "文化迄年",
  count(*) as "遺址數",
  count(*) filter (where es."EvidenceStatus" = 'confirmed') as "確認關係數",
  count(*) filter (where es."EvidenceStatus" = 'mixed') as "分類混合數",
  count(*) filter (where s."LocationAccuracy" = 'exact') as "明確位置數",
  count(*) filter (where s."LocationAccuracy" = 'approximate') as "概略位置數"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" = 'xuntangpu-culture'
group by e."EntityID", e."TitleZh", e."StartYear", e."EndYear";

select
  s."SiteNameZh" as "遺址",
  s."CountyName" as "縣市",
  s."TownshipName" as "鄉鎮市區",
  s."Longitude" as "經度",
  s."Latitude" as "緯度",
  s."LocationAccuracy" as "位置精度",
  es."SiteStartYear" as "遺址起年",
  es."SiteEndYear" as "遺址迄年",
  es."EvidenceStatus" as "證據狀態"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" = 'xuntangpu-culture'
order by es."SortOrder", s."SiteID";
