console.log("🔥 MonkeyType God v12.0");

let enabled = false;
let mode = "god";
let customSettings = { wpm: 120, acc: 97, consistency: 80 };
let isTyping = false;

const loadStorage = (cb) => {
  chrome.storage.sync.get(
    ["mt_enabled", "mt_mode", "mt_wpm", "mt_acc", "mt_consistency"],
    (data) => {
      enabled = data.mt_enabled || false;
      mode = data.mt_mode || "god";
      customSettings = {
        wpm: data.mt_wpm ?? 120,
        acc: data.mt_acc ?? 97,
        consistency: data.mt_consistency ?? 80,
      };
      if (cb) cb();
    }
  );
};

loadStorage();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const gaussian = (mean, std) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std + mean;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** MT хранит textarea как " " + логическое содержимое (slice(1) = то, что сравнивают с словами). */
const getWordsInput = () => document.querySelector("#wordsInput");

const emitInsertText = (input, char) => {
  const logical = input.value.length >= 1 ? input.value.slice(1) : "";
  input.value = " " + logical + char;
  input.dispatchEvent(
    new InputEvent("input", {
      data: char,
      inputType: "insertText",
      bubbles: true,
      cancelable: true,
    })
  );
};

const emitDeleteBackward = (input) => {
  const logical = input.value.length >= 1 ? input.value.slice(1) : "";
  if (logical.length === 0) return;
  input.value = " " + logical.slice(0, -1);
  input.dispatchEvent(
    new InputEvent("input", {
      inputType: "deleteContentBackward",
      bubbles: true,
      cancelable: true,
    })
  );
};

const CYR = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const LAT = "abcdefghijklmnopqrstuvwxyz";

const pickWrongChar = (correct) => {
  if (correct === " " || correct === "\n" || correct === "\t") return "x";
  const wantUpper =
    correct !== correct.toLowerCase() && correct === correct.toUpperCase();
  const c = correct.toLowerCase();
  const pool = CYR.includes(c) ? CYR : LAT.includes(c) ? LAT : null;
  if (!pool) return wantUpper ? "X" : "x";
  let w = pool[Math.floor(Math.random() * pool.length)];
  if (w === c) w = pool[(pool.indexOf(w) + 1) % pool.length];
  return wantUpper ? w.toUpperCase() : w;
};

/**
 * Доля «ошибка + исправление» на позицию, чтобы итоговая acc ≈ targetAcc%.
 * На ошибку: +1 incorrect, +1 correct; без ошибки: +1 correct.
 * acc = N / (N + k) => k/N = 100/acc - 1.
 */
const mistakeProbability = (targetAcc) => {
  if (targetAcc >= 99.5) return 0;
  const a = clamp(targetAcc, 1, 100);
  return clamp(100 / a - 1, 0, 0.92);
};

/**
 * Разброс задержек: на экране consistency ≈ kogasa(stdDev/avg) по raw в секунду.
 * Чем ниже целевая consistency — тем сильнее джиттер и реже длинные паузы.
 */
const delayStdMultiplier = (consistencyTarget, modeName) => {
  if (modeName === "god") return 0.22;
  if (modeName === "nine") return 0.28;
  if (modeName === "human") return 0.38;
  const c = clamp(consistencyTarget, 50, 98);
  return 0.22 + ((98 - c) / 98) * 0.55;
};

const maybeSlowBurst = (consistencyTarget, modeName) => {
  if (modeName === "god") return 0;
  const c = clamp(consistencyTarget, 50, 98);
  const p = 0.008 + ((98 - c) / 98) * 0.06;
  return Math.random() < p ? gaussian(120, 45) : 0;
};

/** Пауза после ошибки: «завис», потом уже бэкспейс и верная буква. */
const mistakeThinkPause = () => {
  if (Math.random() < 0.14) {
    return clamp(gaussian(380, 110), 180, 950);
  }
  return clamp(gaussian(210, 70), 90, 580);
};

const typeOneChar = async (input, char, mustMistake) => {
  input.focus();
  if (!mustMistake || char === "\n") {
    emitInsertText(input, char);
    return;
  }
  const wrong = pickWrongChar(char);
  emitInsertText(input, wrong);
  await sleep(mistakeThinkPause());
  emitDeleteBackward(input);
  await sleep(gaussian(42, 14));
  emitInsertText(input, char);
};

