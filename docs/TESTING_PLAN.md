# SolarOS: Comprehensive Testing Plan & Quality Assurance Strategy
**System:** SolarOS — The Complete Solar Business Operating System  
**Test Frameworks:** Vitest (Unit & Integration) + Playwright (End-to-End)  
**Author:** Principal QA Architect & Senior Full-Stack Engineer  
**Status:** Approved Architectural Baseline  

---

## 1. Testing Strategy & Quality Standards

SolarOS manages electrical infrastructure installations, customer financial transactions, and manufacturer warranty tracking. System errors can result in missing high-value inventory, electrical code violations, or financial loss. Quality assurance is structured around a rigorous 4-tier test pyramid:

```
        / \
       /   \     E2E Tests (Playwright)
      / E2E \    - 5 Critical User Journeys (Lead-to-Warranty)
     /-------\
    /  Integ  \  Integration Tests (Vitest + Supabase Test DB)
   /   Tests   \ - DB Transactions, Triggers, RLS Policies, Server Actions
  /-------------\
 /  Unit Tests   \ Unit Tests (Vitest)
/  (Fast, Pure)   \ - BOM Engine, Pricing, Warranty Durations, Job Margins
-------------------
```

### Coverage Targets:
* **Domain Calculation Engines (BOM, Pricing, Warranty, Job Costing):** $100\%$ Statement and Branch Coverage.
* **Server Actions & Database Triggers:** $\ge 90\%$ Integration Coverage.
* **Core Operational Workflows:** $100\%$ E2E Scenario Coverage matching the 6 operational scenes in the problem statement.

---

## 2. Unit Testing Suite (Vitest)

Unit tests focus on pure domain calculation functions with zero external database dependencies.

### 2.1 Bill of Materials (BOM) & Cable Calculation Tests
```typescript
// tests/unit/domain/bom-calculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateAutomaticBOM } from "@/domain/bom/calculator";

describe("Automated BOM Resolution Engine", () => {
  it("resolves exact hardware for 3 kW On-Grid system", () => {
    const surveyData = {
      dcCableDistanceMeters: 25.0,
      acCableDistanceMeters: 15.0,
      roofType: "RCC_FLAT" as const
    };

    const bom = calculateAutomaticBOM(3.0, "ON_GRID", surveyData);

    // 3 kW requires 6 x 540W Mono-PERC panels (3.24 kWp nominal)
    const panels = bom.items.find(i => i.itemCode === "PV-PANEL-540W");
    expect(panels).toBeDefined();
    expect(panels?.quantity).toBe(6);

    // 1 x 3 kW On-Grid string inverter
    const inverter = bom.items.find(i => i.itemCode === "INV-3KW-OG");
    expect(inverter).toBeDefined();
    expect(inverter?.quantity).toBe(1);

    // Dynamic Cable run with 15% slack safety factor:
    // DC cable: 25m * 2 (positive + negative) * 1.15 = 57.5m -> rounded to 58m
    const dcCable = bom.items.find(i => i.itemCode === "CABLE-DC-4SQMM");
    expect(dcCable?.quantity).toBe(58);

    // Standard safety earthing: 2 chemical rods
    const earthingRods = bom.items.find(i => i.itemCode === "EARTH-ROD-CHEM");
    expect(earthingRods?.quantity).toBe(2);

    // Verify Off-grid battery is NOT included in On-grid BOM
    const battery = bom.items.find(i => i.category === "BATTERY");
    expect(battery).toBeUndefined();
  });

  it("includes battery storage bank for 3 kW Off-Grid system", () => {
    const surveyData = {
      dcCableDistanceMeters: 20.0,
      acCableDistanceMeters: 10.0,
      roofType: "TIN_SHED" as const
    };

    const bom = calculateAutomaticBOM(3.0, "OFF_GRID", surveyData);

    const battery = bom.items.find(i => i.itemCode === "BATT-LIFEPO4-48V-100AH");
    expect(battery).toBeDefined();
    expect(battery?.quantity).toBe(1);
  });
});
```

### 2.2 Pricing, GST & Government Subsidy Slab Tests
```typescript
// tests/unit/domain/pricing-calculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateQuotationPricing, calculateSubsidyAmount } from "@/domain/pricing/calculator";

describe("Pricing & Subsidy Engine", () => {
  it("calculates correct PM Surya Ghar subsidy slabs", () => {
    // 1 kW -> ₹30,000
    expect(calculateSubsidyAmount(1.0)).toBe(30000);
    // 2 kW -> ₹60,000
    expect(calculateSubsidyAmount(2.0)).toBe(60000);
    // 3 kW -> ₹78,000 (Max ceiling)
    expect(calculateSubsidyAmount(3.0)).toBe(78000);
    // 5 kW -> capped at ₹78,000
    expect(calculateSubsidyAmount(5.0)).toBe(78000);
  });

  it("computes net customer payable with 12% GST and subsidy", () => {
    const bomTotalCost = 145000;
    const pricing = calculateQuotationPricing({
      bomTotalCost,
      capacityKw: 3.0,
      laborRatePerKw: 4000,
      logisticsCost: 2500,
      discount: 0
    });

    expect(pricing.installationCharges).toBe(12000); // 3 * 4000
    expect(pricing.taxableAmount).toBe(159500); // 145000 + 12000 + 2500
    expect(pricing.taxAmount).toBe(19140); // 12% of 159500
    expect(pricing.grossTotal).toBe(178640);
    expect(pricing.estimatedSubsidy).toBe(78000);
    expect(pricing.netPayableByCustomer).toBe(100640); // 178640 - 78000
  });
});
```

### 2.3 Warranty Date Calculation & Validity Checker Tests
```typescript
// tests/unit/domain/warranty-checker.test.ts
import { describe, it, expect } from "vitest";
import { isUnderWarranty, calculateWarrantyDates } from "@/domain/warranty/checker";

describe("Warranty Engine", () => {
  it("generates correct start and end dates based on SKU duration", () => {
    const deliveryDate = new Date("2026-05-15T00:00:00Z");
    
    // Inverter (24 months)
    const invDates = calculateWarrantyDates(deliveryDate, 24);
    expect(invDates.startDate.toISOString().slice(0, 10)).toBe("2026-05-15");
    expect(invDates.endDate.toISOString().slice(0, 10)).toBe("2028-05-15");

    // Solar Panels (240 months / 20 years)
    const panelDates = calculateWarrantyDates(deliveryDate, 240);
    expect(panelDates.endDate.toISOString().slice(0, 10)).toBe("2046-05-15");
  });

  it("determines warranty coverage for 18-month breakdown", () => {
    const startDate = new Date("2024-05-01T00:00:00Z");
    const endDate = new Date("2026-05-01T00:00:00Z"); // 2-year warranty

    // Breakdown occurs 18 months later (November 2025)
    const incidentDate = new Date("2025-11-01T00:00:00Z");
    expect(isUnderWarranty(startDate, endDate, incidentDate)).toBe(true);

    // Breakdown occurs 30 months later (November 2026) -> Expired
    const lateIncidentDate = new Date("2026-11-01T00:00:00Z");
    expect(isUnderWarranty(startDate, endDate, lateIncidentDate)).toBe(false);
  });
});
```

---

## 3. Database Integration Tests (Vitest + Supabase Test DB)

Integration tests validate transactional atomicity, trigger execution, and Row-Level Security rules against a local or staging PostgreSQL container.

### 3.1 Hard Gate Integration Test (Survey Approval)
```typescript
// tests/integration/quotation-survey-gate.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestLead, createTestSurvey, dbClient } from "../helpers";

describe("Quotation Survey Approval Gate", () => {
  it("strictly rejects quotation creation when survey is only SUBMITTED", async () => {
    const lead = await createTestLead();
    const survey = await createTestSurvey({ leadId: lead.id, status: "SUBMITTED" });

    // Attempt to insert quotation
    const insertPromise = dbClient.from("quotations").insert({
      quotation_number: "QUO-TEST-FAIL",
      lead_id: lead.id,
      survey_id: survey.id,
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      valid_until: "2026-12-31",
      created_by: lead.assigned_sales_rep_id
    });

    await expect(insertPromise).rejects.toThrow(/not APPROVED/);
  });
});
```

### 3.2 Double Serial Assignment Prevention Test
```typescript
// tests/integration/serial-concurrency.test.ts
import { describe, it, expect } from "vitest";
import { createTestSerial, createTestOrder, dbClient } from "../helpers";

describe("Serial Number Anti-Duplicate Constraints", () => {
  it("prevents assigning the same serial number to two concurrent dispatches", async () => {
    const serial = await createTestSerial({ status: "IN_STOCK" });
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();

    // Assign to Order 1
    await dbClient.from("order_serial_assignments").insert({
      order_id: order1.id,
      serial_number_id: serial.id,
      status: "RESERVED"
    });

    // Attempt duplicate assignment to Order 2
    const duplicatePromise = dbClient.from("order_serial_assignments").insert({
      order_id: order2.id,
      serial_number_id: serial.id,
      status: "RESERVED"
    });

    await expect(duplicatePromise).rejects.toThrow(/unique_active_serial_assignment/);
  });
});
```

