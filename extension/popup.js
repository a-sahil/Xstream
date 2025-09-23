// extension/popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const userInfoEl = document.getElementById('userInfo');
  const twitterIdEl = document.getElementById('twitterId');
  const uuidEl = document.getElementById('uuid');
  const aptosAddressEl = document.getElementById('aptosAddress');

  // Fetch the username from storage
  chrome.storage.local.get(['twitterUsername'], (result) => {
    const username = result.twitterUsername;

    if (username) {
      statusEl.textContent = `Fetching data for @${username}...`;
      fetchWalletData(username);
    } else {
      statusEl.textContent = 'Could not find Twitter username. Please ensure you are on your profile page and reload.';
    }
  });
  
  async function fetchWalletData(twitterId) {
    try {
      const response = await fetch('http://localhost:8000/api/get-or-create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ twitterId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      // Update the UI
      statusEl.style.display = 'none';
      userInfoEl.style.display = 'block';

      twitterIdEl.textContent = `@${twitterId}`;
      uuidEl.textContent = data.uuid;
      aptosAddressEl.textContent = data.aptosAddress;

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      statusEl.textContent = 'Error: Could not connect to the backend server. Is it running?';
    }
  }
});