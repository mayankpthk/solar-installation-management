import { NextRequest, NextResponse } from "next/server";
import { ScheduleSurveySchema } from "@/lib/schemas";
import { getStore, scheduleSurvey } from "@/lib/data/store";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const leadId = searchParams.get("leadId");

    let results = store.surveys;
    if (status) {
      results = results.filter((s) => s.status === status);
    }
    if (leadId) {
      results = results.filter((s) => s.lead_id === leadId);
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: unknown) {
    logger.error("Failed to list site surveys", err, "API_SURVEYS_GET");
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ScheduleSurveySchema.parse(body);

    const survey = scheduleSurvey(
      validated.leadId,
      validated.assignedTechnicianId,
      validated.assignedTechnicianName || "Manpreet Singh",
      validated.scheduledDate,
      validated.notes,
      body.performedBy || "sales_coordinator",
      body.performerName || "Sales Coordinator"
    );

    return NextResponse.json({ success: true, data: survey }, { status: 201 });
  } catch (err: unknown) {
    logger.error("Failed to schedule site survey", err, "API_SURVEYS_POST");
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Validation failed" },
      { status: 422 }
    );
  }
}
