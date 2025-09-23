// extension/background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_USERNAME') {
    // Store the username in chrome.storage so the popup can access it.
    chrome.storage.local.set({ twitterUsername: message.username }, () => {
      console.log(`Username saved: ${message.username}`);
    });
  }
});