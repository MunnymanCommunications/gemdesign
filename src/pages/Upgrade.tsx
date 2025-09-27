import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const PRICE_IDS = {
  pro: 'price_xxx', // Replace with actual Stripe price ID
  enterprise: 'price_yyy' // Replace with actual Stripe price ID
};

const UpgradePage = () => {
  const handleUpgrade = async (priceId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, userId: user.id }
    });
    
    if (error) {
      // Handle error
      console.error('Checkout error:', error);
      return;
    }
    
    // Redirect to Stripe checkout
    if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>You have reached your usage limit. Please upgrade to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold">Pro</h3>
                <p className="text-sm text-muted-foreground">Unlock more features and increase your limits.</p>
                <Button onClick={() => handleUpgrade(PRICE_IDS.pro)} className="mt-2">Upgrade to Pro</Button>
              </div>
              <div>
                <h3 className="font-bold">Enterprise</h3>
                <p className="text-sm text-muted-foreground">For large teams with advanced needs.</p>
                <Button onClick={() => handleUpgrade(PRICE_IDS.enterprise)} className="mt-2">Upgrade to Enterprise</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UpgradePage;