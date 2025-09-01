#!/usr/bin/env node

/**
 * Test Script for Insula Frontend & Backend Structure Commands
 * Tests all @insula frontend/backend command patterns for proper recognition
 */

console.log('🧪 Testing Insula Frontend & Backend Command Recognition\n');

// Test patterns for frontend and backend commands
const testPatterns = [
  // Frontend commands
  {
    command: '@insula frontend analyze',
    description: 'Frontend structure analysis',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },
  {
    command: '@insula frontend check',
    description: 'Frontend structure check (alias)',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },
  {
    command: '@insula frontend review',
    description: 'Frontend structure review (alias)',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },
  {
    command: '@insula frontend fix',
    description: 'Frontend auto-fix',
    expectedMatch: true,
    type: 'frontend',
    action: 'fix'
  },
  {
    command: '@insula frontend auto-fix',
    description: 'Frontend auto-fix (alias)',
    expectedMatch: true,
    type: 'frontend',
    action: 'fix'
  },
  {
    command: '@insula frontend autofix',
    description: 'Frontend autofix (alias)',
    expectedMatch: true,
    type: 'frontend',
    action: 'fix'
  },
  {
    command: '@insula frontend scaffold',
    description: 'Frontend scaffolding',
    expectedMatch: true,
    type: 'frontend',
    action: 'scaffold'
  },
  {
    command: '@insula frontend generate',
    description: 'Frontend generation (alias)',
    expectedMatch: true,
    type: 'frontend',
    action: 'scaffold'
  },

  // Backend commands
  {
    command: '@insula backend analyze',
    description: 'Backend structure analysis',
    expectedMatch: true,
    type: 'backend',
    action: 'analyze'
  },
  {
    command: '@insula backend check',
    description: 'Backend structure check (alias)',
    expectedMatch: true,
    type: 'backend',
    action: 'analyze'
  },
  {
    command: '@insula backend review',
    description: 'Backend structure review (alias)',
    expectedMatch: true,
    type: 'backend',
    action: 'analyze'
  },
  {
    command: '@insula backend fix',
    description: 'Backend auto-fix',
    expectedMatch: true,
    type: 'backend',
    action: 'fix'
  },
  {
    command: '@insula backend auto-fix',
    description: 'Backend auto-fix (alias)',
    expectedMatch: true,
    type: 'backend',
    action: 'fix'
  },
  {
    command: '@insula backend autofix',
    description: 'Backend autofix (alias)',
    expectedMatch: true,
    type: 'backend',
    action: 'fix'
  },
  {
    command: '@insula backend scaffold',
    description: 'Backend scaffolding',
    expectedMatch: true,
    type: 'backend',
    action: 'scaffold'
  },
  {
    command: '@insula backend generate',
    description: 'Backend generation (alias)',
    expectedMatch: true,
    type: 'backend',
    action: 'scaffold'
  },

  // General commands (should still work)
  {
    command: '@insula analyze',
    description: 'General structure analysis',
    expectedMatch: true,
    type: 'general',
    action: 'analyze'
  },
  {
    command: '@insula fix',
    description: 'General auto-fix',
    expectedMatch: true,
    type: 'general',
    action: 'fix'
  },
  {
    command: '@insula help',
    description: 'Help command',
    expectedMatch: true,
    type: 'general',
    action: 'help'
  },

  // Edge cases and variations
  {
    command: '@insula   frontend    analyze   ',
    description: 'Frontend analyze with extra spaces',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },
  {
    command: '@INSULA FRONTEND ANALYZE',
    description: 'Frontend analyze (uppercase)',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },
  {
    command: '@insula Frontend Analyze',
    description: 'Frontend analyze (mixed case)',
    expectedMatch: true,
    type: 'frontend',
    action: 'analyze'
  },

  // Invalid patterns (should not match specialized commands)
  {
    command: '@insula fronted analyze', // typo
    description: 'Typo in frontend (should not match frontend)',
    expectedMatch: false,
    type: 'invalid',
    action: 'none'
  },
  {
    command: '@insula backend analysis', // wrong word
    description: 'Wrong action word (should not match)',
    expectedMatch: false,
    type: 'invalid',
    action: 'none'
  }
];

