import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: 'Users',
    path: '/users',
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: 'Teachers',
    path: '/teachers',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    name: 'Questions',
    path: '/questions',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    name: 'Results',
    path: '/results',
    icon: <TrendingUp className="h-5 w-5" />,
  },
];

interface SidebarProps {
  user?: { username: string };
  onLogout?: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-40 md:hidden"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Brand */}
        <div className="border-b border-border px-6 py-6">
          <div className="flex items-center gap-2">
            <img 
              src="/fbc_logo2.png" 
              alt="FBC Logo"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <div className="flex flex-col gap-0 leading-tight">
              <h1 className="text-sm font-bold tracking-tight">Teacher Evaluation</h1>
              <h2 className="text-sm font-bold tracking-tight">System</h2>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => {
                // Close sidebar on mobile when navigating
                if (window.innerWidth < 768) {
                  setIsOpen(false);
                }
              }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                {item.icon}
              </span>
              <span>{item.name}</span>
              {isActive(item.path) && (
                <div className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 transform rounded-full bg-primary-foreground" />
              )}
            </Link>
          ))}
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border px-3 py-4">
          {user && (
            <div className="mb-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Logged in as
              </p>
              <p className="text-sm font-semibold text-foreground">
                {user.username}
              </p>
            </div>
          )}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default Sidebar;
