# SolarOS: Implementation Roadmap & Execution Strategy
**System:** SolarOS — The Complete Solar Business Operating System  
**Timeline:** Fast-Track Hackathon Sprint to Enterprise Production  
**Author:** Principal Software Architect & Product Strategist  
**Status:** Approved Architectural Baseline  

---

## 1. Phased Development Roadmap

The delivery plan is organized into 7 focused sprints. Each sprint yields a functional, testable milestone that maps directly to the operational scenarios of SunPower Solutions:

```
[Sprint 0: Foundation] ────► [Sprint 1: CRM & Survey] ────► [Sprint 2: BOM & Orders]
                                                                     │
[Sprint 5: Executive P&L] ◄── [Sprint 4: Warranty & Service] ◄─── [Sprint 3: Dispatch & Field]
         │
         ▼
[Sprint 6: Demo Seed & Polish] ───► PRODUCTION / HACKATHON JURY
``` `

---

### Sprint 0: Foundation, Architecture & Infrastructure (Day 1 - Hours 0 to 4)
* **Goal:** Initialize project workspace, TypeScript contracts, database migrations, authentication, and core UI shell.
* **Deliverables:**
  * Initialize Next.js 14+ (App Router) with TypeScript, Tailwind CSS, and shadcn/ui.
  * Execute Supabase PostgreSQL migration scripts (`schema.sql`, enums, tables, check constraints, foreign keys).
  * Configure Supabase Auth with custom role claims (`user_role_enum`) and session cookies.
  * Provision Supabase Storage buckets: `survey-photos`, `installation-photos`, `signatures`, `documents-vault`.
  * Establish shared Zod validation schemas (`src/lib/schemas/`) and database types (`src/lib/types/`).
  * Scaffold navigation layout with responsive sidebar and role-based route guard middleware.

---

### Sprint 1: Lead Intake & Engineering Survey Feasibility (Day 1 - Hours 4 to 8)
* **Goal:** Enable customer enquiry intake, telephonic qualification, and technical rooftop survey submission.
* **Maps to Problem Statement:** *Scene 1 (The Rooftop Inquiry).*
* **Deliverables:**
  * Public Lead capture form with instant validation (Address, PIN code, monthly bill, interested capacity).
  * Sales Executive qualification wizard (sanctioned load, grid type, shadow-free roof area).
  * Mobile-friendly Field Technician Survey Form (azimuth angle, tilt, roof type, cable runs).
  * Photo uploader with client-side canvas compression and watermarking (4 mandatory photos).
  * Manager Feasibility Review screen (`APPROVE` / `REJECT` with mandatory review comments).
  * **Hard Gate Verification:** Test that unapproved surveys strictly block quote generation.

---

### Sprint 2: Automated BOM Engine, Quotation & Order Conversion (Day 1 - Hours 8 to 14)
* **Goal:** Eliminate manual quoting errors; automatically compute parts, prices, taxes, and subsidies.
* **Maps to Problem Statement:** *Scene 2 (Getting the Kit Right).*
* **Deliverables:**
  * Master Catalog and BOM Template seed data (1 kW to 5 kW On-Grid & Off-Grid).
  * Automated BOM Resolution Service: computes exact panel counts, inverters, cables (with survey distance adjustment), stands, and safety parts.
  * Quotation Pricing Calculator: applies labor, logistics, 12% GST, and PM Surya Ghar subsidy deductions.
  * PDF Quotation Generator streaming branded PDF proposals.
  * Advance Payment recording modal with UTR duplicate checking.
  * Atomic Quotation-to-Order conversion with unique idempotency token.

---

### Sprint 3: Serial Dispatch, Mobile Installation & Auto-Warranty (Day 2 - Hours 14 to 20)
* **Goal:** Barcode scan dispatches, mobile installation sign-offs, and automated warranty clocks.
* **Maps to Problem Statement:** *Scene 3 (Dispatch Day & Serials) & Scene 4 (On the Roof).*
* **Deliverables:**
  * Warehouse Dispatch Interface: camera/barcode scanner validating serial numbers against BOM.
  * Delivery Confirmation endpoint triggering database trigger `trg_activate_warranty_on_delivery`.
  * Automatic Warranty Clock activation (2 years inverter/battery, 20 years panels).
  * Visual Technician Scheduling Calendar (conflict-free crew assignment).
  * Mobile Installation SOP Checklist and Live Generation Testing logger (DC V/A, AC V/kW).
  * HTML5 Canvas Digital Touch-Signature component for customer handover.
  * Tamper-evident Handover Certificate PDF generation.

---

### Sprint 4: Warranty Claims, Service Tickets & Subsidy Pipeline (Day 2 - Hours 20 to 26)
* **Goal:** Instant customer/serial lookup, warranty-aware ticket routing, and subsidy milestone tracking.
* **Maps to Problem Statement:** *Scene 5 (The Rainy Season Breakdown).*
* **Deliverables:**
  * Omnichannel Serial & Customer Instant Search bar (<250ms response time).
  * Deterministic Warranty Decision Engine: checks active warranty table; routes ticket to `WARRANTY_FREE` (₹0) or `BILLABLE`.
  * Service Ticket management board (`LOGGED` $\to$ `ASSIGNED` $\to$ `RESOLVED` $\to$ `CUSTOMER_CONFIRMED`).
  * Customer Confirmation OTP / sign-off step to close service tickets.
  * Government Subsidy Milestone Pipeline tracker (`DOCS_COLLECTED` $\to$ `PORTAL_SUBMITTED` $\to$ `DISBURSED`).

---

### Sprint 5: Executive P&L Dashboard, Job Costing & Audit Logs (Day 2 - Hours 26 to 30)
* **Goal:** Provide executive visibility into real-time installation margins, stock valuation, and auditability.
* **Maps to Problem Statement:** *Scene 6 (The Director's Month-End).*
* **Deliverables:**
  * Executive KPI Cards: Total Revenue, Gross Margin %, Active Installs, Inventory Value, Open Repairs.
  * Automated Job Costing Engine: Computes Net Profit per installation ($\text{Revenue} - [\text{BOM Cost} + \text{Labor Cost} + \text{Logistics}]$).
  * Job Profitability Heatmap (Green >20%, Amber 10-20%, Red <10% margin).
  * Shareable / exportable financial summary (CSV, PDF).
  * Immutable Audit Log viewer filtering by user, table, and date.

---

### Sprint 6: Realistic Seed Dataset, E2E Testing & Jury Polish (Day 2 - Hours 30 to 36)
* **Goal:** Populate the system with realistic SunPower Solutions operational data, verify E2E flows, and polish UI.
* **Deliverables:**
  * Comprehensive Database Seed Script:
    * 15 Technicians with realistic skill profiles and hourly wages.
    * 40 monthly installations across varying stages (leads, surveys, active installs, commissioned jobs).
    * Serialized inventory pool with realistic serial numbers and barcodes.
    * 5 historical breakdown service tickets (showing both in-warranty ₹0 and out-of-warranty billable repairs).
    * Active subsidy applications across all 7 milestone states.
  * Run Playwright E2E test suite across all 5 journeys.
  * Clean presentation deck, architecture diagram posters, and interactive demo script.

---

## 2. Key Architectural Decisions & Rationales

1. **Next.js Server Actions vs. Dedicated Express/NestJS Backend:**
   * *Decision:* Utilize Next.js 14+ App Router Server Actions for mutating operations and Route Handlers for file streaming and webhooks.
   * *Rationale:* Eliminates backend/frontend type drift, shares Zod schemas directly across the network boundary, reduces operational hosting complexity, and provides sub-second response times.
2. **Supabase PostgreSQL & Native Row-Level Security (RLS):**
   * *Decision:* Deploy PostgreSQL on Supabase with native RLS policies, custom enum types, and triggers.
   * *Rationale:* Enforces role boundaries at the data storage layer. Even if an application bug exists, users cannot query or mutate records outside their authorized tenancy or role scope.
3. **Trigger-Based Automated Warranty Clock:**
   * *Decision:* Activate warranties via an asynchronous database trigger on `dispatches.delivery_status = 'DELIVERED'` rather than relying on application code.
   * *Rationale:* Guarantees that no delivery can ever occur without immediately starting the warranty clock, completely eliminating the human error of forgotten warranty entries.
4. **Client-Side Canvas Image Compression:**
   * *Decision:* Compress all field photos in browser memory before uploading.
   * *Rationale:* Rooftop solar sites often have weak 2G/3G/4G connectivity. Shrinking 4.5 MB mobile photos to ~350 KB JPEG files with watermarks prevents failed uploads and cuts latency by 90%.

---

## 3. Unresolved Questions & Configurable Defaults

To preserve engineering velocity without making risky assumptions, SolarOS treats ambiguous business parameters as configurable settings in the `system_settings` table:

| Ambiguous Business Parameter | Industry Standard Default Configured | Customization Mechanism |
| :--- | :--- | :--- |
| **Minimum Advance Payment Required** | $20\%$ of Net Payable Contract Value | Stored in `system_settings('min_advance_percent')`; adjustable by Director. |
| **Government Subsidy Slab Formula** | PM Surya Ghar Scheme (₹30k for 1kW, ₹60k for 2kW, ₹78k for 3-5kW) | Configurable JSON table in `system_settings('subsidy_slabs')`. |
| **Default Warranty Periods** | Panels: 240 months; Inverter: 24 months; Battery: 24 months; Workmanship: 12 months | Set per SKU in `items.default_warranty_months`. |
| **Technician Hourly Internal Wage** | ₹150 to ₹300 / hour depending on seniority | Stored in `user_profiles.hourly_rate`; used strictly for internal job costing. |
| **GST / Tax Treatment** | 12% composite rate on solar systems | Configurable in `system_settings('gst_solar_system_rate')`. |
| **Discom Inspection Schedulers** | Manual milestone confirmation (No automated government API) | Document upload & date confirmation workflow (no fake third-party API mocks). |

---

## 4. Hackathon Demo Walkthrough Sequence

For presentation to hackathon judges, the live demonstration should follow this 6-step narrative:

1. **Step 1 (The Inquiry):** Open customer landing page on mobile view. Submit 3 kW solar inquiry. Show instant appearance on Sales CRM board.
2. **Step 2 (The Gate):** Attempt to generate a quote immediately. Show system **blocking** quote because survey is missing. Open Survey Tech view, enter roof angles (Azimuth South, 28° tilt), upload roof photos, approve survey.
3. **Step 3 (The Kit):** Click "Generate Quote". Show the Automated BOM resolving exact 6 panels, 3 kW inverter, earthing rods, and custom wire lengths. View branded PDF with PM Surya Ghar subsidy deduction.
4. **Step 4 (The Warehouse & Truck):** Record advance payment. Switch to Warehouse view. Scan inverter barcode (`INV-2026-9912`). Dispatch truck. Show delivery confirmation instantly starting the 24-month warranty clock.
5. **Step 5 (The Roof Handover):** Switch to Field Technician mobile view. Complete SOP checklist, log generation power (2.85 kW AC), capture customer on-screen signature. Instantly download the official Handover Certificate.
6. **Step 6 (The Director's P&L):** Open Director Executive Dashboard. Show the newly completed installation on the Job Profitability Heatmap: Revenue ₹100,640 vs. BOM Cost ₹62,000 + Labor ₹3,200 + Logistics ₹2,500 = **Net Profit ₹32,940 (32.7% margin)**.
