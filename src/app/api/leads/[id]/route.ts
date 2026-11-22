import { NextRequest, NextResponse } from "next/server";
import { getStore, addLeadActivity, assignSalesperson, scheduleLeadFollowUp, updateLeadStatus } from "@/lib/data/store";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = getStore();
    const lead = store.leads.find((l) => l.id === params.id || l.lead_code === params.id);
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    const activities = store.leadActivities
      .filter((a) => a.lead_id === lead.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const survey = store.surveys.find((s) => s.lead_id === lead.id);

    return NextResponse.json({
      success: true,
      data: {
        lead,
        activities,
        survey,
      },
    });
  } catch (err: unknown) {
    logger.error("Failed to fetch lead", err, "API_LEAD_GET");
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, salespersonId, salespersonName, followUpDate, notes, status, reason, performedBy, performerName } = body;

    let updatedLead;

    if (action === "ASSIGN_SALESPERSON") {
      updatedLead = assignSalesperson(
        params.id,
        salespersonId,
        salespersonName,
        followUpDate,
        notes,
        performedBy || "sales_manager"
      );
    } else if (action === "SCHEDULE_FOLLOW_UP") {
      updatedLead = scheduleLeadFollowUp(
        params.id,
        followUpDate,
        notes || "Scheduled follow-up call",
        performedBy || "sales_rep",
        performerName || "Sales Rep"
      );
    } else if (action === "UPDATE_STATUS") {
      updatedLead = updateLeadStatus(
        params.id,
        status,
        performedBy || "sales_rep",
        performerName || "Sales Rep",
        reason
      );
    } else if (action === "ADD_NOTE") {
      addLeadActivity(
        params.id,
        "NOTE",
        notes,
        performedBy || "sales_rep",
        performerName || "Sales Rep"
      );
      const store = getStore();
      updatedLead = store.leads.find((l) => l.id === params.id);
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (err: unknown) {
    logger.error("Failed to update lead", err, "API_LEAD_PATCH");
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
