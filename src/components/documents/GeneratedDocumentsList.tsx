import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGeneratedDocuments } from '@/hooks/useGeneratedDocuments';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageFormatter } from '@/components/chat/MessageFormatter';

interface GeneratedDocument {
  id: string;
  title: string;
  client_name: string;
  document_type: string;
  content: string;
  file_path: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const GeneratedDocumentsList: React.FC = () => {
  const { docs, loading, deleteDocument } = useGeneratedDocuments();
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async (doc: GeneratedDocument) => {
    if (!doc.file_path) {
      toast.error('No file available for download');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')  // Adjust bucket if different for generated docs
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.client_name.replace(/\s+/g, '_')}_${doc.document_type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleView = (doc: GeneratedDocument) => {
    setSelectedDoc(doc);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading generated documents...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generated Documents
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-generated proposals, invoices, and reports ({docs.length})
          </p>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No generated documents yet. Create some in the Chat!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type}
                      </Badge>
                      {doc.amount && (
                        <Badge variant="secondary" className="text-xs">
                          ${doc.amount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      Client: {doc.client_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    {doc.file_path && (
                      <p className="text-xs text-muted-foreground">
                        File: {formatFileSize(/* Assume size from metadata or fetch */ 0)}  {/* Add size if available */}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(doc)}
                      title="View Content"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {doc.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      title="Delete"
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

      {/* View Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogTrigger asChild />
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Content</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="flex-1 overflow-auto">
              <div className="mb-4">
                <h3 className="font-semibold">{selectedDoc.title}</h3>
                <p className="text-sm text-muted-foreground">Client: {selectedDoc.client_name} | Type: {selectedDoc.document_type}</p>
              </div>
              {selectedDoc.file_path ? (
                <p className="text-sm text-muted-foreground">
                  PDF content - Use download button to view full document.
                </p>
              ) : (
                <div className="prose max-w-none">
                  <MessageFormatter content={selectedDoc.content} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneratedDocumentsList;