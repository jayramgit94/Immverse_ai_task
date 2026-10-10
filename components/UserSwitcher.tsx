'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isMounted, setIsMounted] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard support: Escape to dismiss add user sheet
  useEffect(() => {
    if (!showAddModal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Name and email are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let createdUser: User | null = null;
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

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.data) {
          createdUser = data.data;
        }
      } catch (networkErr) {
        console.warn('Network call to /api/users failed, using local user creation', networkErr);
      }

      if (!createdUser) {
        const initials = newName
          .trim()
          .split(' ')
          .filter(Boolean)
          .map((p) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'U';

        createdUser = {
          id: `USR-${Date.now().toString(36).toUpperCase()}`,
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole.trim() || 'Software Engineer',
          initials,
          avatarColor: '#2563EB',
        };
      }

      onUserCreated(createdUser);
      onSelectUser(createdUser);
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
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors shadow-sm flex-shrink-0"
      >
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-medium text-white flex-shrink-0"
          style={{ backgroundColor: currentUser?.avatarColor || '#18181B' }}
        >
          {currentUser?.initials || 'U'}
        </div>
        <span className="truncate max-w-[50px] xs:max-w-[70px] sm:max-w-[120px] font-normal text-gray-800">
          {currentUser ? currentUser.name.split(' ')[0] : 'Select'}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 max-sm:-right-12 mt-1.5 w-60 max-w-[calc(100vw-1.5rem)] bg-white border border-[#E5E7EB] rounded-md shadow-lg py-1 z-30 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
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

          <div className="p-1.5 bg-gray-50/70 border-t border-gray-100">
            <button
              onClick={() => {
                setShowAddModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200/80 rounded-md transition-colors shadow-xs active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5 text-gray-600" strokeWidth={1.5} />
              <span>Add team member...</span>
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal / Bottom Sheet */}
      {showAddModal &&
        isMounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="w-full sm:max-w-md bg-white border-t sm:border border-[#E5E7EB] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Sheet Drag Handle */}
              <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-white">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] bg-white">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-medium text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: newName.trim() ? '#2563EB' : '#18181B' }}
                  >
                    {newName.trim()
                      ? newName
                          .trim()
                          .split(' ')
                          .filter(Boolean)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                      Add Team Member
                    </h3>
                    <p className="text-[11px] text-gray-500 font-normal">
                      Add a new collaborator to this workspace
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 active:bg-gray-100 rounded-full transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-5 space-y-4">
                {error && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                    <span className="font-semibold">Error:</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Liam Smith"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Email address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="liam@company.internal"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Engineer"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                  />
                  {/* Quick Role Suggestions */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[11px] text-gray-400 mr-0.5">Quick:</span>
                    {['Frontend', 'Backend', 'DevOps', 'Designer', 'Product'].map((roleSuggestion) => (
                      <button
                        key={roleSuggestion}
                        type="button"
                        onClick={() => setNewRole(`${roleSuggestion} Engineer`)}
                        className="px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      >
                        {roleSuggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB] mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newName.trim() || !newEmail.trim()}
                    className="px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-black active:scale-95 rounded-md transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? 'Creating...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
