# Cortex-OS Database Schema and Migrations

This directory defines the Prisma data model and SQL migrations for Cortex-OS.

## Directory Structure

```text
prisma/
├── schema.prisma
└── migrations/
    ├── 20240101000001_enable_pgvector/
    │   └── migration.sql
    ├── 20240101000002_match_documents_rpc/
    │   └── migration.sql
    └── 20240101000003_hybrid_search_rpc/
        └── migration.sql
```

## Data Model

```prisma
model Source {
  id        String   @id @default(cuid())
  kind      String
  url       String?  @db.Text
  createdAt DateTime @default(now())
  documents Document[]
}

model Document {
  id        String   @id @default(cuid())
  sourceId  String
  source    Source   @relation(fields: [sourceId], references: [id])
  title     String
  mime      String
  sha256    String   @unique
  createdAt DateTime @default(now())
  chunks    Chunk[]
  evidence  Evidence[]
  @@index([sourceId])
}

model Chunk {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  ord        Int
  text       String   @db.Text
  embedding  Bytes?
  meta       Json?
  evidence   Evidence[]
  @@index([documentId, ord])
}

model Project {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  tasks     Task[]
}

model Task {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  title     String
  status    String   @default("backlog")
  createdAt DateTime @default(now())
  evidence  Evidence[]
  @@index([projectId])
}

model Evidence {
  id         String   @id @default(cuid())
  taskId     String
  documentId String
  chunkId    String
  start      Int?
  end        Int?
  task       Task     @relation(fields: [taskId], references: [id])
  document   Document @relation(fields: [documentId], references: [id])
  chunk      Chunk    @relation(fields: [chunkId], references: [id])
}
```

### Relationships

- A `Source` has many `Document` records.
- A `Document` has many `Chunk` and `Evidence` records.
- A `Project` has many `Task` records.
- A `Task` has many `Evidence` records.

Foreign keys are declared with explicit `@relation` clauses and indexes are used to speed up lookups on foreign keys and chunk order.

## Migrations

Run Prisma migrations after updating `schema.prisma`:

```bash
# Generate a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy
```

Existing migrations enable the `pgvector` extension and register helper
functions (`match_documents` and `hybrid_search`) for similarity search.

## Validation

```bash
npx prisma validate
```

This command checks that the schema and migrations are internally consistent.
