'use client';

import React from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
}

export default function FileUploader({ onFileSelect, loading = false }: FileUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      onFileSelect(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:border-primary transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-primary"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <div className="flex-grow">
            <h3 className="text-md font-semibold text-charcoal mb-1">
              Upload Product CSV
            </h3>
            <p className="text-xs text-gray-500">
              Select a CSV file containing your product data
            </p>
          </div>
          
          <div className="flex-shrink-0 relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
              className="block text-xs text-gray-500
                file:mr-2 file:py-1 file:px-3
                file:rounded-lg file:border-0
                file:text-xs file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-pale-teal
                disabled:opacity-50 disabled:cursor-not-allowed
                border border-gray-300 rounded-lg p-1"
            />
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-1">
                  <svg className="animate-spin h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-primary font-medium text-xs">Processing...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}