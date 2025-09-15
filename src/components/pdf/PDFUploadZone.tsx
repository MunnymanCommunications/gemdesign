import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PDFUploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  className?: string;
}

export const PDFUploadZone: React.FC<PDFUploadZoneProps> = ({
  onFileSelect,
  isProcessing = false,
  className
}) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError('Please select a PDF file only');
      } else if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setError('File size must be less than 10MB');
      } else {
        setError('Invalid file selected');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  });

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-card border border-border shadow-sm transition-all duration-300",
        isDragActive && "border-primary shadow-lg scale-[1.02]",
        isProcessing && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer p-8 text-center transition-all duration-300",
          isDragActive && "bg-primary/5",
          isProcessing && "cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            "rounded-full p-4 transition-all duration-300",
            isDragActive ? "bg-primary/20 animate-pulse" : "bg-muted/50"
          )}>
            {isProcessing ? (
              <FileText className="h-8 w-8 text-primary animate-pulse" />
            ) : (
              <Upload className={cn(
                "h-8 w-8 transition-colors",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isProcessing ? "Processing PDF..." : "Upload PDF Document"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isProcessing 
                ? "Extracting text and tables from your document"
                : isDragActive 
                  ? "Drop your PDF file here"
                  : "Drag & drop a PDF file here, or click to select"
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: 10MB
            </p>
          </div>

          {!isProcessing && (
            <Button variant="secondary" size="sm" className="mt-4">
              Choose File
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-destructive/10 border-t border-destructive/20 p-3">
          <div className="flex items-center space-x-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </Card>
  );
};