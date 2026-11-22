import { describe, it, expect } from "vitest";
import { calculateJobProfitability } from "@/domain/costing/calculator";

describe("Job Costing & Profitability Engine (Scene 6)", () => {
  it("computes net job profit and margin % accurately", () => {
    // A 3 kW On-Grid installation:
    // Revenue (Excl Tax) = ₹1,59,500
    // Hardware BOM Cost = ₹1,08,000
    // Labor: 16 technician hours @ ₹250/hr = ₹4,000
    // Logistics = ₹2,500
    const result = calculateJobProfitability({
      netContractRevenue: 159500,
      hardwareBOMCost: 108000,
      laborHours: 16,
      averageHourlyWage: 250,
      logisticsCost: 2500,
      miscCost: 0,
    });

    expect(result.laborCost).toBe(4000);
    expect(result.totalDirectCost).toBe(114500); // 108k + 4k + 2.5k
    expect(result.grossProfit).toBe(45000); // 159500 - 114500
    expect(result.grossMarginPercent).toBe(28.21); // (45000 / 159500) * 100
    expect(result.healthIndicator).toBe("HEALTHY");
  });

  it("flags low-margin and loss-making jobs with warning indicators", () => {
    const lowMarginJob = calculateJobProfitability({
      netContractRevenue: 100000,
      hardwareBOMCost: 80000,
      laborHours: 30,
      averageHourlyWage: 300, // ₹9,000
      logisticsCost: 3000, // Total cost = ₹92,000 -> Gross profit = ₹8,000 (8%)
    });

    expect(lowMarginJob.grossMarginPercent).toBe(8.0);
    expect(lowMarginJob.healthIndicator).toBe("AT_RISK");

    const lossJob = calculateJobProfitability({
      netContractRevenue: 80000,
      hardwareBOMCost: 75000,
      laborHours: 30,
      averageHourlyWage: 300,
      logisticsCost: 3000, // Total cost = ₹87,000 -> Gross profit = -₹7,000
    });

    expect(lossJob.grossProfit).toBe(-7000);
    expect(lossJob.healthIndicator).toBe("LOSS");
  });
});
