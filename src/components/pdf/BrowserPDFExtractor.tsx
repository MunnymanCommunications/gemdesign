import { useState, useRef } from 'react';
import { createClient } from '@/integrations/supabase/client';
import { getDocument } from 'pdfjs-dist';
import { toast } from 'sonner';

type BrowserPDFExtractorProps = {
  filePath: string;
  bucket: 'user_documents' | 'global_documents';
  onTextExtracted: () => void;
};

export default function BrowserPDFExtractor({ 
  filePath, 
  bucket,
  onTextExtracted 
}: BrowserPDFExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
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
    setProgress(0);
    
    try {
      const arrayBuffer = await fileRef.current.arrayBuffer();
      const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let fullText = '';
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
        setProgress(Math.round((i / totalPages) * 100));
      }

      setExtractedText(fullText.trim());
      toast.success('PDF text extracted successfully!');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Failed to extract PDF text');
    } finally {
      setIsProcessing(false);
    }
  };

  const storeText = async () => {
    if (!extractedText || !filePath) return;

    setIsProcessing(true);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from(bucket)
        .update({ extracted_text: extractedText })
        .eq('file_path', filePath);

      if (error) throw error;

      toast.success('Text stored in database!');
      onTextExtracted();
    } catch (error) {
      console.error('Error storing text:', error);
      toast.error('Failed to store extracted text');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Select PDF to extract text:
        </label>
        <input 
          type="file" 
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full p-2 border rounded"
          disabled={isProcessing}
        />
      </div>

      {isProcessing && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Extracting text... {progress}% complete
          </p>
        </div>
      )}

      {extractedText && (
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Extracted Text:
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
        <button
          onClick={extractText}
          disabled={!fileRef.current || isProcessing}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Extract Text
        </button>
        
        {extractedText && (
          <button
            onClick={storeText}
            disabled={isProcessing}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Store in Database
          </button>
        )}
      </div>
    </div>
  );
}