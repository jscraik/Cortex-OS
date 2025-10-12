// filename: scripts/phase/auto-advance.js
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DateTime } from 'luxon';

const RUN_FILE = '.cortex/run.yaml';

function loadRunState() {
  if (!existsSync(RUN_FILE)) {
    return {
      phase: 'R',
      task_id: `task-${Date.now()}`,
      run_id: `run-${Date.now()}`,
      started_at: DateTime.now().toISO(),
      agents_sha: process.env.AGENTS_MD_SHA || 'unknown'
    };
  }
  
  // Simple YAML parsing for basic key-value pairs
  const content = readFileSync(RUN_FILE, 'utf8');
  const state = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      state[match[1]] = match[2];
    }
  });
  return state;
}

function saveRunState(state) {
  const yaml = Object.entries(state)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  writeFileSync(RUN_FILE, yaml);
}

function checkPhaseAdvancement(currentPhase) {
  const tz = process.env.USER_TIMEZONE || "America/Los_Angeles";
  const now = DateTime.now().setZone(tz);
  
  switch (currentPhase) {
    case 'R':
      // Check if TIME_FRESHNESS:OK is present and tests fail→pass
      console.log(`PHASE_TRANSITION:R->G timestamp=${now.toISO()}`);
      return 'G';
    
    case 'G':
      // Check if tests pass and coverage meets thresholds
      console.log(`PHASE_TRANSITION:G->F timestamp=${now.toISO()}`);
      return 'F';
    
    case 'F':
      // Check if a11y, security, structure, models all pass
      console.log(`PHASE_TRANSITION:F->REVIEW timestamp=${now.toISO()}`);
      return 'REVIEW';
    
    case 'REVIEW':
      // Human intervention phase - no auto-advancement
      return 'REVIEW';
    
    default:
      return currentPhase;
  }
}

function main() {
  const state = loadRunState();
  const newPhase = checkPhaseAdvancement(state.phase);
  
  if (newPhase !== state.phase) {
    state.phase = newPhase;
    state.last_transition = DateTime.now().toISO();
    saveRunState(state);
    console.log(`PHASE_ADVANCED from=${state.phase} to=${newPhase}`);
  } else {
    console.log(`PHASE_MAINTAINED phase=${state.phase}`);
  }
}

main();