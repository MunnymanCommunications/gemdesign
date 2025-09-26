import { ReactNode } from 'react';
import Navigation from './Navigation';
import PlatformHelpBubble from '@/components/chat/PlatformHelpBubble';

interface LayoutProps {
  children: ReactNode;
  isSidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
}

const Layout = ({ children, isSidebarCollapsed, toggleSidebar }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className={isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}>
        <main className="p-6">
          {children}
        </main>
      </div>
      <PlatformHelpBubble />
    </div>
  );
};

export default Layout;