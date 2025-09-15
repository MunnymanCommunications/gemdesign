import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  Crown, 
  Star, 
  Zap,
  FileText,
  MessageSquare,
  Wrench,
  BarChart3,
  Palette,
  Shield
} from 'lucide-react';

interface UserSubscription {
  tier: string;
  max_documents: number;
  created_at: string;
}

interface AdminSettings {
  max_base_documents: number;
  max_pro_documents: number;
  max_enterprise_documents: number;
}

const Subscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchDocumentCount();
      fetchAdminSettings();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (error) throw error;
      setDocumentCount(count || 0);
    } catch (error) {
      console.error('Error fetching document count:', error);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('max_base_documents, max_pro_documents, max_enterprise_documents')
        .limit(1)
        .single();

      if (error) throw error;
      setAdminSettings(data);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
    }
  };

  const upgradeSubscription = async (newTier: string) => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ tier: newTier })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      // Refresh subscription data
      fetchSubscription();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    }
  };

  const plans = [
    {
      name: 'Base',
      price: '$49.95/month',
      tier: 'base',
      description: 'Perfect for getting started',
      icon: Star,
      color: 'border-gray-200',
      features: [
        `${adminSettings?.max_base_documents || 1} Document Upload${(adminSettings?.max_base_documents || 1) > 1 ? 's' : ''}`,
        'Basic AI Assistant',
        'Invoice Generator',
        'Email Support',
        'Basic Analytics'
      ],
      limitations: [
        'Limited document processing',
        'No priority support',
        'Basic customization'
      ]
    },
    {
      name: 'Pro',
      price: '$99.95/month',
      tier: 'pro',
      description: 'For growing businesses',
      icon: Crown,
      color: 'border-primary',
      popular: true,
      features: [
        `${adminSettings?.max_pro_documents || 5} Document Uploads`,
        'Advanced AI Assistant',
        'Full Business Tools Suite',
        'Priority Support',
        'Advanced Analytics',
        'White-Label Options',
        'Custom Branding'
      ],
      limitations: []
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      tier: 'enterprise',
      description: 'For large organizations',
      icon: Zap,
      color: 'border-purple-500',
      features: [
        `${adminSettings?.max_enterprise_documents || 20} Document Uploads`,
        'Custom AI Training',
        'Full Platform Access',
        'Dedicated Support',
        'Custom Integrations',
        'Multi-tenant Support',
        'Advanced Security',
        'SLA Guarantee'
      ],
      limitations: []
    }
  ];

  const usagePercentage = subscription ? (documentCount / subscription.max_documents) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Subscription Plans — DesignR AI"
        description="Compare Base and Pro plans and manage your subscription."
        canonical="/subscription"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose the perfect plan for your business needs
          </p>
        </header>

        {/* Current Plan Status */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
              </CardTitle>
              <CardDescription>
                Your current subscription details and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Document Usage</h4>
                  <div className="text-2xl font-bold mb-2">
                    {documentCount} / {subscription.max_documents}
                  </div>
                  <Progress value={usagePercentage} className="mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {subscription.max_documents - documentCount} slots remaining
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Plan Status</h4>
                  <Badge variant={subscription.tier === 'pro' ? 'default' : 'secondary'} className="mb-2">
                    {subscription.tier === 'base' ? 'Free Plan' : 
                     subscription.tier === 'pro' ? 'Pro Plan' : 'Enterprise Plan'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Active since {new Date(subscription.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-3 w-3" />
                      <span>AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3 w-3" />
                      <span>Document Management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="h-3 w-3" />
                      <span>Business Tools</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription?.tier === plan.tier;
            
            return (
              <Card 
                key={plan.tier} 
                className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full"
                    variant={isCurrentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan}
                    onClick={() => !isCurrentPlan && upgradeSubscription(plan.tier)}
                  >
                    {isCurrentPlan ? 'Current Plan' : 
                     plan.tier === 'enterprise' ? 'Contact Sales' : 
                     subscription?.tier === 'base' ? 'Upgrade' : 'Switch Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>Compare what's included in each plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Feature</th>
                    <th className="text-center p-4">Base</th>
                    <th className="text-center p-4">Pro</th>
                    <th className="text-center p-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4">Document Uploads</td>
                    <td className="text-center p-4">{adminSettings?.max_base_documents || 1}</td>
                    <td className="text-center p-4">{adminSettings?.max_pro_documents || 5}</td>
                    <td className="text-center p-4">{adminSettings?.max_enterprise_documents || 20}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">AI Assistant</td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Business Tools</td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Analytics</td>
                    <td className="text-center p-4">Basic</td>
                    <td className="text-center p-4">Advanced</td>
                    <td className="text-center p-4">Custom</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">White-Label</td>
                    <td className="text-center p-4"><X className="h-4 w-4 mx-auto text-red-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Priority Support</td>
                    <td className="text-center p-4"><X className="h-4 w-4 mx-auto text-red-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center p-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing & Payment</CardTitle>
            <CardDescription>Manage your billing information and payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Payment Integration Coming Soon</h3>
              <p className="text-muted-foreground">
                Secure payment processing and billing management will be available shortly.
                For now, contact our sales team for enterprise plans.
              </p>
              <Button variant="outline" className="mt-4">Contact Sales</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Subscription;