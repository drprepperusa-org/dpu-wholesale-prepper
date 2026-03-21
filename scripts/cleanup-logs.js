#!/usr/bin/env node
/**
 * Log Retention Cleanup Script
 * Removes activity logs older than the specified retention period
 * 
 * Usage:
 *   node scripts/cleanup-logs.js [days=365]
 * 
 * Examples:
 *   node scripts/cleanup-logs.js              # Default: 365 days
 *   node scripts/cleanup-logs.js 90           # Keep only last 90 days
 *   node scripts/cleanup-logs.js 1825         # Keep 5 years
 * 
 * Run via cron for automatic cleanup:
 *   0 2 * * 0 /Users/djmac/drprepper-wholesale-portal/scripts/cleanup-logs.js >> /tmp/cleanup-logs.log 2>&1
 */

const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Configuration
const RETENTION_DAYS = parseInt(process.argv[2]) || 365;
const LOG_FILE = '/var/log/drprepper-cleanup.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}`;
  console.log(logMsg);
  
  // Try to write to log file if writable
  try {
    fs.appendFileSync(LOG_FILE, logMsg + '\n');
  } catch (e) {
    // Silent fail if can't write to log file
  }
}

async function cleanup() {
  const client = await pool.connect();
  
  try {
    log(`🧹 Starting log cleanup... Retention: ${RETENTION_DAYS} days`);
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    log(`Removing logs before: ${cutoffDate.toISOString()}`);
    
    // Delete old activity logs
    const result = await client.query(
      `DELETE FROM activity_log 
       WHERE created_at < $1
       RETURNING id`,
      [cutoffDate]
    );
    
    log(`✅ Deleted ${result.rows.length} old log entries`);
    
    // Get remaining log count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM activity_log`
    );
    
    log(`📊 Remaining logs: ${countResult.rows[0].count}`);
    
  } catch (err) {
    log(`❌ Cleanup failed: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
