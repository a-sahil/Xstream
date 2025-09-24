// extension/content.js - Complete IPFS-based version with iframe embedding

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
    'balance'
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
    
    // Check if response contains embedded template format
    console.log('🔍 Checking for embedded template in response:', result.response);
    
    if (result.response.includes('<emb ') && result.response.includes(' emb>')) {
      console.log('🎯 Detected embedded template, creating iframe');
      handleEmbeddedTemplate(result.response, selection);
    } else {
      // Regular text replacement for other commands
      console.log('📝 Regular command response, replacing text');
      replaceSelectedText(selection, result.response);
    }
    
  } catch (error) {
    console.error('❌ Error processing command:', error);
    replaceSelectedText(selection, `❌ Error: ${error.message}`);
  }
}

function handleEmbeddedTemplate(responseText, selection) {
  console.log('🎯 Handling embedded template with response:', responseText);
  
  // Extract CID from the response using more flexible regex
  const embeddedMatch = responseText.match(/<emb\s+([a-zA-Z0-9]+)\s+emb>/);
  if (!embeddedMatch) {
    console.log('❌ Could not extract CID from embedded template');
    console.log('🔍 Response text:', responseText);
    replaceSelectedText(selection, responseText);
    return;
  }
  
  const cid = embeddedMatch[1];
  console.log('🔍 Extracted CID:', cid);
  
  // Clean response text (remove the <emb> tags)
  const cleanResponseText = responseText.replace(/<emb\s+[a-zA-Z0-9]+\s+emb>/, '').trim();
  console.log('📝 Clean response text:', cleanResponseText);
  
  // Replace selected text with clean response
  replaceSelectedText(selection, cleanResponseText);
  
  // Create and inject iframe after a short delay
  setTimeout(() => {
    injectDonationIframe(cid, cleanResponseText);
  }, 1000);
}

function injectDonationIframe(cid, responseText) {
  console.log('🖼️ Injecting donation iframe for CID:', cid);
  
  // Remove any existing donation iframes
  const existingIframes = document.querySelectorAll('.socio-donation-iframe');
  existingIframes.forEach(iframe => {
    console.log('🗑️ Removing existing iframe');
    iframe.remove();
  });
  
  // Find the tweet compose area or suitable container
  const tweetTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
  let container = null;
  
  if (tweetTextarea) {
    container = tweetTextarea.closest('[role="textbox"]')?.parentElement;
    console.log('✅ Found container via tweet textarea');
  }
  
  if (!container) {
    container = document.querySelector('[data-testid="primaryColumn"]');
    console.log('✅ Found container via primary column');
  }
  
  if (!container) {
    container = document.querySelector('main');
    console.log('✅ Found container via main tag');
  }
  
  if (!container) {
    container = document.body;
    console.log('✅ Using body as fallback container');
  }
  
  console.log('📍 Using container:', container);
  
  // Create iframe container
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'socio-donation-iframe';
  iframeContainer.style.cssText = `
    margin: 20px 0 !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
    border: 1px solid #e1e8ed !important;
    background: white !important;
    position: relative !important;
    max-width: 500px !important;
  `;
  
  // Create header for the embedded template
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    padding: 12px 16px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  `;
  
  header.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="margin-right: 8px;">🎯</span>
      <span>Interactive Donation Template</span>
    </div>
    <button onclick="this.closest('.socio-donation-iframe').remove()" 
            style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 12px; cursor: pointer; font-size: 14px;">
      ×
    </button>
  `;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `http://localhost:8000/template/${cid}`;
  iframe.style.cssText = `
    width: 100% !important;
    height: 500px !important;
    border: none !important;
    display: block !important;
  `;
  
  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = `
    padding: 40px !important;
    text-align: center !important;
    color: #666 !important;
    font-size: 14px !important;
  `;
  loadingDiv.innerHTML = '⏳ Loading donation template...';
  
  iframe.onload = () => {
    console.log('✅ Donation iframe loaded successfully');
    if (loadingDiv.parentElement) {
      loadingDiv.remove();
    }
  };
  
  iframe.onerror = () => {
    console.log('❌ Failed to load donation iframe');
    loadingDiv.innerHTML = `
      <div style="color: #e74c3c;">
        <p>❌ Failed to load donation template</p>
        <p><small>CID: ${cid}</small></p>
        <p><small>URL: http://localhost:8000/template/${cid}</small></p>
      </div>
    `;
  };
  
  // Assemble the container
  iframeContainer.appendChild(header);
  iframeContainer.appendChild(loadingDiv);
  iframeContainer.appendChild(iframe);
  
  // Insert the iframe container
  try {
    if (tweetTextarea && tweetTextarea.parentElement) {
      // Try to insert after the tweet compose area
      const insertTarget = tweetTextarea.closest('[role="textbox"]')?.parentElement || tweetTextarea.parentElement;
      insertTarget.insertAdjacentElement('afterend', iframeContainer);
      console.log('✅ Iframe inserted after tweet compose area');
    } else if (container && container !== document.body) {
      // Insert into the container
      container.appendChild(iframeContainer);
      console.log('✅ Iframe appended to container');
    } else {
      // Fallback: add to body as fixed position
      document.body.appendChild(iframeContainer);
      iframeContainer.style.position = 'fixed';
      iframeContainer.style.top = '20px';
      iframeContainer.style.right = '20px';
      iframeContainer.style.width = '400px';
      iframeContainer.style.zIndex = '999999';
      console.log('✅ Iframe added to body as fixed fallback');
    }
    
    // Scroll into view after a delay
    setTimeout(() => {
      iframeContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      console.log('📍 Scrolled iframe into view');
    }, 500);
    
  } catch (error) {
    console.error('❌ Error inserting iframe:', error);
    // Ultimate fallback: add to body with fixed positioning
    document.body.appendChild(iframeContainer);
    iframeContainer.style.position = 'fixed';
    iframeContainer.style.top = '20px';
    iframeContainer.style.right = '20px';
    iframeContainer.style.width = '400px';
    iframeContainer.style.zIndex = '999999';
    console.log('✅ Iframe added to body as ultimate fallback');
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

// Handle navigation changes (Twitter is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 Navigation detected, cleaning up iframes');
    
    // Clean up existing iframes when navigating
    const existingIframes = document.querySelectorAll('.socio-donation-iframe');
    existingIframes.forEach(iframe => {
      console.log('🗑️ Removing iframe due to navigation');
      iframe.remove();
    });
    
    setTimeout(() => {
      findAndSendUsername();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Cleanup function for page unload
window.addEventListener('beforeunload', () => {
  const existingIframes = document.querySelectorAll('.socio-donation-iframe');
  existingIframes.forEach(iframe => iframe.remove());
});

// Force test after 5 seconds for debugging
setTimeout(() => {
  console.log('🧪 SocioAgent initialization complete');
  console.log('Current username:', currentUsername);
  console.log('Ready for blockchain operations');
}, 5000);