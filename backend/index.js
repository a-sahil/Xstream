// backend/index.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const connectDB = require('./db');
const User = require('./models/User');

// Use Account from the official ts-sdk
const { Account } = require('@aptos-labs/ts-sdk');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

connectDB();

/**
 * Convert many possible privateKey representations into a 0x-prefixed hex string.
 * Accepts: Uint8Array, Buffer, objects exposing toUint8Array(), toBytes(), toString(), or .hex property.
 */
function privateKeyToHex(pk) {
  if (!pk && pk !== 0) return null;

  // Uint8Array or Buffer
  if (pk instanceof Uint8Array || Buffer.isBuffer(pk)) {
    return '0x' + Buffer.from(pk).toString('hex');
  }

  // If object provides a method to get bytes
  if (typeof pk.toUint8Array === 'function') {
    const bytes = pk.toUint8Array();
    if (bytes instanceof Uint8Array) return '0x' + Buffer.from(bytes).toString('hex');
  }
  if (typeof pk.toBytes === 'function') {
    const bytes = pk.toBytes();
    if (bytes instanceof Uint8Array || Buffer.isBuffer(bytes)) return '0x' + Buffer.from(bytes).toString('hex');
  }

  // If object exposes a hex string property
  if (typeof pk.hex === 'string') {
    const h = pk.hex.startsWith('0x') ? pk.hex : '0x' + pk.hex;
    return h;
  }

  // If primitive string (maybe already hex)
  if (typeof pk === 'string') {
    return pk.startsWith('0x') ? pk : '0x' + pk;
  }

  // Fallback: try toString() (some classes stringify as hex)
  if (typeof pk.toString === 'function') {
    const maybe = pk.toString();
    if (typeof maybe === 'string' && /^[0-9a-fA-F]+$/.test(maybe.replace(/^0x/, ''))) {
      return maybe.startsWith('0x') ? maybe : '0x' + maybe;
    }
  }

  // Could not convert
  return null;
}

/**
 * Get address string from Account-like object
 */
function addressFromAccount(acc) {
  // If acc.address is a function that returns HexString or string
  try {
    if (typeof acc.address === 'function') {
      const addr = acc.address();
      if (addr && typeof addr.toString === 'function') return addr.toString();
      if (typeof addr === 'string') return addr;
    }
  } catch (e) { /* ignore */ }

  // Common alternative property names
  if (acc?.accountAddress) {
    if (typeof acc.accountAddress === 'string') return acc.accountAddress;
    if (acc.accountAddress?.toString) return acc.accountAddress.toString();
  }
  if (acc?.addressHex) return acc.addressHex;
  return null;
}

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

    // Generate an Aptos account (defaults to Legacy Ed25519 unless you specify other signing scheme)
    const aptosAccount = Account.generate();
    console.log('Generated new Aptos account.',aptosAccount);

    // Debug snapshot to help troubleshooting if extraction fails
    const accountDebugKeys = Object.keys(aptosAccount || {}).join(', ');
    console.log('Account debug snapshot keys:', accountDebugKeys ? accountDebugKeys.split(',') : accountDebugKeys);

    // Try multiple ways to derive private key hex
    let privateKeyHex = null;

    // 1) some SDK objects expose .privateKey
    if (aptosAccount?.privateKey) {
      privateKeyHex = privateKeyToHex(aptosAccount.privateKey);
    }

    // 2) other SDK shapes may expose signingKey / signingKey.privateKey
    if (!privateKeyHex && aptosAccount?.signingKey) {
      privateKeyHex = privateKeyToHex(aptosAccount.signingKey?.privateKey ?? aptosAccount.signingKey);
    }

    // 3) some classes expose helper to convert to a private key object (older code paths)
    if (!privateKeyHex && typeof aptosAccount.toPrivateKeyObject === 'function') {
      try {
        const pkObj = aptosAccount.toPrivateKeyObject();
        privateKeyHex = privateKeyToHex(pkObj?.privateKeyHex ?? pkObj?.privateKey ?? pkObj);
      } catch (e) {
        // ignore and continue to other fallbacks
        console.warn('toPrivateKeyObject() threw:', e && e.message ? e.message : e);
      }
    }

    // 4) some SDKs expose .signingKeyPair or .signingKeyPair.privateKey
    if (!privateKeyHex && aptosAccount?.signingKeyPair) {
      privateKeyHex = privateKeyToHex(aptosAccount.signingKeyPair.privateKey ?? aptosAccount.signingKeyPair);
    }

    // 5) final fallback: try direct conversion on aptosAccount (rare)
    if (!privateKeyHex) {
      privateKeyHex = privateKeyToHex(aptosAccount);
    }

    const address = addressFromAccount(aptosAccount) || null;

    // If we still don't have a private key, fail with helpful debug info
    if (!privateKeyHex) {
      console.error('ERROR: Could not extract private key from generated Aptos account.');
      console.error('Account debug snapshot keys:', Object.keys(aptosAccount || {}));
      // send back some extraction debug info (avoid revealing internal library classes/instances)
      return res.status(500).json({
        message: 'Could not extract private key from generated Aptos account. See server logs for debug info.'
      });
    }

    // Generate UUID and save user (NOTE: storing private key in DB is insecure for production)
    const newUuid = uuidv4();

    user = new User({
      twitterId,
      uuid: newUuid,
      aptosAddress: address,
      aptosPrivateKey: privateKeyHex, // WARNING: For production, use a secret manager/vault.
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
