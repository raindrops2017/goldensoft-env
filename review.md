# Golden Soft Monorepo - Comprehensive Code Review Report

## 1. Full Project Description
**Project Purpose:**
"Golden Soft" is a multi-tenant, offline-first Point-of-Sale (POS) and management system designed for restaurants and cafes operating primarily in Egypt (Timezone: Africa/Cairo). The system provides a highly resilient operational model: branches continue local operations offline via a localized backend (`branch-backend`) and synchronize transactional and shift data to a centralized cloud system (`cloud-backend`) when internet connectivity is available.

**Architecture and Tech Stack:**
*   **Monorepo Manager:** `pnpm` workspaces enforce rigid package structures.
*   **Languages:** Strict TypeScript (`tsconfig.json` with `strict: true`) is enforced across the entire monorepo.
*   **Cloud Backend (`apps/cloud-backend`):** Express.js + Mongoose/MongoDB, utilizing a dynamic database-per-tenant isolation scheme.
*   **Branch Backend (`apps/branch-backend`):** Express.js + Drizzle ORM + `better-sqlite3` (SQLite) utilizing Write-Ahead Logging (WAL) mode for local performance and concurrency.
*   **Branch POS Frontend (`apps/branch-pos`):** React + Vite + Tailwind CSS v4 + TanStack Query + Zustand. Optimized for iPads and POS tablet terminals.
*   **Shared Contracts:**
    *   `@goldensoft/core-schemas`: Centralized Zod schemas, calculations logic, and TypeScript interfaces shared between frontends and backends.
    *   `@goldensoft/socket-contracts`: Shared Socket.io event name mappings and contract types.
*   **Real-time Topology:** Dual Socket.io networks. A local LAN network connects POS terminals to the local branch server, and a cloud sync pipeline bridges the branch backend to the cloud backend.

---

## 2. Covered Correctly (No Improvements Needed)
*   **Modular Architecture**: Features like logging synchronizations (`logs`) follow the controller-service-route modular pattern correctly in both backend applications.
*   **SQLite Concurrency Initialization**: Databases in `branch-backend` correctly initialize Write-Ahead Logging (`WAL` mode) using `sqlite.pragma('journal_mode = WAL')` to support concurrent write access.
*   **Drizzle Parametrization**: All SQLite operations in Drizzle ORM use type-safe queries, preventing SQL injection issues out of the box.
*   **Dynamic MongoDB Schema Instantiation**: Mongoose schemas are dynamically compiled on request-resolved tenant connections (e.g. `getOrderModel`, `getScreenLogModel`), avoiding the "Cannot overwrite model once compiled" crash.
*   **Standardized Front-end Store Layouts**: Zustand is used appropriately for local client-side states (e.g., auth, locks), and TanStack Query handles server caching rules.
*   **Idempotency of Bulk Sync Operations**: The cloud sync backend utilizes Mongoose `bulkWrite` with `updateOne` and `upsert: true` to guarantee idempotent sync pushes.
*   **Offline-Ready Audit Trail logging**: All terminal mutations like cart additions, quantity updates, voids, and comps are successfully logged in local SQLite databases via a unified `useOrderSession` hook.

---

## 3. Issues and Bugs (Sorted from Critical to Low)

### 🚨 Critical Severity

