// === storage key name ===
const STORAGE_KEY = "weeklyWeightTable_v2";

// === element references ===
const els = {
  // plan + table
  startingWeight: document.getElementById("starting-weight"),
  generatePlan: document.getElementById("generate-plan"),
  clearPlan: document.getElementById("clear-plan"),
  tbody: document.querySelector("#entries tbody"),
  // stats + charts
  statStart: document.getElementById("stat-start"),
  statLatest: document.getElementById("stat-latest"),
  statTotal: document.getElementById("stat-total"),
  statAvg: document.getElementById("stat-avg"),
  trend: document.getElementById("trend"),
  trendMulti: document.getElementById("trendMulti"),
  // tdee calculator refs
  unitMode: document.getElementById("unit-mode"),
  tdeeSex: document.getElementById("tdee-sex"),
  tdeeAge: document.getElementById("tdee-age"),
  tdeeFt: document.getElementById("tdee-height-ft"),
  tdeeIn: document.getElementById("tdee-height-in"),
  tdeeLb: document.getElementById("tdee-weight-lb"),
  tdeeCm: document.getElementById("tdee-height-cm"),
  tdeeKg: document.getElementById("tdee-weight-kg"),
  tdeeActivity: document.getElementById("tdee-activity"),
  lossRate: document.getElementById("loss-rate"),
  calcTDEE: document.getElementById("calc-tdee"),
  tdeeOutput: document.getElementById("tdee-output"),
  calorieTargetLine: document.getElementById("calorie-target-line"),
  calorieNote: document.getElementById("calorie-note"),
};

// === default visible series ===
const DEFAULT_VIS = {
  current: true,   // Weight
  bodyFat: true,   // Body Fat %
  muscle: false,   // Muscle
  water: false,    // Water %
  bpSys: false,    // BP systolic
  bpDia: false,    // BP diastolic
  waist: true      // Waist
};

// === app state shape ===
let state = load();
// { startingWeight, rows[12], seriesVisible, unitMode, tdeeInputs, tdee, targetCalories }

// === template for empty row ===
function emptyRow() {
  return {
    date: "", time: "", goal: "", current: "",
    bodyFat: "", muscle: "", water: "", bp: "", waist: ""
  };
}

// === load state from localStorage ===
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.rows) && data.rows.length) {
      // normalize rows to 12 later via ensureTwelveRows()
      data.seriesVisible = { ...DEFAULT_VIS, ...(data.seriesVisible || {}) };
      data.unitMode = data.unitMode === "metric" ? "metric" : "us";
      data.tdeeInputs = {
        sex: (data.tdeeInputs && data.tdeeInputs.sex) || "male",
        age: (data.tdeeInputs && data.tdeeInputs.age) || null,
        heightFt: (data.tdeeInputs && data.tdeeInputs.heightFt) || null,
        heightIn: (data.tdeeInputs && data.tdeeInputs.heightIn) || null,
        heightCm: (data.tdeeInputs && data.tdeeInputs.heightCm) || null,
        weightLb: (data.tdeeInputs && data.tdeeInputs.weightLb) || null,
        weightKg: (data.tdeeInputs && data.tdeeInputs.weightKg) || null,
        activity: (data.tdeeInputs && data.tdeeInputs.activity) || 1.2,
        lossRate: (data.tdeeInputs && data.tdeeInputs.lossRate) || 2.0
      };
      if (typeof data.tdee !== "number") data.tdee = null;
      if (typeof data.targetCalories !== "number") data.targetCalories = null;
      return data;
    }
  } catch {}
  return {
    startingWeight: null,
    rows: Array.from({ length: 12 }, () => emptyRow()),
    seriesVisible: { ...DEFAULT_VIS },
    unitMode: "us",
    tdeeInputs: {
      sex: "male", age: null,
      heightFt: null, heightIn: null, heightCm: null,
      weightLb: null, weightKg: null,
      activity: 1.2, lossRate: 2.0
    },
    tdee: null,
    targetCalories: null,
  };
}

