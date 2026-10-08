import { clerkClient, currentUser, User } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserRoles } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();

  try {
    const requestingUser = await currentUser();
    if (!requestingUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = getUserRoles(requestingUser);
    if (!roles.some((role) => ['author', 'editor', 'admin'].includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!query || query.length > 100) {
      return NextResponse.json({ error: 'Query must contain 1 to 100 characters' }, { status: 400 });
    }

    const client = await clerkClient();
    
    const response = await client.users.getUserList({
      query: query,
      limit: 20,
    });
    
    const usersData = response.data;
    
    const users = usersData.map((u: User) => {
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "Unknown";
      return {
        value: u.username || u.id,
        label: `${name} (@${u.username})`,
        name: name,
        username: u.username,
        imageUrl: u.imageUrl,
        id: u.id
      };
    });

    return NextResponse.json(users, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error("Error fetching Clerk users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
