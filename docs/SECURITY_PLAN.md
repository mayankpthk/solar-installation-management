# SolarOS: Comprehensive Cybersecurity & Threat Mitigation Plan
**System:** SolarOS — The Complete Solar Business Operating System  
**Framework:** Zero-Trust Architecture & STRIDE Threat Modeling  
**Author:** Cybersecurity Engineer & Principal Architect  
**Status:** Approved Architectural Baseline  

---

## 1. Security Architecture & Threat Philosophy

SolarOS handles sensitive customer identity records (Aadhaar cards, utility bills, electricity connections), high-value inventory transactions (hundreds of thousands of rupees in inverters and batteries), and confidential enterprise financial metrics (job margins, company profit and loss). 

The security architecture operates under a **Zero-Trust Model**:
* **Never Trust, Always Verify:** Every incoming request to Server Actions and API Route Handlers must validate session integrity, user role claims, and parameter schemas.
* **Defense-in-Depth:** A vulnerability at the frontend layer or application layer must never lead to data compromise, because the PostgreSQL database layer enforces Row-Level Security (RLS) and constraints independently.
* **Least Privilege:** Users receive strictly the minimum permissions required for their daily operational tasks.

---

## 2. STRIDE Threat Modeling & Mitigation Matrix

| Threat Category | Potential Attack Vector in SolarOS | Real-World Impact | SolarOS Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | • Attacker poses as Field Technician to submit fake completion reports.<br>• External user poses as customer to access private quotes. | Fake warranty issuance; unauthorized data access. | • Supabase GoTrue JWT tokens in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.<br>• Cryptographic verification of user identity against database `user_profiles`.<br>• MFA required for Director & Finance Manager roles. |
| **Tampering** | • Salesperson tampers with quotation discount or BOM prices before sending.<br>• Tech alters photo timestamps to hide delayed work. | Unauthorized profit loss; fraudulent site reports. | • Server computes BOM and pricing exclusively; client payloads containing modified prices are discarded.<br>• Photos stamped with client GPS + timestamp and verified against server receipt time. |
| **Repudiation** | • Homeowner claims they never signed the installation acceptance form.<br>• Technician denies taking custody of high-value inverter. | Legal payment disputes; inventory loss. | • SVG touch-signatures captured alongside client IP address, user-agent, and ISO timestamp.<br>• Warehouse barcode scans link the custodian technician's user ID immutably to the serial number. |
| **Information Disclosure** | • Competitor probes `/api/leads` to harvest solar customer leads.<br>• Sales executive views executive gross margins and technician wage rates. | Customer poaching; wage dissatisfaction; margin leaks. | • Public lead endpoint accepts writes only (`INSERT` allowed, `SELECT` strictly disabled).<br>• Job Costing table protected by RLS: restricted exclusively to `DIRECTOR`, `SUPER_ADMIN`, and `FINANCE_MANAGER`. |
| **Denial of Service** | • Botnet floods public lead form with millions of fake inquiries.<br>• Attacker uploads multi-gigabyte files to exhaust storage quotas. | Operational disruption; storage bill inflation. | • IP-based sliding window rate limiting (Upstash Redis / Vercel KV) limiting lead submissions to 5 per IP per minute.<br>• Storage file size hard limits (10 MB per photo, 20 MB per PDF) with client canvas compression. |
| **Elevation of Privilege** | • Sales Executive crafts request with role `'DIRECTOR'` to approve their own discounts.<br>• Customer alters URL ID to view another homeowner's warranty card. | Complete platform compromise; IDOR privacy breaches. | • Roles stored in database `user_profiles` table; JWT claims checked against server DB on mutating actions.<br>• Supabase RLS enforces row ownership: customers can only query rows where `lead_id` matches their own email. |

---

## 3. OWASP Top 10 Mitigation Implementation

### 3.1 A01: Broken Access Control (Insecure Direct Object References - IDOR)
* **Risk:** A logged-in customer modifies the URL parameter from `/portal/orders/ORD-001` to `/portal/orders/ORD-002` to view another client's address and quotation.
* **Mitigation:**
  1. Next.js server actions resolve the customer's authenticated user ID from the active session.
  2. The database query applies an enforced join against the customer's verified identity:
  ```sql
  -- Supabase RLS Policy on Orders for Customer Portal
  CREATE POLICY "Customers can only query their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
      current_user_role() = 'CUSTOMER'
      AND lead_id IN (
          SELECT id FROM leads 
          WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
  );
  ```

