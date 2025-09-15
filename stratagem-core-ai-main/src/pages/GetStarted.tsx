import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const GetStarted = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [prices, setPrices] = useState<{ base: number; pro: number } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [selectedTier, setSelectedTier] = useState<'base' | 'pro'>('base');
  const [enterpriseToken, setEnterpriseToken] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [claiming, setClaiming] = useState(false);

  // SEO: title, description, canonical
  useEffect(() => {
    const title = 'Get Started – Plans & Access | DesignR AI';
    document.title = title;

    const metaDescContent = 'Choose Basic/Pro or use an invite for Enterprise or Master Admin access.';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', metaDescContent);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/get-started`);
  }, []);

  useEffect(() => {
    const loadPrices = async () => {
      setLoadingPrices(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('price_base_cents, price_pro_cents')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Failed to load prices', error);
      } else if (data) {
        setPrices({ base: (data.price_base_cents || 0) / 100, pro: (data.price_pro_cents || 0) / 100 });
      }
      setLoadingPrices(false);
    };
    loadPrices();
  }, []);

  const priceText = useMemo(() => {
    if (!prices) return '';
    return selectedTier === 'base' ? `$${prices.base}/mo` : `$${prices.pro}/mo`;
  }, [prices, selectedTier]);

  const requireAuth = () => {
    if (!user) {
      navigate('/auth');
      return false;
    }
    return true;
  };

  const setSubscription = async (tier: 'base' | 'pro') => {
    if (!requireAuth()) return;
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({ user_id: user!.id, tier }, { onConflict: 'user_id' });
    if (error) {
      toast({ title: 'Subscription error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plan selected', description: `You're on the ${tier} plan now.` });
      navigate('/');
    }
  };

  const claimInvite = async (token: string) => {
    if (!requireAuth()) return;
    if (!token) {
      toast({ title: 'Missing token', description: 'Please paste your invite token.', variant: 'destructive' });
      return;
    }
    setClaiming(true);
    const { data, error } = await supabase.functions.invoke('claim-invite', {
      body: { token },
    });
    setClaiming(false);
    if (error) {
      toast({ title: 'Invite error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Access granted', description: `Role: ${data.assignedRole}${data.appliedTier ? ` • Plan: ${data.appliedTier}` : ''}` });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Get Started
          </h1>
          <Button variant="ghost" onClick={() => navigate('/auth')}>{user ? 'Go to App' : 'Sign In'}</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section aria-labelledby="plans" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <h2 id="plans" className="sr-only">Signup options</h2>

          {/* Basic / Pro */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Basic / Pro</CardTitle>
              <CardDescription>
                {loadingPrices ? 'Loading pricing…' : `Choose your plan${prices ? ` • ${priceText}` : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant={selectedTier === 'base' ? 'default' : 'outline'} onClick={() => setSelectedTier('base')}>Basic</Button>
                  <Button variant={selectedTier === 'pro' ? 'default' : 'outline'} onClick={() => setSelectedTier('pro')}>Pro</Button>
                </div>
                <p className="text-sm text-muted-foreground">Pricing and limits are configured by Master Admin.</p>
                <Button className="w-full" onClick={() => setSubscription(selectedTier)}>
                  {user ? 'Continue' : 'Sign in to continue'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise (Invite) */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Enterprise (Invite)</CardTitle>
              <CardDescription>White-label + admin portal. Requires invite token.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input placeholder="Paste enterprise invite token" value={enterpriseToken} onChange={(e) => setEnterpriseToken(e.target.value)} />
                <Button className="w-full" disabled={claiming} onClick={() => claimInvite(enterpriseToken)}>
                  {claiming ? 'Claiming…' : user ? 'Claim Invite' : 'Sign in to claim'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Master Admin (Invite) */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Master Admin (Invite)</CardTitle>
              <CardDescription>Full control and global analytics. Requires invite token.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input placeholder="Paste master admin invite token" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
                <Button className="w-full" variant="secondary" disabled={claiming} onClick={() => claimInvite(adminToken)}>
                  {claiming ? 'Claiming…' : user ? 'Claim Invite' : 'Sign in to claim'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-10" />

        <section aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-semibold mb-2">How it works</h2>
          <p className="text-sm text-muted-foreground">
            Use the public Basic/Pro option to try the app. Enterprise and Master Admin access are invite-only via tokens for testing and production.
          </p>
        </section>
      </main>
    </div>
  );
};

export default GetStarted;