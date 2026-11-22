// Domain Workflow Engine: Site Survey Gate & Quotation Authorization
// Architectural Requirement:
// "A quotation cannot be finalized unless its required site survey is approved,
// except when an authorized administrator explicitly records a documented override."

import { SiteSurvey, SurveyStatus, UserRole } from "@/lib/types/database";

export interface SurveyGateVerification {
  isEligible: boolean;
  surveyStatus?: SurveyStatus;
  gatePassed: boolean;
  isOverrideAllowed: boolean;
  isOverrideApplied: boolean;
  rejectionReason?: string;
  auditMessage: string;
}

/**
 * Roles permitted to approve or reject a technical site survey:
 * - SUPER_ADMIN
 * - DIRECTOR
 * - SALES_MANAGER
 */
export function canApproveSurvey(userRole: UserRole): boolean {
  return (
    userRole === "SUPER_ADMIN" ||
    userRole === "DIRECTOR" ||
    userRole === "SALES_MANAGER"
  );
}

/**
 * Roles permitted to perform an Administrative Override on an unapproved survey gate:
 * - SUPER_ADMIN
 * - DIRECTOR
 */
export function canOverrideSurveyGate(userRole: UserRole): boolean {
  return userRole === "SUPER_ADMIN" || userRole === "DIRECTOR";
}

/**
 * Validates whether a quotation is eligible to be finalized against its site survey.
 */
export function verifyQuotationEligibility({
  survey,
  userRole,
  overrideReason,
}: {
  survey?: SiteSurvey | null;
  userRole: UserRole;
  overrideReason?: string;
}): SurveyGateVerification {
  // 1. Missing survey
  if (!survey) {
    const isOverrideAllowed = canOverrideSurveyGate(userRole);
    if (isOverrideAllowed && overrideReason && overrideReason.trim().length >= 10) {
      return {
        isEligible: true,
        gatePassed: false,
        isOverrideAllowed: true,
        isOverrideApplied: true,
        auditMessage: `CRITICAL_OVERRIDE: Quotation finalized without site survey by ${userRole}. Reason: ${overrideReason.trim()}`,
      };
    }
    return {
      isEligible: false,
      gatePassed: false,
      isOverrideAllowed,
      isOverrideApplied: false,
      rejectionReason: "No technical site survey is linked to this customer quotation.",
      auditMessage: "SURVEY_GATE_BLOCKED: Missing site survey.",
    };
  }

  // 2. Approved survey (Clean standard path)
  if (survey.status === "APPROVED") {
    return {
      isEligible: true,
      surveyStatus: "APPROVED",
      gatePassed: true,
      isOverrideAllowed: false,
      isOverrideApplied: false,
      auditMessage: `SURVEY_GATE_PASSED: Site survey ${survey.survey_code} is officially APPROVED.`,
    };
  }

  // 3. Unapproved survey (SCHEDULED, IN_PROGRESS, SUBMITTED, REJECTED, REQUIRES_REASSESSMENT)
  const isOverrideAllowed = canOverrideSurveyGate(userRole);

  if (isOverrideAllowed && overrideReason && overrideReason.trim().length >= 10) {
    return {
      isEligible: true,
      surveyStatus: survey.status,
      gatePassed: false,
      isOverrideAllowed: true,
      isOverrideApplied: true,
      auditMessage: `CRITICAL_OVERRIDE: Survey gate bypassed for ${survey.survey_code} (Status: ${survey.status}) by ${userRole}. Reason: ${overrideReason.trim()}`,
    };
  }

  let statusExplanation = "";
  if (survey.status === "REJECTED") {
    statusExplanation = "The site survey was REJECTED due to structural or shading non-viability.";
  } else if (survey.status === "REQUIRES_REASSESSMENT") {
    statusExplanation = "The site survey REQUIRES REASSESSMENT by an engineering lead.";
  } else if (survey.status === "SUBMITTED" || survey.status === "IN_PROGRESS" || survey.status === "SCHEDULED") {
    statusExplanation = `The site survey is currently in '${survey.status}' state and has not been approved by a manager.`;
  } else {
    statusExplanation = `The site survey is currently ${survey.status}.`;
  }

  return {
    isEligible: false,
    surveyStatus: survey.status,
    gatePassed: false,
    isOverrideAllowed,
    isOverrideApplied: false,
    rejectionReason: `${statusExplanation} Quotations cannot be finalized without an approved site survey unless an administrator records an official override.`,
    auditMessage: `SURVEY_GATE_BLOCKED: Site survey ${survey.survey_code} has status ${survey.status}.`,
  };
}
