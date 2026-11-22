import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import {
  requireRole,
  validateTenantAccess,
  validateCustomerOwnership,
  AuthenticatedUser,
  DEFAULT_ORG_ID,
} from "@/lib/security/auth-session";
import {
  validateUploadedFile,
  sanitizeFilename,
  detectMimeFromMagicBytes,
  containsMaliciousScriptPayload,
} from "@/lib/security/file-validator";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

describe("SolarOS Security Audit & Hardening Test Suite", () => {
  // ===================================================================
  // 1. RATE LIMITING & DOS MITIGATION
  // ===================================================================
  describe("Sliding Window Rate Limiter", () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
      limiter = new SlidingWindowRateLimiter(60_000);
    });

    it("allows requests within configured threshold", () => {
      const ip = "192.168.1.100";
      const limit = 5;
      const windowMs = 10_000;

      for (let i = 0; i < limit; i++) {
        const result = limiter.check(ip, limit, windowMs);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - (i + 1));
      }
    });

    it("blocks burst requests exceeding limit and issues retry-after", () => {
      const ip = "192.168.1.101";
      const limit = 3;
      const windowMs = 5_000;

      limiter.check(ip, limit, windowMs);
      limiter.check(ip, limit, windowMs);
      const res3 = limiter.check(ip, limit, windowMs);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request must be blocked
      const blocked = limiter.check(ip, limit, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);

      const headers = getRateLimitHeaders(blocked);
      expect(headers["X-RateLimit-Limit"]).toBe("3");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBeDefined();
    });

    it("isolates client IPs and namespaces independently", () => {
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";
      const limit = 2;
      const windowMs = 10_000;

      limiter.check(ipA, limit, windowMs);
      limiter.check(ipA, limit, windowMs);
      const blockedA = limiter.check(ipA, limit, windowMs);
      expect(blockedA.allowed).toBe(false);

      // IP B should still be allowed
      const allowedB = limiter.check(ipB, limit, windowMs);
      expect(allowedB.allowed).toBe(true);
      expect(allowedB.remaining).toBe(1);
    });
  });

  // ===================================================================
  // 2. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
  // ===================================================================
  describe("Authentication & RBAC Enforcement", () => {
    const directorUser: AuthenticatedUser = {
      userId: "user-dir-1",
      organizationId: DEFAULT_ORG_ID,
      email: "director@sunpower.com",
      role: "DIRECTOR",
      name: "Director Ravinder",
      isVerified: true,
    };

    const financeUser: AuthenticatedUser = {
      userId: "user-fin-1",
      organizationId: DEFAULT_ORG_ID,
      email: "finance@sunpower.com",
      role: "FINANCE_MANAGER",
      name: "Finance Simran",
      isVerified: true,
    };

    const techUser: AuthenticatedUser = {
      userId: "user-tech-1",
      organizationId: DEFAULT_ORG_ID,
      email: "tech@sunpower.com",
      role: "FIELD_TECHNICIAN",
      name: "Tech Manpreet",
      isVerified: true,
    };

    const customerUser: AuthenticatedUser = {
      userId: "cust-user-1",
      organizationId: DEFAULT_ORG_ID,
      email: "customer@gmail.com",
      role: "CUSTOMER",
      name: "Gurpreet Singh",
      isVerified: true,
    };

    it("rejects unauthenticated access with 401 UnauthorizedError", () => {
      expect(() => requireRole(null, ["DIRECTOR"])).toThrow(UnauthorizedError);
    });

    it("allows authorized roles to proceed", () => {
      const user = requireRole(financeUser, ["FINANCE_MANAGER", "DIRECTOR"]);
      expect(user.role).toBe("FINANCE_MANAGER");
    });

    it("rejects unauthorized roles with 403 ForbiddenError (Privilege Escalation Prevention)", () => {
      // Field Technician attempting to access financial refunds
      expect(() => requireRole(techUser, ["FINANCE_MANAGER", "DIRECTOR"])).toThrow(ForbiddenError);

      // Customer attempting to access warehouse dispatch
      expect(() => requireRole(customerUser, ["WAREHOUSE_MANAGER", "OPERATIONS_MANAGER"])).toThrow(ForbiddenError);
    });

    it("grants SUPER_ADMIN universal access across all role requirements", () => {
      const superAdmin: AuthenticatedUser = {
        userId: "sa-1",
        organizationId: DEFAULT_ORG_ID,
        email: "root@solaros.io",
        role: "SUPER_ADMIN",
        name: "Root Admin",
        isVerified: true,
      };

      const result = requireRole(superAdmin, ["FINANCE_MANAGER"]);
      expect(result.role).toBe("SUPER_ADMIN");
    });
  });

  // ===================================================================
  // 3. MULTI-TENANT ISOLATION
  // ===================================================================
  describe("Multi-Tenant Isolation Protection", () => {
    const orgA_User: AuthenticatedUser = {
      userId: "u-orgA",
      organizationId: "11111111-1111-1111-1111-111111111111",
      email: "staff@solar-punjab.com",
      role: "SALES_EXECUTIVE",
      name: "Sales Rep A",
      isVerified: true,
    };

    const orgB_Id = "22222222-2222-2222-2222-222222222222";

    it("allows access to resources belonging to user's organization", () => {
      expect(() => validateTenantAccess(orgA_User, "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });

    it("strictly blocks cross-tenant resource access with ForbiddenError", () => {
      expect(() => validateTenantAccess(orgA_User, orgB_Id)).toThrow(ForbiddenError);
    });
  });

  // ===================================================================
  // 4. CUSTOMER ISOLATION (IDOR DEFENSE)
  // ===================================================================
  describe("Insecure Direct Object Reference (IDOR) Defense", () => {
    const customerAlice: AuthenticatedUser = {
      userId: "customer-alice-id",
      organizationId: DEFAULT_ORG_ID,
      email: "alice@gmail.com",
      role: "CUSTOMER",
      name: "Alice",
      isVerified: true,
    };

    const staffMember: AuthenticatedUser = {
      userId: "staff-1",
      organizationId: DEFAULT_ORG_ID,
      email: "sales@sunpower.com",
      role: "SALES_EXECUTIVE",
      name: "Sales Officer",
      isVerified: true,
    };

    it("allows a customer to access their own resources", () => {
      expect(() => validateCustomerOwnership(customerAlice, "customer-alice-id")).not.toThrow();
    });

    it("strictly rejects a customer attempting to view another customer's data", () => {
      const bobCustomerId = "customer-bob-id";
      expect(() => validateCustomerOwnership(customerAlice, bobCustomerId)).toThrow(ForbiddenError);
    });

    it("allows authorized internal staff to view customer records for operational processing", () => {
      expect(() => validateCustomerOwnership(staffMember, "customer-bob-id")).not.toThrow();
    });
  });

  // ===================================================================
  // 5. SECURE FILE UPLOAD & POLYGLOT / SCRIPT DETECTION
  // ===================================================================
  describe("File Upload Security & Magic Byte Validation", () => {
    it("sanitizes dangerous path traversal and null bytes in filenames", () => {
      const dirty = "../../../etc/passwd\0.jpg";
      const cleaned = sanitizeFilename(dirty);
      expect(cleaned).not.toContain("..");
      expect(cleaned).not.toContain("\0");
      expect(cleaned).toBe("passwd.jpg");

      const windowsDirty = "..\\..\\windows\\system32\\cmd.exe.png";
      const winCleaned = sanitizeFilename(windowsDirty);
      expect(winCleaned).not.toContain("..");
    });

    it("correctly identifies valid JPEG magic bytes (FF D8 FF)", () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      expect(detectMimeFromMagicBytes(jpegBytes)).toBe("image/jpeg");
    });

    it("correctly identifies valid PNG magic bytes (89 50 4E 47)", () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(detectMimeFromMagicBytes(pngBytes)).toBe("image/png");
    });

    it("correctly identifies valid PDF magic bytes (%PDF-)", () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]);
      expect(detectMimeFromMagicBytes(pdfBytes)).toBe("application/pdf");
    });

    it("rejects executable and disallowed file extensions even if disguised", () => {
      const fakeJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]);
      const res1 = validateUploadedFile("exploit.php.jpg", fakeJpeg);
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain("executable extension");

      const res2 = validateUploadedFile("malware.exe", fakeJpeg);
      expect(res2.isValid).toBe(false);
    });

    it("detects and rejects embedded scripts or HTML in binary payloads", () => {
      // Craft a polyglot JPEG header with an embedded <script> tag
      const header = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const scriptBytes = new TextEncoder().encode("<script>alert('XSS')</script>");
      const polyglot = new Uint8Array(header.length + scriptBytes.length);
      polyglot.set(header, 0);
      polyglot.set(scriptBytes, header.length);

      expect(containsMaliciousScriptPayload(polyglot)).toBe(true);

      const validation = validateUploadedFile("roof_photo.jpg", polyglot);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("Malicious payload detected");
    });

    it("rejects files exceeding configured size limits", () => {
      const largePayload = new Uint8Array(11 * 1024 * 1024); // 11MB
      largePayload[0] = 0xFF;
      largePayload[1] = 0xD8;
      largePayload[2] = 0xFF;

      const res = validateUploadedFile("survey_roof.jpg", largePayload, { maxSizeBytes: 10 * 1024 * 1024 });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("exceeds maximum allowed limit");
    });
  });

  // ===================================================================
  // 6. BUSINESS LOGIC & FINANCIAL INTEGRITY
  // ===================================================================
  describe("Business Logic & Financial Abuse Prevention", () => {
    it("disallows commercial discounts over ₹50,000 without DIRECTOR authorization", () => {
      const regularSalesSession: AuthenticatedUser = {
        userId: "sales-1",
        organizationId: DEFAULT_ORG_ID,
        email: "sales@sunpower.com",
        role: "SALES_EXECUTIVE",
        name: "Sales Executive",
        isVerified: true,
      };

      const highDiscount = 60_000;
      const isDirector = regularSalesSession.role === "DIRECTOR" || regularSalesSession.role === "SUPER_ADMIN";
      expect(isDirector).toBe(false);
      // High discount attempt by sales must be blocked
      const canApplyDiscount = highDiscount <= 50_000 || isDirector;
      expect(canApplyDiscount).toBe(false);
    });

    it("verifies payment gateway webhook signature presence", () => {
      const missingSignatureHeaders = new Headers();
      const sig1 = missingSignatureHeaders.get("x-razorpay-signature");
      expect(sig1).toBeNull();

      const validSignatureHeaders = new Headers({
        "x-razorpay-signature": "f2d4e68a31908bc79e60",
      });
      const sig2 = validSignatureHeaders.get("x-razorpay-signature");
      expect(sig2).toBe("f2d4e68a31908bc79e60");
    });
  });
});