// Define regex patterns (matching the actual implementation)
const patterns = {
  frontend: {
    analyze: /@insula\s+frontend\s+(analyze|check|review)/i,
    fix: /@insula\s+frontend\s+(fix|auto-fix|autofix)/i,
    scaffold: /@insula\s+frontend\s+(scaffold|generate)/i
  },
  backend: {
    analyze: /@insula\s+backend\s+(analyze|check|review)/i,
    fix: /@insula\s+backend\s+(fix|auto-fix|autofix)/i,
    scaffold: /@insula\s+backend\s+(scaffold|generate)/i
  },
  general: {
    analyze: /@insula\s+(analyze|analysis|check|review)/i,
    fix: /@insula\s+(fix|auto-fix|autofix)/i,
    help: /@insula\s+(help|commands)/i
  }
};

// Test function
function testCommand(testCase) {
  const { command, description, expectedMatch, type, action } = testCase;

  let matched = false;
  let matchType = 'none';
  let matchAction = 'none';

  // Test frontend patterns
  if (patterns.frontend.analyze.test(command)) {
    matched = true;
    matchType = 'frontend';
    matchAction = 'analyze';
  } else if (patterns.frontend.fix.test(command)) {
    matched = true;
    matchType = 'frontend';
    matchAction = 'fix';
  } else if (patterns.frontend.scaffold.test(command)) {
    matched = true;
    matchType = 'frontend';
    matchAction = 'scaffold';
  }
  // Test backend patterns
  else if (patterns.backend.analyze.test(command)) {
    matched = true;
    matchType = 'backend';
    matchAction = 'analyze';
  } else if (patterns.backend.fix.test(command)) {
    matched = true;
    matchType = 'backend';
    matchAction = 'fix';
  } else if (patterns.backend.scaffold.test(command)) {
    matched = true;
    matchType = 'backend';
    matchAction = 'scaffold';
  }
  // Test general patterns
  else if (patterns.general.analyze.test(command)) {
    matched = true;
    matchType = 'general';
    matchAction = 'analyze';
  } else if (patterns.general.fix.test(command)) {
    matched = true;
    matchType = 'general';
    matchAction = 'fix';
  } else if (patterns.general.help.test(command)) {
    matched = true;
    matchType = 'general';
    matchAction = 'help';
  }

  const success = matched === expectedMatch &&
                 (expectedMatch ? (matchType === type && matchAction === action) : true);

  const status = success ? '✅' : '❌';
  const result = matched ? `${matchType}:${matchAction}` : 'no match';

  console.log(`${status} "${command}" → ${result}`);
  console.log(`   ${description}`);

  if (!success) {
    console.log(`   Expected: ${expectedMatch ? `${type}:${action}` : 'no match'}`);
    console.log(`   Actual: ${result}`);
  }

  console.log('');
  return success;
}

// Run all tests
let passed = 0;
let total = testPatterns.length;

console.log(`Running ${total} tests...\n`);

testPatterns.forEach(testCase => {
  if (testCommand(testCase)) {
    passed++;
  }
});

// Summary
console.log('='.repeat(60));
console.log(`TEST SUMMARY:`);
console.log(`✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${total - passed}/${total}`);
console.log(`📊 Success Rate: ${Math.round((passed/total) * 100)}%`);

if (passed === total) {
  console.log('\n🎉 ALL TESTS PASSED! Frontend & Backend command recognition is working correctly.');
  console.log('\n📋 Available Commands:');
  console.log('🎨 Frontend: @insula frontend [analyze|fix|scaffold]');
  console.log('⚙️  Backend: @insula backend [analyze|fix|scaffold]');
  console.log('📁 General: @insula [analyze|fix|help]');
} else {
  console.log('\n❌ Some tests failed. Please review the command patterns.');
  process.exit(1);
}

// Test example usage scenarios
console.log('\n📝 Example Usage:');
console.log('');
console.log('Frontend Analysis:');
console.log('  @insula frontend analyze  # Analyze React/Vue/Angular structure');
console.log('  @insula frontend fix       # Auto-fix frontend issues');
console.log('  @insula frontend scaffold  # Generate component templates');
console.log('');
console.log('Backend Analysis:');
console.log('  @insula backend analyze    # Analyze Node.js/Python/Go structure');
console.log('  @insula backend fix        # Auto-fix backend issues');
console.log('  @insula backend scaffold   # Generate API/service templates');
console.log('');
console.log('General:');
console.log('  @insula analyze            # Full repository analysis');
console.log('  @insula help               # Show all available commands');

console.log('\n✨ Frontend & Backend Structure Agents are ready!');
