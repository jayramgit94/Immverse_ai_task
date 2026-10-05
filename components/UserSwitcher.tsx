'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/lib/types';
import { ChevronDown, Check, UserPlus, X } from 'lucide-react';

interface UserSwitcherProps {
  currentUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  onUserCreated: (newUser: User) => void;
}

export function UserSwitcher({
  currentUser,
  users,
  onSelectUser,
  onUserCreated,
}: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Name and email are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole.trim() || 'Software Engineer',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      onUserCreated(data.data);
      onSelectUser(data.data);
      setShowAddModal(false);
      setIsOpen(false);
      setNewName('');
      setNewEmail('');
      setNewRole('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors shadow-sm"
      >
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-medium text-white flex-shrink-0"
          style={{ backgroundColor: currentUser?.avatarColor || '#18181B' }}
        >
          {currentUser?.initials || 'U'}
        </div>
        <span className="truncate max-w-[80px] sm:max-w-[120px] font-normal text-gray-800">
          {currentUser ? currentUser.name : 'Select user'}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-white border border-[#E5E7EB] rounded-md shadow-lg py-1 z-30 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Current Session
            </p>
            {currentUser && (
              <p className="text-xs font-medium text-gray-900 truncate mt-0.5">
                {currentUser.name} <span className="text-gray-500 font-normal">({currentUser.role})</span>
              </p>
            )}
          </div>

          <div className="py-1 max-h-52 overflow-y-auto">
            <p className="px-3 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Switch User
            </p>
            {users.map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                    isSelected ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-mono text-white"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.initials}
                    </div>
                    <div className="truncate">
                      <div className="truncate">{user.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{user.role}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 flex-shrink-0 ml-2" strokeWidth={1.5} />}
                </button>
              );
            })}
          </div>

          <div className="p-1">
            <button
              onClick={() => {
                setShowAddModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Add team member...</span>
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-gray-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              {error && (
                <div className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liam Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="liam@company.internal"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Engineer"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
