"use client";

import * as React from "react";
import {
  Bell,
  Search,
  ShieldCheck,
  Moon,
  Sun,
  Menu,
  CheckCircle,
  AlertTriangle,
  Info,
  Check,
  ChevronDown,
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { useTheme } from "./theme-provider";
import { GlobalSearchDialog } from "./global-search-dialog";
import { getStore } from "@/lib/data/store";
import { Notification } from "@/lib/types/database";

const ROLES = [
  { id: "SUPER_ADMIN", label: "Super Admin", color: "text-purple-400" },
  { id: "COMPANY_OWNER", label: "Company Owner / Director", color: "text-emerald-400" },
  { id: "SALES_MANAGER", label: "Sales Manager", color: "text-blue-400" },
  { id: "SALES_EXECUTIVE", label: "Sales Executive", color: "text-sky-400" },
  { id: "SURVEY_TECHNICIAN", label: "Survey Technician", color: "text-amber-400" },
  { id: "WAREHOUSE_MANAGER", label: "Warehouse Manager", color: "text-orange-400" },
  { id: "INSTALLATION_MANAGER", label: "Installation Manager", color: "text-teal-400" },
  { id: "FIELD_TECHNICIAN", label: "Field Technician", color: "text-lime-400" },
  { id: "FINANCE_MANAGER", label: "Finance Manager", color: "text-indigo-400" },
  { id: "CUSTOMER_PORTAL", label: "Customer Portal User", color: "text-slate-400" },
];

export function Header({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);
  const [activeRole, setActiveRole] = React.useState("COMPANY_OWNER");
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  React.useEffect(() => {
    try {
      const store = getStore();
      setNotifications(store.notifications || []);
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
        {/* Left: Mobile Toggle + Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Breadcrumbs />
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg transition-all"
            title="Search anything (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Search SolarOS...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-background text-muted-foreground border border-border rounded shadow-xs">
              ⌘K
            </kbd>
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setRoleMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors"
              title="Switch Active Simulated Role"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="hidden md:inline font-mono text-[11px]">
                {ROLES.find((r) => r.id === activeRole)?.label || "Role"}
              </span>
              <span className="md:hidden font-mono text-[11px]">Role</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Switch Active Role (RBAC)
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setActiveRole(role.id);
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className={activeRole === role.id ? "font-bold text-primary" : "text-foreground"}>
                        {role.label}
                      </span>
                      {activeRole === role.id && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RLS Indicator Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS Active</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setRoleMenuOpen(false);
              }}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Operational Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="divide-y divide-border max-h-80 overflow-y-auto mt-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="py-2.5 px-2 hover:bg-muted/50 rounded-lg transition-colors flex items-start gap-2.5 text-left"
                    >
                      {n.type === "ALERT" ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : n.type === "WARNING" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
