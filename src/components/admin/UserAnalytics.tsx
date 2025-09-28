import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, FileText, MessageSquare, Activity, RefreshCw, Crown, Shield, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserStats {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  created_at: string;
  role: string;
  subscription_tier: string;
  max_documents: number;
  document_count: number;
  conversation_count: number;
  message_count: number;
  last_activity: string | null;
  token_usage: number;
  granted_tier: string | null;
}

const getAccessStatus = (user: UserStats) => {
  // Priority order: Admin grants > Stripe subscriptions > No access
  
  if (user.granted_tier && user.granted_tier !== 'base') {
    return {
      label: `Granted ${user.granted_tier.charAt(0).toUpperCase() + user.granted_tier.slice(1)}`,
      variant: 'default' as const,
      source: 'admin_grant'
    };
  }
  
  if (user.has_free_access) {
    return {
      label: 'Granted Base',
      variant: 'secondary' as const,
      source: 'admin_grant'
    };
  }
  
  if (user.subscription?.is_active && user.subscription.source === 'stripe') {
    return {
      label: `Stripe ${user.subscription.effective_tier.charAt(0).toUpperCase() + user.subscription.effective_tier.slice(1)}`,
      variant: 'outline' as const,
      source: 'stripe'
    };
  }
  
  return {
    label: 'No Access',
    variant: 'destructive' as const,
    source: 'none'
  };
};

interface GlobalStats {
  total_users: number;
  total_admins: number;
  total_moderators: number;
  total_documents: number;
  total_conversations: number;
  total_messages: number;
  subscription_breakdown: {
    base: number;
    pro: number;
    enterprise: number;
  };
}

