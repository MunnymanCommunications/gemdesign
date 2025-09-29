import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisStep, SecurityAnalysis, AssessmentMode } from './types';
import { getAerialViewFromAddress, getSecurityAnalysis, MapsRequestDeniedError } from './services/geminiService';
import { generatePdfReport } from './services/pdfGenerator';
import LocationInput from './components/LocationInput';
import AerialView from './components/AerialView';
import SecurityReport from './components/SecurityReport';
import ErrorMessage from './components/ErrorMessage';
import MapPinIcon from './components/icons/MapPinIcon';
import ApiConfigurationMessage from './components/ApiConfigurationMessage';
import PrinterIcon from './components/icons/PrinterIcon';
import LoadingSpinner from './components/LoadingSpinner';
import SparklesIcon from './components/icons/SparklesIcon';
import ZoomInIcon from './components/icons/ZoomInIcon';
import ZoomOutIcon from './components/icons/ZoomOutIcon';
import FileUpload from './components/FileUpload';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const INITIAL_ZOOM = 19;
const MIN_ZOOM = 17;
const MAX_ZOOM = 21;

const MIN_SCALE = 1.0;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.2;

// Safely check for environment variables.
const ARE_KEYS_CONFIGURED = import.meta.env?.VITE_API_KEY && import.meta.env?.VITE_MAPS_API_KEY;

const SatelliteAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isPro } = useSubscription();
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [aerialImage, setAerialImage] = useState<string | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null);
  const [step, setStep] = useState<AnalysisStep>(AnalysisStep.INPUT);
  const [error, setError] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  const [markerCoords, setMarkerCoords] = useState<{ x: number, y: number } | null>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('exterior');
  const [exteriorInputMode, setExteriorInputMode] = useState<'address' | 'upload'>('address');
  
  // State for the exterior upload form
  const [exteriorUploadLocation, setExteriorUploadLocation] = useState('');
  const [exteriorUploadImage, setExteriorUploadImage] = useState<string | null>(null);

  const STORAGE_KEY = 'satelliteAssessmentState';

  // Load persisted state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setLocation(state.location || '');
        setAerialImage(state.aerialImage || null);
        setSecurityAnalysis(state.securityAnalysis || null);
        setStep(state.step || AnalysisStep.INPUT);
        setZoomLevel(state.zoomLevel || INITIAL_ZOOM);
        setMarkerCoords(state.markerCoords || null);
        setScale(state.scale || MIN_SCALE);
        setAssessmentMode(state.assessmentMode || 'exterior');
        setExteriorInputMode(state.exteriorInputMode || 'address');
        setExteriorUploadLocation(state.exteriorUploadLocation || '');
        setExteriorUploadImage(state.exteriorUploadImage || null);
      } catch (error) {
        console.error('Failed to load persisted state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    const state = {
      location,
      aerialImage,
      securityAnalysis,
      step,
      zoomLevel,
      markerCoords,
      scale,
      assessmentMode,
      exteriorInputMode,
      exteriorUploadLocation,
      exteriorUploadImage,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [location, aerialImage, securityAnalysis, step, zoomLevel, markerCoords, scale, assessmentMode, exteriorInputMode, exteriorUploadLocation, exteriorUploadImage]);

  const aerialViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUsage = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('assessment_usage')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const now = new Date();
        const lastReset = new Date(data.last_reset_date);
        const monthDiff = now.getMonth() - lastReset.getMonth() + (12 * (now.getFullYear() - lastReset.getFullYear()));

        if (monthDiff >= 1) {
          await supabase
            .from('assessment_usage')
            .update({ usage_count: 0, last_reset_date: new Date().toISOString() })
            .eq('user_id', user.id);
        } else {
          const limit = subscription?.id === 'granted-access' ? Infinity : (isPro ? 50 : 10);
          if (data.usage_count >= limit) {
            navigate('/upgrade');
          }
        }
      } else {
        await supabase
          .from('assessment_usage')
          .insert({ user_id: user.id, usage_count: 0 });
      }
    };

    checkUsage();
  }, [user, subscription, isPro, navigate]);
  
  if (!ARE_KEYS_CONFIGURED) {
    return <ApiConfigurationMessage />;
  }
  
  const isLoading = step === AnalysisStep.FETCHING_IMAGE || step === AnalysisStep.ANALYZING;

  const handleError = (err: unknown) => {
    if (err instanceof MapsRequestDeniedError) {
      const origin = window.location.origin;
      const detailedError = `Request Denied by Google Maps.\n\nThis usually means your API key is restricted. To fix this, you must add your website's URL to the allowed list in your Google Cloud Console.\n\n1. Go to Google Cloud Console -> APIs & Services -> Credentials.\n2. Find your Maps API Key and click to edit it.\n3. Under "Application restrictions", select "Websites".\n4. Click "Add" and enter the following URL:\n\n   ${origin}/*\n\nIt may take a few minutes for the change to take effect.`;
      setError(detailedError);
    } else {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    }
    setStep(AnalysisStep.ERROR);
  };

  const fetchImage = useCallback(async (zoom: number) => {
    if (!location.trim()) return;

    setError('');
    setAerialImage(null);
    setSecurityAnalysis(null);
    setMarkerCoords(null);
    setStep(AnalysisStep.FETCHING_IMAGE);

    try {
      const imageUrl = await getAerialViewFromAddress(location, zoom);
      setAerialImage(imageUrl);
      setStep(AnalysisStep.AWAITING_ANALYSIS);
    } catch (err) {
      handleError(err);
    }
  }, [location]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    fetchImage(zoomLevel);
  };

  const handleImageUpload = (imageBase64: string, fileName: string) => {
    setError('');
    setAerialImage(imageBase64);
    setSecurityAnalysis(null);
    setMarkerCoords(null);
    setLocation(fileName); // Use the file name as a placeholder for display
    setStep(AnalysisStep.AWAITING_ANALYSIS);
  };
  
  const handleExteriorUploadProceed = () => {
    if (!exteriorUploadLocation || !exteriorUploadImage) return;
  
    setError('');
    setAerialImage(exteriorUploadImage);
    setLocation(exteriorUploadLocation);
    setSecurityAnalysis(null);
    setMarkerCoords(null);
    setStep(AnalysisStep.AWAITING_ANALYSIS);
  };

  const handleStartAnalysis = useCallback(async () => {
    if (!aerialImage || isLoading) return;
    if (assessmentMode === 'exterior' && !markerCoords) return;

    setError('');
    setStep(AnalysisStep.ANALYZING);

    try {
      const analysis = await getSecurityAnalysis(
        location,
        aerialImage,
        assessmentMode === 'exterior' ? markerCoords : null,
        assessmentMode
      );
      setSecurityAnalysis(analysis);
      setStep(AnalysisStep.COMPLETE);

// Save to generated_documents using edge function
if (user) {
  const { data, error } = await supabase.functions.invoke('generate-document', {
    body: {
      document_type: 'security_assessment',
      assessment_data: analysis,
      user_id: user.id,
      title: `${location} Security Assessment`
    }
  });
  if (error) {
    console.error('Failed to save assessment:', error);
  } else {
    console.log('Assessment saved with ID:', data.document_id);
  }
}

      if (user) {
        const { data, error } = await supabase
          .from('assessment_usage')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          await supabase
            .from('assessment_usage')
            .update({ usage_count: data.usage_count + 1 })
            .eq('user_id', user.id);
        }
      }
    } catch (err) {
      handleError(err);
    }
  }, [location, aerialImage, isLoading, markerCoords, assessmentMode, user]);

  const handleGenerateReport = async () => {
    if (!aerialViewRef.current || !securityAnalysis || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setError('');
    try {
      const reportTitle = assessmentMode === 'exterior' ? location : 'Interior Security Plan';
      const result = await generatePdfReport(aerialViewRef.current, securityAnalysis, reportTitle);
      if (result.success) {
        setPdfBlob(result.blob);
        setShowPreview(true);
      } else {
        throw new Error(result.error?.message || 'Failed to generate PDF');
      }
    } catch (err) {
       console.error("Failed to generate PDF:", err);
       const errorMessage = err instanceof Error ? `Failed to generate PDF: ${err.message}` : 'An unknown error occurred during PDF generation.';
       setError(errorMessage);
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const handleReset = () => {
    setLocation('');
    setAerialImage(null);
    setSecurityAnalysis(null);
    setError('');
    setStep(AnalysisStep.INPUT);
    setScale(MIN_SCALE);
    setZoomLevel(INITIAL_ZOOM);
    setMarkerCoords(null);
    setExteriorInputMode('address');
    setExteriorUploadLocation('');
    setExteriorUploadImage(null);
    // Don't reset assessmentMode, user might want to do another of the same type
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 1, MAX_ZOOM);
    if (newZoom !== zoomLevel && !isLoading) {
      setZoomLevel(newZoom);
      fetchImage(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 1, MIN_ZOOM);
    if (newZoom !== zoomLevel && !isLoading) {
      setZoomLevel(newZoom);
      fetchImage(newZoom);
    }
  };
  
  const switchExteriorInputMode = (mode: 'address' | 'upload') => {
    if (mode === exteriorInputMode) return;
    setExteriorInputMode(mode);
    setLocation('');
    setExteriorUploadLocation('');
    setExteriorUploadImage(null);
    setAerialImage(null);
    setError('');
  }

  const getLoadingMessage = (): string => {
    if (step === AnalysisStep.FETCHING_IMAGE) {
      return "Retrieving satellite imagery from Google Maps...";
    }
    if (step === AnalysisStep.ANALYZING) {
      return "Analyzing property and preparing security recommendations...";
    }
    return "";
  }
  
  const getHeaderText = () => {
    return assessmentMode === 'exterior' 
      ? "Enter an address to get a satellite image and a complete exterior security plan."
      : "Upload a floor plan or blueprint for a comprehensive interior security plan.";
  }

  // Client-side scaling is only enabled after analysis.
  const canZoomIn = step === AnalysisStep.COMPLETE && scale < MAX_SCALE;
  const canZoomOut = step === AnalysisStep.COMPLETE && scale > MIN_SCALE;

  return (
    <Layout>
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center p-4 sm:p-8 font-sans relative">
        <header className="text-center mb-8 w-full max-w-3xl">
          <div className="flex justify-center items-center gap-4 mb-2">
              <MapPinIcon className="w-10 h-10 text-blue-400" />
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  AI Security Surveyor
              </h1>
          </div>
          <p className="text-lg text-indigo-300">
           {getHeaderText()}
          </p>
        </header>

        <main className="w-full flex flex-col items-center gap-8">
          
          <div className="flex justify-center bg-indigo-900/70 backdrop-blur-sm p-1 rounded-full mb-4 border border-indigo-800 shadow-lg">
            <button 
              onClick={() => { setAssessmentMode('exterior'); handleReset(); }} 
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-full transition-colors duration-300 ${assessmentMode === 'exterior' ? 'bg-blue-600 text-white' : 'text-indigo-300 hover:text-white'}`}
              aria-pressed={assessmentMode === 'exterior'}
            >
              Exterior Assessment
            </button>
            <button 
              onClick={() => { setAssessmentMode('interior'); handleReset(); }} 
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-full transition-colors duration-300 ${assessmentMode === 'interior' ? 'bg-blue-600 text-white' : 'text-indigo-300 hover:text-white'}`}
              aria-pressed={assessmentMode === 'interior'}
            >
              Interior Assessment
            </button>
          </div>

          {step === AnalysisStep.INPUT && (
            <div className="w-full flex flex-col items-center animate-fade-in">
              {assessmentMode === 'exterior' ? (
                <div className="w-full max-w-2xl">
                  <div className="flex justify-center bg-indigo-900/70 backdrop-blur-sm p-1 rounded-full mb-6 border border-indigo-800 shadow-lg max-w-sm mx-auto">
                      <button onClick={() => switchExteriorInputMode('address')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${exteriorInputMode === 'address' ? 'bg-blue-600/50 text-white' : 'text-indigo-300 hover:text-white'}`} aria-pressed={exteriorInputMode === 'address'}>
                          By Address
                      </button>
                      <button onClick={() => switchExteriorInputMode('upload')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${exteriorInputMode === 'upload' ? 'bg-blue-600/50 text-white' : 'text-indigo-300 hover:text-white'}`} aria-pressed={exteriorInputMode === 'upload'}>
                          By Image Upload
                      </button>
                  </div>

                  {exteriorInputMode === 'address' && (
                      <LocationInput 
                          location={location}
                          setLocation={setLocation}
                          onSubmit={handleFormSubmit}
                          isLoading={isLoading}
                          buttonText="Get Aerial View"
                      />
                  )}

                  {exteriorInputMode === 'upload' && (
                    <div className="w-full flex flex-col items-center gap-4">
                       <input
                          type="text"
                          value={exteriorUploadLocation}
                          onChange={(e) => setExteriorUploadLocation(e.target.value)}
                          placeholder="Enter property address or description (required)"
                          className="w-full bg-indigo-900 border-2 border-indigo-800 rounded-lg shadow-lg px-6 py-4 placeholder-indigo-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                      <FileUpload 
                        onImageUpload={(base64, file) => setExteriorUploadImage(base64)} 
                        isLoading={isLoading}
                      />
                      <button 
                        onClick={handleExteriorUploadProceed}
                        disabled={!exteriorUploadLocation || !exteriorUploadImage || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg flex items-center justify-center gap-3 w-full sm:w-auto"
                      >
                        Proceed to Analysis
                      </button>
                    </div>
                  )}
                </div>
              ) : ( // Interior mode
                <FileUpload 
                  onImageUpload={(base64, file) => handleImageUpload(base64, file.name)} 
                  isLoading={isLoading}
                />
              )}
            </div>
          )}

          {(step === AnalysisStep.ERROR) && (
            <div className="w-full max-w-2xl flex flex-col items-center animate-fade-in">
               {assessmentMode === 'exterior' ? (
                  <LocationInput 
                    location={location}
                    setLocation={setLocation}
                    onSubmit={handleFormSubmit}
                    isLoading={isLoading}
                    buttonText="Get Aerial View"
                  />
               ) : (
                  <p className="text-lg text-indigo-300 mb-4">There was an error with the file upload.</p>
               )}
              <ErrorMessage message={error} />
              <button 
                onClick={handleReset} 
                className="mt-4 bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {(step !== AnalysisStep.INPUT && step !== AnalysisStep.ERROR) && (
            <div className="w-full max-w-5xl flex flex-col items-center gap-8 animate-fade-in">
              <div className="w-full p-4 bg-indigo-900 rounded-xl shadow-lg border border-indigo-800">
                  <p className="text-gray-300 font-mono text-sm break-words">
                    <span className="font-bold text-blue-400">{assessmentMode === 'exterior' ? 'Location:' : 'File:'}</span> {location}
                  </p>
              </div>
              <AerialView 
                ref={aerialViewRef}
                imageUrl={aerialImage}
                markerCoords={markerCoords}
                onImageClick={(assessmentMode === 'exterior' && step === AnalysisStep.AWAITING_ANALYSIS) ? setMarkerCoords : undefined}
                scale={scale}
                onZoomIn={() => setScale(s => Math.min(s + SCALE_STEP, MAX_SCALE))}
                onZoomOut={() => setScale(s => Math.max(s - SCALE_STEP, MIN_SCALE))}
                canZoomIn={canZoomIn}
                canZoomOut={canZoomOut}
              />
              
              {error && <ErrorMessage message={error} />}

              {isLoading && (
                <div className="text-center text-indigo-300 p-4">
                  <LoadingSpinner />
                  <p className="mt-4">{getLoadingMessage()}</p>
                </div>
              )}
              
              {step === AnalysisStep.AWAITING_ANALYSIS && !isLoading && (
                <div className="text-center bg-indigo-900/50 border border-indigo-800 rounded-lg p-6 w-full max-w-2xl flex flex-col items-center gap-6">
                  
                  {assessmentMode === 'exterior' && (
                    <>
                      <div className="w-full">
                          <h3 className="text-lg font-bold text-white mb-2">Step 1: Frame the Property</h3>
                          <p className="text-indigo-300 text-sm mb-3">Use the buttons below to zoom and center the property in the image.</p>
                          <div className="flex justify-center items-center gap-2">
                              <button onClick={handleZoomOut} disabled={zoomLevel <= MIN_ZOOM || isLoading} className="bg-indigo-800 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors"><ZoomOutIcon /></button>
                              <span className="font-mono bg-indigo-950 text-indigo-200 text-sm font-bold px-4 py-2 rounded-md w-24 text-center">Zoom: {zoomLevel}</span>
                              <button onClick={handleZoomIn} disabled={zoomLevel >= MAX_ZOOM || isLoading} className="bg-indigo-800 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors"><ZoomInIcon /></button>
                          </div>
                      </div>
                      <div className="w-full border-t border-indigo-800 my-2"></div>
                      <div className="w-full">
                          <h3 className="text-lg font-bold text-white mb-2">Step 2: Mark the Target</h3>
                          <p className="text-indigo-300 text-sm">Click on the main building in the image above to set a focus point for the analysis.</p>
                      </div>
                    </>
                  )}

                  {assessmentMode === 'interior' && (
                     <div className="w-full">
                          <h3 className="text-lg font-bold text-white mb-2">Ready to Analyze</h3>
                          <p className="text-indigo-300 text-sm">The uploaded image is ready. Click the button below to begin the analysis.</p>
                      </div>
                  )}

                  <button 
                    onClick={handleStartAnalysis} 
                    disabled={(assessmentMode === 'exterior' && !markerCoords) || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg flex items-center justify-center gap-3 w-full sm:w-auto"
                  >
                    <SparklesIcon className="w-6 h-6"/>
                    Analyze Security
                  </button>
                  {assessmentMode === 'exterior' && !markerCoords && !isLoading && <p className="text-xs text-amber-400 -mt-4">Please place a marker on the image before analyzing.</p> }
                </div>
              )}

              {(step === AnalysisStep.ANALYZING || step === AnalysisStep.COMPLETE) && (
                <SecurityReport 
                  analysis={securityAnalysis}
                />
              )}
              
              {step === AnalysisStep.COMPLETE && (
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleReset}
                    className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg"
                  >
                    Start New Analysis
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingPdf}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-wait text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg flex items-center justify-center gap-3"
                  >
                    {isGeneratingPdf ? <LoadingSpinner /> : <PrinterIcon className="w-6 h-6"/>}
                    <span>{isGeneratingPdf ? 'Generating...' : 'Preview & Export Report'}</span>
                  </button>
                </div>
              )}

              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
                  <DialogHeader className="p-6 border-b">
                    <DialogTitle>Security Assessment Report Preview</DialogTitle>
                    <DialogDescription>
                      Review your generated report before downloading.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden">
                    {pdfBlob && (
                      <iframe
                        src={URL.createObjectURL(pdfBlob)}
                        width="100%"
                        height="100%"
                        className="border-0"
                        title="PDF Preview"
                      />
                    )}
                  </div>
                  <DialogFooter className="p-6 border-t gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        if (pdfBlob) {
                          URL.revokeObjectURL(URL.createObjectURL(pdfBlob));
                        }
                        setPdfBlob(null);
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        if (pdfBlob) {
                          const url = URL.createObjectURL(pdfBlob);
                          const a = document.createElement('a');
                          a.href = url;
                          const reportTitle = assessmentMode === 'exterior' ? location : 'Interior Security Plan';
                          a.download = `${reportTitle.replace(/\s+/g, '_')}_Security_Report.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                        setShowPreview(false);
                        setPdfBlob(null);
                      }}
                    >
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </main>
        
        <footer className="mt-auto pt-8 text-center text-indigo-400 text-sm">
          <p>Powered by proprietary technology. For informational purposes only.</p>
        </footer>
      </div>
    </Layout>
  );
};

export default SatelliteAssessmentPage;