// === save state to localStorage ===
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === make sure we always have exactly 12 rows ===
function ensureTwelveRows() {
  if (!Array.isArray(state.rows)) state.rows = [];
  if (state.rows.length < 12) {
    for (let i = state.rows.length; i < 12; i++) state.rows.push(emptyRow());
  } else if (state.rows.length > 12) {
    state.rows = state.rows.slice(0, 12);
  }
}

// === add N days to ISO date ===
function addDaysISO(dateStr, days) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// === fill subsequent dates weekly ===
function autoFillWeeklyDatesFromFirst() {
  const first = state.rows[0].date;
  if (!first) return;
  for (let i = 1; i < state.rows.length; i++) {
    state.rows[i].date = addDaysISO(first, 7 * i);
  }
}

// === pounds formatter ===
function fmtLb(n) { return `${Number(n).toFixed(1)} lb`; }
// === sign color class ===
function signCls(n) { return n >= 0 ? "pos" : "neg"; }

// === collect rows that have current weight ===
function getFilledWeights() {
  const out = [];
  state.rows.forEach((r, i) => {
    const w = parseFloat(r.current);
    if (Number.isFinite(w)) out.push({ i, weight: w });
  });
  return out;
}

// === calculate + display progress stats ===
function renderStats() {
  const filled = getFilledWeights();
  if (filled.length === 0) {
    els.statStart.textContent = "—";
    els.statLatest.textContent = "—";
    els.statTotal.textContent = "—";
    els.statAvg.textContent = "—";
    els.statTotal.className = "";
    els.statAvg.className = "";
    return;
  }

  const start = filled[0].weight;
  const latest = filled[filled.length - 1].weight;
  const total = Number((latest - start).toFixed(1));
  const weeks = Math.max(1, filled.length - 1);
  const avg = Number((total / weeks).toFixed(2));

  els.statStart.textContent = fmtLb(start);
  els.statLatest.textContent = fmtLb(latest);

  els.statTotal.textContent = `${total >= 0 ? "+" : ""}${total} lb`;
  els.statTotal.className = signCls(total);

  els.statAvg.textContent = `${avg >= 0 ? "+" : ""}${avg} lb/wk`;
  els.statAvg.className = signCls(avg);
}

// === draw simple line chart (weight) ===
function drawChart() {
  const ctx = els.trend.getContext("2d");
  const W = els.trend.width, H = els.trend.height;
  ctx.clearRect(0, 0, W, H);

  const filled = getFilledWeights();
  if (filled.length < 2) {
    ctx.fillStyle = "#777";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Enter at least 2 weeks of Current weight to see a trend.", 16, 24);
    return;
  }

  // chart area size
  const pad = 40;
  const w = W - pad * 2;
  const h = H - pad * 2;

  // scales and bounds
  const xs = filled.map((_, idx) => idx);
  const ys = filled.map(p => p.weight);
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;

  const xScale = i => pad + (i / (xs.length - 1)) * w;
  const yScale = v => pad + h - ((v - minY) / (maxY - minY)) * h;

  // axes
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad); ctx.lineTo(pad, pad + h); ctx.lineTo(pad + w, pad + h);
  ctx.stroke();

  // y-axis labels
  ctx.fillStyle = "#555";
  ctx.font = "12px system-ui";
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const val = minY + (t / ticks) * (maxY - minY);
    const y = yScale(val);
    ctx.fillText(val.toFixed(1), 8, y + 4);
  }

  // line path
  ctx.strokeStyle = "#3366cc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  xs.forEach((i, idx) => {
    const x = xScale(i), y = yScale(ys[idx]);
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // point markers
  ctx.fillStyle = "#2aa775";
  xs.forEach((i, idx) => {
    const x = xScale(i), y = yScale(ys[idx]);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });
}

