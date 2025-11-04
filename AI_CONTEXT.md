## 🧠 AI Development Context

This document provides context for AI assistants to help develop this project accurately.

### Project Goal

* A personal finance tracker with React (Vite) frontend and NestJS backend.

### Core Architectural Decisions

1.  **Separated Stack:** The frontend (`/web`) and backend (`/api`) are separate projects in a `pnpm` monorepo. **Never** mix frontend and backend code.
2.  **Authentication is Solved:** All authentication and user management is handled by **Clerk**.
    * **Frontend:** Uses `@clerk/clerk-react`.
    * **Backend:** Uses `@clerk/nest` and the `AuthGuard`. **Do not** write any custom JWT, password, or session logic.
    * **User ID:** The `clerkUserId` from Clerk is the primary foreign key for all user-owned data.
3.  **Database is Solved:** All database access is handled by **Prisma**.
    * **Do not** write raw SQL queries.
    * All database logic must go inside a NestJS "Service" (e.g., `TransactionsService`).
    * All database access must be type-safe using the generated Prisma Client.

### Key Data Models (`/api/prisma/schema.prisma`)

This is the source of truth for our data structure.

```prisma
// /api/prisma/schema.prisma

// This model is a local mirror of the Clerk user
// It's created using a webhook from Clerk
model User {
  id          String   @id @default(cuid())
  clerkUserId String   @unique // This links to the Clerk user
  email       String   @unique
  firstName   String?
  lastName    String?
  
  // Relations
  transactions      Transaction[]
  monobankConnection MonobankConnection?
}

model Transaction {
  id          String   @id @default(cuid())
  amount      Float
  description String
  date        DateTime
  category    String
  
  // Relation to User
  user   User   @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)
  userId String
}

model MonobankConnection {
  id              String   @id @default(cuid())
  encryptedToken  String   // The OAuth access token, *always* encrypted
  
  // Relation to User
  user   User   @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)
  userId String @unique
}
```

Guiding Principles & Rules
TypeScript is Mandatory: All new code must be in TypeScript.

Test New Logic: All new backend business logic in a "Service" should have unit tests in a .spec.ts file using vitest.

Security First:

All NestJS controllers (except auth callbacks) must be protected with @UseGuards(AuthGuard).

All database queries for user data (like transactions) must include a where: { userId: ... } clause to prevent users from seeing each other's data.

All external API keys (Clerk, Monobank) must be loaded from .env files and never hard-coded.

Monobank Logic is Backend-Only: All interaction with the Monobank API (OAuth, data fetching) happens in the NestJS backend (/api), never in the React app (/web).