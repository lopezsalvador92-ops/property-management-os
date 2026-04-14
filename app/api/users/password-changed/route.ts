import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeActivityLog } from "@/lib/activity-log";

const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

async function clerkFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Clerk API error:", res.status, err);
    throw new Error(err?.errors?.[0]?.long_message || `Clerk API ${res.status}`);
  }
  return res.json();
}

// POST /api/users/password-changed
// Clears the `mustChangePassword` flag from the current user's publicMetadata.
// Called from <FirstLoginGate> after the client-side `user.updatePassword()` succeeds.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const user = await clerkFetch(`/users/${userId}`);
    const currentMeta = user.public_metadata || {};
    if (!currentMeta.mustChangePassword) {
      return NextResponse.json({ success: true, noop: true });
    }

    const { mustChangePassword: _drop, ...rest } = currentMeta;
    await clerkFetch(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ public_metadata: rest }),
    });

    const targetEmail = user.email_addresses?.[0]?.email_address || "";
    const targetRole = currentMeta.role || "none";
    await writeActivityLog({
      action: "user.first_login_password_set",
      actorEmail: targetEmail,
      actorRole: "self",
      targetEmail,
      targetRole,
      summary: `${targetEmail} set a new password on first login`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("password-changed POST error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
