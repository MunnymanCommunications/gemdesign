import { ReactNode } from 'react';
import Navigation from './Navigation';
import PlatformHelpBubble from '@/components/chat/PlatformHelpBubble';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="lg:pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
      <PlatformHelpBubble />
    </div>
  );
};

export default Layout;