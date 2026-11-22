import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarOS — The Complete Solar Business Operating System",
  description: "Enterprise operating system for SunPower Solutions rooftop solar engineering, procurement, dispatch, installation, warranties, and financial reporting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
