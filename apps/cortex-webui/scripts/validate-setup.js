#!/usr/bin/env node

// Validation script to check all configuration and dependencies

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

console.log('🔍 Validating Cortex WebUI Setup...\n');

// Check required files exist
const requiredFiles = [
  '.env.example',
  'backend/.env.example', 
  'frontend/.env.example',
  'backend/src/config/constants.ts',
  'backend/src/utils/database.ts',
  'backend/src/middleware/rateLimiter.ts',
  'backend/src/services/healthService.ts',
  'backend/src/utils/logger.ts',
  'backend/src/utils/swagger.ts',
  'DEPLOYMENT.md',
  'k8s/namespace.yaml'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    errors.push(`Missing required file: ${file}`);
    console.log(`  ❌ ${file}`);
  }
});

// Check environment files
console.log('\n🔑 Checking environment configuration...');
const envFiles = ['.env', 'backend/.env', 'frontend/.env'];
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('CHANGE_THIS_IN_PRODUCTION')) {
      warnings.push(`${file} contains default secrets - change for production`);
      console.log(`  ⚠️  ${file} (contains default secrets)`);
    } else {
      console.log(`  ✅ ${file}`);
    }
  } else {
    warnings.push(`Environment file missing: ${file} (will use .env.example)`);
    console.log(`  ⚠️  ${file} (missing, will use .env.example)`);
  }
});

// Check package.json dependencies
console.log('\n📦 Checking backend dependencies...');
const backendPackageJson = 'backend/package.json';
if (fs.existsSync(backendPackageJson)) {
  const pkg = JSON.parse(fs.readFileSync(backendPackageJson, 'utf8'));
  const requiredDeps = [
    'express', 'express-rate-limit', 'helmet', 'winston', 
    'swagger-jsdoc', 'swagger-ui-express', 'better-sqlite3'
  ];
  
  requiredDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      errors.push(`Missing backend dependency: ${dep}`);
      console.log(`  ❌ ${dep}`);
    }
  });
} else {
  errors.push('backend/package.json not found');
}

// Check TypeScript imports/exports
console.log('\n🔧 Checking TypeScript configuration...');
const serverTs = 'backend/src/server.ts';
if (fs.existsSync(serverTs)) {
  const content = fs.readFileSync(serverTs, 'utf8');
  
  // Check for problematic imports
  if (content.includes('../../shared/constants')) {
    errors.push('server.ts contains invalid import: ../../shared/constants');
    console.log('  ❌ Invalid shared constants import found');
  } else {
    console.log('  ✅ Imports look correct');
  }
  
  // Check constants import
  if (content.includes('./config/constants')) {
    console.log('  ✅ Using local constants configuration');
  } else {
    warnings.push('server.ts may not be using local constants');
  }
} else {
  errors.push('backend/src/server.ts not found');
}

// Check Kubernetes configuration
console.log('\n☸️  Checking Kubernetes manifests...');
const k8sFiles = [
  'k8s/namespace.yaml',
  'k8s/secrets.yaml', 
  'k8s/backend-deployment.yaml',
  'k8s/frontend-deployment.yaml',
  'k8s/services.yaml',
  'k8s/ingress.yaml'
];

k8sFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    warnings.push(`K8s manifest missing: ${file}`);
    console.log(`  ⚠️  ${file}`);
  }
});

// Check Docker configuration
console.log('\n🐳 Checking Docker configuration...');
const dockerFiles = ['Dockerfile.backend', 'Dockerfile.frontend', 'docker-compose.yml'];
dockerFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    errors.push(`Docker file missing: ${file}`);
    console.log(`  ❌ ${file}`);
  }
});

// Summary
console.log('\n📊 Validation Summary:');
console.log(`✅ Checks passed: ${requiredFiles.length + dockerFiles.length - errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(warning => console.log(`   • ${warning}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors (must be fixed):');
  errors.forEach(error => console.log(`   • ${error}`));
  console.log('\n🚨 Setup validation failed! Fix errors before proceeding.');
  process.exit(1);
} else {
  console.log('\n🎉 Setup validation passed! Ready for deployment.');
}

// Security warnings
console.log('\n🔒 Security Reminders:');
console.log('   • Change all default JWT secrets before production');
console.log('   • Add your actual API keys to environment files');
console.log('   • Review CORS settings for your domain');
console.log('   • Ensure SSL certificates are configured');
console.log('   • Set up log aggregation and monitoring');