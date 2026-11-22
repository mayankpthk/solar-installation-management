# SolarOS: API Design & Server-Side Contract Specification
**System:** SolarOS — The Complete Solar Business Operating System  
**Pattern:** Next.js Route Handlers (RESTful Endpoints) & Next.js Server Actions (RPC)  
**Schema Validation:** Zod Runtime Validation  
**Author:** Principal Software Architect & API Lead  
**Status:** Approved Architectural Baseline  

---

## 1. API Architecture & Standards

### 1.1 Ingress, Content Negotiation & Headers
* **Standard Protocol:** HTTPS (TLS 1.3 mandatory).
* **Payload Format:** `application/json; charset=utf-8` for standard mutation/query endpoints; `multipart/form-data` for file uploads (survey/installation photos).
* **Idempotency Key:** Mutating state operations (`POST /api/orders`, `POST /api/payments`, `POST /api/dispatches`) accept an `Idempotency-Key: <UUID>` header. Repeated requests within 24 hours return the cached response without re-executing transactions.
* **Authentication:** GoTrue JWT delivered via HTTP-Only Secure Cookie or `Authorization: Bearer <token>`.

### 1.2 RFC 7807 Problem Details Error Specification
Every error response strictly adheres to RFC 7807:

```json
{
  "type": "https://solaros.sunpower.com/errors/invalid-survey-state",
  "title": "Quotation Blocked by Unapproved Survey",
  "status": 422,
  "detail": "Site survey SRV-2026-0042 is in 'SUBMITTED' status. Quotation generation requires 'APPROVED' status.",
  "instance": "/api/quotations/generate",
  "code": "SURVEY_NOT_APPROVED",
  "invalidParams": [
    {
      "name": "surveyId",
      "reason": "Must be approved by an authorized manager before quoting."
    }
  ],
  "timestamp": "2026-11-21T07:15:00.000Z"
}
```

---

## 2. Server Authorization Wrapper (Higher-Order Function)

All mutating server operations and API routes are wrapped in a type-safe authorization guard:

```typescript
// src/server/auth/guard.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UserRole } from "@/lib/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export function withAuth(
  allowedRoles: UserRole[],
  handler: (req: NextRequest, user: AuthenticatedUser, context: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const supabase = createServerClient(/* ...cookies... */);
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json({
        type: "https://solaros.sunpower.com/errors/unauthorized",
        title: "Authentication Required",
        status: 401,
        detail: "A valid session token is required to access this endpoint."
      }, { status: 401 });
    }

    // Query user profile role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({
        type: "https://solaros.sunpower.com/errors/forbidden",
        title: "Access Denied",
        status: 403,
        detail: `Role '${profile?.role}' lacks permission for this action.`
      }, { status: 403 });
    }

    return handler(req, { id: profile.id, email: profile.email, role: profile.role }, context);
  };
}
```

---

## 3. Core API Endpoint Specifications (By Module)

### Module 2: CRM & Lead Ingestion
#### `POST /api/leads` (Public / Webhook Ingestion)
* **Access:** Anonymous / Public.
* **Purpose:** Captures enquiries from website landing forms, WhatsApp incoming webhooks, or marketing campaigns.
* **Request Schema (Zod):**
```typescript
export const CreateLeadSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone format"),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().min(5),
  city: z.string(),
  state: z.string(),
  pincode: z.string().regex(/^\d{6}$/, "Must be valid 6-digit PIN code"),
  monthlyBillAmount: z.number().positive().optional(),
  interestedCapacityKw: z.number().min(1).max(50).default(3.0),
  systemTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]).default("ON_GRID"),
  isSubsidyRequested: z.boolean().default(true),
  source: z.enum(["WEB_FORM", "WHATSAPP", "PHONE_INQUIRY", "WALK_IN"]).default("WEB_FORM")
});
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "leadId": "7b3b3ef8-2f16-4148-8df0-d5a239999a01",
  "leadCode": "LED-2026-0042",
  "status": "NEW",
  "message": "Enquiry registered successfully and routed to sales queue."
}
```

