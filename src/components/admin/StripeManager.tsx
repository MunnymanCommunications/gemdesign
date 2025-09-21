import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, ExternalLink, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const StripeManager = () => {
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-config-status');
      setStripeConfigured(!error);
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setStripeConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const openSupabaseSecrets = () => {
    window.open('https://supabase.com/dashboard/project/gzgncmpytstovexfazdw/settings/functions', '_blank');
  };

  const openStripeDashboard = () => {
    window.open('https://dashboard.stripe.com/', '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Configuration
        </CardTitle>
        <CardDescription>
          Manage Stripe integration and payment processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium">Stripe Secret Key</h4>
              <p className="text-sm text-muted-foreground">
                Required for payment processing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading ? (
                <Badge variant="outline">Checking...</Badge>
              ) : (
                <Badge variant={stripeConfigured ? 'default' : 'destructive'}>
                  {stripeConfigured ? 'Configured' : 'Not Set'}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={checkStripeStatus}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button onClick={openSupabaseSecrets} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure Stripe Secret in Supabase
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Add your Stripe secret key as "STRIPE_SECRET_KEY" in Supabase Edge Function secrets
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-medium">Setup Instructions</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>
              Get your Stripe Secret Key from the{' '}
              <button onClick={openStripeDashboard} className="text-primary hover:underline">
                Stripe Dashboard
              </button>
            </li>
            <li>Add it as "STRIPE_SECRET_KEY" in Supabase Edge Function secrets</li>
            <li>Create your subscription products in Stripe</li>
            <li>For each product, create a Price and copy the **Price ID** (it starts with `price_...`)</li>
            <li>Paste the Price IDs into the "Billing Configuration" section under the "Settings" tab</li>
            <li>Test the integration with Stripe's test mode</li>
          </ol>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" onClick={openStripeDashboard}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>
          <Button variant="outline" onClick={openSupabaseSecrets}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Supabase Secrets
          </Button>
        </div>

        {/* Test Mode Warning */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Remember:</strong> Use Stripe test keys for development and live keys for production. 
            Test all payment flows thoroughly before going live.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeManager;