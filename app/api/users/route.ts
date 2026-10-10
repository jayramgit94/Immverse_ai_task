import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { ApiResponse, User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = store.getAllUsers();
    return NextResponse.json<ApiResponse<User[]>>(
      {
        success: true,
        total: users.length,
        data: users,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawName = (body.name || body.username || body.userName || '').trim();
    const role = (body.role || 'Team Member').trim();
    const email = typeof body.email === 'string' && body.email.includes('@')
      ? body.email.trim().toLowerCase()
      : `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'user'}@company.internal`;

    if (!rawName) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User name or username is required.' },
        { status: 400 }
      );
    }

    const newUser = store.createUser({
      name: rawName,
      email,
      role,
    });

    return NextResponse.json<ApiResponse<User>>(
      {
        success: true,
        message: `Registered user ${newUser.name}`,
        data: newUser,
      },
      { status: 201 }
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
