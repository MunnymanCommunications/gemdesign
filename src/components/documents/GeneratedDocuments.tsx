import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Mail, Edit, FileText, Receipt, Shield, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GeneratedDocument {
  id: string;
  document_type: 'proposal' | 'invoice' | 'security_assessment';
  document_category: 'invoices' | 'proposals' | 'security_reports' | 'general';
  title: string;
  content: string;
  client_name: string;
  amount?: number;
  created_at: string;
  user_id: string;
  file_path?: string | null;
}

const CATEGORY_LABELS = {
  invoices: 'Invoices',
  proposals: 'Proposals',
  security_reports: 'Security Reports',
  general: 'General Documents'
} as const;

const GeneratedDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map document_type to document_category if needed, or assume it's the same
      const typedData = (data || []).map(doc => ({
        ...doc,
        document_type: doc.document_type as 'proposal' | 'invoice' | 'security_assessment',
        document_category: doc.document_category as 'invoices' | 'proposals' | 'security_reports' | 'general'
      }));
      
      setDocuments(typedData);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const docToDelete = documents.find(doc => doc.id === id);
      if (docToDelete?.file_path) {
        // Delete from storage if file_path exists
        const { error: storageError } = await supabase.storage
          .from('generated-documents')
          .remove([docToDelete.file_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Don't fail the whole operation if storage delete fails
        }
      }

      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDocuments(docs => docs.filter(doc => doc.id !== id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const downloadDocument = async (doc: GeneratedDocument) => {
    try {
      if (doc.file_path) {
        // Download from storage if file_path exists (for PDFs like security assessments)
        const { data, error } = await supabase.storage
          .from('generated-documents')
          .download(doc.file_path);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        const filename = doc.title ? `${doc.title.replace(/\s+/g, '_')}.pdf` : 'document.pdf';
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded successfully!');
      } else {
        // Fallback to client-side generation for other documents
        const element = document.createElement('div');
        element.innerHTML = doc.content;
        element.style.width = '800px';
        element.style.padding = '40px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.lineHeight = '1.6';
        element.style.color = '#1f2937';
        element.style.backgroundColor = 'white';
        
        // Add to DOM temporarily
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);
        
        // Generate canvas from HTML
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        // Remove temporary element
        document.body.removeChild(element);
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        // Download PDF
        const filename = doc.title ? `${doc.title.replace(/\s+/g, '_')}.pdf` : 'document.pdf';
        pdf.save(filename);
        toast.success('PDF downloaded successfully!');
      }
    } catch (error) {
      console.error('Error downloading/generating PDF:', error);
      toast.error('Failed to download/generate PDF');
    }
  };

  const emailDocument = (doc: GeneratedDocument) => {
    if (doc.file_path) {
      toast.info('Email functionality not available for PDF documents. Please download and attach manually.');
      return;
    }
    const subject = encodeURIComponent(`${doc.document_category === 'proposals' ? 'Proposal' : 'Invoice'}: ${doc.title}`);
    const body = encodeURIComponent(`Dear ${doc.client_name},\n\nPlease find the attached ${doc.document_category}.\n\n${doc.content.replace(/<[^>]*>/g, '')}\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Documents
          </CardTitle>
          <CardDescription>AI-generated documents will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground">
              Use the quick action buttons in the chat to generate documents
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group documents by category
  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.document_category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<'invoices' | 'proposals' | 'security_reports' | 'general', GeneratedDocument[]>);

  const categoryOrder = ['proposals', 'invoices', 'security_reports', 'general'];

  return (
    <div className="space-y-8">
      {categoryOrder.map(category => (
        groupedDocuments[category]?.length > 0 && (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <div className="space-y-4 mb-8">
              {groupedDocuments[category].map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {category === 'proposals' ? (
                        <FileText className="h-8 w-8 text-blue-500" />
                      ) : category === 'invoices' ? (
                        <Receipt className="h-8 w-8 text-green-500" />
                      ) : category === 'security_reports' ? (
                        <Shield className="h-8 w-8 text-purple-500" />
                      ) : (
                        <FileText className="h-8 w-8 text-gray-500" />
                      )}
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Client: {doc.client_name}
                        </p>
                        {doc.amount && (
                          <p className="text-sm font-medium text-green-600">
                            ${doc.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded p-3 mb-3">
                    <p className="text-sm line-clamp-3">{doc.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(doc.created_at).toLocaleDateString()} at {new Date(doc.created_at).toLocaleTimeString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => emailDocument(doc)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
};

export default GeneratedDocuments;