# 🏗️ Financial App Monorepo - Architecture Guide

## 📚 Table of Contents
- [Project Structure](#-project-structure)
- [Architecture Overview](#-architecture-overview)
- [Workspace Packages](#-workspace-packages)
- [Development Workflow](#-development-workflow)
- [Best Practices](#-best-practices)
- [Quick Reference](#-quick-reference)

---

## 📁 Project Structure

```
financial_app/                         # Root of monorepo
├── pnpm-workspace.yaml               # Defines workspace packages
├── pnpm-lock.yaml                    # Single lockfile for all packages
├── package.json                      # Root package with monorepo scripts
├── node_modules/                     # Shared dependencies (hoisted)
│
├── api/                              # Backend Application
│   ├── package.json                  # @financial-app/api
│   ├── src/
│   │   ├── main.ts                   # Application entry point
│   │   ├── app.module.ts             # Root NestJS module
│   │   ├── app.controller.ts         # Root controller
│   │   └── app.service.ts            # Root service
│   ├── test/                         # E2E tests
│   └── tsconfig.json                 # TypeScript configuration
│
├── web/                              # Frontend Application
│   ├── package.json                  # @financial-app/web
│   ├── src/
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Root component
│   │   ├── components/               # Reusable UI components
│   │   ├── pages/                    # Page components
│   │   └── lib/                      # Utilities and helpers
│   ├── public/                       # Static assets
│   └── vite.config.ts                # Vite bundler configuration
│
└── packages/                         # Shared Packages
    └── common-types/                 # Shared TypeScript Types
        ├── package.json              # @financial-app/common-types
        ├── src/
        │   └── index.ts              # Exported types
        └── tsconfig.json             # TypeScript configuration
```

---

## 🎯 Architecture Overview

### Monorepo Benefits
- **Single Source of Truth**: All code in one repository
- **Type Safety**: Shared types between frontend and backend
- **Dependency Management**: Single lockfile, shared dependencies
- **Code Reuse**: Easy to share code between packages
- **Atomic Commits**: Changes across multiple packages in one commit

### Workspace Dependencies
```
packages/common-types  ←──┬── api (imports types)
                          └── web (imports types)
```

- Each workspace is an independent npm package
- Workspaces can depend on each other using `"workspace:*"`
- pnpm creates **symlinks** to link packages (no duplication)
- Changes in `common-types` are immediately available

---

## 📦 Workspace Packages

### 1. Root Package (`/`)
**Purpose**: Monorepo orchestration and tooling

**Key Files**:
- `pnpm-workspace.yaml` - Defines workspace locations
- `package.json` - Root scripts for running all packages

**Available Scripts**:
```bash
pnpm dev          # Run both API and web concurrently
pnpm dev:api      # Run backend only
pnpm dev:web      # Run frontend only
pnpm build        # Build all packages
pnpm test         # Test all packages
```

---

### 2. API Package (`/api`)
**Purpose**: NestJS Backend Application

**Package Name**: `@financial-app/api`

**Tech Stack**:
- NestJS 11
- TypeScript
- Jest (testing)
- Express (HTTP server)

**Recommended Folder Structure**:
```
api/src/
├── main.ts                           # Bootstrap
├── app.module.ts                     # Root module
├── common/                           # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/                           # Configuration
│   └── config.module.ts
├── modules/                          # Feature modules
│   ├── transactions/
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   ├── dto/
│   │   │   ├── create-transaction.dto.ts
│   │   │   └── update-transaction.dto.ts
│   │   └── entities/
│   │       └── transaction.entity.ts
│   ├── users/
│   └── auth/
└── database/                         # Database module
    └── database.module.ts
```

**Example Module**:
```typescript
// api/src/modules/transactions/transactions.service.ts
import { Injectable } from '@nestjs/common';
import { Transaction } from '@financial-app/common-types';

@Injectable()
export class TransactionsService {
  async findAll(): Promise<Transaction[]> {
    // Business logic
    return [];
  }
}
```

**Key Commands**:
```bash
# Development
pnpm dev:api                          # Start with hot reload

# Generate new resource
cd api && nest g module modules/feature
cd api && nest g service modules/feature
cd api && nest g controller modules/feature

# Testing
pnpm --filter api run test            # Unit tests
pnpm --filter api run test:e2e        # E2E tests
pnpm --filter api run test:cov        # Coverage

# Build
pnpm --filter api run build
```

---

### 3. Web Package (`/web`)
**Purpose**: React Frontend Application

**Package Name**: `@financial-app/web`

**Tech Stack**:
- React 18
- TypeScript
- Vite 6
- Tailwind CSS (via shadcn/ui)

**Recommended Folder Structure**:
```
web/src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root component
├── components/                       # Reusable components
│   ├── ui/                           # Base UI (shadcn/ui)
│   ├── forms/
│   ├── layout/
│   └── TransactionCard.tsx
├── pages/                            # Page components
│   ├── HomePage.tsx
│   ├── TransactionsPage.tsx
│   └── ExpensesPage.tsx
├── features/                         # Feature-specific code
│   └── transactions/
│       ├── hooks/
│       │   └── useTransactions.ts
│       ├── components/
│       │   ├── TransactionList.tsx
│       │   └── TransactionForm.tsx
│       └── api/
│           └── transactions.api.ts
├── lib/                              # Utilities
│   ├── api-client.ts
│   ├── utils.ts
│   └── translations.ts
├── hooks/                            # Global hooks
│   ├── useAuth.ts
│   └── useLocalStorage.ts
├── context/                          # React Context
│   └── AuthContext.tsx
└── styles/
    └── globals.css
```

**Example API Client**:
```typescript
// web/src/lib/api-client.ts
import { Transaction, API } from '@financial-app/common-types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = {
  async getTransactions(): Promise<Transaction[]> {
    const res = await fetch(`${API_BASE}/transactions`);
    return res.json();
  },
  
  async createTransaction(data: API.CreateTransactionRequest) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
};
```

**Example Custom Hook**:
```typescript
// web/src/features/transactions/hooks/useTransactions.ts
import { useState, useEffect } from 'react';
import { Transaction } from '@financial-app/common-types';
import { apiClient } from '@/lib/api-client';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, []);

  return { transactions, loading };
}
```

**Key Commands**:
```bash
# Development
pnpm dev:web                          # Start dev server

# Build
pnpm --filter web run build           # Production build
pnpm --filter web run preview         # Preview build
```

---

### 4. Common Types Package (`/packages/common-types`)
**Purpose**: Shared TypeScript types between API and web

**Package Name**: `@financial-app/common-types`

**When to Add Types Here**:
✅ Types used by **both** frontend and backend  
✅ Domain models (User, Transaction, Product)  
✅ API request/response DTOs  
✅ Shared enums and constants  

❌ Frontend-only types (component props, UI state)  
❌ Backend-only types (database entities, internal services)  

**Example Structure**:
```typescript
// packages/common-types/src/index.ts

// Domain Models
export type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO 8601 date string (e.g., "2025-11-04T10:30:00.000Z")
};

export type User = {
  id: string;
  email: string;
  name: string;
};

// Enums
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionCategory {
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  ENTERTAINMENT = 'ENTERTAINMENT',
}

// API DTOs (organized in namespace)
export namespace API {
  export interface CreateTransactionRequest {
    amount: number;
    description: string;
    type: TransactionType;
    category: TransactionCategory;
  }
  
  export interface TransactionResponse {
    data: Transaction;
    message: string;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
  }
}

// Type Guards
export function isTransaction(obj: any): obj is Transaction {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.description === 'string' &&
    typeof obj.date === 'string'
  );
}

// Date Serialization Utilities
export const DateUtils = {
  toISOString(date: Date): string {
    return date.toISOString();
  },
  fromISOString(isoString: string): Date {
    return new Date(isoString);
  },
  now(): string {
    return new Date().toISOString();
  },
  isValidISOString(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
  },
};
```

**Usage in API**:
```typescript
// api/src/modules/transactions/transactions.controller.ts
import { Transaction, API, TransactionType } from '@financial-app/common-types';

@Controller('transactions')
export class TransactionsController {
  @Post()
  async create(@Body() dto: API.CreateTransactionRequest): Promise<API.TransactionResponse> {
    const transaction = await this.service.create(dto);
    return {
      data: transaction,
      message: 'Transaction created successfully',
    };
  }
}
```

**Usage in Web**:
```typescript
// web/src/features/transactions/components/TransactionForm.tsx
import { API, TransactionType } from '@financial-app/common-types';

export function TransactionForm() {
  const handleSubmit = async (data: API.CreateTransactionRequest) => {
    await apiClient.createTransaction(data);
  };
  
  // Form implementation
}
```

**Date Serialization Best Practices**:
```typescript
// API: Converting database Date objects to JSON-safe strings
import { Transaction, DateUtils } from '@financial-app/common-types';

// When reading from database (e.g., MongoDB, PostgreSQL)
async function getTransactionFromDB(id: string): Promise<Transaction> {
  const dbRecord = await db.transactions.findOne({ id });
  
  return {
    id: dbRecord.id,
    amount: dbRecord.amount,
    description: dbRecord.description,
    date: DateUtils.toISOString(dbRecord.date), // Convert Date to ISO string
  };
}

// When saving to database
async function saveTransaction(transaction: Transaction) {
  await db.transactions.insert({
    ...transaction,
    date: DateUtils.fromISOString(transaction.date), // Convert ISO string to Date
  });
}

// Frontend: Working with dates in the UI
import { Transaction, DateUtils } from '@financial-app/common-types';

function TransactionDisplay({ transaction }: { transaction: Transaction }) {
  // Convert ISO string to Date object for display/manipulation
  const date = DateUtils.fromISOString(transaction.date);
  
  return (
    <div>
      <p>Date: {date.toLocaleDateString()}</p>
      <p>Time: {date.toLocaleTimeString()}</p>
    </div>
  );
}

// Creating new transactions with current timestamp
const newTransaction: Transaction = {
  id: crypto.randomUUID(),
  amount: 100,
  description: 'Purchase',
  date: DateUtils.now(), // Current timestamp as ISO string
};
```

**Key Commands**:
```bash
# Build types (required after changes)
pnpm --filter @financial-app/common-types run build

# Watch mode (auto-rebuild on changes)
pnpm --filter @financial-app/common-types run watch
```

---

## 🔧 Development Workflow

### Daily Development

1. **Start Development Servers**:
```bash
pnpm dev                              # Both API + Web
# or
pnpm dev:api                          # API only (port 3000)
pnpm dev:web                          # Web only (port 5173)
```

2. **Make Changes**:
   - Edit files in `api/`, `web/`, or `packages/common-types/`
   - Hot reload automatically updates

3. **After Updating Types**:
```bash
# Rebuild common-types (or use watch mode)
pnpm --filter @financial-app/common-types run build
```

### Adding Dependencies

```bash
# To specific workspace
pnpm add axios --filter web           # Add to web only
pnpm add @nestjs/config --filter api  # Add to api only

# Dev dependencies
pnpm add -D typescript --filter api

# To root (for tooling)
pnpm add -D eslint -w                 # -w = workspace root
```

### Creating a New Feature

**Example: Adding a "Categories" feature**

1. **Add Types** (`packages/common-types/src/index.ts`):
```typescript
export type Category = {
  id: string;
  name: string;
  color: string;
  icon?: string;
};

export namespace API {
  export interface CreateCategoryRequest {
    name: string;
    color: string;
  }
}
```

2. **Build Types**:
```bash
pnpm --filter @financial-app/common-types run build
```

3. **Create Backend Module**:
```bash
cd api
nest g module modules/categories
nest g service modules/categories
nest g controller modules/categories
```

4. **Implement Backend**:
```typescript
// api/src/modules/categories/categories.service.ts
import { Category } from '@financial-app/common-types';

@Injectable()
export class CategoriesService {
  async findAll(): Promise<Category[]> {
    // Implementation
  }
}
```

5. **Create Frontend Feature**:
```bash
mkdir -p web/src/features/categories/{components,hooks,api}
```

6. **Implement Frontend**:
```typescript
// web/src/features/categories/api/categories.api.ts
import { Category } from '@financial-app/common-types';

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    return res.json();
  }
};
```

### Adding a New Shared Package

```bash
# 1. Create package structure
mkdir -p packages/shared-utils/src

# 2. Create package.json
cat > packages/shared-utils/package.json << 'EOF'
{
  "name": "@financial-app/shared-utils",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
EOF

# 3. Create tsconfig.json (copy from common-types)
cp packages/common-types/tsconfig.json packages/shared-utils/

# 4. Create src/index.ts
echo "export const formatCurrency = (amount: number) => \`\$\${amount.toFixed(2)}\`;" > packages/shared-utils/src/index.ts

# 5. Add to api/web package.json
# "@financial-app/shared-utils": "workspace:*"

# 6. Reinstall
pnpm install
```

---

## 📖 Best Practices

### 1. Type Safety

**✅ DO**:
- Always import types from `@financial-app/common-types`
- Use TypeScript strict mode
- Define return types for functions
- Use type guards for runtime validation

```typescript
// Good
import { Transaction } from '@financial-app/common-types';

function processTransaction(tx: Transaction): string {
  return `Processed ${tx.description}`;
}
```

**❌ DON'T**:
- Duplicate type definitions
- Use `any` type
- Define shared types locally

```typescript
// Bad - duplicated type
type Transaction = { id: string; amount: number };
```

### 2. Code Organization

**Backend (NestJS)**:
- One feature = one module folder
- Keep controllers thin, put logic in services
- Use DTOs with validation decorators
- Export services if used by other modules

**Frontend (React)**:
- Group by feature, not by type
- Colocate related files (component + hook + types)
- Keep components small and focused
- Use custom hooks for logic reuse

### 3. Import Paths

**Use workspace packages**:
```typescript
// ✅ Correct
import { Transaction } from '@financial-app/common-types';

// ❌ Wrong - don't use relative paths across workspaces
import { Transaction } from '../../../packages/common-types/src';
```

**Use path aliases in web** (configured in `tsconfig.json`):
```typescript
// ✅ Correct
import { Button } from '@/components/ui/button';

// ❌ Avoid deep relative paths
import { Button } from '../../../components/ui/button';
```

### 4. Dependencies

**Shared dependencies** (same version everywhere):
- react, react-dom
- typescript
- Testing libraries

**Workspace-specific**:
- NestJS packages → only in `api`
- Vite, Tailwind → only in `web`
- Type definitions → only in `common-types`

### 5. Git Workflow

```bash
# Commit related changes together
git add packages/common-types/src/index.ts
git add api/src/modules/transactions/
git add web/src/features/transactions/
git commit -m "feat: add transaction filtering"

# This ensures changes are atomic and consistent
```

### 6. Build Order

Always build in dependency order:
```bash
# 1. Build shared packages first
pnpm --filter @financial-app/common-types run build

# 2. Then build apps (they depend on shared packages)
pnpm --filter api run build
pnpm --filter web run build
```

Or use the root script (handles order automatically):
```bash
pnpm build                            # Builds all in correct order
```

### 7. Environment Variables

**API** (`.env` in `api/`):
```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

**Web** (`.env` in `web/`):
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Financial App
```

Load in code:
```typescript
// API
process.env.PORT

// Web (must start with VITE_)
import.meta.env.VITE_API_URL
```

---

## 🚀 Quick Reference

### Essential Commands

```bash
# Setup
pnpm install                          # Install all dependencies

# Development
pnpm dev                              # Start everything
pnpm dev:api                          # API only (http://localhost:3000)
pnpm dev:web                          # Web only (http://localhost:5173)

# Building
pnpm build                            # Build all packages
pnpm --filter api run build           # Build API only
pnpm --filter web run build           # Build web only
pnpm --filter @financial-app/common-types run build

# Testing
pnpm test                             # Test all
pnpm --filter api run test            # Test API
pnpm --filter api run test:e2e        # E2E tests
pnpm --filter api run test:cov        # Coverage

# Dependencies
pnpm add <package> --filter <workspace>   # Add to workspace
pnpm add -D <package> -w                  # Add to root
pnpm remove <package> --filter <workspace>

# Workspace Commands
pnpm --filter api <command>           # Run in api
pnpm --filter web <command>           # Run in web
pnpm --filter @financial-app/* <cmd>  # Run in all @financial-app packages
pnpm -r <command>                     # Run in all workspaces (recursive)

# Common NestJS Commands (from api/)
nest g module modules/feature         # Generate module
nest g service modules/feature        # Generate service
nest g controller modules/feature     # Generate controller
```

### Port Configuration

| Service | Port | URL |
|---------|------|-----|
| API (NestJS) | 3000 | http://localhost:3000 |
| Web (Vite) | 5173 | http://localhost:5173 |

### File Naming Conventions

**Backend (NestJS)**:
- `*.module.ts` - Modules
- `*.service.ts` - Services
- `*.controller.ts` - Controllers
- `*.dto.ts` - Data Transfer Objects
- `*.entity.ts` - Database entities
- `*.spec.ts` - Unit tests
- `*.e2e-spec.ts` - E2E tests

**Frontend (React)**:
- `*.tsx` - React components
- `*.ts` - TypeScript utilities
- `use*.ts` - Custom hooks
- `*.test.tsx` - Component tests
- `*.types.ts` - Type definitions

---

## 🔍 Troubleshooting

### Types not updating after changes

```bash
# Rebuild common-types
pnpm --filter @financial-app/common-types run build

# Or use watch mode during development
pnpm --filter @financial-app/common-types run watch
```

### Module not found errors

```bash
# Reinstall dependencies
pnpm install

# Check if workspace link exists
ls -la api/node_modules/@financial-app/
ls -la web/node_modules/@financial-app/
```

### Port already in use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill    # Kill API
lsof -ti:5173 | xargs kill    # Kill Web
```

---

## 📚 Additional Resources

- [pnpm Workspace](https://pnpm.io/workspaces)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## ✅ Architecture Checklist

When adding new features, verify:
- [ ] Does this type belong in `common-types`?
- [ ] Is shared code properly packaged?
- [ ] Have I built `common-types` after updating?
- [ ] Are imports using correct workspace names?
- [ ] Have I added proper TypeScript types?
- [ ] Is code in the right module/folder?
- [ ] Have I written tests?
- [ ] Are environment variables configured?
- [ ] Does it follow naming conventions?

---

**Last Updated**: November 2025  
**Version**: 1.0.0

