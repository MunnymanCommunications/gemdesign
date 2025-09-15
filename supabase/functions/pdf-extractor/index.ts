import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize text by removing non-printable characters
function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

// Use a more reliable PDF processing approach
async function extractTextFromPDF(arrayBuffer, fileName) {
  try {
    console.log('Processing PDF with text extraction...');
    // Convert ArrayBuffer to Uint8Array for processing
    const uint8Array = new Uint8Array(arrayBuffer);
    // Basic PDF text extraction - look for text objects in PDF
    const pdfText = new TextDecoder().decode(uint8Array);
    // Extract readable text using regex patterns for PDF text objects
    const textMatches = pdfText.match(/\((.*?)\)/g) || [];
    let extractedText = textMatches.map((match)=>match.replace(/[()]/g, '')).filter((text)=>text.length > 2 && /[a-zA-Z]/.test(text)).join(' ');
    
    // SANITIZE THE TEXT - CRITICAL FIX
    extractedText = sanitizeText(extractedText);
    
    if (extractedText.length > 50) {
      console.log(`Successfully extracted ${extractedText.length} characters of text`);
      return `PDF Document: ${fileName}\n\nExtracted Content:\n${extractedText}`;
    }
    // If no readable text found, return basic info
    return `PDF Document: ${fileName}\n\nFile Size: ${Math.round(arrayBuffer.byteLength / 1024)}KB\n\nThis PDF has been uploaded successfully. The document appears to be image-based or contains formatted content that requires specialized parsing. The file is available for reference in conversations.`;
  } catch (error) {
    console.error('Error processing PDF:', error);
    return `PDF Document: ${fileName}\n\nFile Size: ${Math.round(arrayBuffer.byteLength / 1024)}KB\n\nThe document has been uploaded successfully but text extraction encountered an error. The file is available for reference in conversations.\n\nError: ${error.message}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ... rest of your existing code ...
});