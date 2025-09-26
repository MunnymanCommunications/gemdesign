import { getPdfjs } from '@/lib/utils';

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  
  const pdf = await pdfjs.getDocument(typedArray).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => ('str' in item) ? item.str : '').join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

export function sanitizeText(text: string): string {
  // Remove control characters, multiple spaces, and trim
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}