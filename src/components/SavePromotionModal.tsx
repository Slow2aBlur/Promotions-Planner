'use client';

import React, { useState, useEffect } from 'react';

interface SavePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (saveName: string) => void;
  planningMode: 'daily' | 'weekly' | 'monthly' | 'adHoc';
}

export default function SavePromotionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  planningMode 
}: SavePromotionModalProps) {
  const [saveName, setSaveName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generate default name based on planning mode and current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const modeStr = planningMode.charAt(0).toUpperCase() + planningMode.slice(1);
      setSaveName(`${modeStr}_${dateStr}`);
    }
  }, [isOpen, planningMode]);

  const handleSave = async () => {
    if (!saveName.trim()) {
      alert('Please enter a name for your promotion plan');
      return;
    }

    setIsLoading(true);
    try {
      // Add date suffix to the save name
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const finalSaveName = `${saveName.trim()}_${dateStr}`;
      
      await onSave(finalSaveName);
      onClose();
    } catch (error) {
      console.error('Error saving promotion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Save {planningMode.charAt(0).toUpperCase() + planningMode.slice(1)} Promotion Plan
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter a name for your promotion plan. A date suffix will be added automatically.
          </p>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-4">
            <label htmlFor="saveName" className="block text-sm font-medium text-gray-700 mb-2">
              Plan Name
            </label>
            <input
              id="saveName"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter plan name..."
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Final name will be: <span className="font-mono">{saveName}_YYYY-MM-DD</span>
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !saveName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

