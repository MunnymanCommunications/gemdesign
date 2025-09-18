import React, { useState, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  onImageUpload: (base64: string, file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageUpload, isLoading }) => {
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image (PNG, JPG, etc.).');
      return;
    }
    
    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
        setError('File is too large. Please upload an image under 10MB.');
        return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        onImageUpload(e.target.result, file);
      } else {
        setError('Could not read the file.');
      }
    };
    reader.onerror = () => {
      setError('Error reading the file.');
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl text-center">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
          ${isDragging ? 'border-blue-500 bg-indigo-900' : 'border-indigo-700 bg-indigo-950/50 hover:border-blue-600 hover:bg-indigo-900'}
          ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-disabled={isLoading}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg"
          onChange={onFileChange}
          disabled={isLoading}
        />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <LoadingSpinner className="w-12 h-12 text-blue-400" />
            <p className="mt-4 text-indigo-300">Processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 mb-3 text-indigo-400" />
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">Floor plan, blueprint, or aerial view (PNG, JPG)</p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default FileUpload;