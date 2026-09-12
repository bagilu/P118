-- P118 / 10: 大坌坑文化、8處代表性遺址與遺址個別年代
-- 適用：已執行 01_CreateTables.sql 至 09_AddEvidenceAndSites.sql 的 P118。
--
-- 安全範圍：
--   1. 僅修改三個 TblP118... 資料表、VwP118TimelineStops 與 P118_GetTimelineSites()。
--   2. 不刪除任何資料，不修改其他專案物件、public schema 全域權限、RLS 或 Policy。
--   3. 可重複執行；相同 Slug 與文化—遺址關聯會更新，不會重複新增。
--
-- 年代原則：
--   * 資料庫以 BC/AD 整數為主；負數代表 BC，且不使用西元0年。
--   * 原始來源常以 BP 表示，本檔以 1950 為基準換算後取整十或整百年。
--   * 此換算是網站時間軸的近似呈現，不等同於未校正14C BP或校正年代 cal BP。

begin;

do $P118$
begin
  if to_regclass('public."TblP118HistoricalEntity"') is null then
    raise exception '找不到 P118 資料表 TblP118HistoricalEntity。';
  end if;
  if to_regclass('public."TblP118ArchaeologicalSite"') is null then
    raise exception '找不到 P118 資料表 TblP118ArchaeologicalSite。';
  end if;
  if to_regclass('public."TblP118EntitySite"') is null then
    raise exception '找不到 P118 資料表 TblP118EntitySite。';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'TblP118EntitySite'
      and column_name = 'EvidenceStatus'
  ) then
    raise exception 'P118 尚未完成 09_AddEvidenceAndSites.sql，請先執行09。';
  end if;
end
$P118$;

-- 每個文化—遺址關聯可以有自己的年代；NULL表示沿用文化整體年代。
alter table public."TblP118EntitySite"
  add column if not exists "SiteStartYear" integer,
  add column if not exists "SiteEndYear" integer;

do $P118$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'CkP118EntitySiteYearRange'
      and conrelid = 'public."TblP118EntitySite"'::regclass
  ) then
    alter table public."TblP118EntitySite"
      add constraint "CkP118EntitySiteYearRange"
      check (
        ("SiteStartYear" is null and "SiteEndYear" is null)
        or
        (
          "SiteStartYear" is not null
          and "SiteEndYear" is not null
          and "SiteStartYear" <> 0
          and "SiteEndYear" <> 0
          and "SiteStartYear" <= "SiteEndYear"
        )
      );
  end if;
end
$P118$;

