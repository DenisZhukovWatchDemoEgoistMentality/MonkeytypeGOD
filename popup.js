const toggleBtn = document.getElementById('toggleBtn');
const wpmInput = document.getElementById('wpm');
const accInput = document.getElementById('acc');
const consistencyInput = document.getElementById('consistency');
const saveBtn = document.getElementById('saveBtn');
const siteEl = document.getElementById('site');
const modeBtns = document.querySelectorAll('.mode-btn');

let enabled = false;
let currentMode = 'custom';
let onMonkeyType = false;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (url.includes('monkeytype')) {
    onMonkeyType = true;
    siteEl.textContent = 'MonkeyType';
    chrome.storage.sync.get(['mt_enabled', 'mt_wpm', 'mt_acc', 'mt_consistency', 'mt_mode'], (d) => {
      enabled = d.mt_enabled || false;
      wpmInput.value = d.mt_wpm || 120;
      accInput.value = d.mt_acc ?? 98;
      consistencyInput.value = d.mt_consistency ?? 80;
      currentMode = d.mt_mode || 'custom';
      updateUI();
    });
  } else {
    siteEl.textContent = 'Not MonkeyType';
  }
});

toggleBtn.onclick = () => {
  if (!onMonkeyType) return;
  enabled = !enabled;
  chrome.storage.sync.set({ mt_enabled: enabled });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle', state: enabled });
  });
  updateUI();
};

modeBtns.forEach((btn) => {
  btn.onclick = () => {
    currentMode = btn.dataset.mode;
    modeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (onMonkeyType) {
      chrome.storage.sync.set({ mt_mode: currentMode });
    }
  };
});

saveBtn.onclick = () => {
  if (!onMonkeyType) return;
  const wpm = parseInt(wpmInput.value, 10) || 120;
  const acc = parseFloat(accInput.value) || 98;
  const consistency = Math.min(85, Math.max(74, parseInt(consistencyInput.value, 10) || 80));
  consistencyInput.value = consistency;
  chrome.storage.sync.set({
    mt_wpm: wpm,
    mt_acc: acc,
    mt_consistency: consistency,
    mt_mode: currentMode,
  });

  saveBtn.textContent = '✅ Saved';
  setTimeout(() => {
    saveBtn.textContent = '💾 SAVE';
  }, 1500);
};

function updateUI() {
  toggleBtn.textContent = enabled ? 'DEACTIVATE' : 'ACTIVATE';
  toggleBtn.className = enabled ? 'toggle-btn on' : 'toggle-btn off';

  modeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
}
