# LuminaLead // Lead Generation API Portal

A robust, self-contained Lead Generation API service built with Node.js, Express, and Prisma ORM utilizing SQLite. Features structured data validation, input sanitization, CRM contact profile auto-merging, and an interactive glassmorphism testing dashboard.

This project was built as part of the **Week 7 Backend Development Internship Task** for Webthism.

---

## Features

- **Relational Database Design**: Models for Campaigns, Forms, Leads, and Contacts with cascade triggers managed via Prisma 7 and SQLite.
- **Lead Capture Endpoint**: Ingests submissions, performs Zod schema checks, and automatically syncs/merges duplicate leads into unified CRM contact profiles based on email addresses.
- **Dynamic Form Validations**: Middleware checks request parameters against structural constraints and dynamically validates custom fields based on Form schema configurations.
- **Interactive Simulator Dashboard**: A premium frontend interface to visually test APIs, dynamically render forms, inspect database states (Leads/Contacts), and see live request/response JSON headers.
- **Automated Integration Tests**: Core test cases verifying standard validation, sanitization (whitespaces, lowercase emails), and dynamic field omissions.

---

## Technical Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database ORM**: Prisma v7
- **Database Engine**: SQLite (via `@prisma/adapter-better-sqlite3` driver)
- **Validation**: Zod v4

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma   # Database models and relations
│   └── seed.js         # Pre-populates database with mock campaigns, forms, and leads
├── public/
│   ├── index.html      # Glassmorphic visual dashboard
│   ├── style.css       # Layouts, variables, and styling tokens
│   └── app.js          # Tab controls, simulation render, and client fetch
├── src/
│   ├── config/
│   │   └── db.js       # Prisma client driver adapter configuration
│   ├── middleware/
│   │   └── validation.js # Zod schemas and validation pipeline
│   └── routes/
│       └── api.js      # REST endpoint routes and controllers
├── server.js           # Main Express server configuration
├── test-api.js         # Automated integration test suite
├── prisma.config.js    # Prisma 7 configuration file
└── package.json        # Dependencies and scripts
```

---

## Quick Start

### 1. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 2. Set Up Environment
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
```

### 3. Initialize & Seed Database
Sync your local database schema and run the seed script to create initial records:
```bash
# Push database schema
npm run db:push

# Run seed script
npm run db:seed
```

### 4. Start Server
Run the Express server locally:
```bash
# Start in development mode with Nodemon
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to access the interactive dashboard.

---

## Running Integration Tests

To run the automated validation test suite programmatically:
```bash
npm run test
```

---

## API Documentation

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/leads/capture` | Submits form data, creates a new lead, and upserts CRM contact |
| `GET` | `/api/leads` | Lists all captured leads (supports filtering by campaign/form) |
| `GET` | `/api/leads/:id` | Retrieves detailed lead payload |
| `GET` | `/api/contacts` | Lists all consolidated CRM contact profiles |
| `GET` | `/api/campaigns` | Lists marketing campaigns with aggregate counts |
| `GET` | `/api/forms` | Lists lead capture forms and dynamic field schemas |
