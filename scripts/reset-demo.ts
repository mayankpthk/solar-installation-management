/**
 * SolarOS: Repeatable Demo Environment Reset & Seed Script
 * 
 * SAFETY NOTICE:
 * This script is strictly safeguarded against accidental data loss in live production.
 * It will refuse execution if NODE_ENV=production unless ALLOW_DEMO_RESET=true is explicitly set.
 * It targets only the designated demonstration organization (SunPower Solutions Demo).
 */

import { getStore, resetStore } from "../src/lib/data/store";

export interface DemoUserAccount {
  role: string;
  email: string;
  name: string;
  title: string;
  description: string;
  permissionsSummary: string;
}

export const DEMO_ACCOUNTS: DemoUserAccount[] = [
  {
    role: "DIRECTOR",
    email: "director@sunpower.demo",
    name: "Vikramaditya Singhania",
    title: "Managing Director & CEO",
    description: "Full executive intelligence access: financials, P&L, commercial discount overrides > ₹50,000, company settings.",
    permissionsSummary: "All modules + Financial approvals + Commercial overrides + Statutory reports",
  },
  {
    role: "SALES_EXECUTIVE",
    email: "sales@sunpower.demo",
    name: "Aman Sharma",
    title: "Senior Solar Sales Advisor",
    description: "Inquiry intake, CRM pipeline qualification, survey scheduling, 1-5 kW quotation drafting.",
    permissionsSummary: "Leads + Site Surveys (Schedule) + Quotations (Draft) + Customers",
  },
  {
    role: "SURVEY_TECHNICIAN",
    email: "surveyor@sunpower.demo",
    name: "Manpreet Singh",
    title: "Rooftop Survey & Feasibility Engineer",
    description: "On-site roof assessment, azimuth angle, tilt measurement, shadow area, grid phase feasibility sign-off.",
    permissionsSummary: "Site Surveys (Data Capture & Upload) + Feasibility Recommendation",
  },
  {
    role: "WAREHOUSE_MANAGER",
    email: "warehouse@sunpower.demo",
    name: "Rajesh Kumar",
    title: "Logistics & Warehouse Operations Lead",
    description: "Inventory stock levels, atomic picking lists, barcode serial scanning, Gate Pass generation.",
    permissionsSummary: "Inventory + Serial Numbers + Picking & Dispatch + Gate Pass Issuance",
  },
  {
    role: "FIELD_TECHNICIAN",
    email: "technician@sunpower.demo",
    name: "Suresh Verma",
    title: "Lead Solar Installation & Commissioning Tech",
    description: "Mobile-first installation workspace, 8-step SOP safety checklist, electrical testing, customer digital SVG sign-off.",
    permissionsSummary: "Assigned Installations + SOP Checklist + Testing Measurements + Handover",
  },
  {
    role: "CUSTOMER",
    email: "customer@sunpower.demo",
    name: "Rohan Deshmukh",
    title: "Residential Solar Client (3 kW On-Grid)",
    description: "Customer portal access: view approved quotation, online acceptance, payment receipt, warranty certificates, service tickets.",
    permissionsSummary: "Own Quotation + Own Invoices + Warranty Registry + Complaint Submission",
  },
];

export function resetDemoEnvironment(): {
  success: boolean;
  message: string;
  stats: Record<string, number>;
  demoAccounts: DemoUserAccount[];
} {
  // CRITICAL SAFETY CHECK: Block execution in real production unless explicit override flag is present
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "true") {
    throw new Error(
      "[SAFETY BLOCK] Demo reset is disabled in production environments. Set ALLOW_DEMO_RESET=true to override."
    );
  }

  // Atomically reinitialize store from canonical seed
  const store = resetStore();

  const stats = {
    customers: store.customers.length,
    leads: store.leads.length,
    surveys: store.surveys.length,
    quotations: store.quotations.length,
    orders: store.orders.length,
    inventoryItems: store.inventoryItems.length,
    serialNumbers: store.serialNumbers.length,
    installations: store.installations.length,
    warranties: store.warranties.length,
    serviceTickets: store.serviceTickets.length,
    invoices: store.invoices.length,
  };

  return {
    success: true,
    message: "SolarOS demonstration environment successfully reset and reseeded with verifiable operational data.",
    stats,
    demoAccounts: DEMO_ACCOUNTS,
  };
}

// CLI Execution entrypoint
if (typeof require !== "undefined" && require.main === module) {
  try {
    const result = resetDemoEnvironment();
    console.log("==================================================================");
    console.log("            SOLAROS DEMO ENVIRONMENT RESET COMPLETE              ");
    console.log("==================================================================");
    console.log(result.message);
    console.log("\n[SEEDED DEMO METRICS]");
    console.table(result.stats);
    console.log("\n[ROLE-SPECIFIC DEMO PERSONAS]");
    console.table(
      result.demoAccounts.map((a) => ({
        Role: a.role,
        Name: a.name,
        Email: a.email,
        Title: a.title,
      }))
    );
    console.log("==================================================================");
  } catch (err: any) {
    console.error("Failed to reset demo environment:", err.message);
    process.exit(1);
  }
}
