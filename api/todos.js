import fs from 'fs';
import path from 'path';

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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { gistId, githubToken } = getCredentials();

  try {
    if (req.method === 'GET') {
      if (!gistId || !githubToken) {
        return res.status(500).json({
          success: false,
          error: 'Missing server credentials: GITHUB_TOKEN and GIST_ID must be configured.',
        });
      }

      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Vercel-Todo-Sync',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
          success: false,
          error: `GitHub API error (${response.status}): ${errorText || response.statusText}`,
        });
      }

      const data = await response.json();
      const file = data?.files?.['todos.json'];

      if (!file || !file.content || !file.content.trim()) {
        return res.status(200).json([]);
      }

      try {
        const parsed = JSON.parse(file.content);
        if (Array.isArray(parsed)) {
          return res.status(200).json(parsed);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON request body.',
        });
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

        return res.status(201).json({
          success: true,
          message: `Registered user ${newUser.name}`,
          data: newUser,
          user: newUser,
        });
      }

      const todos = Array.isArray(body)
        ? body
        : body && Array.isArray(body.todos)
        ? body.todos
        : body && typeof body === 'object' && body.title
        ? [body]
        : null;

      if (!todos) {
        return res.status(400).json({
          success: false,
          error: 'Request body must be an array of todos or contain a todos array.',
        });
      }

      if (!gistId || !githubToken) {
        return res.status(500).json({
          success: false,
          error: 'Missing server credentials: GITHUB_TOKEN and GIST_ID must be configured.',
        });
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
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
          success: false,
          error: `GitHub API error (${response.status}): ${errorText || response.statusText}`,
        });
      }

      return res.status(200).json({
        success: true,
        todos: body,
      });
    }

    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}
