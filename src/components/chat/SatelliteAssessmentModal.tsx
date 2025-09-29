import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisStep, SecurityAnalysis } from '@/pages/SatelliteAssessment/types';
import { getAerialViewFromAddress, getSecurityAnalysis } from '@/pages/SatelliteAssessment/services/geminiService';
import LocationInput from '@/pages/SatelliteAssessment/components/LocationInput';
import AerialView from '@/pages/SatelliteAssessment/components/AerialView';
import SecurityReport from '@/pages/SatelliteAssessment/components/SecurityReport';
import ErrorMessage from '@/pages/SatelliteAssessment/components/ErrorMessage';
import LoadingSpinner from '@/pages/SatelliteAssessment/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface SatelliteAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (analysis: SecurityAnalysis) => void;
}

const SatelliteAssessmentModal = ({ isOpen, onClose, onComplete }: SatelliteAssessmentModalProps) => {
  const [location, setLocation] = useState('');
  const [aerialImage, setAerialImage] = useState<string | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null);
  const [step, setStep] = useState<AnalysisStep>(AnalysisStep.INPUT);
  const [error, setError] = useState<string>('');
  const [markerCoords, setMarkerCoords] = useState<{ x: number, y: number } | null>(null);
  const aerialViewRef = useRef<HTMLDivElement>(null);

  const handleFetchImage = useCallback(async () => {
    if (!location.trim()) return;
    setError('');
    setAerialImage(null);
    setSecurityAnalysis(null);
    setMarkerCoords(null);
    setStep(AnalysisStep.FETCHING_IMAGE);

    try {
      const imageUrl = await getAerialViewFromAddress(location, 19);
      setAerialImage(imageUrl);
      setStep(AnalysisStep.AWAITING_ANALYSIS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep(AnalysisStep.ERROR);
    }
  }, [location]);

  const handleStartAnalysis = useCallback(async () => {
    if (!aerialImage || !markerCoords) return;
    setError('');
    setStep(AnalysisStep.ANALYZING);

    try {
      const analysis = await getSecurityAnalysis(location, aerialImage, markerCoords, 'exterior');
      setSecurityAnalysis(analysis);
      setStep(AnalysisStep.COMPLETE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep(AnalysisStep.ERROR);
    }
  }, [location, aerialImage, markerCoords]);

  const handleComplete = async () => {
    if (securityAnalysis && aerialViewRef.current) {
      try {
        console.log('Satellite Assessment - Generating PDF report');
        
        // Generate PDF using the report element
        const { success, blob, error } = await generatePdfReport(
          aerialViewRef.current,
          securityAnalysis,
          `Security Assessment - ${location}`
        );

        if (success && blob) {
          // Download the PDF
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Security_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success('PDF report downloaded and saved!');
          
          // Pass analysis to parent
          onComplete(securityAnalysis);
          onClose();
        } else {
          console.error('Satellite Assessment - PDF generation failed:', error);
          toast.error('PDF generation failed, but analysis saved');
          
          // Still pass analysis even if PDF fails
          onComplete(securityAnalysis);
          onClose();
        }
      } catch (error) {
        console.error('Satellite Assessment - Error in handleComplete:', error);
        toast.error('Failed to generate PDF report');
        
        // Fallback: just save analysis without PDF
        onComplete(securityAnalysis);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Satellite Security Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === AnalysisStep.INPUT && (
            <LocationInput
              location={location}
              setLocation={setLocation}
              onSubmit={handleFetchImage}
              isLoading={step === AnalysisStep.FETCHING_IMAGE}
              buttonText="Get Aerial View"
            />
          )}
          {step === AnalysisStep.FETCHING_IMAGE && <LoadingSpinner />}
          {step === AnalysisStep.AWAITING_ANALYSIS && aerialImage && (
            <>
              <AerialView
                ref={aerialViewRef}
                imageUrl={aerialImage}
                markerCoords={markerCoords}
                onImageClick={setMarkerCoords}
              />
              <Button onClick={handleStartAnalysis} disabled={!markerCoords}>
                Analyze Security
              </Button>
            </>
          )}
          {step === AnalysisStep.ANALYZING && <LoadingSpinner />}
          {step === AnalysisStep.COMPLETE && securityAnalysis && (
            <div ref={aerialViewRef}>
              <SecurityReport analysis={securityAnalysis} />
              <div className="flex justify-center mt-6">
                <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                  Download PDF & Add to Assessment
                </Button>
              </div>
            </div>
          )}
          {step === AnalysisStep.ERROR && <ErrorMessage message={error} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SatelliteAssessmentModal;