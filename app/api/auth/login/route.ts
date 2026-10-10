import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { ApiResponse, User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || body.id;
    const email = body.email;
    const username = (body.username || body.userName || body.name || '').trim().toLowerCase();

    let targetUser: User | undefined;

    if (userId) {
      targetUser = store.getUserById(userId);
    } else if (email) {
      targetUser = store.getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
    } else if (username) {
      targetUser = store.getAllUsers().find(
        (u) =>
          u.name.toLowerCase() === username ||
          u.email.toLowerCase().startsWith(username) ||
          u.name.toLowerCase().includes(username)
      );
    }

    if (!targetUser) {
      // Default to first user if nothing provided or not found
      const allUsers = store.getAllUsers();
      if (allUsers.length > 0) {
        targetUser = allUsers[0];
      } else {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'No workspace users available.' },
          { status: 404 }
        );
      }
    }

    const token = `mock_session_${targetUser.id}_${Date.now()}`;

    return NextResponse.json<ApiResponse<{ user: User; token: string }>>(
      {
        success: true,
        message: `Switched session to ${targetUser.name}`,
        data: {
          user: targetUser,
          token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
