import { NextRequest, NextResponse } from "next/server";
import { getWorkOS } from "@workos-inc/authkit-nextjs";

export async function POST(request: NextRequest) {
  const workos = getWorkOS();
  const payload = await request.json();
  const sigHeader = request.headers.get("workos-signature") || "";

  try {
    // Verify signature and construct action context
    const action = await workos.actions.constructAction({
      payload,
      sigHeader,
      secret: process.env.WORKOS_ACTIONS_SECRET!,
    });

    // Ensure this is a user registration action
    if (action.object !== "user_registration_action_context") {
      const response = await workos.actions.signResponse(
        {
          type: "user_registration",
          verdict: "Deny",
          errorMessage: "Invalid action type",
        },
        process.env.WORKOS_ACTIONS_SECRET!
      );
      return NextResponse.json(response);
    }

    // Extract email domain from user registration context
    const emailDomain = action.userData.email.split("@")[1];

    // Check if domain exists in any organization
    const { data: orgs } = await workos.organizations.listOrganizations({
      domains: [emailDomain],
    });

    const isAllowed = orgs.length > 0;

    // Return signed response
    const response = await workos.actions.signResponse(
      {
        type: "user_registration",
        verdict: isAllowed ? "Allow" : "Deny",
        ...(isAllowed ? {} : { errorMessage: "Email domain not allowed" }),
      },
      process.env.WORKOS_ACTIONS_SECRET!
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to process user registration action:", error);

    // Return deny on any error
    const response = await workos.actions.signResponse(
      {
        type: "user_registration",
        verdict: "Deny",
        errorMessage: "Failed to process registration",
      },
      process.env.WORKOS_ACTIONS_SECRET!
    );

    return NextResponse.json(response);
  }
}

