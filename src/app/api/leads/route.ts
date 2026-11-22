import { NextRequest, NextResponse } from "next/server";
import { CreateLeadSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { getStore, addLeadActivity, addAuditLogEntry } from "@/lib/data/store";
import { Lead } from "@/lib/types/database";
import { globalRateLimiter, getRateLimitHeaders } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let results = store.leads;
    if (status) {
      results = results.filter((l) => l.status === status);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: unknown) {
    logger.error("Failed to fetch leads", err, "API_LEADS_GET");
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP-Based Sliding Window Rate Limiting (10 requests per minute per IP)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateCheck = globalRateLimiter.check(`leads:${clientIp}`, 10, 60_000);

    const rateHeaders = getRateLimitHeaders(rateCheck);

    if (!rateCheck.allowed) {
      logger.warn(`Rate limit exceeded for lead creation from IP: ${clientIp}`, "API_LEADS_RATELIMIT");
      return NextResponse.json(
        {
          success: false,
          error: "Too many enquiries submitted from this IP. Please wait before trying again.",
          retryAfterSec: rateCheck.retryAfterSec,
        },
        {
          status: 429,
          headers: rateHeaders,
        }
      );
    }

    const body = await req.json();

    // 2. Anti-Spam Honeypot Detection
    // Bots typically fill in hidden fields like 'website', 'company_url', or 'hp_comment'
    if (body.website || body.company_url) {
      logger.warn(`Spam bot trapped by honeypot field from IP: ${clientIp}`, "API_LEADS_HONEYPOT");
      return NextResponse.json(
        { success: false, error: "Invalid submission parameters" },
        { status: 400, headers: rateHeaders }
      );
    }

    const validatedData = CreateLeadSchema.parse(body);

    const store = getStore();
    const leadCode = `LED-2026-${String(store.leads.length + 101).padStart(4, "0")}`;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      lead_code: leadCode,
      full_name: validatedData.fullName,
      phone: validatedData.phone,
      email: validatedData.email || undefined,
      address: validatedData.address,
      city: validatedData.city || "Jalandhar",
      state: validatedData.state || "Punjab",
      pincode: validatedData.pincode || "144001",
      interested_capacity_kw: validatedData.interestedCapacityKw,
      system_topology: validatedData.systemTopology,
      monthly_bill_amount: validatedData.monthlyBillAmount,
      roof_availability: validatedData.roofAvailability,
      is_subsidy_requested: validatedData.isSubsidyRequested,
      additional_requirements: validatedData.additionalRequirements,
      source: validatedData.source || "WEB_FORM",
      status: "NEW",
      notes: validatedData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.leads.unshift(newLead);

    // 1. Immutable Activity History
    addLeadActivity(
      newLead.id,
      "SYSTEM_AUDIT",
      `New rooftop inquiry registered for ${newLead.interested_capacity_kw} kW ${newLead.system_topology} system. Address: ${newLead.address}, ${newLead.city}.`,
      "api_client",
      "API Ingestion"
    );

    // 2. Audit Trail
    addAuditLogEntry({
      performed_by: "api_client",
      user_role: "CUSTOMER",
      table_name: "leads",
      record_id: newLead.id,
      action: "INSERT",
      new_data: { lead_code: leadCode, fullName: newLead.full_name, phone: newLead.phone },
    });

    // 3. Operational Notification
    store.notifications.unshift({
      id: `n-${Date.now()}`,
      user_id: "20000000-0000-0000-0000-000000000002",
      title: `New Rooftop Inquiry: ${newLead.full_name}`,
      message: `${newLead.full_name} (${newLead.phone}) registered for ${newLead.interested_capacity_kw} kW.`,
      type: "INFO",
      is_read: false,
      action_url: "/leads",
      created_at: new Date().toISOString(),
    });

    logger.info("New rooftop solar lead received and committed", "API_LEADS", {
      leadCode,
      phone: newLead.phone,
      capacity: newLead.interested_capacity_kw,
    });

    return NextResponse.json(
      {
        success: true,
        data: newLead,
        message: `Lead ${leadCode} successfully registered.`,
      },
      {
        status: 201,
        headers: rateHeaders,
      }
    );
  } catch (err: unknown) {
    logger.error("Failed to create lead", err, "API_LEADS_POST");
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Validation failed",
      },
      { status: 422 }
    );
  }
}
