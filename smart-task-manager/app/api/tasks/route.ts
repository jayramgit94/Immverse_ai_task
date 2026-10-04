import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { ApiResponse, TaskWithDetails, TaskPriority, TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') as TaskStatus | null;
    const priority = searchParams.get('priority') as TaskPriority | null;
    const assignedUserId = searchParams.get('assignedUserId');
    const search = searchParams.get('search');
    const blockedOnly = searchParams.get('blockedOnly') === 'true';

    const tasks = store.getAllTasks({
      status: status || undefined,
      priority: priority || undefined,
      assignedUserId: assignedUserId || undefined,
      search: search || undefined,
      blockedOnly,
    });

    return NextResponse.json<ApiResponse<TaskWithDetails[]>>(
      {
        success: true,
        total: tasks.length,
        data: tasks,
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
    const { title, description, priority, status, assignedUserId, dependencyIds } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Task title is required.' },
        { status: 400 }
      );
    }

    if (!assignedUserId || typeof assignedUserId !== 'string') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'An assigned team member ID is required.' },
        { status: 400 }
      );
    }

    const assignee = store.getUserById(assignedUserId);
    if (!assignee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Team member ${assignedUserId} does not exist.` },
        { status: 404 }
      );
    }

    const result = store.createTask({
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'Medium',
      status: status || 'To Do',
      assignedUserId,
      dependencyIds: Array.isArray(dependencyIds) ? dependencyIds : [],
    });

    if (!result.success || !result.task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error || 'Failed to create task.' },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<TaskWithDetails>>(
      {
        success: true,
        message: `Task ${result.task.id} created successfully`,
        data: result.task,
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
