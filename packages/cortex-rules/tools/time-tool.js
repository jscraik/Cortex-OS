#!/usr/bin/env node

/**
 * Time Tool - A simple tool to get current time information
 * This can be exposed as a tool/function for agents to call
 */

import { getCurrentTime, getFreshnessRule } from '../dist/index.js';

// If run directly, output the current time information
if (import.meta.url === `file://${process.argv[1]}`) {
  const timeInfo = getCurrentTime();
  console.log(JSON.stringify(timeInfo, null, 2));
  
  // Also show the freshness rule
  console.log('\n--- Freshness Rule ---');
  console.log(getFreshnessRule());
}
