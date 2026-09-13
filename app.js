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
  contextEvents: [],
  stops: [-28050, -3050],
  year: -28050,
  minYear: -28050,
  maxYear: -3050,
  selectedId: null,
  map: null,
  cityMarkers: [],
  siteMarkers: [],
  ready: false,
  sourceMode: "loading",
  contextShowing: false,
  currentContext: null,
  contextFadeTimer: null,
  movementIdleTimer: null,
  movementStartedAt: null,
  contextHovered: false,
  renderFrame: null,
  snapLockedUntil: 0,
  playbackDirection: 0,
  lastPlaybackDirection: 1,
  playbackTimer: null,
  playbackSpeed: "normal"
};

const el = (id) => document.getElementById(id);
const ui = {
  timeline: el("timeline"),
  timelineMarks: el("timelineMarks"),
  timelinePanel: el("timelinePanel"),
  timelineHelpButton: el("timelineHelpButton"),
  timelineHelp: el("timelineHelp"),
  yearDisplay: el("yearDisplay"),
  bpDisplay: el("bpDisplay"),
  mapYear: el("mapYear"),
  mapBp: el("mapBp"),
  firstYear: el("firstYear"),
  lastYear: el("lastYear"),
  showCounties: el("showCounties"),
  showCities: el("showCities"),
  showContext: el("showContext"),
  dataStatus: el("dataStatus"),
  loading: el("loading"),
  record: el("record"),
  emptyRecord: el("emptyRecord"),
  recordStatus: el("recordStatus"),
  cultureSwatch: el("cultureSwatch"),
  cultureTitle: el("cultureTitle"),
  cultureEnglish: el("cultureEnglish"),
  culturePeriod: el("culturePeriod"),
  culturePeriodBp: el("culturePeriodBp"),
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
  resetMap: el("resetMap"),
  contextToast: el("contextToast"),
  contextMeta: el("contextMeta"),
  contextTitle: el("contextTitle"),
  contextPeriod: el("contextPeriod"),
  contextSummary: el("contextSummary"),
  contextSource: el("contextSource"),
  playPast: el("playPast"),
  pausePlayback: el("pausePlayback"),
  playFuture: el("playFuture"),
  playbackSpeed: el("playbackSpeed"),
  playbackStatus: el("playbackStatus")
};

function formatYear(year) {
  if (year < 0) return "BC " + Math.abs(year).toLocaleString("en-US");
  if (year > 0) return "AD " + year.toLocaleString("en-US");
  return "紀元交界";
}

function formatPeriod(start, end) {
  if (start === end) return formatYear(start);
  return formatYear(start) + "–" + formatYear(end);
}

function bpFromYear(year) {
  if (year < 0) return Math.abs(year) + 1950;
  if (year > 0 && year <= 1950) return 1950 - year;
  return null;
}

function formatBP(year) {
  const bp = bpFromYear(year);
  return bp == null ? "" : "換算約 " + bp.toLocaleString("en-US") + " BP";
}

