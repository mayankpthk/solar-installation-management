// Domain Engine: SolarOS Financial Management & Job Profitability Engine
// Enforces revenue recognition policies, project-level gross profit & margin calculation,
// separation of cash collections from earned revenue, and avoidance of double counting.

import { getStore, addAuditLogEntry } from "@/lib/data/store";
import {
  Order,
  Payment,
  Refund,
  Expense,
  TechnicianTimeEntry,
  Invoice,
  UserRole,
} from "@/lib/types/database";

export type AccountingPolicy = "PERCENTAGE_OF_COMPLETION" | "COMPLETED_CONTRACT";

export interface ProjectProfitabilityDetail {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  systemCapacityKw: number;
  systemTopology: string;
  orderStatus: string;
  totalContractValue: number; // Invoiced/Agreed contract amount
  netContractRevenue: number; // Excl. GST (typically 12% in India)
  recognizedRevenue: number; // Earned revenue under selected accounting policy
  unearnedAdvanceRevenue: number; // Cash received in excess of recognized revenue (Liability)
  cashCollected: number; // Actual cash collected to date (advance + milestone payments - refunds)
  outstandingBalance: number; // Remaining cash due from customer
  materialCosts: number; // Direct purchase cost of BOM components allocated/installed
  laborCosts: number; // Technician labor cost from time entries (hours * hourly rate)
  logisticsCosts: number; // Direct transport & vehicle fuel expenses
  permitCosts: number; // Discom application fees & local permits
  miscExpenses: number; // Other direct project expenses
  totalDirectCosts: number; // Material + Labor + Logistics + Permits + Misc
  grossProfit: number; // Recognized Revenue - Total Direct Costs
  grossMarginPercent: number; // (Gross Profit / Recognized Revenue) * 100 (where revenue > 0)
  marginHealth: "HEALTHY" | "ACCEPTABLE" | "AT_RISK" | "LOSS";
}

export interface ExecutiveMetrics {
  period: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";
  startDate: string;
  endDate: string;
  accountingPolicy: AccountingPolicy;
  totalProjects: number;
  completedProjects: number;
  unfinishedProjects: number;
  totalContractValue: number;
  recognizedRevenue: number;
  cashCollections: number;
  outstandingBalances: number;
  deferredRevenueAdvances: number;
  totalMaterialCosts: number;
  totalLaborCosts: number;
  totalOperatingExpenses: number;
  totalDirectCosts: number;
  grossProfit: number;
  overallGrossMarginPercent: number;
  openServiceTickets: number;
  warrantyClaimsCount: number;
  lowInventoryCount: number;
  technicianUtilizationPercent: number;
  projectDetails: ProjectProfitabilityDetail[];
}

// Configurable Company Accounting Policy (Default: PERCENTAGE_OF_COMPLETION)
let __accountingPolicy: AccountingPolicy = "PERCENTAGE_OF_COMPLETION";

export function getAccountingPolicy(): AccountingPolicy {
  return __accountingPolicy;
}

export function setAccountingPolicy(
  policy: AccountingPolicy,
  userRole: UserRole,
  userId: string = "system"
): AccountingPolicy {
  if (userRole !== "SUPER_ADMIN" && userRole !== "DIRECTOR" && userRole !== "FINANCE_MANAGER") {
    throw new Error(`Forbidden: User role '${userRole}' is not authorized to modify revenue recognition policy.`);
  }
  const oldPolicy = __accountingPolicy;
  __accountingPolicy = policy;

  addAuditLogEntry({
    performed_by: userId,
    user_role: userRole,
    table_name: "company_settings",
    record_id: "accounting_policy",
    action: "UPDATE",
    old_data: { accounting_policy: oldPolicy },
    new_data: { accounting_policy: policy },
  });

  return __accountingPolicy;
}

// Calculate Recognized Revenue based on configured accounting policy
export function calculateRecognizedRevenue(
  order: Order,
  accountingPolicy: AccountingPolicy = getAccountingPolicy()
): { recognizedRevenue: number; recognitionPercent: number } {
  // Total contract value includes GST (usually 12%). Net contract revenue is ex-tax.
  const netContractValue = Math.round((order.total_contract_value / 1.12) * 100) / 100;

  if (accountingPolicy === "COMPLETED_CONTRACT") {
    if (order.status === "COMPLETED" || order.status === "COMMISSIONED") {
      return { recognizedRevenue: netContractValue, recognitionPercent: 100 };
    }
    return { recognizedRevenue: 0, recognitionPercent: 0 };
  }

  // PERCENTAGE_OF_COMPLETION policy based on verified milestones
  switch (order.status) {
    case "COMPLETED":
    case "COMMISSIONED":
      return { recognizedRevenue: netContractValue, recognitionPercent: 100 };
    case "INSTALLATION_IN_PROGRESS":
      return { recognizedRevenue: Math.round(netContractValue * 0.75 * 100) / 100, recognitionPercent: 75 };
    case "DISPATCHED":
    case "READY_FOR_DISPATCH":
      return { recognizedRevenue: Math.round(netContractValue * 0.5 * 100) / 100, recognitionPercent: 50 };
    case "CONFIRMED":
    case "STAGING":
      return { recognizedRevenue: Math.round(netContractValue * 0.2 * 100) / 100, recognitionPercent: 20 };
    case "CANCELLED":
    default:
      return { recognizedRevenue: 0, recognitionPercent: 0 };
  }
}

