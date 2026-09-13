-- P118 / 12: 圓山文化與第一批6處考古遺址關聯
--
-- 安全範圍：
--   1. 僅新增或更新 P118 的 TblP118HistoricalEntity、
--      TblP118ArchaeologicalSite、TblP118EntitySite 指定資料。
--   2. 不建立、刪除或變更 schema、RLS、Policy、RPC 或全域權限。
--   3. 不刪除任何資料，不操作其他專案物件。
--   4. 可重複執行；相同 Slug 或文化—遺址關聯只會更新。
--
-- 年代原則：
--   * 資料庫只存 BC／AD 整數年；BP 僅寫在說明文字中供核對。
--   * 文化總年代採約 3300–1800 BP，換算為 BC 1350–AD 150。
--   * 有較明確年代的文化層設定 SiteStartYear／SiteEndYear。
--   * 公開來源未提供可靠起訖年的遺址，個別年代保留 NULL，
--     網站會沿用文化總年代，不虛構精確區間。

begin;

do $P118$
begin
  if to_regclass('public."TblP118HistoricalEntity"') is null then
    raise exception '找不到 P118 資料表 TblP118HistoricalEntity。請先完成 01–10。';
  end if;
  if to_regclass('public."TblP118ArchaeologicalSite"') is null then
    raise exception '找不到 P118 資料表 TblP118ArchaeologicalSite。請先完成 01–10。';
  end if;
  if to_regclass('public."TblP118EntitySite"') is null then
    raise exception '找不到 P118 資料表 TblP118EntitySite。請先完成 01–10。';
  end if;
end
$P118$;

