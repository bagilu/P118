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
  historical: EMPTY,
  stops: [-5000, -2700],
  index: 0,
  selectedId: null,
  map: null,
  markers: [],
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

async function fetchHistorical() {
  const config = window.P118_CONFIG || {};
  const url = String(config.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(config.SUPABASE_ANON_KEY || "").trim();

  if (url && key) {
    try {
      const rpc = String(config.TIMELINE_RPC || "P118_GetTimelineFeatures").trim();
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
            id: String(row.GeometryID || row.EntityID),
            geometry: typeof row.GeometryGeoJSON === "string"
              ? JSON.parse(row.GeometryGeoJSON)
              : row.GeometryGeoJSON,
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
              LabelLatitude: row.LabelLatitude
            }
          }))
        }
      };
    } catch (error) {
      console.warn("Supabase 暫時無法使用，改用示意資料。", error);
    }
  }

  return {
    mode: "demo",
    data: await fetchJson("./data/demo/historical_features.geojson")
  };
}

function currentYear() {
  return state.stops[state.index] ?? state.stops[0] ?? -5000;
}

function activeFeatures() {
  const year = currentYear();
  return state.historical.features.filter((feature) => activeAt(feature, year));
}

function buildStops() {
  const values = state.historical.features.flatMap((feature) => [
    numberProp(feature, "StartYear"),
    numberProp(feature, "EndYear")
  ]);
  state.stops = [...new Set(values)].filter((year) => year !== 0).sort((a, b) => a - b);
  if (!state.stops.length) state.stops = [-5000, -2700];
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
    (feature) => String(numberProp(feature, "EntityID")) === String(state.selectedId)
  );
  return existing || features[0];
}

function updateRecord(features) {
  const feature = chooseSelected(features);
  if (!feature) {
    ui.record.hidden = true;
    ui.emptyRecord.hidden = false;
    return;
  }

  state.selectedId = String(numberProp(feature, "EntityID"));
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
  ui.cultureSource.textContent = textProp(feature, "SourceCitation", "尚未提供");
}

function updateHistoricalLayer() {
  const features = activeFeatures();
  if (state.ready) {
    state.map.getSource("historical").setData({
      type: "FeatureCollection",
      features
    });
  }
  updateTimeline();
  updateRecord(features);
}

function createCityMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers = state.cities.features.map((feature) => {
    const label = document.createElement("div");
    label.className = "city-label";
    label.textContent = textProp(feature, "NameZh");
    const point = feature.geometry.coordinates;
    return new Marker({ element: label, anchor: "left", offset: [8, 0] })
      .setLngLat([point[0], point[1]])
      .addTo(state.map);
  });
}

