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
import { useStripeSync } from '@/hooks/useStripeSync';

interface AdminSettings {
  max_free_documents: number;
  max_base_documents: number;
  max_pro_documents: number;
  stripe_price_id_base: string | null;
  stripe_price_id_pro: string | null;
}

const Subscription = () => {
  useStripeSync();
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
      const { data, error } = await supabase.rpc('get_public_pricing_settings');
      if (error) throw error;
      setAdminSettings({
        max_free_documents: data?.[0]?.max_free_documents || 2,
        max_base_documents: data?.[0]?.max_base_documents || 5,
        max_pro_documents: data?.[0]?.max_pro_documents || 50,
        stripe_price_id_base: data?.[0]?.stripe_price_id_base || null,
        stripe_price_id_pro: data?.[0]?.stripe_price_id_pro || null,
      });
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    // Use public pricing function instead of admin_settings
    const { data: pricing } = await supabase.rpc('get_public_pricing_settings');
    
    // Ensure valid priceId before calling checkout
    if (!priceId || !pricing?.[0]?.stripe_price_id_pro) {
      toast.error('Configuration Error: Pricing not configured');
      return;
    }

    // Call edge function with proper error handling
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, userId: user.id }
    });

    if (error) {
      console.error('Stripe error:', error);
      toast.error(`Subscription Error: ${error.message}`);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const getLimitByTier = (tier: string) => {
    switch (tier) {
      case 'free':
        return adminSettings?.max_free_documents || 2;
      case 'base':
        return adminSettings?.max_base_documents || 5;
      case 'pro':
        return adminSettings?.max_pro_documents || 50;
      default:
        return 2;
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
      features: [`${getLimitByTier('free')} Document Uploads`, 'Basic AI Assistant', 'Limited Tool Access'],
      limitations: ['No priority support'],
    },
    {
      name: 'Base',
      price: '$49.95/month',
      tier: 'base',
      priceId: 'price_1S9RRS00jf1eOeXQS6thA7bQ',
      description: 'Perfect for getting started',
      icon: Star,
      features: [`${getLimitByTier('base')} Document Uploads`, 'Basic AI Assistant', 'Invoice Generator', 'Email Support'],
      limitations: ['Limited document processing', 'Basic customization'],
    },
    {
      name: 'Pro',
      price: '$99.95/month',
      tier: 'pro',
      priceId: 'price_1S9RRi00jf1eOeXQQKXVtRri',
      description: 'For growing businesses',
      icon: Crown,
      popular: true,
      features: [`${getLimitByTier('pro')} Document Uploads`, 'Advanced AI Assistant', 'Full Business Tools Suite', 'Priority Support'],
      limitations: [],
    },
  ];

  if (settingsLoading || subLoading) {
    return <Layout><div className="flex justify-center items-center h-screen">Loading subscription details...</div></Layout>;
  }

  const currentLimit = subscription ? subscription.max_documents : 2;
  const usagePercentage = Math.min((documentCount / currentLimit) * 100, 100);

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

          {subscription ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Current Plan: {subscription.effective_tier.charAt(0).toUpperCase() + subscription.effective_tier.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Document Usage</h4>
                  <div className="text-2xl font-bold mb-2">{documentCount} / {currentLimit}</div>
                  <Progress value={usagePercentage} className="mb-2" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Subscription Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={subscription.is_active ? "default" : "destructive"}>{subscription.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span>{subscription.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Documents:</span>
                      <span>{subscription.max_documents}</span>
                    </div>
                    {subscription.stripe_customer_id && (
                      <div className="flex justify-between">
                        <span>Customer ID:</span>
                        <span className="font-mono text-xs truncate">{subscription.stripe_customer_id}</span>
                      </div>
                    )}
                    {subscription.stripe_subscription_id && (
                      <div className="flex justify-between">
                        <span>Subscription ID:</span>
                        <span className="font-mono text-xs truncate">{subscription.stripe_subscription_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Subscription Status: Not Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h4 className="font-medium mb-2">Document Usage</h4>
                <div className="text-2xl font-bold mb-2">{documentCount} / 2</div>
                <Progress value={Math.min((documentCount / 2) * 100, 100)} className="mb-2" />
                <p className="text-sm text-muted-foreground mt-4">No subscription record found. You may be on the free plan or need to contact support.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = subscription?.effective_tier === plan.tier;
              const isButtonDisabled = (isCurrentPlan && plan.tier !== 'free') || checkoutLoading;

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
                      ) : (
                        <Button
                          className="w-full"
                          variant={isCurrentPlan ? 'secondary' : (plan.popular ? 'default' : 'outline')}
                          disabled={isButtonDisabled}
                          onClick={() => handleSubscribe(plan.priceId!)}
                        >
                          {checkoutLoading ? 'Processing...' : (isCurrentPlan && plan.tier !== 'free' ? 'Current Plan' : (subscription?.effective_tier === 'free' ? 'Upgrade' : 'Switch Plan'))}
                        </Button>
                      )}
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