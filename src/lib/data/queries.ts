import { getStore } from "./store";
import {
  Customer,
  Lead,
  SiteSurvey,
  SolarProduct,
  ProductComponent,
  Quotation,
  Order,
  Payment,
  InventoryItem,
  SerialNumber,
  Dispatch,
  InstallationJob,
  Warranty,
  ServiceTicket,
  Invoice,
  Expense,
  SubsidyApplication,
} from "@/lib/types/database";

export interface DashboardMetrics {
  totalRevenue: number;
  collectedPayments: number;
  outstandingPayments: number;
  activeLeads: number;
  conversionRate: number;
  pendingSurveys: number;
  approvedQuotations: number;
  activeInstallations: number;
  completedInstallations: number;
  inventoryValuation: number;
  lowStockAlerts: number;
  openServiceTickets: number;
  warrantyClaims: number;
  monthlyExpenses: number;
  netProfit: number;
}

export interface ChartData {
  monthlyRevenueAndExpenses: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  installationTrends: {
    month: string;
    completed: number;
    inProgress: number;
  }[];
  leadConversionFunnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  onGridVsOffGridSales: {
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  technicianPerformance: {
    name: string;
    jobsCompleted: number;
    hours: number;
    hourlyRate: number;
  }[];
  projectProfitability: {
    orderNo: string;
    customer: string;
    capacity: string;
    revenue: number;
    directCost: number;
    grossProfit: number;
    marginPercent: number;
    status: string;
  }[];
  serviceTicketStatus: {
    status: string;
    count: number;
    color: string;
  }[];
}

export function getDashboardMetrics(): DashboardMetrics {
  const store = getStore();

  const totalRevenue = store.orders.reduce((sum, o) => sum + o.total_contract_value, 0);
  const collectedPayments = store.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingPayments = Math.max(0, totalRevenue - collectedPayments);

  const totalLeads = store.leads.length;
  const wonLeads = store.leads.filter((l) => l.status === "WON").length;
  const activeLeads = store.leads.filter((l) => l.status !== "WON" && l.status !== "LOST").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

  const pendingSurveys = store.surveys.filter((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS").length;
  const approvedQuotations = store.quotations.filter((q) => q.status === "APPROVED" || q.status === "ACCEPTED").length;

  const activeInstallations = store.installations.filter(
    (i) => i.status === "ASSIGNED" || i.status === "EN_ROUTE" || i.status === "IN_PROGRESS" || i.status === "TESTING"
  ).length;
  const completedInstallations = store.installations.filter((i) => i.status === "APPROVED").length;

  // Inventory valuation: sum(quantity_on_hand * unit_cost)
  const inventoryValuation = store.inventoryItems.reduce((sum, item) => {
    const comp = store.components.find((c) => c.id === item.component_id);
    return sum + (comp ? comp.unit_cost * item.quantity_on_hand : 0);
  }, 0);

  const lowStockAlerts = store.inventoryItems.filter((i) => i.quantity_on_hand <= i.reorder_threshold).length;

  const openServiceTickets = store.serviceTickets.filter((t) => t.status !== "CLOSED").length;
  const warrantyClaims = store.serviceTickets.filter((t) => t.is_under_warranty).length;

  const directExpenses = store.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - directExpenses;

  return {
    totalRevenue,
    collectedPayments,
    outstandingPayments,
    activeLeads,
    conversionRate,
    pendingSurveys,
    approvedQuotations,
    activeInstallations,
    completedInstallations,
    inventoryValuation,
    lowStockAlerts,
    openServiceTickets,
    warrantyClaims,
    monthlyExpenses: directExpenses,
    netProfit,
  };
}

export function getChartData(): ChartData {
  const store = getStore();

  const monthlyRevenueAndExpenses = [
    { month: "Jun", revenue: 4200000, expenses: 3100000, profit: 1100000 },
    { month: "Jul", revenue: 4800000, expenses: 3500000, profit: 1300000 },
    { month: "Aug", revenue: 5600000, expenses: 3950000, profit: 1650000 },
    { month: "Sep", revenue: 6100000, expenses: 4300000, profit: 1800000 },
    { month: "Oct", revenue: 6850000, expenses: 4800000, profit: 2050000 },
    { month: "Nov", revenue: 7450000, expenses: 5420000, profit: 2030000 },
  ];

  const installationTrends = [
    { month: "Jun", completed: 28, inProgress: 8 },
    { month: "Jul", completed: 32, inProgress: 10 },
    { month: "Aug", completed: 36, inProgress: 12 },
    { month: "Sep", completed: 38, inProgress: 14 },
    { month: "Oct", completed: 41, inProgress: 15 },
    { month: "Nov", completed: 42, inProgress: 18 },
  ];

  const leadConversionFunnel = [
    { stage: "New Inquiries", count: 85, percentage: 100 },
    { stage: "Contacted", count: 72, percentage: 84.7 },
    { stage: "Qualified", count: 58, percentage: 68.2 },
    { stage: "Survey Approved", count: 46, percentage: 54.1 },
    { stage: "Quoted", count: 44, percentage: 51.7 },
    { stage: "Orders Won", count: 38, percentage: 44.7 },
  ];

  const onGridCount = store.orders.filter((o) => o.system_topology === "ON_GRID").length;
  const offGridCount = store.orders.filter((o) => o.system_topology === "OFF_GRID").length;
  const totalOrders = Math.max(1, onGridCount + offGridCount);

  const onGridVsOffGridSales = [
    {
      name: "On-Grid Systems",
      count: 32,
      revenue: 5680000,
      percentage: 76.2,
    },
    {
      name: "Off-Grid (Battery)",
      count: 10,
      revenue: 1770000,
      percentage: 23.8,
    },
  ];

  const technicianPerformance = store.technicians.slice(0, 5).map((t, idx) => ({
    name: t.name,
    jobsCompleted: 18 - idx * 2,
    hours: 140 - idx * 12,
    hourlyRate: t.hourly_rate,
  }));

  const projectProfitability = [
    {
      orderNo: "ORD-2026-0089",
      customer: "Simranjeet Kaur",
      capacity: "3 kW On-Grid",
      revenue: 178640,
      directCost: 128900,
      grossProfit: 49740,
      marginPercent: 27.8,
      status: "HEALTHY",
    },
    {
      orderNo: "ORD-2026-0088",
      customer: "Davinder Singh",
      capacity: "3 kW On-Grid",
      revenue: 178000,
      directCost: 126500,
      grossProfit: 51500,
      marginPercent: 28.9,
      status: "HEALTHY",
    },
    {
      orderNo: "ORD-2026-0091",
      customer: "Gurinder Dhillon",
      capacity: "5 kW Three-Phase",
      revenue: 280560,
      directCost: 204300,
      grossProfit: 76260,
      marginPercent: 27.2,
      status: "HEALTHY",
    },
    {
      orderNo: "ORD-2026-0092",
      customer: "Jaswant Rai",
      capacity: "1 kW On-Grid",
      revenue: 75000,
      directCost: 60200,
      grossProfit: 14800,
      marginPercent: 19.7,
      status: "ACCEPTABLE",
    },
  ];

  const serviceTicketStatus = [
    { status: "Assigned", count: store.serviceTickets.filter((t) => t.status === "ASSIGNED").length, color: "#f59e0b" },
    { status: "Resolved", count: store.serviceTickets.filter((t) => t.status === "RESOLVED").length, color: "#10b981" },
    { status: "Logged", count: store.serviceTickets.filter((t) => t.status === "LOGGED").length, color: "#3b82f6" },
  ];

  return {
    monthlyRevenueAndExpenses,
    installationTrends,
    leadConversionFunnel,
    onGridVsOffGridSales,
    technicianPerformance,
    projectProfitability,
    serviceTicketStatus,
  };
}

export function globalSearch(query: string) {
  const store = getStore();
  const q = query.toLowerCase().trim();

  if (!q) {
    return { customers: [], orders: [], serialNumbers: [], leads: [], tickets: [] };
  }

  const customers = store.customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.customer_code.toLowerCase().includes(q)
  );

  const orders = store.orders.filter(
    (o) => o.order_number.toLowerCase().includes(q)
  );

  const serialNumbers = store.serialNumbers.filter(
    (s) => s.serial_number.toLowerCase().includes(q)
  );

  const leads = store.leads.filter(
    (l) => l.full_name.toLowerCase().includes(q) || l.phone.includes(q) || l.lead_code.toLowerCase().includes(q)
  );

  const tickets = store.serviceTickets.filter(
    (t) => t.ticket_number.toLowerCase().includes(q) || t.reported_fault_code?.toLowerCase().includes(q)
  );

  return { customers, orders, serialNumbers, leads, tickets };
}
