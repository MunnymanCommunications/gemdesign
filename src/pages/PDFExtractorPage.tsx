import React from 'react';
import Layout from '@/components/layout/Layout';
import { PDFExtractor } from '@/components/pdf/PDFExtractor';
import SEO from '@/components/seo/SEO';

const PDFExtractorPage: React.FC = () => {
  return (
    <Layout>
      <SEO 
        title="PDF Text Extractor - AI-Powered Document Processing"
        description="Extract text and table data from PDF documents with advanced OCR and AI-powered analysis. Process technical specifications, manuals, and data sheets."
      />
      
      <div className="container mx-auto px-4 py-8">
        <PDFExtractor showFeatures={true} />
      </div>
    </Layout>
  );
};

export default PDFExtractorPage;