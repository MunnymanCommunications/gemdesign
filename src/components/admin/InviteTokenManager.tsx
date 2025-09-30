import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Copy, Trash2, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface InviteToken {
  id: string;
  token: string;
  target_role: string;
  subscription_tier: string | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  creator?: {
    email: string;
    full_name: string;
  };
  // Status flags:
  is_expired: boolean;
  is_maxed_out: boolean;
  is_valid: boolean;
}

const InviteTokenManager = () => {
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState({
    target_role: 'admin',
    subscription_tier: 'enterprise',
    max_uses: 1,
    expires_in_days: 7
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-invite-tokens');

      if (error) throw error;
      if (data?.success) {
        setTokens(data.tokens || []);
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error('Error fetching invite tokens:', error);
      toast.error('Failed to load invite tokens');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-invite-token', {
        body: {
          target_role: newToken.target_role as 'admin' | 'moderator' | 'user',
          subscription_tier: newToken.subscription_tier || null,
          max_uses: newToken.max_uses,
          expires_in_days: newToken.expires_in_days
        }
      });

      if (error) throw error;
      if (data?.success) {
        setTokens(prev => [data.token, ...prev]);
        toast.success('Invite token created successfully');
        
        // Reset form
        setNewToken({
          target_role: 'admin',
          subscription_tier: 'enterprise',
          max_uses: 1,
          expires_in_days: 7
        });
      }
    } catch (error) {
      console.error('Error creating invite token:', error);
      toast.error('Failed to create invite token');
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('invite_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
      
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      toast.success('Invite token deleted');
    } catch (error) {
      console.error('Error deleting invite token:', error);
      toast.error('Failed to delete invite token');
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };


  const getStatusBadges = (token: InviteToken) => {
    const badges = [];
    if (token.is_expired) {
      badges.push(<Badge key="expired" variant="destructive">Expired</Badge>);
    }
    if (token.is_maxed_out) {
      badges.push(<Badge key="maxed" variant="destructive">Maxed Out</Badge>);
    }
    if (!token.is_valid) {
      badges.push(<Badge key="invalid" variant="secondary">Invalid</Badge>);
    }
    return badges;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Token Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading tokens...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Token Manager
        </CardTitle>
        <CardDescription>
          Create invite tokens to grant users admin/moderator access and subscription tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Token */}
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-medium">Create New Invite Token</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="role">Target Role</Label>
              <Select 
                value={newToken.target_role} 
                onValueChange={(value) => setNewToken(prev => ({ ...prev, target_role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tier">Subscription Tier</Label>
              <Select
                value={newToken.subscription_tier || ''}
                onValueChange={(value) => setNewToken(prev => ({ ...prev, subscription_tier: value || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                value={newToken.max_uses}
                onChange={(e) => setNewToken(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 1 }))}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="expireDays">Expires In (Days)</Label>
              <Input
                id="expireDays"
                type="number"
                value={newToken.expires_in_days}
                onChange={(e) => setNewToken(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) || 7 }))}
                min="1"
                max="365"
              />
            </div>
          </div>
          <Button onClick={createToken} disabled={creating} className="w-full md:w-auto">
            {creating ? 'Creating...' : 'Create Token'}
          </Button>
        </div>

        {/* Token List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Active Tokens ({tokens.length})</h4>
            <Button variant="outline" size="sm" onClick={fetchTokens}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invite tokens found. Create one above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div key={token.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={token.target_role === 'admin' ? 'default' : 'secondary'}>
                          {token.target_role}
                        </Badge>
                        {token.subscription_tier && (
                          <Badge variant="outline">{token.subscription_tier}</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {token.uses}/{token.max_uses} uses
                        </span>
                        {getStatusBadges(token)}
                        {token.creator && (
                          <span className="text-xs text-muted-foreground">
                            by {token.creator.full_name || token.creator.email}
                          </span>
                        )}
                      </div>
                      <code className="text-sm bg-muted p-1 rounded font-mono break-all">
                        {token.token}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(token.created_at).toLocaleDateString()} • 
                        {token.expires_at && ` Expires: ${new Date(token.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToken(token.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invite Token</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this invite token? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteToken(token.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InviteTokenManager;