#!/usr/bin/env node

/**
 * Test script for MCP server
 * Verifies the SSE endpoint and basic functionality
 */

import http from 'http';

async function testHealthEndpoint() {
  console.log('Testing health endpoint...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Health check status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log('Health check response:', jsonData);
            console.log('✅ Health endpoint is working correctly');
          } catch (error) {
            console.log('❌ Failed to parse health check response');
          }
        } else {
          console.log('❌ Health check failed with status:', res.statusCode);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Health check failed with error:', error.message);
      resolve();
    });

    req.end();
  });
}

async function testSSEEndpoint() {
  console.log('\nTesting SSE endpoint...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/sse',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      console.log(`SSE endpoint status: ${res.statusCode}`);

      if (res.statusCode === 200) {
        console.log('✅ SSE endpoint is accessible');
        console.log('Waiting for data... (will timeout after 5 seconds)');

        let dataReceived = false;

        res.on('data', (chunk) => {
          if (!dataReceived) {
            console.log('✅ Data received from SSE stream');
            console.log('Sample data:', sanitizeForLog(chunk.toString()));
            dataReceived = true;
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!dataReceived) {
            console.log('❌ No data received from SSE stream within 5 seconds');
          }
          req.destroy();
          resolve();
        }, 5000);
      } else {
        console.log('❌ SSE endpoint failed with status:', res.statusCode);
        resolve();
      }
    });

    req.on('error', (error) => {
      console.log('❌ SSE endpoint failed with error:', error.message);
      resolve();
    });

    req.end();
  });
}

async function main() {
  console.log('MCP Server Test Script');
  console.log('=====================');

  await testHealthEndpoint();
  await testSSEEndpoint();

  console.log('\nTest completed.');
}

main();
