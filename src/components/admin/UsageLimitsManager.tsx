import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const UsageLimitsManager = () => {
  const [limits, setLimits] = useState<{ subscription_tier: string; limit_value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('usage_limits').select('*');
      if (error) {
        toast.error('Failed to fetch usage limits');
      } else {
        setLimits(data);
      }
      setLoading(false);
    };

    fetchLimits();
  }, []);

  const handleLimitChange = (tier: string, value: number) => {
    setLimits(limits.map(limit => limit.subscription_tier === tier ? { ...limit, limit_value: value } : limit));
  };

  const handleSaveLimits = async () => {
    const promises = limits.map(limit =>
      supabase
        .from('usage_limits')
        .update({ limit_value: limit.limit_value })
        .eq('subscription_tier', limit.subscription_tier)
    );

    const results = await Promise.all(promises);
    if (results.some(result => result.error)) {
      toast.error('Failed to save usage limits');
    } else {
      toast.success('Usage limits saved successfully');
    }
  };

  if (loading) {
    return <p>Loading usage limits...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Limits</CardTitle>
        <CardDescription>Set the usage limits for the Satellite Camera Assessment tool.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.map(limit => (
          <div key={limit.subscription_tier} className="flex items-center justify-between">
            <Label htmlFor={limit.subscription_tier}>{limit.subscription_tier.toUpperCase()} Tier</Label>
            <Input
              id={limit.subscription_tier}
              type="number"
              value={limit.limit_value}
              onChange={e => handleLimitChange(limit.subscription_tier, parseInt(e.target.value, 10))}
              className="w-24"
            />
          </div>
        ))}
        <Button onClick={handleSaveLimits}>Save Limits</Button>
      </CardContent>
    </Card>
  );
};

export default UsageLimitsManager;