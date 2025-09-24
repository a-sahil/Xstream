// extension/content.js - Final version using a new tab instead of an iframe

console.log('🔍 SocioAgent: Content script loaded');

let currentUsername = null;

function findAndSendUsername() {
  const profileLinkSelector = 'a[data-testid="AppTabBar_Profile_Link"]';
  const profileLinkElement = document.querySelector(profileLinkSelector);

  if (profileLinkElement) {
    const href = profileLinkElement.getAttribute('href');
    
    if (href && href.startsWith('/')) {
      const username = href.substring(1);
      
      if (username && !username.includes('/')) {
        console.log('✅ SocioAgent: Found username:', username);
        currentUsername = username;
        
        chrome.runtime.sendMessage({ type: 'SET_USERNAME', username: username });
        return true;
      }
    }
  }
  
  return false;
}

function addContextMenu(event) {
  console.log('🔍 Selection event triggered');
  
  const existingMenu = document.getElementById('socio-agent-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    return;
  }

  if (isBlockchainCommand(selectedText)) {
    console.log('✅ Blockchain command detected:', selectedText);
    createContextMenu(selection, selectedText);
  } else {
    console.log('❌ Not a blockchain command:', selectedText);
  }
}

function isBlockchainCommand(text) {
  const blockchainKeywords = [
    'fetch my balance', 
    'check balance', 
    'get balance',
    'send transaction', 
    'send', 
    'transfer',
    'create donation', 
    'donate', 
    'template',
    'what is the price', 
    'price of', 
    'coin price',
    'balance'
  ];
  
  const lowerText = text.toLowerCase();
  return blockchainKeywords.some(keyword => lowerText.includes(keyword));
}

function createContextMenu(selection, selectedText) {
  console.log('🔍 Creating context menu');
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const menu = document.createElement('div');
  menu.id = 'socio-agent-menu';
  menu.style.cssText = `
    position: fixed !important;
    top: ${rect.bottom + window.scrollY + 10}px !important;
    left: ${rect.left + window.scrollX}px !important;
    background: #1d9bf0 !important;
    color: white !important;
    padding: 8px 12px !important;
    border-radius: 16px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    z-index: 999999 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
    user-select: none !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    border: 2px solid #0f7bb8 !important;
    min-width: 200px !important;
    text-align: center !important;
  `;
  menu.textContent = '🔗 AI action with SocioAgent';
  
  menu.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    processBlockchainCommand(selectedText, selection);
    menu.remove();
  });
  
  document.body.appendChild(menu);

  const cleanup = () => {
    if (menu.parentNode) menu.remove();
  };
  
  setTimeout(cleanup, 10000);
  document.addEventListener('click', cleanup, { once: true });
}