// Calculate Project-Wise Profitability
export function calculateOrderProfitability(
  orderId: string,
  accountingPolicy: AccountingPolicy = getAccountingPolicy()
): ProjectProfitabilityDetail {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error(`Order '${orderId}' not found.`);

  const customer = store.customers.find((c) => c.id === order.customer_id);

  // 1. Revenue Recognition
  const netContractRevenue = Math.round((order.total_contract_value / 1.12) * 100) / 100;
  const { recognizedRevenue } = calculateRecognizedRevenue(order, accountingPolicy);

  // 2. Cash Collections & Refunds for this order
  const orderPayments = store.payments.filter(
    (p) => p.order_id === order.id && p.status !== "FAILED"
  );
  const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);

  const orderRefunds = store.refunds.filter(
    (r) => r.order_id === order.id && r.status === "PROCESSED"
  );
  const totalRefunded = orderRefunds.reduce((sum, r) => sum + r.amount, 0);

  const cashCollected = Math.max(0, totalPaid - totalRefunded);
  const outstandingBalance = Math.max(0, order.total_contract_value - cashCollected);
  const unearnedAdvanceRevenue = Math.max(0, cashCollected - recognizedRevenue);

  // 3. Direct Material Costs (COGS allocated to this order)
  // Check for direct hardware expenses or calculate based on allocated components
  const directExpenses = store.expenses.filter((e) => e.order_id === order.id);

  let materialCosts = directExpenses
    .filter((e) => e.category === "HARDWARE")
    .reduce((sum, e) => sum + e.amount, 0);

  // If no manual hardware expense is recorded, calculate from allocated serial numbers / standard BOM
  if (materialCosts === 0) {
    const allocatedSerials = store.serialNumbers.filter((s) => s.order_id === order.id);
    for (const serial of allocatedSerials) {
      const comp = store.components.find((c) => c.id === serial.component_id);
      if (comp && typeof comp.unit_cost === "number") {
        materialCosts += comp.unit_cost;
      }
    }
    // Fallback standard BOM estimate if serials are not fully allocated yet (~60% of net contract)
    if (materialCosts === 0) {
      materialCosts = Math.round(netContractRevenue * 0.6 * 100) / 100;
    }
  }

  // 4. Labor Costs from Technician Time Entries
  const installationJob = store.installations.find((j) => j.order_id === order.id);
  let laborCosts = 0;

  if (installationJob) {
    const timeEntries = store.technicianTimeEntries.filter(
      (t) => t.installation_job_id === installationJob.id
    );
    laborCosts = timeEntries.reduce((sum, t) => sum + t.total_labor_cost, 0);
  }

  // Fallback to recorded LABOR expense or standard rate if no time entries yet
  if (laborCosts === 0) {
    laborCosts = directExpenses
      .filter((e) => e.category === "LABOR")
      .reduce((sum, e) => sum + e.amount, 0);

    if (laborCosts === 0) {
      // Standard: 16 hours @ ₹300/hr = ₹4,800
      laborCosts = 4800;
    }
  }

  // 5. Logistics, Permits and Misc direct expenses
  const logisticsCosts = directExpenses
    .filter((e) => e.category === "LOGISTICS")
    .reduce((sum, e) => sum + e.amount, 0) || 2500;

  const permitCosts = directExpenses
    .filter((e) => e.category === "PERMITS")
    .reduce((sum, e) => sum + e.amount, 0);

  const miscExpenses = directExpenses
    .filter((e) => e.category === "MISC")
    .reduce((sum, e) => sum + e.amount, 0);

  // 6. Direct Project Costs & Gross Profit
  const totalDirectCosts = materialCosts + laborCosts + logisticsCosts + permitCosts + miscExpenses;
  const grossProfit = recognizedRevenue - totalDirectCosts;

  let grossMarginPercent = 0;
  if (recognizedRevenue > 0) {
    grossMarginPercent = Math.round((grossProfit / recognizedRevenue) * 10000) / 100;
  }

  let marginHealth: "HEALTHY" | "ACCEPTABLE" | "AT_RISK" | "LOSS" = "HEALTHY";
  if (grossProfit < 0) {
    marginHealth = "LOSS";
  } else if (grossMarginPercent < 15) {
    marginHealth = "AT_RISK";
  } else if (grossMarginPercent < 25) {
    marginHealth = "ACCEPTABLE";
  } else {
    marginHealth = "HEALTHY";
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerName: customer?.full_name || "Customer",
    systemCapacityKw: order.system_capacity_kw,
    systemTopology: order.system_topology,
    orderStatus: order.status,
    totalContractValue: order.total_contract_value,
    netContractRevenue,
    recognizedRevenue,
    unearnedAdvanceRevenue,
    cashCollected,
    outstandingBalance,
    materialCosts,
    laborCosts,
    logisticsCosts,
    permitCosts,
    miscExpenses,
    totalDirectCosts,
    grossProfit,
    grossMarginPercent,
    marginHealth,
  };
}

