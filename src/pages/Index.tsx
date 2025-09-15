import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we authenticate you.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <SEO
        title="DesignR AI Dashboard — Business Assistant"
        description="Manage chat, documents, analytics, and tools with DesignR AI."
        canonical="/"
      />
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            DesignR AI Platform
          </h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user.email}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to chat');
              navigate('/chat');
            }}
          >
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Get help with your business tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your AI-powered assistant is ready to help with file analysis, invoice generation, and more.
              </p>
              <Button className="w-full">
                Start Chat
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to documents');
              navigate('/documents');
            }}
          >
            <CardHeader>
              <CardTitle>Document Manager</CardTitle>
              <CardDescription>Upload and manage your files</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Upload documents, images, and files for AI analysis and processing.
              </p>
              <Button variant="outline" className="w-full">
                Browse Files
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to business-tools');
              navigate('/business-tools');
            }}
          >
            <CardHeader>
              <CardTitle>Business Tools</CardTitle>
              <CardDescription>Generate invoices and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create professional invoices, reports, and other business documents.
              </p>
              <Button variant="outline" className="w-full">
                View Tools
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to analytics');
              navigate('/analytics');
            }}
          >
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Monitor your application usage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track performance metrics and user analytics for your business.
              </p>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to helpful-documents');
              navigate('/helpful-documents');
            }}
          >
            <CardHeader>
              <CardTitle>Helpful Documents</CardTitle>
              <CardDescription>Access guides and resources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View, download, and print helpful PDFs and guides provided by admins.
              </p>
              <Button variant="outline" className="w-full">
                Browse Documents
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 bg-card border border-border" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to subscription');
              navigate('/subscription');
            }}
          >
            <CardHeader>
              <CardTitle>Subscription Tiers</CardTitle>
              <CardDescription>Manage access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Control Guest, Pro, and Enterprise access to features.
              </p>
              <Button variant="outline" className="w-full">
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
