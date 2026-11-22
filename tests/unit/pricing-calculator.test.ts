import { describe, it, expect } from "vitest";
import { calculateQuotationPricing, calculateSubsidyAmount } from "@/domain/pricing/calculator";

describe("Pricing, GST & Government Subsidy Engine", () => {
  it("computes PM Surya Ghar subsidy slabs accurately", () => {
    expect(calculateSubsidyAmount(1.0)).toBe(30000);
    expect(calculateSubsidyAmount(2.0)).toBe(60000);
    expect(calculateSubsidyAmount(3.0)).toBe(78000);
    expect(calculateSubsidyAmount(4.0)).toBe(78000);
    expect(calculateSubsidyAmount(5.0)).toBe(78000);
  });

  it("calculates 12% GST and net payable after subsidy deduction", () => {
    const pricing = calculateQuotationPricing({
      bomTotalCost: 145000,
      capacityKw: 3.0,
      laborRatePerKw: 4000,
      logisticsCost: 2500,
      discount: 0,
    });

    expect(pricing.installationCharges).toBe(12000); // 3 * 4000
    expect(pricing.taxableAmount).toBe(159500); // 145000 + 12000 + 2500
    expect(pricing.taxAmount).toBe(19140); // 12% of 159500
    expect(pricing.grossTotal).toBe(178640);
    expect(pricing.estimatedSubsidy).toBe(78000);
    expect(pricing.netPayableByCustomer).toBe(100640); // 178640 - 78000
  });

  it("handles discount overrides accurately", () => {
    const pricing = calculateQuotationPricing({
      bomTotalCost: 100000,
      capacityKw: 2.0,
      discount: 5000,
    });

    expect(pricing.discountAmount).toBe(5000);
    expect(pricing.taxableAmount).toBe(105500); // (100k + 8k + 2.5k) - 5k
  });
});
