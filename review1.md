# Golden Soft Monorepo - Comprehensive Code Review Report

## 1. Full Project Description
**Project Purpose:** "Golden Soft" is a multi-tenant, offline-first Point-of-Sale (POS) System built specifically for restaurants and cafes operating primarily in Egypt (Timezone: Africa/Cairo). The architecture is designed to allow local restaurant branches to continue operations offline through a local server (`branch-backend`) and sync data gracefully to a centralized cloud system (`cloud-backend`) when internet connectivity is available.

**Technology Stack:**
- **Monorepo Manager:** `pnpm` workspace architecture.
- **Languages:** Strictly TypeScript across the stack.
- **Cloud Backend:** Express.js + Mongoose (MongoDB) handling multi-tenancy.
- **Branch Backend:** Express.js + `drizzle-orm` + `better-sqlite3` (SQLite) ensuring offline capabilities with WAL mode.
- **Frontend POS (Branch & Cloud Dashboards):** React + Vite.
- **State & Data Fetching (Frontend):** TanStack React Query, Zustand.
- **Forms & Validation:** `react-hook-form` + Zod schema validation.
- **Styling:** Tailwind CSS + custom shadcn/ui optimized for large touch targets.
- **Real-time Engine:** Dual Socket.io networks (LAN for local KDS/Table statuses, Cloud Sync Pipeline for buffering data to the cloud).
- **Shared Contracts:** `@goldensoft/core-schemas` (Zod & TS interfaces) and `@goldensoft/socket-contracts` strictly shared between all apps.

---

## 2. Covered Correctly (No Improvements Needed)
* **Zod Validation Integration:** The implementation of Zod schemas in `@goldensoft/core-schemas` is excellent. Complex types like nested forms, relationships, and basic validations are robust and exported efficiently.
* **Shared Contract Architecture:** Strict adherence to sharing TypeScript interfaces and Zod schemas across the monorepo reduces duplication greatly.
* **SQLite Offline Architecture:** `branch-backend` uses `better-sqlite3` with WAL mode correctly initialized, enabling robust offline functionality for concurrent POS operations.
* **Axios Interceptor Patterns:** The POS frontend (`apps/branch-pos/src/lib/api.ts`) effectively implements robust token refresh interceptors with queued requests during the refresh cycle. This is an advanced pattern implemented flawlessly.
* **Touch-First UI Considerations:** Several parts of the frontend code properly consider fast-paced environment interactions, prioritizing large hit areas and visual feedback on active states.
* **API Hook Structuring:** The usage of TanStack React Query hooks like `useChecksApi.ts` is well-structured and properly segregates concerns.

---

## 3. Issues and Bugs (Sorted by Severity)

### Critical
1. **Missing Authentication & Authorization in Cloud Backend:** 
   - *Issue:* Routes in the `cloud-backend` are openly accessible without strict token verification or route-level RBAC (Role-Based Access Control) using `PERMISSIONS` from `core-schemas`.
   - *Fix:* Ensure `requireAuth` and `requirePermission` middlewares are implemented and applied to every restricted route in `cloud-backend`.
2. **Hardcoded Admin Credentials:**
   - *Issue:* Found in `cloud-backend` during the discovery phase. This is an extreme security risk.
   - *Fix:* Remove hardcoded credentials. Use `.env` variables or a proper seeding script pulling from secure environment contexts.
3. **Open CORS Configuration:**
   - *Issue:* `cloud-backend` CORS settings are too permissive (often accepting `*`).
   - *Fix:* Restrict CORS origins strictly to known dashboard domains, tenant subdomains, and branch network IP ranges.
4. **Missing Multi-tenant Query Safety (MongoDB):**
   - *Issue:* Queries in `cloud-backend` do not consistently pass `tenantId` in every database call.
   - *Fix:* Wrap MongoDB queries to always enforce tenant isolation. Inject an isolated tenant connection object into the Express request context (`req.tenantDb`).
5. **No Cloud-Sync Socket Implementation:**
   - *Issue:* The cloud synchronization pipeline (Socket.io) bridging `branch-backend` to `cloud-backend` is incomplete or missing.
   - *Fix:* Implement Socket.io on the `cloud-backend` using strict string literals from `@goldensoft/socket-contracts` and enforce callback acknowledgements for data mutations to prevent race conditions.

### High
6. **Date/Time Handling Vulnerability:**
   - *Issue:* Some endpoints rely on simple date validations. The business logic dictates strict separation between `createdAt` (UTC ISO-8601) and `businessDate` (logical rollover at EOD).
   - *Fix:* Enforce `businessDate` schema validations strictly across `core-schemas`. Ensure EOD logic does not cross-contaminate UTC timestamps.
7. **Type Safety Gaps & Mismatches in Shared Schemas:**
   - *Issue:* There are missing validation boundaries for critical fields like "rates", "pricing", and "dates" inside `core-schemas`.
   - *Fix:* Add `.min()`, `.max()`, and positive number constraints to all monetary and quantitative fields in the Zod schemas.

### Medium
8. **Frontend Component Monoliths:**
   - *Issue:* High complexity files (e.g., `FloorPlan.tsx` is over 1,000 lines long). This violates the < 300-line limit rule for POS systems.
   - *Fix:* Extract heavy logic into custom hooks. Split complex UI elements (like Modals, Sub-headers, Grids) into smaller sub-components inside a dedicated folder (`components/pos-floor-plan/`).
9. **Missing Audit Logging:**
   - *Issue:* Significant system mutations (checkout flow events, table transfers) are not consistently calling the LAN Socket `logAction` function.
   - *Fix:* Wrap these operations in the controller/frontend to ensure every mutation triggers `logAction` with user context.

### Low
10. **Incomplete Environment Validation:**
    - *Issue:* Missing strict Zod schema validation for `.env` files on boot for all microservices.
    - *Fix:* Implement `src/env.ts` on server boot to fail fast if required environment variables are missing.

---

## 4. Gaps and Improvements
* **Missing Schemas:** There are notable gaps in `core-schemas` regarding `payments`, `customers`, and detailed `order/check` lifecycle states. These need to be defined comprehensively.
* **POS Tactical Improvements:** `branch-pos` lacks strict enforcement of generic non-selectable text (`select-none`) across all touch targets to prevent native browser highlighting on iPads during rapid double taps.
* **Check Kinds Adherence:** Ensure strict usage of `1: Dine in, 2: Delivery, 3: Take away` enums rather than relying on string descriptors across the stack.
* **State Fragmentation:** Ensure there are no ad-hoc `useState` clusters in the frontend, particularly for nested forms. Wrap all settings forms heavily in `react-hook-form`.
* **Testing:** No apparent robust E2E test coverage for the offline-to-online sync engine. Consider playwright testing for network interruptions.
