'use client';

import React from 'react';
import { DailyCategorySelections } from '@/lib/types';

interface DailyCategorySelectorProps {
  categories: string[];
  dailySelections: DailyCategorySelections;
  onSelectionsChange: (selections: DailyCategorySelections) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function DailyCategorySelector({
  categories,
  dailySelections,
  onSelectionsChange,
  disabled = false
}: DailyCategorySelectorProps) {
  const handleCategoryChange = (dayIndex: number, categoryIndex: number, category: string) => {
    const newSelections = [...dailySelections];
    const dayCategories = [...newSelections[dayIndex]];
    dayCategories[categoryIndex] = category;
    newSelections[dayIndex] = dayCategories as [string, string, string];
    onSelectionsChange(newSelections);
  };

  const handleCopyToAll = (dayIndex: number) => {
    const sourceDay = dailySelections[dayIndex];
    const newSelections = Array(7).fill(null).map(() => [...sourceDay] as [string, string, string]);
    onSelectionsChange(newSelections);
  };

  const handleRandomizeDay = (dayIndex: number) => {
    const availableCategories = ['Random', ...categories];
    const randomSelections: [string, string, string] = [
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)]
    ];
    
    const newSelections = [...dailySelections];
    newSelections[dayIndex] = randomSelections;
    onSelectionsChange(newSelections);
  };

  const handleRandomizeAll = () => {
    const availableCategories = ['Random', ...categories];
    const newSelections: DailyCategorySelections = Array(7).fill(null).map(() => [
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)]
    ] as [string, string, string]);
    onSelectionsChange(newSelections);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-charcoal">Daily Category Selection</h3>
        <button
          onClick={handleRandomizeAll}
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-lg hover:bg-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🎲 Randomize All Days
        </button>
      </div>

      <div className="grid gap-4">
        {DAYS_OF_WEEK.map((dayName, dayIndex) => (
          <div key={dayName} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-charcoal">{dayName}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyToAll(dayIndex)}
                  disabled={disabled}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Copy to All
                </button>
                <button
                  onClick={() => handleRandomizeDay(dayIndex)}
                  disabled={disabled}
                  className="px-3 py-1 text-xs font-medium text-accent bg-accent bg-opacity-10 border border-accent rounded hover:bg-accent hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  🎲 Random
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((categoryIndex) => (
                <div key={categoryIndex}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category {categoryIndex + 1} (3 products)
                  </label>
                  <select
                    value={dailySelections[dayIndex][categoryIndex]}
                    onChange={(e) => handleCategoryChange(dayIndex, categoryIndex, e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="Random">🎲 Random Selection</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Daily Planning</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>• Each day gets 9 products (3 from each selected category)</p>
              <p>• You can select the same category multiple times for variety</p>
              <p>• Use "Copy to All" to apply one day's selection to all days</p>
              <p>• Use "Random" to let the system choose any available product</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
