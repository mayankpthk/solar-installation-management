import Link from "next/link";
import { SunMedium } from "lucide-react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
            <SunMedium className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm tracking-wide">SunPower Solutions</h1>
            <p className="text-[11px] text-slate-500 font-mono">Customer Self-Service Portal</p>
          </div>
        </div>

        <nav className="flex items-center space-x-4 text-xs font-semibold text-slate-600">
          <Link href="/portal" className="text-amber-600 hover:text-amber-700">
            My System
          </Link>
          <Link href="/portal#warranty" className="hover:text-slate-900">
            Warranties
          </Link>
          <Link href="/portal#service" className="hover:text-slate-900">
            Service Request
          </Link>
          <Link href="/portal#subsidy" className="hover:text-slate-900">
            Subsidy Progress
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-5xl w-full mx-auto">{children}</main>
    </div>
  );
}
