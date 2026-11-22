"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Compass,
  FileSpreadsheet,
  ShoppingCart,
  Warehouse,
  QrCode,
  Truck,
  Wrench,
  UserCog,
  ShieldCheck,
  LifeBuoy,
  Receipt,
  CircleDollarSign,
  Landmark,
  BarChart3,
  Settings,
  SunMedium,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: "default" | "alert" | "warning";
}

export const navigationItems: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users, badge: "3 New", badgeVariant: "default" },
  { name: "Customers", href: "/customers", icon: UserCheck },
  { name: "Surveys", href: "/surveys", icon: Compass, badge: "1 Pending", badgeVariant: "warning" },
  { name: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Inventory", href: "/inventory", icon: Warehouse, badge: "2 Low", badgeVariant: "alert" },
  { name: "Serial Numbers", href: "/serial-numbers", icon: QrCode },
  { name: "Dispatch", href: "/dispatch", icon: Truck },
  { name: "Installations", href: "/installations", icon: Wrench, badge: "1 Active" },
  { name: "Technicians", href: "/technicians", icon: UserCog },
  { name: "Warranties", href: "/warranties", icon: ShieldCheck },
  { name: "Service Tickets", href: "/tickets", icon: LifeBuoy, badge: "1 Open", badgeVariant: "alert" },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Finance", href: "/finance", icon: CircleDollarSign },
  { name: "Subsidies", href: "/subsidies", icon: Landmark },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 border border-emerald-400/30 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-emerald-950/40">
            <SunMedium className="w-6 h-6 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-200">
              <h1 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5 leading-none">
                SolarOS
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold border border-emerald-500/30">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">SunPower Solutions</p>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pb-1 pt-1">
            Enterprise Suite
          </div>
        )}

        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-xs font-semibold transition-all duration-150",
                isCollapsed ? "justify-center p-3" : "px-3 py-2.5 space-x-3",
                isActive
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                  isActive ? "text-slate-950" : "text-emerald-400/90"
                )}
              />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight",
                        isActive
                          ? "bg-slate-950 text-emerald-300"
                          : item.badgeVariant === "alert"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : item.badgeVariant === "warning"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Floating pill for collapsed view */}
              {isCollapsed && item.badge && (
                <span
                  className={cn(
                    "absolute top-2 right-2 w-2 h-2 rounded-full",
                    item.badgeVariant === "alert"
                      ? "bg-red-500"
                      : item.badgeVariant === "warning"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Role Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
        <div
          className={cn(
            "flex items-center rounded-xl bg-slate-900/80 border border-slate-800 transition-all",
            isCollapsed ? "justify-center p-2" : "p-2.5 space-x-3"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-sm">
            RM
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Rajesh Malhotra</p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider truncate">
                  Director
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