const getFullText = () => {
  const words = document.querySelectorAll("#words .word");
  let text = "";
  words.forEach((word, i) => {
    word.querySelectorAll("letter").forEach((l) => {
      text += l.textContent;
    });
    if (i < words.length - 1) text += " ";
  });
  return text;
};

const start = async () => {
  if (isTyping) return;
  if (!enabled) return;

  const input = getWordsInput();
  if (!input) {
    setTimeout(start, 300);
    return;
  }

  const text = getFullText();
  if (!text || text.length < 5) {
    setTimeout(start, 300);
    return;
  }

  isTyping = true;
  input.click();
  input.focus();
  await sleep(100);

  let wpm;
  let acc;
  let consistencyTarget;
  if (mode === "god") {
    wpm = 150;
    acc = 100;
    consistencyTarget = 93;
  } else if (mode === "nine") {
    wpm = 120;
    acc = 99;
    consistencyTarget = 88;
  } else if (mode === "human") {
    wpm = 80;
    acc = 96;
    consistencyTarget = 82;
  } else {
    wpm = customSettings.wpm;
    acc = customSettings.acc;
    consistencyTarget = customSettings.consistency ?? 80;
  }

  const pMistake = mistakeProbability(acc);
  const stdMul = delayStdMultiplier(consistencyTarget, mode);

  console.log(
    `🎯 ${mode.toUpperCase()}: ${wpm} WPM, ${acc}% acc, ~${(
      pMistake * 100
    ).toFixed(1)}% mistake rounds, consistency UI ~${consistencyTarget}%`
  );

  const baseDelay = 60000 / wpm / 5;

  for (let i = 0; i < text.length && enabled; i++) {
    const char = text[i];
    const roll = Math.random() < pMistake && acc < 99.5;

    await typeOneChar(input, char, roll);

    let delay = gaussian(baseDelay, baseDelay * stdMul);
    if (char === " ") delay += gaussian(22, 12);
    if (Math.random() < 0.012) delay += gaussian(95, 35);
    delay += maybeSlowBurst(consistencyTarget, mode);

    await sleep(Math.max(8, delay));

    const result = document.querySelector("#result");
    if (result && result.offsetParent !== null) {
      console.log("🏁 Тест завершён");
      break;
    }
  }

  isTyping = false;
  enabled = false;
  console.log("✅ Готово!");
};

new MutationObserver(() => {
  const wrapper = document.querySelector("#wordsWrapper");
  const result = document.querySelector("#result");
  const input = document.querySelector("#wordsInput");

  if (result && result.offsetParent !== null) {
    isTyping = false;
    return;
  }

  if (wrapper && input && enabled && !isTyping) {
    setTimeout(start, 400);
  }
}).observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.cmd === "toggle") {
    enabled = msg.state;
    if (enabled && !isTyping) setTimeout(start, 200);
  }
  if (msg.cmd === "setMode") {
    mode = msg.mode;
    enabled = true;
    if (msg.customSettings) {
      customSettings = { ...customSettings, ...msg.customSettings };
    }
    if (!isTyping) setTimeout(start, 200);
  }
});

document.addEventListener("keydown", (e) => {
  if (!e.altKey) return;

  if (e.key === "1") {
    e.preventDefault();
    mode = "god";
    enabled = true;
    console.log("🔥 GOD");
    if (!isTyping) setTimeout(start, 200);
  }
  if (e.key === "2") {
    e.preventDefault();
    mode = "nine";
    enabled = true;
    console.log("💎 999+");
    if (!isTyping) setTimeout(start, 200);
  }
  if (e.key === "3") {
    e.preventDefault();
    mode = "human";
    enabled = true;
    console.log("👤 HUMAN");
    if (!isTyping) setTimeout(start, 200);
  }
  if (e.key === "4") {
    e.preventDefault();
    mode = "custom";
    enabled = true;
    loadStorage(() => {
      console.log("⚙️ CUSTOM");
      if (!isTyping) setTimeout(start, 200);
    });
  }
  if (e.key === "0") {
    e.preventDefault();
    enabled = false;
    isTyping = false;
    console.log("❌ STOP");
  }
});

console.log("✅ Alt+1=GOD | Alt+2=999+ | Alt+3=HUMAN | Alt+4=CUSTOM | Alt+0=STOP");
