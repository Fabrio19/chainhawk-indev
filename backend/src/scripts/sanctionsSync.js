#!/usr/bin/env node

/**
 * Sanctions Sync Script
 * 
 * This script can be run as a cron job to automatically sync sanctions data
 * from various sources (OFAC, UN, EU, etc.)
 * 
 * Usage:
 * - node src/scripts/sanctionsSync.js --source=ofac
 * - node src/scripts/sanctionsSync.js --source=un
 * - node src/scripts/sanctionsSync.js --source=all
 * - node src/scripts/sanctionsSync.js --source=all --dry-run
 */

require('dotenv').config();
const { syncOFAC, syncUN, getSanctionsStats } = require('../services/sanctionsSyncService');

const args = process.argv.slice(2);
const options = {};

// Parse command line arguments
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value || true;
  }
});

const source = options.source || 'all';
const dryRun = options['dry-run'] || false;

console.log('🚀 Starting Sanctions Sync Script');
console.log(`📊 Source: ${source}`);
console.log(`🔍 Dry Run: ${dryRun}`);
console.log('---');

async function runSync() {
  try {
    const startTime = new Date();
    const results = {};

    if (source === 'all' || source === 'ofac') {
      console.log('🔄 Syncing OFAC...');
      if (!dryRun) {
        results.ofac = await syncOFAC();
        console.log(`✅ OFAC sync result:`, results.ofac);
      } else {
        console.log('🔍 OFAC sync would run (dry run mode)');
      }
    }

    if (source === 'all' || source === 'un') {
      console.log('🔄 Syncing UN...');
      if (!dryRun) {
        results.un = await syncUN();
        console.log(`✅ UN sync result:`, results.un);
      } else {
        console.log('🔍 UN sync would run (dry run mode)');
      }
    }

    if (!dryRun) {
      console.log('📊 Getting final statistics...');
      const stats = await getSanctionsStats();
      console.log('📈 Sanctions Statistics:', stats);
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log('---');
    console.log(`✅ Sync completed in ${duration}ms`);
    console.log(`📅 Started: ${startTime.toISOString()}`);
    console.log(`📅 Finished: ${endTime.toISOString()}`);

    if (!dryRun) {
      console.log('📊 Results:', results);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the sync
runSync(); 