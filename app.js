const {
  Map: MapLibreMap,
  Marker,
  NavigationControl
} = window.maplibregl;

const EMPTY = { type: "FeatureCollection", features: [] };
const COLORS = {
  land: "#f5f6f1",
  coast: "#243d43",
  county: "#758b8e",
  city: "#9e3f2d",
  culture: "#d06a42"
};

const state = {
  counties: EMPTY,
  coastline: EMPTY,
  cities: EMPTY,
  sites: EMPTY,
  stops: [-28050, -3050],
  index: 0,
  selectedId: null,
  map: null,
  cityMarkers: [],
  siteMarkers: [],
  ready: false,
  sourceMode: "loading"
};

const el = (id) => document.getElementById(id);
const ui = {
  timeline: el("timeline"),
  timelinePanel: el("timelinePanel"),
  yearDisplay: el("yearDisplay"),
  mapYear: el("mapYear"),
  firstYear: el("firstYear"),
  lastYear: el("lastYear"),
  showCounties: el("showCounties"),
  showCities: el("showCities"),
  dataStatus: el("dataStatus"),
  loading: el("loading"),
  record: el("record"),
  emptyRecord: el("emptyRecord"),
  recordStatus: el("recordStatus"),
  cultureSwatch: el("cultureSwatch"),
  cultureTitle: el("cultureTitle"),
  cultureEnglish: el("cultureEnglish"),
  culturePeriod: el("culturePeriod"),
  cultureSummary: el("cultureSummary"),
  cultureSource: el("cultureSource"),
  cultureSourceLink: el("cultureSourceLink"),
  siteName: el("siteName"),
  siteEnglish: el("siteEnglish"),
  siteCoordinates: el("siteCoordinates"),
  siteNote: el("siteNote"),
  siteSource: el("siteSource"),
  siteSourceLink: el("siteSourceLink"),
  downloadPng: el("downloadPng"),
  downloadSvg: el("downloadSvg"),
  resetMap: el("resetMap")
};

function formatYear(year) {
  if (year < 0) return "BC " + Math.abs(year).toLocaleString("en-US");
  if (year > 0) return "AD " + year.toLocaleString("en-US");
  return "紀元交界";
}

function formatPeriod(start, end) {
  return formatYear(start) + "–" + formatYear(end);
}

