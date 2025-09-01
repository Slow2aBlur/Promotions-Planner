'use client';

import React, { useState, useEffect } from 'react';

interface CategorySelectorProps {
  categories: string[];
  onSelectionsChange: (selections: [string, string, string]) => void;
}

export default function CategorySelector({ categories, onSelectionsChange }: CategorySelectorProps) {
  const [selections, setSelections] = useState<[string, string, string]>(['Random', 'Random', 'Random']);
  
  // Make all categories available for selection
  const availableCategories = categories;

  // Notify parent when selections change
  useEffect(() => {
    onSelectionsChange(selections);
  }, [selections, onSelectionsChange]);

  const handleSelectionChange = (index: 0 | 1 | 2, value: string) => {
    const newSelections: [string, string, string] = [...selections];
    newSelections[index] = value;
    setSelections(newSelections);
  };

  const selectorLabels = ['First Category', 'Second Category', 'Third Category'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h3 className="text-lg font-semibold text-charcoal mb-4">
        Category Selection
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Choose three categories for your promotion plan. Each day will feature 3 products from each selected category (9 products total per day).
        <br />
        <span className="text-xs text-primary font-medium">💡 Tip: All {categories.length} categories are available in alphabetical order - scroll through the dropdown to find specific categories!</span>
      </p>
      <div className="mb-6 p-3 bg-primary bg-opacity-10 rounded-lg">
        <p className="text-sm text-primary font-medium">
          Found {categories.length} categories available for selection (alphabetically sorted). First few: {availableCategories.slice(0, 3).join(', ')}{availableCategories.length > 3 ? '...' : ''}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {selections.map((selection, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-charcoal">
              {selectorLabels[index]}
            </label>
            <select
              value={selection}
              onChange={(e) => handleSelectionChange(index as 0 | 1 | 2, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-charcoal text-sm max-h-40 overflow-y-auto"
              size={1}
            >
              <option value="Random">🎲 Random Selection</option>
              <optgroup label="--- All Categories ---">
                {availableCategories.length === 0 ? (
                  <option disabled>No categories found</option>
                ) : (
                  availableCategories.map((category) => (
                    <option key={category} value={category} className="py-1">
                      📁 {category || 'Uncategorized'}
                    </option>
                  ))
                )}
              </optgroup>
            </select>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-light-grey rounded-lg">
        <h4 className="text-sm font-semibold text-charcoal mb-2">Current Selection:</h4>
        <div className="flex flex-wrap gap-2">
          {selections.map((selection, index) => (
            <span
              key={index}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                selection === 'Random'
                  ? 'bg-white border-accent text-accent'
                  : 'bg-white border-primary text-primary'
              }`}
            >
              {index + 1}: {selection}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
