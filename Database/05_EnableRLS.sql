-- P118 / 05: 只啟用本專案資料表的 RLS

alter table public."TblP118HistoricalEntity" enable row level security;
alter table public."TblP118ArchaeologicalSite" enable row level security;
alter table public."TblP118EntitySite" enable row level security;
