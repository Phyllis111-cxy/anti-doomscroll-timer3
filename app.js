// app.js
// Anti-Doomscroll Timer + Tasks + Gemini witty nudge (optional)

const appEl = document.getElementById("app");
const todayEl = document.getElementById("today");
const soundBtn = document.getElementById("soundBtn");

const modeEl = document.getElementById("mode");
const timeEl = document.getElementById("time");
const hintEl = document.getElementById("hint");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const distractBtn = document.getElementById("distractBtn");

const focusMinInput = document.getElementById("focusMin");
const breakMinInput = document.getElementById("breakMin");
const applyBtn = document.getElementById("applyBtn");

// Stats
const pomCountEl = document.getElementById("pomCount");
const disCountEl = document.getElementById("disCount");

// Tasks
const taskNameInput = document.getElementById("taskName");
const taskMinInput = document.getElementById("taskMin");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskListEl = document.getElementById("taskList");
const plannedMinEl = document.getElementById("plannedMin");
const doneMinEl = document.getElementById("doneMin");

// Gemini key UI
const geminiKeyInput = document.getElementById("geminiKey");
const saveKeyBtn = document.getElementById("saveKeyBtn");

// ---------- Date / storage ----------
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const STORAGE_PREFIX = "antiDoomscroll:";
const KEY_STORAGE = "antiDoomscroll:geminiKey"; // key stored locally only

function loadState() {
  const key = STORAGE_PREFIX + todayKey();
  const raw = localStorage.getItem(key);
  if (!raw) return { pomodoros: 0, distractions: 0, tasks: [] };
  try {
    const s = JSON.parse(raw);
    if (!Array.isArray(s.tasks)) s.tasks = [];
    if (typeof s.pomodoros !== "number") s.pomodoros = 0;
    if (typeof s.distractions !== "number") s.distractions = 0;
    return s;
  } catch {
    return { pomodoros: 0, distractions: 0, tasks: [] };
  }
}
function saveState(s) {
  const key = STORAGE_PREFIX + todayKey();
  localStorage.setItem(key, JSON.stringify(s));
}

let state = loadState();

// ---------- Timer state ----------
let focusSeconds = Number(focusMinInput.value) * 60;
let breakSeconds = Number(breakMinInput.value) * 60;

let isRunning = false;
let isFocus = true;
let remaining = focusSeconds;
let timerId = null;

let soundOn = true;

// ---------- UI ----------
todayEl.textContent = `Today: ${todayKey()}`;

function pad2(n) { return String(n).padStart(2, "0"); }
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
function renderTime() {
  timeEl.textContent = formatTime(remaining);
}
function renderStats() {
  pomCountEl.textContent = state.pomodoros;
  disCountEl.textContent = state.distractions;
}
function setModeUI() {
  appEl.classList.toggle("focus-on", isFocus);
  appEl.classList.toggle("break-on", !isFocus);

  modeEl.textContent = isFocus ? "FOCUS" : "BREAK";
  hintEl.textContent = isFocus
    ? "No scrolling. One task. Right now."
    : "Break time. Breathe. Small reward is okay.";

  distractBtn.disabled = !isFocus || !isRunning;
  distractBtn.style.opacity = (!isFocus || !isRunning) ? 0.45 : 1;
}

renderStats();
setModeUI();
renderTime();

// ---------- Sound ----------
function beep(freq = 880, duration = 140) {
  if (!soundOn) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    ctx.close();
  }, duration);
}
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
});

// ---------- Timer logic ----------
function stopTimer() {
  isRunning = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  setModeUI();
}
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  setModeUI();

  timerId = setInterval(() => {
    if (remaining > 0) {
      remaining -= 1;
      renderTime();
      if (isFocus && remaining === 10) beep(660, 90);
    } else {
      if (isFocus) {
        state.pomodoros += 1;
        saveState(state);
        renderStats();
        beep(1040, 200);
      } else {
        beep(520, 180);
      }

      isFocus = !isFocus;
      remaining = isFocus ? focusSeconds : breakSeconds;
      setModeUI();
      renderTime();
    }
  }, 1000);
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", () => { if (isRunning) stopTimer(); });
resetBtn.addEventListener("click", () => {
  stopTimer();
  isFocus = true;
  remaining = focusSeconds;
  renderTime();
  setModeUI();
});

// Apply settings
applyBtn.addEventListener("click", () => {
  const f = Math.max(1, Math.min(120, Number(focusMinInput.value || 25)));
  const b = Math.max(1, Math.min(60, Number(breakMinInput.value || 5)));
  focusMinInput.value = String(f);
  breakMinInput.value = String(b);

  focusSeconds = f * 60;
  breakSeconds = b * 60;

  hintEl.textContent = isFocus
    ? "Updated settings. Hit Reset to restart with new times."
    : "Updated settings. Next break/focus will use the new times.";
});

// ---------- Gemini key handling ----------
function loadGeminiKey() {
  return (localStorage.getItem(KEY_STORAGE) || "").trim();
}
function saveGeminiKey(key) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}
geminiKeyInput.value = loadGeminiKey();

saveKeyBtn.addEventListener("click", () => {
  const key = geminiKeyInput.value.trim();
  if (!key) {
    localStorage.removeItem(KEY_STORAGE);
    hintEl.textContent = "Gemini key cleared. Using local witty messages.";
    return;
  }
  saveGeminiKey(key);
  hintEl.textContent = "Gemini key saved (local only).";
});

