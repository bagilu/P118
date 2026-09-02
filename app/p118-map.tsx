"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, Point } from "geojson";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { geoPath, geoTransform } from "d3-geo";
import {
  CalendarDays,
  Database,
  Download,
  Info,
  Layers3,
  MapPin,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type MapFeature = Feature<Geometry, GeoJsonProperties>;
type MapCollection = FeatureCollection<Geometry, GeoJsonProperties>;

type P118Config = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TIMELINE_RPC?: string;
};

declare global {
  interface Window {
    P118_CONFIG?: P118Config;
  }
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const EMPTY_COLLECTION: MapCollection = { type: "FeatureCollection", features: [] };

const MAP_COLORS = {
  land: "#f5f6f1",
  coastline: "#243d43",
  county: "#758b8e",
  city: "#9e3f2d",
  culture: "#d06a42",
};

function assetUrl(path: string) {
  return `${BASE_PATH}/${path.replace(/^\//, "")}`;
}

function formatYear(year: number) {
  if (year < 0) return `BC ${Math.abs(year).toLocaleString("en-US")}`;
  if (year > 0) return `AD ${year.toLocaleString("en-US")}`;
  return "紀元交界";
}

function formatPeriod(start: number, end: number) {
  return `${formatYear(start)}–${formatYear(end)}`;
}

function featureNumber(feature: MapFeature, key: string, fallback = 0) {
  const value = feature.properties?.[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function featureString(feature: MapFeature, key: string, fallback = "") {
  const value = feature.properties?.[key];
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function isActiveAt(feature: MapFeature, year: number) {
  return featureNumber(feature, "StartYear") <= year && featureNumber(feature, "EndYear") >= year;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadJson(path: string): Promise<MapCollection> {
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json() as Promise<MapCollection>;
}

async function loadHistoricalFeatures(): Promise<{ data: MapCollection; mode: "supabase" | "demo" }> {
  const config = window.P118_CONFIG ?? {};
  const url = config.SUPABASE_URL?.trim();
  const key = config.SUPABASE_ANON_KEY?.trim();

  if (url && key) {
    try {
      const rpc = config.TIMELINE_RPC?.trim() || "P118_GetTimelineFeatures";
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${rpc}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
      const rows = (await response.json()) as Array<Record<string, unknown>>;
      const features: MapFeature[] = rows.map((row) => {
        const rawGeometry = row.GeometryGeoJSON;
        const geometry = typeof rawGeometry === "string" ? JSON.parse(rawGeometry) : rawGeometry;
        return {
          type: "Feature",
          id: String(row.GeometryID ?? row.EntityID ?? "feature"),
          geometry: geometry as Geometry,
          properties: {
            EntityID: row.EntityID,
            GeometryID: row.GeometryID,
            Slug: row.Slug,
            TitleZh: row.TitleZh,
            TitleEn: row.TitleEn,
            StartYear: row.StartYear,
            EndYear: row.EndYear,
            SummaryZh: row.SummaryZh,
            SourceCitation: row.SourceCitation,
            SourceURL: row.SourceURL,
            DisplayColor: row.DisplayColor,
            DataStatus: "published",
            LabelLongitude: row.LabelLongitude,
            LabelLatitude: row.LabelLatitude,
          },
        };
      });
      return { data: { type: "FeatureCollection", features }, mode: "supabase" };
    } catch (error) {
      console.warn("P118 Supabase unavailable; using demonstration data.", error);
    }
  }

  return {
    data: await loadJson("data/demo/historical_features.geojson"),
    mode: "demo",
  };
}

function LayerToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="layer-toggle">
      <div>
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export function P118Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cityMarkersRef = useRef<MapLibreMarker[]>([]);
  const lastWheelRef = useRef(0);

  const [counties, setCounties] = useState<MapCollection>(EMPTY_COLLECTION);
  const [coastline, setCoastline] = useState<MapCollection>(EMPTY_COLLECTION);
  const [cities, setCities] = useState<MapCollection>(EMPTY_COLLECTION);
  const [historical, setHistorical] = useState<MapCollection>(EMPTY_COLLECTION);
  const [timelineStops, setTimelineStops] = useState<number[]>([-5000, -2700]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [showCounties, setShowCounties] = useState(false);
  const [showCities, setShowCities] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState("1");
  const [mapReady, setMapReady] = useState(false);
  const [sourceMode, setSourceMode] = useState<"loading" | "supabase" | "demo" | "error">("loading");

  const selectedYear = timelineStops[timelineIndex] ?? timelineStops[0] ?? -5000;
  const activeFeatures = useMemo(
    () => historical.features.filter((feature) => isActiveAt(feature, selectedYear)),
    [historical, selectedYear],
  );
  const activeCollection = useMemo<MapCollection>(
    () => ({ type: "FeatureCollection", features: activeFeatures }),
    [activeFeatures],
  );
  const selectedFeature =
    activeFeatures.find((feature) => String(featureNumber(feature, "EntityID")) === selectedEntityId) ??
    activeFeatures[0] ??
    historical.features[0];

  useEffect(() => {
    let disposed = false;
    let map: MapLibreMap | null = null;

    async function initialize() {
      try {
        const maplibregl = await import("maplibre-gl");
        const [countyData, coastlineData, cityData, historicalResult] = await Promise.all([
          loadJson("data/base/taiwan_counties.geojson"),
          loadJson("data/base/taiwan_coastline.geojson"),
          loadJson("data/base/taiwan_cities.geojson"),
          loadHistoricalFeatures(),
        ]);
        if (disposed || !mapContainerRef.current) return;

        setCounties(countyData);
        setCoastline(coastlineData);
        setCities(cityData);
        setHistorical(historicalResult.data);
        setSourceMode(historicalResult.mode);

        const stops = Array.from(
          new Set(
            historicalResult.data.features.flatMap((feature) => [
              featureNumber(feature, "StartYear"),
              featureNumber(feature, "EndYear"),
            ]),
          ),
        ).filter((year) => year !== 0).sort((a, b) => a - b);
        if (stops.length) {
          setTimelineStops(stops);
          setTimelineIndex(0);
        }

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {},
            layers: [
              {
                id: "transparent-background",
                type: "background",
                paint: { "background-color": "rgba(0,0,0,0)" },
              },
            ],
          },
          center: [120.9, 23.7],
          zoom: 6.1,
          minZoom: 4,
          maxZoom: 12,
          bearing: 0,
          pitch: 0,
          attributionControl: false,
          canvasContextAttributes: { alpha: true, preserveDrawingBuffer: true },
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("load", () => {
          if (!map) return;
          map.addSource("counties", { type: "geojson", data: countyData });
          map.addSource("coastline", { type: "geojson", data: coastlineData });
          map.addSource("cities", { type: "geojson", data: cityData });
          map.addSource("historical", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: historicalResult.data.features.filter((feature) =>
                isActiveAt(feature, stops[0] ?? -5000),
              ),
            },
          });

          map.addLayer({
            id: "land-fill",
            type: "fill",
            source: "counties",
            paint: { "fill-color": MAP_COLORS.land, "fill-opacity": 1 },
          });
          map.addLayer({
            id: "county-lines",
            type: "line",
            source: "counties",
            layout: { visibility: "none" },
            paint: { "line-color": MAP_COLORS.county, "line-width": 0.8, "line-opacity": 0.75 },
          });
          map.addLayer({
            id: "historical-fill",
            type: "fill",
            source: "historical",
            paint: {
              "fill-color": ["coalesce", ["get", "DisplayColor"], MAP_COLORS.culture],
              "fill-opacity": 0.44,
            },
          });
          map.addLayer({
            id: "historical-outline",
            type: "line",
            source: "historical",
            paint: {
              "line-color": ["coalesce", ["get", "DisplayColor"], MAP_COLORS.culture],
              "line-width": 2,
              "line-dasharray": [3, 2],
            },
          });
          map.addLayer({
            id: "coastline-line",
            type: "line",
            source: "coastline",
            paint: { "line-color": MAP_COLORS.coastline, "line-width": 1.35, "line-opacity": 0.95 },
          });
          map.addLayer({
            id: "city-points",
            type: "circle",
            source: "cities",
            paint: {
              "circle-radius": 4,
              "circle-color": MAP_COLORS.city,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            },
          });

          cityMarkersRef.current = cityData.features.map((feature) => {
            const element = document.createElement("div");
            element.className = "city-map-label";
            element.textContent = featureString(feature, "NameZh");
            const coordinates = (feature.geometry as Point).coordinates;
            return new maplibregl.Marker({ element, anchor: "left", offset: [8, 0] })
              .setLngLat([coordinates[0], coordinates[1]])
              .addTo(map!);
          });

          map.on("click", "historical-fill", (event) => {
            const entityId = event.features?.[0]?.properties?.EntityID;
            if (entityId != null) setSelectedEntityId(String(entityId));
          });
          map.on("mouseenter", "historical-fill", () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "historical-fill", () => {
            if (map) map.getCanvas().style.cursor = "";
          });
          map.fitBounds(
            [
              [119.25, 21.7],
              [122.1, 25.5],
            ],
            { padding: 42, duration: 0 },
          );
          setMapReady(true);
        });
      } catch (error) {
        console.error(error);
        setSourceMode("error");
      }
    }

    initialize();
    return () => {
      disposed = true;
      cityMarkersRef.current.forEach((marker) => marker.remove());
      cityMarkersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const source = map.getSource("historical") as import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(activeCollection);
    if (activeFeatures.length && !activeFeatures.some((feature) => String(featureNumber(feature, "EntityID")) === selectedEntityId)) {
      setSelectedEntityId(String(featureNumber(activeFeatures[0], "EntityID")));
    }
  }, [activeCollection, activeFeatures, mapReady, selectedEntityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setLayoutProperty("county-lines", "visibility", showCounties ? "visible" : "none");
  }, [mapReady, showCounties]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setLayoutProperty("city-points", "visibility", showCities ? "visible" : "none");
    cityMarkersRef.current.forEach((marker) => {
      marker.getElement().style.display = showCities ? "block" : "none";
    });
  }, [mapReady, showCities]);

  const resetView = useCallback(() => {
    mapRef.current?.fitBounds(
      [
        [119.25, 21.7],
        [122.1, 25.5],
      ],
      { padding: 42, duration: 650 },
    );
  }, []);

  const handleTimelineWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const now = Date.now();
      if (now - lastWheelRef.current < 180 || timelineStops.length < 2) return;
      lastWheelRef.current = now;
      setTimelineIndex((index) =>
        Math.min(timelineStops.length - 1, Math.max(0, index + (event.deltaY > 0 ? 1 : -1))),
      );
    },
    [timelineStops.length],
  );

  const handlePngDownload = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    await new Promise<void>((resolve) => {
      map.once("render", () => resolve());
      map.triggerRepaint();
    });

    const sourceCanvas = map.getCanvas();
    const output = document.createElement("canvas");
    output.width = sourceCanvas.width;
    output.height = sourceCanvas.height;
    const context = output.getContext("2d");
    if (!context) return;
    context.drawImage(sourceCanvas, 0, 0);

    const ratio = output.width / map.getContainer().clientWidth;
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(255,255,255,.92)";
    context.fillStyle = "#20383e";
    context.lineWidth = 4 * ratio;
    context.font = `600 ${15 * ratio}px Arial, sans-serif`;

    if (showCities) {
      cities.features.forEach((feature) => {
        const point = (feature.geometry as Point).coordinates;
        const projected = map.project([point[0], point[1]]);
        const x = projected.x * ratio;
        const y = projected.y * ratio;
        context.beginPath();
        context.arc(x, y, 4 * ratio, 0, Math.PI * 2);
        context.fillStyle = MAP_COLORS.city;
        context.fill();
        context.strokeStyle = "#ffffff";
        context.lineWidth = 1.5 * ratio;
        context.stroke();
        context.strokeStyle = "rgba(255,255,255,.92)";
        context.lineWidth = 4 * ratio;
        context.strokeText(featureString(feature, "NameZh"), x + 8 * ratio, y);
        context.fillStyle = "#20383e";
        context.fillText(featureString(feature, "NameZh"), x + 8 * ratio, y);
      });
    }

    activeFeatures.forEach((feature) => {
      const lng = featureNumber(feature, "LabelLongitude", Number.NaN);
      const lat = featureNumber(feature, "LabelLatitude", Number.NaN);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      const projected = map.project([lng, lat]);
      const x = projected.x * ratio;
      const y = projected.y * ratio;
      context.font = `700 ${16 * ratio}px Arial, sans-serif`;
      context.strokeText(featureString(feature, "TitleZh"), x, y);
      context.fillStyle = "#7c331f";
      context.fillText(featureString(feature, "TitleZh"), x, y);
    });

    context.font = `700 ${18 * ratio}px Arial, sans-serif`;
    context.strokeStyle = "rgba(255,255,255,.95)";
    context.lineWidth = 5 * ratio;
    context.strokeText(formatYear(selectedYear), 22 * ratio, 28 * ratio);
    context.fillStyle = "#20383e";
    context.fillText(formatYear(selectedYear), 22 * ratio, 28 * ratio);

    output.toBlob((blob) => {
      if (blob) downloadBlob(blob, `P118_${formatYear(selectedYear).replace(" ", "")}_transparent.png`);
    }, "image/png");
  }, [activeFeatures, cities.features, mapReady, selectedYear, showCities]);

  const handleSvgDownload = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    const projection = geoTransform({
      point(longitude, latitude) {
        const point = map.project([longitude, latitude]);
        this.stream.point(point.x, point.y);
      },
    });
    const path = geoPath(projection);
    const pathFor = (feature: MapFeature) => path(feature) ?? "";

    const landPaths = counties.features
      .map((feature) => `<path id="land-${safeId(featureString(feature, "CountyCode"))}" d="${pathFor(feature)}"/>`)
      .join("");
    const countyPaths = showCounties
      ? counties.features
          .map((feature) => `<path id="county-${safeId(featureString(feature, "CountyCode"))}" d="${pathFor(feature)}"/>`)
          .join("")
      : "";
    const coastPaths = coastline.features
      .map((feature, index) => `<path id="coastline-${index + 1}" d="${pathFor(feature)}"/>`)
      .join("");
    const cultureGroups = activeFeatures
      .map((feature) => {
        const id = safeId(featureString(feature, "Slug", String(feature.id ?? "culture")));
        const color = escapeXml(featureString(feature, "DisplayColor", MAP_COLORS.culture));
        const lng = featureNumber(feature, "LabelLongitude", Number.NaN);
        const lat = featureNumber(feature, "LabelLatitude", Number.NaN);
        const label = Number.isFinite(lng) && Number.isFinite(lat) ? map.project([lng, lat]) : null;
        return `<g id="culture-${id}" data-start-year="${featureNumber(feature, "StartYear")}" data-end-year="${featureNumber(feature, "EndYear")}"><path d="${pathFor(feature)}" fill="${color}" fill-opacity="0.44" stroke="${color}" stroke-width="2" stroke-dasharray="7 5"/>${label ? `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}">${escapeXml(featureString(feature, "TitleZh"))}</text>` : ""}</g>`;
      })
      .join("");
    const cityGroups = showCities
      ? cities.features
          .map((feature) => {
            const point = (feature.geometry as Point).coordinates;
            const projected = map.project([point[0], point[1]]);
            const id = safeId(featureString(feature, "CityID"));
            return `<g id="city-${id}"><circle cx="${projected.x.toFixed(2)}" cy="${projected.y.toFixed(2)}" r="4"/><text x="${(projected.x + 8).toFixed(2)}" y="${(projected.y + 4).toFixed(2)}">${escapeXml(featureString(feature, "NameZh"))}</text></g>`;
          })
          .join("")
      : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>P118 先民地圖 — ${escapeXml(formatYear(selectedYear))}</title>
  <metadata>Generated by P118 V0.1. Output CRS: current Web Mercator viewport. Modern reference data: NLSC and Natural Earth.</metadata>
  <g id="land" fill="${MAP_COLORS.land}" stroke="none" fill-rule="evenodd">${landPaths}</g>
  <g id="modern-counties" fill="none" stroke="${MAP_COLORS.county}" stroke-width="0.8">${countyPaths}</g>
  <g id="historical-cultures" font-family="Noto Sans TC, Arial, sans-serif" font-size="16" font-weight="700" fill="#7c331f">${cultureGroups}</g>
  <g id="coastline" fill="none" stroke="${MAP_COLORS.coastline}" stroke-width="1.35">${coastPaths}</g>
  <g id="cities" fill="${MAP_COLORS.city}" font-family="Noto Sans TC, Arial, sans-serif" font-size="14" font-weight="600">${cityGroups}</g>
  <g id="annotations" fill="#20383e" font-family="Noto Sans TC, Arial, sans-serif" font-size="18" font-weight="700"><text x="22" y="30">${escapeXml(formatYear(selectedYear))}</text></g>
