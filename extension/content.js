// extension/content.js - Debug version

console.log('🔍 SocioAgent DEBUG: Content script loaded');

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

// Simplified context menu function
function addContextMenu(event) {
  console.log('🔍 Selection event triggered');
  
  // Remove existing menu
  const existingMenu = document.getElementById('socio-agent-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  console.log('🔍 Selected text:', selectedText);
  
  if (!selectedText) {
    console.log('🔍 No text selected');
    return;
  }

  // Check if it's a blockchain command
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
    'balance' // Added broader match
  ];
  
  const lowerText = text.toLowerCase();
  const isCommand = blockchainKeywords.some(keyword => lowerText.includes(keyword));
  
  console.log('🔍 Checking if blockchain command:', { text: lowerText, isCommand });
  
  return isCommand;
}

function createContextMenu(selection, selectedText) {
  console.log('🔍 Creating context menu');
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  console.log('🔍 Menu position:', { top: rect.bottom, left: rect.left });
  
  // Create context menu
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
    console.log('✅ Menu clicked');
    processBlockchainCommand(selectedText, selection);
    menu.remove();
  });
  
  document.body.appendChild(menu);
  console.log('✅ Menu added to DOM');
  
  // Remove menu after 10 seconds or when clicking elsewhere
  const cleanup = () => {
    if (menu.parentNode) {
      menu.remove();
      console.log('🧹 Menu removed');
    }
  };
  
  setTimeout(cleanup, 10000);
  
  // Remove on outside click
  setTimeout(() => {
    const outsideClickHandler = (e) => {
      if (!menu.contains(e.target)) {
        cleanup();
        document.removeEventListener('click', outsideClickHandler);
      }
    };
    document.addEventListener('click', outsideClickHandler);
  }, 100);
}

async function processBlockchainCommand(command, selection) {
  console.log('🚀 Processing command:', command);
  
  if (!currentUsername) {
    alert('SocioAgent: Please visit your profile page first to initialize your wallet.');
    return;
  }

  try {
    // Show loading state
    const loadingText = '⏳ Processing with SocioAgent...';
    replaceSelectedText(selection, loadingText);
    console.log('⏳ Showing loading state');
    
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

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Command result:', result);
    
    // Replace loading text with result
    replaceSelectedText(selection, result.response);
    
  } catch (error) {
    console.error('❌ Error processing command:', error);
    replaceSelectedText(selection, `❌ Error: ${error.message}`);
  }
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

// Event listeners with debugging
console.log('🔍 Setting up event listeners');

document.addEventListener('mouseup', (e) => {
  console.log('🖱️ Mouse up event');
  setTimeout(() => addContextMenu(e), 100); // Small delay to ensure selection is complete
});

document.addEventListener('keyup', (e) => {
  console.log('⌨️ Key up event');
  setTimeout(() => addContextMenu(e), 100);
});

// Test selection detection
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  if (text) {
    console.log('🔍 Selection changed:', text);
  }
});

// Initialize username detection
console.log('🔍 Starting username detection...');

const intervalId = setInterval(() => {
  if (findAndSendUsername()) {
    clearInterval(intervalId);
    console.log('✅ Username detected, ready for blockchain operations');
  } else {
    console.log('🔍 Still looking for username...');
  }
}, 2000);

// Force test after 5 seconds
setTimeout(() => {
  console.log('🧪 Running test selection...');
  // This will help us see if the script is working
}, 5000);