// Domain Engine: SolarOS Executive Intelligence & Statutory Reporting Engine
// Generates 9 comprehensive audit-grade reports with role-based access control and CSV/PDF export data structures.

import { getStore } from "@/lib/data/store";
import { UserRole } from "@/lib/types/database";
import { computeExecutiveMetrics, calculateOrderProfitability, getAccountingPolicy } from "@/domain/finance/finance-engine";

export interface ReportPayload {
  reportId: string;
  title: string;
  period: string;
  generatedAt: string;
  generatedByRole?: UserRole;
  summary: Record<string, string | number>;
  headers: string[];
  rows: Array<Record<string, string | number>>;
  toCSV: () => string;
}

// Role-Based Report Access Control Matrix
export function canAccessReport(userRole: UserRole, reportId: string): boolean {
  if (userRole === "SUPER_ADMIN" || userRole === "DIRECTOR") {
    return true; // Directors and Super Admins have unrestricted access
  }

  switch (reportId) {
    case "REVENUE":
    case "OUTSTANDING_PAYMENTS":
      return userRole === "FINANCE_MANAGER" || userRole === "SALES_MANAGER";
    case "EXPENSES":
    case "PROJECT_PROFITABILITY":
      return userRole === "FINANCE_MANAGER";
    case "INVENTORY_VALUATION":
      return userRole === "WAREHOUSE_MANAGER" || userRole === "FINANCE_MANAGER" || userRole === "OPERATIONS_MANAGER";
    case "TECHNICIAN_PERFORMANCE":
      return userRole === "INSTALLATION_MANAGER" || userRole === "OPERATIONS_MANAGER";
    case "WARRANTY":
    case "SERVICE_TICKETS":
      return userRole === "INSTALLATION_MANAGER" || userRole === "OPERATIONS_MANAGER";
    case "SUBSIDY":
      return userRole === "SALES_MANAGER" || userRole === "FINANCE_MANAGER" || userRole === "OPERATIONS_MANAGER";
    default:
      return false;
  }
}

// CSV Conversion Helper with RFC-4180 Escaping
function convertToCSV(headers: string[], rows: Array<Record<string, string | number>>): string {
  const escapeCell = (val: string | number): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = rows.map((r) => headers.map((h) => escapeCell(r[h] ?? "")).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

// 1. Revenue Report
export function generateRevenueReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const policy = getAccountingPolicy();
  const metrics = computeExecutiveMetrics({ period: "THIS_MONTH", accountingPolicy: policy });

  const headers = [
    "Order Number",
    "Customer Name",
    "System Capacity (kW)",
    "Contract Value (INR)",
    "Net Value Ex-Tax (INR)",
    "Recognized Revenue (INR)",
    "Cash Collected (INR)",
    "Deferred Advance (INR)",
    "Order Status",
  ];

  const rows = metrics.projectDetails.map((p) => ({
    "Order Number": p.orderNumber,
    "Customer Name": p.customerName,
    "System Capacity (kW)": p.systemCapacityKw,
    "Contract Value (INR)": p.totalContractValue,
    "Net Value Ex-Tax (INR)": p.netContractRevenue,
    "Recognized Revenue (INR)": p.recognizedRevenue,
    "Cash Collected (INR)": p.cashCollected,
    "Deferred Advance (INR)": p.unearnedAdvanceRevenue,
    "Order Status": p.orderStatus,
  }));

  return {
    reportId: "REVENUE",
    title: "Executive Revenue & Collections Statement",
    period: "Current Accounting Period",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Contract Value (INR)": metrics.totalContractValue,
      "Recognized Earned Revenue (INR)": metrics.recognizedRevenue,
      "Total Cash Collected (INR)": metrics.cashCollections,
      "Unearned Advance Liability (INR)": metrics.deferredRevenueAdvances,
      "Accounting Policy": policy,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 2. Expense Report
export function generateExpenseReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["Expense ID", "Category", "Amount (INR)", "Order Ref", "Description", "Incurred Date", "Recorded By"];

  const rows = store.expenses.map((e) => ({
    "Expense ID": e.id,
    "Category": e.category,
    "Amount (INR)": e.amount,
    "Order Ref": e.order_id || "Overhead",
    "Description": e.description,
    "Incurred Date": e.incurred_date,
    "Recorded By": e.recorded_by,
  }));

  const totalExpense = store.expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    reportId: "EXPENSES",
    title: "Operating & Project Direct Expense Statement",
    period: "All Incurred Dates",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Operating Expenses (INR)": totalExpense,
      "Hardware Withdrawals": store.expenses.filter((e) => e.category === "HARDWARE").reduce((sum, e) => sum + e.amount, 0),
      "Logistics & Transit": store.expenses.filter((e) => e.category === "LOGISTICS").reduce((sum, e) => sum + e.amount, 0),
      "Permits & Discom": store.expenses.filter((e) => e.category === "PERMITS").reduce((sum, e) => sum + e.amount, 0),
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 3. Project Profitability Report
export function generateProjectProfitabilityReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const policy = getAccountingPolicy();
  const details = store.orders.map((o) => calculateOrderProfitability(o.id, policy));

  const headers = [
    "Order Number",
    "Customer",
    "Recognized Revenue (INR)",
    "Material Cost (INR)",
    "Labor Cost (INR)",
    "Logistics & Other (INR)",
    "Total Direct Cost (INR)",
    "Gross Profit (INR)",
    "Margin %",
    "Health Status",
  ];

  const rows = details.map((d) => ({
    "Order Number": d.orderNumber,
    "Customer": d.customerName,
    "Recognized Revenue (INR)": d.recognizedRevenue,
    "Material Cost (INR)": d.materialCosts,
    "Labor Cost (INR)": d.laborCosts,
    "Logistics & Other (INR)": d.logisticsCosts + d.permitCosts + d.miscExpenses,
    "Total Direct Cost (INR)": d.totalDirectCosts,
    "Gross Profit (INR)": d.grossProfit,
    "Margin %": `${d.grossMarginPercent}%`,
    "Health Status": d.marginHealth,
  }));

  const totalRevenue = details.reduce((sum, d) => sum + d.recognizedRevenue, 0);
  const totalProfit = details.reduce((sum, d) => sum + d.grossProfit, 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0;

  return {
    reportId: "PROJECT_PROFITABILITY",
    title: "Project-Wise Gross Profitability & Job Costing Ledger",
    period: "Active Installations",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Recognized Revenue (INR)": totalRevenue,
      "Total Gross Profit (INR)": totalProfit,
      "Average Gross Margin %": `${avgMargin}%`,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 4. Inventory Valuation Report
export function generateInventoryValuationReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["SKU Code", "Product Name", "Category", "On-Hand Qty", "Cost Price (INR)", "Selling Price (INR)", "Asset Valuation (INR)", "Stock Status"];

  const rows = store.components.map((c) => {
    const invItem = store.inventoryItems.find((i) => i.component_id === c.id);
    const qty = invItem ? invItem.quantity_on_hand : 0;
    const valuation = qty * (c.unit_cost || 0);
    const isLow = qty <= (invItem?.reorder_threshold || 5);

    return {
      "SKU Code": c.component_code,
      "Product Name": c.name,
      "Category": c.category,
      "On-Hand Qty": qty,
      "Cost Price (INR)": c.unit_cost || 0,
      "Selling Price (INR)": c.base_selling_price || 0,
      "Asset Valuation (INR)": valuation,
      "Stock Status": isLow ? "LOW_STOCK_ALERT" : "HEALTHY",
    };
  });

  const totalValuation = rows.reduce((sum, r) => sum + Number(r["Asset Valuation (INR)"]), 0);

  return {
    reportId: "INVENTORY_VALUATION",
    title: "Warehouse Inventory Stock & Asset Valuation Statement",
    period: "Real-Time Balance",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Inventory Asset Value (INR)": totalValuation,
      "Total Catalog SKUs": rows.length,
      "Low Stock SKUs Count": rows.filter((r) => r["Stock Status"] === "LOW_STOCK_ALERT").length,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 5. Technician Performance & Utilization Report
export function generateTechnicianPerformanceReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["Technician ID", "Name", "Phone", "Jobs Completed", "Total Hours Logged", "Total Labor Billed (INR)", "Utilization Rate %"];

  const rows = store.technicians.map((t) => {
    const timeEntries = store.technicianTimeEntries.filter((te) => te.technician_id === t.profile_id);
    const hours = timeEntries.reduce((sum, te) => sum + te.total_hours, 0);
    const labor = timeEntries.reduce((sum, te) => sum + te.total_labor_cost, 0);
    const completedJobs = store.installations.filter(
      (j) => j.lead_technician_id === t.profile_id && (j.status === "APPROVED" || j.status === "CUSTOMER_SIGNED")
    ).length;

    // Standard 160h monthly capacity
    const utilRate = Math.min(100, Math.round((hours / 160) * 10000) / 100);

    return {
      "Technician ID": t.id,
      "Name": t.name,
      "Phone": t.phone,
      "Jobs Completed": completedJobs,
      "Total Hours Logged": hours,
      "Total Labor Billed (INR)": labor,
      "Utilization Rate %": `${utilRate}%`,
    };
  });

  const totalHours = rows.reduce((sum, r) => sum + Number(r["Total Hours Logged"]), 0);

  return {
    reportId: "TECHNICIAN_PERFORMANCE",
    title: "Field Technician Time Allocation & Utilization Report",
    period: "Monthly Roster",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Field Technicians": store.technicians.length,
      "Total Hours Logged": totalHours,
      "Average Hours per Tech": Math.round((totalHours / Math.max(1, store.technicians.length)) * 10) / 10,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 6. Outstanding Payment Report
export function generateOutstandingPaymentReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["Order Number", "Customer Name", "Customer Phone", "Contract Value (INR)", "Amount Paid (INR)", "Balance Due (INR)", "Payment Status"];

  const rows = store.orders.map((o) => {
    const customer = store.customers.find((c) => c.id === o.customer_id);
    const payments = store.payments.filter((p) => p.order_id === o.id && p.status !== "FAILED");
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, o.total_contract_value - paid);

    return {
      "Order Number": o.order_number,
      "Customer Name": customer?.full_name || "Customer",
      "Customer Phone": customer?.phone || "N/A",
      "Contract Value (INR)": o.total_contract_value,
      "Amount Paid (INR)": paid,
      "Balance Due (INR)": balance,
      "Payment Status": balance === 0 ? "FULLY_SETTLED" : paid > 0 ? "PARTIALLY_PAID" : "UNPAID",
    };
  });

  const totalOutstanding = rows.reduce((sum, r) => sum + Number(r["Balance Due (INR)"]), 0);

  return {
    reportId: "OUTSTANDING_PAYMENTS",
    title: "Aged Accounts Receivable & Outstanding Balances",
    period: "As of Today",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Outstanding Receivables (INR)": totalOutstanding,
      "Fully Settled Accounts": rows.filter((r) => r["Payment Status"] === "FULLY_SETTLED").length,
      "Pending Collections Count": rows.filter((r) => r["Payment Status"] !== "FULLY_SETTLED").length,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 7. Warranty Report
export function generateWarrantyReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const now = Date.now();
  const headers = ["Warranty ID", "Component", "Serial Number", "Customer", "Start Date", "End Date", "Status", "Days Left"];

  const rows = store.warranties.map((w) => {
    const end = new Date(w.warranty_end_date).getTime();
    const daysLeft = Math.round((end - now) / 86400000);

    return {
      "Warranty ID": w.id,
      "Component": w.component_name || "Solar Component",
      "Serial Number": w.serial_number || "N/A",
      "Customer": w.customer_name || "Customer",
      "Start Date": w.warranty_start_date,
      "End Date": w.warranty_end_date,
      "Status": w.status,
      "Days Left": daysLeft > 0 ? daysLeft : 0,
    };
  });

  return {
    reportId: "WARRANTY",
    title: "Equipment Warranty Coverage & Entitlement Audit",
    period: "Active Fleet",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Active Warranties": store.warranties.filter((w) => w.status === "ACTIVE").length,
      "Expired Warranties": store.warranties.filter((w) => w.status === "EXPIRED").length,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 8. Service Ticket Report
export function generateServiceTicketReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["Ticket Number", "Customer", "Serial Number", "Fault Code", "Classification", "Priority", "Status", "Total Cost (INR)"];

  const rows = store.serviceTickets.map((t) => ({
    "Ticket Number": t.ticket_number,
    "Customer": t.customer_name || "Customer",
    "Serial Number": t.serial_number || "N/A",
    "Fault Code": t.reported_fault_code || "GEN",
    "Classification": t.billing_classification,
    "Priority": t.priority || "MEDIUM",
    "Status": t.status,
    "Total Cost (INR)": t.billing_classification === "WARRANTY_FREE" ? 0 : (t.total_estimate || 0),
  }));

  return {
    reportId: "SERVICE_TICKETS",
    title: "After-Sales Service Breakdown & RMA Ledger",
    period: "All Logged Support Calls",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Support Tickets": store.serviceTickets.length,
      "Warranty Free (INR 0.00)": store.serviceTickets.filter((t) => t.billing_classification === "WARRANTY_FREE").length,
      "Billable Support Calls": store.serviceTickets.filter((t) => t.billing_classification === "BILLABLE").length,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}

// 9. Subsidy Report
export function generateSubsidyReport(userRole?: UserRole): ReportPayload {
  const store = getStore();
  const headers = ["Application Ref", "Order Ref", "Discom Name", "Eligible CFA (INR)", "Disbursed (INR)", "Current Stage", "Lodged Date"];

  const rows = store.subsidies.map((s) => ({
    "Application Ref": s.portal_application_number || s.id,
    "Order Ref": s.order_id,
    "Discom Name": s.discom_name,
    "Eligible CFA (INR)": s.subsidy_amount_eligible,
    "Disbursed (INR)": s.disbursed_amount || 0,
    "Current Stage": s.status,
    "Lodged Date": new Date(s.created_at).toLocaleDateString(),
  }));

  const totalEligible = store.subsidies.reduce((sum, s) => sum + s.subsidy_amount_eligible, 0);
  const totalDisbursed = store.subsidies.reduce((sum, s) => sum + (s.disbursed_amount || 0), 0);

  return {
    reportId: "SUBSIDY",
    title: "PM Surya Ghar & Discom Subsidy Pipeline Statement",
    period: "Active Applications",
    generatedAt: new Date().toISOString(),
    generatedByRole: userRole,
    summary: {
      "Total Subsidies Eligible (INR)": totalEligible,
      "Total Subsidies Disbursed (INR)": totalDisbursed,
      "Disbursement Rate": `${totalEligible > 0 ? Math.round((totalDisbursed / totalEligible) * 100) : 0}%`,
    },
    headers,
    rows,
    toCSV: () => convertToCSV(headers, rows),
  };
}
