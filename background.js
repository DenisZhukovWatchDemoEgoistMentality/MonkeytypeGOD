chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
  
      if (command === "mode_god") {
        chrome.storage.sync.set({ mt_mode: 'god', mt_enabled: true });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'setMode', mode: 'god' });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle', state: true });
      }
      if (command === "mode_nine") {
        chrome.storage.sync.set({ mt_mode: 'nine', mt_enabled: true });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'setMode', mode: 'nine' });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle', state: true });
      }
      if (command === "mode_human") {
        chrome.storage.sync.set({ mt_mode: 'human', mt_enabled: true });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'setMode', mode: 'human' });
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle', state: true });
      }
      if (command === "mode_custom") {
        chrome.storage.sync.get(['mt_wpm', 'mt_acc', 'mt_consistency'], (data) => {
          chrome.storage.sync.set({ mt_mode: 'custom', mt_enabled: true });
          chrome.tabs.sendMessage(tabs[0].id, { 
            cmd: 'setMode', 
            mode: 'custom', 
            customSettings: {
              wpm: data.mt_wpm || 120,
              acc: data.mt_acc ?? 97,
              consistency: data.mt_consistency ?? 80,
            },
          });
          chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle', state: true });
        });
      }
    });
  });