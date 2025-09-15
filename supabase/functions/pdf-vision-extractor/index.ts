import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import PDFParser from 'https://esm.sh/pdf-parse@1.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  filePath: string;
  bucket: string;
}

interface ProcessingMetrics {
  startTime: number;
  endTime?: number;
  tokensUsed?: number;
  processingMethod?: string;
  success: boolean;
  errorType?: string;
  retryCount: number;
}

// Utility function for structured logging
function logWithMetrics(level: 'info' | 'warn' | 'error', message: string, metrics?: Partial<ProcessingMetrics>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...metrics
  };
  console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`, metrics ? JSON.stringify(metrics) : '');
}

// Proper PDF text extraction using pdf-parse library
async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    logWithMetrics('info', 'Starting proper PDF text extraction with pdf-parse');
    
    // Convert ArrayBuffer to Buffer for pdf-parse
    const buffer = new Uint8Array(arrayBuffer);
    
    // Parse PDF using pdf-parse library
    const pdfData = await PDFParser(buffer);
    
    if (!pdfData || !pdfData.text) {
      logWithMetrics('warn', 'No text content found in PDF');
      return ['PDF appears to contain no readable text. Document may be image-based or encrypted.'];
    }
    
    // Clean and normalize the extracted text
    let cleanedText = pdfData.text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert remaining \r to \n
      .replace(/\f/g, '\n\n') // Convert form feeds to double newlines (page breaks)
      .replace(/\s+\n/g, '\n') // Remove trailing whitespace on lines
      .replace(/\n\s+/g, '\n') // Remove leading whitespace on lines
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to maximum 2
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces/tabs with single space
      .trim();
    
    // Additional cleanup for common PDF artifacts
    cleanedText = cleanedText
      .replace(/^\s*\d+\s*$/gm, '') // Remove standalone page numbers on their own lines
      .replace(/\n\s*\n/g, '\n\n') // Clean up any remaining empty lines
      .trim();
    
    logWithMetrics('info', 'PDF text extraction completed successfully', { 
      extractedLength: cleanedText.length,
      totalPages: pdfData.numpages || 0,
      info: pdfData.info ? Object.keys(pdfData.info).join(', ') : 'none'
    });
    
    // Return meaningful content or indicate if extraction failed
    if (cleanedText.length > 10 && /[a-zA-Z]/.test(cleanedText)) {
      return [cleanedText];
    } else {
      logWithMetrics('warn', 'Minimal text extracted, PDF may be image-based or encrypted');
      return ['PDF appears to contain minimal readable text. Document may be image-based or require OCR processing.'];
    }
    
  } catch (error) {
    logWithMetrics('error', 'PDF text extraction failed', { 
      errorType: 'extraction_error',
      errorMessage: error.message 
    });
    
    // If pdf-parse fails, we could fall back to the regex method as a last resort
    logWithMetrics('info', 'Attempting fallback text extraction method');
    try {
      return await fallbackTextExtraction(arrayBuffer);
    } catch (fallbackError) {
      logWithMetrics('error', 'Fallback extraction also failed');
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }
}

// Fallback text extraction using regex patterns (simplified version of original)
async function fallbackTextExtraction(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const uint8Array = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('latin1');
  const pdfString = decoder.decode(uint8Array);
  
  let extractedText = '';
  
  // Extract text from common PDF text operators
  const tjMatches = pdfString.match(/\[(.*?)\]\s*TJ/g) || [];
  const tjSimpleMatches = pdfString.match(/\((.*?)\)\s*Tj/g) || [];
  const parenMatches = pdfString.match(/\([^)]{3,}\)/g) || [];
  
  [...tjMatches, ...tjSimpleMatches, ...parenMatches].forEach(match => {
    let content = '';
    if (match.includes('[') && match.includes(']')) {
      content = match.match(/\[(.*?)\]/)?.[1] || '';
    } else if (match.includes('(') && match.includes(')')) {
      content = match.match(/\((.*?)\)/)?.[1] || '';
    }
    
    if (content && content.length > 2 && /[a-zA-Z0-9]/.test(content)) {
      extractedText += content.replace(/[()\\]/g, '').trim() + ' ';
    }
  });
  
  const cleanedText = extractedText
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanedText.length > 10 && /[a-zA-Z]/.test(cleanedText)) {
    return [cleanedText];
  } else {
    return ['PDF appears to contain minimal readable text. Document may be image-based or require OCR processing.'];
  }
}

// Enhanced retry logic with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      logWithMetrics('warn', `Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`, {
        retryCount: attempt + 1,
        errorType: error.message?.includes('rate') ? 'rate_limit' : 'api_error'
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Chunk text to stay within token limits
function chunkText(text: string, maxChunkSize: number = 8000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const metrics: ProcessingMetrics = {
    startTime: Date.now(),
    success: false,
    retryCount: 0
  };

  try {
    const { filePath, bucket }: RequestBody = await req.json();
    
    logWithMetrics('info', `Starting PDF processing with GPT-5 Vision`, { 
      filePath, 
      bucket,
      startTime: metrics.startTime 
    });

    // Initialize services
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      const error = 'OpenAI API key not configured - check Supabase secrets';
      logWithMetrics('error', error, { errorType: 'configuration_error' });
      throw new Error(error);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download file with error handling
    logWithMetrics('info', 'Downloading file from Supabase Storage');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError) {
      const error = `File download failed: ${downloadError.message}`;
      logWithMetrics('error', error, { errorType: 'storage_error' });
      throw new Error(error);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileSizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
    
    logWithMetrics('info', `File downloaded successfully`, { 
      fileSize: `${fileSizeMB}MB`,
      bytes: arrayBuffer.byteLength 
    });

    // Extract and process PDF text
    const extractedTexts = await extractPDFText(arrayBuffer);
    
    if (!extractedTexts.length || !extractedTexts[0]) {
      throw new Error('No readable content found in PDF');
    }

    // Process with GPT-5 Mini for text enhancement
    logWithMetrics('info', 'Processing extracted text with GPT-5 Mini');
    
    const allProcessedText: string[] = [];
    let totalTokensUsed = 0;

    for (let i = 0; i < extractedTexts.length; i++) {
      const rawText = extractedTexts[i];
      
      // Skip if no meaningful content
      if (rawText === 'No readable text found in PDF' || rawText.length < 10) {
        logWithMetrics('warn', 'Skipping empty or minimal content');
        continue;
      }
      
      // Chunk text to avoid token limits
      const chunks = chunkText(rawText, 8000); // Conservative for GPT-5
      
      for (const chunk of chunks) {
        try {
          const processedResult = await retryWithBackoff(async () => {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-5-mini-2025-08-07',
                messages: [
                  {
                    role: 'system',
                    content: 'You are an expert document processor. Clean, structure, and enhance the extracted PDF text while preserving all meaningful information. Fix formatting issues, remove garbled characters, and ensure readability. If the text contains tables or structured data, preserve the structure. Return only the cleaned, readable content without adding any commentary.'
                  },
                  {
                    role: 'user',
                    content: `Clean and structure this extracted PDF text, preserving all meaningful content:\n\n${chunk}`
                  }
                ],
                max_completion_tokens: 4000,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              logWithMetrics('error', `OpenAI API error: ${response.status}`, { 
                errorType: response.status === 429 ? 'rate_limit' : 'api_error',
                responseStatus: response.status 
              });
              throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
            }

            return response.json();
          }, 3, 2000);

          const processedText = processedResult.choices[0]?.message?.content || '';
          if (processedText.trim()) {
            allProcessedText.push(processedText.trim());
          }

          // Track token usage for monitoring
          totalTokensUsed += processedResult.usage?.total_tokens || 0;
          
          logWithMetrics('info', `Processed text chunk ${allProcessedText.length}`, {
            chunkLength: chunk.length,
            outputLength: processedText.length,
            tokensUsed: processedResult.usage?.total_tokens || 0
          });

        } catch (chunkError) {
          logWithMetrics('warn', `Chunk processing failed, using original text`, {
            errorType: 'chunk_processing_error',
            chunkIndex: i,
            error: chunkError.message
          });
          // Use original chunk as fallback
          if (chunk.trim().length > 10) {
            allProcessedText.push(chunk.trim());
          }
        }
      }
    }

    if (!allProcessedText.length) {
      throw new Error('No text content could be processed');
    }

    // Combine and clean final text
    const finalText = allProcessedText.join('\n\n')
      .replace(/\u0000/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();

    metrics.endTime = Date.now();
    metrics.success = true;
    metrics.tokensUsed = totalTokensUsed;
    metrics.processingMethod = 'gpt-5-mini-text-enhancement';

    const processingTime = (metrics.endTime - metrics.startTime) / 1000;

    logWithMetrics('info', `PDF processing completed successfully`, {
      processingTimeSeconds: processingTime,
      finalTextLength: finalText.length,
      totalTokensUsed,
      chunksProcessed: allProcessedText.length,
      success: true
    });

    return new Response(JSON.stringify({
      success: true,
      content: finalText,
      fileSize: arrayBuffer.byteLength,
      extractionMethod: 'gpt-5-mini-text-enhancement',
      processingMetrics: {
        processingTimeMs: metrics.endTime - metrics.startTime,
        tokensUsed: totalTokensUsed,
        chunksProcessed: allProcessedText.length,
        fileSizeMB: parseFloat(fileSizeMB)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    metrics.endTime = Date.now();
    metrics.success = false;
    metrics.errorType = error.message?.includes('rate') ? 'rate_limit' : 
                       error.message?.includes('configuration') ? 'configuration_error' :
                       error.message?.includes('storage') ? 'storage_error' : 'processing_error';

    const processingTime = (metrics.endTime - metrics.startTime) / 1000;

    logWithMetrics('error', `PDF processing failed after ${processingTime}s`, {
      ...metrics,
      processingTimeSeconds: processingTime,
      errorMessage: error.message
    });
    
    // Return user-friendly error messages
    let userMessage = 'Document processing failed. Please try again.';
    let statusCode = 500;

    if (error.message?.includes('rate')) {
      userMessage = 'Service temporarily busy. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message?.includes('configuration')) {
      userMessage = 'Service configuration error. Please contact support.';
      statusCode = 503;
    } else if (error.message?.includes('storage')) {
      userMessage = 'File could not be accessed. Please re-upload the document.';
      statusCode = 404;
    } else if (error.message?.includes('No readable content')) {
      userMessage = 'Document appears to be empty or unreadable. Please check the file format.';
      statusCode = 422;
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: userMessage,
      errorType: metrics.errorType,
      extractionMethod: 'gpt-5-mini-text-enhancement',
      processingMetrics: {
        processingTimeMs: metrics.endTime - metrics.startTime,
        success: false
      }
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});