function numberProp(feature, key, fallback = 0) {
  const value = Number(feature?.properties?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function textProp(feature, key, fallback = "") {
  const value = feature?.properties?.[key];
  return value == null ? fallback : String(value);
}

function activeAt(feature, year) {
  return numberProp(feature, "StartYear") <= year &&
    numberProp(feature, "EndYear") >= year;
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("無法載入 " + path);
  return response.json();
}

async function fetchTimelineSites() {
  const config = window.P118_CONFIG || {};
  const url = String(config.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(config.SUPABASE_ANON_KEY || "").trim();

  if (url && key) {
    try {
      const rpc = String(config.TIMELINE_RPC || "P118_GetTimelineSites").trim();
      const response = await fetch(url + "/rest/v1/rpc/" + rpc, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (!response.ok) throw new Error("Supabase HTTP " + response.status);
      const rows = await response.json();
      return {
        mode: "supabase",
        data: {
          type: "FeatureCollection",
          features: rows.map((row) => ({
            type: "Feature",
            id: String(row.EntitySiteID),
            geometry: {
              type: "Point",
              coordinates: [Number(row.Longitude), Number(row.Latitude)]
            },
            properties: {
              EntitySiteID: row.EntitySiteID,
              EntityID: row.EntityID,
              SiteID: row.SiteID,
              CultureSlug: row.CultureSlug,
              TitleZh: row.TitleZh,
              TitleEn: row.TitleEn,
              StartYear: row.StartYear,
              EndYear: row.EndYear,
              SummaryZh: row.SummaryZh,
              CultureSourceCitation: row.CultureSourceCitation,
              CultureSourceURL: row.CultureSourceURL,
              DisplayColor: row.DisplayColor,
              SiteSlug: row.SiteSlug,
              SiteNameZh: row.SiteNameZh,
              SiteNameEn: row.SiteNameEn,
              Longitude: row.Longitude,
              Latitude: row.Latitude,
              LocationNote: row.LocationNote,
              SiteSourceCitation: row.SiteSourceCitation,
              SiteSourceURL: row.SiteSourceURL,
              EvidenceNote: row.EvidenceNote,
              IsPrimary: row.IsPrimary,
              DataStatus: "published"
            }
          }))
        }
      };
    } catch (error) {
      console.warn("Supabase 暫時無法使用，改用本機遺址示意資料。", error);
    }
  }

  return {
    mode: "demo",
    data: await fetchJson("./data/demo/historical_features.geojson")
  };
}

function currentYear() {
  return state.stops[state.index] ?? state.stops[0] ?? -28050;
}

function activeFeatures() {
  const year = currentYear();
  return state.sites.features.filter((feature) => activeAt(feature, year));
}

function buildStops() {
  const values = state.sites.features.flatMap((feature) => [
    numberProp(feature, "StartYear"),
    numberProp(feature, "EndYear")
  ]);
  state.stops = [...new Set(values)].filter((year) => year !== 0).sort((a, b) => a - b);
  if (!state.stops.length) state.stops = [-28050, -3050];
  state.index = 0;
  ui.timeline.min = "0";
  ui.timeline.max = String(Math.max(0, state.stops.length - 1));
  ui.timeline.value = "0";
  ui.timeline.disabled = state.stops.length < 2;
}

function updateTimeline() {
  const year = currentYear();
  ui.yearDisplay.value = formatYear(year);
  ui.yearDisplay.textContent = formatYear(year);
  ui.mapYear.textContent = formatYear(year);
  ui.firstYear.textContent = formatYear(state.stops[0]);
  ui.lastYear.textContent = formatYear(state.stops[state.stops.length - 1]);
}

function chooseSelected(features) {
  if (!features.length) return null;
  const existing = features.find(
    (feature) => String(numberProp(feature, "EntitySiteID")) === String(state.selectedId)
  );
  return existing || features[0];
}

function setSourceLink(link, value) {
  const url = String(value || "").trim();
  const allowed = /^https?:\/\//i.test(url);
  link.hidden = !allowed;
  if (allowed) link.href = url;
  else link.removeAttribute("href");
}

function updateRecord(features) {
  const feature = chooseSelected(features);
  if (!feature) {
    ui.record.hidden = true;
    ui.emptyRecord.hidden = false;
    return;
  }

  state.selectedId = String(numberProp(feature, "EntitySiteID"));
  ui.record.hidden = false;
  ui.emptyRecord.hidden = true;
  ui.recordStatus.textContent = textProp(feature, "DataStatus") === "demo"
    ? "示意資料"
    : "公開資料";
  ui.cultureSwatch.style.backgroundColor = textProp(feature, "DisplayColor", COLORS.culture);
  ui.cultureTitle.textContent = textProp(feature, "TitleZh");
  ui.cultureEnglish.textContent = textProp(feature, "TitleEn");
  ui.culturePeriod.textContent = formatPeriod(
    numberProp(feature, "StartYear"),
    numberProp(feature, "EndYear")
  );
  ui.cultureSummary.textContent = textProp(feature, "SummaryZh");
  ui.cultureSource.textContent = textProp(feature, "CultureSourceCitation", "尚未提供");
  setSourceLink(ui.cultureSourceLink, textProp(feature, "CultureSourceURL"));

  const longitude = numberProp(feature, "Longitude", Number.NaN);
  const latitude = numberProp(feature, "Latitude", Number.NaN);
  ui.siteName.textContent = textProp(feature, "SiteNameZh");
  ui.siteEnglish.textContent = textProp(feature, "SiteNameEn");
  ui.siteCoordinates.textContent = Number.isFinite(longitude) && Number.isFinite(latitude)
    ? longitude.toFixed(6) + ", " + latitude.toFixed(6)
    : "座標尚未提供";
  ui.siteNote.textContent = textProp(feature, "LocationNote");
  ui.siteSource.textContent = textProp(feature, "SiteSourceCitation", "尚未提供");
  setSourceLink(ui.siteSourceLink, textProp(feature, "SiteSourceURL"));
}

function updateSiteMarkers(features) {
  state.siteMarkers.forEach((marker) => marker.remove());
  state.siteMarkers = [];
  const seen = new Set();
  features.forEach((feature) => {
    const siteId = textProp(feature, "SiteID", feature.id);
    if (seen.has(siteId)) return;
    seen.add(siteId);
    const label = document.createElement("div");
    label.className = "site-label";
    label.textContent = textProp(feature, "SiteNameZh");
    const marker = new Marker({ element: label, anchor: "left", offset: [11, 0] })
      .setLngLat(feature.geometry.coordinates)
      .addTo(state.map);
    state.siteMarkers.push(marker);
  });
}

function updateHistoricalLayer() {
  const features = activeFeatures();
  if (state.ready) {
    state.map.getSource("historical-sites").setData({
      type: "FeatureCollection",
      features
    });
    updateSiteMarkers(features);
  }
  updateTimeline();
  updateRecord(features);
}

function createCityMarkers() {
  state.cityMarkers.forEach((marker) => marker.remove());
  state.cityMarkers = state.cities.features.map((feature) => {
    const label = document.createElement("div");
    label.className = "city-label";
    label.textContent = textProp(feature, "NameZh");
    return new Marker({ element: label, anchor: "left", offset: [8, 0] })
      .setLngLat(feature.geometry.coordinates)
      .addTo(state.map);
  });
}

function addMapContent() {
  const map = state.map;
  map.addSource("counties", { type: "geojson", data: state.counties });
  map.addSource("coastline", { type: "geojson", data: state.coastline });
  map.addSource("cities", { type: "geojson", data: state.cities });
  map.addSource("historical-sites", {
    type: "geojson",
    data: { type: "FeatureCollection", features: activeFeatures() }
  });

  map.addLayer({
    id: "land",
    type: "fill",
    source: "counties",
    paint: { "fill-color": COLORS.land, "fill-opacity": 1 }
  });
  map.addLayer({
    id: "county-lines",
    type: "line",
    source: "counties",
    layout: { visibility: "none" },
    paint: { "line-color": COLORS.county, "line-width": 0.8, "line-opacity": 0.75 }
  });
  map.addLayer({
    id: "site-halos",
    type: "circle",
    source: "historical-sites",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 7, 11, 10, 15, 12, 18],
      "circle-color": ["coalesce", ["get", "DisplayColor"], COLORS.culture],
      "circle-opacity": 0.16
    }
  });
  map.addLayer({
    id: "historical-site-points",
    type: "circle",
    source: "historical-sites",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4.5, 7, 6.5, 10, 9, 12, 11],
      "circle-color": ["coalesce", ["get", "DisplayColor"], COLORS.culture],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
      "circle-opacity": 0.94
    }
  });
  map.addLayer({
    id: "coastline",
    type: "line",
    source: "coastline",
    paint: { "line-color": COLORS.coast, "line-width": 1.35, "line-opacity": 0.95 }
  });
  map.addLayer({
    id: "city-points",
    type: "circle",
    source: "cities",
    paint: {
      "circle-radius": 4,
      "circle-color": COLORS.city,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5
    }
  });

  createCityMarkers();
  updateSiteMarkers(activeFeatures());
  map.on("click", "historical-site-points", (event) => {
    const entitySiteId = event.features?.[0]?.properties?.EntitySiteID;
    if (entitySiteId != null) {
      state.selectedId = String(entitySiteId);
      updateRecord(activeFeatures());
    }
  });
  map.on("mouseenter", "historical-site-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "historical-site-points", () => {
    map.getCanvas().style.cursor = "";
  });

  state.ready = true;
  ui.loading.hidden = true;
  ui.downloadPng.disabled = false;
  ui.downloadSvg.disabled = false;
  updateHistoricalLayer();
  resetMap(false);
}

