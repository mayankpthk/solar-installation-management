import { describe, it, expect } from "vitest";
import {
  calculateWarrantyDates,
  isUnderWarranty,
  evaluateWarrantyClaim,
} from "@/domain/warranty/checker";

describe("Warranty Duration & Claim Engine", () => {
  it("calculates correct start and end dates based on SKU duration", () => {
    const deliveryDate = new Date("2026-05-15T00:00:00Z");

    const invWarranty = calculateWarrantyDates(deliveryDate, 24);
    expect(invWarranty.startDate.toISOString().slice(0, 10)).toBe("2026-05-15");
    expect(invWarranty.endDate.toISOString().slice(0, 10)).toBe("2028-05-15");

    const panelWarranty = calculateWarrantyDates(deliveryDate, 240);
    expect(panelWarranty.endDate.toISOString().slice(0, 10)).toBe("2046-05-15");
  });

  it("evaluates Scene 5 (Rainy Season Breakdown at 18 months) as WARRANTY_FREE", () => {
    const today = new Date("2026-11-21T00:00:00Z");
    const installDate = new Date("2025-05-21T00:00:00Z"); // 18 months ago
    const warrantyExpiry = new Date("2027-05-21T00:00:00Z"); // 24 months total

    expect(isUnderWarranty(installDate, warrantyExpiry, today)).toBe(true);

    const claim = evaluateWarrantyClaim(installDate, warrantyExpiry, today);
    expect(claim.isCovered).toBe(true);
    expect(claim.billingClassification).toBe("WARRANTY_FREE");
    expect(claim.remainingDays).toBeGreaterThan(0);
    expect(claim.reason).toContain("₹0.00 cost");
  });

  it("evaluates expired warranty breakdown (>24 months) as BILLABLE", () => {
    const today = new Date("2026-11-21T00:00:00Z");
    const installDate = new Date("2024-05-21T00:00:00Z"); // 30 months ago
    const warrantyExpiry = new Date("2026-05-21T00:00:00Z"); // Expired 6 months ago

    expect(isUnderWarranty(installDate, warrantyExpiry, today)).toBe(false);

    const claim = evaluateWarrantyClaim(installDate, warrantyExpiry, today);
    expect(claim.isCovered).toBe(false);
    expect(claim.billingClassification).toBe("BILLABLE");
    expect(claim.remainingDays).toBe(0);
  });
});
