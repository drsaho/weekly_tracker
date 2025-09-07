// 12-week table with goal = startingWeight - 2*week
const STORAGE_KEY = "weeklyWeightTable_v1";

const els = {
  startingWeight: document.getElementById("starting-weight"),
  generatePlan: document.getElementById("generate-plan"),
  clearPlan: document.getElementById("clear-plan"),
  tbody: document.querySelector("#entries tbody"),
};

let state = load(); // { startingWeight: number|null, rows: [ {date,time,goal,current,bodyFat,muscle,water,bp,waist} x12 ] }

// ---- Storage ----
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.rows) && data.rows.length === 12) return data;
  } catch {}
  return { startingWeight: null, rows: Array.from({ length: 12 }, () => emptyRow()) };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyRow() {
  return {
    date: "", time: "", goal: "", current: "",
    bodyFat: "", muscle: "", water: "", bp: "", waist: ""
  };
}

// ---- Plan generation ----
function generateGoals(start) {
  const startNum = Number(start);
  if (!Number.isFinite(startNum) || startNum <= 0) {
    alert("Please enter a valid starting weight.");
    return;
  }
  state.startingWeight = startNum;
  state.rows = state.rows.map((row, i) => {
    const goal = +(startNum - 2 * (i + 1)).toFixed(1); // week1 = start - 2
    return { ...row, goal: goal.toString() };
  });
  save();
  render();
}

function clearPlan() {
  state = { startingWeight: null, rows: Array.from({ length: 12 }, () => emptyRow()) };
  save();
  render();
}

// ---- Rendering ----
function render() {
  // reflect starting weight input
  els.startingWeight.value = state.startingWeight ?? "";

  // table
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

  // wire input change (event delegation)
  els.tbody.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", onCellChange);
  });
}

function onCellChange(e) {
  const i = Number(e.target.dataset.i);
  const k = e.target.dataset.k;
  if (!Number.isInteger(i) || !k) return;

  // keep values as strings (we format when needed)
  state.rows[i][k] = e.target.value.trim();
  save();
}

// ---- Events ----
els.generatePlan.addEventListener("click", () => {
  generateGoals(els.startingWeight.value);
});

els.clearPlan.addEventListener("click", () => {
  if (confirm("Clear the entire 12-week plan and all entries?")) clearPlan();
});

// ---- Init ----
render();
