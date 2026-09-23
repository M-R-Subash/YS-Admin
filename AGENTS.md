# PROJECT WORKFLOW & ARCHITECTURE DIRECTIVE


## 1. Architecture
This is a decoupled Headless CMS application using two separate repositories:
*   **Admin Panel (Backend/CMS):** Next.js, Prisma, PostgreSQL. Used purely for data entry, managing SEO, and toggling page status (Draft/Live). Image uploads go to S3/Cloudinary.
*   **Main Site (Frontend):** Next.js. Fetches data from the Admin DB and displays it.

## 2. Roles & Permissions (STRICT)
*   **The Content Editor (Admin user):** Can ONLY fill out form fields to edit text, replace images, and change Draft/Live status. They DO NOT build layouts, they DO NOT reorder structural sections, and they DO NOT create new pages from scratch. Do not generate "Add Section" or "Delete Section" buttons for top-level page blocks.
*   **The Developer (Me):** I write the code for new pages. I hardcode the Next.js layouts on the frontend. I define the required JSON schema for the backend.

## 3. Database & Form Strategy (Schema-Driven UI)
The database `Page` table uses a `JSONB` column (`content` / `sections`) to store the entire payload for a page.

To scale across 50-100 pages, the Admin Panel uses a **Schema-Driven UI Renderer**:
*   **The UI Schema (`[page]-schema.ts`):** The developer writes a JSON array defining the sections and fields (e.g., `{ name: "hero", fields: [...] }`). This dictates the exact shape of the Accordions and inputs.
*   **The Zod Validation (`[page]-validation.ts`):** The developer writes a strict Zod schema matching the UI schema to protect the database from bad data types (like saving a string where an array is expected).
*   **The Master Renderer:** A generic component (`DynamicEditorRenderer`) maps over the UI schema to render `shadcn/ui` form inputs dynamically inside Accordions.

## 4. Strict Validation Protocol
*   **Never bypass Zod:** "Publish" and "Save" buttons MUST trigger `form.trigger()` or `form.handleSubmit()` to run Zod validation. The API must never be called if the form state is invalid.
*   **Live Preview:** `form.watch()` is used to debounce and postMessage data to the iframe preview.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