function resetMap(animate = true) {
  state.map?.fitBounds(
    [[119.25, 21.7], [122.1, 25.5]],
    { padding: 42, duration: animate ? 650 : 0 }
  );
}

function setupEvents() {
  ui.timeline.addEventListener("input", () => {
    state.index = Number(ui.timeline.value);
    updateHistoricalLayer();
  });

  let lastWheel = 0;
  ui.timelinePanel.addEventListener("wheel", (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheel < 180 || state.stops.length < 2) return;
    lastWheel = now;
    const direction = event.deltaY > 0 ? 1 : -1;
    state.index = Math.min(state.stops.length - 1, Math.max(0, state.index + direction));
    ui.timeline.value = String(state.index);
    updateHistoricalLayer();
  }, { passive: false });

  ui.showCounties.addEventListener("change", () => {
    if (state.ready) {
      state.map.setLayoutProperty(
        "county-lines",
        "visibility",
        ui.showCounties.checked ? "visible" : "none"
      );
    }
  });

  ui.showCities.addEventListener("change", () => {
    if (!state.ready) return;
    state.map.setLayoutProperty(
      "city-points",
      "visibility",
      ui.showCities.checked ? "visible" : "none"
    );
    state.cityMarkers.forEach((marker) => {
      marker.getElement().style.display = ui.showCities.checked ? "block" : "none";
    });
  });

  ui.resetMap.addEventListener("click", () => resetMap(true));
  ui.downloadPng.addEventListener("click", downloadPng);
  ui.downloadSvg.addEventListener("click", downloadSvg);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function waitForMapRender() {
  await new Promise((resolve) => {
    state.map.once("render", resolve);
    state.map.triggerRepaint();
  });
}