// === parse number or null (tolerant) ===
function numOrNull(v) {
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// === parse blood pressure "systolic/diastolic" ===
function parseBP(v) {
  if (!v) return { sys: null, dia: null };
  const [s, d] = String(v).split("/").map(x => parseFloat(x));
  return {
    sys: Number.isFinite(s) ? s : null,
    dia: Number.isFinite(d) ? d : null
  };
}

// === build series list with visibility ===
function getSeriesDefs() {
  return [
    { key: "current", label: "Weight (lb)",       color: "#3366cc", map: r => numOrNull(r.current), visible: state.seriesVisible.current },
    { key: "bodyFat", label: "Body Fat (%)",      color: "#d62728", map: r => numOrNull(r.bodyFat), visible: state.seriesVisible.bodyFat },
    { key: "muscle",  label: "Muscle (lb or %)",  color: "#2ca02c", map: r => numOrNull(r.muscle),  visible: state.seriesVisible.muscle },
    { key: "water",   label: "Water (%)",         color: "#1f77b4", map: r => numOrNull(r.water),   visible: state.seriesVisible.water },
    { key: "bpSys",   label: "BP Systolic",       color: "#ff7f0e", map: r => parseBP(r.bp).sys,    visible: state.seriesVisible.bpSys },
    { key: "bpDia",   label: "BP Diastolic",      color: "#9467bd", map: r => parseBP(r.bp).dia,    visible: state.seriesVisible.bpDia },
    { key: "waist",   label: "Waist (in)",        color: "#8c564b", map: r => numOrNull(r.waist),   visible: state.seriesVisible.waist },
  ];
}

// === draw multi-metric trend (normalized per-series) ===
function drawMultiChart() {
  const ctx = els.trendMulti.getContext("2d");
  const W = els.trendMulti.width, H = els.trendMulti.height;
  ctx.clearRect(0, 0, W, H);

  const rows = state.rows;
  const seriesDefs = getSeriesDefs().filter(s => s.visible);

  const pad = 40;
  const w = W - pad * 2;
  const h = H - pad * 2;

  // axes
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad); ctx.lineTo(pad, pad + h); ctx.lineTo(pad + w, pad + h);
  ctx.stroke();

  ctx.fillStyle = "#555";
  ctx.font = "12px system-ui";
  ctx.fillText("Time (weeks)", pad + w - 90, pad + h + 24);

  const xCount = rows.length;
  if (xCount < 2) {
    ctx.fillStyle = "#777";
    ctx.fillText("Enter at least 2 weeks to see trends.", 16, 24);
    return;
  }
  const xScale = i => pad + (i / (xCount - 1)) * w;

  // draw each visible series
  const legend = [];
  seriesDefs.forEach(s => {
    const vals = rows.map(s.map);
    const filtered = vals.filter(v => v !== null);
    if (filtered.length < 2) return;

    const minV = Math.min(...filtered);
    const maxV = Math.max(...filtered);
    const span = (maxV - minV) || 1;

    const yScale = v => {
      const norm = (v - minV) / span;
      return pad + h - norm * h;
    };

    // line
    const color = s.color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    vals.forEach((v, idx) => {
      if (v === null) return;
      const x = xScale(idx), y = yScale(v);
      const prevExists = idx > 0 && vals[idx - 1] !== null;
      if (!prevExists) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points
    ctx.fillStyle = color;
    vals.forEach((v, idx) => {
      if (v === null) return;
      const x = xScale(idx), y = yScale(v);
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    });

    legend.push({ label: s.label, color, minV, maxV });
  });

  // legend
  let lx = pad + 6, ly = pad + 12;
  legend.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, ly - 8, 10, 10);
    ctx.fillStyle = "#222";
    ctx.fillText(`${item.label}`, lx + 16, ly);
    ly += 18;
  });

  // note
  ctx.fillStyle = "#666";
  ctx.font = "11px system-ui";
  ctx.fillText("Each line auto-scales to its own min–max.", pad + 6, pad + h - 8);
}

