-- Migration 001: Initialize brAInwav Workflow Database Schema
-- Purpose: Create tables for workflow orchestration, gates, phases, and quality metrics
-- Created: 2025-01-09
-- brAInwav Production Standards

-- Workflows table: Main workflow state
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  featureName TEXT NOT NULL,
  taskId TEXT NOT NULL UNIQUE,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3', 'P4')),
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed', 'failed')),
  currentStep TEXT NOT NULL,
  state TEXT NOT NULL,  -- JSON serialized WorkflowState
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  branding TEXT NOT NULL CHECK(branding = 'brAInwav')
);

-- Gates table: PRP gate execution state
CREATE TABLE IF NOT EXISTS gates (
  workflowId TEXT NOT NULL,
  stepId TEXT NOT NULL CHECK(stepId IN ('G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in-progress', 'completed', 'failed')),
  evidence TEXT,  -- JSON array of evidence file paths
  approved INTEGER DEFAULT 0,  -- Boolean: 0 = false, 1 = true
  approver TEXT,
  approvalRationale TEXT,
  startedAt TEXT,
  completedAt TEXT,
  PRIMARY KEY (workflowId, stepId),
  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Phases table: Task phase execution state
CREATE TABLE IF NOT EXISTS phases (
  workflowId TEXT NOT NULL,
  stepId INTEGER NOT NULL CHECK(stepId IN (0, 1, 2, 3, 4, 5)),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in-progress', 'completed', 'failed')),
  artifacts TEXT,  -- JSON array of artifact file paths
  startedAt TEXT,
  completedAt TEXT,
  PRIMARY KEY (workflowId, stepId),
  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Metrics table: Quality metrics snapshots
CREATE TABLE IF NOT EXISTS metrics (
  workflowId TEXT PRIMARY KEY,
  coverage REAL,  -- Percentage (0-100)
  security TEXT NOT NULL,  -- JSON: {critical, high, medium}
  performance TEXT NOT NULL,  -- JSON: {lcp, tbt}
  accessibility REAL,  -- Score (0-100)
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Evidence table: Detailed evidence tracking
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflowId TEXT NOT NULL,
  stepType TEXT NOT NULL CHECK(stepType IN ('gate', 'phase')),
  stepId TEXT NOT NULL,
  filePath TEXT NOT NULL,
  fileType TEXT NOT NULL,  -- e.g., 'markdown', 'json', 'yaml'
  description TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Approvals table: Approval decision audit trail
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflowId TEXT NOT NULL,
  gateId TEXT NOT NULL,
  approver TEXT NOT NULL,
  role TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved', 'rejected')),
  rationale TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_taskId ON workflows(taskId);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority);
CREATE INDEX IF NOT EXISTS idx_gates_workflowId ON gates(workflowId);
CREATE INDEX IF NOT EXISTS idx_phases_workflowId ON phases(workflowId);
CREATE INDEX IF NOT EXISTS idx_evidence_workflowId ON evidence(workflowId);
CREATE INDEX IF NOT EXISTS idx_approvals_workflowId ON approvals(workflowId);
CREATE INDEX IF NOT EXISTS idx_approvals_gateId ON approvals(gateId);

-- Metadata table for schema versioning
CREATE TABLE IF NOT EXISTS schema_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Insert schema version
INSERT OR REPLACE INTO schema_metadata (key, value, updatedAt)
VALUES ('version', '001', datetime('now'));

INSERT OR REPLACE INTO schema_metadata (key, value, updatedAt)
VALUES ('branding', 'brAInwav', datetime('now'));
