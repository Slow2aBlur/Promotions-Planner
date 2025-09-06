'use client';

import React, { useState } from 'react';

interface AlternativeCategory {
  category: string;
  count: number;
}

interface CategoryAlternativeModalProps {
  isOpen: boolean;
  emptyCategories: string[];
  insufficientCategories?: string[];
  availableByCategory?: Record<string, number>;
  alternatives: AlternativeCategory[];
  onConfirm: (replacements: Record<string, string>) => void;
  onCancel: () => void;
}

export default function CategoryAlternativeModal({
  isOpen,
  emptyCategories,
  insufficientCategories = [],
  availableByCategory = {},
  alternatives,
  onConfirm,
  onCancel
}: CategoryAlternativeModalProps) {
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const handleReplacement = (emptyCategory: string, replacement: string) => {
    setReplacements(prev => ({
      ...prev,
      [emptyCategory]: replacement
    }));
  };

  const handleConfirm = () => {
    // Check if all problematic categories have replacements
    const allProblematicCategories = [...emptyCategories, ...insufficientCategories];
    const allReplaced = allProblematicCategories.every(category => replacements[category]);
    if (allReplaced) {
      onConfirm(replacements);
      setReplacements({});
    }
  };

  const handleCancel = () => {
    setReplacements({});
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-charcoal">
            ⚠️ Categories Have No Available Products
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Some selected categories don&apos;t have any products that meet the criteria (published, R199+). 
            Please choose alternative categories.
          </p>
        </div>

        <div className="px-6 py-4">
          {/* Handle empty categories */}
          {emptyCategories.map((emptyCategory) => (
            <div key={emptyCategory} className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="mb-3">
                <h3 className="font-medium text-red-700">
                  &quot;{emptyCategory}&quot; has no available products
                </h3>
                <p className="text-sm text-red-600">
                  Choose an alternative category below:
                </p>
              </div>

              <div className="space-y-2">
                {alternatives.slice(0, 8).map((alt) => (
                  <label
                    key={`${emptyCategory}-${alt.category}`}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      replacements[emptyCategory] === alt.category
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`replacement-${emptyCategory}`}
                      value={alt.category}
                      checked={replacements[emptyCategory] === alt.category}
                      onChange={() => handleReplacement(emptyCategory, alt.category)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-charcoal">
                          {alt.category}
                        </span>
                        <span className="text-sm text-gray-500">
                          {alt.count} products
                        </span>
                      </div>
                    </div>
                  </label>
                ))}

                {/* Random option */}
                <label
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    replacements[emptyCategory] === 'Random'
                      ? 'border-accent bg-accent bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`replacement-${emptyCategory}`}
                    value="Random"
                    checked={replacements[emptyCategory] === 'Random'}
                    onChange={() => handleReplacement(emptyCategory, 'Random')}
                    className="text-accent focus:ring-accent"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-charcoal">
                        🎲 Random Selection
                      </span>
                      <span className="text-sm text-gray-500">
                        Any available products
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ))}

          {/* Handle insufficient categories */}
          {insufficientCategories.map((insufficientCategory) => (
            <div key={insufficientCategory} className="mb-6 p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="mb-3">
                <h3 className="font-medium text-orange-700">
                  &quot;{insufficientCategory}&quot; has insufficient products
                </h3>
                <p className="text-sm text-orange-600">
                  Available: {availableByCategory[insufficientCategory] || 0} products, but you need more for multiple selections. Choose an alternative:
                </p>
              </div>

              <div className="space-y-2">
                {alternatives.slice(0, 8).map((alt) => (
                  <label
                    key={`${insufficientCategory}-${alt.category}`}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      replacements[insufficientCategory] === alt.category
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`replacement-${insufficientCategory}`}
                      value={alt.category}
                      checked={replacements[insufficientCategory] === alt.category}
                      onChange={() => handleReplacement(insufficientCategory, alt.category)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-charcoal">
                          {alt.category}
                        </span>
                        <span className="text-sm text-gray-500">
                          {alt.count} products
                        </span>
                      </div>
                    </div>
                  </label>
                ))}

                {/* Random option */}
                <label
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    replacements[insufficientCategory] === 'Random'
                      ? 'border-accent bg-accent bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`replacement-${insufficientCategory}`}
                    value="Random"
                    checked={replacements[insufficientCategory] === 'Random'}
                    onChange={() => handleReplacement(insufficientCategory, 'Random')}
                    className="text-accent focus:ring-accent"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-charcoal">
                        🎲 Random Selection
                      </span>
                      <span className="text-sm text-gray-500">
                        Any available products
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={![...emptyCategories, ...insufficientCategories].every(category => replacements[category])}
              className="px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-pale-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue with Alternatives
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
