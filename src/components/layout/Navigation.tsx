import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Home,
  MessageSquare,
  FileText,
  Wrench,
  BarChart3,
  Palette,
  CreditCard,
  Settings,
  LogOut,
  User,
  Sun,
  Moon,
  Camera
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRoles } from '@/hooks/useRoles';

const Navigation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useRoles();
  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 block dark:hidden" />
    </Button>
  );

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/chat', label: 'AI Assistant', icon: MessageSquare },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/business-tools', label: 'Business Tools', icon: Wrench },
    { path: '/satellite-assessment', label: 'Satellite Camera Assessment', icon: Camera },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/theme', label: 'Theme', icon: Palette },
    { path: '/subscription', label: 'Subscription', icon: CreditCard },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/admin', label: 'Admin Settings', icon: Settings },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-card lg:border-r lg:border-border">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0 px-4">
            <img src="/logo.png" alt="Design Rite Ai" className="h-10" />
            <ThemeToggle />
          </div>
          <div className="mt-8 flex flex-col flex-grow">
            <nav className="flex-1 px-2 space-y-1">
              {navItems.filter(item => item.path !== '/admin' || isAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="px-2 pt-4 border-t border-border">
              <div className="flex items-center px-2 py-2 text-sm text-muted-foreground">
                <User className="mr-3 h-5 w-5" />
                <span className="truncate">{user?.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <img src="/logo.png" alt="Design Rite Ai" className="h-10" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
              <div className="flex flex-col h-full">
                <div className="flex-1 pt-6">
                  <nav className="space-y-1">
                    {navItems.filter(item => item.path !== '/admin' || isAdmin).map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavigation(item.path)}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center px-2 py-2 text-sm text-muted-foreground">
                    <User className="mr-3 h-5 w-5" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
    </>
  );
};

export default Navigation;