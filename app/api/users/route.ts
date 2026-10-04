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
    const { name, email, role } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User name is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const newUser = store.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: (role || 'Team Member').trim(),
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
