import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Download, Eye, Printer } from 'lucide-react';

interface HelpfulDocument {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const HelpfulDocuments = () => {
  const { user } = useAuth();
  const [helpfulDocuments, setHelpfulDocuments] = useState<HelpfulDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHelpfulDocuments();
    }
  }, [user]);

  const fetchHelpfulDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('helpful_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHelpfulDocuments(data || []);
    } catch (error) {
      console.error('Error fetching helpful helpful documents:', error);
      toast.error('Failed to load helpful documents');
    } finally {
      setLoading(false);
    }
  };

  const downloadWorksheet = async (worksheet: HelpfulDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('helpful_documents')
        .download(worksheet.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = worksheet.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Worksheet downloaded successfully');
    } catch (error) {
      console.error('Error downloading worksheet:', error);
      toast.error('Failed to download worksheet');
    }
  };

  const viewWorksheet = async (worksheet: HelpfulDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('helpful_documents')
        .createSignedUrl(worksheet.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing worksheet:', error);
      toast.error('Failed to open worksheet');
    }
  };

  const printWorksheet = async (worksheet: HelpfulDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('helpful_documents')
        .createSignedUrl(worksheet.file_path, 3600);

      if (error) throw error;
      
      if (data?.signedUrl) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = data.signedUrl;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        };
      }
    } catch (error) {
      console.error('Error printing worksheet:', error);
      toast.error('Failed to print worksheet');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (mimeType.includes('word')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (mimeType.includes('image')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading helpful documents...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Helpful Documents — DesignR AI"
        description="Access helpful documents and resources provided by administrators."
        canonical="/helpful-documents"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Helpful Documents</h1>
          <p className="text-muted-foreground mt-2">
            Access documents, templates, and resources provided by administrators
          </p>
        </header>

        {helpfulDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Documents Available</h3>
              <p className="text-muted-foreground">
                No helpful documents have been uploaded by administrators yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpfulDocuments.map((document) => (
              <Card key={worksheet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                    <Badge className={getFileTypeColor(worksheet.mime_type)}>
                      {worksheet.mime_type.split('/')[1]?.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {worksheet.filename}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex justify-between items-center text-sm">
                      <span>{formatFileSize(worksheet.file_size)}</span>
                      <span>{new Date(worksheet.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => viewWorksheet(worksheet)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => downloadWorksheet(worksheet)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={() => printWorksheet(worksheet)}
                        variant="outline"
                        size="sm"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {helpfulDocuments.length > 0 && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              {helpfulDocuments.length} document{helpfulDocuments.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HelpfulDocuments;