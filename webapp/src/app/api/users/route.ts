import { clerkClient, User } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  try {
    // Await if client is a function (Clerk v5+)
    const client = await clerkClient();
    
    const response = await client.users.getUserList({
      query: query,
      limit: 20,
    });
    
    // Some versions return { data } and some return the array directly
    const usersData = response.data || response;
    
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