function formatPeriodBP(start, end) {
  const startBP = bpFromYear(start);
  const endBP = bpFromYear(end);
  if (startBP == null || endBP == null) return "";
  return "換算約 " + startBP.toLocaleString("en-US") + "–" +
    endBP.toLocaleString("en-US") + " BP";
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

async function fetchContextEvents() {
  const config = window.P118_CONFIG || {};
  const url = String(config.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(config.SUPABASE_ANON_KEY || "").trim();

  if (url && key) {
    try {
      const rpc = String(config.CONTEXT_RPC || "P118_GetContextEvents").trim();
      const response = await fetch(url + "/rest/v1/rpc/" + rpc, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (!response.ok) throw new Error("Context HTTP " + response.status);
      return await response.json();
    } catch (error) {
      console.warn("全球事件RPC尚未就緒，改用本機示範資料。", error);
    }
  }

  return fetchJson("./data/demo/context_events.json");
}

function currentYear() {
  return state.year;
}

function activeFeatures() {
  const year = currentYear();
  return state.sites.features.filter((feature) => activeAt(feature, year));
}

function buildStops() {
  const siteValues = state.sites.features.flatMap((feature) => [
    numberProp(feature, "StartYear"),
    numberProp(feature, "EndYear")
  ]);
  const contextValues = state.contextEvents.flatMap((event) => [
    Number(event.StartYear), Number(event.EndYear), Number(event.TriggerYear)
  ]);
  state.stops = [...new Set([...siteValues, ...contextValues])]
    .filter((year) => Number.isFinite(year) && year !== 0)
    .sort((a, b) => a - b);
  if (!state.stops.length) state.stops = [-28050, -3050];
  const allValues = [...siteValues, ...contextValues]
    .filter((year) => Number.isFinite(year) && year !== 0);
  state.minYear = Math.min(...allValues);
  state.maxYear = Math.max(...allValues);
  state.year = state.minYear;
  ui.timeline.min = String(state.minYear);
  ui.timeline.max = String(state.maxYear);
  ui.timeline.step = "1";
  ui.timeline.value = String(state.year);
  ui.timeline.disabled = state.minYear >= state.maxYear;
  renderTimelineMarks(siteValues, contextValues);
}

function renderTimelineMarks(siteValues, contextValues) {
  if (!ui.timelineMarks) return;
  const marks = new Map();
  const add = (year, kind) => {
    if (!Number.isFinite(year) || year === 0) return;
    const counts = marks.get(year) || { site: 0, context: 0 };
    counts[kind] += 1;
    marks.set(year, counts);
  };
  siteValues.forEach((year) => add(year, "site"));
  contextValues.forEach((year) => add(year, "context"));
  ui.timelineMarks.textContent = "";
  const range = state.maxYear - state.minYear;
  if (range <= 0) return;

  [...marks.entries()].sort((a, b) => a[0] - b[0]).forEach(([year, counts]) => {
    const mark = document.createElement("span");
    const total = counts.site + counts.context;
    mark.className = "timeline-mark";
    if (counts.site && counts.context) mark.classList.add("is-mixed");
    else if (counts.context) mark.classList.add("is-context");
    if (total >= 3) mark.classList.add("is-dense");
    mark.style.left = (((year - state.minYear) / range) * 100).toFixed(6) + "%";
    mark.dataset.year = String(year);
    mark.title = formatYear(year) + "｜" + total + "筆年代資料";
    ui.timelineMarks.appendChild(mark);
  });
}

function updateTimelineMarks(year) {
  if (!ui.timelineMarks) return;
  ui.timelineMarks.querySelectorAll(".timeline-mark").forEach((mark) => {
    mark.classList.toggle("is-current", Number(mark.dataset.year) === year);
  });
}

function updateTimeline() {
  const year = currentYear();
  ui.yearDisplay.value = formatYear(year);
  ui.yearDisplay.textContent = formatYear(year);
  ui.bpDisplay.textContent = formatBP(year);
  ui.bpDisplay.hidden = !formatBP(year);
  ui.mapYear.textContent = formatYear(year);
  ui.mapBp.textContent = formatBP(year);
  ui.mapBp.hidden = !formatBP(year);
  ui.firstYear.textContent = formatYear(state.minYear);
  ui.lastYear.textContent = formatYear(state.maxYear);
  ui.timeline.value = String(year);
  updateTimelineMarks(year);
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
  ui.culturePeriodBp.textContent = formatPeriodBP(
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

function eventsCrossed(previousYear, nextYear) {
  if (previousYear === nextYear || !ui.showContext.checked) return [];
  const forward = nextYear > previousYear;
  return state.contextEvents
    .filter((event) => {
      const trigger = Number(event.TriggerYear);
      return forward
        ? trigger > previousYear && trigger <= nextYear
        : trigger < previousYear && trigger >= nextYear;
    })
    .sort((a, b) => forward
      ? Number(a.TriggerYear) - Number(b.TriggerYear)
      : Number(b.TriggerYear) - Number(a.TriggerYear));
}

function hideContextEvent(immediate = false) {
  clearTimeout(state.contextFadeTimer);
  if (immediate) {
    ui.contextToast.hidden = true;
    ui.contextToast.classList.remove("is-visible", "is-leaving");
    state.contextShowing = false;
    state.currentContext = null;
    return;
  }
  if (!state.contextShowing) return;
  ui.contextToast.classList.remove("is-visible");
  ui.contextToast.classList.add("is-leaving");
  state.contextFadeTimer = setTimeout(() => {
    ui.contextToast.hidden = true;
    ui.contextToast.classList.remove("is-leaving");
    state.contextShowing = false;
    state.currentContext = null;
  }, 560);
}

function showContextEvent(event) {
  if (!event || !ui.showContext.checked) return;
  clearTimeout(state.contextFadeTimer);
  clearTimeout(state.movementIdleTimer);
  state.movementStartedAt = null;
  state.contextShowing = true;
  state.currentContext = event;
  ui.contextMeta.textContent = [event.RegionName, event.Category]
    .filter(Boolean).join(" · ").toUpperCase();
  ui.contextTitle.textContent = event.TitleZh;
  ui.contextPeriod.textContent = formatPeriod(Number(event.StartYear), Number(event.EndYear));
  ui.contextSummary.textContent = event.SummaryZh || "";
  setSourceLink(ui.contextSource, event.SourceURL);
  ui.contextToast.hidden = false;
  ui.contextToast.classList.remove("is-visible", "is-leaving");
  void ui.contextToast.offsetWidth;
  ui.contextToast.classList.add("is-visible");
}

function noteTimelineMovement() {
  if (!state.currentContext || !ui.showContext.checked) return;
  const now = Date.now();
  if (state.movementStartedAt == null) state.movementStartedAt = now;
  clearTimeout(state.movementIdleTimer);
  state.movementIdleTimer = setTimeout(() => {
    state.movementStartedAt = null;
  }, 900);
  if (now - state.movementStartedAt >= 3000 && !state.contextHovered) {
    state.movementStartedAt = null;
    hideContextEvent(false);
  }
}

function setTimelineYear(targetYear, showCrossedEvents = true) {
  const previousYear = state.year;
  let nextYear = Math.round(Math.min(state.maxYear, Math.max(state.minYear, targetYear)));
  if (nextYear === 0) nextYear = targetYear >= previousYear ? 1 : -1;
  if (nextYear === previousYear) return false;
  state.year = nextYear;
  const crossed = showCrossedEvents ? eventsCrossed(previousYear, nextYear) : [];
  if (crossed.length) showContextEvent(crossed[0]);
  else noteTimelineMovement();
  if (state.renderFrame) cancelAnimationFrame(state.renderFrame);
  state.renderFrame = requestAnimationFrame(() => {
    state.renderFrame = null;
    updateHistoricalLayer();
  });
  return true;
}

function nextStop(direction) {
  if (direction > 0) return state.stops.find((year) => year > state.year) ?? state.maxYear;
  return [...state.stops].reverse().find((year) => year < state.year) ?? state.minYear;
}

function adaptiveStep(distance, precise) {
  if (precise) return distance > 20 ? 5 : 1;
  if (distance > 5000) return 500;
  if (distance > 1000) return 100;
  if (distance > 200) return 25;
  if (distance > 50) return 10;
  return 5;
}

function moveTimeline(direction, precise = false, isAuto = false) {
  if (Date.now() < state.snapLockedUntil) return false;
  const stop = nextStop(direction);
  const distance = Math.abs(stop - state.year);
  const step = adaptiveStep(distance, precise);
  const candidate = state.year + direction * step;
  const target = direction > 0 ? Math.min(candidate, stop) : Math.max(candidate, stop);
  if (!setTimelineYear(target, true)) return false;
  if (target === stop && stop !== state.minYear && stop !== state.maxYear) {
    const isContextStop = state.contextEvents.some(
      (event) => Number(event.TriggerYear) === stop
    );
    const pauseDuration = isAuto
      ? (isContextStop ? 3000 : 900)
      : (precise ? 320 : 720);
    state.snapLockedUntil = Date.now() + pauseDuration;
  }
  return true;
}

function playbackInterval() {
  return { slow: 200, normal: 110, fast: 55 }[state.playbackSpeed] || 110;
}

function updatePlaybackUI(status) {
  ui.playPast.classList.toggle("is-active", state.playbackDirection < 0);
  ui.playFuture.classList.toggle("is-active", state.playbackDirection > 0);
  ui.pausePlayback.classList.toggle("is-active", state.playbackDirection === 0);
  ui.playPast.setAttribute("aria-pressed", String(state.playbackDirection < 0));
  ui.playFuture.setAttribute("aria-pressed", String(state.playbackDirection > 0));
  ui.pausePlayback.setAttribute("aria-pressed", String(state.playbackDirection === 0));
  if (status) ui.playbackStatus.textContent = status;
  else if (state.playbackDirection < 0) ui.playbackStatus.textContent = "自動往古代";
  else if (state.playbackDirection > 0) ui.playbackStatus.textContent = "自動往現代";
}

function pausePlayback(status = "人工操作") {
  clearTimeout(state.playbackTimer);
  state.playbackTimer = null;
  state.playbackDirection = 0;
  state.snapLockedUntil = 0;
  updatePlaybackUI(status);
}

function schedulePlayback(delay = playbackInterval()) {
  clearTimeout(state.playbackTimer);
  if (!state.playbackDirection) return;
  state.playbackTimer = setTimeout(playbackTick, delay);
}

function playbackTick() {
  if (!state.playbackDirection) return;
  const direction = state.playbackDirection;
  const boundaryReached = direction > 0
    ? state.year >= state.maxYear
    : state.year <= state.minYear;
  if (boundaryReached) {
    pausePlayback(direction > 0 ? "已抵達最近年代" : "已抵達最早年代");
    return;
  }
  const now = Date.now();
  if (now < state.snapLockedUntil) {
    schedulePlayback(Math.max(40, state.snapLockedUntil - now));
    return;
  }
  moveTimeline(direction, false, true);
  schedulePlayback();
}

function startPlayback(direction) {
  state.lastPlaybackDirection = direction;
  state.playbackDirection = direction;
  updatePlaybackUI();
  schedulePlayback(0);
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
  const savedSpeed = localStorage.getItem("P118_PLAYBACK_SPEED");
  if (["slow", "normal", "fast"].includes(savedSpeed)) {
    state.playbackSpeed = savedSpeed;
  }
  ui.playbackSpeed.value = state.playbackSpeed;
  updatePlaybackUI("人工操作");

  ui.timeline.addEventListener("input", () => {
    pausePlayback("人工操作");
    setTimelineYear(Number(ui.timeline.value), false);
  });

  let lastWheel = 0;
  ui.timelinePanel.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastWheel < 48 || state.stops.length < 2) return;
    lastWheel = now;
    pausePlayback("人工操作");
    const direction = event.deltaY > 0 ? 1 : -1;
    moveTimeline(direction, event.ctrlKey);
  }, { passive: false });

  document.addEventListener("wheel", (event) => {
    if (!event.ctrlKey || ui.timelinePanel.contains(event.target)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheel < 48 || state.stops.length < 2) return;
    lastWheel = now;
    pausePlayback("人工操作");
    moveTimeline(event.deltaY > 0 ? 1 : -1, true);
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

  ui.showContext.addEventListener("change", () => {
    if (ui.showContext.checked) return;
    clearTimeout(state.movementIdleTimer);
    state.movementStartedAt = null;
    hideContextEvent(true);
  });

  ui.playPast.addEventListener("click", () => startPlayback(-1));
  ui.pausePlayback.addEventListener("click", () => pausePlayback("已暫停"));
  ui.playFuture.addEventListener("click", () => startPlayback(1));
  ui.playbackSpeed.addEventListener("change", () => {
    state.playbackSpeed = ui.playbackSpeed.value;
    localStorage.setItem("P118_PLAYBACK_SPEED", state.playbackSpeed);
    if (state.playbackDirection) schedulePlayback(0);
  });

  ui.contextToast.addEventListener("mouseenter", () => {
    state.contextHovered = true;
  });
  ui.contextToast.addEventListener("mouseleave", () => {
    state.contextHovered = false;
    if (state.movementStartedAt != null && Date.now() - state.movementStartedAt >= 3000) {
      state.movementStartedAt = null;
      hideContextEvent(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (["input", "select", "button", "textarea", "a"].includes(tagName)) return;
    event.preventDefault();
    if (state.playbackDirection) pausePlayback("已暫停");
    else startPlayback(state.lastPlaybackDirection);
  });

  ui.resetMap.addEventListener("click", () => resetMap(true));
  ui.downloadPng.addEventListener("click", downloadPng);
  ui.downloadSvg.addEventListener("click", downloadSvg);

  if (ui.timelineHelpButton && ui.timelineHelp) {
    const setTimelineHelp = (show) => {
      ui.timelineHelp.hidden = !show;
      ui.timelineHelpButton.setAttribute("aria-expanded", String(show));
    };
    ui.timelineHelpButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setTimelineHelp(ui.timelineHelp.hidden);
    });
    ui.timelineHelp.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("click", () => setTimelineHelp(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setTimelineHelp(false);
    });
  }
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
  const bpLabel = formatBP(currentYear());
  if (bpLabel) {
    drawLabel(context, bpLabel, 22 * ratio, 50 * ratio,
      ratio, "#5e7478", 11);
  }
  if (state.currentContext && ui.showContext.checked) {
    context.textAlign = "right";
    drawLabel(context, state.currentContext.TitleZh,
      output.width - 22 * ratio, 28 * ratio, ratio, "#9e3f2d", 16);
    drawLabel(context,
      formatPeriod(Number(state.currentContext.StartYear), Number(state.currentContext.EndYear)),
      output.width - 22 * ratio, 50 * ratio, ratio, "#52696d", 11);
    context.textAlign = "start";
  }

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
  const bpLabel = formatBP(currentYear());

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

  const contextAnnotation = state.currentContext && ui.showContext.checked
    ? '<g id="world-context" text-anchor="end"><text x="' + (width - 22) +
      '" y="30" font-size="16" fill="#9e3f2d">' +
      escapeXml(state.currentContext.TitleZh) + '</text><text x="' + (width - 22) +
      '" y="50" font-size="11" fill="#52696d">' +
      escapeXml(formatPeriod(Number(state.currentContext.StartYear), Number(state.currentContext.EndYear))) +
      '</text></g>\n'
    : "";

  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
    '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">\n' +
    "<title>P118 先民地圖 — " + escapeXml(formatYear(currentYear())) + "</title>\n" +
    "<metadata>Generated by P118 V0.4.2.1 Timeline Data Marks. Current Web Mercator viewport.</metadata>\n" +
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
    '<text x="22" y="30">' + escapeXml(formatYear(currentYear())) + '</text>' +
    (bpLabel ? '<text x="22" y="50" font-size="11" fill="#5e7478">' + escapeXml(bpLabel) + '</text>' : '') +
    "</g>\n" + contextAnnotation +
    "</svg>";

  downloadBlob(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    "P118_" + formatYear(currentYear()).replaceAll(" ", "") + "_editable.svg"
  );
}

async function initialize() {
  setupEvents();
  try {
    const [counties, coastline, cities, sites, contextEvents] = await Promise.all([
      fetchJson("./data/base/taiwan_counties.geojson"),
      fetchJson("./data/base/taiwan_coastline.geojson"),
      fetchJson("./data/base/taiwan_cities.geojson"),
      fetchTimelineSites(),
      fetchContextEvents()
    ]);
    state.counties = counties;
    state.coastline = coastline;
    state.cities = cities;
    state.sites = sites.data;
    state.contextEvents = Array.isArray(contextEvents) ? contextEvents : [];
    state.sourceMode = sites.mode;
    ui.dataStatus.textContent = sites.mode === "supabase"
      ? "Supabase 遺址資料"
      : "V0.4.2.1 本機示意資料";
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
