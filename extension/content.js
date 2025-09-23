// extension/content.js

function findAndSendUsername() {
  // This new selector looks for the navigation link that is specifically for the "Profile".
  // It's the most reliable selector used by X.com's interface.
  const profileLinkSelector = 'a[data-testid="AppTabBar_Profile_Link"]';
  
  const profileLinkElement = document.querySelector(profileLinkSelector);

  if (profileLinkElement) {
    // The href attribute of this link is the user's profile path (e.g., "/YourUsername")
    const href = profileLinkElement.getAttribute('href');
    
    if (href && href.startsWith('/')) {
      const username = href.substring(1); // Remove the leading '/'
      
      // We check to make sure it's not a different link like "/messages"
      if (username && !username.includes('/')) {
        console.log('SocioAgent: SUCCESS! Found username via href:', username);
        
        // Send the username to the background script to be stored.
        chrome.runtime.sendMessage({ type: 'SET_USERNAME', username: username });

        return true; // Signal that we found the username.
      }
    }
  }
  
  // If we reach here, the element wasn't found yet.
  return false;
}

// --- Main Logic ---
console.log('SocioAgent: Content script loaded. Polling for username...');

// We will check for the element every 2 seconds. This is necessary because
// X.com loads content dynamically.
const intervalId = setInterval(() => {
  if (findAndSendUsername()) {
    // Once the username is found and sent, we stop checking to save resources.
    clearInterval(intervalId);
    console.log('SocioAgent: Username has been sent. Stopping the search.');
  }
}, 2000); // Check every 2 seconds