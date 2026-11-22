"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
  leads: "CRM & Leads",
  customers: "Customer 360",
  surveys: "Site Surveys",
  quotations: "Quotations & BOM",
  orders: "Customer Orders",
  inventory: "Warehouse & Stock",
  "serial-numbers": "Serial Number Tracking",
  dispatch: "Dispatch & Logistics",
  installations: "Installation Jobs",
  technicians: "Field Technicians",
  warranties: "Digital Warranties",
  tickets: "Service Tickets",
  invoices: "GST Invoices",
  finance: "Job Costing & P&L",
  subsidies: "Subsidy Pipeline",
  reports: "Executive Reports",
  settings: "Settings & Audit Logs",
  crm: "CRM & Leads",
  warehouse: "Warehouse & Stock",
  serials: "Serial Tracking",
  financials: "Job Costing",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-medium">
        <Home className="w-3.5 h-3.5 text-primary" />
        <span>Executive Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground" aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const displayName = routeNames[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <div key={href} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="text-foreground font-semibold truncate max-w-[150px] sm:max-w-none">
                {displayName}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors truncate">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