// === init series visibility checkboxes ===
function initSeriesControls() {
  function bindToggle(id, key) {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.checked = !!state.seriesVisible[key];
    cb.addEventListener("change", () => {
      state.seriesVisible[key] = cb.checked;
      save();
      drawMultiChart(); // redraw only multi-chart
    });
  }
  bindToggle("vis-current", "current");
  bindToggle("vis-bodyFat", "bodyFat");
  bindToggle("vis-muscle", "muscle");
  bindToggle("vis-water", "water");
  bindToggle("vis-bpSys", "bpSys");
  bindToggle("vis-bpDia", "bpDia");
  bindToggle("vis-waist", "waist");
}

// === handle table input changes (cursor-safe) ===
function onCellChange(e) {
  const i = Number(e.target.dataset.i);
  const k = e.target.dataset.k;
  if (!Number.isInteger(i) || !k) return;

  // save new value
  state.rows[i][k] = e.target.value.trim();

  // if first date set, fill weekly dates and re-render table
  if (k === "date" && i === 0 && state.rows[0].date) {
    autoFillWeeklyDatesFromFirst();
    save();
    render(); // rebuild table once (safe case)
  } else {
    save();
    renderStats();    // update stats without table rebuild
    drawChart();      // update weight chart
    drawMultiChart(); // update multi-metric chart
  }
}

