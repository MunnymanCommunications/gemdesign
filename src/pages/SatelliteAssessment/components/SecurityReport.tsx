import React from 'react';
import { SecurityAnalysis, CameraPlacement } from '../types';
import CameraIcon from './icons/CameraIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface PlacementCardProps {
  placement: CameraPlacement;
}

const PlacementCard: React.FC<PlacementCardProps> = ({ placement }) => (
  <li 
    className="bg-indigo-900/50 rounded-lg p-6 border border-indigo-800 transition-all duration-300"
  >
    <div className="flex items-center mb-3">
      <div className="bg-blue-600/20 text-blue-400 p-2 rounded-full mr-4 flex-shrink-0">
        <CameraIcon className="w-6 h-6" />
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-lg text-white">{placement.location}</h4>
        <p className="text-sm text-blue-400 font-medium">{placement.cameraType}</p>
      </div>
    </div>
    <p className="text-gray-300">{placement.reason}</p>
  </li>
);

interface SecurityReportProps {
  analysis: SecurityAnalysis | null;
}

const SecurityReport: React.FC<SecurityReportProps> = ({ analysis }) => {
  if (!analysis) {
     return (
        <div className="w-full max-w-4xl bg-indigo-900 rounded-lg p-8 border border-indigo-800 text-center">
            <div className="animate-pulse">
                <div className="h-8 bg-indigo-800 rounded w-3/4 mx-auto mb-6"></div>
                <div className="h-4 bg-indigo-800 rounded w-full mb-4"></div>
                <div className="h-4 bg-indigo-800 rounded w-5/6 mx-auto"></div>
            </div>
            <p className="text-indigo-300 mt-4">Analyzing vulnerabilities and preparing recommendations...</p>
        </div>
     );
  }

  return (
    <div className="w-full max-w-4xl bg-indigo-900/50 backdrop-blur-sm rounded-xl p-8 border border-indigo-800 shadow-2xl">
      <div className="flex items-center mb-6">
        <ShieldCheckIcon className="w-10 h-10 text-green-400 mr-4" />
        <h2 className="text-3xl font-bold text-white">Security Analysis</h2>
      </div>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-200 mb-2">Overview</h3>
        <p className="text-gray-300 leading-relaxed">{analysis.overview}</p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Recommended Placements</h3>
        <ul className="space-y-4">
          {analysis.placements.map((placement, index) => (
            <PlacementCard 
              key={index} 
              placement={placement} 
            />
          ))}
        </ul>
      </div>

      {analysis.cameraSummary && analysis.cameraSummary.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-200 mb-4">Required Equipment Summary</h3>
          <ul className="space-y-3 bg-indigo-900/50 rounded-lg p-6 border border-indigo-800">
            {analysis.cameraSummary.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-gray-300">
                <span className="font-medium text-white">{item.cameraType}</span>
                <span className="font-mono bg-indigo-800 text-indigo-200 text-sm font-bold px-3 py-1 rounded-md">x {item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SecurityReport;