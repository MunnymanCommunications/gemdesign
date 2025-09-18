import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SecurityAnalysis } from '../types';

const MARGIN = 15;
const FONT_SIZE_NORMAL = 11;
const LINE_HEIGHT = 7;

export const generatePdfReport = async (
  elementToCapture: HTMLElement,
  analysis: SecurityAnalysis,
  reportTitle: string
) => {
  // Use html2canvas to capture the aerial view with markers
  const canvas = await html2canvas(elementToCapture, {
    useCORS: true, // Important for external images like Google Maps
    scale: 2, // Increase resolution
  });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  
  let yPosition = MARGIN;

  // --- Header ---
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Security Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  pdf.setFontSize(FONT_SIZE_NORMAL);
  pdf.setFont('helvetica', 'normal');
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // --- Aerial Image ---
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
  pdf.addImage(imgData, 'PNG', MARGIN, yPosition, contentWidth, imgHeight);
  yPosition += imgHeight + 15;

  // Helper function to check for page overflow and add a new page if needed
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - MARGIN) {
      pdf.addPage();
      yPosition = MARGIN;
    }
  };

  // --- Overview Section ---
  checkPageBreak(20);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Security Overview', MARGIN, yPosition);
  yPosition += LINE_HEIGHT;

  pdf.setFontSize(FONT_SIZE_NORMAL);
  pdf.setFont('helvetica', 'normal');
  const overviewLines = pdf.splitTextToSize(analysis.overview, contentWidth);
  overviewLines.forEach((line: string) => {
    checkPageBreak(LINE_HEIGHT);
    pdf.text(line, MARGIN, yPosition);
    yPosition += LINE_HEIGHT;
  });
  yPosition += 10;

  // --- Placements Section ---
  checkPageBreak(20);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Recommended Placements', MARGIN, yPosition);
  yPosition += 10;

  analysis.placements.forEach((placement) => {
    // Estimate height needed for this section
    const reasonLines = pdf.splitTextToSize(placement.reason, contentWidth - 5);
    const sectionHeight = (LINE_HEIGHT * 3) + (reasonLines.length * LINE_HEIGHT);
    checkPageBreak(sectionHeight);
    
    // Bullet point
    pdf.setFontSize(14);
    pdf.text('•', MARGIN, yPosition);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(placement.location, MARGIN + 5, yPosition);
    yPosition += LINE_HEIGHT;

    pdf.setFontSize(FONT_SIZE_NORMAL);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100); // Grey text for camera type
    pdf.text(placement.cameraType, MARGIN + 5, yPosition);
    yPosition += LINE_HEIGHT;
    pdf.setTextColor(0); // Reset text color

    pdf.setFont('helvetica', 'normal');
    reasonLines.forEach((line: string) => {
        pdf.text(line, MARGIN + 5, yPosition);
        yPosition += LINE_HEIGHT;
    });
    
    yPosition += 8; // Spacing between placements
  });
  
  // --- Equipment Summary ---
  if (analysis.cameraSummary && analysis.cameraSummary.length > 0) {
    const summaryHeight = 20 + (analysis.cameraSummary.length * LINE_HEIGHT);
    checkPageBreak(summaryHeight);

    yPosition += 2; // Add a bit of space before the next section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Required Equipment Summary', MARGIN, yPosition);
    yPosition += 10;

    analysis.cameraSummary.forEach(item => {
        pdf.setFontSize(FONT_SIZE_NORMAL);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.cameraType, MARGIN, yPosition);

        pdf.setFont('helvetica', 'bold');
        pdf.text(`x ${item.quantity}`, pageWidth - MARGIN, yPosition, { align: 'right' });
        yPosition += LINE_HEIGHT;
    });
  }
  
  // Sanitize address for filename
  return pdf.output('blob');
};
