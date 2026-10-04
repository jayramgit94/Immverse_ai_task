import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { ApiResponse, TaskWithDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    const task = store.getTaskById(id);

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Task ${id} was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<TaskWithDetails>>(
      {
        success: true,
        data: task,
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

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    const body = await req.json();

    const result = store.updateTask(id, body);

    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: result.error || 'Failed to update task.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<TaskWithDetails>>(
      {
        success: true,
        message: `Task ${id} updated`,
        data: result.task,
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

export async function PUT(req: NextRequest, context: RouteContext) {
  return PATCH(req, context);
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    const deleted = store.deleteTask(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Task ${id} was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ id: string }>>(
      {
        success: true,
        message: `Task ${id} deleted and purged from all dependency graphs.`,
        data: { id },
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
