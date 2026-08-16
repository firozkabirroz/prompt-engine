const els = {
  modeBtns: document.querySelectorAll(".seg-btn"),
  input: document.getElementById("input"),
  charCount: document.getElementById("char-count"),
  submit: document.getElementById("submit"),
  btnText: document.querySelector(".btn-text"),
  spinner: document.querySelector(".spinner"),
  resultPanel: document.getElementById("result-panel"),
  resultTitle: document.getElementById("result-title"),
  output: document.getElementById("output"),
  copyBtn: document.getElementById("copy-btn"),
  tokensBefore: document.getElementById("tokens-before"),
  tokensAfter: document.getElementById("tokens-after"),
  savings: document.getElementById("savings"),
  savingsLabel: document.getElementById("savings-label"),
  savingsStat: document.querySelector(".stat.savings"),
  errorPanel: document.getElementById("error-panel"),
  errorMsg: document.getElementById("error-msg"),
  skeletonPanel: document.getElementById("skeleton-panel"),
  historyList: document.getElementById("history-list"),
  clearHistory: document.getElementById("clear-history"),
  keyWarning: document.getElementById("key-warning"),
  modelName: document.getElementById("model-name"),
  statusPill: document.getElementById("status-pill"),
  themeToggle: document.getElementById("theme-toggle"),
};

let mode = "generate";
const HISTORY_KEY = "prompt-engine-history";
const THEME_KEY = "prompt-engine-theme";

const MODE_LABELS = {
  generate: "Generate Prompt",
  optimize: "Optimize Prompt",
};

const PLACEHOLDERS = {
  generate:
    "Write your idea in Bangla or English…\n\nExample: amar ekta blog post lagbe healthy breakfast niye, SEO friendly hote hobe",
  optimize:
    "Paste your existing prompt — it will be compressed without losing meaning.",
};

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const light = theme === "light";
  els.themeToggle.setAttribute(
    "aria-label",
    light ? "Switch to dark mode" : "Switch to light mode"
  );
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", light ? "#f4f4f5" : "#09090b");
}

els.themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "light" ? "dark" : "light");
});

setTheme(currentTheme());

els.modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    els.modeBtns.forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    els.btnText.textContent = MODE_LABELS[mode];
    els.input.placeholder = PLACEHOLDERS[mode];
    els.resultTitle.textContent =
      mode === "optimize" ? "Compressed Prompt" : "Generated Prompt";
  });
});

els.input.addEventListener("input", () => {
  const n = els.input.value.length;
  els.charCount.textContent = `${n} character${n === 1 ? "" : "s"}`;
});

async function submit() {
  const input = els.input.value.trim();
  if (!input) {
    showError("Write something first — the input is empty.");
    return;
  }

  setLoading(true);
  hideError();
  els.resultPanel.classList.add("hidden");

  try {
    const res = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    showResult(data);
    saveToHistory({
      mode,
      input,
      output: data.output,
      tokens: data.tokens,
      time: Date.now(),
    });
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

els.submit.addEventListener("click", submit);
els.input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
});

function setLoading(loading) {
  els.submit.disabled = loading;
  els.spinner.classList.toggle("hidden", !loading);
  els.btnText.textContent = loading ? "Working…" : MODE_LABELS[mode];
  els.skeletonPanel.classList.toggle("hidden", !loading);
}

function showResult(data) {
  els.output.textContent = data.output;
  els.resultPanel.classList.remove("hidden");
  els.resultTitle.textContent =
    mode === "optimize" ? "Compressed Prompt" : "Generated Prompt";

  const { before, after, exact } = data.tokens;
  els.tokensBefore.textContent = before;
  els.tokensAfter.textContent = after;

  const diff = before - after;
  els.savingsStat.classList.remove("negative");
  if (mode === "optimize") {
    const pct = before > 0 ? Math.round((diff / before) * 100) : 0;
    els.savingsLabel.textContent = "Saved";
    els.savings.textContent = diff >= 0 ? `${pct}%` : "0%";
  } else {
    els.savingsLabel.textContent = "Change";
    els.savings.textContent = (diff >= 0 ? "−" : "+") + Math.abs(diff);
    if (diff < 0) els.savingsStat.classList.add("negative");
  }
  if (!exact) els.savingsLabel.textContent += " · approx";

  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

els.copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.output.textContent);
  const label = els.copyBtn.querySelector(".copy-label");
  label.textContent = "Copied";
  els.copyBtn.classList.add("copied");
  setTimeout(() => {
    label.textContent = "Copy";
    els.copyBtn.classList.remove("copied");
  }, 1500);
});

function showError(msg) {
  els.errorMsg.textContent = msg;
  els.errorPanel.classList.remove("hidden");
}

function hideError() {
  els.errorPanel.classList.add("hidden");
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function relativeTime(ts) {
  const delta = Date.now() - ts;
  const min = Math.round(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function saveToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  els.historyList.innerHTML = "";

  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "No prompts yet — generate one to start a trail";
    els.historyList.appendChild(li);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const idea = document.createElement("div");
    idea.className = "hi-idea";
    idea.textContent = item.input;

    const meta = document.createElement("div");
    meta.className = "hi-meta";

    const modeSpan = document.createElement("span");
    modeSpan.className = "hi-mode";
    modeSpan.textContent = item.mode;

    const timeSpan = document.createElement("span");
    timeSpan.textContent = relativeTime(item.time);

    const tokSpan = document.createElement("span");
    tokSpan.textContent = `${item.tokens.before} → ${item.tokens.after} tokens`;

    meta.append(modeSpan, timeSpan, tokSpan);
    li.append(idea, meta);

    li.addEventListener("click", () => {
      els.input.value = item.input;
      els.charCount.textContent = `${item.input.length} characters`;
      els.output.textContent = item.output;
      els.tokensBefore.textContent = item.tokens.before;
      els.tokensAfter.textContent = item.tokens.after;
      els.savingsLabel.textContent = "Delta";
      const d = item.tokens.before - item.tokens.after;
      els.savings.textContent = `${d >= 0 ? "−" : "+"}${Math.abs(d)}`;
      els.savingsStat.classList.toggle("negative", d < 0);
      els.resultTitle.textContent =
        item.mode === "optimize" ? "Compressed Prompt" : "Generated Prompt";
      els.resultPanel.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    els.historyList.appendChild(li);
  });
}

els.clearHistory.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

async function init() {
  renderHistory();
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    els.keyWarning.classList.toggle("hidden", data.keyConfigured);
    els.modelName.textContent = data.model || "AI";
    els.statusPill.hidden = false;
  } catch {
    els.statusPill.hidden = true;
  }
}

init();
