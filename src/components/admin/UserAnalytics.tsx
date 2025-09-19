
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, FileText, MessageSquare, Activity, RefreshCw, Crown, Shield } from 'lucide-react';

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
}

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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user data with roles and stats
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          company,
          created_at,
          token_usage,
          role
        `);

      if (usersError) throw usersError;

      // Get document counts per user
      const { data: docsData, error: docError }