#### `PATCH /api/leads/:id/qualify` (Telephonic Pre-Qualification)
* **Access:** `SALES_EXECUTIVE`, `SALES_MANAGER`, `DIRECTOR`.
* **Request Schema:**
```typescript
export const QualifyLeadSchema = z.object({
  monthlyBillAmount: z.number().positive(),
  avgMonthlyConsumptionKwh: z.number().positive(),
  shadowFreeAreaSqft: z.number().min(50),
  sanctionedLoadKw: z.number().positive(),
  gridConnectionType: z.enum(["SINGLE_PHASE", "THREE_PHASE"]),
  discomName: z.string().min(2),
  notes: z.string().optional()
});
```

---

### Module 3: Site Survey Management
#### `POST /api/surveys/:id/submit` (Mobile On-Site Technical Submission)
* **Access:** `SURVEY_TECHNICIAN`, `INSTALLATION_MANAGER`.
* **Payload:** Multipart Form Data (Survey Metrics + 4 Mandatory Photos).
* **Request Body:**
```typescript
export const SubmitSurveySchema = z.object({
  roofAzimuthDirection: z.enum(["NORTH", "SOUTH", "EAST", "WEST", "SOUTH_EAST", "SOUTH_WEST"]),
  roofTiltAngleDeg: z.number().min(0).max(90),
  usableAreaSqft: z.number().positive(),
  roofType: z.enum(["RCC_FLAT", "TIN_SHED", "TILED", "GROUND_MOUNT"]),
  structuralIntegrity: z.enum(["EXCELLENT", "ACCEPTABLE", "REINFORCEMENT_REQUIRED", "UNSUITABLE"]),
  shadowObstaclesNotes: z.string().optional(),
  dcCableDistanceMeters: z.number().positive(),
  acCableDistanceMeters: z.number().positive(),
  recommendedCapacityKw: z.number().min(1).max(50),
  recommendedTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]),
  photoUrls: z.array(z.string().url()).min(4, "Minimum 4 site photos required")
});
```

#### `PATCH /api/surveys/:id/review` (Manager Feasibility Sign-off)
* **Access:** `SALES_MANAGER`, `INSTALLATION_MANAGER`, `DIRECTOR`.
* **Request Body:** `{ action: "APPROVE" | "REJECT", comments: string }`.
* **Behavior:** Approving updates status to `APPROVED`, unlocking Quotation generation. Rejection sends rework notification to technician.

---

### Module 5: Quotations & Automatic Bill of Materials
#### `POST /api/quotations/generate` (Automatic BOM & Pricing Engine)
* **Access:** `SALES_EXECUTIVE`, `SALES_MANAGER`, `DIRECTOR`.
* **Request Schema:**
```typescript
export const GenerateQuotationSchema = z.object({
  leadId: z.string().uuid(),
  surveyId: z.string().uuid(),
  systemCapacityKw: z.number().min(1).max(50),
  systemTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]),
  discountAmount: z.number().min(0).default(0)
});
```
* **Internal Server Execution Workflow:**
  1. **Survey Gate Check:** Verify `site_surveys.status === 'APPROVED'`. Return 422 if unapproved.
  2. **BOM Resolution:** Query `bom_template_items` for `(systemCapacityKw, systemTopology)`.
  3. **Cable Distance Adjustment:** Dynamically calculate DC and AC cable quantities using survey cable lengths $+ 15\%$ safety margin.
  4. **Pricing Calculation:** Sum item costs; add standard installation labor charges ($\text{₹}4,000 / \text{kW}$) and logistics ($\text{₹}2,500$ flat); compute $12\%$ GST.
  5. **Subsidy Calculation:** Compute eligible subsidy (e.g., PM Surya Ghar: $\text{₹}30,000 / \text{kW}$ up to 2 kW, $\text{₹}18,000$ for 3rd kW, Max $\text{₹}78,000$).
  6. **Insert Quotation & Items:** Atomic transaction inserts `quotations` and `quotation_items`.
* **Success Response (200 OK):**
```json
{
  "quotationId": "4c94b790-3449-4a41-b883-8a3c89901111",
  "quotationNumber": "QUO-2026-0042",
  "systemCapacityKw": 3.0,
  "systemTopology": "ON_GRID",
  "bomItemCount": 8,
  "financials": {
    "hardwareTotal": 145000.00,
    "installationCharges": 12000.00,
    "logisticsCharges": 2500.00,
    "taxableAmount": 159500.00,
    "taxAmount": 19140.00,
    "grossTotal": 178640.00,
    "estimatedSubsidy": 78000.00,
    "netPayableByCustomer": 100640.00
  },
  "pdfUrl": "https://storage.sunpower.com/quotations/QUO-2026-0042.pdf"
}
```

---

### Module 6 & 7: Orders & Milestone Invoicing
#### `POST /api/orders/create` (Quotation to Order Conversion)
* **Access:** `SALES_MANAGER`, `FINANCE_MANAGER`, `DIRECTOR`.
* **Headers:** `Idempotency-Key: <UUID>`.
* **Request Schema:**
```typescript
export const CreateOrderSchema = z.object({
  quotationId: z.string().uuid(),
  advancePaymentReference: z.string().min(5),
  advanceAmountPaid: z.number().positive(),
  paymentMode: z.enum(["BANK_TRANSFER_NEFT", "UPI", "CHEQUE", "CASH"]),
  creditOverrideReason: z.string().optional()
});
```
* **Transactional Guarantee:**
  * Checks if quotation already converted to order (returns existing order if matching idempotency key).
  * Validates `advanceAmountPaid >= quotation.netPayableByCustomer * 0.20` OR requires `creditOverrideReason`.
  * Inserts record into `orders`.
  * Creates `invoices` record for Milestone 1 (`BOOKING_ADVANCE`).
  * Creates `payments` record linking UTR reference.
  * Dispatches background events: creates Warehouse Pick-List and alerts Installation Manager.

---

### Module 9 & 10: Serial Number Dispatch & Auto-Warranty Activation
#### `POST /api/dispatches/:id/scan-serial` (Barcode Scanned at Loading Dock)
* **Access:** `WAREHOUSE_MANAGER`, `SUPER_ADMIN`.
* **Request Body:** `{ serialNumber: string }`.
* **Server Logic:**
  * Validates that `serialNumber` exists in `serial_numbers` with status `'IN_STOCK'`.
  * Verifies that the item SKU matches one of the required serialized items in the order BOM.
  * Links serial to `dispatch_items`.
  * Updates serial status to `'RESERVED'`.

#### `POST /api/dispatches/:id/confirm-delivery` (Truck Handover On-Site)
* **Access:** `INSTALLATION_MANAGER`, `FIELD_TECHNICIAN`, `WAREHOUSE_MANAGER`.
* **Request Body:** `{ receiverName: string, notes?: string }`.
* **Server Execution & Trigger:**
  * Updates `dispatches.dispatch_status = 'DELIVERED'` and `delivered_at = NOW()`.
  * **Database Trigger `trg_activate_warranty_on_delivery` automatically fires:**
    * Queries each scanned serial number in the dispatch.
    * Fetches `default_warranty_months` from `items` catalog.
    * Inserts rows into `warranties` with `start_date = CURRENT_DATE` and `end_date = CURRENT_DATE + interval`.
    * Updates serial status to `'DISPATCHED'`.
  * Updates `orders.status = 'INSTALLATION_SCHEDULED'`.

---

### Module 12 & 13: Installation, Commissioning & Digital Handover
#### `POST /api/installations/:id/commission` (Power Generation Verification)
* **Access:** `FIELD_TECHNICIAN`, `INSTALLATION_MANAGER`.
* **Request Schema:**
```typescript
export const CommissioningSchema = z.object({
  measuredDcVoltage: z.number().positive(),
  measuredDcCurrent: z.number().positive(),
  measuredAcVoltage: z.number().min(200).max(450),
  measuredInstantaneousPowerKw: z.number().positive(),
  earthingResistanceOhms: z.number().max(5.0, "Earthing resistance must be below 5 Ohms")
});
```

#### `POST /api/installations/:id/handover` (Customer Sign-off & Completion)
* **Access:** `FIELD_TECHNICIAN`, `INSTALLATION_MANAGER`.
* **Payload:** Multipart Form Data (5 mandatory photos + Customer SVG touch-signature).
* **Request Schema:**
```typescript
export const HandoverReportSchema = z.object({
  startTime: z.string().datetime(),
  finishTime: z.string().datetime(),
  installedCapacityKw: z.number().positive(),
  roofArrayPhotoUrl: z.string().url(),
  inverterMountPhotoUrl: z.string().url(),
  distributionBoxPhotoUrl: z.string().url(),
  earthingPitPhotoUrl: z.string().url(),
  generationMeterPhotoUrl: z.string().url(),
  customerSignatureSvg: z.string().min(50, "Valid signature vector required"),
  customerFeedbackRating: z.number().int().min(1).max(5)
});
```
* **Post-Processing:**
  * Generates tamper-proof Handover Certificate PDF.
  * Marks `installations.status = 'APPROVED'`.
  * **Database Trigger `trg_calculate_job_costing` automatically fires:** Calculates net job profitability and gross margin % for the director.

---

### Module 14 & 15: Instant Warranty Search & Service Tickets
#### `GET /api/warranties/lookup` (Instant Breakdown Lookup)
* **Access:** `SALES_EXECUTIVE`, `FIELD_TECHNICIAN`, `INSTALLATION_MANAGER`, `FINANCE_MANAGER`, `DIRECTOR`.
* **Query Parameters:** `?query=<serial_number_or_phone_or_name>`.
* **Response:**
```json
{
  "found": true,
  "customer": {
    "name": "Rajesh Sharma",
    "phone": "+919876543210",
    "address": "42 Green Valley, Jalandhar"
  },
  "hardware": {
    "itemCode": "INV-3KW-OG",
    "itemName": "3 kW Single-Phase On-Grid Solar Inverter",
    "serialNumber": "INV-2024-884912"
  },
  "warranty": {
    "status": "ACTIVE",
    "startDate": "2024-05-10",
    "endDate": "2026-05-10",
    "remainingDays": 170,
    "isCovered": true
  }
}
```

#### `POST /api/tickets/create` (Automated Warranty Decision Engine)
* **Access:** `CUSTOMER`, `SALES_EXECUTIVE`, `INSTALLATION_MANAGER`.
* **Request Schema:**
```typescript
export const CreateTicketSchema = z.object({
  orderId: z.string().uuid(),
  serialNumber: z.string().min(3),
  reportedFaultCode: z.string().optional(),
  symptomDescription: z.string().min(10)
});
```
* **Automated Decision Engine Logic:**
  * Looks up warranty status for `serialNumber`.
  * If `warranty.status === 'ACTIVE' && warranty.endDate >= today`:
    * Sets `billing_classification = 'WARRANTY_FREE'`.
    * Customer repair cost is locked at **₹0.00**.
  * Else (Expired or Not Found):
    * Sets `billing_classification = 'BILLABLE'`.
    * Attaches standard inspection fee invoice to customer record.

---

### Module 17 & 18: Executive P&L & Analytics
#### `GET /api/financials/job-costing`
* **Access:** `DIRECTOR`, `FINANCE_MANAGER`, `SUPER_ADMIN`.
* **Query Parameters:** `?period=THIS_MONTH&minMargin=0`.
* **Response:**
```json
{
  "summary": {
    "totalCompletedJobs": 42,
    "totalRevenue": 7450000.00,
    "totalDirectCost": 5420000.00,
    "grossProfit": 2030000.00,
    "averageMarginPercent": 27.25
  },
  "jobs": [
    {
      "orderNumber": "ORD-2026-0104",
      "customerName": "Vikas Patel",
      "capacityKw": 5.0,
      "revenue": 280000.00,
      "bomCost": 182000.00,
      "laborCost": 14400.00,
      "logisticsCost": 3500.00,
      "grossProfit": 80100.00,
      "marginPercent": 28.61,
      "indicator": "HEALTHY"
    }
  ]
}
```
