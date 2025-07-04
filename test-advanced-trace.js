import fetch from 'node-fetch';

async function testAdvancedTrace() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  const depth = 2;
  try {
    console.log(`🔍 Testing advanced trace endpoint for: ${hash}`);
    const response = await fetch(`http://localhost:3001/api/tracing/advanced/${hash}?depth=${depth}`);
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('✅ Advanced trace result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdvancedTrace(); 