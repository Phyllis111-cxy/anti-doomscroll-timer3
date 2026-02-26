// app.js — Critter Focus Timer (Cute + Bright) + Tasks + ALWAYS shows hint on distraction

const appEl = document.getElementById("app");
const todayEl = document.getElementById("today");
const soundBtn = document.getElementById("soundBtn");

const modeEl = document.getElementById("mode");
const timeEl = document.getElementById("time");
const hintEl = document.getElementById("hint");
const stickerEl = document.getElementById("sticker");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const distractBtn = document.getElementById("distractBtn");

const focusMinInput = document.getElementById("focusMin");
const breakMinInput = document.getElementById("breakMin");
const applyBtn = document.getElementById("applyBtn");

const pomCountEl = document.getElementById("pomCount");
const disCountEl = document.getElementById("disCount");

const taskNameInput = document.getElementById("taskName");
const taskMinInput = document.getElementById("taskMin");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskListEl = document.getElementById("taskList");
const plannedMinEl = document.getElementById("plannedMin");
const doneMinEl = document.getElementById("doneMin");

// ---------- date / storage ----------
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const STORAGE_PREFIX = "critterFocus:";
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
todayEl.textContent = `Today: ${todayKey()}`;

// ---------- timer state ----------
let focusSeconds = Number(focusMinInput.value) * 60;
let breakSeconds = Number(breakMinInput.value) * 60;

let isRunning = false;
let isFocus = true;
let remaining = focusSeconds;
let timerId = null;

let soundOn = true;

// ---------- helpers ----------
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

  // sticker changes with mode
  stickerEl.textContent = isFocus ? "🐶" : "🐑";

  // important: distraction only enabled when running focus
  distractBtn.disabled = !isRunning || !isFocus;
}

// ---------- sound ----------
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

// ---------- always-show hints (SAVAGE but safe) ----------
const savageHints = [
  "Amazing. You opened the app again. Achievement unlocked: avoidance.",
  "This scroll won’t finish your task. Shocking, I know.",
  "Your deadline isn’t scared of your excuses. Start now.",
  "You’re not “taking a break.” You’re donating time to the algorithm.",
  "If scrolling solved problems, you’d be a genius by now.",
  "Plot twist: the video will still be there after you do the work.",
  "You pressed ‘distracted’ like it’s a hobby. Let’s return to the task.",
  "You can be bored for 20 minutes. You’ll survive. Focus.",
  "The algorithm loves you. Your future self does not.",
  "Nice try. Now do one tiny step. Just one."
];

function setHint(text) {
  hintEl.textContent = text;
  // sticker reacts
  stickerEl.textContent = "🐱";
  // tiny reset after a moment
  setTimeout(() => {
    stickerEl.textContent = isFocus ? "🐶" : "🐑";
  }, 900);
}

function showRandomSavageHint() {
  const line = savageHints[Math.floor(Math.random() * savageHints.length)];
  setHint(line);
}

// ---------- timer logic ----------
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
        setHint("✨ Pomodoro done! Tiny win. Keep going.");
      } else {
        beep(520, 180);
        setHint("🌸 Break over. Back to focus—pick one task.");
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
  setHint("Pick one tiny task. Stay with it.");
});

// apply settings
applyBtn.addEventListener("click", () => {
  const f = Math.max(1, Math.min(120, Number(focusMinInput.value || 25)));
  const b = Math.max(1, Math.min(60, Number(breakMinInput.value || 5)));
  focusMinInput.value = String(f);
  breakMinInput.value = String(b);
  focusSeconds = f * 60;
  breakSeconds = b * 60;

  setHint("Settings updated. Hit Reset to restart cleanly.");
});

// distraction: GUARANTEED hint appears immediately
distractBtn.addEventListener("click", () => {
  // even if somehow clickable in wrong state, guard
  if (!isRunning || !isFocus) {
    setHint("Start Focus first, then log distractions. 🐑");
    return;
  }

  state.distractions += 1;
  saveState(state);
  renderStats();

  beep(220, 120);
  showRandomSavageHint();
});

// ---------- tasks ----------
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

  if (!isRunning) {
    isFocus = true;
    remaining = focusSeconds;
    renderTime();
    setModeUI();
    setHint(`Focus set to ${m} min. Start when ready 🐶`);
  } else {
    setHint(`Focus set to ${m} min. Click Reset to apply cleanly 🐑`);
  }
}

function renderTasks() {
  const tasks = state.tasks || [];
  taskListEl.innerHTML = "";

  if (tasks.length === 0) {
    const li = document.createElement("li");
    li.style.padding = "8px";
    li.className = "muted";
    li.textContent = "No tasks yet. Add one above ✨";
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
    row.addEventListener("click", () => setFocusMinutesFromTask(t.minutes));

    const chk = document.createElement("button");
    chk.className = "taskChk";
    chk.title = "Done / Undone";
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
    setHint("Type a task name first ✍️");
    taskNameInput.focus();
    return;
  }

  state.tasks = state.tasks || [];
  state.tasks.push({ id: uid(), name, minutes, done: false });
  saveState(state);

  taskNameInput.value = "";
  taskMinInput.value = "25";
  renderTasks();

  setHint("Task added. Click it to set Focus minutes ✨");
}

function toggleTask(id) {
  const t = (state.tasks || []).find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveState(state);
  renderTasks();
  setHint(t.done ? "✅ Nice. Next tiny step?" : "Undone. Still counts as honesty.");
}

function deleteTask(id) {
  state.tasks = (state.tasks || []).filter(t => t.id !== id);
  saveState(state);
  renderTasks();
  setHint("Deleted. Ruthless. I respect it.");
}

addTaskBtn.addEventListener("click", addTask);
taskNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
taskMinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });

// keyboard: space start/pause (avoid when typing)
document.addEventListener("keydown", (e) => {
  if (e.key === " " && document.activeElement?.tagName !== "INPUT") {
    e.preventDefault();
    if (isRunning) stopTimer(); else startTimer();
  }
});

// initial render
renderStats();
setModeUI();
renderTime();
renderTasks();
