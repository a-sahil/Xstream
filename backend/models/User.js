// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  twitterId: {
    type: String,
    required: true,
    unique: true,
  },
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  aptosAddress: {
    type: String,
    required: true,
    unique: true,
  },
  // --- SECURITY WARNING ---
  // Storing private keys in plain text is extremely dangerous for production.
  // This is for demonstration purposes only. Use a secure vault for production.
  aptosPrivateKey: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model('User', UserSchema);