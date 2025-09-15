import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { extractPdfText, sanitizeText } from '@/services/pdfExtractor';

export default function BrowserPDFExtractorPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [bucket, setBucket] = useState<'user_documents' | 'global_documents'>('user_documents');
  const fileRef = useRef<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      fileRef.current = e.target.files[0];
      setExtractedText('');
    }
  };

  const extractText = async () => {
    if (!fileRef.current) return;

    setIsProcessing(true);
    
    try {
      const text = await extractPdfText(fileRef.current);
      const sanitized = sanitizeText(text);
      setExtractedText(sanitized);
      toast.success('PDF text extracted successfully!');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Failed to extract PDF text');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadAndStore = async () => {
    if (!fileRef.current || !extractedText) return;

    setIsProcessing(true);
    
    try {
      const file = fileRef.current;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store text in database
      const { error: dbError } = await supabase
        .from(bucket)
        .insert({
          file_path: filePath,
          filename: file.name,
          extracted_text: extractedText,
          file_size: file.size,
          mime_type: file.type
        });

      if (dbError) throw dbError;

      toast.success('File uploaded and text stored!');
      navigate('/documents');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to store file and text');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Browser PDF Extraction</CardTitle>
          <p className="text-gray-600">
            Extract text from PDFs directly in your browser and store in database
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium">
                Select PDF file
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="block w-full border rounded p-2"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Storage Bucket
              </label>
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value as any)}
                className="w-full p-2 border rounded"
                disabled={isProcessing}
              >
                <option value="user_documents">User Documents</option>
                <option value="global_documents">Global Documents</option>
              </select>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Extracting text... Please wait
                </p>
              </div>
            )}

            {extractedText && (
              <div>
                <label className="block mb-2 font-medium">
                  Extracted Text
                </label>
                <textarea
                  readOnly
                  value={extractedText}
                  rows={10}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={extractText}
                disabled={!fileRef.current || isProcessing}
              >
                Extract Text
              </Button>
              
              {extractedText && (
                <Button
                  onClick={uploadAndStore}
                  disabled={isProcessing}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Upload & Store
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}