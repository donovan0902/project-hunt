import { NextRequest, NextResponse } from "next/server";
import { withAuth, getWorkOS } from "@workos-inc/authkit-nextjs";

export async function POST(request: NextRequest) {
  // Verify user is authenticated and part of an organization
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!user || !organizationId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const workos = getWorkOS();

    // check user's organization's allowed domains
    const allowedDomains = await workos.organizations.getOrganization(organizationId);
    const allowedDomain = allowedDomains.domains.find(domain => domain.domain.includes(email.split("@")[1]));
    if (!allowedDomain) {
      return NextResponse.json(
        { error: "Email is not allowed for this organization" },
        { status: 403 }
      );
    }
    
    // Send invitation to the specified organization
    const invitation = await workos.userManagement.sendInvitation({
      email,
      inviterUserId: user.id, // Shows inviter name in the email
      expiresInDays: 7,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
    });
  } catch (error) {
    console.error("Failed to send invitation:", error);
    
    // Handle specific WorkOS errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}