---

## 4. End-to-End (E2E) Test Suite (Playwright)

Playwright E2E tests run headless browser sessions mimicking real human workflows across the 5 core operational journeys.

```typescript
// tests/e2e/journey-01-lead-to-order.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Journey 1: Lead Intake to Order Confirmation", () => {
  test("completes inquiry, survey, quotation and advance payment", async ({ page }) => {
    // 1. Submit public lead form
    await page.goto("/contact");
    await page.fill('input[name="fullName"]', "Amit Verma");
    await page.fill('input[name="phone"]', "+919812345678");
    await page.fill('textarea[name="address"]', "Plot 14, Urban Estate, Jalandhar");
    await page.fill('input[name="pincode"]', "144001");
    await page.selectOption('select[name="systemTopology"]', "ON_GRID");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Enquiry registered successfully")).toBeVisible();

    // 2. Sales Executive logs in and qualifies lead
    await page.goto("/login");
    await page.fill('input[name="email"]', "sales.rep@sunpower.com");
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    await page.goto("/sales/leads");
    await page.click("text=Amit Verma");
    await page.click("text=Conduct Qualification Call");
    await page.fill('input[name="monthlyBillAmount"]', "4500");
    await page.fill('input[name="shadowFreeAreaSqft"]', "450");
    await page.fill('input[name="sanctionedLoadKw"]', "5");
    await page.selectOption('select[name="gridConnectionType"]', "SINGLE_PHASE");
    await page.fill('input[name="discomName"]', "PSPCL");
    await page.click("text=Save & Schedule Survey");

    // 3. Survey Technician submits mobile survey
    await page.goto("/login");
    await page.fill('input[name="email"]', "survey.tech@sunpower.com");
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    await page.goto("/field/surveys");
    await page.click("text=Amit Verma");
    await page.selectOption('select[name="roofAzimuthDirection"]', "SOUTH");
    await page.fill('input[name="roofTiltAngleDeg"]', "28");
    await page.fill('input[name="dcCableDistanceMeters"]', "30");
    await page.fill('input[name="acCableDistanceMeters"]', "15");
    // Attach 4 mock photos
    await page.setInputFiles('input[name="photos"]', [
      "tests/fixtures/roof_pano.jpg",
      "tests/fixtures/meter_board.jpg",
      "tests/fixtures/inverter_wall.jpg",
      "tests/fixtures/earthing_loc.jpg"
    ]);
    await page.click("text=Submit Technical Survey");

    // 4. Sales Manager approves survey and generates quote
    await page.goto("/login");
    await page.fill('input[name="email"]', "sales.mgr@sunpower.com");
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    await page.goto("/sales/surveys");
    await page.click("text=Amit Verma");
    await page.click("text=Approve Feasibility");

    // Generate Quote
    await page.goto("/sales/quotes/new?leadId=...");
    await page.selectOption('select[name="systemCapacityKw"]', "3.0");
    await page.click("text=Generate Automatic BOM & Quote");
    await expect(page.locator("text=QUO-2026-")).toBeVisible();
    await expect(page.locator("text=₹100,640")).toBeVisible(); // Net payable

    // 5. Record Advance Payment and verify order creation
    await page.click("text=Record Advance Payment");
    await page.fill('input[name="paymentReferenceCode"]', "UTR9948218491");
    await page.fill('input[name="amount"]', "30000");
    await page.click("text=Confirm Payment & Create Order");

    await expect(page.locator("text=Order Created: ORD-2026-")).toBeVisible();
  });
});
```

---

## 5. Continuous Integration (CI/CD) Pipeline Integration

In GitHub Actions, tests run on every pull request to `main`:
1. **Lint & Type Check:** `npm run lint && npm run typecheck`
2. **Vitest Unit Suite:** `npx vitest run tests/unit` (Execution time $< 10$ seconds)
3. **Database Integration Suite:** `npx vitest run tests/integration` (Runs against ephemeral Supabase CLI container)
4. **Playwright E2E Suite:** `npx playwright test` (Runs in parallel with video and screenshot artifacts captured on failure).