// Compute Executive Metrics for Specified Date Range
export function computeExecutiveMetrics(params: {
  period: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";
  startDate?: Date;
  endDate?: Date;
  accountingPolicy?: AccountingPolicy;
}): ExecutiveMetrics {
  const store = getStore();
  const policy = params.accountingPolicy || getAccountingPolicy();

  // Resolve start and end dates
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (params.period === "TODAY") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (params.period === "THIS_WEEK") {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (params.period === "THIS_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (params.period === "CUSTOM") {
    start = params.startDate ? new Date(params.startDate) : new Date(now.getFullYear(), 0, 1);
    end = params.endDate ? new Date(params.endDate) : new Date();
  }

  // Filter orders active or created in window (or all current orders for custom overview)
  const isAllTime = params.period === "CUSTOM" && !params.startDate;
  const filteredOrders = isAllTime
    ? store.orders
    : store.orders.filter((o) => {
        const orderDate = new Date(o.created_at);
        return orderDate >= start && orderDate <= end;
      });

  // Calculate profitability for each order
  const projectDetails = (filteredOrders.length > 0 ? filteredOrders : store.orders).map((o) =>
    calculateOrderProfitability(o.id, policy)
  );

  const completedProjects = projectDetails.filter(
    (p) => p.orderStatus === "COMPLETED" || p.orderStatus === "COMMISSIONED"
  ).length;

  const unfinishedProjects = projectDetails.filter(
    (p) => p.orderStatus !== "COMPLETED" && p.orderStatus !== "COMMISSIONED" && p.orderStatus !== "CANCELLED"
  ).length;

  const totalContractValue = projectDetails.reduce((sum, p) => sum + p.totalContractValue, 0);
  const recognizedRevenue = projectDetails.reduce((sum, p) => sum + p.recognizedRevenue, 0);
  const cashCollections = projectDetails.reduce((sum, p) => sum + p.cashCollected, 0);
  const outstandingBalances = projectDetails.reduce((sum, p) => sum + p.outstandingBalance, 0);
  const deferredRevenueAdvances = projectDetails.reduce((sum, p) => sum + p.unearnedAdvanceRevenue, 0);

  const totalMaterialCosts = projectDetails.reduce((sum, p) => sum + p.materialCosts, 0);
  const totalLaborCosts = projectDetails.reduce((sum, p) => sum + p.laborCosts, 0);

  // Filter expenses incurred in window
  const filteredExpenses = isAllTime
    ? store.expenses
    : store.expenses.filter((e) => {
        const expDate = new Date(e.incurred_date);
        return expDate >= start && expDate <= end;
      });

  const totalOperatingExpenses = (filteredExpenses.length > 0 ? filteredExpenses : store.expenses).reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const totalDirectCosts = projectDetails.reduce((sum, p) => sum + p.totalDirectCosts, 0);
  const grossProfit = recognizedRevenue - totalDirectCosts;

  let overallGrossMarginPercent = 0;
  if (recognizedRevenue > 0) {
    overallGrossMarginPercent = Math.round((grossProfit / recognizedRevenue) * 10000) / 100;
  }

  // Open Service Tickets & Warranty Claims
  const openServiceTickets = store.serviceTickets.filter(
    (t) => t.status !== "CLOSED"
  ).length;

  const warrantyClaimsCount = store.serviceTickets.filter(
    (t) => t.billing_classification === "WARRANTY_FREE" && t.status !== "CLOSED"
  ).length;

  // Low Inventory Items (< reorder_threshold)
  const lowInventoryCount = store.inventoryItems.filter(
    (i) => i.quantity_on_hand <= (i.reorder_threshold || 5)
  ).length;

  // Technician Utilization
  const totalTechnicians = Math.max(1, store.technicians.length);
  // Standard capacity = 160 hours per month per technician
  const totalLoggedHours = store.technicianTimeEntries.reduce(
    (sum, t) => sum + t.total_hours,
    0
  );
  const standardHoursCapacity = totalTechnicians * 160;
  const technicianUtilizationPercent = Math.min(
    100,
    Math.round((totalLoggedHours / standardHoursCapacity) * 10000) / 100
  );

  return {
    period: params.period,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    accountingPolicy: policy,
    totalProjects: projectDetails.length,
    completedProjects,
    unfinishedProjects,
    totalContractValue,
    recognizedRevenue,
    cashCollections,
    outstandingBalances,
    deferredRevenueAdvances,
    totalMaterialCosts,
    totalLaborCosts,
    totalOperatingExpenses,
    totalDirectCosts,
    grossProfit,
    overallGrossMarginPercent,
    openServiceTickets,
    warrantyClaimsCount,
    lowInventoryCount,
    technicianUtilizationPercent,
    projectDetails,
  };
}
