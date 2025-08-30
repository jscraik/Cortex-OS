-- Development database initialization
-- Creates basic tables for Cortex-OS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- A2A Outbox table
CREATE TABLE IF NOT EXISTS a2a_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id VARCHAR(26) NOT NULL, -- ULID
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending'
);

-- A2A Dead Letter Queue
CREATE TABLE IF NOT EXISTS a2a_dlq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id VARCHAR(26) NOT NULL, -- ULID
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0
);

-- Memory store
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    ttl_expires_at TIMESTAMP WITH TIME ZONE,
    encrypted BOOLEAN DEFAULT FALSE,
    run_id VARCHAR(26), -- ULID provenance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key, namespace)
);

-- Evidence store
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id VARCHAR(26) NOT NULL, -- ULID
    evidence_type VARCHAR(100) NOT NULL,
    url TEXT,
    file_path TEXT,
    line_number INTEGER,
    hash VARCHAR(64),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_outbox_status ON a2a_outbox(status);
CREATE INDEX IF NOT EXISTS idx_a2a_outbox_run_id ON a2a_outbox(run_id);
CREATE INDEX IF NOT EXISTS idx_memories_namespace_key ON memories(namespace, key);
CREATE INDEX IF NOT EXISTS idx_memories_ttl ON memories(ttl_expires_at) WHERE ttl_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_run_id ON evidence(run_id);