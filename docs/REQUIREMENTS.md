# SolarOS: Business Requirements & Operational Specification
**System:** SolarOS — The Complete Solar Business Operating System  
**Client / Target Enterprise:** SunPower Solutions  
**Scale:** ~40 rooftop solar installations/month, 15 field technicians, residential & commercial (1 kW to 5 kW On-Grid & Off-Grid)  
**Author:** Principal Software Architect & Product Strategist  
**Status:** Approved Architectural Baseline  

---

## 1. Executive Summary & Problem Context

### 1.1 The Enterprise: SunPower Solutions
SunPower Solutions is a fast-growing rooftop solar engineering, procurement, and construction (EPC) company. The business operates in the high-velocity distributed clean-energy sector, completing approximately **40 residential and small-commercial rooftop projects per month** with an active field workforce of **15 multi-skilled technicians**.

### 1.2 Core Product Portfolio
1. **Solar Panel Set (Hardware Only):** Photovoltaic solar panels (mono-PERC / TOPCon 540W–550W), UV-resistant DC solar cables, MC4 connectors, mounting hardware.
2. **On-Grid Systems (1 kW to 5 kW):** Grid-tied string inverters (converting DC to AC), AC/DC distribution boxes (ACDB/DCDB), solar charge controllers/isolators, lightning arrestors, safety earthing kits (chemical electrodes, copper bonded rods), heavy-duty galvanized iron (GI) / aluminum elevated roof mounting stands.
3. **Off-Grid Systems (1 kW to 5 kW):** Full On-Grid hardware specification augmented by a battery energy storage system (BESS) — deep-cycle lead-acid tubular or lithium iron phosphate (LiFePO4) battery banks — providing standalone off-grid backup.
4. **Turnkey Installation Service:** Complete on-site structural mechanical assembly, electrical wiring, inverter synchronization, earthing resistance testing, discom net-metering readiness testing, and client handover.

### 1.3 The Core Operational Failures (Current State)
SunPower Solutions has reached the breaking point of manual and semi-digital communication tools (WhatsApp groups, phone calls, paper logbooks, and Excel sheets):
* **Lead Leakage:** Enquiries originating across WhatsApp, phone calls, walk-ins, and website landing pages get buried or lost; response times exceed 48 hours.
* **Flawed Quotations & Inventory Shortages:** Quotations are hand-typed from scratch. Sales reps regularly forget essential balance-of-system (BOS) components (e.g., earthing rods, DC surge protectors, cable ties). Trucks arrive at client sites missing critical hardware, halting work.
* **Untracked High-Value Serial Numbers:** ₹1,50,000+ worth of inverters and batteries leave the warehouse recorded on loose paper sheets. By the time an inverter fails 18 months later, serial number provenance is lost, rendering manufacturer warranty claims impossible.
* **Fragmented Site Data:** Survey dimensions, roof azimuth angles, tilt angles, and completion sign-offs reside on personal phones of technicians. Disputes arise over installation quality with no verifiable proof.
* **Financial Blindness:** The business director cannot determine job-level profitability. With scattered advance payments, untracked technician wage hours, and stalled government subsidies, cash flow is constantly precarious.

### 1.4 The SolarOS Vision
SolarOS replaces this chaos with a unified, auditable, transaction-safe digital operating system. It orchestrates the entire customer journey: from the first rooftop enquiry, through engineering roof surveys, automated Bill of Materials (BOM) quotations, warehouse barcode dispatch, GPS-verified mobile installation sign-offs, automated warranty lifecycle clocks, long-term breakdown service tickets, to subsidy disbursement and job-level financial profitability.

---

## 2. Problem Statement Traceability Matrix

Every operational scenario documented in the official problem statement (`Solar_Installation_Management_System.pdf`) maps directly to functional modules and automated business rules in SolarOS:

