import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Settings, Brain, Key, Users, FileText, Save, CreditCard, UserPlus, Activity, MessageCircle } from 'lucide-react';
import HelpfulDocumentUpload from '@/components/admin/HelpfulDocumentUpload';
import GlobalAIDocumentUpload from '@/components/admin/GlobalAIDocumentUpload';
import { useRoles } from '@/hooks/useRoles';
import InviteTokenManager from '@/components/admin/InviteTokenManager';
import UserAnalytics from '@/components/admin/UserAnalytics';
import StripeManager from '@/components/admin/StripeManager';
import UsageLimitsManager from '@/components/admin/UsageLimitsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdminSettings {
  id: string;
  ai_model: string;
  chat_completions_url: string;
  global_prompt: string;
  max_base_documents: number;
  max_pro_documents: number;
  max_enterprise_documents: number;
  price_base_cents: number;
  price_pro_cents: number;
  price_enterprise_cents: number;
  stripe_price_id_base: string | null;
  stripe_price_id_pro: string | null;
  stripe_price_id_enterprise: string | null;
  api_key_encrypted: string;
  general_assistant_id: string | null;
  platform_assistant_id: string | null;
  platform_prompt: string | null;
  payment_required: boolean;
  temperature: number;
  max_tokens: number;
}

const Admin = () => {
const { user } = useAuth();
const currentUser = user;
const [settings, setSettings] = useState<AdminSettings | null>(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [apiKey, setApiKey] = useState('');
const [platformApiKey, setPlatformApiKey] = useState('');
const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
const [customModel, setCustomModel] = useState('');
const { isAdmin: currentUserIsAdmin } = useRoles();
const [temperature, setTemperature] = useState(0.7);
const [maxTokens, setMaxTokens] = useState(1500);
const [helpfulDocs, setHelpfulDocs] = useState([]);
const [users, setUsers] = useState([]);
const [userRoles, setUserRoles] = useState<{ [key: string]: string[] }>({});

useEffect(() => {
  fetchSettings();
  fetchStripeStatus();
  loadDocuments();
  loadUsers();
}, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          await createDefaultSettings();
        } else {
          throw error;
        }
      } else {
        setSettings({
          ...data,
          platform_prompt: data.platform_prompt || null
        });
        setTemperature(data.temperature || 0.7);
        setMaxTokens(data.max_tokens || 1500);
      }
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      toast.error('Failed to load admin settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-config-status');
      if (error) throw error;
      setStripeConfigured(Boolean(data?.configured));
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      toast.error('Failed to check Stripe configuration');
      setStripeConfigured(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .insert({
          ai_model: 'gpt-4o-mini',
          chat_completions_url: 'https://api.openai.com/v1/chat/completions',
          global_prompt: `You are a helpful AI assistant for Design Rite AI Platform. You have access to the following user information:

- Company: {{company}}
- Name: {{full_name}}
- Email: {{email}}

You can reference uploaded documents to help with business tasks, generate invoices based on pricing documents, and provide assistance with various business operations. Always be professional and helpful.`,
          max_base_documents: 1,
          max_pro_documents: 5,
          price_base_cents: 4995,
          price_pro_cents: 9995,
          platform_prompt: null,
          payment_required: true
        })
        .select()
        .single();

      if (error) throw error;
      setSettings({
        ...data,
        platform_prompt: data.platform_prompt || null
      });
    } catch (error) {
      console.error('Error creating default settings:', error);
      toast.error('Failed to create default settings');
    }
  };

  const updateSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updateData: any = {
        ai_model: settings.ai_model,
        chat_completions_url: settings.chat_completions_url,
        global_prompt: settings.global_prompt,
        max_base_documents: settings.max_base_documents,
        max_pro_documents: settings.max_pro_documents,
        max_enterprise_documents: settings.max_enterprise_documents,
        price_base_cents: settings.price_base_cents,
        price_pro_cents: settings.price_pro_cents,
        price_enterprise_cents: settings.price_enterprise_cents,
        stripe_price_id_base: settings.stripe_price_id_base,
        stripe_price_id_pro: settings.stripe_price_id_pro,
        stripe_price_id_enterprise: settings.stripe_price_id_enterprise,
        general_assistant_id: settings.general_assistant_id,
        platform_assistant_id: settings.platform_assistant_id,
        platform_prompt: settings.platform_prompt,
        payment_required: settings.payment_required,
        temperature: temperature,
        max_tokens: maxTokens
      };

      // Only include API key if it's been changed
      if (apiKey.trim()) {
        updateData.api_key_encrypted = apiKey;
      }

      // Handle platform API key (this would be stored separately for platform assistant)
      if (platformApiKey.trim()) {
        // This would typically be stored in a separate field or handled differently
        // For now, we'll just clear the field after saving
      }

      const { error } = await supabase
        .from('admin_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Admin settings updated successfully');
      setApiKey(''); // Clear the API key field
      setPlatformApiKey(''); // Clear the platform API key field
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };
  
  const loadDocuments = async () => {
    try {
      const { data: docs, error } = await supabase.from('helpful_documents').select('*');
      if (error) throw error;
      setHelpfulDocs(docs || []);
    } catch (error) {
      console.error('Error fetching helpful documents:', error);
      toast.error('Failed to load helpful documents');
    }
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-helpful-document', {
        body: { document_id: documentId }
      });
      
      if (error) throw error;
      
      toast.success("Document deleted successfully");
      // Refresh helpful documents list
      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Error deleting document: ${error.message}`);
    }
  };
  
  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, subscription:subscriptions(*)');
      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      if (rolesError) throw rolesError;

      const rolesMap = rolesData.reduce((acc: { [key: string]: string[] }, role) => {
        if (!acc[role.user_id]) {
          acc[role.user_id] = [];
        }
        acc[role.user_id].push(role.role);
        return acc;
      }, {});

      setUsers(profilesData || []);
      setUserRoles(rolesMap);
      console.log('User roles:', rolesMap);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };
  
  const updateUserAccess = async (userId: string, grantedTier: string | null, hasFreeAccess: boolean) => {
    // Optional: Optimistic update
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, granted_tier: grantedTier, has_free_access: hasFreeAccess }
        : user
    ));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          granted_tier: grantedTier,     // 'pro', 'enterprise', or null
          has_free_access: hasFreeAccess  // true for base, false for revoke
        })
        .eq('id', userId);  // ← CRITICAL: Use target userId, not auth.uid()

      if (error) throw error;

      // Refresh data after success
      await loadUsers();
      toast.success('User access updated successfully');
    } catch (error) {
      // Revert optimistic update on error
      await loadUsers();
      console.error('Error updating user access:', error);
      toast.error('Failed to update user access');
    }
  };

  const toggleAdminRole = async (userId: string, isAdmin: boolean) => {
    try {
      if (isAdmin) {
        // Insert admin role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          });

        if (insertError) throw insertError;
      } else {
        // Delete admin role
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (deleteError) throw deleteError;
      }

      // Optimistically update
      setUserRoles(prev => {
        const newRoles = { ...prev };
        if (!newRoles[userId]) newRoles[userId] = [];
        if (isAdmin) {
          if (!newRoles[userId].includes('admin')) {
            newRoles[userId].push('admin');
          }
        } else {
          newRoles[userId] = newRoles[userId].filter(role => role !== 'admin');
        }
        return newRoles;
      });

      toast.success(isAdmin ? "Admin role granted" : "Admin role revoked");
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast.error("Failed to update admin role");
      // Refresh on error
      await loadUsers();
    }
  };



  const getAccessStatus = (user: any) => {
    // Priority: admin_grant > free_access > stripe > none
    if (user.granted_tier && user.granted_tier !== 'base') {
      return { label: `Granted ${user.granted_tier}`, variant: 'default' as const };
    }
    if (user.has_free_access) {
      return { label: 'Granted Base', variant: 'secondary' as const };
    }
    if (user.subscription?.is_active && user.subscription.source === 'stripe') {
      return { label: `Stripe ${user.subscription.effective_tier}`, variant: 'outline' as const };
    }
    return { label: 'No Access', variant: 'destructive' as const };
  };

  const getUserRoles = (userId: string) => {
    return userRoles[userId] || [];
  };

  const isUserAdmin = (userId: string) => {
    return getUserRoles(userId).includes('admin');
  };


  if (!currentUserIsAdmin) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading Admin Settings...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  if (!settings) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Failed to Load Settings</h2>
            <Button onClick={fetchSettings}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Admin Settings — Design Rite AI"
        description="Configure AI, limits, billing, and global assets."
        canonical="/admin"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Master Admin Portal</h1>
          <p className="text-muted-foreground mt-2">
            Complete platform control: settings, users, analytics, and billing
          </p>
        </header>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Stripe
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="doc-management" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Doc Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                Configure AI model and API settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aiModel">AI Model</Label>
                <Select 
                  value={settings.ai_model === 'custom' || !['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-5-mini-2025-08-07', 'gpt-5-2025-08-07', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'gemini-pro'].includes(settings.ai_model) ? 'custom' : settings.ai_model}
                  onValueChange={(value) => {
                    if (!value) return;
                    if (value === 'custom') {
                      setCustomModel(settings.ai_model);
                    } else {
                      setSettings(prev => prev ? { ...prev, ai_model: value } : null);
                      setCustomModel('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4O</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                    <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    <SelectItem value="custom">Custom Model</SelectItem>
                  </SelectContent>
                </Select>
                {(settings.ai_model === 'custom' || !['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-5-mini-2025-08-07', 'gpt-5-2025-08-07', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'gemini-pro'].includes(settings.ai_model)) && (
                  <div className="mt-2">
                    <Label htmlFor="customModel">Custom Model Name</Label>
                    <Input
                      id="customModel"
                      value={customModel || settings.ai_model}
                      onChange={(e) => {
                        setCustomModel(e.target.value);
                        setSettings(prev => prev ? { ...prev, ai_model: e.target.value } : null);
                      }}
                      placeholder="e.g. claude-opus-4-20250514, gemini-1.5-pro"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the exact model name from your AI provider
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="chatUrl">Chat Completions URL</Label>
                <Input
                  id="chatUrl"
                  value={settings.chat_completions_url || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, chat_completions_url: e.target.value } : null)}
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter new API key (leave blank to keep current)"
                />
                {settings.api_key_encrypted && (
                  <p className="text-xs text-muted-foreground mt-1">
                    API key is currently configured
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="generalAssistantId">General Assistant ID (Optional)</Label>
                <Input
                  id="generalAssistantId"
                  value={settings.general_assistant_id || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, general_assistant_id: e.target.value } : null)}
                  placeholder="asst_... (Optional)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI Assistant ID for the main chat AI
                </p>
              </div>
<div className="space-y-4">
<div>
  <Label htmlFor="temperature">Temperature (0.0 - 2.0)</Label>
  <Input
    id="temperature"
    type="number"
    min="0"
    max="2"
    step="0.1"
    value={temperature}
    onChange={(e) => setTemperature(parseFloat(e.target.value))}
  />
</div>
<div>
  <Label htmlFor="maxTokens">Max Tokens</Label>
  <Input
    id="maxTokens"
    type="number"
    min="100"
    max="4000"
    step="100"
    value={maxTokens}
    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
  />
</div>
</div>
            </CardContent>
          </Card>

          {/* Platform Help Assistant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Platform Help Assistant
              </CardTitle>
              <CardDescription>
                Configure the platform help chat bubble assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platformApiKey">Platform Assistant API Key</Label>
                <Input
                  id="platformApiKey"
                  type="password"
                  value={platformApiKey}
                  onChange={(e) => setPlatformApiKey(e.target.value)}
                  placeholder="Enter platform assistant API key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate API key for the platform help assistant
                </p>
              </div>

              <div>
                <Label htmlFor="platformAssistantId">Platform Assistant ID (Optional)</Label>
                <Input
                  id="platformAssistantId"
                  value={settings.platform_assistant_id || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, platform_assistant_id: e.target.value } : null)}
                  placeholder="asst_... (Optional)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI Assistant ID for platform help and navigation
                </p>
              </div>

              <div>
                <Label htmlFor="platformPrompt">Platform Help Prompt</Label>
                <Textarea
                  id="platformPrompt"
                  value={settings.platform_prompt || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, platform_prompt: e.target.value } : null)}
                  rows={4}
                  placeholder="Enter the prompt for the platform help assistant..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Instructions for the platform help AI to assist users with navigation and features
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Limits
              </CardTitle>
              <CardDescription>
                Configure document upload limits by subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="baseLimit">Base Tier Document Limit</Label>
                <Input
                  id="baseLimit"
                  type="number"
                  value={settings.max_base_documents}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, max_base_documents: parseInt(e.target.value) } : null)}
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="proLimit">Pro Tier Document Limit</Label>
                <Input
                  id="proLimit"
                  type="number"
                  value={settings.max_pro_documents}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, max_pro_documents: parseInt(e.target.value) } : null)}
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="entLimit">Enterprise Tier Document Limit</Label>
                <Input
                  id="entLimit"
                  type="number"
                  value={settings.max_enterprise_documents}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, max_enterprise_documents: parseInt(e.target.value) } : null)}
                  min="1"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current Limits</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base Tier:</span>
                    <Badge variant="secondary">{settings.max_base_documents} documents</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pro Tier:</span>
                    <Badge variant="secondary">{settings.max_pro_documents} documents</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Enterprise Tier:</span>
                    <Badge variant="secondary">{settings.max_enterprise_documents} documents</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Configuration
              </CardTitle>
              <CardDescription>
                Set Stripe Price IDs for your subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stripeBase">Base Tier Stripe Price ID</Label>
                <Input
                  id="stripeBase"
                  value={settings.stripe_price_id_base || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, stripe_price_id_base: e.target.value } : null)}
                  placeholder="price_..."
                />
              </div>
              <div>
                <Label htmlFor="stripePro">Pro Tier Stripe Price ID</Label>
                <Input
                  id="stripePro"
                  value={settings.stripe_price_id_pro || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, stripe_price_id_pro: e.target.value } : null)}
                  placeholder="price_..."
                />
              </div>
              <div>
                <Label htmlFor="stripeEnt">Enterprise Tier Stripe Price ID</Label>
                <Input
                  id="stripeEnt"
                  value={settings.stripe_price_id_enterprise || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, stripe_price_id_enterprise: e.target.value } : null)}
                  placeholder="price_..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Global Prompt */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Global AI Prompt
              </CardTitle>
              <CardDescription>
                This prompt is used as a base for all AI interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.global_prompt}
                onChange={(e) => setSettings(prev => prev ? { ...prev, global_prompt: e.target.value } : null)}
                rows={12}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={updateSettings} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Grant/revoke access to users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Access</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const userIsAdmin = isUserAdmin(user.id);
                      console.log('Rendering user:', user.id, 'isAdmin:', userIsAdmin);
                      return (
                        <TableRow key={user.id}>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getAccessStatus(user).variant}>
                              {getAccessStatus(user).label}
                            </Badge>
                            {userIsAdmin && (
                              <Badge variant="default" className="ml-1">
                                Admin
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={userIsAdmin}
                              onCheckedChange={(checked) => toggleAdminRole(user.id, !!checked)}
                              disabled={user.id === currentUser?.id} // Disable for self
                            />
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Select defaultValue="none"
                              onValueChange={(value) => {
                                if (!value || value === 'none') return;
                                let grantedTier: string | null = null;
                                let hasFreeAccess = false;
                                switch (value) {
                                  case 'pro':
                                    grantedTier = 'pro';
                                    break;
                                  case 'enterprise':
                                    grantedTier = 'enterprise';
                                    break;
                                  case 'base':
                                    hasFreeAccess = true;
                                    break;
                                  case 'revoke':
                                    grantedTier = null;
                                    hasFreeAccess = false;
                                    break;
                                }
                                updateUserAccess(user.id, grantedTier, hasFreeAccess);
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Grant Access" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Change</SelectItem>
                                <SelectItem value="pro">Grant Pro</SelectItem>
                                <SelectItem value="enterprise">Grant Enterprise</SelectItem>
                                <SelectItem value="base">Grant Base Access</SelectItem>
                                <SelectItem value="revoke">Revoke Access</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <InviteTokenManager />
          </TabsContent>

          <TabsContent value="analytics">
            <UserAnalytics />
          </TabsContent>

          <TabsContent value="stripe">
            <StripeManager />
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HelpfulDocumentUpload />
              <GlobalAIDocumentUpload />
            </div>
          </TabsContent>
          <TabsContent value="doc-management">
            <Card>
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>Manage helpful documents</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {helpfulDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.filename}</TableCell>
                        <TableCell>{(doc.file_size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
