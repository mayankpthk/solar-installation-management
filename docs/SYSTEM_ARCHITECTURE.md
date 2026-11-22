# SolarOS: System Architecture & Technical Design Specification
**System:** SolarOS — The Complete Solar Business Operating System  
**Framework:** Next.js (App Router) + TypeScript + Supabase PostgreSQL + Supabase Storage  
**Author:** Principal Software Architect & Cybersecurity Lead  
**Status:** Approved Architectural Baseline  

---

## 1. Architectural Philosophy & Core Tenets

SolarOS is designed as a mission-critical, enterprise-grade operating system for distributed rooftop solar operations. Its architecture is guided by six non-negotiable principles:

1. **Single Source of Truth (SSOT):** Business calculations (such as Bill of Materials generation, quotation pricing, warranty eligibility, and job profitability) reside strictly in single-purpose domain service modules. The frontend never computes prices, taxes, or BOM quantities; it merely displays server-validated state.
2. **ACID Transaction Boundaries:** Critical operations that bridge multiple entities (e.g., dispatching serialized inventory, confirming advance payments, converting quotes to orders) execute within atomic PostgreSQL transactions (`BEGIN...COMMIT`) or transactional RPCs. Failure at any sub-step rolls back the entire operation.
3. **Defense-in-Depth Security:** Authorization is enforced at three distinct layers:
   * Presentation: UI components trimmed via role capabilities.
   * Application Server: Next.js Server Actions and Route Handlers validated via authenticated session tokens and Zod schemas.
   * Database: Supabase PostgreSQL Row-Level Security (RLS) policies guaranteeing data isolation even if an application-level guard is bypassed.
4. **Idempotency by Design:** All mutating operations (order generation, barcode dispatch scans, payment captures) require unique idempotency keys or database-level uniqueness constraints to prevent duplicate processing from network retries or double clicks.
5. **Offline-Resilient Field Operations:** Mobile forms used by on-site technicians (site surveys and installation reports) cache data locally in browser IndexedDB, enabling uninterrupted data capture and photo staging in remote rooftop areas with poor cellular reception.
6. **Immutable Auditability:** System state changes are recorded in an append-only audit trail that logs the initiating user, timestamp, prior state, new state, and IP address.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer"]
        DesktopUI["Desktop Web Portal\n(Executive, Sales, Warehouse, Finance)"]
        MobilePWA["Field Mobile PWA\n(Survey & Installation Technicians)"]
        CustomerPortal["Customer Self-Service Portal\n(Quotes, Progress, Warranties, Tickets)"]
    end

    subgraph EdgeLayer ["Edge & Ingress Layer"]
        CDN["Vercel Edge Network / CDN"]
        AuthMiddleware["Next.js Route & Session Middleware\n(JWT Verification & RBAC Guards)"]
    end

    subgraph AppLayer ["Next.js Server Layer (Node.js Runtime)"]
        ServerActions["Next.js Server Actions\n(Form Submissions & Mutating Operations)"]
        RouteHandlers["API Route Handlers\n(REST Ingestion, Webhooks, Document Streaming)"]
        
        subgraph DomainServices ["Domain Business Logic Engines (SSOT)"]
            BOMEngine["Automated BOM Engine"]
            PricingEngine["Pricing & Tax Calculator"]
            WarrantyEngine["Warranty Activation & Verification Engine"]
            JobCostingEngine["Job Profitability & Labor Costing Engine"]
            SerialEngine["Serial Tracking & Dispatch Engine"]
        end
    end

    subgraph DataLayer ["Supabase Managed Cloud Infrastructure"]
        SupaAuth["Supabase Auth Service\n(GoTrue JWT, MFA, Role Claims)"]
        
        subgraph PostgresDB ["PostgreSQL 15 Database"]
            RLS["Row-Level Security (RLS) Engine"]
            Tables["Relational Schema (3NF)\n(Leads, Orders, Serials, Invoices, Tickets)"]
            Triggers["Triggers & Stored Procedures\n(Auto-Warranty, Audit Logging, Stock Balances)"]
            Locks["PostgreSQL Row Locks & Advisory Locks"]
        end
        
        SupaStorage["Supabase Object Storage (S3-Compatible)\n(Encrypted Buckets: Survey Photos, Signatures, Handover PDFs)"]
    end

    ClientLayer -->|HTTPS / TLS 1.3| CDN
    CDN --> AuthMiddleware
    AuthMiddleware --> ServerActions
    AuthMiddleware --> RouteHandlers
    
    ServerActions --> DomainServices
    RouteHandlers --> DomainServices
    
    DomainServices -->|pg / supabase-js client| PostgresDB
    DomainServices -->|Signed URL Uploads| SupaStorage
    ClientLayer -.->|Direct Auth Tokens| SupaAuth
    PostgresDB --- RLS
    PostgresDB --- Triggers
```

---

## 3. Layered Application Structure

The application codebase follows a clean, decoupled 5-tier architecture:

```
src/
├── app/                          # Next.js App Router (Routing & Presentation)
│   ├── (auth)/                   # Authentication flows (Login, Password Reset)
│   ├── (dashboard)/              # Role-specific operational interfaces
│   │   ├── executive/            # Executive KPI Dashboard & Profitability Heatmap
│   │   ├── sales/                # Leads, Surveys, Quotation Builder
│   │   ├── warehouse/            # Inventory, Serial Scanning, Dispatch
│   │   ├── field/                # Mobile-first Survey & Installation Wizards
│   │   ├── finance/              # Payments, Invoices, Subsidies, Job Costing
│   │   └── tickets/              # Service Tickets & Warranty Search
│   ├── (portal)/                 # Customer Self-Service Portal
│   └── api/                      # REST Route Handlers (Webhooks, File Exports)
│
├── components/                   # Reusable UI Components
│   ├── ui/                       # shadcn/ui primitives (Button, Dialog, Form, Card)
│   ├── shared/                   # Composite widgets (StatusPill, SignatureCanvas, PhotoUploader)
│   └── tables/                   # Data tables with filtering, sorting, and pagination
│
├── domain/                       # Core Business Logic Engines (Pure TypeScript, Zero Side-Effects)
│   ├── bom/                      # Capacity to BOM mapping formulas
│   ├── pricing/                  # Price calculations, GST bifurcations, subsidy deduction
│   ├── warranty/                 # Warranty duration resolution and validity checkers
│   ├── costing/                  # Job profitability and gross margin formulas
│   └── state-machines/           # Formal transition definitions and transition guards
│
├── server/                       # Server-Side Orchestration (Server Actions & DAL)
│   ├── actions/                  # Next.js Server Actions with Zod validation & auth guards
│   ├── db/                       # Supabase admin client and raw SQL transaction utilities
│   └── storage/                  # Supabase storage helpers (Presigned URL generators)
│
├── lib/                          # Shared cross-cutting utilities
│   ├── schemas/                  # Zod validation schemas (shared between client & server)
│   ├── types/                    # TypeScript interfaces and database type definitions
│   └── utils/                    # Formatting (currency, date, serial formatting)
```

---

## 4. Module Dependency Graph

The 20 modules interact under strict directional rules to prevent circular dependencies. Operations flow logically from Customer Intake $\to$ Engineering $\to$ Commerce $\to$ Logistics $\to$ Construction $\to$ Support $\to$ Finance:

```mermaid
flowchart LR
    M2["2. CRM & Leads"] --> M3["3. Site Survey"]
    M3 -->|Survey Approved| M5["5. Quotation & BOM"]
    M4["4. Product Config"] --> M5
    M5 -->|Accept + Advance| M6["6. Customer & Orders"]
    M6 --> M7["7. Payments & Invoices"]
    M6 --> M8["8. Inventory & Stock"]
    M6 --> M11["11. Tech Scheduling"]
    M8 --> M9["9. Serial Tracking"]
    M9 --> M10["10. Dispatch"]
    M10 -->|Delivery Confirmation| M14["14. Warranty Mgmt"]
    M10 --> M12["12. Installation Mgmt"]
    M11 --> M12
    M12 --> M13["13. Digital Reports"]
    M13 --> M16["16. Subsidy Tracking"]
    M14 --> M15["15. Service Tickets"]
    M7 --> M17["17. Financial Mgmt"]
    M12 -->|Labor Hours| M17
    M8 -->|Item Costs| M17
    M17 --> M1["1. Executive Dashboard"]
    M6 --> M1["1. Executive Dashboard"]
    M15 --> M1["1. Executive Dashboard"]
    M16 --> M1["1. Executive Dashboard"]
    
    subgraph CrossCutting ["Cross-Cutting Services"]
        M18["18. Analytics & Reports"]
        M19["19. Notifications Engine"]
        M20["20. Audit Logs & Settings"]
    end
    
    M6 -.-> M19
    M10 -.-> M19
    M13 -.-> M19
    M15 -.-> M19
    
    M6 -.-> M20
    M7 -.-> M20
    M9 -.-> M20
    M10 -.-> M20
```

---

## 5. Business State Machines & Transition Guards

### 5.1 Lead & Survey Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> NEW: Web Form / WhatsApp / Call
    NEW --> CONTACTED: Sales rep initiates phone call
    CONTACTED --> QUALIFIED: Met roof area, bill & grid criteria
    CONTACTED --> UNQUALIFIED: Insufficient roof / low bill
    QUALIFIED --> SURVEY_SCHEDULED: Tech & time slot assigned
    SURVEY_SCHEDULED --> SURVEY_IN_PROGRESS: Tech arrives on site
    SURVEY_IN_PROGRESS --> SURVEY_SUBMITTED: Photos & angles uploaded
    SURVEY_SUBMITTED --> SURVEY_APPROVED: Manager verifies feasibility
    SURVEY_SUBMITTED --> SURVEY_REJECTED: Obstructions / structural flaw
    SURVEY_REJECTED --> SURVEY_SCHEDULED: Re-assessment requested
    SURVEY_APPROVED --> [*]: Gate unlocked for Quotation
    UNQUALIFIED --> [*]
```
* **Guard Condition (Critical Gate):** The transition to Quotation Generation (`QUOTATION_DRAFT`) cannot execute unless `leads.survey_status == 'APPROVED'`.

### 5.2 Quotation & Order Lifecycle
```mermaid
stateDiagram-v2
    [*] --> QUOTE_DRAFT: BOM auto-generated
    QUOTE_DRAFT --> QUOTE_PENDING_APPROVAL: Custom discount requested (>5%)
    QUOTE_PENDING_APPROVAL --> QUOTE_APPROVED: Sales Manager approves
    QUOTE_DRAFT --> QUOTE_SENT: Standard price within threshold
    QUOTE_APPROVED --> QUOTE_SENT: Sent via Email/WhatsApp
    QUOTE_SENT --> QUOTE_ACCEPTED: Customer approves quotation
    QUOTE_SENT --> QUOTE_REJECTED: Customer declines
    QUOTE_SENT --> QUOTE_EXPIRED: 15-day timeout reached
    QUOTE_ACCEPTED --> ORDER_CONFIRMED: Advance payment recorded (>20%)
    ORDER_CONFIRMED --> [*]: Order routed to Warehouse & Scheduling
```
* **Guard Condition:** An Order cannot be placed in `CONFIRMED` status without either:
  1. A verified payment transaction covering $\ge$ default advance percentage, OR
  2. A director-level credit override logged with justification in audit logs.

### 5.3 Warehouse Dispatch & Serial Number Lifecycle
```mermaid
stateDiagram-v2
    [*] --> IN_STOCK: Purchase order received & tagged
    IN_STOCK --> RESERVED: Assigned to confirmed order
    RESERVED --> SCANNED_OUT: Barcode scanned at loading dock
    SCANNED_OUT --> DISPATCHED: Truck departs warehouse
    DISPATCHED --> DELIVERED: Crew receives materials on site
    DELIVERED --> INSTALLED: Commissioned & photographed
    DELIVERED --> RETURNED_UNUSED: Excess stock returned to warehouse
    INSTALLED --> DEFECTIVE: Service ticket diagnostics
    DEFECTIVE --> REPLACED: Replaced under warranty claim
    RETURNED_UNUSED --> IN_STOCK: Restocked after inspection
```
* **Critical Automated Trigger:** The transition of Dispatch to `DELIVERED` automatically inserts records into the `warranties` table for all associated serial numbers with:
  * `warranty_start_date = CURRENT_DATE`
  * `warranty_end_date = CURRENT_DATE + interval (sku.warranty_months)`

### 5.4 Installation & Commissioning Lifecycle
```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Crew assigned
    SCHEDULED --> CREW_EN_ROUTE: Tech checks in via mobile
    CREW_EN_ROUTE --> WORK_IN_PROGRESS: On-site work begins
    WORK_IN_PROGRESS --> TESTING_COMMISSIONING: Mechanical & electrical complete
    TESTING_COMMISSIONING --> REPORT_SUBMITTED: Live generation & photos captured
    REPORT_SUBMITTED --> CUSTOMER_SIGNED: Homeowner signs on tablet
    CUSTOMER_SIGNED --> COMPLETED: Final approval & handover PDF generated
```
* **Guard Condition:** Transition to `COMPLETED` requires all 5 mandatory installation photos to be uploaded and a valid touch-signature vector in the handover record.

