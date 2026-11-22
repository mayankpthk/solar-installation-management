import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";

  if (["APPROVED", "CONFIRMED", "COMPLETED", "DELIVERED", "ACTIVE", "WARRANTY_FREE", "HEALTHY", "WON"].includes(normalized)) {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-300";
  } else if (["PENDING_APPROVAL", "SUBMITTED", "IN_PROGRESS", "STAGING", "ACCEPTABLE"].includes(normalized)) {
    colorClasses = "bg-blue-50 text-blue-700 border-blue-300";
  } else if (["NEW", "SCHEDULED", "ASSIGNED", "DOCS_PENDING", "AT_RISK"].includes(normalized)) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-300";
  } else if (["REJECTED", "CANCELLED", "EXPIRED", "VOIDED", "DEFECTIVE", "LOSS", "LOST"].includes(normalized)) {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-300";
  }

  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase",
        colorClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {label}
    </span>
  );
}
