// Domain Engine: Job Costing & Gross Profitability Calculator

export interface JobCostingInput {
  netContractRevenue: number; // Excl. GST
  hardwareBOMCost: number;
  laborHours: number;
  averageHourlyWage: number;
  logisticsCost?: number;
  miscCost?: number;
}

export type MarginHealth = "HEALTHY" | "ACCEPTABLE" | "AT_RISK" | "LOSS";

export interface JobProfitabilityResult {
  netRevenue: number;
  hardwareCost: number;
  laborCost: number;
  logisticsCost: number;
  miscCost: number;
  totalDirectCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  healthIndicator: MarginHealth;
}

export function calculateJobProfitability(input: JobCostingInput): JobProfitabilityResult {
  const netRevenue = input.netContractRevenue;
  const hardwareCost = input.hardwareBOMCost;
  const laborCost = input.laborHours * input.averageHourlyWage;
  const logisticsCost = input.logisticsCost ?? 2500;
  const miscCost = input.miscCost ?? 0;

  const totalDirectCost = hardwareCost + laborCost + logisticsCost + miscCost;
  const grossProfit = netRevenue - totalDirectCost;

  let grossMarginPercent = 0;
  if (netRevenue > 0) {
    grossMarginPercent = Math.round((grossProfit / netRevenue) * 10000) / 100;
  }

  let healthIndicator: MarginHealth = "HEALTHY";
  if (grossProfit < 0) {
    healthIndicator = "LOSS";
  } else if (grossMarginPercent < 15) {
    healthIndicator = "AT_RISK";
  } else if (grossMarginPercent < 25) {
    healthIndicator = "ACCEPTABLE";
  } else {
    healthIndicator = "HEALTHY";
  }

  return {
    netRevenue,
    hardwareCost,
    laborCost,
    logisticsCost,
    miscCost,
    totalDirectCost,
    grossProfit,
    grossMarginPercent,
    healthIndicator,
  };
}