// ---------- Witty messages (fallback) ----------
const fallbackLines = [
  "Ah yes, the sacred ritual of “just one scroll.”",
  "Congratulations, you unlocked: distraction (again).",
  "Your future self called. It sounded disappointed.",
  "Plot twist: the video will still be there in 20 minutes.",
  "Breaking news: scrolling has not solved your task."
];

// Keep it “lightly sarcastic”, not insulting
async function getWittyLineWithGemini() {
  const apiKey = loadGeminiKey();
  if (!apiKey) return null;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    apiKey;

  const prompt =
    "Write ONE short, lightly sarcastic but friendly sentence (max 16 words) to discourage doomscrolling. " +
    "No profanity, no harassment, no personal attacks. Keep it playful.";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9 }
    })
  });

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  // Keep only first line / first sentence-ish
  return text.split("\n")[0].slice(0, 120);
}

async function showWittyLine() {
  let line = null;
  try {
    line = await getWittyLineWithGemini();
  } catch {
    line = null;
  }
  if (!line) {
    line = fallbackLines[Math.floor(Math.random() * fallbackLines.length)];
  }
  hintEl.textContent = line;
}

// ---------- Distraction ----------
distractBtn.addEventListener("click", async () => {
  if (!isRunning || !isFocus) return;

  state.distractions += 1;
  saveState(state);
  renderStats();

  beep(220, 120);
  await showWittyLine();
});

// ---------- Tasks ----------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function calcTaskMins() {
  const tasks = state.tasks || [];
  const planned = tasks.reduce((sum, t) => sum + (Number(t.minutes) || 0), 0);
  const done = tasks.reduce((sum, t) => sum + (t.done ? (Number(t.minutes) || 0) : 0), 0);
  plannedMinEl.textContent = String(planned);
  doneMinEl.textContent = String(done);
}

function setFocusMinutesFromTask(minutes) {
  const m = Math.max(1, Math.min(120, Number(minutes) || 25));
  focusMinInput.value = String(m);
  focusSeconds = m * 60;

  // If currently not running, update remaining immediately
  if (!isRunning) {
    isFocus = true;
    remaining = focusSeconds;
    renderTime();
    setModeUI();
  }

  hintEl.textContent = isRunning
    ? `Focus set to ${m} min. Click Reset to apply cleanly.`
    : `Focus set to ${m} min. Ready when you are.`;
}

function renderTasks() {
  const tasks = state.tasks || [];
  taskListEl.innerHTML = "";

  if (tasks.length === 0) {
    const li = document.createElement("li");
    li.style.padding = "8px";
    li.className = "muted";
    li.textContent = "No tasks yet. Add one above.";
    taskListEl.appendChild(li);
    calcTaskMins();
    return;
  }

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "taskItem" + (t.done ? " taskDone" : "");

    const row = document.createElement("div");
    row.className = "taskRow";
    row.title = "Click to set Focus minutes to this task";

    // ✅ click row to set focus minutes (but not when clicking buttons)
    row.addEventListener("click", () => setFocusMinutesFromTask(t.minutes));

    const chk = document.createElement("button");
    chk.className = "taskChk";
    chk.title = "Mark done / undone";
    chk.textContent = t.done ? "✅" : "⬜";
    chk.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTask(t.id);
    });

    const text = document.createElement("div");
    text.className = "taskText";
    const name = document.createElement("div");
    name.className = "taskName";
    name.textContent = t.name;
    const meta = document.createElement("div");
    meta.className = "taskMeta";
    meta.textContent = `${t.minutes} min · click row to set focus`;
    text.appendChild(name);
    text.appendChild(meta);

    const del = document.createElement("button");
    del.className = "taskDel";
    del.title = "Delete";
    del.textContent = "🗑️";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(t.id);
    });

    row.appendChild(chk);
    row.appendChild(text);
    row.appendChild(del);

    li.appendChild(row);
    taskListEl.appendChild(li);
  });

  calcTaskMins();
}

function addTask() {
  const name = (taskNameInput.value || "").trim();
  const minutes = Math.max(1, Math.min(240, Number(taskMinInput.value || 25)));

  if (!name) {
    hintEl.textContent = "Type a task name first.";
    taskNameInput.focus();
    return;
  }

  state.tasks = state.tasks || [];
  state.tasks.push({ id: uid(), name, minutes, done: false });
  saveState(state);

  taskNameInput.value = "";
  taskMinInput.value = "25";
  renderTasks();

  hintEl.textContent = "Task added. Click it to set Focus minutes.";
}

function toggleTask(id) {
  const tasks = state.tasks || [];
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveState(state);
  renderTasks();
}

function deleteTask(id) {
  state.tasks = (state.tasks || []).filter(t => t.id !== id);
  saveState(state);
  renderTasks();
}

addTaskBtn.addEventListener("click", addTask);
taskNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
taskMinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });

// Space toggles start/pause (avoid when typing)
document.addEventListener("keydown", (e) => {
  if (e.key === " " && document.activeElement?.tagName !== "INPUT") {
    e.preventDefault();
    if (isRunning) stopTimer(); else startTimer();
  }
});

// Initial render
renderStats();
renderTasks();