### 5.5 Service Ticket & Warranty Decision Engine
```mermaid
stateDiagram-v2
    [*] --> TICKET_OPEN: Breakdown reported (Inverter fault)
    TICKET_OPEN --> SERIAL_SEARCH: Agent enters serial / customer phone
    
    state WarrantyCheck <<choice>>
    SERIAL_SEARCH --> WarrantyCheck: Query warranties table
    
    WarrantyCheck --> WARRANTY_ACTIVE: Current Date <= End Date
    WarrantyCheck --> WARRANTY_EXPIRED: Current Date > End Date
    
    WARRANTY_ACTIVE --> TECH_ASSIGNED_FREE: Billable Category = ₹0
    WARRANTY_EXPIRED --> TECH_ASSIGNED_BILLABLE: Billable Category = Standard Charges
    
    TECH_ASSIGNED_FREE --> REPAIR_IN_PROGRESS
    TECH_ASSIGNED_BILLABLE --> REPAIR_IN_PROGRESS
    
    REPAIR_IN_PROGRESS --> RESOLUTION_SUBMITTED: Issue fixed / part replaced
    RESOLUTION_SUBMITTED --> CUSTOMER_CONFIRMED: Customer verifies power output
    CUSTOMER_CONFIRMED --> TICKET_CLOSED: Ticket resolved
```

---

## 6. Offline-First Mobile Synchronization Architecture

Field technicians frequently operate on reinforced concrete rooftops or rural fringe areas with zero cell reception. The SolarOS Field Progressive Web App (PWA) implements a local-first offline synchronization pattern:

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Field Technician (Mobile PWA)
    participant PWA as Service Worker & UI
    participant IDB as Local IndexedDB
    participant Sync as Background Sync Engine
    participant Server as SolarOS API & Supabase

    Tech->>PWA: Opens Installation Work Order
    PWA->>IDB: Checks cached order & BOM details
    PWA-->>Tech: Displays offline-ready checklist
    
    Tech->>PWA: Takes photos & captures generation metrics
    Tech->>PWA: Obtains homeowner canvas signature
    PWA->>IDB: Stores payload in "pending_sync" store with UUID
    PWA-->>Tech: Shows "Saved Offline — Pending Sync"
    
    Note over PWA,Sync: Network connectivity restored (4G / WiFi)
    Sync->>Sync: Detects online event via navigator.onLine
    Sync->>IDB: Reads oldest pending work orders
    
    loop For each pending item
        Sync->>Server: POST /api/installation/sync (with Idempotency-Key)
        alt Upload Successful
            Server-->>Sync: 200 OK + Sync Acknowledgment
            Sync->>IDB: Mark record as SYNCED (delete from queue)
            Sync-->>Tech: Updates UI banner: "All data synchronized!"
        else Conflict / Validation Error
            Server-->>Sync: 409 Conflict / Error Details
            Sync->>IDB: Flag as REQUIRES_RESOLUTION
            Sync-->>Tech: Alert: "Review sync conflict"
        end
    end
```

### Photo Compression Pipeline Before Staging:
To prevent upload timeouts and preserve technician mobile bandwidth:
1. Photos captured via `<input type="file" capture="environment">` are intercepted by an in-browser HTML5 `<canvas>` compressor.
2. The image is resized to a maximum dimension of $1920 \times 1080$ pixels at 82% JPEG quality.
3. Metadata watermarking: The script draws a semi-transparent timestamp and GPS coordinate block onto the bottom-right corner of the canvas.
4. The resulting Blob ($\approx 350 \text{ KB}$ vs $4.5 \text{ MB}$ raw) is stored in IndexedDB as a binary record ready for background streaming.

---

## 7. Concurrency Control & Idempotency Safeguards

In high-throughput operations, duplicate orders or simultaneous double-dispatch of the same serial number create devastating warehouse inventory mismatches. SolarOS mitigates this using two explicit patterns:

### 7.1 Database Advisory Locks for Dispatch Operations
When a warehouse manager executes a dispatch operation, the system acquires an exclusive transaction-scoped advisory lock derived from the order ID:

```sql
-- Acquire transaction-level advisory lock
SELECT pg_advisory_xact_lock(hashtext('dispatch_' || p_order_id::text));

-- Inside this protected transaction block:
-- 1. Verify order status is still 'READY_FOR_DISPATCH'
-- 2. Validate all scanned serial numbers are currently 'IN_STOCK'
-- 3. Update serial statuses to 'DISPATCHED'
-- 4. Decrement warehouse stock balances
-- 5. Create dispatch consignment record
-- The lock is automatically released upon COMMIT or ROLLBACK.
```

### 7.2 Unique Hardware Assignment Constraints
A single physical inverter cannot exist on two roofs simultaneously. This invariant is enforced at the database layer via partial unique indexes:

```sql
-- Ensure an active serial number cannot be assigned to more than one active order
CREATE UNIQUE INDEX idx_unique_active_serial_assignment 
ON order_serial_assignments (serial_number_id) 
WHERE status IN ('RESERVED', 'DISPATCHED', 'INSTALLED');
```
Attempts to assign or dispatch an already-dispatched serial number are rejected instantly by the PostgreSQL engine with a constraint violation error (`23505`), completely eliminating race conditions.