| Scenario / Section in PDF | Real-World Operational Challenge | SolarOS Module & Automated Mechanism |
| :--- | :--- | :--- |
| **Scene 1: The Rooftop Inquiry** | Web lead lands; salesperson must verify shadow-free area, monthly electricity bill, grid suitability; tech measures roof direction, tilt, cable run; quote blocked until survey approved. | **CRM (Module 2) + Site Survey (Module 3)**<br>• Real-time lead capture webhook & queue.<br>• Telephonic pre-qualification checklist.<br>• Survey dispatch with mobile angle/compass inputs.<br>• **Enforced Hard Gate:** Quotation engine strictly blocks quote generation until survey status = `APPROVED`. |
| **Scene 2: Getting the Kit Right** | Customer confirms capacity (e.g., 3 kW); quote auto-computes exact parts from template; advance payment triggers automated warehouse pick-list and calendar crew dispatch. | **Product Config (Module 4) + Quotation/BOM (Module 5) + Orders (Module 6) + Scheduling (Module 11)**<br>• Dynamic BOM generator calculates panels, inverter, wire length, breakers, earthing kit based on capacity & grid type.<br>• Order creation requires recorded advance payment (or credit override).<br>• Automatic webhook creates warehouse pick-list and schedules crew in calendar. |
| **Scene 3: Dispatch Day & Serial Numbers** | Truck leaves with ₹1,50,000 inventory; every high-value unit (inverter, battery, charge controller) must be scanned; auto-start warranty clock upon delivery. | **Inventory (Module 8) + Serial Management (Module 9) + Dispatch (Module 10) + Warranty (Module 14)**<br>• Camera/barcode scanning enforces exact serial matching on dispatch.<br>• Double-allocation prevention via DB constraints.<br>• Delivery confirmation event initiates automated warranty clocks (e.g., Inverter: 2 yrs, Battery: 2 yrs, Panels: 20 yrs). |
| **Scene 4: On the Roof** | Crew fits stands, panels, earthing, conducts power generation test, logs start/finish times, uploads photos, captures customer digital signature. | **Installation (Module 12) + Digital Reports (Module 13)**<br>• Mobile-optimized field technician wizard.<br>• Offline-resilient photo upload with GPS & timestamp watermark.<br>• Live generation power verification recording (kW / Volts / Amps).<br>• Digital canvas touch-signature with customer verification. |
| **Scene 5: The Rainy Season Breakdown** | 18 months post-install, inverter displays error code; instant serial search; auto-check active warranty; ₹0 repair if valid, auto-invoice parts/labor if expired. | **Warranty (Module 14) + Service Tickets (Module 15) + Invoicing (Module 7)**<br>• Instant search by customer phone, name, or inverter serial.<br>• Deterministic warranty decision engine: Active = ₹0 billable; Expired = generates labor & replacement parts invoice.<br>• Ticket resolution gated by customer confirmation. |
| **Scene 6: The Director's Month-End** | Director needs visibility on job-level profitability (margin per install), advance payments, stock valuation, technician pay, subsidy status, open repairs. | **Executive Dashboard (Module 1) + Financials (Module 17) + Analytics (Module 18) + Subsidies (Module 16)**<br>• Real-time Job Costing Engine (Revenue vs. BOM Cost + Labor Hours + Transport).<br>• Government subsidy milestone tracker (Discom/portal integration tracking).<br>• Multi-dimensional operational and financial reports exportable to PDF/Excel. |

---

## 3. User Roles & Role-Based Access Control (RBAC) Matrix

SolarOS supports 10 distinct, non-overlapping roles with server-enforced permissions and Supabase Row-Level Security (RLS):

### 3.1 Role Definitions
1. **Super Admin:** System platform administrator. Manages tenants, role delegations, global system configurations, database maintenance, and security audit logs.
2. **Company Owner / Director:** Executive leadership. Full visibility into financials, job margins, P&L, employee productivity, inventory health, and strategic reporting.
3. **Sales Manager:** Leads sales pipeline, manages lead assignments, sets margin thresholds, approves custom quotation discounts, monitors sales conversion rates.
4. **Sales Executive:** Interacts with leads, conducts qualification calls, coordinates site surveys, builds quotes using approved BOM templates, follows up for customer advance payments.
5. **Survey Technician:** Specialized field engineer who conducts technical rooftop feasibility assessments, records orientation, tilt, structural integrity, and shading analysis.
6. **Warehouse Manager:** Owns inventory health, oversees purchase orders, receipts, warehouse stock levels, barcode/serial number registration, staging, and dispatch scanning.
7. **Installation Manager:** Oversees project execution, assigns multi-technician crews, coordinates vehicle logistics, audits field reports, and signs off on commissioned systems.
8. **Field Technician:** Operates on-site via mobile device. Executes installation steps, uploads timestamped photographic evidence, logs hours, and obtains customer signatures.
9. **Finance Manager:** Controls cash inflows and outflows, records customer payments, handles tax/GST invoices, tracks technician wage disbursements, and audits government subsidy payouts.
10. **Customer (Portal User):** External client. Accesses self-service portal to review quotation, sign contract, view order status, inspect installation certificates, download invoices, track subsidy progress, and file service tickets.

### 3.2 Granular RBAC Permission Matrix

| Module / Resource | Super Admin | Director | Sales Mgr | Sales Exec | Survey Tech | Warehouse Mgr | Install Mgr | Field Tech | Finance Mgr | Customer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Executive Dashboard** | Full | Full | Read (Sales) | None | None | Read (Stock) | Read (Ops) | None | Read (Fin) | None |
| **2. CRM & Leads** | Full | Full | Full | Assigned/Team | View Assoc. | None | View Won | None | View Fin. | Self (Submit) |
| **3. Site Survey** | Full | Full | Read/Assign | Read/Request | Assigned (RW)| None | Read | Read | None | Read Self |
| **4. Product & BOM Config**| Full | Full | Read/Propose | Read-only | None | Update Stock | Read-only | None | Read Costing| None |
| **5. Quotation Engine** | Full | Full | Full/Approve | Create/Send | None | None | None | None | Read Fin. | View/Accept |
| **6. Orders & Customers** | Full | Full | Full | Read/Create | None | Read Details | Read Details | Read Assigned| Read/Invoice | View Self |
| **7. Payments & Invoices** | Full | Full | Read-only | View Status | None | None | None | None | Full | View/Pay Self |
| **8. Inventory & Stock** | Full | Full | Read Levels | Read Levels | None | Full | Read Levels | Request Part| Read Value | None |
| **9. Serial Numbers** | Full | Full | Read | Read | Read | Full (Scan/In)| Read | Read/Scan | Read | View Self Units|
| **10. Dispatch Orders** | Full | Full | Read | Read | None | Full (Dispatch)| Read | View Deliver | Read | View Delivery |
| **11. Tech Scheduling** | Full | Full | Read | Read | View Self | Read Logistics| Full | View Self | None | View Timeline |
| **12. Installation Mgmt** | Full | Full | Read Status | Read Status | None | Read Status | Full | Update Assign | Read Status | View Progress |
| **13. Digital Reports** | Full | Full | Read | Read | None | Read | Full/Approve | Submit/Sign | Read | Sign/Download |
| **14. Warranty Mgmt** | Full | Full | Read | Read | None | Read | Read | Read | Read | View Self |
| **15. Service Tickets** | Full | Full | Read/Escalate| Read/Log | Assigned | Read Parts | Assign/Manage| Assigned (RW)| Invoice Exp. | Create/Confirm |
| **16. Subsidy Tracking** | Full | Full | Read Status | Read/Submit | Read Tech Docs| None | Read Docs | None | Full Manage | View Progress |
| **17. Financial Mgmt** | Full | Full | None | None | None | None | None | None | Full | None |
| **18. Analytics & Reports** | Full | Full | Sales Reports| Personal Rep. | None | Stock Reports | Ops Reports | None | Fin. Reports | None |
| **19. Notifications** | Full | Full | Role Stream | Role Stream | Push Mobile | Push Mobile | Push Mobile | Push Mobile | Role Stream | Email/Portal |
| **20. Audit Logs & System**| Full | View Audit | None | None | None | None | None | None | View Fin Audit| None |

*Legend: `Full` = Create, Read, Update, Delete, Export; `RW` = Read, Write; `None` = No access.*

---

## 4. Comprehensive Functional Requirements (Modules 1 to 20)

### Module 1: Executive Dashboard
* **FR-1.1:** Real-time KPI summaries: Total Revenue, Gross Profit Margin, Net Cash Inflow, Active Installations, Inventory Total Valuation, Pending Subsidies, Open Service Tickets.
* **FR-1.2:** Time-window slicing: Today, This Week, This Month, Quarter-to-Date, Custom Date Range.
* **FR-1.3:** Job Profitability Heatmap: Interactive list of recently completed installations displaying Quoted Price vs. Actual Cost Breakdown (Hardware + Labor + Transport) with net margin % and indicator (Green >20%, Amber 10-20%, Red <10%).
* **FR-1.4:** Bottleneck Radar: Alerts indicating orders stuck in survey, pending advance payment, dispatch delayed due to stock shortage, or stalled subsidies >30 days.

### Module 2: CRM and Lead Management
* **FR-2.1:** Omnichannel ingestion: REST API endpoint for website contact forms, WhatsApp Business webhook integration hook, manual walk-in/telephonic entry form.
* **FR-2.2:** Customer profile capture: Full Name, Primary Phone (validated E.164), Alternate Phone, Email, Physical Address, PIN/Postal Code, Geo-coordinates (auto-derived via address lookup).
* **FR-2.3:** Qualification Survey Call Form:
  * Estimated monthly electricity bill (₹ amount and kWh units).
  * Consumer connection type (Residential Single-Phase, Residential Three-Phase, Commercial/Industrial).
  * Approximate shadow-free rooftop area (sq ft / sq m).
  * Existing electricity provider / Discom name and consumer account number.
  * Customer interest: On-Grid vs. Off-Grid, interested in government subsidy (Yes/No).
* **FR-2.4:** Lead state machine: `NEW` -> `CONTACTED` -> `QUALIFIED` -> `SURVEY_SCHEDULED` -> `LOST`. Leads cannot be marked `QUALIFIED` without completing mandatory pre-qualification questions.

### Module 3: Site Survey Management
* **FR-3.1:** Survey scheduling & assignment: Sales Executive or Manager assigns lead to an available Survey Technician with appointment date/time slot.
* **FR-3.2:** Mobile Survey Data Entry:
  * Roof Orientation / Azimuth: Compass direction (North, South, East, West, South-East, South-West).
  * Roof Tilt Angle (measured in degrees, 0° to 45°).
  * Usable Shadow-Free Roof Area (measured precisely in square feet).
  * Roof Surface Type: Concrete RCC flat, Sloped clay tile, Corrugated GI tin sheet, Asbestos, Ground mount.
  * Shading Obstacles: Water tanks, parapet walls, adjacent trees, mobile towers (with directional notes).
  * Cable Run Distance (DC cable run from panels to inverter; AC cable run from inverter to main switchboard/meter).
  * Structural integrity rating: Good, Needs reinforcement, Unsuitable.
* **FR-3.3:** Photo attachment requirements: Minimum 4 photos required before submission: (1) Full roof panoramic view, (2) Electrical meter board, (3) Proposed inverter mounting wall, (4) Proposed earthing location.
* **FR-3.4:** Survey Review & Approval: Survey must be marked `APPROVED` by Sales Manager or Installation Manager. Rejection requires mandatory explanation comment and triggers re-survey notification.

