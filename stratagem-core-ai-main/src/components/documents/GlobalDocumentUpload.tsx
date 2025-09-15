import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';
import { extractPDFContent } from '@/supabase/pdf-reader';

interface GlobalDocument {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  file_path: string;
  extracted_text?: string | null;
  updated_at: string;
}

const GlobalDocumentUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customName, setCustomName] = useState('');
  const [globalDocuments, setGlobalDocuments] = useState<GlobalDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGlobalDocuments();
  }, []);

  const fetchGlobalDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('global_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGlobalDocuments(data || []);
    } catch (error) {
      console.error('Error fetching global documents:', error);
      toast.error('Failed to load global documents');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast.error('Please log in to upload documents');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = customName.trim() || file.name;
      const fileExt = file.name.split('.').pop();
      
      // Sanitize filename - remove invalid characters and ensure no double extensions
      const sanitizedFileName = fileName
        .replace(/[™®©&%#@!*+\[\]{}|\\:";'<>?,]/g, '_') // Replace invalid chars
        .replace(/\.pdf$/i, '') // Remove .pdf extension if already there
        .trim();
      
      const filePath = `global/${Date.now()}-${sanitizedFileName}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Extract text from PDF if it's a PDF file using edge function
      let extractedText = null;
      if (file.type === 'application/pdf') {
        try {
          setUploadProgress(50);
          console.log('Calling OpenAI Vision PDF extractor for file:', filePath);
          
          const { data: extractorResponse, error: extractorError } = await supabase.functions
            .invoke('pdf-vision-extractor', {
              body: { 
                filePath: filePath, 
                bucket: 'documents' 
              }
            });

          console.log('PDF extractor response:', extractorResponse);
          
          if (extractorError) {
            console.error('PDF extraction error:', extractorError);
            toast.error(`Document processing failed: ${extractorError.message}`);
          } else if (extractorResponse?.success && extractorResponse?.content) {
            extractedText = extractorResponse.content;
            const metrics = extractorResponse.processingMetrics;
            const processingTimeSeconds = (metrics?.processingTimeMs / 1000)?.toFixed(1) || 'N/A';
            console.log('PDF text extracted successfully using GPT-5 Vision, length:', extractedText.length);
            console.log('Processing metrics:', metrics);
            toast.success(`Document processed successfully in ${processingTimeSeconds}s using GPT-5 Vision AI`);
          } else {
            const errorMsg = extractorResponse?.error || 'Unknown processing error occurred';
            console.error('PDF extraction failed:', errorMsg);
            toast.error(`Document processing failed: ${errorMsg}`);
          }
        } catch (error) {
          console.error('Error calling PDF extractor:', error);
          toast.warning('PDF uploaded but text extraction failed: ' + error.message);
        }
        setUploadProgress(75);
      }

      // Save document metadata to global_documents table instead of user_documents
      const { error: dbError } = await supabase
        .from('global_documents')
        .insert({
          filename: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          extracted_text: extractedText
        });

      if (dbError) throw dbError;

      toast.success('Global document uploaded successfully');
      setCustomName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchGlobalDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('documents')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('global_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document deleted successfully');
      fetchGlobalDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Global Documents
        </CardTitle>
        <CardDescription>
          Upload documents that will be available to all users in their AI conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customName">Document Name (Optional)</Label>
          <Input
            id="customName"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter custom name for the document"
          />
        </div>

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"
          />
          
          {uploading ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Uploading...</div>
              <Progress value={uploadProgress} className="w-full" />
              <div className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">Upload Global Document</p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, TXT, RTF up to 10MB
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Select File
              </Button>
            </div>
          )}
        </div>

        {globalDocuments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Global Documents</h4>
            <div className="space-y-2">
              {globalDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(doc.id, doc.file_path)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalDocumentUpload;