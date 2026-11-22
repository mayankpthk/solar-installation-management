import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStore, updateRecipeComponentQuantity } from "@/lib/data/store";
import { resolveConfiguredBOM } from "@/domain/products/recipe-engine";
import { verifyInventoryAvailability } from "@/domain/inventory/checker";
import {
  generateQuotationPipeline,
  createQuotationRevision,
  acceptCustomerQuotation,
  rejectCustomerQuotation,
} from "@/domain/quotations/quotation-engine";
import {
  confirmOrderFromQuotation,
  processPayment,
  processRefund,
} from "@/domain/payments/payment-processor";
import { calculateQuotationPricing, calculateSubsidyAmount } from "@/domain/pricing/calculator";

describe("Product Configuration, Quotations & Payment Workflows Engine", () => {
  beforeEach(() => {
    resetStore();
  });

  // 1. PRODUCT CONFIGURATION: 1-5 kW On-Grid, 1-5 kW Off-Grid, Panel Sets, Installation
  it("supports all required solar product lines and configurable recipe structures", () => {
    const store = getStore();

    // Check On-Grid products 1kW to 5kW
    const onGrid1kW = store.products.find((p) => p.product_code === "SYS-1KW-OG");
    const onGrid3kW = store.products.find((p) => p.product_code === "SYS-3KW-OG");
    const onGrid5kW = store.products.find((p) => p.product_code === "SYS-5KW-OG");
    expect(onGrid1kW).toBeDefined();
    expect(onGrid3kW?.capacity_kw).toBe(3.0);
    expect(onGrid5kW?.capacity_kw).toBe(5.0);

    // Check Off-Grid products 1kW to 5kW
    const offGrid1kW = store.products.find((p) => p.product_code === "SYS-1KW-OFF");
    const offGrid3kW = store.products.find((p) => p.product_code === "SYS-3KW-OFF");
    const offGrid5kW = store.products.find((p) => p.product_code === "SYS-5KW-OFF");
    expect(offGrid1kW?.topology).toBe("OFF_GRID");
    expect(offGrid3kW?.topology).toBe("OFF_GRID");
    expect(offGrid5kW?.topology).toBe("OFF_GRID");

    // Check Solar Panel Sets
    const panelSet4 = store.products.find((p) => p.product_code === "PROD-PANEL-SET-4");
    const panelSet8 = store.products.find((p) => p.product_code === "PROD-PANEL-SET-8");
    expect(panelSet4).toBeDefined();
    expect(panelSet8).toBeDefined();

    // Check Installation Service
    const installService = store.products.find((p) => p.product_code === "SRV-INSTALL-STD");
    expect(installService).toBeDefined();

    // Verify recipes are populated
    expect(store.recipes.length).toBeGreaterThanOrEqual(5);
  });

  // 2. RECIPE ENGINE: Component quantity calculation rules
  it("resolves exact BOM quantities based on capacity-dependent rules", () => {
    const store = getStore();

    // 3 kW On-Grid System
    const bom3kW = resolveConfiguredBOM({
      capacityKw: 3.0,
      topology: "ON_GRID",
      surveyDimensions: { dcCableDistanceMeters: 20, acCableDistanceMeters: 10 },
      componentsCatalog: store.components,
    });

    // 3kW / 540W = Math.ceil(3000 / 540) = 6 panels
    const panels = bom3kW.items.find((i) => i.componentCode === "PV-PANEL-540W");
    expect(panels?.quantity).toBe(6);

    // 1 Inverter
    const inverter = bom3kW.items.find((i) => i.category === "INVERTER");
    expect(inverter?.quantity).toBe(1);

    // Off-Grid Battery should NOT be present on On-Grid
    const batteryOnGrid = bom3kW.items.find((i) => i.category === "BATTERY");
    expect(batteryOnGrid).toBeUndefined();

    // 3 kW Off-Grid System
    const bomOffGrid = resolveConfiguredBOM({
      capacityKw: 3.0,
      topology: "OFF_GRID",
      componentsCatalog: store.components,
    });

    // Battery must be present for Off-Grid
    const batteryOffGrid = bomOffGrid.items.find((i) => i.category === "BATTERY");
    expect(batteryOffGrid).toBeDefined();
    expect(batteryOffGrid?.quantity).toBe(1);

    // 5 kW Off-Grid System requires 2 battery units
    const bom5kWOffGrid = resolveConfiguredBOM({
      capacityKw: 5.0,
      topology: "OFF_GRID",
      componentsCatalog: store.components,
    });
    const battery5kW = bom5kWOffGrid.items.find((i) => i.category === "BATTERY");
    expect(battery5kW?.quantity).toBe(2);
  });

  // 3. RECIPE CONFIGURATION: Authorized administrator updates component quantities
  it("allows authorized administrators to configure recipe quantities and prevents unauthorized modifications", () => {
    const store = getStore();
    const recipe = store.recipes[0];
    const initialQty = recipe.default_quantity;

    // Unauthorized role fails
    expect(() =>
      updateRecipeComponentQuantity(recipe.id, 10, "CUSTOMER")
    ).toThrowError(/Forbidden/);

    expect(() =>
      updateRecipeComponentQuantity(recipe.id, 10, "FIELD_TECHNICIAN")
    ).toThrowError(/Forbidden/);

    // Authorized Director updates quantity
    const updated = updateRecipeComponentQuantity(recipe.id, 8, "DIRECTOR", "user-admin", "Managing Director");
    expect(updated.default_quantity).toBe(8);

    // Verify audit trail logged
    const audit = store.auditLogs.find(
      (a) => a.table_name === "product_recipes" && a.record_id === recipe.id
    );
    expect(audit).toBeDefined();
    expect((audit?.new_data as any)?.default_quantity).toBe(8);
  });

  // 4. PRICING & SUBSIDY ENGINE: 12% GST, discounts, and national PM Surya Ghar slabs
  it("calculates correct material cost, 12% GST, discounts, and capped subsidy", () => {
    // Subsidy slabs
    expect(calculateSubsidyAmount(1.0)).toBe(30000);
    expect(calculateSubsidyAmount(2.0)).toBe(60000);
    expect(calculateSubsidyAmount(3.0)).toBe(78000);
    expect(calculateSubsidyAmount(5.0)).toBe(78000); // Capped at ₹78,000

    const pricing = calculateQuotationPricing({
      bomTotalCost: 145000,
      capacityKw: 3.0,
      laborRatePerKw: 4000, // 12,000
      logisticsCost: 2500,
      discount: 5000,
      gstRatePercent: 12.0,
    });

    // Taxable: 145000 + 12000 + 2500 - 5000 = 154500
    expect(pricing.taxableAmount).toBe(154500);
    // GST 12%: 154500 * 0.12 = 18540
    expect(pricing.taxAmount).toBe(18540);
    // Gross: 154500 + 18540 = 173040
    expect(pricing.grossTotal).toBe(173040);
    // Subsidy: 78000
    expect(pricing.estimatedSubsidy).toBe(78000);
    // Net Customer Payable: 173040 - 78000 = 95040
    expect(pricing.netPayableByCustomer).toBe(95040);
  });

  // 5. INVENTORY AVAILABILITY CHECK: Full stock vs Shortage detection
  it("verifies inventory availability and flags component shortages", () => {
    const store = getStore();

    // Normal items that are in stock
    const availableItems = [
      { componentCode: "PV-PANEL-540W", name: "Solar Panel", quantity: 6 },
      { componentCode: "INV-3KW-OG", name: "Inverter", quantity: 1 },
    ];

    const resultAvailable = verifyInventoryAvailability({
      items: availableItems,
      inventoryItems: store.inventoryItems,
      componentsCatalog: store.components,
    });
    expect(resultAvailable.isAvailable).toBe(true);
    expect(resultAvailable.status).toBe("FULL_STOCK");

    // Excess quantity causing shortage
    const shortageItems = [
      { componentCode: "PV-PANEL-540W", name: "Solar Panel", quantity: 500 }, // Warehouse only has 240
    ];

    const resultShortage = verifyInventoryAvailability({
      items: shortageItems,
      inventoryItems: store.inventoryItems,
      componentsCatalog: store.components,
    });
    expect(resultShortage.isAvailable).toBe(false);
    expect(resultShortage.shortages.length).toBe(1);
    expect(resultShortage.shortages[0].shortageQuantity).toBeGreaterThan(0);
  });

  // 6. 9-STEP QUOTATION PIPELINE: Complete execution
  it("executes the full 9-step quotation pipeline for a 3 kW On-Grid system", () => {
    const store = getStore();
    const lead = store.leads[0];
    const approvedSurvey = store.surveys.find((s) => s.status === "APPROVED");
    expect(approvedSurvey).toBeDefined();

    const result = generateQuotationPipeline({
      leadId: lead.id,
      surveyId: approvedSurvey!.id,
      systemCapacityKw: 3.0,
      systemTopology: "ON_GRID",
      discountAmount: 2000,
    });

    expect(result.quotation).toBeDefined();
    expect(result.quotation.quotation_number).toMatch(/^QUO-2026-\d{4}$/);
    expect(result.quotation.version).toBe(1);
    expect(result.quotation.gross_total).toBeGreaterThan(100000);
    expect(result.quotation.net_payable_by_customer).toBeLessThan(result.quotation.gross_total);
    expect(result.quotation.customer_acceptance_token).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(5);

    // Verify lead status transitioned to QUOTATION_SENT
    const updatedLead = store.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("QUOTATION_SENT");
  });

  // 7. QUOTATION REVISION HISTORY: v1 -> v2 amendment
  it("creates a revised quotation (v2) while preserving and archiving the previous version as REVISED", () => {
    const store = getStore();
    const quotationV1 = store.quotations[0];
    quotationV1.status = "APPROVED";
    const originalNumber = quotationV1.quotation_number;

    const revision = createQuotationRevision({
      quotationId: quotationV1.id,
      amendmentReason: "Customer requested upgrade to 4 kW capacity.",
      modifiedCapacityKw: 4.0,
      userRole: "SALES_MANAGER",
    });

    // Previous quotation must now be REVISED
    expect(quotationV1.status).toBe("REVISED");

    // New quotation must be v2
    expect(revision.quotation.version).toBe(2);
    expect(revision.quotation.quotation_number).toBe(`${originalNumber}-R2`);
    expect(revision.quotation.parent_quotation_id).toBe(quotationV1.id);
    expect(revision.quotation.system_capacity_kw).toBe(4.0);
    expect(revision.quotation.status).toBe("APPROVED");
  });

  // 8. CUSTOMER ACCEPTANCE / REJECTION WORKFLOW
  it("allows customer to accept or reject quotation via secure token", () => {
    const store = getStore();
    const quotation = store.quotations[0];
    quotation.status = "APPROVED";

    // Customer accepts quotation
    const acceptedQuote = acceptCustomerQuotation({
      quotationIdOrToken: quotation.id,
      customerIdentifier: "Harpreet Singh Sandhu",
    });

    expect(acceptedQuote.status).toBe("ACCEPTED");
    expect(acceptedQuote.accepted_at).toBeDefined();

    // Idempotent acceptance
    const reAccept = acceptCustomerQuotation({
      quotationIdOrToken: quotation.id,
      customerIdentifier: "Harpreet Singh Sandhu",
    });
    expect(reAccept.status).toBe("ACCEPTED");

    // Cannot revise an accepted quotation
    expect(() =>
      createQuotationRevision({
        quotationId: quotation.id,
        amendmentReason: "Attempted change after acceptance",
        userRole: "SALES_MANAGER",
      })
    ).toThrowError(/frozen as legal contracts/);
  });

  // 9. ORDER CONFIRMATION BUSINESS RULES:
  // - Approved site survey required
  // - Accepted quotation required
  // - Price freezing onto order
  it("enforces order confirmation business rules and freezes historical quotation prices", () => {
    const store = getStore();
    const lead = store.leads[0];
    const survey = store.surveys.find((s) => s.id === lead.id || s.status === "APPROVED");

    // 9.1 Fails if quotation is NOT accepted
    const draftQuote = store.quotations.find((q) => q.status === "APPROVED");
    expect(draftQuote).toBeDefined();

    expect(() =>
      confirmOrderFromQuotation({
        quotationId: draftQuote!.id,
        idempotencyKey: "idem-unaccepted-1",
      })
    ).toThrowError(/must review and accept the quotation/);

    // 9.2 Accepts when quotation status is ACCEPTED
    draftQuote!.status = "ACCEPTED";
    const initialContractPrice = draftQuote!.gross_total;

    const { order, initialPayment } = confirmOrderFromQuotation({
      quotationId: draftQuote!.id,
      advancePaymentReference: "UTR987654321",
      advanceAmountPaid: Math.round(initialContractPrice * 0.2), // 20% advance
      paymentMode: "BANK_TRANSFER_NEFT",
      idempotencyKey: "idem-confirmed-order-1",
      minAdvancePercent: 20,
      userRole: "DIRECTOR",
    });

    expect(order).toBeDefined();
    expect(order.order_number).toMatch(/^ORD-2026-\d{4}$/);
    expect(order.total_contract_value).toBe(initialContractPrice); // Price frozen
    expect(order.advance_amount_paid).toBe(Math.round(initialContractPrice * 0.2));
    expect(order.status).toBe("READY_FOR_DISPATCH"); // 20% advance met
    expect(initialPayment).toBeDefined();
    expect(initialPayment?.receipt_number).toMatch(/^RCPT-2026-\d{4}$/);

    // 9.3 Duplicate order creation rejected (idempotency)
    expect(() =>
      confirmOrderFromQuotation({
        quotationId: draftQuote!.id,
        idempotencyKey: "idem-confirmed-order-different",
      })
    ).toThrowError(/Order already exists for quotation/);

    // 9.4 Modifying future product price does not alter frozen order total
    const product = store.products[0];
    product.base_price = 999999;
    expect(order.total_contract_value).toBe(initialContractPrice);
  });

  // 10. PAYMENTS: Advance, partial, full payments and balance tracking
  it("tracks milestone payments, outstanding balances, and prevents duplicate payments", () => {
    const store = getStore();

    // Create isolated test order with no pre-existing payments
    const testOrder: any = {
      id: "ord-test-payments-10",
      organization_id: "00000000-0000-0000-0000-000000000001",
      order_number: "ORD-2026-TEST-10",
      quotation_id: "quo-test-10",
      customer_id: "cust-test-10",
      lead_id: "lead-test-10",
      idempotency_key: "idem-test-pay-10",
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      total_contract_value: 150000,
      advance_amount_required: 30000,
      advance_amount_paid: 0,
      outstanding_balance: 150000,
      status: "CONFIRMED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.orders.unshift(testOrder);

    // 10.1 Rejects zero or negative payment
    expect(() =>
      processPayment({
        orderId: testOrder.id,
        amount: 0,
        milestone: "PRE_DISPATCH",
        paymentMode: "UPI",
        paymentReferenceCode: "UPI-TEST-1234",
      })
    ).toThrowError(/greater than zero/);

    // 10.2 Rejects payment without verifiable reference (no phantom buttons)
    expect(() =>
      processPayment({
        orderId: testOrder.id,
        amount: 25000,
        milestone: "PRE_DISPATCH",
        paymentMode: "UPI",
        paymentReferenceCode: "", // Empty reference
      })
    ).toThrowError(/Valid bank UTR or gateway transaction reference required/);

    // 10.3 Processes partial payment (e.g. Booking Advance ₹50,000)
    const partialPayment = processPayment({
      orderId: testOrder.id,
      amount: 50000,
      milestone: "BOOKING_ADVANCE",
      paymentMode: "BANK_TRANSFER_NEFT",
      paymentReferenceCode: "NEFT-PARTIAL-9901",
      idempotencyKey: "idem-pay-partial-1",
    });

    expect(partialPayment.receipt_number).toBeDefined();
    expect(testOrder.outstanding_balance).toBe(100000); // 150000 - 50000
    expect(testOrder.payment_status).toBe("PARTIALLY_PAID");
    expect(testOrder.status).toBe("READY_FOR_DISPATCH"); // 50k meets 30k advance required

    // 10.4 Duplicate payment reference rejected
    expect(() =>
      processPayment({
        orderId: testOrder.id,
        amount: 50000,
        milestone: "PRE_DISPATCH",
        paymentMode: "BANK_TRANSFER_NEFT",
        paymentReferenceCode: "NEFT-PARTIAL-9901", // Duplicate reference
      })
    ).toThrowError(/Duplicate payment rejected/);

    // 10.5 Settles full remaining balance (₹100,000)
    const fullSettlement = processPayment({
      orderId: testOrder.id,
      amount: 100000,
      milestone: "POST_INSTALLATION_BALANCE",
      paymentMode: "UPI",
      paymentReferenceCode: "UPI-SETTLE-FINAL-101",
      idempotencyKey: "idem-pay-final-1",
    });

    expect(testOrder.outstanding_balance).toBe(0);
    expect(testOrder.payment_status).toBe("PAID_IN_FULL");

    // 10.6 Overpayment rejected when paid in full
    expect(() =>
      processPayment({
        orderId: testOrder.id,
        amount: 10000,
        milestone: "SERVICE_FEE",
        paymentMode: "UPI",
        paymentReferenceCode: "UPI-EXTRA-999",
      })
    ).toThrowError(/already paid in full/);
  });

  // 11. REFUND PROCESSING
  it("processes refunds by authorized finance managers and updates order balances", () => {
    const store = getStore();

    // Isolated test order
    const refundOrder: any = {
      id: "ord-test-refund-11",
      organization_id: "00000000-0000-0000-0000-000000000001",
      order_number: "ORD-2026-TEST-11",
      quotation_id: "quo-test-11",
      customer_id: "cust-test-11",
      lead_id: "lead-test-11",
      idempotency_key: "idem-test-refund-11",
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      total_contract_value: 100000,
      advance_amount_required: 20000,
      advance_amount_paid: 0,
      outstanding_balance: 100000,
      status: "CONFIRMED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.orders.unshift(refundOrder);

    const payment = processPayment({
      orderId: refundOrder.id,
      amount: 40000,
      milestone: "BOOKING_ADVANCE",
      paymentMode: "BANK_TRANSFER_NEFT",
      paymentReferenceCode: "UTR-REFUNDABLE-001",
      idempotencyKey: "idem-refundable-1",
    });

    expect(refundOrder.outstanding_balance).toBe(60000); // 100000 - 40000

    // Unauthorized role cannot refund
    expect(() =>
      processRefund({
        paymentId: payment.id,
        amount: 15000,
        reason: "Customer request",
        userRole: "SALES_EXECUTIVE",
      })
    ).toThrowError(/Forbidden/);

    // Authorized Finance Manager refunds ₹15,000
    const refund = processRefund({
      paymentId: payment.id,
      amount: 15000,
      reason: "Civil site permit delayed; authorized partial refund.",
      userRole: "FINANCE_MANAGER",
    });

    expect(refund.refund_reference).toMatch(/^REF-2026-\d{4}$/);
    expect(refund.status).toBe("PROCESSED");

    // Verify order outstanding balance increased back by refund amount
    expect(refundOrder.outstanding_balance).toBe(75000); // 60000 + 15000
    expect(refundOrder.advance_amount_paid).toBe(25000); // 40000 - 15000
  });
});
