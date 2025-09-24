// backend/index.js - Enhanced version with blockchain operations

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
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

// NLP Command Processing Class
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

    // Check send commands - improved parsing
    for (const pattern of this.commandPatterns.send) {
      const match = cmd.match(pattern);
      if (match) {
        let recipient = match[2];
        // Clean the recipient handle - remove @ if present
        if (recipient.startsWith('@')) {
          recipient = recipient.substring(1);
        }
        console.log(`🔍 Parsed send command: amount=${match[1]}, recipient="${recipient}"`);
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
        // If context contains a tweet about a specific coin, use that
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

// Utility functions
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

// Existing endpoint
app.post('/api/get-or-create-user', async (req, res) => {
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

// Debug endpoint to list all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'twitterId uuid aptosAddress');
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// New endpoint for processing blockchain commands
app.post('/api/process-command', async (req, res) => {
  const { twitterId, command, context } = req.body;

  if (!twitterId || !command) {
    return res.status(400).json({ message: 'Twitter ID and command are required.' });
  }

  try {
    // Get user data
    const user = await User.findOne({ twitterId });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please initialize your wallet first.' });
    }

    // Parse the command
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
        response = await createDonationTemplate(parsedCommand.params);
        break;
      default:
        response = "I couldn't understand that command. Try commands like 'fetch my balance', 'send 0.1 APT to @username', or 'what is the price of APT'.";
    }

    return res.json({ response });

  } catch (error) {
    console.error('Error processing command:', error);
    return res.status(500).json({ 
      response: `Error: ${error.message}` 
    });
  }
});

// Blockchain operation functions
async function getBalance(user) {
  try {
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: user.aptosAddress
    });
    
    const aptBalance = balance / 100000000; // Convert from Octas to APT
    return `💰 Your APT balance: ${aptBalance.toFixed(4)} APT`;
    
  } catch (error) {
    console.error('Error fetching balance:', error);
    return `❌ Could not fetch balance: ${error.message}`;
  }
}

async function sendTransaction(senderUser, params) {
  try {
    const { amount, recipient } = params;
    
    console.log(`🔍 Looking for recipient: "${recipient}"`);
    
    // Find recipient user - try multiple variations
    let recipientUser = await User.findOne({ twitterId: recipient });
    
    if (!recipientUser) {
      // Try without @ symbol
      const cleanRecipient = recipient.replace('@', '');
      console.log(`🔍 Trying clean recipient: "${cleanRecipient}"`);
      recipientUser = await User.findOne({ twitterId: cleanRecipient });
    }
    
    if (!recipientUser) {
      // List all users for debugging
      const allUsers = await User.find({}, 'twitterId');
      console.log('📋 All users in database:', allUsers.map(u => u.twitterId));
      return `❌ Recipient @${recipient} not found. They need to set up their SocioAgent wallet first.\nRegistered users: ${allUsers.map(u => '@' + u.twitterId).join(', ')}`;
    }
    
    console.log(`✅ Found recipient: ${recipientUser.twitterId} with address: ${recipientUser.aptosAddress}`);

    // Create sender account from private key
    const privateKey = new Ed25519PrivateKey(senderUser.aptosPrivateKey);
    const senderAccount = Account.fromPrivateKey({ privateKey });

    // Convert APT to Octas
    const amountInOctas = Math.floor(amount * 100000000);

    // Build and submit transaction
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

    return `✅ Successfully sent ${amount} APT to @${recipient}!\nTransaction: https://explorer.aptoslabs.com/txn/${executedTxn.hash}?network=testnet`;

  } catch (error) {
    console.error('Error sending transaction:', error);
    return `❌ Transaction failed: ${error.message}`;
  }
}

async function getCoinPrice(params) {
  try {
    const { coin } = params;
    // This would integrate with a price API like CoinGecko
    // For demo purposes, returning mock data
    
    const coinId = coin.toLowerCase();
    const mockPrices = {
      'apt': '$8.45',
      'aptos': '$8.45',
      'btc': '$43,250',
      'eth': '$2,650',
      'trump': '$0.0001' // Mock price for demo
    };

    const price = mockPrices[coinId] || 'Price not available';
    return `💲 Current ${coin.toUpperCase()} price: ${price}`;

  } catch (error) {
    return `❌ Could not fetch price for ${params.coin}`;
  }
}

async function createDonationTemplate(params) {
  try {
    const { cause, chain } = params;
    
    // Generate a simple donation template
    const template = `
🎯 Donation Template for ${cause}

💝 Support this cause by connecting your wallet below:
🔗 Connect Petra Wallet (Aptos)
💰 Suggested amounts: 0.1 APT | 0.5 APT | 1 APT | Custom

This is a simplified template. In a full implementation, this would be an interactive widget.
    `.trim();

    return template;

  } catch (error) {
    return `❌ Could not create donation template: ${error.message}`;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});