function siteRadiusAtZoom(zoom) {
  if (zoom <= 4) return 4.5;
  if (zoom <= 7) return 4.5 + (zoom - 4) * (2 / 3);
  if (zoom <= 10) return 6.5 + (zoom - 7) * (2.5 / 3);
  return Math.min(11, 9 + (zoom - 10));
}

function drawLabel(context, textValue, x, y, ratio, color, size = 15) {
  context.font = "700 " + (size * ratio) + "px Arial, sans-serif";
  context.strokeStyle = "rgba(255,255,255,.96)";
  context.lineWidth = 4 * ratio;
  context.strokeText(textValue, x, y);
  context.fillStyle = color;
  context.fillText(textValue, x, y);
}

async function downloadPng() {
  if (!state.ready) return;
  await waitForMapRender();
  const map = state.map;
  const source = map.getCanvas();
  const output = document.createElement("canvas");
  output.width = source.width;
  output.height = source.height;
  const context = output.getContext("2d");
  if (!context) return;

  context.drawImage(source, 0, 0);
  const ratio = output.width / map.getContainer().clientWidth;
  context.textBaseline = "middle";
  context.lineJoin = "round";

  if (ui.showCities.checked) {
    state.cities.features.forEach((feature) => {
      const point = map.project(feature.geometry.coordinates);
      drawLabel(context, textProp(feature, "NameZh"), (point.x + 8) * ratio,
        point.y * ratio, ratio, COLORS.ink || "#20383e", 14);
    });
  }

  const seen = new Set();
  activeFeatures().forEach((feature) => {
    const siteId = textProp(feature, "SiteID", feature.id);
    if (seen.has(siteId)) return;
    seen.add(siteId);
    const point = map.project(feature.geometry.coordinates);
    const x = point.x * ratio;
    const y = point.y * ratio;
    const radius = siteRadiusAtZoom(map.getZoom()) * ratio;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = textProp(feature, "DisplayColor", COLORS.culture);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2 * ratio;
    context.stroke();
    drawLabel(context, textProp(feature, "SiteNameZh"), x + 11 * ratio,
      y, ratio, "#6f2f20", 15);
  });

  drawLabel(context, formatYear(currentYear()), 22 * ratio, 28 * ratio,
    ratio, "#20383e", 18);

  output.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, "P118_" + formatYear(currentYear()).replaceAll(" ", "") + "_transparent.png");
    }
  }, "image/png");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function linePath(coordinates, close = false) {
  if (!coordinates.length) return "";
  const points = coordinates.map((coordinate) => state.map.project(coordinate));
  return points.map((point, index) =>
    (index === 0 ? "M" : "L") + point.x.toFixed(2) + " " + point.y.toFixed(2)
  ).join(" ") + (close ? " Z" : "");
}

function geometryPath(geometry) {
  if (!geometry) return "";
  if (geometry.type === "LineString") return linePath(geometry.coordinates);
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) => linePath(line)).join(" ");
  }
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => linePath(ring, true)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map((ring) => linePath(ring, true)))
      .join(" ");
  }
  return "";
}

function featurePaths(collection, prefix) {
  return collection.features.map((feature, index) =>
    '<path id="' + prefix + "-" + (index + 1) + '" d="' +
    geometryPath(feature.geometry) + '"/>'
  ).join("");
}