function addMapContent() {
  const map = state.map;
  map.addSource("counties", { type: "geojson", data: state.counties });
  map.addSource("coastline", { type: "geojson", data: state.coastline });
  map.addSource("cities", { type: "geojson", data: state.cities });
  map.addSource("historical", {
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
    id: "historical-fill",
    type: "fill",
    source: "historical",
    paint: {
      "fill-color": ["coalesce", ["get", "DisplayColor"], COLORS.culture],
      "fill-opacity": 0.44
    }
  });
  map.addLayer({
    id: "historical-outline",
    type: "line",
    source: "historical",
    paint: {
      "line-color": ["coalesce", ["get", "DisplayColor"], COLORS.culture],
      "line-width": 2,
      "line-dasharray": [3, 2]
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
  map.on("click", "historical-fill", (event) => {
    const entityId = event.features?.[0]?.properties?.EntityID;
    if (entityId != null) {
      state.selectedId = String(entityId);
      updateRecord(activeFeatures());
    }
  });
  map.on("mouseenter", "historical-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "historical-fill", () => {
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
    state.markers.forEach((marker) => {
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
  context.font = "600 " + (15 * ratio) + "px Arial, sans-serif";

  if (ui.showCities.checked) {
    state.cities.features.forEach((feature) => {
      const coordinates = feature.geometry.coordinates;
      const point = map.project(coordinates);
      const x = point.x * ratio;
      const y = point.y * ratio;
      context.beginPath();
      context.arc(x, y, 4 * ratio, 0, Math.PI * 2);
      context.fillStyle = COLORS.city;
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5 * ratio;
      context.stroke();
      context.strokeStyle = "rgba(255,255,255,.94)";
      context.lineWidth = 4 * ratio;
      context.strokeText(textProp(feature, "NameZh"), x + 8 * ratio, y);
      context.fillStyle = "#20383e";
      context.fillText(textProp(feature, "NameZh"), x + 8 * ratio, y);
    });
  }

  activeFeatures().forEach((feature) => {
    const lng = numberProp(feature, "LabelLongitude", Number.NaN);
    const lat = numberProp(feature, "LabelLatitude", Number.NaN);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    const point = map.project([lng, lat]);
    const x = point.x * ratio;
    const y = point.y * ratio;
    context.font = "700 " + (16 * ratio) + "px Arial, sans-serif";
    context.strokeStyle = "rgba(255,255,255,.94)";
    context.lineWidth = 4 * ratio;
    context.strokeText(textProp(feature, "TitleZh"), x, y);
    context.fillStyle = "#7c331f";
    context.fillText(textProp(feature, "TitleZh"), x, y);
  });

  context.font = "700 " + (18 * ratio) + "px Arial, sans-serif";
  context.strokeStyle = "rgba(255,255,255,.95)";
  context.lineWidth = 5 * ratio;
  context.strokeText(formatYear(currentYear()), 22 * ratio, 28 * ratio);
  context.fillStyle = "#20383e";
  context.fillText(formatYear(currentYear()), 22 * ratio, 28 * ratio);

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
  const cultures = activeFeatures().map((feature) => {
    const slug = safeId(textProp(feature, "Slug", feature.id || "culture"));
    const color = escapeXml(textProp(feature, "DisplayColor", COLORS.culture));
    const lng = numberProp(feature, "LabelLongitude", Number.NaN);
    const lat = numberProp(feature, "LabelLatitude", Number.NaN);
    let label = "";
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      const point = map.project([lng, lat]);
      label = '<text x="' + point.x.toFixed(2) + '" y="' + point.y.toFixed(2) + '">' +
        escapeXml(textProp(feature, "TitleZh")) + '</text>';
    }
    return '<g id="culture-' + slug + '" data-start-year="' +
      numberProp(feature, "StartYear") + '" data-end-year="' +
      numberProp(feature, "EndYear") + '"><path d="' +
      geometryPath(feature.geometry) + '" fill="' + color +
      '" fill-opacity="0.44" stroke="' + color +
      '" stroke-width="2" stroke-dasharray="7 5"/>' + label + '</g>';
  }).join("");

  const cities = ui.showCities.checked ? state.cities.features.map((feature) => {
    const point = map.project(feature.geometry.coordinates);
    return '<g id="city-' + safeId(textProp(feature, "CityID")) +
      '"><circle cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) +
      '" r="4"/><text x="' + (point.x + 8).toFixed(2) + '" y="' +
      (point.y + 4).toFixed(2) + '">' + escapeXml(textProp(feature, "NameZh")) +
      '</text></g>';
  }).join("") : "";

  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
    '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">\n' +
    '<title>P118 先民地圖 — ' + escapeXml(formatYear(currentYear())) + '</title>\n' +
    '<metadata>Generated by P118 V0.1 Static. Current Web Mercator viewport.</metadata>\n' +
    '<g id="land" fill="' + COLORS.land + '" stroke="none" fill-rule="evenodd">' + land + '</g>\n' +
    '<g id="modern-counties" fill="none" stroke="' + COLORS.county +
    '" stroke-width="0.8">' + counties + '</g>\n' +
    '<g id="historical-cultures" font-family="Noto Sans TC,Arial,sans-serif" font-size="16" font-weight="700" fill="#7c331f">' +
    cultures + '</g>\n' +
    '<g id="coastline" fill="none" stroke="' + COLORS.coast +
    '" stroke-width="1.35">' + coast + '</g>\n' +
    '<g id="cities" fill="' + COLORS.city +
    '" font-family="Noto Sans TC,Arial,sans-serif" font-size="14" font-weight="600">' +
    cities + '</g>\n' +
    '<g id="annotations" fill="#20383e" font-family="Noto Sans TC,Arial,sans-serif" font-size="18" font-weight="700">' +
    '<text x="22" y="30">' + escapeXml(formatYear(currentYear())) + '</text></g>\n' +
    '</svg>';

  downloadBlob(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    "P118_" + formatYear(currentYear()).replaceAll(" ", "") + "_editable.svg"
  );
}

async function initialize() {
  setupEvents();
  try {
    const [counties, coastline, cities, historical] = await Promise.all([
      fetchJson("./data/base/taiwan_counties.geojson"),
      fetchJson("./data/base/taiwan_coastline.geojson"),
      fetchJson("./data/base/taiwan_cities.geojson"),
      fetchHistorical()
    ]);
    state.counties = counties;
    state.coastline = coastline;
    state.cities = cities;
    state.historical = historical.data;
    state.sourceMode = historical.mode;
    ui.dataStatus.textContent = historical.mode === "supabase"
      ? "Supabase 正式資料"
      : "V0.1 示意資料";
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
