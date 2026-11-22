import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/types/database";
import { createServerClientInstance } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export function withAuth(
  allowedRoles: UserRole[],
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createServerClientInstance();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      // For development/mock environments when running without live Supabase session,
      // fallback to mock headers or development role:
      if (error || !session) {
        const devHeader = req.headers.get("x-mock-role") as UserRole | null;
        if (process.env.NODE_ENV !== "production" && devHeader) {
          const mockUser: AuthenticatedUser = {
            id: "20000000-0000-0000-0000-000000000001",
            email: "director@sunpowersolutions.com",
            role: devHeader,
            organizationId: "00000000-0000-0000-0000-000000000001",
          };
          if (!allowedRoles.includes(mockUser.role)) {
            throw new ForbiddenError(`Role '${mockUser.role}' is not authorized for this resource.`);
          }
          return await handler(req, mockUser);
        }
        throw new UnauthorizedError("A valid session is required.");
      }

      // Query database for authoritative user role and organization
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role, organization_id")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        throw new ForbiddenError("User profile does not exist or is inactive.");
      }

      if (!allowedRoles.includes(profile.role)) {
        throw new ForbiddenError(`Role '${profile.role}' is not authorized for this action.`);
      }

      const authenticatedUser: AuthenticatedUser = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        organizationId: profile.organization_id,
      };

      return await handler(req, authenticatedUser);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
        return NextResponse.json(err.toProblemDetails(req.nextUrl.pathname), {
          status: err.statusCode,
        });
      }
      return NextResponse.json(
        {
          type: "https://solaros.sunpower.com/errors/internal-server-error",
          title: "Internal Server Error",
          status: 500,
          detail: err instanceof Error ? err.message : "An unexpected server error occurred",
        },
        { status: 500 }
      );
    }
  };
}
