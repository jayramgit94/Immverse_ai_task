import fs from 'fs';
import path from 'path';

const SEED_USERS = [
  {
    id: 'USR-1',
    name: 'Alex Rivera',
    email: 'alex@company.internal',
    role: 'Tech Lead',
    initials: 'AR',
    avatarColor: '#18181B',
  },
  {
    id: 'USR-2',
    name: 'Sarah Chen',
    email: 'sarah@company.internal',
    role: 'Senior Frontend',
    initials: 'SC',
    avatarColor: '#2563EB',
  },
  {
    id: 'USR-3',
    name: 'Marcus Vance',
    email: 'marcus@company.internal',
    role: 'Backend Engineer',
    initials: 'MV',
    avatarColor: '#059669',
  },
  {
    id: 'USR-4',
    name: 'Elena Rostova',
    email: 'elena@company.internal',
    role: 'Product Manager',
    initials: 'ER',
    avatarColor: '#7C3AED',
  },
];

// Global in-memory cache for serverless environments
let memoryUsers = [...SEED_USERS];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      total: memoryUsers.length,
      data: memoryUsers,
    });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
      }
    }

    const { name, email, role } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'User name is required.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const initials = name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const newUser = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: (role || 'Team Member').trim(),
      initials,
      avatarColor: '#2563EB',
    };

    memoryUsers.push(newUser);

    return res.status(201).json({
      success: true,
      message: `Registered user ${newUser.name}`,
      data: newUser,
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
}
