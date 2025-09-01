#!/usr/bin/env tsx
/**
 * Test script for persistent MCP storage
 */

import { universalCliHandler } from '../universal-cli-handler.js';

async function testPersistentStorage() {
  console.log('🧪 Testing Persistent MCP Storage Implementation');
  console.log('='.repeat(50));

  try {
    // Test 1: List servers (should be empty initially)
    console.log('\n📋 Test 1: List servers (initial state)');
    const listResult1 = await universalCliHandler.listServers();
    console.log('Result:', listResult1.message);

    // Test 2: Add a test server
    console.log('\n➕ Test 2: Add a test server');
    const addResult = await universalCliHandler.processMcpCommand(
      'cortex mcp add test-server npx @test/server --env API_KEY=test123',
      { autoApprove: true }
    );
    console.log('Add Result:', addResult.success ? '✅' : '❌', addResult.message);

    // Test 3: List servers again (should show the new server)
    console.log('\n📋 Test 3: List servers (after adding)');
    const listResult2 = await universalCliHandler.listServers();
    console.log('Result:', listResult2.message);

    // Test 4: Check specific server installation
    console.log('\n🔍 Test 4: Check server installation');
    const checkResult = await universalCliHandler.checkServerInstallation('test-server');
    console.log('Check Result:', checkResult.success ? '✅' : '❌', checkResult.message);

    // Test 5: Get server status
    console.log('\n📊 Test 5: Get server status');
    const statusResult = await universalCliHandler.getServerStatus('test-server');
    console.log('Status Result:', statusResult.success ? '✅' : '❌');
    if (statusResult.success) {
      console.log(statusResult.message);
    }

    // Test 6: Remove server
    console.log('\n🗑️  Test 6: Remove server');
    const removeResult = await universalCliHandler.removeServer('test-server');
    console.log('Remove Result:', removeResult.success ? '✅' : '❌', removeResult.message);

    // Test 7: List servers after removal
    console.log('\n📋 Test 7: List servers (after removal)');
    const listResult3 = await universalCliHandler.listServers();
    console.log('Result:', listResult3.message);

    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPersistentStorage().catch(console.error);
