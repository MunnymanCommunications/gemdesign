import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import SatelliteAssessmentModal from './SatelliteAssessmentModal';
import { SecurityAnalysis } from '@/pages/SatelliteAssessment/types';

interface AssessmentData {
  step1: string; // Project driver
  step2: string; // Priority (cost, ease of use, futureproofing)
  step3: string; // Budget
  step4: string; // Retention period and camera count
  step5: string; // Decision maker
  step6: string; // Site layout description
  step6Images: File[]; // Site images
  step7: string; // Roadmap confirmation
  additionalNotes: string;
  satelliteAnalysis?: any;
}

interface ClarificationDialog {
  isOpen: boolean;
  question: string;
  onResponse: (response: string) => void;
}

interface AssessmentFormProps {
  onSubmit: (data: AssessmentData) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

const ASSESSMENT_STEPS = [
  {
    id: 'step1',
    title: 'Project Driver',
    question: "What's driving this project — a security incident, a compliance need, or something else?",
    placeholder: "Describe what initiated this security camera project..."
  },
  {
    id: 'step2', 
    title: 'Priorities',
    question: "What's most important to the client — cost, ease of use, futureproofing?",
    placeholder: "Rank the priorities: cost-effectiveness, user-friendliness, future technology compatibility..."
  },
  {
    id: 'step3',
    title: 'Budget',
    question: "Has a budget been defined? If not, should I suggest three pricing tiers?",
    placeholder: "Provide budget range or indicate if budget discussion is needed..."
  },
  {
    id: 'step4',
    title: 'Storage & Cameras',
    question: "How long should footage be retained? How many cameras are currently in use or planned?",
    placeholder: "Specify retention period (days/months) and current/planned camera count..."
  },
  {
    id: 'step5',
    title: 'Decision Maker',
    question: "Who will make the final purchasing decision?",
    placeholder: "Identify the key decision maker(s) and their role/authority..."
  },
  {
    id: 'step6',
    title: 'Site Layout',
    question: "Do we have a site layout, Google Earth view, or sketch to work from?",
    placeholder: "Describe the site layout or upload images/documents...",
    hasFileUpload: true
  },
  {
    id: 'step7',
    title: 'Project Roadmap',
    question: "Should I build a quick roadmap: goals, budget lock-in, site walk, and 2-day proposal delivery?",
    placeholder: "Confirm next steps and timeline preferences..."
  }
];

const AssessmentForm = ({ onSubmit, isLoading = false, onCancel }: AssessmentFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    step1: '',
    step2: '',
    step3: '',
    step4: '',
    step5: '',
    step6: '',
    step6Images: [],
    step7: '',
    additionalNotes: ''
  });
  const [clarificationDialog, setClarificationDialog] = useState<ClarificationDialog>({
    isOpen: false,
    question: '',
    onResponse: () => {}
  });
  const [clarificationResponse, setClarificationResponse] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState(false);
  const { user } = useAuth();

  const progress = ((currentStep + 1) / ASSESSMENT_STEPS.length) * 100;
  const isLastStep = currentStep === ASSESSMENT_STEPS.length - 1;
  const currentStepData = ASSESSMENT_STEPS[currentStep];

  const handleInputChange = (value: string) => {
    const stepKey = `step${currentStep + 1}` as keyof AssessmentData;
    setAssessmentData(prev => ({ ...prev, [stepKey]: value }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files && currentStep === 5) { // Step 6 (0-indexed)
      const fileArray = Array.from(files).filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
      );
      
      if (fileArray.length > 0) {
        setAssessmentData(prev => ({ 
          ...prev, 
          step6Images: [...prev.step6Images, ...fileArray] 
        }));
        toast.success(`${fileArray.length} file(s) uploaded`);
      }
    }
  };

  const removeFile = (index: number) => {
    setAssessmentData(prev => ({
      ...prev,
      step6Images: prev.step6Images.filter((_, i) => i !== index)
    }));
  };

  const handleSatelliteAssessmentComplete = async (analysis: SecurityAnalysis) => {
    setAssessmentData(prev => ({ ...prev, satelliteAnalysis: analysis }));
    setIsSatelliteModalOpen(false);
    toast.success('Satellite analysis added to assessment');

    if (user) {
      await supabase.from('assessment_usage').insert({
        user_id: user.id,
        tool_name: 'satellite_assessment',
      });
    }
  };

  const handleLaunchSatelliteAssessment = async () => {
    if (!user) {
      toast.error('You must be logged in to use this feature.');
      return;
    }

    const { data: usage, error: usageError } = await supabase
      .from('assessment_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('tool_name', 'satellite_assessment');

    const { data: limit, error: limitError } = await supabase
      .from('usage_limits')
      .select('limit')
      .eq('user_id', user.id)
      .eq('tool_name', 'satellite_assessment')
      .single();

    if (usageError || limitError) {
      toast.error('Could not verify usage limits.');
      return;
    }

    if (limit && usage && usage.length >= limit.limit) {
      toast.error('You have reached your usage limit for this feature.');
      return;
    }

    setIsSatelliteModalOpen(true);
  };

  const handleNext = () => {
    const currentValue = assessmentData[`step${currentStep + 1}` as keyof AssessmentData] as string;
    
    if (!currentValue.trim() && currentStep !== 5) { // Step 6 can be empty if files are uploaded
      toast.error('Please provide an answer before continuing');
      return;
    }

    if (currentStep === 5 && !currentValue.trim() && assessmentData.step6Images.length === 0 && !assessmentData.satelliteAnalysis) {
      toast.error('Please provide site information, upload files, or complete a satellite assessment');
      return;
    }

    // Simulate AI asking clarifying questions (30% chance)
    if (Math.random() < 0.3 && currentStep < ASSESSMENT_STEPS.length - 1) {
      const clarifyingQuestions = [
        "Can you provide more specific details about this?",
        "Are there any additional considerations I should know about?",
        "Would you like to elaborate on any particular aspect?",
        "Is there anything else that might impact this decision?"
      ];
      
      setClarificationDialog({
        isOpen: true,
        question: clarifyingQuestions[Math.floor(Math.random() * clarifyingQuestions.length)],
        onResponse: (response: string) => {
          if (response.trim()) {
            const currentValue = assessmentData[`step${currentStep + 1}` as keyof AssessmentData] as string;
            handleInputChange(`${currentValue}\n\nAdditional context: ${response}`);
          }
          setClarificationDialog(prev => ({ ...prev, isOpen: false }));
          setClarificationResponse('');
          setCurrentStep(prev => prev + 1);
        }
      });
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = () => {
    if (isLastStep) {
      onSubmit(assessmentData);
    }
  };

  const getCurrentValue = () => {
    if (currentStep === ASSESSMENT_STEPS.length) {
      return assessmentData.additionalNotes;
    }
    return assessmentData[`step${currentStep + 1}` as keyof AssessmentData] as string;
  };

  const handleCurrentInputChange = (value: string) => {
    if (currentStep === ASSESSMENT_STEPS.length) {
      setAssessmentData(prev => ({ ...prev, additionalNotes: value }));
    } else {
      handleInputChange(value);
    }
  };

  // Additional notes step
  if (currentStep === ASSESSMENT_STEPS.length) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Final Step</h3>
          <p className="text-muted-foreground mb-4">
            Do you have any additional notes or context to add for your assessment?
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Textarea
              placeholder="Add any additional context, special requirements, or notes..."
              value={assessmentData.additionalNotes}
              onChange={(e) => setAssessmentData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Generating Assessment...' : 'Generate Assessment'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">Step {currentStep + 1} of {ASSESSMENT_STEPS.length}</Badge>
          <Badge variant="outline">{currentStepData.title}</Badge>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentStepData.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={currentStepData.placeholder}
            value={getCurrentValue()}
            onChange={(e) => handleCurrentInputChange(e.target.value)}
            rows={4}
          />

          {/* File Upload for Step 6 */}
          {currentStepData.hasFileUpload && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload site images, layouts, or Google Earth screenshots
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Choose Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center flex flex-col items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Use AI to analyze a satellite image of the property
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleLaunchSatelliteAssessment}
                    type="button"
                  >
                    Launch Satellite Assessment
                  </Button>
                </div>
              </div>

              {/* Uploaded Files */}
              {assessmentData.step6Images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  <div className="flex flex-wrap gap-2">
                    {assessmentData.step6Images.map((file, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        {file.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {assessmentData.satelliteAnalysis && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Satellite Analysis:</p>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {assessmentData.satelliteAnalysis.overview}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button onClick={isLastStep ? handleSubmit : handleNext}>
          {isLastStep ? 'Final Step' : 'Next'}
          {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {/* Clarification Dialog */}
      <Dialog open={clarificationDialog.isOpen} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Quick Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{clarificationDialog.question}</p>
            <Textarea
              placeholder="Your response (optional)..."
              value={clarificationResponse}
              onChange={(e) => setClarificationResponse(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => clarificationDialog.onResponse('')}
              >
                Skip
              </Button>
              <Button onClick={() => clarificationDialog.onResponse(clarificationResponse)}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SatelliteAssessmentModal
        isOpen={isSatelliteModalOpen}
        onClose={() => setIsSatelliteModalOpen(false)}
        onComplete={handleSatelliteAssessmentComplete}
      />
    </div>
  );
};

export default AssessmentForm;