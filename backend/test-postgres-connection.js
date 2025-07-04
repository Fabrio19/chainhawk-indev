require('dotenv').config();
const { Client } = require('pg');

async function testPostgresConnection() {
  console.log('🔍 Testing PostgreSQL Connection...');
  console.log('=====================================');
  
  try {
    // Create a new client
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    console.log('📡 Attempting to connect to PostgreSQL...');
    console.log(`🔗 Connection string: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);
    
    // Connect to the database
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('📊 Database query successful:');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    
    // Check if the database exists
    const dbResult = await client.query("SELECT datname FROM pg_database WHERE datname = 'chainhawk_dtbs'");
    if (dbResult.rows.length > 0) {
      console.log('✅ Database "chainhawk_dtbs" exists');
    } else {
      console.log('❌ Database "chainhawk_dtbs" does not exist');
    }
    
    // Close the connection
    await client.end();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Make sure PostgreSQL is running on localhost:5432');
    } else if (error.code === '28P01') {
      console.log('💡 Suggestion: Check your username and password in DATABASE_URL');
    } else if (error.code === '3D000') {
      console.log('💡 Suggestion: The database does not exist. Create it first.');
    }
  }
}

testPostgresConnection(); 