</svg>`;
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `P118_${formatYear(selectedYear).replace(" ", "")}_editable.svg`,
    );
  }, [activeFeatures, cities.features, coastline.features, counties.features, mapReady, selectedYear, showCities, showCounties]);

  return (
    <main className="p118-app">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <p>P118 · TEMPORAL ATLAS</p>
            <h1>先民地圖</h1>
          </div>
        </div>
        <div className="download-actions" aria-label="下載目前地圖">
          <Button variant="outline" onClick={handlePngDownload} disabled={!mapReady}>
            <Download />透明 PNG
          </Button>
          <Button onClick={handleSvgDownload} disabled={!mapReady}>
            <Download />可編輯 SVG
          </Button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="control-panel" aria-label="年代與圖層控制">
          <section className="panel-section timeline-section" onWheel={handleTimelineWheel}>
            <div className="section-heading">
              <CalendarDays aria-hidden="true" />
              <div><span>TIME</span><h2>年代</h2></div>
            </div>
            <div className="year-display">{formatYear(selectedYear)}</div>
            <Slider
              value={[timelineIndex]}
              min={0}
              max={Math.max(0, timelineStops.length - 1)}
              step={1}
              onValueChange={(value) => setTimelineIndex(value[0] ?? 0)}
              aria-label="年代"
              disabled={timelineStops.length < 2}
            />
            <div className="timeline-ends">
              <span>{formatYear(timelineStops[0] ?? selectedYear)}</span>
              <span>{formatYear(timelineStops.at(-1) ?? selectedYear)}</span>
            </div>
            <p className="interaction-hint">游標停在此處時，可用滾輪切換年代節點。</p>
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <Layers3 aria-hidden="true" />
              <div><span>LAYERS</span><h2>參考圖層</h2></div>
            </div>
            <LayerToggle id="counties" label="現代縣市界" description="僅供位置參考" checked={showCounties} onCheckedChange={setShowCounties} />
            <LayerToggle id="cities" label="主要城市" description="六個現代城市位置" checked={showCities} onCheckedChange={setShowCities} />
          </section>

          <section className="panel-section compact-section">
            <div className="data-status">
              <Database aria-hidden="true" />
              <div>
                <span>資料狀態</span>
                <strong>{sourceMode === "supabase" ? "Supabase正式資料" : sourceMode === "demo" ? "V0.1示意資料" : sourceMode === "error" ? "載入失敗" : "載入中"}</strong>
              </div>
            </div>
          </section>
        </aside>

        <section className="map-stage" aria-label="臺灣先民年代地圖">
          <div ref={mapContainerRef} className="map-canvas" />
          {!mapReady && <div className="map-loading">正在準備地圖資料…</div>}
          <div className="map-year-chip"><span>目前年代</span><strong>{formatYear(selectedYear)}</strong></div>
          <div className="map-legend">
            <span><i className="legend-culture" />文化分布</span>
            <span><i className="legend-coast" />海岸線</span>
          </div>
          <Button className="reset-map" variant="outline" size="icon" onClick={resetView} aria-label="回到臺灣全圖" title="回到臺灣全圖">
            <RotateCcw />
          </Button>
        </section>

        <aside className="detail-panel" aria-label="文化資料說明">
          <div className="section-heading">
            <Info aria-hidden="true" />
            <div><span>RECORD</span><h2>文化資料</h2></div>
          </div>
          {selectedFeature ? (
            <article className="culture-card">
              <div className="culture-kicker">
                <span className="culture-swatch" style={{ backgroundColor: featureString(selectedFeature, "DisplayColor", MAP_COLORS.culture) }} />
                {featureString(selectedFeature, "DataStatus") === "demo" ? "示意資料" : "公開資料"}
              </div>
              <h3>{featureString(selectedFeature, "TitleZh")}</h3>
              <p className="english-title">{featureString(selectedFeature, "TitleEn")}</p>
              <div className="period-card">
                <CalendarDays aria-hidden="true" />
                <div><span>年代範圍</span><strong>{formatPeriod(featureNumber(selectedFeature, "StartYear"), featureNumber(selectedFeature, "EndYear"))}</strong></div>
              </div>
              <p className="culture-summary">{featureString(selectedFeature, "SummaryZh")}</p>
              <div className="source-block">
                <span>資料來源</span>
                <p>{featureString(selectedFeature, "SourceCitation", "尚未提供")}</p>
              </div>
            </article>
          ) : (
            <div className="empty-record"><MapPin /><p>此年代尚無可顯示的文化資料。</p></div>
          )}
          <div className="modern-note"><strong>閱讀提醒</strong><p>縣市與城市為現代位置參考，不代表史前行政區或文化疆域。</p></div>
        </aside>
      </div>

      <footer className="site-footer">
        <span>P118 先民地圖 · V0.1</span>
        <span>基礎圖資：內政部國土測繪中心、Natural Earth</span>
      </footer>
    </main>
  );
}
