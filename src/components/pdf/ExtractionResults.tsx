import React, { useState } from 'react';
import { Download, Copy, FileText, Table, Info, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ExtractionResult, PDFProcessor } from '@/utils/pdfProcessor';
import { saveAs } from 'file-saver';

interface ExtractionResultsProps {
  result: ExtractionResult;
  onNewFile: () => void;
  onSaveToDatabase?: (extractedText: string) => void;
}

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({
  result,
  onNewFile,
  onSaveToDatabase
}) => {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      toast({
        title: "Copied to clipboard",
        description: `${type} copied successfully`,
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadJSON = () => {
    const jsonData = PDFProcessor.exportToJSON(result);
    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, `${result.fileName.replace('.pdf', '')}_extraction.json`);
  };

  const downloadCSV = () => {
    const csvData = PDFProcessor.exportToCSV(result.tables);
    const blob = new Blob([csvData], { type: 'text/csv' });
    saveAs(blob, `${result.fileName.replace('.pdf', '')}_tables.csv`);
  };

  const downloadText = () => {
    const blob = new Blob([result.text], { type: 'text/plain' });
    saveAs(blob, `${result.fileName.replace('.pdf', '')}_text.txt`);
  };

  const handleSaveToDatabase = () => {
    if (onSaveToDatabase) {
      onSaveToDatabase(result.text);
      toast({
        title: "Saved to database",
        description: "Extracted text has been saved for AI reference",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Extraction Complete</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully processed {result.fileName}
              </p>
            </div>
            <div className="flex space-x-2">
              {onSaveToDatabase && (
                <Button onClick={handleSaveToDatabase} variant="default" size="sm">
                  Save to Database
                </Button>
              )}
              <Button onClick={onNewFile} variant="outline" size="sm">
                Process New File
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Size</p>
              <p className="font-medium">{PDFProcessor.formatFileSize(result.fileSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pages</p>
              <p className="font-medium">{result.metadata.pages}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tables Found</p>
              <p className="font-medium">{result.tables.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Processing Time</p>
              <p className="font-medium">{(result.processingTime / 1000).toFixed(1)}s</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="text" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Extracted Text</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>Tables ({result.tables.length})</span>
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Metadata</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <Card className="bg-card border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Extracted Text</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => copyToClipboard(result.text, "Text")}
                    variant="outline"
                    size="sm"
                  >
                    {copiedText === "Text" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button onClick={downloadText} variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {result.text}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          {result.tables.length === 0 ? (
            <Card className="bg-card border border-border">
              <CardContent className="p-8 text-center">
                <Table className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tables found in this document</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={downloadCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
              
              {result.tables.map((table, index) => (
                <Card key={index} className="bg-card border border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {table.title || `Table ${index + 1}`}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          Page {table.pageNumber}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(
                          table.rows.map(row => row.join('\t')).join('\n'),
                          `Table ${index + 1}`
                        )}
                        variant="outline"
                        size="sm"
                      >
                        {copiedText === `Table ${index + 1}` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex === 0 ? "border-b-2 border-border" : "border-b border-border/50"}>
                              {row.map((cell, cellIndex) => (
                                <td 
                                  key={cellIndex}
                                  className={`p-2 text-sm ${rowIndex === 0 ? 'font-semibold bg-muted/30' : ''}`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card className="bg-card border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Document Metadata</CardTitle>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(result.metadata, null, 2), "Metadata")}
                  variant="outline"
                  size="sm"
                >
                  {copiedText === "Metadata" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.metadata).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="font-medium break-words">{value}</p>
                    </div>
                  )
                ))}
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <Button onClick={downloadJSON} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Full JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};