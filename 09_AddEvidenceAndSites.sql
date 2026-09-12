-- P118 / 09: 遺址位置品質、文化關係證據與第一批遺址資料
-- 適用：P118 Ancestors Map V0.2（遺址點位版）
--
-- 安全範圍：
--   1. 僅變更 public."TblP118ArchaeologicalSite" 與 public."TblP118EntitySite"。
--   2. 僅新增或更新本檔明列之 P118 Slug 與文化—遺址關聯。
--   3. 不刪除任何資料，不變更其他專案物件、public schema 全域權限、RLS、Policy 或 RPC。
--   4. 可重複執行。
--
-- 座標原則：
--   exact       = 有公開地址、公告範圍或明確座標可核對的代表點。
--   approximate = 依公開位置敘述設定的概略代表點，供歷史地圖視覺化，不作導航或界址使用。

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
end
$P118$;

alter table public."TblP118ArchaeologicalSite"
  add column if not exists "CountyName" text,
  add column if not exists "TownshipName" text,
  add column if not exists "LocationAccuracy" text not null default 'approximate';

alter table public."TblP118EntitySite"
  add column if not exists "EvidenceStatus" text not null default 'reported',
  add column if not exists "EvidenceSourceCitation" text,
  add column if not exists "EvidenceSourceURL" text;

