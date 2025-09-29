import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import FileUpload from '@/components/documents/FileUpload';
import DocumentList from '@/components/documents/DocumentList';
import GeneratedDocumentsList from '@/components/documents/GeneratedDocumentsList';
import SecurityReportsList from '@/components/documents/SecurityReportsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { FileText, Upload, Shield } from 'lucide-react';

interface UserSubscription {
  tier: string;
  max_documents: number;
}

const Documents = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('session_id')) {
      toast.success('Payment successful! Your subscription has been upgraded.');
      navigate('/documents', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchDocumentCount();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, max_documents')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no subscription exists, create one
      if (!data) {
        const { data: newSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user?.id,
            tier: 'base',
            max_documents: 1
          })
          .select('tier, max_documents')
          .single();
          
        if (createError) throw createError;
        setSubscription(newSub);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    }
  };

  const fetchDocumentCount = async () => {
    try {
      const { count, error } = await supabase
        .from('new_user_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (error) throw error;
      setDocumentCount(count || 0);
    } catch (error) {
      console.error('Error fetching document count:', error);
    }
  };

  const handleUploadComplete = () => {
    setRefreshCount(prev => prev + 1);
    fetchDocumentCount();
  };

  const canUploadMore = subscription ? documentCount < subscription.max_documents : false;
  const usagePercentage = subscription ? (documentCount / subscription.max_documents) * 100 : 0;

  return (
    <Layout>
      <SEO
        title="Document Management — Design Rite AI"
        description="Upload, manage, and process documents for AI-powered workflows."
        canonical="/documents"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage your documents for AI analysis and processing
          </p>
        </header>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Used</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documentCount} / {subscription?.max_documents || 0}
              </div>
              <Progress value={usagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {subscription?.tier || 'Loading...'}
              </div>
              <Badge variant="secondary" className="mt-2">
                {subscription?.tier === 'pro' ? 'Professional' : 'Basic'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Status</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {canUploadMore ? 'Available' : 'Full'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {canUploadMore 
                  ? `${subscription?.max_documents! - documentCount} slots remaining`
                  : 'Upgrade to upload more'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Special Document Types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing/Services Document</CardTitle>
              <CardDescription>
                Upload your pricing list or services catalog for AI-powered invoice generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canUploadMore ? (
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  maxFiles={1}
                  acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx']}
                  title="Upload Pricing Document"
                  description="PDF, Word, Excel, or text files containing your pricing information"
                  documentType="pricing"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Document limit reached. Please upgrade your plan to upload more documents.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proposal Templates</CardTitle>
              <CardDescription>
                Upload example proposals for AI-powered proposal generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canUploadMore ? (
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  maxFiles={3}
                  acceptedFileTypes={['.pdf', '.doc', '.docx']}
                  title="Upload Proposal Template"
                  description="PDF or Word documents with your proposal format and style"
                  documentType="proposal"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Document limit reached. Please upgrade your plan to upload more documents.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>General Documents</CardTitle>
              <CardDescription>
                Upload any documents for AI analysis and processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canUploadMore ? (
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  maxFiles={subscription?.max_documents! - documentCount}
                  title="Upload Documents"
                  description="Any document type for AI analysis"
                  documentType="general"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Document limit reached. Please upgrade your plan to upload more documents.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generated Documents and Reports with Tabs */}
        <Tabs defaultValue="generated" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generated">Generated Documents</TabsTrigger>
            <TabsTrigger value="reports">Security Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="generated" className="mt-4">
            <GeneratedDocumentsList />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <SecurityReportsList />
          </TabsContent>
        </Tabs>

        {/* Document List */}
        <DocumentList refresh={refreshCount} />

        {/* Usage Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Document Guidelines</CardTitle>
            <CardDescription>Best practices for document uploads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Supported File Types</h4>
              <p className="text-sm text-muted-foreground">
                PDF, Word Documents (.doc, .docx), Text files (.txt), Images (.jpg, .jpeg, .png), Spreadsheets (.xlsx, .csv)
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Pricing Documents</h4>
              <p className="text-sm text-muted-foreground">
                For best results with invoice generation, include clear service descriptions, pricing, and any applicable terms.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Size Limits</h4>
              <p className="text-sm text-muted-foreground">
                Maximum file size is 10MB per document. For larger files, consider splitting them into smaller sections.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Documents;