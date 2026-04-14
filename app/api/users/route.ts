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

async function getActor(): Promise<{ email: string; role: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { email: "", role: "none" };
    const actor = await clerkFetch(`/users/${userId}`);
    return {
      email: actor.email_addresses?.[0]?.email_address || "",
      role: actor.public_metadata?.role || "none",
    };
  } catch {
    return { email: "", role: "none" };
  }
}

export async function GET() {
  try {
    const data = await clerkFetch("/users?limit=50&order_by=-created_at");

    const users = data.map((user: any) => ({
      id: user.id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email_addresses?.[0]?.email_address || "",
      role: user.public_metadata?.role || "none",
      linkedProperty: user.public_metadata?.linkedProperty || "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      imageUrl: user.image_url || "",
      mustChangePassword: !!user.public_metadata?.mustChangePassword,
    }));

    // Hide system_admin users from the admin view
    const visibleUsers = users.filter((u: any) => u.role !== "system_admin");
    return NextResponse.json({ users: visibleUsers });
  } catch (error: any) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, password, role, linkedProperty } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing email, password, or role" }, { status: 400 });
    }

    const user = await clerkFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName || "",
        last_name: lastName || "",
        password,
        public_metadata: {
          role,
          mustChangePassword: true,
          ...(linkedProperty ? { linkedProperty } : {}),
        },
      }),
    });

    const actor = await getActor();
    await writeActivityLog({
      action: "user.created",
      actorEmail: actor.email,
      actorRole: actor.role,
      targetEmail: email,
      targetRole: role,
      summary: `${actor.email || "system"} created ${email} (${role})`,
      details: linkedProperty ? `Linked property: ${linkedProperty}` : undefined,
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: any) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, linkedProperty, password } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const actor = await getActor();
    const before = await clerkFetch(`/users/${userId}`);
    const beforeMeta = before.public_metadata || {};
    const targetEmail = before.email_addresses?.[0]?.email_address || "";
    const targetRole = beforeMeta.role || "none";

    // Handle password reset — admin-initiated. Also re-arm the
    // "must change password" flag so the user rotates off the temp.
    if (password) {
      await clerkFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      await clerkFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          public_metadata: { ...beforeMeta, mustChangePassword: true },
        }),
      });
      await writeActivityLog({
        action: "user.password_reset",
        actorEmail: actor.email,
        actorRole: actor.role,
        targetEmail,
        targetRole,
        summary: `${actor.email || "system"} reset password for ${targetEmail}`,
      });
      if (!role && linkedProperty === undefined) {
        return NextResponse.json({ success: true });
      }
    }

    const updatedMeta: Record<string, any> = { ...beforeMeta };
    if (role !== undefined) updatedMeta.role = role;
    if (linkedProperty !== undefined) updatedMeta.linkedProperty = linkedProperty;

    await clerkFetch(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ public_metadata: updatedMeta }),
    });

    if (role !== undefined && role !== beforeMeta.role) {
      await writeActivityLog({
        action: "user.role_changed",
        actorEmail: actor.email,
        actorRole: actor.role,
        targetEmail,
        targetRole: role,
        summary: `${actor.email || "system"} changed ${targetEmail} role: ${beforeMeta.role || "none"} → ${role}`,
      });
    }
    if (linkedProperty !== undefined && linkedProperty !== (beforeMeta.linkedProperty || "")) {
      await writeActivityLog({
        action: "user.property_changed",
        actorEmail: actor.email,
        actorRole: actor.role,
        targetEmail,
        targetRole,
        summary: `${actor.email || "system"} updated linked property for ${targetEmail}: ${beforeMeta.linkedProperty || "—"} → ${linkedProperty || "—"}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Users PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const actor = await getActor();
    let targetEmail = "";
    let targetRole = "none";
    try {
      const before = await clerkFetch(`/users/${userId}`);
      targetEmail = before.email_addresses?.[0]?.email_address || "";
      targetRole = before.public_metadata?.role || "none";
    } catch {}

    await clerkFetch(`/users/${userId}`, { method: "DELETE" });

    await writeActivityLog({
      action: "user.deleted",
      actorEmail: actor.email,
      actorRole: actor.role,
      targetEmail,
      targetRole,
      summary: `${actor.email || "system"} deleted ${targetEmail || userId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
