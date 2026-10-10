export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const gistId = process.env.GIST_ID;
      const githubToken = process.env.GITHUB_TOKEN;

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

      const todos = Array.isArray(body)
        ? body
        : body && Array.isArray(body.todos)
        ? body.todos
        : null;

      if (!todos) {
        return res.status(400).json({
          success: false,
          error: 'Request body must be an array of todos or contain a todos array.',
        });
      }

      const gistId = process.env.GIST_ID;
      const githubToken = process.env.GITHUB_TOKEN;

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
