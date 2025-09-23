# Database Migrations

This project uses two separate database systems with their own migration workflows:

## 1. D1 Database (Global Workflow Index)

**Purpose**: Stores the global index of all workflows for listing and search.

**Schema**: `src/repositories/d1-schema.ts`
**Config**: `drizzle-d1.config.ts`
**Migrations**: `drizzle/d1/`

### Commands:
```bash
# Generate D1 migrations
pnpm db:generate:d1

# Apply D1 migrations (requires D1 credentials in config)
pnpm db:migrate:d1
```

## 2. Durable Object Storage (Individual Workflows)

**Purpose**: Stores individual workflow data, versions, and metadata per workflow instance.

**Schema**: `src/repositories/durable-object-schema.ts`
**Config**: `drizzle-do.config.ts`
**Migrations**: `drizzle/durable-object/`

### Commands:
```bash
# Generate Durable Object migrations
pnpm db:generate:do

# Migrations are automatically applied when each Durable Object starts up
```

## Workflow

1. **Make schema changes** in the appropriate schema file
2. **Generate migrations** using the respective command
3. **For D1**: Deploy migrations to your D1 database
4. **For Durable Objects**: Migrations run automatically on startup

## Generate All Migrations

```bash
pnpm db:generate
```

This runs both `db:generate:d1` and `db:generate:do`.