do $P118$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'CkP118SiteLocationAccuracy'
      and conrelid = 'public."TblP118ArchaeologicalSite"'::regclass
  ) then
    alter table public."TblP118ArchaeologicalSite"
      add constraint "CkP118SiteLocationAccuracy"
      check ("LocationAccuracy" in ('exact', 'approximate'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'CkP118EntitySiteEvidenceStatus'
      and conrelid = 'public."TblP118EntitySite"'::regclass
  ) then
    alter table public."TblP118EntitySite"
      add constraint "CkP118EntitySiteEvidenceStatus"
      check ("EvidenceStatus" in ('confirmed', 'reported', 'similar', 'mixed', 'disputed'));
  end if;
end
$P118$;

insert into public."TblP118ArchaeologicalSite" (
  "Slug", "SiteNameZh", "SiteNameEn", "Longitude", "Latitude",
  "CountyName", "TownshipName", "LocationAccuracy", "LocationNote",
  "SourceCitation", "SourceURL", "IsPublished"
)
values
  -- 長濱文化：2處
  (
    'baxian-caves', '八仙洞考古遺址', 'Baxian Caves Archaeological Site',
    121.476676, 23.397167, '臺東縣', '長濱鄉', 'exact',
    '臺東縣長濱鄉樟原村八仙洞。座標為公開遺址景區的代表點，不表示遺址邊界。',
    '中央研究院「臺灣史前文化：八仙洞遺址」。',
    'https://twstudy.iis.sinica.edu.tw/preHistory/site_7.html', true
  ),
  (
    'xiaoma-cave', '小馬洞穴遺址', 'Xiaoma Cave Archaeological Site',
    121.305000, 22.975000, '臺東縣', '成功鎮', 'approximate',
    '臺東縣成功鎮小馬、馬武窟溪口北側附近。概略代表點，供地圖視覺標示。',
    '國家文化記憶庫「小馬海蝕洞（小馬III）遺址」。',
    'https://tcmb.culture.tw/zh-tw/detail?id=263314&indexCode=Culture_Object', true
  ),

  -- 牛罵頭文化：9處
  (
    'niumatou-site', '牛罵頭考古遺址', 'Niumatou Archaeological Site',
    120.580833, 24.268889, '臺中市', '清水區', 'exact',
    '臺中市清水區鰲峰山牛罵頭遺址文化園區。座標為園區代表點。',
    '國家考古遺址出土遺物典藏系統「牛罵頭考古遺址」。',
    'https://nhsrc.boch.gov.tw/SiteDetail?id=20110506000003', true
  ),
  (
    'anhe-site', '安和考古遺址', 'Anhe Archaeological Site',
    120.616500, 24.176500, '臺中市', '西屯區', 'approximate',
    '臺灣大道四段以南、安和路以西一帶；以公告範圍附近設定概略代表點。',
    '國家考古遺址出土遺物典藏系統「安和考古遺址」。',
    'https://nhsrc.boch.gov.tw/SiteDetail?id=20161220000002', true
  ),
  (
    'huilai-site', '惠來遺址', 'Huilai Archaeological Site',
    120.645300, 24.161200, '臺中市', '西屯區', 'approximate',
    '臺中市七期重劃區惠來路、市政路附近；遺址範圍較廣，本點僅供視覺定位。',
    '劉克竑〈牛罵頭文化的陶容器：大肚山與八卦山附近遺址的一些綜整與觀察〉。',
    'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', true
  ),
  (
    'dunziding-site', '墩仔頂遺址', 'Dunziding Archaeological Site',
    120.640000, 24.183000, '臺中市', '西屯區', 'approximate',
    '臺中市西屯區。公開研究確認行政區；本點為區域性概略代表點，後續可再校訂。',
    '劉克竑〈牛罵頭文化的陶容器：大肚山與八卦山附近遺址的一些綜整與觀察〉。',
    'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', true
  ),
  (
    'xidadun-site', '西大墩考古遺址', 'Xidadun Archaeological Site',
    120.625500, 24.181500, '臺中市', '西屯區', 'approximate',
    '臺中市西屯區西大墩公園、筏子溪東側一帶；以公園設定代表點。',
    '國家考古遺址出土遺物典藏系統「西大墩考古遺址」。',
    'https://nhsrc.boch.gov.tw/SiteDetail?id=20110831000001', true
  ),
  (
    'dingjie-site', '頂街遺址', 'Dingjie Archaeological Site',
    120.542000, 24.151000, '臺中市', '大肚區', 'approximate',
    '臺中市大肚區頂街一帶。依公開研究的行政區及地段設定概略代表點。',
    '劉克竑〈牛罵頭文化的陶容器：大肚山與八卦山附近遺址的一些綜整與觀察〉。',
    'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', true
  ),
  (
    'nanshikeng-ii-site', '南勢坑II遺址', 'Nanshikeng II Archaeological Site',
    120.568500, 24.214500, '臺中市', '沙鹿區', 'approximate',
    '臺中市沙鹿區向上路七段與沙田路六段交叉口東北側臺地；概略代表點。',
    '國立自然科學博物館「南勢坑II遺址搶救發掘成果」。',
    'https://epub.nmns.edu.tw/', true
  ),
  (
    'matzupu-site', '麻糍埔考古遺址', 'Matzupu Archaeological Site',
    120.636500, 24.129000, '臺中市', '南屯區', 'approximate',
    '臺中市南屯區鎮平里及豐樂里、舊南屯溪沿岸；以公告範圍設定代表點。',
    '臺中市文化資產處「麻糍埔考古遺址」。',
    'https://www.tchac.taichung.gov.tw/archeology?pid=63&uid=36', true
  ),
  (
    'niupu-site', '牛埔考古遺址', 'Niupu Archaeological Site',
    120.584000, 24.078000, '彰化縣', '彰化市', 'approximate',
    '彰化市牛埔里、八卦台地東北角邊緣；依調查位置設定概略代表點。',
    '國立自然科學博物館研究及國家文化資產網「彰化市牛埔考古遺址」。',
    'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', true
  ),

  -- 卑南文化：6處
  (
    'peinan-site', '卑南考古遺址', 'Peinan Archaeological Site',
    121.113333, 22.794444, '臺東縣', '臺東市', 'exact',
    '臺東市南王里、卑南山東南側山麓。採公開研究資料的遺址代表點。',
    '國家考古遺址出土遺物典藏系統「卑南考古遺址」。',
    'https://nhsrc.boch.gov.tw/SiteDetail?id=20060501000006', true
  ),
  (
    'laofanshe-site', '老番社遺址', 'Laofanshe Archaeological Site',
    121.058000, 22.798000, '臺東縣', '卑南鄉', 'approximate',
    '卑南鄉泰安村太平溪右岸坡地，約在卑南遺址西方6公里；概略代表點。',
    '國立臺灣史前文化博物館〈談老番社遺址近年之考古調查〉。',
    'https://icloud.nmp.gov.tw/Library/EPaperContent?a=212&id=64&nid=209', true
  ),
  (
    'liyushan-site', '鯉魚山遺址', 'Liyushan Archaeological Site',
    121.142778, 22.754444, '臺東縣', '臺東市', 'approximate',
    '臺東市鯉魚山東側山麓、龍鳳佛堂附近；以山麓公開位置設定代表點。',
    '臺灣原住民族事典「臺東・鯉魚山考古遺址」。',
    'https://aborgpedia.alcd.center/', true
  ),
  (
    'shangli-site', '上里遺址', 'Shangli Archaeological Site',
    121.060000, 22.895000, '臺東縣', '延平鄉', 'approximate',
    '延平鄉紅葉村上里部落南方、海拔約500至550公尺緩坡；概略代表點。',
    '陳柏仰〈由臺東上里遺址石板棺資料探討卑南文化晚期至三和文化早期的社會變遷〉。',
    'https://tdr.lib.ntu.edu.tw/', true
  ),
  (
    'gongpu-site', '公埔考古遺址', 'Gongpu Archaeological Site',
    121.260750, 23.185778, '花蓮縣', '富里鄉', 'exact',
    '花蓮縣富里鄉石牌村；座標依富里鄉公所公開資料設定。',
    '花蓮縣富里鄉公所「公埔遺址」。',
    'https://www.fuli.gov.tw/', true
  ),
  (
    'shemaganshan-site', '射馬干山遺址', 'Shemaganshan Archaeological Site',
    121.080000, 22.720000, '臺東縣', '卑南鄉', 'approximate',
    '卑南鄉溫泉村射馬干山區，建和社區西側約2公里、海拔約500至550公尺稜線；概略代表點。',
    '葉美珍〈記射馬干山遺址之發現及調查〉。',
    'https://beta.nmp.gov.tw/enews/no419/page_02.html', true
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
  "CultureSlug", "SiteSlug", "EvidenceStatus", "EvidenceNote",
  "EvidenceSourceCitation", "EvidenceSourceURL", "IsPrimary", "SortOrder"
) as (
  values
    ('changbin-culture', 'baxian-caves', 'confirmed',
      '長濱文化的命名與代表性遺址；洞穴地層及出土石器是判定文化關係的主要證據。',
      '中央研究院「臺灣史前文化：八仙洞遺址」。',
      'https://twstudy.iis.sinica.edu.tw/preHistory/site_7.html', true, 1),
    ('changbin-culture', 'xiaoma-cave', 'confirmed',
      '先陶文化層出土石片器與砍器，其器物組合被研究者歸入或連結長濱文化。',
      '國家文化記憶庫「小馬海蝕洞（小馬III）遺址」。',
      'https://tcmb.culture.tw/zh-tw/detail?id=263314&indexCode=Culture_Object', false, 2),

    ('niumatou-culture', 'niumatou-site', 'confirmed',
      '牛罵頭文化命名遺址；具有牛罵頭文化層、繩紋陶、墓葬及建築遺構。',
      '國家考古遺址出土遺物典藏系統「牛罵頭考古遺址」。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20110506000003', true, 1),
    ('niumatou-culture', 'anhe-site', 'confirmed',
      '官方資料明列大坌坑與牛罵頭文化層，並有陶器、玉器、墓葬及生態遺留。',
      '國家考古遺址出土遺物典藏系統「安和考古遺址」。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20161220000002', false, 2),
    ('niumatou-culture', 'huilai-site', 'confirmed',
      '考古發掘取得牛罵頭文化陶器；納入近期牛罵頭文化陶容器綜整研究。',
      '劉克竑，2025，〈牛罵頭文化的陶容器〉。',
      'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', false, 3),
    ('niumatou-culture', 'dunziding-site', 'confirmed',
      '考古發掘取得牛罵頭文化陶器；納入近期牛罵頭文化陶容器綜整研究。',
      '劉克竑，2025，〈牛罵頭文化的陶容器〉。',
      'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', false, 4),
    ('niumatou-culture', 'xidadun-site', 'confirmed',
      '官方資料明列下層為牛罵頭文化層，並出土陶器、石器與玉器等遺物。',
      '國家考古遺址出土遺物典藏系統「西大墩考古遺址」。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20110831000001', false, 5),
    ('niumatou-culture', 'dingjie-site', 'confirmed',
      '考古發掘取得牛罵頭文化陶器；納入近期牛罵頭文化陶容器綜整研究。',
      '劉克竑，2025，〈牛罵頭文化的陶容器〉。',
      'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', false, 6),
    ('niumatou-culture', 'nanshikeng-ii-site', 'confirmed',
      '出土牛罵頭文化遺物；部分研究認為也呈現牛罵頭文化較晚階段或後續發展，故細部年代仍可再研究。',
      '國立自然科學博物館研究；劉克竑，2025。',
      'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', false, 7),
    ('niumatou-culture', 'matzupu-site', 'confirmed',
      '官方資料明列有牛罵頭文化層，但遺物較少且部分受洪氾擾動。',
      '臺中市文化資產處「麻糍埔考古遺址」。',
      'https://www.tchac.taichung.gov.tw/archeology?pid=63&uid=36', false, 8),
    ('niumatou-culture', 'niupu-site', 'confirmed',
      '考古發掘出土牛罵頭文化陶器與建築結構，並納入近期綜整研究。',
      '劉克竑，2025，〈牛罵頭文化的陶容器〉。',
      'https://libknowledge.nmns.edu.tw/nmns/colleagueswriting/NO000007527.html', false, 9),

    ('peinan-culture', 'peinan-site', 'confirmed',
      '卑南文化命名與代表性遺址；聚落、石板棺墓葬、陶石玉器及文化層證據豐富。',
      '國家考古遺址出土遺物典藏系統「卑南考古遺址」。',
      'https://nhsrc.boch.gov.tw/SiteDetail?id=20060501000006', true, 1),
    ('peinan-culture', 'laofanshe-site', 'confirmed',
      '出土大量石板棺及卑南文化遺物，被史前館列為縱谷南端重要卑南文化遺址。',
      '國立臺灣史前文化博物館〈談老番社遺址近年之考古調查〉。',
      'https://icloud.nmp.gov.tw/Library/EPaperContent?a=212&id=64&nid=209', false, 2),
    ('peinan-culture', 'liyushan-site', 'confirmed',
      '陶器、石器、玉器、石板棺及巨石遺構的比較，支持其文化類緣屬卑南文化。',
      '臺灣原住民族事典「臺東・鯉魚山考古遺址」。',
      'https://aborgpedia.alcd.center/', false, 3),
    ('peinan-culture', 'shangli-site', 'confirmed',
      '研究判定包含卑南文化晚期及三和文化早期兩個階段，是文化轉變的重要證據。',
      '陳柏仰，2019／2020，上里遺址研究。',
      'https://tdr.lib.ntu.edu.tw/', false, 4),
    ('peinan-culture', 'gongpu-site', 'confirmed',
      '官方文化資產資料將其文化內涵歸入新石器時代晚期卑南文化。',
      '花蓮縣文化局、富里鄉公所「公埔考古遺址」。',
      'https://www.hccc.gov.tw/', false, 5),
    ('peinan-culture', 'shemaganshan-site', 'confirmed',
      '地表採集及文化層觀察確認卑南文化晚期至三和文化早期遺留；屬過渡階段聚落。',
      '葉美珍，2020，〈記射馬干山遺址之發現及調查〉。',
      'https://beta.nmp.gov.tw/enews/no419/page_02.html', false, 6)
), resolved as (
  select
    e."EntityID", s."SiteID", l."EvidenceStatus", l."EvidenceNote",
    l."EvidenceSourceCitation", l."EvidenceSourceURL", l."IsPrimary", l."SortOrder"
  from links l
  join public."TblP118HistoricalEntity" e on e."Slug" = l."CultureSlug"
  join public."TblP118ArchaeologicalSite" s on s."Slug" = l."SiteSlug"
)
insert into public."TblP118EntitySite" (
  "EntityID", "SiteID", "EvidenceStatus", "EvidenceNote",
  "EvidenceSourceCitation", "EvidenceSourceURL", "IsPrimary", "SortOrder"
)
select
  "EntityID", "SiteID", "EvidenceStatus", "EvidenceNote",
  "EvidenceSourceCitation", "EvidenceSourceURL", "IsPrimary", "SortOrder"
from resolved
on conflict ("EntityID", "SiteID") do update set
  "EvidenceStatus" = excluded."EvidenceStatus",
  "EvidenceNote" = excluded."EvidenceNote",
  "EvidenceSourceCitation" = excluded."EvidenceSourceCitation",
  "EvidenceSourceURL" = excluded."EvidenceSourceURL",
  "IsPrimary" = excluded."IsPrimary",
  "SortOrder" = excluded."SortOrder",
  "UpdatedAt" = now();

commit;

-- 執行後檢查：預期長濱2處、牛罵頭9處、卑南6處，共17個文化—遺址關聯。
select
  e."TitleZh" as "文化",
  count(*) as "遺址數",
  count(*) filter (where es."EvidenceStatus" = 'confirmed') as "確認關係數",
  count(*) filter (where s."LocationAccuracy" = 'exact') as "明確位置數",
  count(*) filter (where s."LocationAccuracy" = 'approximate') as "概略位置數"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" in ('changbin-culture', 'niumatou-culture', 'peinan-culture')
group by e."EntityID", e."TitleZh", e."StartYear"
order by e."StartYear";

-- 明細檢查。
select
  e."TitleZh" as "文化",
  s."SiteNameZh" as "遺址",
  s."CountyName" as "縣市",
  s."TownshipName" as "鄉鎮市區",
  s."LocationAccuracy" as "位置精度",
  es."EvidenceStatus" as "證據狀態",
  es."EvidenceSourceURL" as "證據來源"
from public."TblP118EntitySite" es
join public."TblP118HistoricalEntity" e on e."EntityID" = es."EntityID"
join public."TblP118ArchaeologicalSite" s on s."SiteID" = es."SiteID"
where e."Slug" in ('changbin-culture', 'niumatou-culture', 'peinan-culture')
order by e."StartYear", es."SortOrder", s."SiteID";
