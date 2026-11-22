"use client";

import * as React from "react";
import {
  Receipt,
  Download,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore } from "@/lib/data/store";
import { Invoice } from "@/lib/types/database";

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setInvoices([...store.invoices]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettleInvoice = (id: string) => {
    const store = getStore();
    const inv = store.invoices.find((i) => i.id === id);
    if (inv) {
      inv.is_settled = true;
      inv.amount_paid = inv.total_amount;
      loadData();
      toast({
        title: "Invoice Marked Paid",
        description: `Tax Invoice ${inv.invoice_number} is fully settled.`,
        variant: "success",
      });
    }
  };

  const columns: Column<Invoice>[] = [
    {
      header: "Invoice Number",
      accessorKey: "invoice_number",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono">{row.invoice_number}</p>
          <p className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "Billing Milestone",
      accessorKey: "milestone",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
          {row.milestone.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Taxable Base",
      accessorKey: "taxable_amount",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatCurrency(row.taxable_amount)}
        </span>
      ),
    },
    {
      header: "GST (12%)",
      accessorKey: "tax_amount",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatCurrency(row.tax_amount)}
        </span>
      ),
    },
    {
      header: "Total Inclusive GST",
      accessorKey: "total_amount",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-foreground">{formatCurrency(row.total_amount)}</p>
          <p className="text-[10px] text-muted-foreground">
            Paid: {formatCurrency(row.amount_paid)}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <div>
          {row.is_settled ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" /> Unpaid
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-border hover:bg-muted"
            onClick={() => {
              toast({
                title: "Tax Invoice PDF Ready",
                description: `Official GST Tax Invoice for ${row.invoice_number} generated.`,
                variant: "info",
              });
            }}
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          {!row.is_settled && (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => handleSettleInvoice(row.id)}
            >
              Mark Paid
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            GST Tax Invoices & Milestone Billing
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Compliant 12% GST tax invoices generated for Booking Advance, Hardware Staging, and Commissioning.
          </p>
        </div>
      </div>

      {/* Invoices Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Tax Invoices</CardTitle>
          <CardDescription className="text-xs">
            Review taxable value, statutory GST breakdown, and client settlement records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={invoices}
            columns={columns}
            searchPlaceholder="Search invoices by number..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
