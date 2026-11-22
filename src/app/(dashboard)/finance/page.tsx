"use client";

import * as React from "react";
import {
  CircleDollarSign,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Layers,
  ArrowRight,
  Filter,
  Plus,
  Sliders,
  Wallet,
  Clock,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore } from "@/lib/data/store";
import {
  computeExecutiveMetrics,
  calculateOrderProfitability,
  getAccountingPolicy,
  setAccountingPolicy,
  ProjectProfitabilityDetail,
  ExecutiveMetrics,
  AccountingPolicy,
} from "@/domain/finance/finance-engine";

export default function FinancePage() {
  const { toast } = useToast();
  const [period, setPeriod] = React.useState<"TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM">("THIS_MONTH");
  const [accountingPolicy, setLocalAccountingPolicy] = React.useState<AccountingPolicy>("PERCENTAGE_OF_COMPLETION");
  const [metrics, setMetrics] = React.useState<ExecutiveMetrics | null>(null);

  // Record Expense Dialog
  const [isExpenseOpen, setIsExpenseOpen] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [expenseCategory, setExpenseCategory] = React.useState<"HARDWARE" | "LOGISTICS" | "LABOR" | "PERMITS" | "MISC">("LOGISTICS");
  const [expenseAmount, setExpenseAmount] = React.useState(3500);
  const [expenseDesc, setExpenseDesc] = React.useState("Transport fuel and loading surcharge for site delivery.");

  const loadData = React.useCallback(() => {
    const currentPolicy = getAccountingPolicy();
    setLocalAccountingPolicy(currentPolicy);
    const data = computeExecutiveMetrics({ period, accountingPolicy: currentPolicy });
    setMetrics(data);
  }, [period]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePolicyChange = (newPolicy: AccountingPolicy) => {
    try {
      setAccountingPolicy(newPolicy, "DIRECTOR");
      setLocalAccountingPolicy(newPolicy);
      const data = computeExecutiveMetrics({ period, accountingPolicy: newPolicy });
      setMetrics(data);
      toast({
        title: "Accounting Policy Switched",
        description: `Revenue recognition rule updated to ${newPolicy.replace(/_/g, " ")}.`,
        variant: "success",
      });
    } catch {
      toast({ title: "Unauthorized", description: "Only Directors or Finance Managers can change accounting policy.", variant: "error" });
    }
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    const store = getStore();
    store.expenses.unshift({
      id: `exp-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      order_id: selectedOrderId || undefined,
      category: expenseCategory,
      amount: Number(expenseAmount),
      description: expenseDesc,
      incurred_date: new Date().toISOString().slice(0, 10),
      recorded_by: "Finance Desk",
    });

    loadData();
    setIsExpenseOpen(false);
    toast({
      title: "Direct Expense Recorded",
      description: `₹${Number(expenseAmount).toFixed(2)} allocated to ${expenseCategory} ledger.`,
      variant: "success",
    });
  };

  const store = getStore();
  const ordersList = store.orders;

  const columns: Column<ProjectProfitabilityDetail>[] = [
    {
      header: "Project / Order",
      accessorKey: "orderNumber",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono text-xs">{row.orderNumber}</p>
          <p className="text-[10px] text-muted-foreground">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: "Recognized Revenue",
      accessorKey: "recognizedRevenue",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-foreground">{formatCurrency(row.recognizedRevenue)}</p>
          <p className="text-[10px] text-muted-foreground">Contract: {formatCurrency(row.totalContractValue)}</p>
        </div>
      ),
    },
    {
      header: "Cash Collected",
      accessorKey: "cashCollected",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.cashCollected)}</p>
          {row.unearnedAdvanceRevenue > 0 && (
            <p className="text-[10px] text-amber-500 font-medium">Deferred: {formatCurrency(row.unearnedAdvanceRevenue)}</p>
          )}
        </div>
      ),
    },
    {
      header: "Direct Costs",
      accessorKey: "totalDirectCosts",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-semibold text-rose-500">{formatCurrency(row.totalDirectCosts)}</p>
          <p className="text-[10px] text-muted-foreground">
            BOM: {formatCurrency(row.materialCosts)} • Labor: {formatCurrency(row.laborCosts)}
          </p>
        </div>
      ),
    },
    {
      header: "Gross Profit & Margin",
      accessorKey: "grossProfit",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className={`font-bold ${row.grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {formatCurrency(row.grossProfit)}
          </p>
          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
            row.marginHealth === "HEALTHY"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : row.marginHealth === "ACCEPTABLE"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : row.marginHealth === "AT_RISK"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-rose-500/10 text-rose-600"
          }`}>
            {row.grossMarginPercent}% Margin
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "orderStatus",
      sortable: true,
      cell: (row) => <StatusPill status={row.orderStatus} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-primary" />
            Financial Management & Job Profitability
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Revenue recognition, direct project job-costing, unearned customer advances, and operating margins.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Accounting Policy Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => handlePolicyChange("PERCENTAGE_OF_COMPLETION")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                accountingPolicy === "PERCENTAGE_OF_COMPLETION"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              % of Completion
            </button>
            <button
              onClick={() => handlePolicyChange("COMPLETED_CONTRACT")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                accountingPolicy === "COMPLETED_CONTRACT"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed Contract
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsExpenseOpen(true)}
            className="bg-primary text-primary-foreground font-semibold text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Record Direct Expense
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>Accounting Reporting Period:</span>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
          {(["TODAY", "THIS_WEEK", "THIS_MONTH", "CUSTOM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md transition-all ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "TODAY" && "Today"}
              {p === "THIS_WEEK" && "This Week"}
              {p === "THIS_MONTH" && "This Month"}
              {p === "CUSTOM" && "All Time / Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* Executive Financial Health KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-border/80 shadow-sm bg-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Recognized Revenue</p>
              <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(metrics.recognizedRevenue)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Excl. 12% GST • Contract: {formatCurrency(metrics.totalContractValue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Cash Collections</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(metrics.cashCollections)}
              </p>
              <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                Deferred Advances: {formatCurrency(metrics.deferredRevenueAdvances)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Direct Project Costs</p>
              <p className="text-2xl font-black text-rose-500 mt-1">
                {formatCurrency(metrics.totalDirectCosts)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                BOM: {formatCurrency(metrics.totalMaterialCosts)} • Labor: {formatCurrency(metrics.totalLaborCosts)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Gross Profit & Margin
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(metrics.grossProfit)}
              </p>
              <p className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.overallGrossMarginPercent}% Gross Margin
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounting Invariant Notice */}
      <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-foreground">Revenue Recognition Invariant Safeguard</p>
          <p className="text-muted-foreground text-[11px]">
            Cash collected is strictly segregated from recognized revenue. Advance booking deposits are recorded as
            balance-sheet liabilities (deferred revenue) until earned through physical installation milestones.
            Supplier warehouse inventory receipts are treated as balance-sheet stock assets and only recognized as COGS
            upon BOM allocation.
          </p>
        </div>
      </div>

      {/* Project Profitability Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Project-Wise Profitability Ledger</CardTitle>
          <CardDescription className="text-xs">
            Review granular margins for each rooftop installation project.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={metrics?.projectDetails || []}
            columns={columns}
            searchPlaceholder="Search projects by order number or customer..."
          />
        </CardContent>
      </Card>

      {/* Record Expense Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Direct Project Expense</DialogTitle>
            <DialogDescription>
              Allocate field logistics, DISCOM application fees, or direct project expenses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Target Project / Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">General Overhead / Unallocated</option>
                {ordersList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} ({o.system_capacity_kw} kW - {o.system_topology})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="LOGISTICS">Logistics & Transit</option>
                  <option value="PERMITS">DISCOM / Statutory Permits</option>
                  <option value="HARDWARE">Direct Hardware Consumable</option>
                  <option value="LABOR">Contract Labor</option>
                  <option value="MISC">Miscellaneous Site Cost</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Expense Description *</label>
              <textarea
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                rows={3}
                className="w-full p-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold">
                Post Direct Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
