import React from 'react';
import { Loader2, FileText, Search, Table, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProcessingIndicatorProps {
  stage: 'uploading' | 'parsing' | 'extracting' | 'analyzing' | 'complete';
  progress: number;
  fileName?: string;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  stage,
  progress,
  fileName
}) => {
  const stages = [
    { key: 'uploading', label: 'Uploading PDF', icon: FileText },
    { key: 'parsing', label: 'Parsing Document', icon: Search },
    { key: 'extracting', label: 'Extracting Text', icon: FileText },
    { key: 'analyzing', label: 'Analyzing Tables', icon: Table },
    { key: 'complete', label: 'Processing Complete', icon: CheckCircle }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);

  return (
    <Card className="bg-card border border-border shadow-sm">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                {stage === 'complete' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {stages[currentStageIndex]?.label || 'Processing...'}
            </h3>
            {fileName && (
              <p className="text-sm text-muted-foreground">
                Processing: {fileName}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Progress value={progress} className="w-full max-w-sm mx-auto" />
            <p className="text-sm text-muted-foreground">
              {progress.toFixed(0)}% complete
            </p>
          </div>

          <div className="flex justify-center space-x-4 pt-4">
            {stages.slice(0, -1).map((stageInfo, index) => {
              const StageIcon = stageInfo.icon;
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              
              return (
                <div
                  key={stageInfo.key}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-primary border-primary text-white animate-pulse' 
                        : 'bg-muted border-border text-muted-foreground'
                  )}>
                    <StageIcon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    "text-xs transition-colors duration-300",
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {stageInfo.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};