import { NextRequest, NextResponse } from "next/server";
import { SubmitSurveySchema, ReviewSurveySchema, AdminOverrideSurveyGateSchema } from "@/lib/schemas";
import { getStore, submitSurvey, reviewSurvey, recordAdminOverride } from "@/lib/data/store";
import { canApproveSurvey, canOverrideSurveyGate, verifyQuotationEligibility } from "@/domain/workflow/survey-gate";
import { UserRole } from "@/lib/types/database";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = getStore();
    const survey = store.surveys.find((s) => s.id === params.id || s.survey_code === params.id);
    if (!survey) {
      return NextResponse.json({ success: false, error: "Survey not found" }, { status: 404 });
    }

    const lead = store.leads.find((l) => l.id === survey.lead_id);
    return NextResponse.json({ success: true, data: { survey, lead } });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "SUBMIT_FINDINGS") {
      const validated = SubmitSurveySchema.parse(body.findings);
      const survey = submitSurvey(
        params.id,
        {
          roof_azimuth_direction: validated.roofAzimuthDirection,
          roof_tilt_angle_deg: validated.roofTiltAngleDeg,
          roof_area_sqft: validated.roofAreaSqft || validated.usableAreaSqft,
          usable_area_sqft: validated.usableAreaSqft,
          shadow_free_area_sqft: validated.shadowFreeAreaSqft || validated.usableAreaSqft * 0.9,
          roof_type: validated.roofType,
          structural_integrity: validated.structuralIntegrity,
          structural_observations: validated.structuralObservations,
          shadow_obstacles_notes: validated.shadowObstaclesNotes,
          dc_cable_distance_meters: validated.dcCableDistanceMeters,
          ac_cable_distance_meters: validated.acCableDistanceMeters,
          electrical_connection_details: validated.electricalConnectionDetails,
          grid_suitability: validated.gridSuitability,
          sanctioned_load_kw: validated.sanctionedLoadKw,
          technician_notes: validated.technicianNotes,
          recommended_capacity_kw: validated.recommendedCapacityKw,
          recommended_topology: validated.recommendedTopology,
          photo_urls: validated.photoUrls,
          feasibility_status: validated.feasibilityStatus,
        },
        body.performedBy || "tech-1",
        body.performerName || "Survey Tech"
      );
      return NextResponse.json({ success: true, data: survey });
    }

    if (action === "REVIEW_DECISION") {
      const validated = ReviewSurveySchema.parse({
        surveyId: params.id,
        outcome: body.outcome,
        reviewComments: body.reviewComments,
        reviewedBy: body.reviewedBy || "20000000-0000-0000-0000-000000000001",
        reviewerRole: body.reviewerRole || "DIRECTOR",
      });

      // Server-side authorization check!
      if (!canApproveSurvey(validated.reviewerRole as UserRole)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unauthorized: User role '${validated.reviewerRole}' is not permitted to review or approve site surveys. Only Super Admin, Director, and Sales Manager have authority.`,
          },
          { status: 403 }
        );
      }

      const survey = reviewSurvey(
        params.id,
        validated.outcome,
        validated.reviewComments,
        validated.reviewerRole as UserRole,
        body.reviewerName || "Rajesh Malhotra",
        validated.reviewedBy
      );

      return NextResponse.json({ success: true, data: survey });
    }

    if (action === "ADMIN_OVERRIDE") {
      const validated = AdminOverrideSurveyGateSchema.parse({
        surveyId: params.id,
        quotationId: body.quotationId,
        reason: body.reason,
        adminRole: body.adminRole || "DIRECTOR",
        adminName: body.adminName || "Rajesh Malhotra",
      });

      if (!canOverrideSurveyGate(validated.adminRole as UserRole)) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Only Super Admin and Company Director can execute an administrative survey gate override.`,
          },
          { status: 403 }
        );
      }

      const survey = recordAdminOverride(
        params.id,
        validated.quotationId,
        validated.reason,
        validated.adminRole as UserRole,
        validated.adminName,
        body.adminId || "20000000-0000-0000-0000-000000000001"
      );

      return NextResponse.json({ success: true, data: survey });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    logger.error("Failed to patch survey", err, "API_SURVEY_PATCH");
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
