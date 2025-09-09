#!/usr/bin/env node

// Generate a cryptographically secure 32-byte hex string
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log(secret);

