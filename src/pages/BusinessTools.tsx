import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import InvoiceGenerator from '@/components/business/InvoiceGenerator';
import ProposalGenerator from '@/components/business/ProposalGenerator';
import BusinessCalculators from '@/components/business/BusinessCalculators';
import { useRoles } from '@/hooks/useRoles';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react';

const BusinessTools = () => {
  const { isAdmin } = useRoles();
  const { isProOrHigher } = useSubscription();
  const [activeTab, setActiveTab] = useState('invoice');

  const baseTools = [
    {
      id: 'invoice',
      title: 'Invoice Generator',
      description: 'Create professional invoices with your branding',
      icon: FileText,
      color: 'bg-blue-500',
      requiresPro: false
    },
    {
      id: 'proposal',
      title: 'Proposal Generator',
      description: 'Create professional proposals for clients',
      icon: FileText,
      color: 'bg-indigo-500',
      requiresPro: false
    },
    {
      id: 'calculator',
      title: 'Business Calculator',
      description: 'Calculate taxes, margins, and ROI',
      icon: Calculator,
      color: 'bg-green-500',
      requiresPro: false
    },
    {
      id: 'analytics',
      title: 'Performance Tracker',
      description: 'Track business metrics and KPIs',
      icon: TrendingUp,
      color: 'bg-orange-500',
      requiresPro: false
    }
  ];

  const proTools = [];

  const tools = [...baseTools, ...(isProOrHigher || isAdmin ? proTools : [])];

  return (
    <Layout>
      <SEO
        title="Business Tools — Invoices, Proposals, Calculators"
        description="Generate invoices and proposals and run business calculators."
        canonical="/business-tools"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Business Tools</h1>
          <p className="text-muted-foreground mt-2">
            Essential tools to streamline your business operations
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tools.map((tool) => (
              <TabsTrigger key={tool.id} value={tool.id} className="flex items-center gap-1 text-xs">
                <tool.icon className="h-3 w-3" />
                <span className="hidden sm:inline truncate">{tool.title}</span>
                {tool.requiresPro && (
                  <Badge variant="secondary" className="text-xs ml-1 hidden md:inline">PRO</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="invoice" className="space-y-6">
            <InvoiceGenerator />
          </TabsContent>

          <TabsContent value="proposal" className="space-y-6">
            <ProposalGenerator />
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <BusinessCalculators />
          </TabsContent>


          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">+0% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">+0% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">$0.00 pending</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0%</div>
                  <p className="text-xs text-muted-foreground">Monthly growth</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Dashboard</CardTitle>
                <CardDescription>Track your business metrics and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground">
                    Detailed analytics and reporting features will be available once you start using the platform.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default BusinessTools;