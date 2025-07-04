const fs = require('fs');
const path = require('path');

// Working RPC URLs that don't require API keys
const workingRpcUrls = {
  ETHEREUM_RPC_URL: 'https://eth.llamarpc.com',
  BSC_RPC_URL: 'https://bsc-dataseed.binance.org/',
  POLYGON_RPC_URL: 'https://polygon-rpc.com/',
  ARBITRUM_RPC_URL: 'https://arb1.arbitrum.io/rpc',
  OPTIMISM_RPC_URL: 'https://mainnet.optimism.io'
};

function updateEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  console.log('🔧 Updating .env file with working RPC URLs...');
  
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Found existing .env file');
  } else {
    console.log('📝 Creating new .env file');
  }
  
  // Add or update RPC URLs
  Object.entries(workingRpcUrls).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      // Update existing line
      envContent = envContent.replace(regex, newLine);
      console.log(`✅ Updated ${key}`);
    } else {
      // Add new line
      envContent += `\n${newLine}`;
      console.log(`✅ Added ${key}`);
    }
  });
  
  // Write the updated content
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  console.log('\n🎉 .env file updated successfully!');
  console.log('📋 Added/Updated RPC URLs:');
  Object.entries(workingRpcUrls).forEach(([key, value]) => {
    console.log(`   ${key}=${value}`);
  });
  
  console.log('\n🚀 You can now run the bridge watcher:');
  console.log('   node src/services/bridges/bridgeWatcher.js');
}

// Run the update
updateEnvFile(); 