// === build table (12 rows) ===
function renderTable() {
  els.tbody.innerHTML = "";
  state.rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><input type="date" data-i="${i}" data-k="date" value="${row.date}"></td>
      <td><input type="time" data-i="${i}" data-k="time" value="${row.time}"></td>
      <td><input type="number" step="0.1" min="1" data-i="${i}" data-k="goal" value="${row.goal}" ${state.startingWeight ? 'readonly' : ''}></td>
      <td><input type="number" step="0.1" min="1" data-i="${i}" data-k="current" value="${row.current}"></td>
      <td><input type="number" step="0.1" min="0" data-i="${i}" data-k="bodyFat" value="${row.bodyFat}" placeholder="%"></td>
      <td><input type="text" data-i="${i}" data-k="muscle" value="${row.muscle}" placeholder="lb or %"></td>
      <td><input type="number" step="0.1" min="0" data-i="${i}" data-k="water" value="${row.water}" placeholder="%"></td>
      <td><input type="text" data-i="${i}" data-k="bp" value="${row.bp}" placeholder="120/80"></td>
      <td><input type="number" step="0.1" min="0" data-i="${i}" data-k="waist" value="${row.waist}" placeholder="in"></td>
    `;
    els.tbody.appendChild(tr);
  });

  // wire all inputs (event delegation by selection)
  els.tbody.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", onCellChange);
  });
}

// === find a usable starting weight from multiple places ===
function resolveStartingWeight() {
  // 1) Top Starting Weight input
  const sw = parseFloat(els.startingWeight.value);
  if (Number.isFinite(sw) && sw > 0) return sw;

  // 2) Current weight in row #1
  const row0 = parseFloat(state.rows?.[0]?.current);
  if (Number.isFinite(row0) && row0 > 0) return row0;

  // 3) Weight entered in TDEE section (either US or Metric)
  const wLb = parseFloat(state.tdeeInputs?.weightLb);
  if (Number.isFinite(wLb) && wLb > 0) return wLb;

  const wKg = parseFloat(state.tdeeInputs?.weightKg);
  if (Number.isFinite(wKg) && wKg > 0) return kgToLb(wKg); // convert kg -> lb

  // none found
  return null;
}

// === user-facing plan generator (-2 lb/week for 12 weeks) ===
function generateGoalsInteractive() {
  ensureTwelveRows();
  const start = resolveStartingWeight();
  if (!Number.isFinite(start)) {
    alert("Enter a Starting Weight (top), OR row #1 Current, OR a Weight in the TDEE section.");
    return;
  }

  state.startingWeight = +start.toFixed(1);

  // Fill 12 weeks: week1 = start - 2, week2 = start - 4, ...
  state.rows = state.rows.map((row, i) => {
    const goal = +(start - 2 * (i + 1)).toFixed(1);
    return { ...row, goal: goal.toString() };
  });

  // If row #1 has a date, auto-fill the rest (+7 days)
  if (state.rows[0].date) autoFillWeeklyDatesFromFirst();

  save();
  render(); // safe: button action, not a keystroke
}

// === plan: clear all ===
function clearPlan() {
  state = {
    ...state,
    startingWeight: null,
    rows: Array.from({ length: 12 }, () => emptyRow())
  };
  save();
  render(); // full render OK (button action)
}

// === unit helpers: US <-> metric ===
function lbToKg(lb) { return lb * 0.45359237; }
function kgToLb(kg) { return kg / 0.45359237; }
function ftInToCm(ft, inch) { return (ft * 12 + (inch || 0)) * 2.54; }
function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch };
}

// === mifflin–st jeor bmr ===
function mifflinStJeorBMR({ sex, age, heightCm, weightKg }) {
  if (!Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return (sex === "female") ? base - 161 : base + 5;
}

// === tdee from bmr and activity ===
function tdeeFromBMR(bmr, activity) {
  if (!Number.isFinite(bmr) || !Number.isFinite(activity)) return null;
  return bmr * activity;
}

// === daily target calories from loss rate ===
function caloriesFromLoss(tdee, lossRate) {
  if (!Number.isFinite(tdee) || !Number.isFinite(lossRate)) return null;
  const dailyDeficit = 500 * Math.max(0, lossRate);
  return Math.max(0, Math.round(tdee - dailyDeficit));
}

// === unit UI switching ===
function applyUnitVisibility() {
  const isMetric = state.unitMode === "metric";
  document.querySelectorAll(".unit-us").forEach(el => el.hidden = isMetric);
  document.querySelectorAll(".unit-metric").forEach(el => el.hidden = !isMetric);
}

// === render tdee inputs/outputs ===
function renderTDEE() {
  // unit mode + visibility
  els.unitMode.value = state.unitMode;
  applyUnitVisibility();

  // fill inputs from state
  const ti = state.tdeeInputs;
  els.tdeeSex.value = ti.sex;
  els.tdeeAge.value = ti.age ?? "";
  els.tdeeActivity.value = String(ti.activity);
  els.lossRate.value = ti.lossRate ?? 2.0;

  if (state.unitMode === "us") {
    els.tdeeFt.value = ti.heightFt ?? "";
    els.tdeeIn.value = ti.heightIn ?? "";
    els.tdeeLb.value = ti.weightLb ?? "";
  } else {
    els.tdeeCm.value = ti.heightCm ?? "";
    els.tdeeKg.value = ti.weightKg ?? "";
  }

  // outputs
  els.tdeeOutput.textContent = Number.isFinite(state.tdee) ? `TDEE: ${Math.round(state.tdee).toLocaleString()} kcal` : "TDEE: —";
  els.calorieTargetLine.textContent = Number.isFinite(state.targetCalories)
    ? `Daily Target: ${state.targetCalories.toLocaleString()} kcal`
    : "Daily Target: —";

  // caution if very low
  const tgt = state.targetCalories;
  if (Number.isFinite(tgt) && tgt > 0 && tgt < 1200) {
    els.calorieNote.textContent = "Target is very low (<1200 kcal). Consider reducing loss rate or seeking guidance.";
    els.calorieNote.style.color = "crimson";
  } else {
    els.calorieNote.textContent = "Uses Mifflin–St Jeor BMR × activity. Daily deficit = 500 × loss(lb/week). Consider medical guidance for aggressive goals.";
    els.calorieNote.style.color = "#666";
  }
}

// === calculate TDEE from inputs (robust) ===
function calculateAndSaveTDEE() {
  // read common inputs
  const sex = els.tdeeSex.value === "female" ? "female" : "male";
  const age = parseFloat(els.tdeeAge.value);
  const activity = parseFloat(els.tdeeActivity.value);
  const lossRate = parseFloat(els.lossRate.value);

  let heightCm, weightKg;

  if (state.unitMode === "us") {
    const ft = parseFloat(els.tdeeFt.value);
    const inch = els.tdeeIn.value === "" ? 0 : parseFloat(els.tdeeIn.value);
    const lb = parseFloat(els.tdeeLb.value);

    if (!Number.isFinite(age) || !Number.isFinite(ft) || !Number.isFinite(lb)) {
      alert("Please enter Age, Height (ft), and Weight (lb). Inches can be left blank.");
      return;
    }

    state.tdeeInputs.heightFt = ft;
    state.tdeeInputs.heightIn = Number.isFinite(inch) ? inch : 0;
    state.tdeeInputs.weightLb = lb;

    heightCm = ftInToCm(ft, Number.isFinite(inch) ? inch : 0);
    weightKg = lbToKg(lb);
  } else {
    const cm = parseFloat(els.tdeeCm.value);
    const kg = parseFloat(els.tdeeKg.value);

    if (!Number.isFinite(age) || !Number.isFinite(cm) || !Number.isFinite(kg)) {
      alert("Please enter Age, Height (cm), and Weight (kg).");
      return;
    }

    state.tdeeInputs.heightCm = cm;
    state.tdeeInputs.weightKg = kg;

    heightCm = cm;
    weightKg = kg;
  }

  // store remaining inputs
  state.tdeeInputs.sex = sex;
  state.tdeeInputs.age = age;
  state.tdeeInputs.activity = Number.isFinite(activity) ? activity : 1.2;
  state.tdeeInputs.lossRate = Number.isFinite(lossRate) ? lossRate : 2.0;

  // compute BMR -> TDEE -> daily target
  const bmr = mifflinStJeorBMR({ sex, age, heightCm, weightKg });
  const tdee = tdeeFromBMR(bmr, state.tdeeInputs.activity);
  const dailyTarget = caloriesFromLoss(tdee, state.tdeeInputs.lossRate);

  if (!Number.isFinite(tdee)) {
    alert("Check your entries — some values look invalid.");
    return;
  }

  state.tdee = tdee;
  state.targetCalories = Number.isFinite(dailyTarget) ? dailyTarget : null;

  save();
  renderTDEE(); // refresh this section
}

// === render (table + stats + charts + tdee) ===
function render() {
  // update starting weight field
  els.startingWeight.value = state.startingWeight ?? "";

  // table
  renderTable();

  // stats + charts
  renderStats();
  drawChart();
  drawMultiChart();

  // tdee section
  renderTDEE();
}

// === wire buttons / events ===
els.generatePlan.addEventListener("click", generateGoalsInteractive);
els.clearPlan.addEventListener("click", () => {
  if (confirm("Clear the entire 12-week plan and all entries?")) clearPlan();
});
els.calcTDEE.addEventListener("click", calculateAndSaveTDEE);

// unit toggle change: show correct inputs, keep previously entered values
els.unitMode.addEventListener("change", () => {
  state.unitMode = els.unitMode.value === "metric" ? "metric" : "us";
  save();
  renderTDEE(); // update visibility + fields
});

// OPTIONAL: auto-calc TDEE when any related field changes
[
  els.tdeeSex, els.tdeeAge, els.tdeeFt, els.tdeeIn, els.tdeeLb,
  els.tdeeCm, els.tdeeKg, els.tdeeActivity, els.lossRate
].forEach(ctrl => {
  if (!ctrl) return;
  ctrl.addEventListener("change", () => calculateAndSaveTDEE());
});

// === initial boot ===
initSeriesControls();
ensureTwelveRows();
render();
