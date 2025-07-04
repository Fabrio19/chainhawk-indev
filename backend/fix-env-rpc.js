const fs = require('fs');
const path = require('path');

// Working RPC URLs with proper formatting
const workingRpcUrls = {
  ETHEREUM_RPC_URL: 'https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d',
  BSC_RPC_URL: 'https://bsc-dataseed.binance.org/',
  POLYGON_RPC_URL: 'https://polygon-rpc.com/',
  ARBITRUM_RPC_URL: 'https://arb1.arbitrum.io/rpc',
  OPTIMISM_RPC_URL: 'https://mainnet.optimism.io'
};

function fixEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  console.log('🔧 Fixing .env file RPC URLs...');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found existing .env file');
  
  // Fix the malformed lines
  envContent = envContent.replace(
    /ETHEREUM_RPC_URL=https:\/\/mainnet\.infura\.io\/v3\/7e07cc05394b4c93978303daf899396d\nBSC_RPC_URL=https:\/\/mainnet\.infura\.io\/v3\/7e07cc05394b4c93978303daf899396d\n# \(Add others as needed for Polygon, Arbitrum, etc\.\)/,
    `ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d
BSC_RPC_URL=https://bsc-dataseed.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io`
  );
  
  // Write the fixed content
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n🎉 .env file fixed successfully!');
  console.log('📋 Updated RPC URLs:');
  console.log('   ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/7e07cc05394b4c93978303daf899396d');
  console.log('   BSC_RPC_URL=https://bsc-dataseed.binance.org/');
  console.log('   POLYGON_RPC_URL=https://polygon-rpc.com/');
  console.log('   ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc');
  console.log('   OPTIMISM_RPC_URL=https://mainnet.optimism.io');
  
  console.log('\n🚀 You can now run the bridge watcher:');
  console.log('   node src/services/bridges/bridgeWatcher.js');
}

// Run the fix
fixEnvFile(); 