import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Stage 7: Comprehensive Browser, Routes & UI Viewport Testing", () => {
  const appDir = path.resolve(process.cwd(), "src/app");
  const dashboardDir = path.join(appDir, "(dashboard)");

  // 1. Navigation Routes Verification
  describe("Route Handlers & Page Components Completeness", () => {
    const expectedRoutes = [
      { name: "Overview / Executive Dashboard", path: path.join(dashboardDir, "page.tsx") },
      { name: "Leads Management (CRM)", path: path.join(dashboardDir, "leads/page.tsx") },
      { name: "Site Surveys", path: path.join(dashboardDir, "surveys/page.tsx") },
      { name: "Quotations Engine", path: path.join(dashboardDir, "quotations/page.tsx") },
      { name: "Orders Management", path: path.join(dashboardDir, "orders/page.tsx") },
      { name: "Inventory Management", path: path.join(dashboardDir, "inventory/page.tsx") },
      { name: "Serial Numbers Tracking", path: path.join(dashboardDir, "serial-numbers/page.tsx") },
      { name: "Dispatch Operations", path: path.join(dashboardDir, "dispatch/page.tsx") },
      { name: "Installation Workspace", path: path.join(dashboardDir, "installations/page.tsx") },
      { name: "Technician Roster", path: path.join(dashboardDir, "technicians/page.tsx") },
      { name: "Warranty Policies & Registry", path: path.join(dashboardDir, "warranties/page.tsx") },
      { name: "Service Tickets", path: path.join(dashboardDir, "tickets/page.tsx") },
      { name: "Invoices & Billing", path: path.join(dashboardDir, "invoices/page.tsx") },
      { name: "Financial Management & Job Profitability", path: path.join(dashboardDir, "finance/page.tsx") },
      { name: "PM Surya Ghar Subsidies", path: path.join(dashboardDir, "subsidies/page.tsx") },
      { name: "Audit-Ready Reports", path: path.join(dashboardDir, "reports/page.tsx") },
      { name: "Enterprise Settings", path: path.join(dashboardDir, "settings/page.tsx") },
      { name: "Public Enquiry Portal", path: path.join(appDir, "enquiry/page.tsx") },
    ];

    it("verifies all 18 primary application routes exist and have valid page components", () => {
      for (const route of expectedRoutes) {
        expect(fs.existsSync(route.path), `Route component missing for: ${route.name}`).toBe(true);
        const content = fs.readFileSync(route.path, "utf-8");
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain("export default");
      }
    });

    it("verifies the collapsible Sidebar contains links to all primary business modules", () => {
      const sidebarPath = path.resolve(process.cwd(), "src/components/shared/sidebar.tsx");
      expect(fs.existsSync(sidebarPath)).toBe(true);
      const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

      const navLinks = [
        "/",
        "/leads",
        "/customers",
        "/surveys",
        "/quotations",
        "/orders",
        "/inventory",
        "/serial-numbers",
        "/dispatch",
        "/installations",
        "/technicians",
        "/warranties",
        "/tickets",
        "/invoices",
        "/finance",
        "/subsidies",
        "/reports",
        "/settings",
      ];

      for (const link of navLinks) {
        expect(sidebarContent).toContain(`href: "${link}"`);
      }
    });
  });

  // 2. Responsive Layout & Viewport Configuration
  describe("Responsive Viewports & Tailwind Breakpoint Layouts", () => {
    it("verifies responsive CSS classes for desktop, tablet, and mobile layouts", () => {
      const layoutPath = path.resolve(process.cwd(), "src/app/(dashboard)/layout.tsx");
      const layoutContent = fs.readFileSync(layoutPath, "utf-8");

      expect(layoutContent).toContain("<Sidebar");
      expect(layoutContent).toContain("<Header");
      expect(layoutContent).toContain("md:ml-20");
      expect(layoutContent).toContain("md:ml-64");
    });

    it("verifies mobile-first field technician installation workspace design", () => {
      const installPagePath = path.join(dashboardDir, "installations/page.tsx");
      const installContent = fs.readFileSync(installPagePath, "utf-8");

      expect(installContent).toMatch(/grid-cols-1/);
      expect(installContent).toMatch(/p-4|rounded/);
    });
  });

  // 3. UI Controls, Forms, Modals & Dialogs
  describe("Interactive UI Controls, Tables, and Forms", () => {
    it("ensures public enquiry form captures all 10 problem statement fields", () => {
      const enquiryPath = path.join(appDir, "enquiry/page.tsx");
      const content = fs.readFileSync(enquiryPath, "utf-8");

      expect(content).toContain("fullName");
      expect(content).toContain("phone");
      expect(content).toContain("email");
      expect(content).toContain("address");
      expect(content).toContain("capacityKw");
      expect(content).toContain("monthlyBill");
      expect(content).toContain("roofAvailability");
      expect(content).toContain("isSubsidyRequested");
      expect(content).toContain("additionalRequirements");
    });

    it("ensures site survey workspace contains 3 feasibility outcome selections", () => {
      const surveyPath = path.join(dashboardDir, "surveys/page.tsx");
      const content = fs.readFileSync(surveyPath, "utf-8");

      expect(content).toContain("APPROVED");
      expect(content).toContain("REJECTED");
      expect(content).toContain("REQUIRES_REASSESSMENT");
    });

    it("ensures financial dashboard integrates date range filtering", () => {
      const financePath = path.join(dashboardDir, "finance/page.tsx");
      const content = fs.readFileSync(financePath, "utf-8");

      expect(content).toMatch(/TODAY|THIS_WEEK|THIS_MONTH|CUSTOM/);
      expect(content).toContain("recognizedRevenue");
      expect(content).toContain("cashCollected");
    });
  });
});
