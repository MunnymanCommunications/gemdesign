import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Crown, Star, Shield, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface AdminSettings {
  max_base_documents: number;
  max_pro_documents: number;
  stripe_price_id_base: string | null;
  stripe_price_id_pro: string | null;
}

const Subscription = () => {
  const { user } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [documentCount, setDocumentCount] = useState(0);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocumentCount();
      fetchAdminSettings();
    }
  }, [user]);

  const fetchDocumentCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
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
        .select('max_base_documents, max_pro_documents, stripe_price_id_base, stripe_price_id_pro')
        .limit(1)
        .single();
      if (error) throw error;
      setAdminSettings(data);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCheckout = async (priceId: string | null) => {
    if (!user) return;
    if (!priceId) {
      toast.error("This plan is not yet configured for payments. Please contact support.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId: user.id },
      });
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error("Could not create a checkout session. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0/month',
      tier: 'free',
      priceId: null,
      description: 'For personal use and exploration',
      icon: Star,
      features: ['2 Document Uploads', 'Basic AI Assistant', 'Limited Tool Access'],
      limitations: ['No priority support'],
    },
    {
      name: 'Base',
      price: '$49.95/month',
      tier: 'base',
      priceId: adminSettings?.stripe_price_id_base || null,
      description: 'Perfect for getting started',
      icon: Star,
      features: [`${adminSettings?.max_base_documents || 5} Document Uploads`, 'Basic AI Assistant', 'Invoice Generator', 'Email Support'],
      limitations: ['Limited document processing', 'Basic customization'],
    },
    {
      name: 'Pro',
      price: '$99.95/month',
      tier: 'pro',
      priceId: adminSettings?.stripe_price_id_pro || null,
      description: 'For growing businesses',
      icon: Crown,
      popular: true,
      features: [`${adminSettings?.max_pro_documents || 50} Document Uploads`, 'Advanced AI Assistant', 'Full Business Tools Suite', 'Priority Support'],
      limitations: [],
    },
  ];

  if (settingsLoading || subLoading) {
    return <Layout><div className="flex justify-center items-center h-screen">Loading subscription details...</div></Layout>;
  }

  const usagePercentage = subscription ? (documentCount / subscription.max_documents) * 100 : 0;

  return (
    <Layout>
      <SEO
        title="Subscription Plans — Design Rite AI"
        description="Compare plans and manage your subscription."
        canonical="/subscription"
      />
      <TooltipProvider>
        <div className="max-w-6xl mx-auto space-y-6 p-4">
          <header className="text-center">
            <h1 className="text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground mt-2">Choose the perfect plan for your business needs</p>
          </header>

          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h4 className="font-medium mb-2">Document Usage</h4>
                <div className="text-2xl font-bold mb-2">{documentCount} / {subscription.max_documents}</div>
                <Progress value={usagePercentage} className="mb-2" />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = subscription?.tier === plan.tier;
              const isButtonDisabled = (isCurrentPlan && plan.tier !== 'free') || checkoutLoading;

              const checkoutButton = (
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'secondary' : (plan.popular ? 'default' : 'outline')}
                  disabled={isButtonDisabled}
                  onClick={() => handleCheckout(plan.priceId)}
                >
                  {checkoutLoading ? 'Processing...' : (isCurrentPlan && plan.tier !== 'free' ? 'Current Plan' : (subscription?.tier === 'free' ? 'Upgrade' : 'Switch Plan'))}
                </Button>
              );

              return (
                <Card key={plan.tier} className={`flex flex-col ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4"><Icon className="h-6 w-6" /></div>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">{plan.price}</div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /><span>{feature}</span></div>
                      ))}
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /><span className="text-muted-foreground">{limitation}</span></div>
                      ))}
                    </div>
                    <div className="mt-auto">
                      {plan.tier === 'free' ? (
                        <Button className="w-full" variant="secondary" disabled>
                          {isCurrentPlan ? 'Your Current Plan' : 'Free Plan'}
                        </Button>
                      ) : !plan.priceId ? (
                        <Tooltip>
                          <TooltipTrigger className="w-full">
                            <div className="w-full p-2 bg-muted text-muted-foreground rounded-md flex items-center justify-center text-sm cursor-not-allowed">
                              <AlertTriangle className="h-4 w-4 mr-2" /> Not Available
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Admin needs to set the Stripe Price ID.</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : checkoutButton}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    </Layout>
  );
};

export default Subscription;