### Module 4: Solar Product Configuration & Catalog
* **FR-4.1:** Hierarchical product definition:
  * Categories: Solar PV Panels, Inverters, Battery Banks, Structure & Mounting, Balance of System (Electrical), Services.
  * Standard Capacities: 1 kW, 2 kW, 3 kW, 4 kW, 5 kW, Custom.
  * System Topologies: On-Grid (Grid-tied), Off-Grid (Battery backup), Hybrid (optional future-proof).
* **FR-4.2:** Master Item Catalog:
  * Item Code / SKU, Name, Description, Unit of Measure (Pieces, Meters, Sets, Rolls).
  * Is_Serial_Tracked flag: Boolean (`true` for inverters, batteries, charge controllers, solar panel lots).
  * Default Unit Cost (Procurement) and Base Selling Price.
  * Manufacturer Warranty duration (months) per SKU category (e.g., Panels: 240 months; Inverter: 24 months; Battery: 24 months).
* **FR-4.3:** Default Master BOM Templates:
  * Configuration table pre-populating required parts for each capacity and system type combination (e.g., "3 kW On-Grid" = 6x 540W Mono-PERC panels, 1x 3kW On-Grid string inverter, 1x ACDB, 1x DCDB, 40m 4sqmm DC cable, 20m 6sqmm AC cable, 2x Chemical Earthing Rods, 1x 3kW GI structure set).

### Module 5: Quotation and Automatic Bill of Materials (BOM)
* **FR-5.1: The Survey Gate:** Server strictly rejects quote generation attempts for a customer whose site survey is missing or not in `APPROVED` status.
* **FR-5.2: Automatic BOM Resolution:** Selecting a system capacity (e.g., 3 kW) and topology (e.g., On-Grid) automatically resolves the complete, itemized Bill of Materials with quantities pre-calculated based on survey cable distance.
* **FR-5.3: Pricing Calculator:**
  * Base Equipment Cost (sum of BOM item base prices).
  * Installation & Commissioning Labor Charge (flat or per-kW configurable).
  * Transportation & Logistic surcharge.
  * Applicable Taxes / GST (e.g., 12% on solar systems or bifurcated 12%/18%).
  * Government Subsidy deduction calculation (e.g., PM Surya Ghar Muft Bijli Yojana slab calculation: fixed ₹ amount per kW up to 3 kW).
  * Net Payable by Customer calculation.
* **FR-5.4: PDF Generation:** Dynamic branded PDF generation containing technical specifications, itemized equipment overview, warranty summary, payment terms, and formal acceptance clause.
* **FR-5.5: Versioning & Expiry:** Quotations maintain version numbers (e.g., Q-10042-V1) and automatic expiry dates (default 15 days).

### Module 6: Customer and Order Management
* **FR-6.1: Order Creation:** Triggered upon customer formal acceptance and receipt of the mandatory advance payment.
* **FR-6.2: Anti-Duplicate Safeguard:** Order creation is wrapped in a strict database transaction using an idempotency token generated from the quotation ID. A quotation can only ever transition to an order once.
* **FR-6.3: Customer Unified Profile:** Centralized 360-degree view containing customer contact info, property coordinates, historical survey, active quotations, sales order, dispatch slips, installation report, active warranties, and service tickets.

### Module 7: Payments and Invoicing
* **FR-7.1: Milestone Payment Structure:**
  * Milestone 1: Booking Advance (typically 20% to 50% upon quotation acceptance).
  * Milestone 2: Pre-Dispatch Payment (e.g., 40% before materials leave warehouse).
  * Milestone 3: Final Handover Balance (e.g., 10% after physical commissioning & customer sign-off).
* **FR-7.2: Invoice Management:** Generates Proforma Invoice, Tax Invoice (with GSTIN, HSN codes), and Service Invoices (for out-of-warranty repairs).
* **FR-7.3: Payment Recording:** Supports manual recording with payment mode (Bank Transfer / NEFT / IMPS, UPI, Cheque, Cash), transaction reference / UTR number, receipt timestamp, and payment receipt upload.
* **FR-7.4: Financial Idempotency:** Duplicate payment entries with identical transaction reference numbers are rejected by a unique database constraint.