function downloadSvg() {
  if (!state.ready) return;
  const map = state.map;
  const width = map.getContainer().clientWidth;
  const height = map.getContainer().clientHeight;
  const land = featurePaths(state.counties, "land");
  const counties = ui.showCounties.checked ? featurePaths(state.counties, "county") : "";
  const coast = featurePaths(state.coastline, "coastline");
  const radius = siteRadiusAtZoom(map.getZoom());
  const seen = new Set();

  const sites = activeFeatures().map((feature) => {
    const siteId = textProp(feature, "SiteID", feature.id);
    if (seen.has(siteId)) return "";
    seen.add(siteId);
    const point = map.project(feature.geometry.coordinates);
    const slug = safeId(textProp(feature, "SiteSlug", siteId));
    const color = escapeXml(textProp(feature, "DisplayColor", COLORS.culture));
    return '<g id="site-' + slug + '" data-culture="' +
      escapeXml(textProp(feature, "CultureSlug")) + '" data-start-year="' +
      numberProp(feature, "StartYear") + '" data-end-year="' +
      numberProp(feature, "EndYear") + '"><circle cx="' +
      point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="' +
      radius.toFixed(2) + '" fill="' + color +
      '" stroke="#ffffff" stroke-width="2"/><text x="' +
      (point.x + 11).toFixed(2) + '" y="' + (point.y + 5).toFixed(2) + '">' +
      escapeXml(textProp(feature, "SiteNameZh")) + "</text></g>";
  }).join("");

  const cities = ui.showCities.checked ? state.cities.features.map((feature) => {
    const point = map.project(feature.geometry.coordinates);
    return '<g id="city-' + safeId(textProp(feature, "CityID")) +
      '"><circle cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) +
      '" r="4"/><text x="' + (point.x + 8).toFixed(2) + '" y="' +
      (point.y + 4).toFixed(2) + '">' + escapeXml(textProp(feature, "NameZh")) +
      "</text></g>";
  }).join("") : "";

  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
    '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">\n' +
    "<title>P118 先民地圖 — " + escapeXml(formatYear(currentYear())) + "</title>\n" +
    "<metadata>Generated by P118 V0.3.1 Evidence &amp; Sites. Current Web Mercator viewport.</metadata>\n" +
    '<g id="land" fill="' + COLORS.land + '" stroke="none" fill-rule="evenodd">' + land + "</g>\n" +
    '<g id="modern-counties" fill="none" stroke="' + COLORS.county +
    '" stroke-width="0.8">' + counties + "</g>\n" +
    '<g id="archaeological-sites" font-family="Noto Sans TC,Arial,sans-serif" font-size="15" font-weight="700" fill="#6f2f20">' +
    sites + "</g>\n" +
    '<g id="coastline" fill="none" stroke="' + COLORS.coast +
    '" stroke-width="1.35">' + coast + "</g>\n" +
    '<g id="cities" fill="' + COLORS.city +
    '" font-family="Noto Sans TC,Arial,sans-serif" font-size="14" font-weight="600">' +
    cities + "</g>\n" +
    '<g id="annotations" fill="#20383e" font-family="Noto Sans TC,Arial,sans-serif" font-size="18" font-weight="700">' +
    '<text x="22" y="30">' + escapeXml(formatYear(currentYear())) + "</text></g>\n" +
    "</svg>";

  downloadBlob(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    "P118_" + formatYear(currentYear()).replaceAll(" ", "") + "_editable.svg"
  );
}

async function initialize() {
  setupEvents();
  try {
    const [counties, coastline, cities, sites] = await Promise.all([
      fetchJson("./data/base/taiwan_counties.geojson"),
      fetchJson("./data/base/taiwan_coastline.geojson"),
      fetchJson("./data/base/taiwan_cities.geojson"),
      fetchTimelineSites()
    ]);
    state.counties = counties;
    state.coastline = coastline;
    state.cities = cities;
    state.sites = sites.data;
    state.sourceMode = sites.mode;
    ui.dataStatus.textContent = sites.mode === "supabase"
      ? "Supabase 遺址資料"
      : "V0.2 本機示意資料";
    buildStops();
    updateTimeline();
    updateRecord(activeFeatures());

    state.map = new MapLibreMap({
      container: "map",
      style: {
        version: 8,
        sources: {},
        layers: [{
          id: "transparent-background",
          type: "background",
          paint: { "background-color": "rgba(0,0,0,0)" }
        }]
      },
      center: [120.9, 23.7],
      zoom: 6.1,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
      canvasContextAttributes: { alpha: true, preserveDrawingBuffer: true }
    });
    state.map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    state.map.on("load", addMapContent);
  } catch (error) {
    console.error(error);
    ui.loading.textContent = "地圖資料載入失敗，請確認檔案已完整上傳。";
    ui.dataStatus.textContent = "載入失敗";
  }
}

initialize();
