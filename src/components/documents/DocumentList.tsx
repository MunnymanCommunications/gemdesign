import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { File, Download, Trash2, Eye } from 'lucide-react';

interface UserDocument {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface DocumentListProps {
  refresh?: number;
}

const DocumentList = ({ refresh }: DocumentListProps) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, refresh]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('new_user_documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc: UserDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const deleteDocument = async (doc: UserDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('new_user_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800';
    if (mimeType.includes('image')) return 'bg-green-100 text-green-800';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('text')) return 'bg-gray-100 text-gray-800';
    return 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>Loading your uploaded documents...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Documents</CardTitle>
        <CardDescription>
          {documents.length === 0 
            ? 'No documents uploaded yet' 
            : `${documents.length} document${documents.length === 1 ? '' : 's'} uploaded`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <File className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents found. Upload your first document above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{document.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getFileTypeColor(document.mime_type)}>
                        {(document.mime_type.split('/')[1])?.toUpperCase() || 'FILE'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(document.file_size)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(document.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadDocument(document)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(document)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentList;