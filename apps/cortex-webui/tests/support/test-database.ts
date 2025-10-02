import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Database Helper
 *
 * Provides database seeding and cleanup for E2E tests
 * Features:
 * - Test database initialization
 * - Seed data generation with brAInwav branding
 * - Transaction-based cleanup
 * - Test isolation between test runs
 */
export class TestDatabase {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly testDataPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'test-cortex.db');
    this.testDataPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-data.json');
  }

  /**
   * Initialize test database
   */
  async initialize(): Promise<void> {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Remove existing test database
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    // Create new database connection
    this.db = new Database(this.dbPath);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tables
    await this.createTables();

    console.log('✅ Test database initialized');
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        file_path TEXT,
        file_type TEXT,
        file_size INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        model_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      )
    `);

    // Workflows table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created');
  }

  /**
   * Seed database with test data
   */
  async seed(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const seedData = this.generateSeedData();

    // Seed users
    for (const user of seedData.users) {
      const stmt = this.db.prepare(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        user.id,
        user.email,
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive
      );
    }

    // Seed documents
    for (const document of seedData.documents) {
      const stmt = this.db.prepare(`
        INSERT INTO documents (id, user_id, title, content, file_path, file_type, file_size, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        document.id,
        document.userId,
        document.title,
        document.content,
        document.filePath,
        document.fileType,
        document.fileSize,
        JSON.stringify(document.metadata)
      );
    }

    // Seed conversations
    for (const conversation of seedData.conversations) {
      const stmt = this.db.prepare(`
        INSERT INTO conversations (id, user_id, title, model_config)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(
        conversation.id,
        conversation.userId,
        conversation.title,
        JSON.stringify(conversation.modelConfig)
      );
    }

    // Seed messages
    for (const message of seedData.messages) {
      const stmt = this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        message.id,
        message.conversationId,
        message.role,
        message.content,
        JSON.stringify(message.metadata)
      );
    }

    // Seed workflows
    for (const workflow of seedData.workflows) {
      const stmt = this.db.prepare(`
        INSERT INTO workflows (id, user_id, name, config, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        workflow.id,
        workflow.userId,
        workflow.name,
        JSON.stringify(workflow.config),
        workflow.status
      );
    }

    console.log(`✅ Database seeded with ${seedData.users.length} users, ${seedData.documents.length} documents`);
  }

  /**
   * Generate test seed data with brAInwav branding
   */
  private generateSeedData() {
    const passwordHash = bcrypt.hashSync('TestPassword123!', 10);

    return {
      users: [
        {
          id: uuidv4(),
          email: 'testuser@brainwav.ai',
          passwordHash,
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          isActive: true
        },
        {
          id: uuidv4(),
          email: 'admin@brainwav.ai',
          passwordHash,
          firstName: 'brAInwav',
          lastName: 'Admin',
          role: 'admin',
          isActive: true
        },
        {
          id: uuidv4(),
          email: 'agent@brainwav.ai',
          passwordHash,
          firstName: 'AI',
          lastName: 'Agent',
          role: 'agent',
          isActive: true
        }
      ],
      documents: [
        {
          id: uuidv4(),
          userId: '1',
          title: 'brAInwav Cortex-OS Architecture Guide',
          content: 'Comprehensive guide to brAInwav Cortex-OS architecture and implementation...',
          filePath: '/uploads/architecture-guide.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          metadata: {
            author: 'brAInwav Team',
            version: '1.0.0',
            tags: ['architecture', 'brAInwav', 'cortex-os']
          }
        },
        {
          id: uuidv4(),
          userId: '1',
          title: 'ASBR Runtime Implementation',
          content: 'Detailed implementation of Autonomous Software Behavior Reasoning runtime...',
          filePath: '/uploads/asbr-runtime.md',
          fileType: 'text/markdown',
          fileSize: 51200,
          metadata: {
            author: 'brAInwav Engineering',
            version: '1.0.0',
            tags: ['asbr', 'runtime', 'implementation']
          }
        }
      ],
      conversations: [
        {
          id: uuidv4(),
          userId: '1',
          title: 'brAInwav Architecture Discussion',
          modelConfig: {
            model: 'claude-3-sonnet',
            temperature: 0.7,
            maxTokens: 4000
          }
        }
      ],
      messages: [
        {
          id: uuidv4(),
          conversationId: '1',
          role: 'user',
          content: 'What is the brAInwav Cortex-OS architecture?',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        {
          id: uuidv4(),
          conversationId: '1',
          role: 'assistant',
          content: 'brAInwav Cortex-OS is an Autonomous Software Behavior Reasoning (ASBR) runtime...',
          metadata: {
            timestamp: new Date().toISOString(),
            model: 'claude-3-sonnet'
          }
        }
      ],
      workflows: [
        {
          id: uuidv4(),
          userId: '1',
          name: 'Document Analysis Workflow',
          config: {
            steps: [
              { type: 'upload', config: { acceptTypes: ['pdf', 'md'] } },
              { type: 'process', config: { extractText: true } },
              { type: 'analyze', config: { model: 'claude-3-sonnet' } }
            ],
            triggers: ['document_upload']
          },
          status: 'active'
        }
      ]
    };
  }

  /**
   * Get test user credentials
   */
  getTestUsers() {
    return {
      regularUser: {
        email: 'testuser@brainwav.ai',
        password: 'TestPassword123!'
      },
      admin: {
        email: 'admin@brainwav.ai',
        password: 'TestPassword123!'
      },
      agent: {
        email: 'agent@brainwav.ai',
        password: 'TestPassword123!'
      }
    };
  }

  /**
   * Clean up database
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Remove test database file
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    console.log('✅ Test database cleaned up');
  }

  /**
   * Execute raw SQL query
   */
  query(sql: string, params: any[] = []): any[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Get database connection for direct access
   */
  getConnection(): Database.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}