insert into public."TblP118HistoricalEntity" (
  "Slug", "TitleZh", "TitleEn", "StartYear", "EndYear",
  "SummaryZh", "SummaryEn", "SourceCitation", "SourceURL",
  "DisplayColor", "IsPublished"
)
values (
  'yuanshan-culture', '圓山文化', 'Yuanshan Culture', -1350, 150,
  '臺灣北部新石器時代晚期的重要考古學文化，以圓山考古遺址為命名遺址。遺留主要分布於臺北盆地及淡水河系周邊；圓山遺址可見貝塚、陶器、磨製石器、骨角器、玉器、墓葬及柱洞等。學界對文化年代、分期與範圍仍有不同意見，本系統採約3300至1800 BP的寬幅展示範圍，各遺址另依可用證據設定年代。',
  'A Late Neolithic archaeological culture of northern Taiwan, named after the Yuanshan archaeological site. Its chronology and internal phases remain under scholarly discussion; individual site layers use separate dates where evidence permits.',
  '郭素秋，2014，〈臺灣北部圓山文化的內涵探討〉；文化部文化資產局「圓山考古遺址」及相關考古遺址資料。',
  'https://www.airitilibrary.com/Article/Detail/18151701-201412-201508180008-201508180008-69-152',
  '#8C5A7B', true
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

-- 前3處遺址已由 10_AddDapenkengCulture.sql 建立：
-- yuanshan-site、zhishanyan-site、dapenkeng-site。
-- 本檔只新增其餘3處，避免不必要地覆寫既有遺址資料。
insert into public."TblP118ArchaeologicalSite" (
  "Slug", "SiteNameZh", "SiteNameEn", "Longitude", "Latitude",
  "CountyName", "TownshipName", "LocationAccuracy", "LocationNote",
  "SourceCitation", "SourceURL", "IsPublished"
)
values
  (
    'tudigongshan-site', '土地公山考古遺址', 'Tudigongshan Archaeological Site',
    121.433220, 24.967340,
    '新北市', '土城區', 'exact',
    '新北市土城區大安里一帶。座標取自文化部國家文化記憶庫所列代表點，不表示完整公告範圍。',
    '文化部國家文化記憶庫「土地公山考古遺址」；文化部考古遺址主題頁。',
    'https://tcmb.culture.tw/', true
  ),
  (
    'zhanlongshan-site', '斬龍山考古遺址', 'Zhanlongshan Archaeological Site',
    121.451020, 24.977350,
    '新北市', '土城區', 'approximate',
    '新北市土城區金城路二段、斬龍山遺址文化公園一帶。座標為公開公園位置的視覺代表點，不表示考古遺址界址。',
    '新北市政府文化局「斬龍山遺址文化公園」；交通部觀光資料。',
    'https://www.culture.ntpc.gov.tw/', true
  ),
  (
    'dayuan-jianshan-site', '大園尖山考古遺址', 'Dayuan Jianshan Archaeological Site',
    121.194444, 25.061389,
    '桃園市', '大園區', 'exact',
    '桃園市大園國小及其鄰近地區。座標由公開資料所列東經121度11分40秒、北緯25度03分41秒換算。',
    '國立臺灣史前文化博物館「大園尖山遺址」；文化部國家文化資產網。',
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

-- 若01–10未完整執行，立即中止並回復本次交易。
do $P118$
declare
  missing_sites text;
begin
  select string_agg(v."SiteSlug", ', ' order by v."SiteSlug")
  into missing_sites
  from (values
    ('yuanshan-site'),
    ('zhishanyan-site'),
    ('dapenkeng-site'),
    ('tudigongshan-site'),
    ('zhanlongshan-site'),
    ('dayuan-jianshan-site')
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
    ('yuanshan-site', -1250, -550, 'confirmed',
      '圓山文化命名遺址。官方資料常用約3200至2500 BP描述其主要圓山文化層，近似換算為BC1250至BC550；少數早期測年較早，故文化整體範圍另採寬幅呈現。',
      '文化部文化資產局「圓山考古遺址」；中央研究院「圓山考古遺址漫遊」。',
      'https://nhsrc.boch.gov.tw/', true, 1),
    ('zhishanyan-site', null, null, 'confirmed',
      '公告資料明列芝山岩考古遺址包含圓山文化層。公開資料未提供足以獨立界定此文化層的可靠起訖年，因此沿用圓山文化總年代。',
      '行政院公報，2025，公告指定「芝山岩考古遺址」；文化部國家文化資產網。',
      'https://gazette.nat.gov.tw/', false, 2),
    ('dapenkeng-site', null, null, 'confirmed',
      '大坌坑考古遺址為多文化層遺址，公開考古資料明列包含圓山文化層；因未採用可核對的單一文化層起訖年，沿用文化總年代。',
      '文化部文化資產局「大坌坑考古遺址」；臺灣史前文化相關考古資料。',
      'https://nchdb.boch.gov.tw/', false, 3),
    ('tudigongshan-site', -850, -350, 'confirmed',
      '土地公山考古遺址是圓山文化晚期「土地公山類型」的代表遺址；年代約2800至2300 BP，近似換算為BC850至BC350。',
      '文化部國家文化記憶庫「土地公山考古遺址」；文化部考古遺址主題頁。',
      'https://tcmb.culture.tw/', false, 4),
    ('zhanlongshan-site', -850, -350, 'confirmed',
      '斬龍山考古遺址屬圓山文化土地公山類型。新北市政府資料所列年代約2800至2300 BP，近似換算為BC850至BC350。',
      '新北市政府文化局「斬龍山遺址文化公園」。',
      'https://www.culture.ntpc.gov.tw/', false, 5),
    ('dayuan-jianshan-site', null, null, 'confirmed',
      '大園尖山考古遺址具有圓山文化晚期遺留，且可能延續至植物園文化階段。史前文化雲指出目前無絕對年代資料，故不虛構起訖年並沿用文化總年代。',
      '國立臺灣史前文化博物館「大園尖山遺址」；文化部國家文化資產網。',
      'https://icloud.nmp.gov.tw/', false, 6)
), resolved as (
  select
    e."EntityID", s."SiteID", l."SiteStartYear", l."SiteEndYear",
    l."EvidenceStatus", l."EvidenceNote", l."EvidenceSourceCitation",
    l."EvidenceSourceURL", l."IsPrimary", l."SortOrder"
  from links l
  join public."TblP118HistoricalEntity" e on e."Slug" = 'yuanshan-culture'
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

-- 執行後檢查：應顯示圓山文化6處關聯。
select
  e."TitleZh" as "文化",
  e."StartYear" as "文化起年",
  e."EndYear" as "文化迄年",
  count(*) as "遺址數",
  count(*) filter (where s."LocationAccuracy" = 'exact') as "明確位置數",
  count(*) filter (where s."LocationAccuracy" = 'approximate') as "概略位置數"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" = 'yuanshan-culture'
group by e."EntityID", e."TitleZh", e."StartYear", e."EndYear";

-- 明細檢查：NULL個別年代表示沿用文化總年代，而不是「年代不重要」。
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
where e."Slug" = 'yuanshan-culture'
order by es."SortOrder", s."SiteID";
