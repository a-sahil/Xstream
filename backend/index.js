// backend/index.js - Enhanced with IPFS and iframe embedding

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

const connectDB = require('./db');
const User = require('./models/User');

// Aptos SDK imports
const { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: ['https://x.com', 'https://twitter.com', 'https://www.x.com', 'https://www.twitter.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

connectDB();

// Initialize Aptos client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Pinata configuration for IPFS
const PINATA_API_KEY = process.env.PINATA_API_KEY || '8cecbe4afa0f696e21d1';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '238dbfec3b9714fe9a022868d374e52b075812a5281d16892097ab45764ce52c';
const PINATA_JWT = process.env.PINATA_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2N2FhMzExMC1hNWY0LTQ1NTAtYThjNi0wZmNhNDZiMmM3ODQiLCJlbWFpbCI6ImFsaXNhaGlsMDEwNUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGNlY2JlNGFmYTBmNjk2ZTIxZDEiLCJzY29wZWRLZXlTZWNyZXQiOiIyMzhkYmZlYzNiOTcxNGZlOWEwMjI4NjhkMzc0ZTUyYjA3NTgxMmE1MjgxZDE2ODkyMDk3YWI0NTc2NGNlNTJjIiwiZXhwIjoxNzkwMjc0Mzc0fQ.06DPIbMuUU1YEOoesqLA1ELHut7yI1R-MpQHbxQiIKQ';

// Upload to IPFS via Pinata
async function uploadToPinata(jsonData, filename) {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: jsonData,
        pinataMetadata: {
          name: filename,
          keyvalues: {
            type: 'donation_template'
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error.response?.data || error.message);
    throw new Error('Failed to upload to IPFS');
  }
}

// Fetch from IPFS via Pinata Gateway
async function fetchFromIPFS(cid) {
  try {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to fetch from IPFS');
  }
}

// NLP Command Processing Class (same as before)
class BlockchainCommandProcessor {
  constructor() {
    this.commandPatterns = {
      balance: [
        /fetch my balance/i,
        /check balance/i,
        /get balance/i,
        /what.*balance/i
      ],
      send: [
        /send\s+(?:transaction\s+of\s+)?(\d+(?:\.\d+)?)\s*(?:APT|aptos?)?\s+to\s+@(\w+)/i,
        /transfer\s+(\d+(?:\.\d+)?)\s*(?:APT|aptos?)?\s+to\s+@(\w+)/i
      ],
      price: [
        /what.*price.*of.*(\w+)/i,
        /(\w+)\s+price/i,
        /price.*(\w+)/i
      ],
      donate: [
        /create.*donation.*template/i,
        /donation.*for.*(.+)/i
      ]
    };
  }

  parseCommand(command, context) {
    const cmd = command.toLowerCase().trim();

    // Check balance commands
    for (const pattern of this.commandPatterns.balance) {
      if (pattern.test(cmd)) {
        return { type: 'balance', params: {} };
      }
    }

    // Check send commands
    for (const pattern of this.commandPatterns.send) {
      const match = cmd.match(pattern);
      if (match) {
        let recipient = match[2];
        if (recipient.startsWith('@')) {
          recipient = recipient.substring(1);
        }
        return {
          type: 'send',
          params: {
            amount: parseFloat(match[1]),
            recipient: recipient
          }
        };
      }
    }

    // Check price commands
    for (const pattern of this.commandPatterns.price) {
      const match = cmd.match(pattern);
      if (match) {
        let coin = match[1];
        if (context?.tweetText) {
          const coinMatch = context.tweetText.match(/\$(\w+)/i);
          if (coinMatch) {
            coin = coinMatch[1];
          }
        }
        return {
          type: 'price',
          params: { coin }
        };
      }
    }

    // Check donation commands
    for (const pattern of this.commandPatterns.donate) {
      const match = cmd.match(pattern);
      if (match) {
        return {
          type: 'donate',
          params: {
            cause: match[1] || 'General Donation',
            chain: 'aptos'
          }
        };
      }
    }

    return { type: 'unknown', params: {} };
  }
}

const commandProcessor = new BlockchainCommandProcessor();

// Utility functions (same as before)
function privateKeyToHex(pk) {
  if (!pk && pk !== 0) return null;
  if (pk instanceof Uint8Array || Buffer.isBuffer(pk)) {
    return '0x' + Buffer.from(pk).toString('hex');
  }
  if (typeof pk.toUint8Array === 'function') {
    const bytes = pk.toUint8Array();
    if (bytes instanceof Uint8Array) return '0x' + Buffer.from(bytes).toString('hex');
  }
  if (typeof pk.hex === 'string') {
    return pk.hex.startsWith('0x') ? pk.hex : '0x' + pk.hex;
  }
  if (typeof pk === 'string') {
    return pk.startsWith('0x') ? pk : '0x' + pk;
  }
  return null;
}

function addressFromAccount(acc) {
  try {
    if (typeof acc.address === 'function') {
      const addr = acc.address();
      if (addr && typeof addr.toString === 'function') return addr.toString();
      if (typeof addr === 'string') return addr;
    }
  } catch (e) { /* ignore */ }

  if (acc?.accountAddress) {
    if (typeof acc.accountAddress === 'string') return acc.accountAddress;
    if (acc.accountAddress?.toString) return acc.accountAddress.toString();
  }
  
  return null;
}

// Enhanced donation template creation with IPFS
async function createDonationTemplate(params, creatorUser) {
  try {
    const { cause, chain } = params;
    
    // Create template data structure
    const templateData = {
      id: uuidv4(),
      type: 'donation',
      title: cause || 'General Donation',
      description: `Support ${cause || 'this cause'} by donating directly to @${creatorUser.twitterId}`,
      recipient: {
        twitterHandle: creatorUser.twitterId,
        walletAddress: creatorUser.aptosAddress,
        uuid: creatorUser.uuid
      },
      chain: chain || 'aptos',
      network: 'testnet',
      suggestedAmounts: [0.1, 0.5, 1.0, 5.0],
      minimumAmount: 0.01,
      currency: 'APT',
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    console.log('Creating donation template:', templateData);

    // Upload to IPFS via Pinata
    const ipfsHash = await uploadToPinata(templateData, `donation-${templateData.id}.json`);
    
    console.log(`Template uploaded to IPFS: ${ipfsHash}`);

    // Return the embeddable format
    return `<emb ${ipfsHash} emb>

🎯 **Donation Template Created!**

💝 ${cause || 'General Donation'}
👤 Recipient: @${creatorUser.twitterId}
💰 Chain: ${chain?.toUpperCase() || 'APTOS'}

Anyone can now donate directly to your wallet using the embedded template above!

Template CID: ${ipfsHash}`;

  } catch (error) {
    console.error('Error creating donation template:', error);
    return `❌ Could not create donation template: ${error.message}`;
  }
}

// Replace your /template/:cid endpoint in backend/index.js with this version

app.get('/template/:cid', async (req, res) => {
  const { cid } = req.params;
  
  try {
    // Fetch template data from IPFS
    const templateData = await fetchFromIPFS(cid);
    
    // Serve HTML page with improved Petra Wallet detection
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${templateData.title} - SocioAgent Donation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .donation-container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        .title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
        .description { font-size: 14px; color: #666; margin-bottom: 20px; }
        .recipient-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .recipient-twitter { font-size: 16px; color: #1d9bf0; font-weight: 600; margin-bottom: 5px; }
        .recipient-address { font-size: 12px; color: #666; word-break: break-all; font-family: monospace; }
        .amount-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        .amount-btn {
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            background: white;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        .amount-btn:hover, .amount-btn.active {
            border-color: #1d9bf0;
            background: #1d9bf0;
            color: white;
        }
        .custom-amount {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            text-align: center;
            font-size: 16px;
            margin: 10px 0;
        }
        .custom-amount:focus {
            outline: none;
            border-color: #1d9bf0;
        }
        .donate-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #1d9bf0, #1565c0);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.2s;
        }
        .donate-btn:hover:not(:disabled) { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 20px rgba(29, 155, 240, 0.3); 
        }
        .donate-btn:disabled { 
            background: #ccc; 
            cursor: not-allowed; 
            transform: none; 
            box-shadow: none; 
        }
        .status { 
            margin: 15px 0; 
            padding: 10px; 
            border-radius: 8px; 
            font-size: 14px; 
        }
        .status.connected { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb; 
        }
        .status.disconnected { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb; 
        }
        .status.connecting {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .powered-by { 
            margin-top: 20px; 
            font-size: 12px; 
            color: #999; 
        }
        .transaction-hash {
            margin-top: 15px;
            padding: 10px;
            background: #d4edda;
            border-radius: 8px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
        }
        .error-message {
            margin-top: 15px;
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border-radius: 8px;
            font-size: 12px;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #1d9bf0;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .install-petra {
            background: #ff6b6b;
            color: white;
            padding: 10px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 14px;
        }
        .install-petra a {
            color: white;
            text-decoration: underline;
        }
        .debug-info {
            background: #e9ecef;
            padding: 10px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 12px;
            font-family: monospace;
            text-align: left;
            max-height: 100px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="donation-container">
        <div class="title">${templateData.title}</div>
        <div class="description">${templateData.description}</div>
        
        <div class="recipient-info">
            <div class="recipient-twitter">@${templateData.recipient.twitterHandle}</div>
            <div class="recipient-address">${templateData.recipient.walletAddress}</div>
        </div>

        <div id="walletStatus" class="status disconnected">
            Checking for Petra Wallet...
        </div>

        <div id="petraInstall" class="install-petra" style="display: none;">
            Petra Wallet not found! <a href="https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci" target="_blank">Install Petra Wallet</a>
        </div>

        <div id="debugInfo" class="debug-info" style="display: none;"></div>

        <div class="amount-buttons">
            ${templateData.suggestedAmounts.map(amount => 
                `<button class="amount-btn" data-amount="${amount}">${amount} ${templateData.currency}</button>`
            ).join('')}
        </div>
        
        <input type="number" class="custom-amount" placeholder="Custom amount (${templateData.currency})" 
               id="customAmount" step="0.01" min="${templateData.minimumAmount}">

        <button id="connectWallet" class="donate-btn" disabled>Checking Petra Wallet...</button>
        <button id="donateBtn" class="donate-btn" style="display: none;" disabled>Select Amount to Donate</button>

        <div id="transactionResult"></div>

        <div class="powered-by">
            Powered by SocioAgent ⚡ ${templateData.chain.toUpperCase()}
        </div>
    </div>

    <script>
        const templateData = ${JSON.stringify(templateData)};
        const RECIPIENT_ADDRESS = "${templateData.recipient.walletAddress}";
        
        let selectedAmount = 0;
        let walletConnected = false;
        let walletAddress = null;
        let petraCheckAttempts = 0;
        const maxAttempts = 20; // Check for 10 seconds

        // Debug logging
        function addDebugLog(message) {
            console.log(message);
            const debugDiv = document.getElementById('debugInfo');
            debugDiv.style.display = 'block';
            debugDiv.innerHTML += message + '\\n';
            debugDiv.scrollTop = debugDiv.scrollHeight;
        }

        // Amount selection handlers
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedAmount = parseFloat(btn.dataset.amount);
                document.getElementById('customAmount').value = '';
                updateDonateButton();
            });
        });

        document.getElementById('customAmount').addEventListener('input', (e) => {
            selectedAmount = parseFloat(e.target.value) || 0;
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            updateDonateButton();
        });

        function updateDonateButton() {
            const donateBtn = document.getElementById('donateBtn');
            if (walletConnected && selectedAmount >= templateData.minimumAmount) {
                donateBtn.disabled = false;
                donateBtn.textContent = \`Donate \${selectedAmount} \${templateData.currency}\`;
            } else if (walletConnected) {
                donateBtn.disabled = true;
                donateBtn.textContent = 'Select Amount to Donate';
            }
        }

        function updateWalletStatus(message, type = 'disconnected') {
            const statusEl = document.getElementById('walletStatus');
            statusEl.textContent = message;
            statusEl.className = \`status \${type}\`;
        }

        function showError(message) {
            const errorDiv = document.getElementById('transactionResult');
            errorDiv.innerHTML = \`<div class="error-message">❌ \${message}</div>\`;
        }

        function showSuccess(txHash) {
            const successDiv = document.getElementById('transactionResult');
            successDiv.innerHTML = \`
                <div class="transaction-hash">
                    ✅ Donation successful!<br>
                    <a href="https://explorer.aptoslabs.com/txn/\${txHash}?network=testnet" target="_blank">
                        View Transaction: \${txHash.substring(0, 20)}...
                    </a>
                </div>
            \`;
        }

        // Enhanced Petra wallet detection with retry mechanism
        function checkPetraWallet() {
            addDebugLog(\`Checking for Petra wallet, attempt: \${petraCheckAttempts + 1}\`);
            addDebugLog(\`window.aptos exists: \${!!window.aptos}\`);
            
            if (window.aptos) {
                addDebugLog('Petra wallet detected!');
                document.getElementById('petraInstall').style.display = 'none';
                document.getElementById('connectWallet').disabled = false;
                document.getElementById('connectWallet').textContent = 'Connect Petra Wallet';
                updateWalletStatus('Ready to connect', 'disconnected');
                return true;
            }
            
            petraCheckAttempts++;
            if (petraCheckAttempts >= maxAttempts) {
                addDebugLog('Petra wallet not found after maximum attempts');
                document.getElementById('petraInstall').style.display = 'block';
                document.getElementById('connectWallet').textContent = 'Install Petra Wallet First';
                document.getElementById('connectWallet').disabled = true;
                updateWalletStatus('Petra Wallet not installed', 'disconnected');
                return false;
            }
            
            // Continue checking
            setTimeout(checkPetraWallet, 500);
            return false;
        }

        // Enhanced wallet connection
        document.getElementById('connectWallet').addEventListener('click', async () => {
            if (!window.aptos) {
                addDebugLog('Petra wallet not available at connection time');
                document.getElementById('petraInstall').style.display = 'block';
                showError('Petra Wallet not found. Please install and refresh the page.');
                return;
            }

            try {
                updateWalletStatus('Connecting to Petra Wallet...', 'connecting');
                addDebugLog('Attempting to connect to Petra wallet...');
                
                const connectPromise = window.aptos.connect();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                );
                
                const response = await Promise.race([connectPromise, timeoutPromise]);
                addDebugLog(\`Wallet connection response: \${JSON.stringify(response)}\`);
                
                if (response && response.address) {
                    walletAddress = response.address;
                    walletConnected = true;
                    
                    updateWalletStatus(\`Connected: \${walletAddress.substring(0, 10)}...\`, 'connected');
                    
                    document.getElementById('connectWallet').style.display = 'none';
                    document.getElementById('donateBtn').style.display = 'block';
                    
                    updateDonateButton();
                    addDebugLog(\`Wallet connected successfully: \${walletAddress}\`);
                } else {
                    throw new Error('No address returned from wallet connection');
                }
                
            } catch (error) {
                addDebugLog(\`Wallet connection error: \${error.message}\`);
                updateWalletStatus('Failed to connect wallet', 'disconnected');
                
                let errorMessage = 'Connection failed';
                if (error.message.includes('User rejected') || error.message.includes('User declined')) {
                    errorMessage = 'Connection rejected by user';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Connection timeout - please try again';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showError(errorMessage);
            }
        });

        // Transaction handling (same as before but with debug logging)
        document.getElementById('donateBtn').addEventListener('click', async () => {
            if (!walletConnected || selectedAmount < templateData.minimumAmount) {
                showError('Please connect wallet and select a valid amount');
                return;
            }

            if (!window.aptos) {
                showError('Petra Wallet connection lost. Please refresh and reconnect.');
                return;
            }

            const donateBtn = document.getElementById('donateBtn');
            const originalText = donateBtn.textContent;
            
            try {
                donateBtn.disabled = true;
                donateBtn.innerHTML = '<div class="loading"></div>Processing...';
                
                document.getElementById('transactionResult').innerHTML = '';

                const amountInOctas = Math.floor(selectedAmount * 100000000);
                
                addDebugLog(\`Creating transaction: \${selectedAmount} APT to \${RECIPIENT_ADDRESS}\`);

                const transaction = {
                    type: "entry_function_payload",
                    function: "0x1::aptos_account::transfer",
                    arguments: [RECIPIENT_ADDRESS, amountInOctas.toString()],
                    type_arguments: []
                };

                const txPromise = window.aptos.signAndSubmitTransaction(transaction);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction timeout')), 30000)
                );
                
                const pendingTransaction = await Promise.race([txPromise, timeoutPromise]);
                
                addDebugLog(\`Transaction result: \${JSON.stringify(pendingTransaction)}\`);

                if (pendingTransaction && pendingTransaction.hash) {
                    showSuccess(pendingTransaction.hash);
                    updateWalletStatus(\`Connected: \${walletAddress.substring(0, 10)}...\`, 'connected');
                    donateBtn.textContent = 'Thank you for your donation! 🙏';
                } else {
                    throw new Error('Transaction submission failed - no hash returned');
                }
                
            } catch (error) {
                addDebugLog(\`Transaction error: \${error.message}\`);
                
                let errorMessage = 'Transaction failed';
                if (error.message.includes('User rejected') || error.message.includes('User declined')) {
                    errorMessage = 'Transaction rejected by user';
                } else if (error.message.includes('Insufficient balance')) {
                    errorMessage = 'Insufficient balance in wallet';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Transaction timeout - please try again';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showError(errorMessage);
                updateWalletStatus(\`Connected: \${walletAddress.substring(0, 10)}...\`, 'connected');
                donateBtn.disabled = false;
                donateBtn.textContent = originalText;
            }
        });

        // Initialize everything
        window.addEventListener('load', () => {
            addDebugLog('Page loaded, starting initialization...');
            setTimeout(() => {
                checkPetraWallet();
            }, 1000);
        });

        // Immediate check as well
        setTimeout(() => {
            addDebugLog('Immediate check...');
            checkPetraWallet();
        }, 100);
    </script>
</body>
</html>
    `);
    
  } catch (error) {
    console.error('Error serving template:', error);
    res.status(500).send('Error loading donation template');
  }
});

// All other endpoints remain the same...
app.post('/api/get-or-create-user', async (req, res) => {
  // Same as before...
  const { twitterId } = req.body;

  if (!twitterId) {
    return res.status(400).json({ message: 'Twitter ID is required.' });
  }

  try {
    let user = await User.findOne({ twitterId });

    if (user) {
      return res.json({
        uuid: user.uuid,
        aptosAddress: user.aptosAddress,
      });
    }

    console.log(`Creating new user for ${twitterId}...`);

    const aptosAccount = Account.generate();
    let privateKeyHex = null;

    if (aptosAccount?.privateKey) {
      privateKeyHex = privateKeyToHex(aptosAccount.privateKey);
    }

    if (!privateKeyHex && aptosAccount?.signingKey) {
      privateKeyHex = privateKeyToHex(aptosAccount.signingKey?.privateKey ?? aptosAccount.signingKey);
    }

    const address = addressFromAccount(aptosAccount) || null;

    if (!privateKeyHex) {
      console.error('ERROR: Could not extract private key from generated Aptos account.');
      return res.status(500).json({
        message: 'Could not extract private key from generated Aptos account.'
      });
    }

    const newUuid = uuidv4();

    user = new User({
      twitterId,
      uuid: newUuid,
      aptosAddress: address,
      aptosPrivateKey: privateKeyHex,
    });

    await user.save();
    console.log(`SUCCESS: New user created for ${twitterId} with address: ${address}`);

    return res.status(201).json({
      uuid: user.uuid,
      aptosAddress: user.aptosAddress,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'An error occurred on the server.' });
  }
});

// Process command endpoint
app.post('/api/process-command', async (req, res) => {
  const { twitterId, command, context } = req.body;

  if (!twitterId || !command) {
    return res.status(400).json({ message: 'Twitter ID and command are required.' });
  }

  try {
    const user = await User.findOne({ twitterId });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please initialize your wallet first.' });
    }

    const parsedCommand = commandProcessor.parseCommand(command, context);
    
    let response;
    switch (parsedCommand.type) {
      case 'balance':
        response = await getBalance(user);
        break;
      case 'send':
        response = await sendTransaction(user, parsedCommand.params);
        break;
      case 'price':
        response = await getCoinPrice(parsedCommand.params);
        break;
      case 'donate':
        response = await createDonationTemplate(parsedCommand.params, user);
        break;
      default:
        response = "I couldn't understand that command. Try commands like 'fetch my balance', 'send 0.1 APT to @username', or 'create donation template for Ukraine relief'.";
    }

    return res.json({ response });

  } catch (error) {
    console.error('Error processing command:', error);
    return res.status(500).json({ 
      response: `Error: ${error.message}` 
    });
  }
});

// Other blockchain functions remain the same...
async function getBalance(user) {
  try {
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: user.aptosAddress
    });
    
    const aptBalance = balance / 100000000;
    return `💰 Your APT balance: ${aptBalance.toFixed(4)} APT`;
    
  } catch (error) {
    console.error('Error fetching balance:', error);
    return `❌ Could not fetch balance: ${error.message}`;
  }
}

async function sendTransaction(senderUser, params) {
  // Same implementation as before...
  try {
    const { amount, recipient } = params;
    
    let recipientUser = await User.findOne({ 
      twitterId: new RegExp(`^${recipient}$`, 'i')
    });
    
    if (!recipientUser) {
      const cleanRecipient = recipient.replace('@', '');
      recipientUser = await User.findOne({ 
        twitterId: new RegExp(`^${cleanRecipient}$`, 'i') 
      });
    }
    
    if (!recipientUser) {
      const allUsers = await User.find({}, 'twitterId');
      return `❌ Recipient @${recipient} not found. They need to set up their SocioAgent wallet first.\\nRegistered users: ${allUsers.map(u => '@' + u.twitterId).join(', ')}`;
    }

    const privateKey = new Ed25519PrivateKey(senderUser.aptosPrivateKey);
    const senderAccount = Account.fromPrivateKey({ privateKey });
    const amountInOctas = Math.floor(amount * 100000000);

    const transaction = await aptos.transaction.build.simple({
      sender: senderAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipientUser.aptosAddress, amountInOctas],
      },
    });

    const senderAuthenticator = aptos.transaction.sign({
      signer: senderAccount,
      transaction,
    });

    const pendingTxn = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    const executedTxn = await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });

    return `✅ Successfully sent ${amount} APT to @${recipient}!\\nTransaction: https://explorer.aptoslabs.com/txn/${executedTxn.hash}?network=testnet`;

  } catch (error) {
    console.error('Error sending transaction:', error);
    return `❌ Transaction failed: ${error.message}`;
  }
}

async function getCoinPrice(params) {
  try {
    const { coin } = params;
    const coinId = coin.toLowerCase();
    const mockPrices = {
      'apt': '$8.45',
      'aptos': '$8.45',
      'btc': '$43,250',
      'eth': '$2,650'
    };

    const price = mockPrices[coinId] || 'Price not available';
    return `💲 Current ${coin.toUpperCase()} price: ${price}`;

  } catch (error) {
    return `❌ Could not fetch price for ${params.coin}`;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});