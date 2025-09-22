import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  FileText, 
  Activity,
  Calendar,
  Clock
} from 'lucide-react';

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  documentsThisMonth: number;
  conversationsThisMonth: number;
  messagesThisMonth: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalConversations: 0,
    totalMessages: 0,
    totalDocuments: 0,
    documentsThisMonth: 0,
    conversationsThisMonth: 0,
    messagesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Total conversations
      const { count: totalConversations } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Total messages
      const { count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Total documents
      const { count: totalDocuments } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // This month's conversations
      const { count: conversationsThisMonth } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      // This month's messages
      const { count: messagesThisMonth } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      // This month's documents
      const { count: documentsThisMonth } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      setAnalytics({
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        totalDocuments: totalDocuments || 0,
        conversationsThisMonth: conversationsThisMonth || 0,
        messagesThisMonth: messagesThisMonth || 0,
        documentsThisMonth: documentsThisMonth || 0,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading Analytics...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Analytics Dashboard — Design Rite AI"
        description="Track conversations, documents, and usage metrics."
        canonical="/analytics"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your platform usage and performance metrics
          </p>
        </header>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalConversations}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.conversationsThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.messagesThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.documentsThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculatePercentageChange(
                  analytics.conversationsThisMonth + analytics.messagesThisMonth + analytics.documentsThisMonth,
                  analytics.totalConversations + analytics.totalMessages + analytics.totalDocuments
                )}%
              </div>
              <p className="text-xs text-muted-foreground">of total activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat Analytics
              </CardTitle>
              <CardDescription>Your conversation and messaging statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Conversations</span>
                <Badge variant="secondary">{analytics.totalConversations}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Messages</span>
                <Badge variant="secondary">{analytics.totalMessages}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Messages per Conversation</span>
                <Badge variant="secondary">
                  {analytics.totalConversations > 0 
                    ? Math.round(analytics.totalMessages / analytics.totalConversations)
                    : 0
                  }
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">This Month's Activity</span>
                <Badge variant="outline">
                  {analytics.conversationsThisMonth} conversations, {analytics.messagesThisMonth} messages
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Analytics
              </CardTitle>
              <CardDescription>Your document upload and management statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Documents</span>
                <Badge variant="secondary">{analytics.totalDocuments}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uploaded This Month</span>
                <Badge variant="secondary">{analytics.documentsThisMonth}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly Upload Rate</span>
                <Badge variant="outline">
                  {calculatePercentageChange(analytics.documentsThisMonth, analytics.totalDocuments)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Efficiency</span>
                <Badge variant="outline">Optimized</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest platform interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.totalConversations === 0 && analytics.totalDocuments === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
                  <p className="text-muted-foreground">
                    Start using the platform to see your analytics here. Upload documents or start conversations with the AI assistant.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      You have {analytics.totalConversations} active conversations
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      {analytics.totalDocuments} documents uploaded and processed
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      {analytics.totalMessages} total messages exchanged with AI
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usage Insights
            </CardTitle>
            <CardDescription>Recommendations to optimize your platform usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.totalDocuments === 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Upload Your First Document</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Upload pricing lists or service catalogs to enable AI-powered invoice generation.
                  </p>
                </div>
              )}
              
              {analytics.totalConversations === 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100">Start Your First Conversation</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Try the AI assistant to get help with business tasks and document analysis.
                  </p>
                </div>
              )}

              {analytics.totalConversations > 0 && analytics.totalDocuments > 0 && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">Great Progress!</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    You're actively using the platform. Consider exploring the business tools for invoice generation.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Analytics;