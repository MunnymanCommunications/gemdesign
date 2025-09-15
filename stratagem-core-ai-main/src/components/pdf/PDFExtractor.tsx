import React, { useState } from 'react';
import { FileSearch, Zap, Shield, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PDFUploadZone } from './PDFUploadZone';
import { ProcessingIndicator } from './ProcessingIndicator';
import { ExtractionResults } from './ExtractionResults';
import { PDFProcessor, ExtractionResult } from '@/utils/pdfProcessor';
import { useToast } from '@/hooks/use-toast';

type ProcessingStage = 'uploading' | 'parsing' | 'extracting' | 'analyzing' | 'complete';

interface PDFExtractorProps {
  onExtractedText?: (text: string, fileName: string) => void;
  showFeatures?: boolean;
  title?: string;
  description?: string;
}

export const PDFExtractor: React.FC<PDFExtractorProps> = ({ 
  onExtractedText,
  showFeatures = true,
  title = "PDF Text Extractor",
  description = "Extract text and table data from PDF documents with precision."
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('uploading');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const { toast } = useToast();

  const simulateProcessing = async (file: File): Promise<ExtractionResult> => {
    const stages: ProcessingStage[] = ['uploading', 'parsing', 'extracting', 'analyzing', 'complete'];
    
    for (let i = 0; i < stages.length; i++) {
      setCurrentStage(stages[i]);
      
      // Simulate processing time for each stage
      const stageTime = i === stages.length - 1 ? 500 : 800 + Math.random() * 1200;
      
      for (let p = 0; p <= 100; p += 5) {
        setProgress((i * 100 + p) / stages.length);
        await new Promise(resolve => setTimeout(resolve, stageTime / 20));
      }
    }
    
    return await PDFProcessor.processFile(file);
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setProgress(0);
    setExtractionResult(null);

    try {
      const result = await simulateProcessing(file);
      setExtractionResult(result);
      
      toast({
        title: "Extraction Complete",
        description: `Successfully processed ${file.name}`,
      });

      // Call the callback if provided
      if (onExtractedText) {
        onExtractedText(result.text, file.name);
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewFile = () => {
    setSelectedFile(null);
    setExtractionResult(null);
    setIsProcessing(false);
    setProgress(0);
    setCurrentStage('uploading');
  };

  const handleSaveToDatabase = (extractedText: string) => {
    if (onExtractedText && selectedFile) {
      onExtractedText(extractedText, selectedFile.name);
    }
  };

  const features = [
    {
      icon: FileSearch,
      title: "Smart Text Extraction",
      description: "Advanced OCR and text parsing to extract all readable content from PDFs"
    },
    {
      icon: Zap,
      title: "Table Detection",
      description: "Automatically identifies and extracts structured data from tables"
    },
    {
      icon: Shield,
      title: "Secure Processing",
      description: "All processing happens locally in your browser - your files never leave your device"
    },
    {
      icon: Download,
      title: "Multiple Export Formats",
      description: "Export extracted data as JSON, CSV, or plain text for easy integration"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      {showFeatures && (
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="mb-4">
            Professional PDF Processing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            {title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>
      )}

      {/* Features Grid */}
      {showFeatures && !selectedFile && !extractionResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {!selectedFile && !extractionResult ? (
          <PDFUploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
        ) : isProcessing ? (
          <ProcessingIndicator 
            stage={currentStage} 
            progress={progress} 
            fileName={selectedFile?.name}
          />
        ) : extractionResult ? (
          <ExtractionResults 
            result={extractionResult} 
            onNewFile={handleNewFile}
            onSaveToDatabase={onExtractedText ? handleSaveToDatabase : undefined}
          />
        ) : null}
      </div>

      {/* Implementation Note */}
      {showFeatures && !selectedFile && !extractionResult && (
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-center">Ready for Integration</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                This PDF extractor is designed to be easily integrated into your existing software. 
                The modular components and clean API make it simple to embed into any application.
              </p>
              <div className="flex justify-center space-x-4 text-sm">
                <Badge variant="outline">React Components</Badge>
                <Badge variant="outline">TypeScript API</Badge>
                <Badge variant="outline">Export Functions</Badge>
                <Badge variant="outline">Local Processing</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};