const UserAnalytics = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Get real-time subscription status for each user
      const usersWithSubscriptions = await Promise.all(
        profiles.map(async (profile) => {
          const { data: subscription } = await supabase.rpc('get_user_subscription_status', {
            p_user_id: profile.id
          });
          return { ...profile, subscription: subscription?.[0] };
        })
      );

      // Get document counts per user
      const { data: docsData, error: docError } = await supabase
        .from('user_documents')
        .select('user_id');

      if (docError) throw docError;
      
      const docCounts: Record<string, number> = {};
      docsData?.forEach(doc => {
        docCounts[doc.user_id] = (docCounts[doc.user_id] || 0) + 1;
      });

      // Get conversation counts per user
      const { data: convCounts, error: convError } = await supabase
        .from('chat_conversations')
        .select('user_id, id')
        .then(({ data, error }) => {
          if (error) throw error;
          const counts: Record<string, number> = {};
          data?.forEach(conv => {
            counts[conv.user_id] = (counts[conv.user_id] || 0) + 1;
          });
          return { data: counts, error: null };
        });

      if (convError) throw convError;

      // Get message counts per user
      const { data: msgCounts, error: msgError } = await supabase
        .from('chat_messages')
        .select('user_id, id, created_at')
        .then(({ data, error }) => {
          if (error) throw error;
          const counts: Record<string, number> = {};
          const lastActivity: Record<string, string> = {};
          data?.forEach(msg => {
            counts[msg.user_id] = (counts[msg.user_id] || 0) + 1;
            if (!lastActivity[msg.user_id] || msg.created_at > lastActivity[msg.user_id]) {
              lastActivity[msg.user_id] = msg.created_at;
            }
          });
          return { data: { counts, lastActivity }, error: null };
        });

      if (msgError) throw msgError;

      // Transform users data
      const transformedUsers: UserStats[] = usersWithSubscriptions.map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        company: user.company,
        created_at: user.created_at,
        role: user.role || 'user',
        subscription_tier: user.subscription?.effective_tier || 'base',
        max_documents: user.subscription?.max_documents || 1,
        document_count: docCounts[user.id] || 0,
        conversation_count: convCounts[user.id] || 0,
        message_count: msgCounts.counts[user.id] || 0,
        last_activity: msgCounts.lastActivity[user.id] || null,
        token_usage: user.token_usage || 0,
        granted_tier: user.granted_tier,
        ...user
      }));

      setUsers(transformedUsers);

      // Calculate global stats
      const stats: GlobalStats = {
        total_users: transformedUsers.length,
        total_admins: transformedUsers.filter(u => u.role === 'admin').length,
        total_moderators: transformedUsers.filter(u => u.role === 'moderator').length,
        total_documents: Object.values(docCounts).reduce((sum, count) => sum + count, 0),
        total_conversations: Object.values(convCounts).reduce((sum, count) => sum + count, 0),
        total_messages: Object.values(msgCounts.counts).reduce((sum, count) => sum + count, 0),
        subscription_breakdown: {
          base: transformedUsers.filter(u => u.subscription_tier === 'base').length,
          pro: transformedUsers.filter(u => u.subscription_tier === 'pro').length,
          enterprise: transformedUsers.filter(u => u.subscription_tier === 'enterprise').length,
        }
      };

      setGlobalStats(stats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role === 'moderator') return <Shield className="h-4 w-4 text-blue-500" />;
    return null;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge className="bg-yellow-500 text-yellow-50">Admin</Badge>;
    if (role === 'moderator') return <Badge variant="secondary">Moderator</Badge>;
    return <Badge variant="outline">User</Badge>;
  };

  const getSubscriptionBadge = (tier: string) => {
    const variants = {
      base: 'outline',
      pro: 'secondary',
      enterprise: 'default'
    } as const;
    return <Badge variant={variants[tier as keyof typeof variants] || 'outline'}>{tier}</Badge>;
  };

  const updateUserAccess = async (userId: string, grantedTier: string | null, hasFreeAccess: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        granted_tier: grantedTier,
        has_free_access: hasFreeAccess
      })
      .eq('id', userId);
      
    if (error) throw error;

    // After update, reload users to get fresh data
    await fetchAnalytics();
  };

  const handleGrantAccess = async (userId: string, tier: string) => {
    // Determine the new access values
    let grantedTier: string | null = null;
    let hasFreeAccess = false;

    if (tier === 'base') {
      hasFreeAccess = true;
    } else if (tier === 'pro' || tier === 'enterprise') {
      grantedTier = tier;
      hasFreeAccess = false;
    } else if (tier === 'free') {
      grantedTier = null;
      hasFreeAccess = false;
    }

    // Optimistic update
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, granted_tier: grantedTier, has_free_access: hasFreeAccess }
        : user
    ));

    setUpdatingUsers(prev => new Set(prev.add(userId)));
    try {
      if (tier === 'base') {
        await updateUserAccess(userId, null, true);
      } else if (tier === 'pro' || tier === 'enterprise') {
        await updateUserAccess(userId, tier, false);
      } else if (tier === 'free') {
        await updateUserAccess(userId, null, false);
      }
      toast.success(`Granted ${tier} access to user ${userId}`);
    } catch (error) {
      // Revert optimistic update on error
      await fetchAnalytics();
      toast.error('Failed to update access');
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{globalStats.total_users}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <p className="text-2xl font-bold">{globalStats.total_documents}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversations</p>
                  <p className="text-2xl font-bold">{globalStats.total_conversations}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold">{globalStats.total_messages}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Breakdown */}
      {globalStats && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{globalStats.subscription_breakdown.base}</p>
                <p className="text-sm text-muted-foreground">Base Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{globalStats.subscription_breakdown.pro}</p>
                <p className="text-sm text-muted-foreground">Pro Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{globalStats.subscription_breakdown.enterprise}</p>
                <p className="text-sm text-muted-foreground">Enterprise Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Details</CardTitle>
              <CardDescription>
                Detailed analytics for all platform users
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getRoleIcon(user.role)}
                      <h4 className="font-medium">{user.full_name || user.email}</h4>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.company && (
                      <p className="text-sm text-muted-foreground">{user.company}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={getAccessStatus(user).variant}>{getAccessStatus(user).label}</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Documents</p>
                    <p className="font-medium">{user.document_count}/{user.max_documents}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversations</p>
                    <p className="font-medium">{user.conversation_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Messages</p>
                    <p className="font-medium">{user.message_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Activity</p>
                    <p className="font-medium">
                      {user.last_activity 
                        ? new Date(user.last_activity).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Token Usage</p>
                    <p className="font-medium">{user.token_usage.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h5 className="text-sm font-medium mb-2">Admin Controls</h5>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => handleGrantAccess(user.id, value)} disabled={updatingUsers.has(user.id)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Grant Access" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">Grant Base</SelectItem>
                        <SelectItem value="pro">Grant Pro</SelectItem>
                        <SelectItem value="enterprise">Grant Enterprise</SelectItem>
                        <SelectItem value="free">Revoke Access</SelectItem>
                      </SelectContent>
                    </Select>
                    {updatingUsers.has(user.id) ? (
                      <Badge variant="secondary">Updating...</Badge>
                    ) : user.granted_tier && (
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" />
                        {user.granted_tier} Granted
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAnalytics;