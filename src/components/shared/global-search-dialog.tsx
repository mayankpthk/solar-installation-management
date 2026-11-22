"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, ShoppingCart, QrCode, FileText, LifeBuoy } from "lucide-react";
import { globalSearch } from "@/lib/data/queries";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  const results = React.useMemo(() => {
    return globalSearch(query);
  }, [query]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  const hasResults =
    results.customers.length > 0 ||
    results.orders.length > 0 ||
    results.serialNumbers.length > 0 ||
    results.leads.length > 0 ||
    results.tickets.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type customer phone, serial number, order ID, or lead name..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Stream */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!query.trim() ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Search by customer phone (+91...), serial number (INV-...), or order ID (ORD-...)...
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching records found for &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Customers
                  </p>
                  <div className="space-y-1">
                    {results.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => navigateTo("/customers")}
                        className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{c.full_name}</p>
                          <p className="text-[11px] text-slate-500">{c.phone} • {c.city}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{c.customer_code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Serial Numbers */}
              {results.serialNumbers.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-500" /> Serial Numbers
                  </p>
                  <div className="space-y-1">
                    {results.serialNumbers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigateTo("/serial-numbers")}
                        className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold font-mono text-emerald-600">{s.serial_number}</p>
                          <p className="text-[11px] text-slate-500">Status: {s.status}</p>
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                          {s.purchase_invoice_ref ?? "Standard Lot"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders */}
              {results.orders.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-purple-500" /> Orders
                  </p>
                  <div className="space-y-1">
                    {results.orders.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => navigateTo("/orders")}
                        className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{o.order_number}</p>
                          <p className="text-[11px] text-slate-500">{o.system_capacity_kw} kW {o.system_topology}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          ₹{o.total_contract_value.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Tickets */}
              {results.tickets.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-amber-500" /> Service Tickets
                  </p>
                  <div className="space-y-1">
                    {results.tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => navigateTo("/tickets")}
                        className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.ticket_number}</p>
                          <p className="text-[11px] text-slate-500">Fault: {t.reported_fault_code ?? "General"}</p>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with mouse or keyboard</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