### Module 8: Inventory and Warehouse Management
* **FR-8.1: Multi-Location Support:** Main Warehouse, In-Transit Van/Truck Stock, Scrap/Damaged Stock.
* **FR-8.2: Real-Time Stock Tracking:** Accurate tracking of Quantity on Hand, Quantity Reserved for Approved Orders, Quantity In-Transit, and Net Available Stock.
* **FR-8.3: Stock Picking Lists:** When an order is confirmed, an automated Pick List is generated for the warehouse team matching the exact order BOM.
* **FR-8.4: Low-Stock Threshold Alerts:** Automatic alerts when safety stock levels breach minimum thresholds (e.g., Inverters < 5 units, Earthing Kits < 10 sets).

### Module 9: Serial Number Management
* **FR-9.1: Mandatory Serial Item Tracking:** Every inverter, battery, charge controller, and solar panel lot must possess a globally unique serial number in the database.
* **FR-9.2: Inbound Registration:** Serial numbers enter inventory via supplier purchase receipt scanning (barcode/QR camera scanning or bulk CSV upload).
* **FR-9.3: State Tracking:** Serial number statuses: `IN_STOCK`, `RESERVED`, `DISPATCHED`, `INSTALLED`, `RETURNED_DEFECTIVE`, `REPLACED`.
* **FR-9.4: Anti-Duplicate Guarantee:** Serial numbers are enforced by a database `UNIQUE` constraint. A serial number currently `DISPATCHED` or `INSTALLED` cannot be assigned to another order or dispatched twice.

### Module 10: Dispatch Management
* **FR-10.1: Staging & Barcode Verification:** Before materials leave the warehouse, the warehouse staff must scan the barcode/QR code of each serial-tracked item against the order BOM. The system will prevent dispatch closure if scanned serial numbers do not match the required BOM items.
* **FR-10.2: Non-Serialized BOS Packing Check:** Checkbox verification for bulk items (cables, stands, earthing rods, fasteners) before truck departure.
* **FR-10.3: Vehicle & Driver Allocation:** Captures vehicle registration number, driver name, technician receiving custodian, and estimated arrival time.
* **FR-10.4: Dispatch Event Trigger:** Marking dispatch as `DELIVERED_ON_SITE` triggers the automatic initiation of all equipment warranties linked to the order's scanned serial numbers.

### Module 11: Technician Scheduling
* **FR-11.1: Visual Crew Calendar:** Drag-and-drop interactive dispatch calendar for 15 technicians, showing team allocations, travel times, and job statuses.
* **FR-11.2: Skill-Based Allocation:** Lead technicians assigned based on installation complexity (e.g., 5 kW Three-Phase vs. 1 kW Single-Phase; Off-Grid BESS certified).
* **FR-11.3: Conflict Prevention:** Prevents double-booking a technician for overlapping time slots.
* **FR-11.4: Push Notifications & Schedule Visibility:** Technicians view their upcoming daily and weekly assignments on their mobile interface without manual telephone coordination.

### Module 12: Installation Management
* **FR-12.1: On-Site Digital Checklist:** Standard Operating Procedure (SOP) milestone tracking:
  1. Structure assembly and roof anchoring.
  2. Solar panel mounting & string clamping.
  3. DC cabling, conduit routing, and DCDB wiring.
  4. Inverter wall mounting & ACDB connection.
  5. Chemical earthing pit installation and resistance test (Ohms).
  6. Discom net-metering synchronization / testing.
* **FR-12.2: Live Power Generation Commissioning:** Technicians must test and record live electrical generation values before final sign-off: Inverter DC Input Voltage (V), DC Current (A), AC Output Voltage (V), Instantaneous AC Power Output (kW).

### Module 13: Digital Installation Reports & Handover
* **FR-13.1: Mobile Work Order Completion Form:** Responsive web form capturing job start timestamp, job completion timestamp, final installed capacity, and technician crew notes.
* **FR-13.2: Photo Evidence Mandate:** Mandatory photo uploads with client metadata:
  * (1) Wide-angle roof layout showing installed panel array.
  * (2) Inverter installation showing cable glanding and labeling.
  * (3) ACDB / DCDB breaker wiring interior.
  * (4) Earthing pit and electrode connection.
  * (5) Generation reading displayed on inverter LCD/meter.
* **FR-13.3: Digital On-Screen Signature:** HTML5 canvas module enabling the homeowner to review installation details and sign on-screen using finger or stylus.
* **FR-13.4: Automated Handover Certificate:** Generates an official, tamper-evident Handover Certificate PDF emailed directly to the customer and archived in the order history.

### Module 14: Warranty Management
* **FR-14.1: Automated Warranty Start:** The warranty clock starts automatically upon dispatch delivery completion.
* **FR-14.2: Component-Specific Durations:** Default configurable durations:
  * Inverters: 24 months (2 years).
  * Batteries: 24 months (2 years).
  * Solar PV Modules: 240 months (20 years) performance warranty.
  * Installation Labor Warranty: 12 months (1 year).
* **FR-14.3: Digital Warranty Card:** Accessible to both the customer in their portal and the support team, displaying itemized components, serial numbers, activation dates, and exact expiry dates.
* **FR-14.4: Instant Search:** Searchable by Customer Phone Number, Customer Name, Order ID, or Hardware Serial Number within <1 second.

### Module 15: Service Ticket Management
* **FR-15.1: Ticket Logging:** Created via customer portal, incoming phone call, or WhatsApp support intake. Captures breakdown symptoms, inverter error codes (e.g., E04, Fault Grid Overvoltage), and photos of inverter display.
* **FR-15.2: Automatic Warranty Verification Engine:**
  * When a ticket is created, the system checks the active warranty table for the affected serial number.
  * **If Warranty ACTIVE:** Sets ticket billing classification to `WARRANTY_COVERED` (Replacement parts = ₹0, technician labor = ₹0).
  * **If Warranty EXPIRED:** Sets ticket billing classification to `BILLABLE`. Automatically attaches standard service visit charges and initiates an out-of-warranty quotation/invoice upon technician parts diagnosis.
* **FR-15.3: Ticket Lifecycle:** `LOGGED` -> `ASSIGNED` -> `TECHNICIAN_VISITED` -> `PARTS_STAGED` -> `RESOLVED` -> `CUSTOMER_CONFIRMED` -> `CLOSED`.
* **FR-15.4: Mandatory Customer Resolution Confirmation:** A ticket cannot reach `CLOSED` status until the customer enters a confirmation OTP or signs a resolution acknowledgment.

### Module 16: Subsidy Application Tracking
* **FR-16.1: Discom & National Portal Milestone Pipeline:**
  1. `DOCS_COLLECTED`: Electricity bill copy, Aadhaar/ID proof, property tax receipt, cancelled bank cheque.
  2. `PORTAL_SUBMITTED`: Registered on government subsidy portal; application reference number recorded.
  3. `TECHNICAL_FEASIBILITY_APPROVED`: Discom technical feasibility clearance received.
  4. `INSTALLATION_INSPECTED`: Joint inspection completed by Discom/agency officer.
  5. `NET_METER_INSTALLED`: Bidirectional net meter installed and commissioned.
  6. `SUBSIDY_CLAIM_LODGED`: Bank details and commissioning report uploaded for direct benefit transfer.
  7. `SUBSIDY_DISBURSED`: Subsidy credited directly to customer account.
* **FR-16.2: Stalled Application Alerts:** Proactive notifications when an application remains in a milestone state for more than 14 business days.
* **FR-16.3: Document Vault:** Secure storage bucket for sensitive citizen identification documents with strict role-based access.

