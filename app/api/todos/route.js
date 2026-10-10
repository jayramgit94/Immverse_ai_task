import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getCredentials() {
  let githubToken = process.env.GITHUB_TOKEN;
  let gistId = process.env.GIST_ID;

  if (!githubToken || !gistId) {
    try {
      const candidates = ['.env.local', '.env'];
      for (const candidate of candidates) {
        const fullPath = path.resolve(process.cwd(), candidate);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed.startsWith('GITHUB_TOKEN=') && !githubToken) {
              githubToken = trimmed.replace('GITHUB_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
            }
            if (trimmed.startsWith('GIST_ID=') && !gistId) {
              gistId = trimmed.replace('GIST_ID=', '').trim().replace(/^["']|["']$/g, '');
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    githubToken: githubToken || '',
    gistId: gistId || '',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    const { gistId, githubToken } = getCredentials();

    if (!gistId || !githubToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing server credentials: GITHUB_TOKEN and GIST_ID must be configured.',
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Vercel-Todo-Sync',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `GitHub API error (${response.status}): ${errorText || response.statusText}`,
        },
        {
          status: response.status >= 400 && response.status < 600 ? response.status : 500,
          headers: corsHeaders,
        }
      );
    }

    const data = await response.json();
    const file = data?.files?.['todos.json'];

    if (!file || !file.content || !file.content.trim()) {
      return NextResponse.json([], {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      const parsed = JSON.parse(file.content);
      if (Array.isArray(parsed)) {
        return NextResponse.json(parsed, {
          status: 200,
          headers: corsHeaders,
        });
      }
      return NextResponse.json([], {
        status: 200,
        headers: corsHeaders,
      });
    } catch {
      return NextResponse.json([], {
        status: 200,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request body.',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // If request contains user creation payload (e.g. { user: ... } or { name, email })
    if (body && (body.user || (body.name && body.email))) {
      const userPayload = body.user || body;
      const name = (userPayload.name || '').trim();
      const email = (userPayload.email || '').trim().toLowerCase();
      const initials = name
        ? name
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : 'U';

      const newUser = {
        id: userPayload.id || `USR-${Date.now().toString(36).toUpperCase()}`,
        name: name || 'New User',
        email: email || 'user@company.internal',
        role: (userPayload.role || 'Team Member').trim(),
        initials: initials || 'U',
        avatarColor: '#2563EB',
      };

      return NextResponse.json(
        {
          success: true,
          message: `Registered user ${newUser.name}`,
          data: newUser,
          user: newUser,
        },
        {
          status: 201,
          headers: corsHeaders,
        }
      );
    }

    // Accept array directly, object containing todos array, or single todo object
    const todos = Array.isArray(body)
      ? body
      : body && Array.isArray(body.todos)
      ? body.todos
      : body && typeof body === 'object' && body.title
      ? [body]
      : null;

    if (!todos) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be an array of todos or contain a todos array.',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { gistId, githubToken } = getCredentials();

    if (!gistId || !githubToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing server credentials: GITHUB_TOKEN and GIST_ID must be configured.',
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const contentToSave = Array.isArray(body) ? body : todos;

    const payload = {
      files: {
        'todos.json': {
          content: JSON.stringify(contentToSave, null, 2),
        },
      },
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Vercel-Todo-Sync',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `GitHub API error (${response.status}): ${errorText || response.statusText}`,
        },
        {
          status: response.status >= 400 && response.status < 600 ? response.status : 500,
          headers: corsHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        todos: body,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
