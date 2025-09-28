import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import ZoomInIcon from './icons/ZoomInIcon';
import ZoomOutIcon from './icons/ZoomOutIcon';
import TargetIcon from './icons/TargetIcon';

interface AerialViewProps {
  imageUrl: string | null;
  markerCoords?: { x: number; y: number } | null;
  onImageClick?: (coords: { x: number; y: number }) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const AerialView = React.forwardRef<HTMLDivElement, AerialViewProps>(({ 
    imageUrl, 
    markerCoords,
    onImageClick,
    scale,
    onZoomIn,
    onZoomOut,
    canZoomIn,
    canZoomOut
 }, ref) => {
  if (!imageUrl) {
    return (
      <div className="w-full aspect-video bg-indigo-900 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-indigo-400">Generating aerial view...</p>
      </div>
    );
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onImageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onImageClick({ x, y });
  };

  return (
    <div ref={ref} className="w-full aspect-video rounded-lg overflow-hidden shadow-2xl border-4 border-indigo-800 relative group bg-indigo-950">
      <div 
        className="w-full h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        onClick={handleImageClick}
      >
        <img src={imageUrl} alt="Satellite view of property" className={`w-full h-full object-cover ${onImageClick ? 'cursor-crosshair' : ''}`} />
        {markerCoords && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${markerCoords.x}%`, top: `${markerCoords.y}%` }}
              aria-hidden="true"
            >
              <div className="w-12 h-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-red-500 -translate-y-1/2"></div>
                <div className="absolute top-0 left-1/2 w-px h-full bg-red-500 -translate-x-1/2"></div>
              </div>
            </div>
        )}
      </div>
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <button 
          onClick={onZoomIn} 
          disabled={!canZoomIn}
          className="bg-indigo-900/80 backdrop-blur-sm hover:bg-indigo-800 text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom in"
        >
          <ZoomInIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={onZoomOut} 
          disabled={!canZoomOut}
          className="bg-indigo-900/80 backdrop-blur-sm hover:bg-indigo-800 text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOutIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
});

export default AerialView;