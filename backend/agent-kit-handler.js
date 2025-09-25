// backend/agent-kit-handler.js
const {
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} = require('@aptos-labs/ts-sdk');
const { AgentRuntime, LocalSigner, PanoraSwapTool } = require('move-agent-kit');

/**
 * Initializes the AgentRuntime for a specific user.
 * @param {string} userPrivateKeyHex - The user's Aptos private key from the database.
 * @returns {AgentRuntime} An initialized AgentRuntime instance.
 */
async function initializeAgentRuntime(userPrivateKeyHex) {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const privateKey = new Ed25519PrivateKey(userPrivateKeyHex);
  const account = await aptos.deriveAccountFromPrivateKey({ privateKey });
  const signer = new LocalSigner(account, Network.TESTNET);

  // Initialize AgentRuntime with the Panora API key
  const agentRuntime = new AgentRuntime(signer, aptos, {
    PANORA_API_KEY: process.env.PANORA_API_KEY,
  });

  return agentRuntime;
}

/**
 * Handles a swap command using the Move Agent Kit's PanoraSwapTool.
 * @param {object} user - The user object from the database.
 * @param {object} params - The parameters for the swap ({ amount, fromToken, toToken }).
 * @returns {Promise<string>} A formatted response string.
 */
async function handleSwapCommand(user, params) {
  console.log(`🚀 Handling swap with Move Agent Kit for user ${user.twitterId}`);
  try {
    const { amount, fromToken, toToken } = params;

    // Initialize the runtime with the user's specific wallet
    const agentRuntime = await initializeAgentRuntime(user.aptosPrivateKey);
    
    // Create an instance of the specific tool we need
    const swapTool = new PanoraSwapTool(agentRuntime);
    
    // The tool expects a JSON string as input
    const toolInput = JSON.stringify({
      fromToken: fromToken,
      toToken: toToken,
      swapAmount: amount
    });

    // Call the tool's internal function
    const resultString = await swapTool._call(toolInput);
    const result = JSON.parse(resultString);

    if (result.status === 'error') {
      throw new Error(result.message || 'Swap failed within the agent kit.');
    }

    const txHash = result.swapTransactionHash;
    return `✅ Successfully swapped ${amount} ${fromToken} for ${toToken}!\\nTransaction: https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`;

  } catch (error) {
    console.error('Error during agent kit swap:', error);
    return `❌ Swap failed: ${error.message}`;
  }
}

module.exports = { handleSwapCommand };