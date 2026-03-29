import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const clerk = await clerkClient();
    const usersResponse = await clerk.users.getUserList({ limit: 50 });
    const users = usersResponse.data.map((user) => ({
      id: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.emailAddresses[0]?.emailAddress || "",
      role: (user.publicMetadata as { role?: string })?.role || "none",
      linkedProperty: (user.publicMetadata as { linkedProperty?: string })?.linkedProperty || "",
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      imageUrl: user.imageUrl || "",
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, password, role, linkedProperty } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing email, password, or role" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      emailAddress: [email],
      firstName: firstName || "",
      lastName: lastName || "",
      password,
      publicMetadata: {
        role,
        ...(linkedProperty ? { linkedProperty } : {}),
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: any) {
    console.error("Create user error:", error);
    const message = error?.errors?.[0]?.longMessage || error?.message || "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, linkedProperty } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const currentMeta = user.publicMetadata || {};

    const updatedMeta: Record<string, any> = { ...currentMeta };
    if (role !== undefined) updatedMeta.role = role;
    if (linkedProperty !== undefined) updatedMeta.linkedProperty = linkedProperty;

    await clerk.users.updateUser(userId, {
      publicMetadata: updatedMeta,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}