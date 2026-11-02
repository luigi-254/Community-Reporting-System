'use client';

import { useState, useEffect, useRef } from 'react';
import { User, HelpCircle, LogOut, ChevronDown } from 'lucide-react';

export default function ProfilePill({ user, onLogout, onProfileClick, onHelpClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const pillRef = useRef(null);

  const initials = String(user?.name || 'C')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pillRef.current && !pillRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div ref={pillRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 hover:bg-gray-50 px-3 py-1.5 transition-colors"
        aria-label="User profile"
      >
        <div className="flex size-6 items-center justify-center rounded-full bg-[#dce5d8] text-[#244637] text-xs font-semibold">
          {initials}
        </div>
        <p className="text-sm font-medium text-[#173c32] truncate">
          {user?.name || "Citizen"}
        </p>
        <ChevronDown className="w-4 h-4 text-[#687468]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 border border-[#dce2d8] bg-white rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e7e5]">
            <p className="text-sm font-semibold text-[#173c32]">
              {user?.name || "Citizen"}
            </p>
            <p className="text-xs text-[#687468] truncate">
              {user?.email || ""}
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onProfileClick) onProfileClick();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#173c32] hover:bg-[#f5f8f5] transition-colors"
            >
              <User className="w-4 h-4 text-[#c4d3bf]" />
              My Profile
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onHelpClick) onHelpClick();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#173c32] hover:bg-[#f5f8f5] transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[#c4d3bf]" />
              Help & Support
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                if (onLogout) onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
            >
              <LogOut className="w-4 h-4 text-[#dc2626]" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
