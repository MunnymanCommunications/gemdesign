import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Download, Save, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';

interface DocumentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'proposal' | 'invoice';
  aiGeneratedContent: string;
  clientName?: string;
  assessmentImages?: string[];
}

interface CompanyTemplate {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

const DocumentEditor = ({ 
  isOpen, 
  onClose, 
  documentType, 
  aiGeneratedContent,
  clientName = 'Client',
  assessmentImages = []
}: DocumentEditorProps) => {
  const { user } = useAuth();
  const [editableContent, setEditableContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [companyTemplate, setCompanyTemplate] = useState<CompanyTemplate | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Load company template from profile
      fetchCompanyTemplate();

      // Ensure AI content is properly formatted and set
      if (aiGeneratedContent && aiGeneratedContent.trim()) {
        // Clean up the AI content and format it properly
        let cleanContent = aiGeneratedContent
          .replace(/^#{1,6}\s*/gm, '<h3>') // Convert markdown headers to h3
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
          .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
          .replace(/\n\n/g, '</p><p>') // Paragraphs
          .replace(/\n/g, '<br>'); // Line breaks

        // Replace image placeholders with actual site images
        if (assessmentImages.length > 0) {
          assessmentImages.forEach((imageData, index) => {
            const placeholder = `[Site Image ${index + 1}]`;
            const imageHtml = `<div style="margin: 20px 0; text-align: center;">
              <img src="${imageData}" alt="Site Image ${index + 1}" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px;" />
              <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Site Image ${index + 1}</p>
            </div>`;
            cleanContent = cleanContent.replace(placeholder, imageHtml);
          });
        }
        
        // Wrap in paragraphs if not already wrapped
        if (!cleanContent.startsWith('<')) {
          cleanContent = '<p>' + cleanContent + '</p>';
        }
        
        setEditableContent(cleanContent);
      } else {
        setEditableContent('<p>Please generate content first using the AI chat, then click on the highlighted Generate Proposal/Invoice button.</p>');
      }
      
      setDocumentTitle(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} for ${clientName}`);
    }
  }, [isOpen, aiGeneratedContent, documentType, clientName]);

  const fetchCompanyTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('company, email, full_name')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCompanyTemplate({
          name: data.company || 'Your Company',
          address: 'Your Address',
          phone: 'Your Phone',
          email: data.email || 'your@email.com',
          website: 'Your Website'
        });
      }
    } catch (error) {
      console.error('Error fetching company template:', error);
      // Fallback to default template
      setCompanyTemplate({
        name: 'Your Company',
        address: 'Your Address',
        phone: 'Your Phone',
        email: user?.email || 'your@email.com',
        website: 'Your Website'
      });
    }
  };

  const generateHeader = () => {
    if (!companyTemplate) return '';
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
        <div>
          ${companyTemplate.logo ? `<img src="${companyTemplate.logo}" alt="Company Logo" style="max-height: 80px; margin-bottom: 15px;" />` : ''}
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 0;">${companyTemplate.name}</h1>
          <p style="margin: 5px 0; color: #6b7280;">${companyTemplate.address}</p>
          <p style="margin: 5px 0; color: #6b7280;">Phone: ${companyTemplate.phone}</p>
          <p style="margin: 5px 0; color: #6b7280;">Email: ${companyTemplate.email}</p>
          ${companyTemplate.website ? `<p style="margin: 5px 0; color: #6b7280;">Website: ${companyTemplate.website}</p>` : ''}
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 28px; font-weight: bold; color: #3b82f6; margin: 0; text-transform: uppercase;">
            ${documentType === 'proposal' ? 'PROPOSAL' : 'INVOICE'}
          </h2>
          <p style="margin: 10px 0; color: #6b7280;">Date: ${new Date().toLocaleDateString()}</p>
          <p style="margin: 5px 0; color: #6b7280;">Doc #: ${documentType.toUpperCase()}-${Date.now().toString().slice(-6)}</p>
        </div>
      </div>
    `;
  };

  const generateFooter = () => {
    if (!companyTemplate) return '';
    
    return `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Thank you for your business!</p>
        <p>${companyTemplate.name} | ${companyTemplate.phone} | ${companyTemplate.email}</p>
      </div>
    `;
  };

  const getFullDocument = () => {
    const header = generateHeader();
    const footer = generateFooter();
    
    return `
      <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        ${header}
        <div style="margin: 30px 0;">
          ${editableContent}
        </div>
        ${footer}
      </div>
    `;
  };

  const saveDocument = async () => {
    try {
      const documentData = {
        user_id: user?.id,
        document_type: documentType,
        title: documentTitle,
        content: getFullDocument(),
        client_name: clientName,
        amount: extractAmount(editableContent)
      };

      const { error } = await supabase
        .from('generated_documents')
        .insert(documentData);

      if (error) throw error;

      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} saved successfully!`);
      onClose();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const downloadPDF = async () => {
    try {
      // Create a temporary element for PDF generation
      const element = document.createElement('div');
      element.innerHTML = getFullDocument();
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
      pdf.save(`${documentTitle.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const extractAmount = (content: string): number => {
    // Try to extract dollar amounts from content
    const matches = content.match(/\$[\d,]+\.?\d*/g);
    if (matches) {
      const amounts = matches.map(match => parseFloat(match.replace(/[$,]/g, '')));
      return Math.max(...amounts);
    }
    return 0;
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const sanitizedContent = DOMPurify.sanitize(e.currentTarget.innerHTML, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'img', 'div'],
      ALLOWED_ATTR: ['src', 'alt', 'style', 'class']
    });
    setEditableContent(sanitizedContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit {documentType.charAt(0).toUpperCase() + documentType.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="documentTitle">Document Title</Label>
            <Input
              id="documentTitle"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Enter document title"
            />
          </div>

          <Separator />

          {/* Document Preview */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header Preview */}
            {companyTemplate && (
              <div 
                className="p-6 bg-gray-50 border-b"
                dangerouslySetInnerHTML={{ __html: generateHeader() }}
              />
            )}

            {/* Editable Content */}
            <div 
              ref={contentRef}
              contentEditable
              onInput={handleContentChange}
              className="p-6 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(editableContent, {
                  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'img', 'div'],
                  ALLOWED_ATTR: ['src', 'alt', 'style', 'class']
                })
              }}
              style={{ 
                lineHeight: '1.6',
                fontFamily: 'Arial, sans-serif'
              }}
            />

            {/* Footer Preview */}
            {companyTemplate && (
              <div 
                className="p-6 bg-gray-50 border-t"
                dangerouslySetInnerHTML={{ __html: generateFooter() }}
              />
            )}
          </div>

          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button onClick={saveDocument} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Document
              </Button>
              <Button onClick={downloadPDF} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentEditor;