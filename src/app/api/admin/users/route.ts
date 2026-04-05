import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const auth = getAdminAuth();
    const result = await auth.listUsers(1000);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || "",
      disabled: u.disabled,
      createdAt: u.metadata.creationTime || "",
      lastSignIn: u.metadata.lastSignInTime || "",
    }));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const auth = getAdminAuth();
    const user = await auth.createUser({
      email,
      password,
      displayName: displayName || undefined,
    });

    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create user";
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const auth = getAdminAuth();
    await auth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
