// Enhanced PDF reading functionality for AI chat
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source - use local worker to avoid CORS issues in preview environment
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export interface DocumentContent {
  filename: string;
  content: string;
  metadata: {
    pages: number;
    size: number;
    type: string;
  };
}

// PDF content extraction using pdf.js
export const extractPDFContent = async (filePath: string, bucket: string = 'user-uploads'): Promise<string> => {
  try {
    console.log('Extracting PDF content using pdf.js for:', filePath);
    
    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Error downloading PDF from storage:', error);
      throw new Error(`Could not download PDF: ${error.message}`);
    }

    console.log('PDF downloaded successfully, processing with pdf.js...');
    
    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    console.log('PDF size:', arrayBuffer.byteLength, 'bytes');
    
    // Try to load PDF with worker first, then without worker as fallback
    let pdf;
    try {
      // Load the PDF document with worker
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      
      pdf = await loadingTask.promise;
      console.log('PDF loaded with worker successfully. Pages:', pdf.numPages);
    } catch (workerError) {
      console.warn('Worker failed, trying without worker:', workerError);
      
      // Fallback: disable worker and try again
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      
      pdf = await loadingTask.promise;
      console.log('PDF loaded without worker successfully. Pages:', pdf.numPages);
    }
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text with proper spacing
        const pageText = textContent.items
          .map((item: any) => {
            if (item.str && item.str.trim()) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
        
        console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    const finalText = fullText.trim();
    console.log(`PDF extraction complete. Total characters: ${finalText.length}`);
    
    if (finalText.length > 0) {
      return finalText;
    } else {
      return 'No readable text content found in this PDF. The document may contain only images or be password protected.';
    }
    
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

// Enhanced document context builder for AI with actual content
export const buildDocumentContext = async (userDocs: any[], globalDocs: any[]): Promise<string> => {
  let context = '\n\nAvailable Documents:\n';
  
  if (userDocs && userDocs.length > 0) {
    context += '\nUser Documents:\n';
    for (const doc of userDocs) {
      context += `- ${doc.filename} (${doc.mime_type})\n`;
      
      // Extract actual content for PDFs
      if (doc.mime_type === 'application/pdf') {
        try {
          const content = await extractPDFContent(doc.file_path, 'user-uploads');
          if (content && !content.startsWith('Error:')) {
            // Limit content to first 1000 characters to avoid token limits
            const truncatedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;
            context += `  Content Preview: ${truncatedContent}\n`;
          } else {
            context += `  Content: Unable to extract text\n`;
          }
        } catch (error) {
          console.error('Error extracting document content:', error);
          context += `  Content: Unable to extract text\n`;
        }
      }
    }
  }
  
  if (globalDocs && globalDocs.length > 0) {
    context += '\nCompany Documents:\n';
    for (const doc of globalDocs) {
      context += `- ${doc.filename} (${doc.mime_type})\n`;
      
      // Extract actual content for PDFs
      if (doc.mime_type === 'application/pdf') {
        try {
          const content = await extractPDFContent(doc.file_path, 'global-uploads');
          if (content && !content.startsWith('Error:')) {
            // Limit content to first 1000 characters to avoid token limits
            const truncatedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;
            context += `  Content Preview: ${truncatedContent}\n`;
          } else {
            context += `  Content: Unable to extract text\n`;
          }
        } catch (error) {
          console.error('Error extracting global document content:', error);
          context += `  Content: Unable to extract text\n`;
        }
      }
    }
  }
  
  if (!userDocs?.length && !globalDocs?.length) {
    context += '\nNo documents currently uploaded. The AI can help with general business tasks but cannot reference specific company documents or pricing.';
  }
  
  return context;
};