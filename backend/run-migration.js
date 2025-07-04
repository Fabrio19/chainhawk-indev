require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Bridge Flows Table Migration...');
  console.log('==========================================\n');

  const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT || 5432,
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'create_bridge_flows_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded successfully');
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the table was created
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bridge_flows'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ bridge_flows table verified');
      
      // Show table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'bridge_flows'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table Structure:');
      console.log('==================');
      columns.rows.forEach(col => {
        console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable.padEnd(8)} | ${col.column_default || 'NULL'}`);
      });
      
      // Show indexes
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'bridge_flows'
        ORDER BY indexname;
      `);
      
      console.log('\n🔍 Indexes:');
      console.log('==========');
      indexes.rows.forEach(idx => {
        console.log(`✅ ${idx.indexname}`);
      });
      
      // Show views
      const views = await pool.query(`
        SELECT viewname
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname LIKE '%bridge_flows%'
        ORDER BY viewname;
      `);
      
      console.log('\n👁️ Views:');
      console.log('========');
      views.rows.forEach(view => {
        console.log(`✅ ${view.viewname}`);
      });
      
    } else {
      console.log('❌ Table creation failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration(); 