# Nexora: AI-Powered Workforce Analytics & Talent Intelligence Dashboard

> *Turning workforce data into intelligent decisions.*
> Infosys Springboard Internship, Batch 3, Team B

**Live demo:** https://aiworkforcesystem.netlify.app

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [User Roles](#user-roles)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Prerequisites](#prerequisites)
7. [Installation](#installation)
8. [Environment Variables](#environment-variables)
9. [Running the Project](#running-the-project)
10. [Using the Application](#using-the-application)
11. [Project Structure](#project-structure)
12. [Available Scripts](#available-scripts)
13. [Deployment](#deployment)
14. [Agile Documentation](#agile-documentation)
15. [Limitations](#limitations)
16. [Team](#team)

---

## Project Overview

Organisations often keep workforce data in separate HR systems, attendance tools and Excel files. This leads to manual tracking, limited insight into skill gaps and attrition risk, and delayed decisions.

**Nexora** is a single web platform that centralises workforce information, automates attendance and leave tracking, and presents analytics, forecasting and AI-assisted recommendations through dashboards designed for four different user roles.

> **Note:** AI insights support human decision-making. They do not automatically guarantee accurate predictions.

## Features

- **Role-based dashboards** for Admin, HR, Manager and Employee
- **Dataset Manager:** upload CSV / Excel files, validate and clean data, view import history
- **Employee and department management:** profiles, designations, searchable directory
- **Attendance, leave, shifts and timesheets:** tracking, requests and approvals
- **Performance and skills:** ratings, goals, skills, training and certifications
- **Analytics dashboards:** KPI cards, attendance trends, workforce by department, date-range filters
- **Reports and data management:** generate and export workforce reports
- **AI and talent intelligence:** attrition risk, skill-gap analysis, workforce forecasting, appraisal and promotion candidates
- **Workforce Copilot:** chat assistant for questions about workforce data
- **Governance:** audit logs, notifications, global search, settings, system health

## User Roles

| Role | What they can do |
|------|------------------|
| **Admin** | Manage users and roles, upload datasets, view audit logs, monitor system health, access all reports |
| **HR** | Maintain employee records, track attendance and leave, analyse talent and attrition |
| **Manager** | View team attendance, approve leave, track performance and skills, plan resources |
| **Employee** | View profile and schedule, apply for leave, see attendance, performance and skills |

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State management | Zustand (with browser persistence) |
| Charts | Recharts |
| CSV / Excel parsing | PapaParse |
| Database toolkit | Drizzle ORM |
| Database | PostgreSQL |
| Deployment | Netlify |

## Architecture

The application follows a layered design:

| Layer | Description |
|-------|-------------|
| User layer | Admin, HR, Manager, Employee |
| Frontend | Next.js app (React + TypeScript + Tailwind CSS) with module pages, charts and data import |
| State management | Zustand store for employee, attendance, performance and UI state |
| Application logic | Employee management, attendance and leave, performance and skills, analytics and forecasting, reports, audit, Workforce Copilot |
| Data layer | PostgreSQL with Drizzle ORM (configured, with a health check at `/api/health`) and browser storage for the current demo |
| Supporting services | PapaParse (import), Recharts (visualisation), Next.js API routes |

## Prerequisites

Install the following before you begin:

| Tool | Version | Check with |
|------|---------|------------|
| [Node.js](https://nodejs.org/) | 20 LTS or newer | `node -v` |
| npm | 10 or newer (comes with Node) | `npm -v` |
| [Git](https://git-scm.com/) | any recent version | `git --version` |
| [PostgreSQL](https://www.postgresql.org/) | 14 or newer (**optional**, only for database features) | `psql --version` |

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

**2. Install dependencies**

```bash
npm install
```

This installs all runtime dependencies (Next.js, React, TypeScript, Tailwind CSS, Zustand, Recharts, PapaParse, Drizzle ORM and the PostgreSQL driver) and the development tools listed in `package.json`.

**3. Create your environment file** (see [Environment Variables](#environment-variables))

```bash
cp .env.example .env.local
```

On Windows (Command Prompt) use `copy .env.example .env.local`.

**4. (Optional) Set up the database**

Skip this step if you only want to run the demo with browser storage.

```bash
# Create a database, for example:
createdb nexora

# Apply the schema
npx drizzle-kit push
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
# PostgreSQL connection string (optional for the browser-storage demo)
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/nexora
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No (demo mode) / Yes (database mode) | PostgreSQL connection string used by Drizzle ORM |

Never commit `.env.local` to GitHub. Make sure it is listed in `.gitignore`.

## Running the Project

**Development mode** (hot reload):

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

**Production build** (to test what gets deployed):

```bash
npm run build
npm start
```

**Verify the app is healthy:** open http://localhost:3000/api/health. It should return a success response.

## Using the Application

1. Open the landing page and click **Create Account** (or **Enter System** if you already have one).
2. Log in with a role: Admin, HR, Manager or Employee. Each role opens its own dashboard.
3. As **Admin**, open **Dataset Manager** and upload a CSV or Excel file with employee data. The app validates it and updates the dashboards.
4. Explore **Employees**, **Attendance**, **Leave**, **Performance**, **Reports**, **Workforce Analytics**, **Talent Intelligence** and **Workforce Planning** from the sidebar.
5. Use the **Ask Workforce AI** button to open the Workforce Copilot.

**Demo accounts:** TODO: add test credentials here, for example:

| Role | Email | Password |
|------|-------|----------|
| Admin | TODO | TODO |
| HR | TODO | TODO |
| Manager | TODO | TODO |
| Employee | TODO | TODO |

## Project Structure

> TODO: adjust this tree to match your actual repository.

```

.
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── admin/
│   │   │   ├── employee/
│   │   │   ├── hr/
│   │   │   ├── manager/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── api/
│   │   ├── login/
│   │   ├── register/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── db/
│   └── lib/
├── .gitignore
├── drizzle.config.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md

```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimised production build |
| `npm start` | Run the production build |
| `npm run lint` | Run the linter |
| `npx drizzle-kit push` | Apply the database schema to PostgreSQL |

## Deployment

The project is deployed on **Netlify**: https://aiworkforcesystem.netlify.app

To deploy your own copy:

1. Push the repository to GitHub.
2. In Netlify choose **Add new site → Import an existing project** and select the repo.
3. Use the build command `npm run build` (Netlify detects Next.js automatically).
4. Add `DATABASE_URL` under **Site settings → Environment variables** if you use the database.
5. Deploy. Every push to `main` redeploys automatically.

## Agile Documentation

The full Agile artifacts are in the [`agile-documentation`](./agile-documentation) folder:

- [Project Overview & Agile Setup](./agile-documentation/01-project-overview.md)
- [Product Backlog & User Stories](./agile-documentation/02-product-backlog-and-user-stories.md)
- [Sprint Plans](./agile-documentation/03-sprint-plans.md)
- [Task Board](./agile-documentation/04-task-board.md)
- [Progress Reports](./agile-documentation/05-progress-reports.md)





**Mentor:** Vivek Gautam
**Program:** Infosys Springboard Internship, Batch 3


