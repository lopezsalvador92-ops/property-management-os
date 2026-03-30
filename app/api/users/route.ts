import { NextResponse } from "next/server";

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
          ...(linkedProperty ? { linkedProperty } : {}),
        },
      }),
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

    // Handle password reset
    if (password) {
      await clerkFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      if (!role && linkedProperty === undefined) {
        return NextResponse.json({ success: true });
      }
    }

    // Get current metadata first
    const user = await clerkFetch(`/users/${userId}`);
    const currentMeta = user.public_metadata || {};

    const updatedMeta: Record<string, any> = { ...currentMeta };
    if (role !== undefined) updatedMeta.role = role;
    if (linkedProperty !== undefined) updatedMeta.linkedProperty = linkedProperty;

    await clerkFetch(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ public_metadata: updatedMeta }),
    });

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

    await clerkFetch(`/users/${userId}`, { method: "DELETE" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}