insert into public."TblP118HistoricalEntity" (
  "Slug", "TitleZh", "TitleEn", "StartYear", "EndYear",
  "SummaryZh", "SummaryEn", "SourceCitation", "SourceURL",
  "DisplayColor", "IsPublished"
)
values (
  'dapenkeng-culture', '大坌坑文化', 'Dapenkeng Culture', -5000, -2200,
  '臺灣新石器時代早期的重要考古學文化，以粗繩紋陶、磨製石器及沿海或河口聚落為重要特徵。各地遺址年代並不完全相同；本文化整體年代採較寬的展示範圍，各遺址另依可用證據設定個別起訖年。',
  'An Early Neolithic archaeological culture of Taiwan, characterized especially by coarse cord-marked pottery, polished stone tools, and settlements near coasts or river mouths. Individual sites have their own date ranges.',
  '國立臺灣史前文化博物館「新石器時代」；杜美慧，2016，〈館藏臺灣西部大坌坑文化陶片刻劃紋研究〉。來源年代約距今6500至4200年；不同研究與遺址定年略有差異。',
  'https://archae.nmp.gov.tw/',
  '#B35C3E', true
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
  "CountyName", "TownshipName", "LocationAccuracy", "LocationNote",
  "SourceCitation", "SourceURL", "IsPublished"
)
values
  (
    'dapenkeng-site', '大坌坑考古遺址', 'Dapenkeng Archaeological Site',
    121.41488563927142, 25.151534000089846,
    '新北市', '八里區', 'exact',
    '新北市八里區楓櫃段、觀音山西北麓。座標取自文化部國家文化資產資料的遺址代表點，不表示公告邊界。',
    '文化部文化資產局「大坌坑考古遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=20060501000004&indexCode=BOCH_CountryCulture_21', true
  ),
  (
    'yuanshan-site', '圓山考古遺址', 'Yuanshan Archaeological Site',
    121.522500, 25.073100,
    '臺北市', '中山區', 'approximate',
    '臺北市中山區圓山小丘、玉門街與中山北路一帶。座標為遺址指定範圍附近的視覺代表點。',
    '國家文化資產網「圓山考古遺址」；中央研究院「圓山考古遺址漫遊」。',
    'https://nchdb.boch.gov.tw/', true
  ),
  (
    'zhishanyan-site', '芝山岩考古遺址', 'Zhishanyan Archaeological Site',
    121.532000, 25.101300,
    '臺北市', '士林區', 'approximate',
    '臺北市士林區芝山岩及其周邊低地。座標為芝山岩小丘的視覺代表點，不表示遺址邊界。',
    '臺北市政府公告及行政院公報「芝山岩考古遺址」。',
    'https://gazette.nat.gov.tw/', true
  ),
  (
    'bajia-site', '八甲考古遺址', 'Bajia Archaeological Site',
    120.298333, 22.980833,
    '臺南市', '歸仁區', 'approximate',
    '歸仁區八甲里、七甲里與關廟區下湖里交界，許縣溪河階。座標依公開位置敘述設定為概略代表點。',
    '臺南市政府開放資料「臺南市遺址資訊」；臺灣原住民族事典「八甲考古遺址」。',
    'https://data.tainan.gov.tw/Resource/62334041-0638-440d-a1e8-326c5aa85bc3', true
  ),
  (
    'nanguanli-site', '南關里遺址', 'Nanguanli Archaeological Site',
    120.276389, 23.116111,
    '臺南市', '善化區', 'exact',
    '南部科學園區內。座標依文化資產資料所列東經120度16分35秒、北緯23度6分58秒換算。',
    '文化部國家文化資產資料「南關里東及右先方遺址」之鄰近遺址核對說明。',
    'https://tcmb.culture.tw/zh-tw/detail?id=20091019000002&indexCode=BOCH_CountryCulture_21', true
  ),
  (
    'nanguanli-east-site', '南關里東遺址', 'Nanguanli East Archaeological Site',
    120.281111, 23.116666,
    '臺南市', '善化區', 'exact',
    '南科園區東北角、環東路東側。座標取自文化部國家文化資產資料的代表點。',
    '文化部文化資產局「南關里東及右先方遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=20091019000002&indexCode=BOCH_CountryCulture_21', true
  ),
  (
    'fengbitou-site', '鳳鼻頭（中坑門）考古遺址', 'Fengbitou (Chungkengmen) Archaeological Site',
    120.369150, 22.511367,
    '高雄市', '林園區', 'exact',
    '高雄市林園區中門里中坑門聚落北側、鳳山丘陵南端。座標取自文化部國家文化資產資料。',
    '文化部文化資產局「鳳鼻頭（中坑門）考古遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=20060501000005&indexCode=BOCH_CountryCulture_21', true
  ),
  (
    'guoye-a-site', '菓葉A遺址', 'Guoye A Archaeological Site',
    119.670000, 23.570000,
    '澎湖縣', '湖西鄉', 'approximate',
    '澎湖本島菓葉聚落附近沙丘。公開資料未提供可直接核對的精確座標，本點僅為區域性代表位置。',
    '中央研究院考古資料數位典藏創新計畫「菓葉A遺址」；澎湖知識服務平台「菓葉A遺址」。',
    'https://archeodata.sinica.edu.tw/', true
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

with links (
  "SiteSlug", "SiteStartYear", "SiteEndYear", "EvidenceStatus",
  "EvidenceNote", "EvidenceSourceCitation", "EvidenceSourceURL",
  "IsPrimary", "SortOrder"
) as (
  values
    ('dapenkeng-site', -5000, -2700, 'confirmed',
      '大坌坑文化的命名遺址；下層粗繩紋陶與磨製石器等遺留，是建立此考古學文化的重要依據。年代採官方所述距今約7000至4700年的近似換算。',
      '文化部文化資產局「大坌坑考古遺址」。',
      'https://tcmb.culture.tw/zh-tw/detail?id=20060501000004&indexCode=BOCH_CountryCulture_21', true, 1),
    ('yuanshan-site', -4350, -2550, 'confirmed',
      '圓山遺址具有大坌坑文化層；其文化堆積為多時期層序之一。年代依公開資料約距今6300至4500年近似換算。',
      '國家文化資產網「圓山考古遺址」；臺灣史前文化雲「圓山考古遺址」。',
      'https://icloud.nmp.gov.tw/', false, 2),
    ('zhishanyan-site', -4050, -3050, 'confirmed',
      '公告資料明列芝山岩史前地層下部包含大坌坑文化層。年代依公開資料約距今6000至5000年近似換算。',
      '行政院公報，2025，公告指定「芝山岩考古遺址」。',
      'https://gazette.nat.gov.tw/', false, 3),
    ('bajia-site', -4050, -3050, 'confirmed',
      '遺址出土大坌坑式繩紋陶、陶紡輪、石器、骨尖器與貝塚，為南部大坌坑文化八甲類型代表性遺址。',
      '臺南市政府「臺南市遺址資訊」；臺灣原住民族事典「八甲考古遺址」。',
      'https://data.tainan.gov.tw/Resource/62334041-0638-440d-a1e8-326c5aa85bc3', false, 4),
    ('nanguanli-site', -2850, -2250, 'confirmed',
      '南科最早期聚落之一，考古資料將其歸入大坌坑文化菓葉類型，年代約4800至4200 BP。',
      '中央研究院「研之有物：背後中箭、大啖貝類，史前南科住了誰？」；文化部國家文化資產資料。',
      'https://research.sinica.edu.tw/southern-taiwan-science-park-archaeology-li-kuang-ti', false, 5),
    ('nanguanli-east-site', -2850, -2250, 'confirmed',
      '文化資產資料明列其文化類型為大坌坑文化菓葉類型，年代約4800至4200 BP，並有陶器、石器、貝器、骨角器與植物遺留。',
      '文化部文化資產局「南關里東及右先方遺址」。',
      'https://tcmb.culture.tw/zh-tw/detail?id=20091019000002&indexCode=BOCH_CountryCulture_21', false, 6),
    ('fengbitou-site', -4050, -2350, 'confirmed',
      '考古發掘確認遺址包含大坌坑文化層；本關聯年代採約6000至4300 BP的寬幅近似值，以容納公開資料差異。',
      '文化部文化資產局「鳳鼻頭（中坑門）考古遺址」；臺灣史前文化雲「鳳鼻頭遺址」。',
      'https://tcmb.culture.tw/zh-tw/detail?id=20060501000005&indexCode=BOCH_CountryCulture_21', false, 7),
    ('guoye-a-site', -2850, -2650, 'confirmed',
      '菓葉A僅見大坌坑文化層，是菓葉類型代表性遺址；公開資料所列年代約4800至4600 BP。',
      '中央研究院考古資料數位典藏創新計畫「菓葉A遺址」。',
      'https://archeodata.sinica.edu.tw/', false, 8)
), resolved as (
  select
    e."EntityID", s."SiteID", l."SiteStartYear", l."SiteEndYear",
    l."EvidenceStatus", l."EvidenceNote", l."EvidenceSourceCitation",
    l."EvidenceSourceURL", l."IsPrimary", l."SortOrder"
  from links l
  join public."TblP118HistoricalEntity" e on e."Slug" = 'dapenkeng-culture'
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

-- RPC傳回遺址個別年代；既有關聯若未設定，仍沿用文化整體年代。
-- RETURNS TABLE欄位與舊版完全相同，因此前端不需要修改。
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
    coalesce(es."SiteStartYear", e."StartYear")::integer,
    coalesce(es."SiteEndYear", e."EndYear")::integer,
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
  order by
    coalesce(es."SiteStartYear", e."StartYear"),
    e."EntityID", es."SortOrder", s."SiteID";
$$;

-- 保持P118檢視與RPC採用相同的停止點規則。
create or replace view public."VwP118TimelineStops"
with (security_invoker = true)
as
select coalesce(es."SiteStartYear", e."StartYear")::integer as "Year"
from public."TblP118HistoricalEntity" e
join public."TblP118EntitySite" es on es."EntityID" = e."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."IsPublished" = true
  and s."IsPublished" = true
union
select coalesce(es."SiteEndYear", e."EndYear")::integer as "Year"
from public."TblP118HistoricalEntity" e
join public."TblP118EntitySite" es on es."EntityID" = e."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."IsPublished" = true
  and s."IsPublished" = true;

-- 重申既有P118物件的讀取權限；不修改schema或其他專案權限。
grant select on public."VwP118TimelineStops" to anon, authenticated;
grant execute on function public."P118_GetTimelineSites"() to anon, authenticated;

commit;

-- 執行後檢查：大坌坑文化應有8處關聯。
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
where e."Slug" = 'dapenkeng-culture'
group by e."EntityID", e."TitleZh", e."StartYear", e."EndYear";

-- 明細檢查：確認每個點位及個別年代。
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
where e."Slug" = 'dapenkeng-culture'
order by es."SortOrder", s."SiteID";
