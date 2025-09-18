
export interface CameraPlacement {
  location: string;
  reason: string;
  cameraType: string;
}

export interface CameraSummaryItem {
  cameraType: string;
  quantity: number;
}

export interface SecurityAnalysis {
  overview: string;
  placements: CameraPlacement[];
  cameraSummary: CameraSummaryItem[];
}

export enum AnalysisStep {
  INPUT,
  FETCHING_IMAGE,
  AWAITING_ANALYSIS,
  ANALYZING,
  COMPLETE,
  ERROR
}

export type AssessmentMode = 'exterior' | 'interior';
