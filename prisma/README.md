# Cortex-OS Database Schema and Migrations

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains Prisma database schema definitions, migrations, and database management configurations for Cortex-OS.

## Prisma Overview

Prisma provides:

- **Schema Definition** - Database schema as code
- **Migration Management** - Version-controlled schema changes
- **Type-Safe Client** - Auto-generated TypeScript client
- **Database Introspection** - Existing database analysis

## Directory Structure

```text
prisma/
├── schema.prisma          # Main schema definition
├── migrations/            # Database migration files
│   ├── 001_initial/       # Initial schema migration
│   ├── 002_add_agents/    # Agent-related schema
│   └── 003_memory_system/ # Memory system schema
├── seed.ts               # Database seeding script
└── dev.db                # SQLite development database
```

## Database Schema

### Core Entities

#### Users and Authentication

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  agents    Agent[]
  sessions  Session[]
}
```

#### Agents

```prisma
model Agent {
  id          String   @id @default(cuid())
  name        String
  description String?
  config      Json
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  memories    Memory[]
  conversations Conversation[]
}
```

#### Memory System

```prisma
model Memory {
  id        String   @id @default(cuid())
  content   String
  embedding Json?
  metadata  Json?
  agentId   String
  createdAt DateTime @default(now())
  
  agent     Agent    @relation(fields: [agentId], references: [id])
}
```

### Relationships

- **Users** have many **Agents**
- **Agents** have many **Memories**
- **Agents** have many **Conversations**
- **Conversations** have many **Messages**

## Migration Management

### Creating Migrations

```bash
# Generate migration for schema changes
npx prisma migrate dev --name add_new_feature

# Apply migrations to production
npx prisma migrate deploy

# Reset database and apply all migrations
npx prisma migrate reset
```

### Migration Best Practices

- **Descriptive Names** - Clear migration descriptions
- **Backward Compatible** - Avoid breaking changes when possible
- **Data Migration** - Include data transformation scripts
- **Rollback Plan** - Plan for migration rollbacks

## Database Operations

### Client Generation

```bash
# Generate Prisma client
npx prisma generate

# Generate client with custom output
npx prisma generate --generator client
```

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Introspect existing database
npx prisma db pull

# Push schema changes without migrations (dev only)
npx prisma db push
```

## Development Setup

### Local Development

```bash
# Install Prisma CLI
npm install -g prisma

# Install dependencies
pnpm install

# Setup database
npx prisma migrate dev

# Seed database with test data
npx prisma db seed
```

### Environment Configuration

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/cortex_os"

# SQLite for development
DATABASE_URL="file:./dev.db"
```

## Data Seeding

### Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create test users
  const user = await prisma.user.create({
    data: {
      email: 'test@cortex-os.dev',
      name: 'Test User',
    },
  })

  // Create test agents
  await prisma.agent.create({
    data: {
      name: 'Test Agent',
      description: 'Development test agent',
      config: {},
      userId: user.id,
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Running Seeds

```bash
# Run seed script
npx prisma db seed

# Custom seed command
npm run db:seed
```

## Production Deployment

### Database Setup

```bash
# Run migrations in production
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Generate production client
npx prisma generate
```

### Connection Pooling

```javascript
// Database connection with pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})
```

## Performance Optimization

### Query Optimization

```typescript
// Efficient queries with relations
const agentWithMemories = await prisma.agent.findUnique({
  where: { id: agentId },
  include: {
    memories: {
      take: 10,
      orderBy: { createdAt: 'desc' },
    },
  },
})

// Using select for specific fields
const agentNames = await prisma.agent.findMany({
  select: {
    id: true,
    name: true,
  },
})
```

### Indexing Strategy

```prisma
model Memory {
  id        String   @id @default(cuid())
  content   String
  agentId   String
  createdAt DateTime @default(now())
  
  @@index([agentId])
  @@index([createdAt])
  @@index([agentId, createdAt])
}
```

## Backup and Recovery

### Database Backups

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup.sql

# SQLite backup
cp prisma/dev.db backup/dev.db.backup

# Automated backup script
./scripts/backup-database.sh
```

### Recovery Procedures

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Migration rollback
npx prisma migrate resolve --rolled-back 20231201_migration_name
```

## Monitoring and Logging

### Query Logging

```typescript
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
  ],
})

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Duration: ' + e.duration + 'ms')
})
```

### Performance Monitoring

- **Query Performance** - Monitor slow queries
- **Connection Pool** - Monitor connection usage
- **Database Size** - Track database growth
- **Index Usage** - Monitor index effectiveness

## Security

### Data Protection

- **Encryption at Rest** - Database encryption
- **Connection Security** - TLS/SSL connections
- **Access Control** - Database user permissions
- **Audit Logging** - Database access logging

### Best Practices

- Use environment variables for credentials
- Implement proper access controls
- Regular security updates
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

- **Migration Conflicts** - Resolving schema conflicts
- **Connection Issues** - Database connectivity problems
- **Performance Problems** - Query optimization needs
- **Data Consistency** - Data integrity issues

### Debugging

```bash
# Enable debug logging
DEBUG=prisma:* npx prisma migrate dev

# Validate schema
npx prisma validate

# Check migration status
npx prisma migrate status
```

## Related Documentation

- [Data Management](/data/README.md)
- [API Documentation](/docs/)
- [Configuration](/config/README.md)
- [Deployment Guide](/infra/README.md)
