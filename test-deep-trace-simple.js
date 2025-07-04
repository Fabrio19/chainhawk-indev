import fetch from 'node-fetch';

async function testDeepTrace() {
  const hash = '0x7c0cb99a162398e7b2991890bb0ad9914b4f7a5a8df6ab0fe963f7fc86978564';
  
  try {
    console.log(`🔍 Testing deep trace endpoint for: ${hash}`);
    console.log('⏳ Making request...');
    
    const response = await fetch(`http://localhost:3001/api/tracing/trace-deep/${hash}?depth=2`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Response received:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testDeepTrace(); 