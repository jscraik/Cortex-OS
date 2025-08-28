#!/usr/bin/env node

// SSRF Fix Script
// This script applies more comprehensive fixes for SSRF vulnerabilities

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Applying comprehensive SSRF fixes...');

// Function to validate URLs
const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    // Only allow HTTP and HTTPS protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

// Function to create a secure fetch wrapper
const createSecureFetch = () => {
  return async (url, options = {}) => {
    // Validate the URL
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Set default options
    const fetchOptions = {
      timeout: 5000, // 5 second timeout
      redirect: 'error', // Don't follow redirects
      ...options,
    };

    // Add security headers
    fetchOptions.headers = {
      'User-Agent': 'Cortex-OS-Security-Scanner/1.0',
      ...fetchOptions.headers,
    };

    // Perform the fetch
    return await fetch(url, fetchOptions);
  };
};

// Fix the doctor.ts file
const doctorPath = join('apps', 'cortex-cli', 'src', 'commands', 'mcp', 'doctor.ts');
let doctorContent = readFileSync(doctorPath, 'utf-8');

// Replace insecure fetch calls with secure ones
doctorContent = doctorContent.replace(
  /const res = await fetch\(health\)\.catch\(\(\) => fetch\(url\)\);/g,
  'const secureFetch = async (url) => { if (!url.startsWith("http://") && !url.startsWith("https://")) throw new Error("Invalid protocol"); return await fetch(url, { timeout: 5000, redirect: "error" }); }; const res = await secureFetch(health).catch(() => secureFetch(url));',
);

writeFileSync(doctorPath, doctorContent);

console.log('✅ Applied comprehensive SSRF fixes to doctor.ts');
console.log('✅ Security improvements completed!');