#### 1. Complete Lack of Authentication and RBAC on Cloud Sync Routes
*   **File:** [logs.routes.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/cloud-backend/src/modules/logs/logs.routes.ts#L9)
*   **Issue:** The sync route does not utilize any authentication (`requireAuth`) or permission checking (`requirePermission`) middleware. Anyone who sends a request with an `x-tenant-subdomain` header can write arbitrary log files into any tenant's database.
*   **Fix:** Apply `requireAuth` and the appropriate permission key (e.g. `requirePermission([PERMISSIONS.SYNC_UPLOAD])`) from `core-schemas` directly to the route.

#### 2. Missing Database Busy Timeout in SQLite Connections
*   **Files:** [db/index.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/db/index.ts#L6-L7) and [db/logsDb.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/db/logsDb.ts#L11-L12)
*   **Issue:** The SQLite connections lack a `busy_timeout` config. In multi-terminal environments, simultaneous writes will result in a `SQLITE_BUSY: database is locked` crash instead of waiting.
*   **Fix:** Configure the SQLite pragma to wait on lock release:
    ```typescript
    sqlite.pragma('busy_timeout = 5000');
    ```

#### 3. Incomplete Sync Queue Mechanics
*   **Files:** [db/schema.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/db/schema.ts#L405) and the entire `branch-backend` sync modules
*   **Issue:** Although the `sync_queue` table exists, no database triggers or backend services populate it during check checkout, voiding, or item modifications. There is no sync client in the branch backend to push these items to the cloud.
*   **Fix:** Write a middleware or db-level triggers to populate `sync_queue` on mutations, and establish a Socket.io sync worker in the branch backend to read and push records to the cloud.

#### 4. Batch Close Checks Financial Data Corruption
*   **File:** [modules/checks/checks.controller.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/checks/checks.controller.ts#L362)
*   **Issue:** During `batchCloseChecks`, the code attempts to read non-existent check properties (`chk.chkTotal`, `chk.discountAmount`, `chk.discountPrsn`), causing them to be `undefined`. The checks are closed with `cash = 0`, `visa = 0`, and `paidCash = 0`, corrupting cashier reports.
*   **Fix:** Update property access to match the actual SQLite check schema (`chk.total`, `chk.discountPercent`, etc.).

#### 5. Incorrect Price Selection in Checks Service
*   **File:** [modules/checks/checks.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/checks/checks.service.ts#L410)
*   **Issue:** `addCheckItem` defaults to `diningPrice` regardless of the check's type. This ignores pricing for Takeaway or Delivery check kinds.
*   **Fix:** Dynamically select the correct price field based on the check's `checkKindId` (1: `diningPrice`, 2: `deliveryPrice`, 3: `takeawayPrice`).

#### 6. Cashier Hijacking on Supervisor Override
*   **File:** [modules/checks/checks.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/checks/checks.service.ts#L115-L122)
*   **Issue:** If a supervisor overrides a cashier action (e.g. for comps or voids), the checks service updates the check's `cashierId` to the supervisor's ID. This ruins audit history and cashier drawer reconciliation.
*   **Fix:** Ensure supervisor ID overrides are stored in a dedicated `permitterId` or audit override column without modifying the primary checkout `cashierId`.

#### 7. Missing Zod Runtime Validation for Socket Payloads
*   **File:** [socket.server.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/sockets/socket.server.ts#L83-L215)
*   **Issue:** Web Socket controllers accept raw arguments from clients and access properties directly (e.g. `payload.items`) with zero runtime validation. A malformed socket message will crash the server process.
*   **Fix:** Import Zod schemas into `socket-contracts` and validate payloads using `schema.safeParse(data)` before executing handler code.

#### 8. Inconsistent Naming of Transaction Date
*   **File:** [checks.schema.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/packages/core-schemas/src/checks.schema.ts#L14)
*   **Issue:** The check schema uses `chkDate` instead of the mandatory `businessDate`. This breaks standard transaction consistency rules.
*   **Fix:** Rename `chkDate` to `businessDate` in the Zod schema and database models.

---

### 🔴 High Severity

#### 9. Dynamic MongoDB Connection String Parsing Failure
*   **File:** [connectionManager.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/cloud-backend/src/db/connectionManager.ts#L29-L31)
*   **Issue:** Dynamic tenant connection construction uses `new URL(env.GLOBAL_MONGO_URI)`. For multi-host MongoDB replica sets (like `mongodb://db1:27017,db2:27017/db` or `mongodb+srv://...`), `new URL()` fails, throwing a `TypeError` and crashing the server.
*   **Fix:** Parse the URI using regex or extract options using mongoose client config helpers to update paths safely.

#### 10. MongoDB Connection Leak / Exhaustion
*   **File:** [connectionManager.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/cloud-backend/src/db/connectionManager.ts#L22-L41)
*   **Issue:** Dynamically generated tenant connections are cached in a standard `Map` with no limit or eviction rules. Under high multi-tenant traffic, the server will quickly exhaust MongoDB's connection pool.
*   **Fix:** Replace the `Map` with an LRU cache or enforce a low `maxPoolSize` per connection (e.g. `maxPoolSize: 2`).

#### 11. Eager Print Count Lockout Bug
*   **File:** [modules/checks/checks.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/checks/checks.service.ts#L1009)
*   **Issue:** `printCount` is incremented in the database *before* attempting the socket connection to the physical network printer. If the print fails (out of paper, offline), the check is still marked as printed, requiring cashier override to reprint.
*   **Fix:** Only increment `printCount` on successful socket write acknowledgements.

#### 12. Blocking bcrypt Compare Loop in Supervisor PIN Verification
*   **File:** [modules/checks/checks.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/checks/checks.service.ts#L930-L935)
*   **Issue:** If no `supervisorId` is provided, the method loops through all users and runs `bcrypt.compareSync` (blocking CPU calls) to check PIN hashes, blocking the Express event loop.
*   **Fix:** Retrieve the user matching the PIN first (e.g. via unique pin if applicable, or query the db first) or use `bcrypt.compare` asynchronously.

#### 13. UI Sizing Violations on Key Interactive Targets
*   **File:** [PaymentDrawer.tsx](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-pos/src/components/pos-ordering/PaymentDrawer.tsx) and [FloorCanvas.tsx](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-pos/src/components/pos-floor-plan/FloorCanvas.tsx)
*   **Issue:** Buttons overlaying tables (clone, settings) are only `w-6 h-6` (24px). Payment quick cash keys, keypads, and drawer search elements are `h-9` to `h-11`. iPads require touch targets to be at least `64px` (`h-16`) to avoid mis-taps.
*   **Fix:** Enforce `h-16` or minimum `48px` with clear padding and scale transitions for targets on all touch dialogs.

#### 14. Missing Query Cache Invalidation on Mutations
*   **File:** [useChecksApi.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-pos/src/hooks/api/useChecksApi.ts#L112-L347)
*   **Issue:** Mutation hooks return raw mutations without registering `onSuccess` cache invalidations, forcing caller pages to manually invalidate. This duplicates code and leads to stale UI views if missed.
*   **Fix:** In hooks, use `onSuccess` handlers to automatically call `queryClient.invalidateQueries({ queryKey: ['openChecks'] })` etc.

#### 15. Form Schema Validation Bypass & Browser Alerts
*   **File:** [PaymentDrawer.tsx](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-pos/src/components/pos-ordering/PaymentDrawer.tsx#L274-L281)
*   **Issue:** All properties in `PaymentFormData` are optional. The form bypasses Zod checks, relying on manual JS checks inside the click handler that fire browser native `alert()` boxes.
*   **Fix:** Bind validation requirements strictly to the Zod schema, handle errors declaratively using React Hook Form's `errors` object, and use custom toast or dialog wrappers.

---

### 🟡 Medium Severity

#### 16. Missing Centralized Global Error Handler Middleware
*   **File:** [index.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/cloud-backend/src/index.ts)
*   **Issue:** Uncaught errors inside controllers escape to standard Express HTML stack dumps, leaking backend paths and breaking the standard `{ success: false, error: "message" }` format.
*   **Fix:** Append a centralized error handling middleware `(err, req, res, next)` at the bottom of the middleware stack.

#### 17. Unsafe Optional Field Assignments in Service Updates
*   **File:** [logs.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/cloud-backend/src/modules/logs/logs.service.ts#L21)
*   **Issue:** Unsafe assignments (e.g. `shiftId: log.shiftId`) of fields that can be `undefined` causes runtime schema violations or cast errors in MongoDB.
*   **Fix:** Fallback optional fields to `null` dynamically, e.g., `shiftId: log.shiftId || null`.

#### 18. Customer Mutation Churn (Address/Phone Re-insertions)
*   **File:** [delivery.service.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/delivery/delivery.service.ts#L285-L321)
*   **Issue:** When updating a customer, the backend deletes all existing addresses/phones and inserts new ones. This invalidates ID mappings on client terminals.
*   **Fix:** Perform a diff scan and execute targeted inserts, updates, and deletes (UPSERT-like flow).

#### 19. Open CORS Config on LAN Socket Server
*   **File:** [socket.server.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/sockets/socket.server.ts#L36-L40)
*   **Issue:** Combines wildcard origin (`'*'`) with `credentials: true`. This violates browser CORS specs and outputs warning errors on clients.
*   **Fix:** Match specific local subnets or check origins dynamically.

#### 20. Missing Delivery and Print Audit Trails
*   **Files:** [DeliveryOrder.tsx](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-pos/src/routes/pos/delivery/DeliveryOrder.tsx#L951) and printing routes
*   **Issue:** Delivery checkouts do not invoke the LAN `logAction` socket trigger. Similarly, takeaway and delivery print actions do not trigger `CHECK_PRINT` logs.
*   **Fix:** Add `logAction` calls at checkout and printing endpoints/handlers.

---

### 🟢 Low Severity

#### 21. Open-Ended Booleans on SQLite Models
*   **Files:** [db/schema.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/db/schema.ts) and Zod validation schemas
*   **Issue:** Boolean flags like `isActive` are stored as integers (`0` or `1`) but verified by Zod as raw open numbers, allowing inputs like `-12` or `999`.
*   **Fix:** Add Zod enum checks: `z.union([z.literal(0), z.literal(1)])`.

#### 22. Uncaught Web Socket Callback Exceptions
*   **File:** [socket.server.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/apps/branch-backend/src/modules/sockets/socket.server.ts)
*   **Issue:** Directly invokes socket callbacks `callback(...)` without checking if the client sent one, crashing the connection if missing.
*   **Fix:** Safe check: `if (callback) callback(...)`.

#### 23. Sticky Hover Highlights on iPad
*   **File:** [branch-pos] views
*   **Issue:** Mobile/iPad Safari renders tailwind `hover:` states as sticky clicks after release.
*   **Fix:** Enforce hover animations to only fire under true pointer media query scopes: `@media (hover: hover)`.

---

## 4. Gaps and Improvements
1.  **Strict Component File Limits (< 300 Lines)**:
    *   Large views (e.g. `CRMTab.tsx`, `PaymentDrawer.tsx`, `SplitCheckDialog.tsx`, `FloorPlan.tsx`) are monoliths with over 1,000 lines. They must be split into dedicated sub-components.
2.  **Missing Shift Model Schema**:
    *   `packages/core-schemas` does not contain a schema for the `Shift` model itself, leaving db shift transactions unvalidated.
3.  **Strict String Enforcements on Dates**:
    *   Enforce `businessDate` to YYYY-MM-DD pattern regex (`/^\d{4}-\d{2}-\d{2}$/`) and `createdAt` to ISO date-time format (`z.string().datetime()`).
4.  **Check Kinds Validation Constraints**:
    *   `checkKindId` should be constrained to `1: Dine-in`, `2: Delivery`, or `3: Takeaway` instead of allowing any number.
5.  **Disabled Sync Workers**:
    *   The sync worker for screen logs is commented out in `branch-backend` and should be enabled.

---

## 5. Phased Fix & Implementation Plan

### Phase 1: Core Schemas and Security (Days 1-2)
*   **Goal**: Ensure shared models are accurate and secure the APIs.
*   **Action Items**:
    1.  Rename `chkDate` to `businessDate` inside [checks.schema.ts](file:///D:/Projects/GoldenSoft%20Main%20Project/goldensoft-env/packages/core-schemas/src/checks.schema.ts) and apply formatting rules.
    2.  Add strict enums for `checkKindId` and integer bounds for booleans (`0` | `1`).
    3.  Create the `Shift` Zod model schema inside `shift.schema.ts`.
    4.  Apply `requireAuth` and authorization filters on all cloud Express routes.
    5.  Update MongoDB `connectionManager.ts` to support multi-host URIs and include an LRU connection cache eviction scheme.

### Phase 2: Branch Backend Logic & SQLite Fixes (Days 3-4)
*   **Goal**: Ensure database reliability and correct cashier computations.
*   **Action Items**:
    1.  Add `sqlite.pragma('busy_timeout = 5000')` to database managers.
    2.  Fix pricing dynamic selection in `checks.service.ts` based on `checkKindId`.
    3.  Correct property mappings (`total`, `discountPercent`) on the `batchCloseChecks` controller.
    4.  Prevent cashier hijacking in supervisor overrides.
    5.  Safely verify supervisor PINs using async bcrypt queries to prevent event loop blockages.

### Phase 3: POS UI Targets, Validation & Refactoring (Days 5-6)
*   **Goal**: Ensure touch compliance and refactor components to adhere to line limits.
*   **Action Items**:
    1.  Deconstruct `PaymentDrawer.tsx`, `FloorPlan.tsx`, and `CRMTab.tsx` into sub-components, dropping all files under 300 lines.
    2.  Replace browser native `alert()` and `confirm()` with custom dialog/toast alerts.
    3.  Configure `onSuccess` query invalidation inside custom API hooks (`useChecksApi.ts`).
    4.  Adjust Tailwind v4 color configurations to replace invalid suffixes with standard variables.

### Phase 4: Sync Engine & Audit Logs (Days 7-8)
*   **Goal**: Finalize offline synchronization pipeline and fill logging gaps.
*   **Action Items**:
    1.  Implement a local database listener/triggers to write to `sync_queue` on SQLite mutations.
    2.  Uncomment and hook up the screen logs sync workers.
    3.  Configure Socket.io sync handlers in `branch-backend` to dynamically push queue records.
    4.  Implement `logAction` triggers for delivery checkout, takeaway/delivery printing, and shift openings.
    5.  Add Zod schemas for Socket.io payload validation in `socket.server.ts`.
