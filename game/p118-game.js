(() => {
  "use strict";

  const GAME_VERSION = "0.1.0";
  const MAIN_ROUNDS = 6;
  const OVERTIME_ROUNDS = 8;
  const MAP_CENTER = [120.92, 23.72];
  const MAP_ZOOM = 6.45;

  const state = {
    map: null,
    guessMarker: null,
    answerMarker: null,
    questions: [],
    round: 0,
    scores: { red: 0, white: 0 },
    mapTouched: false,
    timeTouched: false,
    answerLocked: false,
    selectedYear: null,
    sourceMode: "fallback",
    inOvertime: false,
    roundTarget: MAIN_ROUNDS
  };

  const el = (id) => document.getElementById(id);
  const ui = {
    redScore: el("redScore"), whiteScore: el("whiteScore"), roundNumber: el("roundNumber"),
    turnBanner: el("turnBanner"), turnTeam: el("turnTeam"), questionTitle: el("questionTitle"),
    questionEnglish: el("questionEnglish"), dataStatus: el("dataStatus"), timeline: el("gameTimeline"),
    selectedYear: el("selectedYear"), correctRange: el("correctRange"), feedback: el("feedback"),
    distanceResult: el("distanceResult"), locationPoints: el("locationPoints"),
    yearResult: el("yearResult"), timePoints: el("timePoints"), roundScore: el("roundScore"),
    answerSummary: el("answerSummary"), lockAnswer: el("lockAnswer"), nextRound: el("nextRound"),
    startDialog: el("startDialog"), resultDialog: el("resultDialog"), startGame: el("startGame"),
    restartGame: el("restartGame"), finalRed: el("finalRed"), finalWhite: el("finalWhite"),
    winnerTitle: el("winnerTitle"), winnerMessage: el("winnerMessage")
  };

  function formatYear(year) {
    if (year < 0) return "BC " + Math.abs(year).toLocaleString("en-US");
    if (year > 0) return "AD " + year.toLocaleString("en-US");
    return "AD 1";
  }

  function formatPeriod(startYear, endYear) {
    return formatYear(startYear) + "–" + formatYear(endYear);
  }

  function sliderToYear(value) {
    const position = Number(value);
    let year;
    if (position <= 300) {
      year = -30000 + (position / 300) * 24000;
    } else if (position <= 700) {
      year = -6000 + ((position - 300) / 400) * 5000;
    } else {
      year = -1000 + ((position - 700) / 300) * 2750;
    }
    year = Math.round(year / 10) * 10;
    if (year === 0) year = 1;
    return year;
  }

  function yearToSlider(year) {
    const value = Number(year);
    if (value <= -6000) return ((value + 30000) / 24000) * 300;
    if (value <= -1000) return 300 + ((value + 6000) / 5000) * 400;
    return 700 + ((value + 1000) / 2750) * 300;
  }

  function yearOrdinal(year) {
    return year > 0 ? year - 1 : year;
  }

  function distanceToPeriod(year, startYear, endYear) {
    const target = yearOrdinal(year);
    const start = yearOrdinal(startYear);
    const end = yearOrdinal(endYear);
    if (target >= start && target <= end) return 0;
    return Math.min(Math.abs(target - start), Math.abs(target - end));
  }

  function haversineKm(from, to) {
    const radius = 6371.0088;
    const radians = (degrees) => degrees * Math.PI / 180;
    const lat1 = radians(from.lat);
    const lat2 = radians(to.lat);
    const deltaLat = radians(to.lat - from.lat);
    const deltaLng = radians(to.lng - from.lng);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function locationScore(distance, tolerance) {
    if (distance <= tolerance) return 50;
    if (distance <= 50) return 40;
    if (distance <= 100) return 30;
    if (distance <= 200) return 20;
    if (distance <= 300) return 10;
    return 0;
  }

  function timeScore(errorYears) {
    if (errorYears === 0) return 50;
    if (errorYears <= 250) return 40;
    if (errorYears <= 500) return 30;
    if (errorYears <= 1000) return 20;
    if (errorYears <= 2000) return 10;
    return 0;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  async function fetchTimelineRows() {
    const config = window.P118_CONFIG || {};
    const url = String(config.SUPABASE_URL || "").trim().replace(/\/$/, "");
    const key = String(config.SUPABASE_ANON_KEY || "").trim();
    if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_")) return null;
    const rpc = String(config.TIMELINE_RPC || "P118_GetTimelineSites").trim();
    const response = await fetch(url + "/rest/v1/rpc/" + rpc, {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: "{}"
    });
    if (!response.ok) throw new Error("Supabase HTTP " + response.status);
    return response.json();
  }

  function buildFallbackQuestion(definition) {
    const fallback = definition.fallback;
    return {
      cultureSlug: definition.cultureSlug,
      siteSlug: definition.siteSlug,
      toleranceKm: definition.toleranceKm,
      titleZh: fallback.titleZh,
      titleEn: fallback.titleEn,
      cultureZh: fallback.cultureZh,
      longitude: Number(fallback.longitude), latitude: Number(fallback.latitude),
      startYear: Number(fallback.startYear), endYear: Number(fallback.endYear)
    };
  }

  async function loadQuestions() {
    const definitions = Array.isArray(window.P118_GAME_QUESTIONS) ? window.P118_GAME_QUESTIONS : [];
    let rows = null;
    try {
      rows = await fetchTimelineRows();
    } catch (error) {
      console.warn("P118遊戲暫時無法取得Supabase資料，改用內建展示資料。", error);
    }

    const questions = definitions.map((definition) => {
      const row = rows?.find((item) => item.CultureSlug === definition.cultureSlug && item.SiteSlug === definition.siteSlug);
      if (!row) return buildFallbackQuestion(definition);
      return {
        cultureSlug: definition.cultureSlug,
        siteSlug: definition.siteSlug,
        toleranceKm: definition.toleranceKm,
        titleZh: String(row.SiteNameZh || definition.fallback.titleZh),
        titleEn: String(row.SiteNameEn || definition.fallback.titleEn),
        cultureZh: String(row.TitleZh || definition.fallback.cultureZh),
        longitude: Number(row.Longitude), latitude: Number(row.Latitude),
        startYear: Number(row.StartYear), endYear: Number(row.EndYear)
      };
    }).filter((question) => Number.isFinite(question.longitude) && Number.isFinite(question.latitude) &&
      Number.isFinite(question.startYear) && Number.isFinite(question.endYear));

    state.sourceMode = rows ? "supabase" : "fallback";
    return questions;
  }

  function createMarkerElement(className, content) {
    const marker = document.createElement("div");
    marker.className = className;
    marker.textContent = content;
    return marker;
  }

  function initMap() {
    return new Promise((resolve) => {
      state.map = new maplibregl.Map({
        container: "gameMap",
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        minZoom: 6,
        maxZoom: 8,
        dragPan: false,
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: false,
        touchZoomRotate: false,
        keyboard: false,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            coastline: { type: "geojson", data: "../data/base/taiwan_coastline.geojson" },
            counties: { type: "geojson", data: "../data/base/taiwan_counties.geojson" },
            answerLine: { type: "geojson", data: { type: "FeatureCollection", features: [] } }
          },
          layers: [
            { id: "background", type: "background", paint: { "background-color": "#d7e8e5" } },
            { id: "taiwan-fill", type: "fill", source: "counties", paint: { "fill-color": "#f4efe3", "fill-opacity": 1 } },
            { id: "taiwan-coast", type: "line", source: "coastline", paint: { "line-color": "#28494e", "line-width": 2.1 } },
            { id: "county-lines", type: "line", source: "counties", paint: { "line-color": "#91a5a1", "line-width": 0.8, "line-opacity": 0.72 } },
            { id: "answer-line", type: "line", source: "answerLine", paint: { "line-color": "#b37824", "line-width": 3, "line-dasharray": [2, 2] } }
          ]
        }
      });

      state.map.once("load", () => {
        const guessElement = createMarkerElement("p118-game-guess-marker", "遺址");
        state.guessMarker = new maplibregl.Marker({ element: guessElement, draggable: true, anchor: "center" })
          .setLngLat(MAP_CENTER).addTo(state.map);
        state.guessMarker.on("dragstart", () => { state.mapTouched = true; updateLockState(); });
        state.guessMarker.on("dragend", () => { state.mapTouched = true; updateLockState(); });
        state.map.on("click", (event) => {
          if (state.answerLocked) return;
          state.guessMarker.setLngLat(event.lngLat);
          state.mapTouched = true;
          updateLockState();
        });
        resolve();
      });
    });
  }

  function currentTeam() {
    return state.round % 2 === 0 ? "red" : "white";
  }

  function currentQuestion() {
    return state.questions[state.round];
  }

  function updateLockState() {
    ui.lockAnswer.disabled = state.answerLocked || !state.mapTouched || !state.timeTouched;
  }

  function clearAnswerMap() {
    if (state.answerMarker) {
      state.answerMarker.remove();
      state.answerMarker = null;
    }
    const source = state.map.getSource("answerLine");
    source?.setData({ type: "FeatureCollection", features: [] });
  }

  function beginRound() {
    const question = currentQuestion();
    const team = currentTeam();
    state.mapTouched = false;
    state.timeTouched = false;
    state.answerLocked = false;
    state.selectedYear = null;
    clearAnswerMap();

    ui.turnBanner.dataset.team = team;
    ui.turnTeam.textContent = team === "red" ? "紅隊" : "白隊";
    ui.roundNumber.textContent = (state.round + 1) + " / " + state.roundTarget;
    ui.questionTitle.textContent = question.titleZh;
    ui.questionEnglish.textContent = question.titleEn;
    ui.feedback.hidden = true;
    ui.correctRange.hidden = true;
    ui.lockAnswer.hidden = false;
    ui.lockAnswer.disabled = true;
    ui.nextRound.hidden = true;
    ui.timeline.disabled = false;
    ui.timeline.value = "500";
    ui.selectedYear.textContent = "尚未選擇";

    const markerElement = state.guessMarker.getElement();
    markerElement.dataset.team = team;
    markerElement.textContent = question.titleZh.replace("考古遺址", "").replace("遺址", "").slice(0, 4);
    state.guessMarker.setLngLat(MAP_CENTER);
    state.guessMarker.setDraggable(true);
    state.map.jumpTo({ center: MAP_CENTER, zoom: MAP_ZOOM });
  }

  function showCorrectRange(question) {
    const start = Math.max(0, Math.min(1000, yearToSlider(question.startYear)));
    const end = Math.max(0, Math.min(1000, yearToSlider(question.endYear)));
    ui.correctRange.style.left = (Math.min(start, end) / 10) + "%";
    ui.correctRange.style.width = Math.max(1.2, Math.abs(end - start) / 10) + "%";
    ui.correctRange.hidden = false;
  }

  function revealMapAnswer(question, guess) {
    const answerElement = createMarkerElement("p118-game-answer-marker", "★");
    state.answerMarker = new maplibregl.Marker({ element: answerElement, anchor: "center" })
      .setLngLat([question.longitude, question.latitude]).addTo(state.map);
    const line = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[guess.lng, guess.lat], [question.longitude, question.latitude]] },
        properties: {}
      }]
    };
    state.map.getSource("answerLine")?.setData(line);
    const bounds = new maplibregl.LngLatBounds([guess.lng, guess.lat], [guess.lng, guess.lat]);
    bounds.extend([question.longitude, question.latitude]);
    state.map.fitBounds(bounds, { padding: 90, maxZoom: 7.4, duration: 650 });
  }

  function lockAnswer() {
    if (ui.lockAnswer.disabled || state.answerLocked) return;
    const question = currentQuestion();
    const team = currentTeam();
    const guess = state.guessMarker.getLngLat();
    const target = { lng: question.longitude, lat: question.latitude };
    const distance = haversineKm(guess, target);
    const yearError = distanceToPeriod(state.selectedYear, question.startYear, question.endYear);
    const mapPoints = locationScore(distance, question.toleranceKm);
    const datePoints = timeScore(yearError);
    const total = mapPoints + datePoints;

    state.answerLocked = true;
    state.scores[team] += total;
    ui.redScore.textContent = state.scores.red;
    ui.whiteScore.textContent = state.scores.white;
    ui.distanceResult.textContent = Math.round(distance).toLocaleString("en-US") + " 公里";
    ui.locationPoints.textContent = "位置 " + mapPoints + " / 50";
    ui.yearResult.textContent = yearError === 0 ? "落在年代範圍內" : "相差約 " + yearError.toLocaleString("en-US") + " 年";
    ui.timePoints.textContent = "年代 " + datePoints + " / 50";
    ui.roundScore.textContent = total + " 分";
    ui.answerSummary.textContent = question.titleZh + "的代表位置已以金色星號標示；相關" + question.cultureZh + "年代為" + formatPeriod(question.startYear, question.endYear) + "。";
    ui.feedback.hidden = false;
    ui.lockAnswer.hidden = true;
    ui.nextRound.hidden = false;
    if (!state.inOvertime && state.round + 1 >= MAIN_ROUNDS) {
      ui.nextRound.textContent = state.scores.red === state.scores.white ? "平手：進入延長賽" : "查看比賽結果";
    } else if (state.inOvertime && state.round + 1 >= OVERTIME_ROUNDS) {
      ui.nextRound.textContent = "查看比賽結果";
    } else {
      ui.nextRound.textContent = "下一隊";
    }
    ui.timeline.disabled = true;
    state.guessMarker.setDraggable(false);
    showCorrectRange(question);
    revealMapAnswer(question, guess);
  }

  function showResult() {
    ui.finalRed.textContent = state.scores.red;
    ui.finalWhite.textContent = state.scores.white;
    if (state.scores.red > state.scores.white) {
      ui.winnerTitle.textContent = "紅隊獲勝";
      ui.winnerMessage.textContent = "紅隊把遺址放得更接近正確的空間與時間。";
    } else if (state.scores.white > state.scores.red) {
      ui.winnerTitle.textContent = "白隊獲勝";
      ui.winnerMessage.textContent = "白隊把遺址放得更接近正確的空間與時間。";
    } else {
      ui.winnerTitle.textContent = "本場平手";
      ui.winnerMessage.textContent = "目前預覽版先記錄平手；正式版可再加入紅白各一題的延長賽。";
    }
    ui.resultDialog.showModal();
  }

  function nextRound() {
    if (!state.inOvertime && state.round + 1 >= MAIN_ROUNDS) {
      if (state.scores.red !== state.scores.white) {
        showResult();
        return;
      }
      state.inOvertime = true;
      state.roundTarget = OVERTIME_ROUNDS;
    } else if (state.inOvertime && state.round + 1 >= OVERTIME_ROUNDS) {
      showResult();
      return;
    }
    state.round += 1;
    beginRound();
  }

  function startGame() {
    state.round = 0;
    state.scores = { red: 0, white: 0 };
    state.inOvertime = false;
    state.roundTarget = MAIN_ROUNDS;
    state.questions = shuffle(state.questions);
    ui.redScore.textContent = "0";
    ui.whiteScore.textContent = "0";
    if (ui.startDialog.open) ui.startDialog.close();
    if (ui.resultDialog.open) ui.resultDialog.close();
    beginRound();
  }

  ui.timeline.addEventListener("input", () => {
    if (state.answerLocked) return;
    state.selectedYear = sliderToYear(ui.timeline.value);
    state.timeTouched = true;
    ui.selectedYear.textContent = formatYear(state.selectedYear);
    updateLockState();
  });
  ui.lockAnswer.addEventListener("click", lockAnswer);
  ui.nextRound.addEventListener("click", nextRound);
  ui.startGame.addEventListener("click", startGame);
  ui.restartGame.addEventListener("click", startGame);

  async function init() {
    await initMap();
    state.questions = await loadQuestions();
    if (state.questions.length < OVERTIME_ROUNDS) throw new Error("可用題目不足八題");
    ui.dataStatus.textContent = state.sourceMode === "supabase" ? "P118公開資料" : "內建展示資料";
    ui.startDialog.showModal();
    console.info("P118 Game Preview", GAME_VERSION);
  }

  init().catch((error) => {
    console.error(error);
    ui.dataStatus.textContent = "遊戲載入失敗";
    ui.questionTitle.textContent = "請返回探索模式";
    ui.lockAnswer.disabled = true;
  });
})();