async function processBlockchainCommand(command, selection) {
  console.log('🚀 Processing command:', command);
  
  if (!currentUsername) {
    alert('SocioAgent: Please visit your profile page first to initialize your wallet.');
    return;
  }

  try {
    const loadingText = '⏳ Processing with SocioAgent...';
    replaceSelectedText(selection, loadingText);
    
    const response = await fetch('http://localhost:8000/api/process-command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterId: currentUsername,
        command: command,
        context: getTwitterContext()
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Command result:', result);
    
    if (result.response.includes('<emb ') && result.response.includes(' emb>')) {
      handleEmbeddedTemplate(result.response, selection);
    } else {
      replaceSelectedText(selection, result.response);
    }
    
  } catch (error) {
    console.error('❌ Error processing command:', error);
    replaceSelectedText(selection, `❌ Error: ${error.message}`);
  }
}

// --- MODIFIED FUNCTION ---
// This function no longer creates an iframe. It now calls injectDonationLink.
function handleEmbeddedTemplate(responseText, selection) {
  console.log('🎯 Handling embedded template. Will open in a new tab.');
  
  const embeddedMatch = responseText.match(/<emb\s+([a-zA-Z0-9]+)\s+emb>/);
  if (!embeddedMatch) {
    console.error('❌ Could not extract CID from embedded template:', responseText);
    replaceSelectedText(selection, responseText);
    return;
  }
  
  const cid = embeddedMatch[1];
  console.log('🔍 Extracted CID:', cid);
  
  const cleanResponseText = responseText.replace(/<emb\s+[a-zA-Z0-9]+\s+emb>/, '').trim();
  
  replaceSelectedText(selection, cleanResponseText);
  
  // Inject a link/button that opens the donation page in a new tab
  setTimeout(() => injectDonationLink(cid), 500);
}

// --- NEW FUNCTION ---
// This function creates a button to open the donation page in a new tab.
function injectDonationLink(cid) {
  console.log('🚀 Injecting donation link for CID:', cid);
  
  // Remove any previously injected link to avoid duplicates
  const existingLink = document.querySelector('.socio-donation-link-container');
  if (existingLink) existingLink.remove();

  // Find the tweet composer area to place the button logically
  const tweetTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
  const container = tweetTextarea ? tweetTextarea.closest('[role="textbox"]').parentElement : document.querySelector('[data-testid="primaryColumn"]');

  if (!container) {
      console.error("Could not find a suitable container to inject the donation link.");
      return;
  }

  const linkContainer = document.createElement('div');
  linkContainer.className = 'socio-donation-link-container';
  linkContainer.style.cssText = `
    margin: 15px 0 !important;
    padding: 15px !important;
    border-radius: 16px !important;
    border: 1px solid #1d9bf0 !important;
    background: #f0f8ff !important;
    text-align: center !important;
    max-width: 500px !important;
  `;

  const text = document.createElement('p');
  text.textContent = 'Your interactive donation template is ready.';
  text.style.cssText = 'color: #333; font-size: 14px; margin-bottom: 12px;';

  const button = document.createElement('button');
  button.textContent = '🚀 Open Donation Page';
  button.style.cssText = `
    background: #1d9bf0;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 15px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  `;
  button.onmouseover = () => button.style.backgroundColor = '#1a8cd8';
  button.onmouseout = () => button.style.backgroundColor = '#1d9bf0';
  
  button.onclick = () => {
    console.log(`Opening template in new tab: http://localhost:8000/template/${cid}`);
    window.open(`http://localhost:8000/template/${cid}`, '_blank');
  };

  linkContainer.appendChild(text);
  linkContainer.appendChild(button);
  
  if (tweetTextarea) {
    container.insertAdjacentElement('afterend', linkContainer);
  } else {
    // Fallback for other pages
    container.prepend(linkContainer);
  }

  linkContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function replaceSelectedText(selection, newText) {
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    selection.removeAllRanges();
    console.log('✅ Text replaced with:', newText);
  }
}

function getTwitterContext() {
  const tweetText = document.querySelector('[data-testid="tweetText"]')?.textContent;
  return {
    tweetText,
    url: window.location.href
  };
}

// --- Event Listeners and Initialization (Unchanged) ---
console.log('🔍 Setting up event listeners');

document.addEventListener('mouseup', (e) => {
  setTimeout(() => addContextMenu(e), 100);
});

document.addEventListener('keyup', (e) => {
  setTimeout(() => addContextMenu(e), 100);
});

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  if (text) {
    console.log('🔍 Selection changed:', text);
  }
});

console.log('🔍 Starting username detection...');

const intervalId = setInterval(() => {
  if (findAndSendUsername()) {
    clearInterval(intervalId);
    console.log('✅ Username detected, ready for blockchain operations');
  } else {
    console.log('🔍 Still looking for username...');
  }
}, 2000);

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    const existingLink = document.querySelector('.socio-donation-link-container');
    if (existingLink) existingLink.remove();
    
    setTimeout(() => {
      findAndSendUsername();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

window.addEventListener('beforeunload', () => {
  const existingLink = document.querySelector('.socio-donation-link-container');
  if (existingLink) existingLink.remove();
});

setTimeout(() => {
  console.log('🧪 SocioAgent initialization complete');
  console.log('Current username:', currentUsername);
}, 5000);