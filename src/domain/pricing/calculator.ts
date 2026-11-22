// Domain Engine: Quotation Pricing, GST & Government Subsidy Slabs

export interface PricingInput {
  bomTotalCost: number;
  capacityKw: number;
  laborRatePerKw?: number;
  logisticsCost?: number;
  discount?: number;
  gstRatePercent?: number;
}

export interface PricingResult {
  hardwareTotal: number;
  installationCharges: number;
  logisticsCharges: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grossTotal: number;
  estimatedSubsidy: number;
  netPayableByCustomer: number;
}

/**
 * Calculates national PM Surya Ghar Muft Bijli Yojana Government Subsidy Slabs:
 * - 1 kW: ₹30,000
 * - 2 kW: ₹60,000 (₹30,000 * 2)
 * - 3 kW: ₹78,000 (₹60,000 + ₹18,000)
 * - >3 kW: Capped at ₹78,000 max subsidy
 */
export function calculateSubsidyAmount(capacityKw: number): number {
  if (capacityKw <= 0) return 0;
  if (capacityKw <= 1) return 30000;
  if (capacityKw <= 2) return 60000;
  return 78000; // 3 kW and above is capped at ₹78,000
}

export function calculateQuotationPricing(input: PricingInput): PricingResult {
  const hardwareTotal = input.bomTotalCost;
  const laborRate = input.laborRatePerKw ?? 4000;
  const installationCharges = laborRate * input.capacityKw;
  const logisticsCharges = input.logisticsCost ?? 2500;
  const discountAmount = Math.max(0, input.discount ?? 0);
  const gstRate = input.gstRatePercent ?? 12.0;

  const preDiscountTaxable = hardwareTotal + installationCharges + logisticsCharges;
  const taxableAmount = Math.max(0, preDiscountTaxable - discountAmount);
  const taxAmount = Math.round((taxableAmount * gstRate) / 100);
  const grossTotal = taxableAmount + taxAmount;

  const estimatedSubsidy = calculateSubsidyAmount(input.capacityKw);
  const netPayableByCustomer = Math.max(0, grossTotal - estimatedSubsidy);

  return {
    hardwareTotal,
    installationCharges,
    logisticsCharges,
    discountAmount,
    taxableAmount,
    taxAmount,
    grossTotal,
    estimatedSubsidy,
    netPayableByCustomer,
  };
}