### Module 17: Financial Management & Job Costing
* **FR-17.1: Job Profitability Engine:** Computes real-time profitability for every single installation:
  $$\text{Net Profit} = \text{Invoice Revenue (Excl. Tax)} - \left( \text{BOM Item Actual Cost} + \text{Technician Labor Cost} + \text{Logistics Cost} + \text{Misc Costs} \right)$$
* **FR-17.2: Labor Cost Allocation:** Automatically calculates labor expense by multiplying technician logged hours from Module 12 by each technician's hourly internal wage rate.
* **FR-17.3: Receivables & Payables Ledger:** Live view of total outstanding customer milestone balances, vendor procurement balances, and technician pending wage slips.

### Module 18: Analytics and Operational Reports
* **FR-18.1: Sales Funnel Analytics:** Lead to survey conversion %, survey to quote conversion %, quote to win %, average deal velocity (days from lead to advance payment).
* **FR-18.2: Technician Efficiency Metrics:** Average installation duration (hours per kW), on-time arrival rate, first-time-fix rate on service tickets.
* **FR-18.3: Inventory Turnover & Aging:** Days of inventory on hand, high-value asset holding cost, scrap/defect rates.
* **FR-18.4: Export Engine:** All tabular data exportable in CSV, Excel (XLSX), and formatted executive summary PDF reports.

### Module 19: Notifications and Alerts
* **FR-19.1: Omnichannel Notification Service:** In-app toast alerts, email dispatch via SMTP/Resend, and WhatsApp/SMS templates.
* **FR-19.2: Critical Automated Triggers:**
  * Lead Assigned -> WhatsApp to Salesperson.
  * Survey Approved -> Email to Customer + Alert to Sales Exec.
  * Advance Payment Received -> Pick List to Warehouse + Schedule to Installation Manager.
  * Dispatch Out for Delivery -> SMS to Customer with live technician contact.
  * Installation Handover Complete -> Warranty Card PDF sent to Customer.
  * Service Ticket Status Update -> Real-time status update to Customer.

### Module 20: Audit Logs and System Settings
* **FR-20.1: Immutable Audit Trail:** Every state change, price modification, discount override, serial number re-assignment, and payment deletion attempt is written to an immutable append-only audit log table.
* **FR-20.2: Audit Data Structure:** Timestamp (UTC), User ID, User Role, IP Address, HTTP User Agent, Resource Name, Resource ID, Action Type (`INSERT`, `UPDATE`, `DELETE`, `OVERRIDE`), and Diff JSON (prior state vs. updated state).
* **FR-20.3: Configurable System Settings:**
  * Default advance payment % requirement (e.g., 20%).
  * Standard warranty durations per category (months).
  * GST / Tax percentage rules.
  * Margin warning threshold (e.g., alert if gross margin < 15%).
  * Subsidy slab calculation parameters.

---

## 5. Non-Functional Requirements (NFR)

* **NFR-1 (Performance):** Page load times (P95) under 1.2 seconds on standard 4G mobile networks. Serial number barcode lookup response within <250 milliseconds.
* **NFR-2 (Offline Resilience):** Mobile Field Technician Installation Form must operate seamlessly in offline/intermittent connectivity conditions, storing captured data and photos in IndexedDB, with automated background sync upon network reconnection.
* **NFR-3 (Data Integrity & Transactions):** All state updates affecting inventory, serial assignments, and financial milestones must execute inside ACID PostgreSQL transactions.
* **NFR-4 (Security & Privacy):** Passwords hashed via bcrypt/Argon2. Role-Based Access Control enforced at the database level via Supabase PostgreSQL Row-Level Security (RLS). Customer Aadhaar and bank details stored encrypted at rest.
* **NFR-5 (Auditability):** Zero hard deletes on critical operational entities (Orders, Invoices, Serial Dispatches, Installation Reports). All deletion operations are implemented as soft deletes (`deleted_at` timestamp) accompanied by audit entries.