### 3.2 A02: Cryptographic Failures (Data Protection)
* **In-Transit:** All endpoints enforce TLS 1.3 with HTTP Strict Transport Security (`HSTS: max-age=63072000; includeSubDomains; preload`).
* **At-Rest:** Database volumes, backups, and Supabase Object Storage buckets are encrypted at rest using AES-256.
* **Sensitive Field Encryption:** Government identification documents (Aadhaar cards, bank details for solar subsidies) are stored in private Supabase Storage buckets accessible only through short-lived (15-minute) presigned URLs generated server-side.

### 3.3 A03: Injection (SQL, Command, Scripting)
* **SQL Injection:** All database operations utilize parameterized queries through the Supabase PostgREST client or PostgreSQL parameterized statements. Raw string concatenation in SQL is strictly forbidden.
* **Cross-Site Scripting (XSS):**
  * React JSX automatically escapes dynamic values.
  * Customer touch-signatures stored as SVG strings are sanitized through `DOMPurify` before rendering to prevent malicious vector payloads:
  ```typescript
  import DOMPurify from "isomorphic-dompurify";
  export function SafeSignature({ svgContent }: { svgContent: string }) {
    const cleanSvg = DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true } });
    return <div dangerouslySetInnerHTML={{ __html: cleanSvg }} />;
  }
  ```

### 3.4 A04: Insecure Design & The "Bypassable Survey" Flaw
* **Architectural Risk:** In a naive implementation, a sales rep could trigger quote generation before a technical survey confirms that the roof can physically hold the solar panels.
* **Mitigation (Hard Database Gate):**
  A PostgreSQL trigger blocks quotation insertion if the referenced survey is not approved:
  ```sql
  CREATE OR REPLACE FUNCTION fn_enforce_survey_approval_gate()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM site_surveys 
          WHERE id = NEW.survey_id AND status = 'APPROVED'
      ) THEN
          RAISE EXCEPTION 'Cannot generate quotation: Site survey % is not APPROVED', NEW.survey_id
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_quote_survey_gate
  BEFORE INSERT ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION fn_enforce_survey_approval_gate();
  ```

### 3.5 A05: Security Misconfiguration (Storage Bucket Policies)
* Storage buckets are categorized into strict public/private tiers:
  * `public-assets`: Company logos, static PDF icons (Public read, staff write).
  * `survey-photos`: Private. Read restricted to authenticated staff; write restricted to survey technicians.
  * `installation-reports`: Private. Read restricted to staff and assigned customer.
  * `subsidy-documents`: Private Restricted. Read/Write restricted exclusively to `FINANCE_MANAGER`, `DIRECTOR`, and `SUPER_ADMIN`.

---

## 4. Rate Limiting & Anti-Automation Guardrails

Public-facing endpoints (Lead submission, WhatsApp webhook, Customer portal login) are protected by a sliding window token bucket:

```typescript
// src/lib/security/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// 5 lead submissions per 60 seconds per IP address
export const leadSubmissionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:leads",
});

// 5 failed login attempts per 15 minutes per email
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "900 s"),
  prefix: "ratelimit:auth",
});
```

---

## 5. Immutable Security Audit Logging Specification

Any operation that modifies financial balances, adjusts hardware serial states, alters discount thresholds, or deletes records automatically triggers an audit log entry:

```sql
CREATE OR REPLACE FUNCTION fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role_enum;
BEGIN
    -- Extract user ID from application session context
    v_user_id := auth.uid();
    SELECT role INTO v_user_role FROM user_profiles WHERE id = v_user_id;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (performed_by, user_role, table_name, record_id, action, old_data)
        VALUES (v_user_id, v_user_role, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (performed_by, user_role, table_name, record_id, action, old_data, new_data)
        VALUES (v_user_id, v_user_role, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (performed_by, user_role, table_name, record_id, action, new_data)
        VALUES (v_user_id, v_user_role, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to critical operational tables
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
CREATE TRIGGER trg_audit_serials AFTER UPDATE ON serial_numbers FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
CREATE TRIGGER trg_audit_dispatches AFTER UPDATE ON dispatches FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
```
