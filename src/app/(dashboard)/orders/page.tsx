"use client";

import * as React from "react";
import {
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
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
import { Order, Payment, PaymentMilestone, PaymentMode, UserRole } from "@/lib/types/database";
import { processPayment, processRefund } from "@/domain/payments/payment-processor";

export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  // User role simulation
  const [userRole, setUserRole] = React.useState<UserRole>("FINANCE_MANAGER");

  // Payment Form state
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("40000");
  const [paymentMilestone, setPaymentMilestone] = React.useState<PaymentMilestone>("BOOKING_ADVANCE");
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("BANK_TRANSFER_NEFT");
  const [txnRef, setTxnRef] = React.useState("");
  const [isSimulated, setIsSimulated] = React.useState(false);

  // Refund Form state
  const [isRefundOpen, setIsRefundOpen] = React.useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = React.useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = React.useState("");
  const [refundReason, setRefundReason] = React.useState("");

  const loadData = React.useCallback(() => {
    const store = getStore();
    setOrders([...store.orders]);
    setPayments([...store.payments]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const amount = Number(paymentAmount) || 0;
      const idempotencyKey = `idem-ui-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const payment = processPayment({
        orderId: selectedOrder.id,
        amount,
        milestone: paymentMilestone,
        paymentMode,
        paymentReferenceCode: txnRef.trim(),
        idempotencyKey,
        isSimulated,
        userRole,
        verifiedBy: "Finance Officer",
      });

      loadData();
      setIsPaymentOpen(false);

      toast({
        title: "Payment Confirmed & Verified",
        description: `Receipt ${payment.receipt_number} issued for ${formatCurrency(amount)} against ${selectedOrder.order_number}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Payment Processing Failed",
        description: err.message,
        variant: "error",
      });
    }
  };

  const handleProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;

    try {
      const amount = Number(refundAmount) || 0;
      const refund = processRefund({
        paymentId: selectedPaymentForRefund.id,
        amount,
        reason: refundReason.trim(),
        userRole,
        processedBy: "Finance Controller",
      });

      loadData();
      setIsRefundOpen(false);

      toast({
        title: "Refund Processed",
        description: `Refund ${refund.refund_reference} for ${formatCurrency(amount)} processed successfully.`,
        variant: "info",
      });
    } catch (err: any) {
      toast({
        title: "Refund Rejected",
        description: err.message,
        variant: "error",
      });
    }
  };

  const columns: Column<Order>[] = [
    {
      header: "Order Number",
      accessorKey: "order_number",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono">{row.order_number}</p>
          <p className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "System Specs",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground">{row.system_capacity_kw} kW System</p>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {row.system_topology}
          </span>
        </div>
      ),
    },
    {
      header: "Contract Total (Frozen)",
      accessorKey: "total_contract_value",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-foreground">{formatCurrency(row.total_contract_value)}</p>
          <p className="text-[10px] text-muted-foreground">
            Advance Req ({row.advance_payment_percent || 20}%): {formatCurrency(row.advance_amount_required)}
          </p>
        </div>
      ),
    },
    {
      header: "Outstanding Balance",
      cell: (row) => {
        const paid = row.advance_amount_paid || 0;
        const outstanding = Math.max(0, row.total_contract_value - paid);

        return (
          <div className="text-xs font-mono">
            <p className={`font-bold ${outstanding === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {formatCurrency(outstanding)}
            </p>
            <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(paid)}</p>
          </div>
        );
      },
    },
    {
      header: "Payment Progress",
      cell: (row) => {
        const paid = row.advance_amount_paid || 0;
        const total = row.total_contract_value || 1;
        const pct = Math.min(100, Math.round((paid / total) * 100));

        return (
          <div className="space-y-1 w-28">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-muted-foreground">{pct}%</span>
              <span className={`text-[10px] font-bold ${pct >= 100 ? "text-emerald-600" : "text-primary"}`}>
                {pct >= 100 ? "PAID FULL" : pct > 0 ? "PARTIAL" : "UNPAID"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Order Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: "Actions",
      cell: (row) => {
        const outstanding = Math.max(0, row.total_contract_value - (row.advance_amount_paid || 0));
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={outstanding <= 0}
              className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold disabled:opacity-40"
              onClick={() => {
                setSelectedOrder(row);
                setPaymentAmount(String(outstanding > 40000 ? 40000 : outstanding));
                setTxnRef(`UTR-${Date.now().toString().slice(-6)}`);
                setIsPaymentOpen(true);
              }}
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Collect
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Orders & Milestone Payments
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Reconcile contract payments, advance bookings (20%), dispatch staging, and refund ledgers.
          </p>
        </div>

        {/* User Role Selector */}
        <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border text-xs">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground font-medium">Role:</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="bg-background border border-input rounded text-xs font-semibold px-2 py-0.5 focus:outline-none"
          >
            <option value="FINANCE_MANAGER">Finance Manager</option>
            <option value="DIRECTOR">Company Director</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SALES_EXECUTIVE">Sales Executive (Restricted)</option>
          </select>
        </div>
      </div>

      {/* Orders Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Active Customer Orders</CardTitle>
          <CardDescription className="text-xs">
            Review order lifecycle from advance collection to warehouse staging and dispatch.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={orders}
            columns={columns}
            searchPlaceholder="Search orders by number..."
          />
        </CardContent>
      </Card>

      {/* Recent Payments & Receipts Registry */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Verified Payment Receipts & UTR Register
            </CardTitle>
            <CardDescription className="text-xs">
              Every incoming payment is tied to a verified UTR/Gateway reference. No phantom button confirmations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2 px-3">Receipt #</th>
                  <th className="py-2 px-3">Reference / UTR</th>
                  <th className="py-2 px-3">Milestone</th>
                  <th className="py-2 px-3">Mode</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.slice(0, 8).map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      {pay.receipt_number || `RCPT-${pay.id.slice(-6)}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {pay.payment_reference_code}
                      {pay.is_simulated && (
                        <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold">
                          SIMULATED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{pay.milestone}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{pay.payment_mode}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(pay.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        pay.status === "REFUNDED" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {pay.status || "COMPLETED"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {pay.status !== "REFUNDED" && (userRole === "FINANCE_MANAGER" || userRole === "DIRECTOR" || userRole === "SUPER_ADMIN") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPaymentForRefund(pay);
                            setRefundAmount(String(pay.amount));
                            setRefundReason("Customer contract cancellation");
                            setIsRefundOpen(true);
                          }}
                          className="h-6 text-[11px] text-muted-foreground hover:text-red-600 px-2"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Collect Milestone Payment Dialog */}
      {selectedOrder && (
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record & Verify Milestone Payment</DialogTitle>
              <DialogDescription>
                Allocate incoming funds against contract {selectedOrder.order_number}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Contract Total</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatCurrency(selectedOrder.total_contract_value)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Outstanding Balance</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                    {formatCurrency(Math.max(0, selectedOrder.total_contract_value - (selectedOrder.advance_amount_paid || 0)))}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Payment Milestone</label>
                <select
                  value={paymentMilestone}
                  onChange={(e) => setPaymentMilestone(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="BOOKING_ADVANCE">Booking Advance (20% to Unlock Staging)</option>
                  <option value="PRE_DISPATCH">Pre-Dispatch Milestone (60% before Dispatch)</option>
                  <option value="POST_INSTALLATION_BALANCE">Post-Installation Balance (Final 20%)</option>
                  <option value="FULL_PAYMENT">Full Contract Settlement (100%)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">Amount Collected (₹) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const outstanding = Math.max(0, selectedOrder.total_contract_value - (selectedOrder.advance_amount_paid || 0));
                      setPaymentAmount(String(outstanding));
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Fill Full Outstanding
                  </button>
                </div>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="BANK_TRANSFER_NEFT">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="ONLINE_GATEWAY">Online Payment Gateway (Simulated / Webhook)</option>
                  <option value="CHEQUE">Bank Account Payee Cheque</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">Bank UTR / Transaction Reference *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTxnRef(`SIM-${Date.now().toString().slice(-8)}`);
                      setIsSimulated(true);
                    }}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Simulated Ref
                  </button>
                </div>
                <Input
                  placeholder="e.g. UTR-998822100 or Razorpay ID"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Verifiable bank reference code required. Payments are audited and deduplicated.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Confirm & Issue Receipt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Process Refund Dialog */}
      {selectedPaymentForRefund && (
        <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment Refund</DialogTitle>
              <DialogDescription>
                Authorize refund against receipt {selectedPaymentForRefund.receipt_number || selectedPaymentForRefund.payment_reference_code}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProcessRefund} className="space-y-3.5 text-xs">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg text-red-900 dark:text-red-200">
                <p className="font-bold">Original Payment: {formatCurrency(selectedPaymentForRefund.amount)}</p>
                <p className="text-[11px] opacity-90">Refunds reverse order advance balances and generate immutable audit entries.</p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Refund Amount (₹) *</label>
                <Input
                  type="number"
                  value={refundAmount}
                  max={selectedPaymentForRefund.amount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Reason for Refund *</label>
                <textarea
                  rows={2}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Document formal justification for refund..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRefundOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-semibold">
                  Authorize & Issue Refund
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
