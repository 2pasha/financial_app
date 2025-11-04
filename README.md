# Moneta 🪙

A modern financial management application built with React, TypeScript, and Vite.

  This is a code bundle for Financial App Design. The original project is available at 
https://www.figma.com/design/6oovoGakiaYi3loN7GiXwG/Financial-App-Design.

[![CI/CD Pipeline](https://github.com/[YourUsername]/[YourRepoName]/actions/workflows/ci.yml/badge.svg)](https://github.com/[YourUsername]/[YourRepoName]/actions/workflows/ci.yml)

A modern, fast, and secure personal finance tracker designed to provide clear insights into your spending and income, with direct integration from Monobank.

---

## 🏛️ Core Architecture

This project is built using a **Separated API** (or "Backend-for-Frontend") architecture. This means the frontend and backend are two separate, independent applications. This approach was chosen for scalability, clear separation of concerns, and to easily support a future mobile app.

* **Frontend (Web):** A [Vite](https://vitejs.dev/) + [React](https://reactjs.org/) app.
* **Backend (API):** A [NestJS](https://nestjs.com/) server.
* **Authentication:** Handled by [Clerk](https://clerk.com/).
* **Database:** [PostgreSQL](https://www.postgresql.org/).

## 🛠️ Technology Stack

### Frontend (`/web`)

* **Framework:** React 18+
* **Language:** TypeScript
* **Bundler:** Vite
* **Routing:** `react-router-dom`
* **Data Fetching:** `axios`
* **Testing:** `vitest`

### Backend (`/api`)

* **Framework:** NestJS
* **Language:** TypeScript
* **Database ORM:** Prisma
* **Authentication:** `@clerk/nest`
* **Testing:** `vitest`

### Shared & DevOps

* **CI/CD:** GitHub Actions
* **Package Manager:** `pnpm` (recommended for monorepo workspaces)
* **Code Quality:** Prettier, ESLint, CodeRabbit

---

## 🚀 Getting Started

This project is set up as a **monorepo** (all code in one repository but in separate packages). We use `pnpm` as the package manager to handle this.

### Prerequisites

* Node.js (v18+ recommended)
* `pnpm` (Install with `npm install -g pnpm`)
* A running PostgreSQL database (e.g., on [Render](https://render.com/) or [Supabase](https://supabase.com/))
* A [Clerk](https://clerk.com/) application
* Monobank API credentials