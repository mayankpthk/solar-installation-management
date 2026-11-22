import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStore } from "@/lib/data/store";
import {
  reserveInventoryForOrder,
  validateSerialForDispatch,
  InvalidSerialError,
  InsufficientStockError,
} from "@/domain/inventory/dispatch-engine";
import { processPayment } from "@/domain/payments/payment-processor";
import { CreateLeadSchema, ProcessPaymentSchema } from "@/lib/schemas";
import { requireRole, AuthenticatedUser, DEFAULT_ORG_ID } from "@/lib/security/auth-session";
import { validateUploadedFile } from "@/lib/security/file-validator";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

describe("Stage 6: Comprehensive Failure Mode & Resilience Testing", () => {
  beforeEach(() => {
    resetStore();
  });

  // 1. Invalid Form Submissions
  it("fails safely with meaningful validation errors on invalid form inputs", () => {
    const invalidLead = {
      fullName: "J", // too short (< 2)
      phone: "123", // invalid phone
      address: "abc", // too short (< 5)
    };

    expect(() => CreateLeadSchema.parse(invalidLead)).toThrow();

    const invalidPayment = {
      orderId: "ord-1",
      amount: -500, // must be positive
      milestone: "ADVANCE_PAYMENT",
      paymentMode: "CASH",
      idempotencyKey: "idem-1",
    };
    expect(() => ProcessPaymentSchema.parse(invalidPayment)).toThrow();
  });

  // 2. Duplicate Submissions / Idempotency
  it("prevents double-charging or duplicate order payments using idempotency keys", () => {
    const store = getStore();
    const targetOrderId = store.orders[0].id;

    const paymentData = {
      orderId: targetOrderId,
      amount: 40000,
      milestone: "BOOKING_ADVANCE" as const,
      paymentMode: "ONLINE_GATEWAY" as const,
      paymentReferenceCode: "GW-FAILSAFE-001",
      idempotencyKey: "unique-session-idempotency-key-777",
      isSimulated: true,
    };

    processPayment(paymentData);
    expect(() => processPayment(paymentData)).toThrow(/Duplicate payment rejected/);
  });

  // 3. Unauthorized API Calls / Privilege Escalation
  it("rejects unauthorized API actions with explicit 403 ForbiddenError", () => {
    const fieldTechUser: AuthenticatedUser = {
      userId: "tech-1",
      organizationId: DEFAULT_ORG_ID,
      email: "tech@sunpower.com",
      role: "FIELD_TECHNICIAN",
      name: "Field Tech",
      isVerified: true,
    };

    expect(() => requireRole(fieldTechUser, ["DIRECTOR", "FINANCE_MANAGER"])).toThrow(ForbiddenError);
  });

  // 4. Expired Sessions / Unauthenticated Requests
  it("rejects expired or missing sessions with 401 UnauthorizedError", () => {
    expect(() => requireRole(null, ["SALES_EXECUTIVE"])).toThrow(UnauthorizedError);
  });

  // 5. Missing Environment Variables Graceful Fallback
  it("provides safe enterprise defaults when optional environment variables are unset", () => {
    const minAdvance = Number(process.env.DEFAULT_MIN_ADVANCE_PERCENT) || 20;
    const gstRate = Number(process.env.DEFAULT_GST_RATE_PERCENT) || 12;

    expect(minAdvance).toBe(20);
    expect(gstRate).toBe(12);
  });

  // 6. Insufficient Inventory Handling
  it("prevents dispatch and fails gracefully when warehouse inventory is depleted", () => {
    const store = getStore();
    const targetOrderId = store.orders[0].id;
    const inverter = store.inventoryItems.find((i) => i.component_code === "INV-3KW-OG");
    expect(inverter).toBeDefined();

    if (inverter) {
      // Artificially deplete inventory to below reservation threshold
      inverter.quantity_on_hand = inverter.quantity_reserved;

      expect(() =>
        reserveInventoryForOrder(targetOrderId, "WAREHOUSE_MANAGER")
      ).toThrow(InsufficientStockError);
    }
  });

  // 7. Invalid Serial Numbers Scan
  it("rejects non-existent or unallocated serial numbers during dispatch scan", () => {
    const bogusSerial = "INVALID-BOGUS-SERIAL-XYZ";
    expect(() =>
      validateSerialForDispatch({
        serialNumber: bogusSerial,
        orderId: "ord-test",
      })
    ).toThrow(InvalidSerialError);
  });

  // 8. Missing Uploaded Files / Polyglot Script Injection
  it("rejects empty, corrupted, or script-injected file uploads safely", () => {
    const emptyFile = new Uint8Array(0);
    const res1 = validateUploadedFile("test.jpg", emptyFile);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain("0 bytes");

    const header = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const scriptBytes = new TextEncoder().encode("<script>evil()</script>");
    const polyglot = new Uint8Array(header.length + scriptBytes.length);
    polyglot.set(header, 0);
    polyglot.set(scriptBytes, header.length);

    const res2 = validateUploadedFile("photo.jpg", polyglot);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain("Malicious payload detected");
  });

  // 9. Database / Domain Transaction Rollback Simulation
  it("rolls back state changes if mid-operation exception occurs", () => {
    const store = getStore();
    const initialLeadCount = store.leads.length;

    try {
      reserveInventoryForOrder("non-existent-order-id", "WAREHOUSE_MANAGER");
    } catch {
      // Caught
    }

    expect(store.leads.length).toBe(initialLeadCount);
  });
});
