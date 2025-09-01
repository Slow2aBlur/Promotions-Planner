'use client';

import React from 'react';
import { WeeklyCategorySelections } from '@/lib/types';

interface WeeklyCategorySelectorProps {
  categories: string[];
  weeklySelections: WeeklyCategorySelections;
  onSelectionsChange: (selections: WeeklyCategorySelections) => void;
  disabled?: boolean;
  numberOfWeeks?: number;
}

export default function WeeklyCategorySelector({
  categories,
  weeklySelections,
  onSelectionsChange,
  disabled = false,
  numberOfWeeks = 4
}: WeeklyCategorySelectorProps) {
  const handleCategoryChange = (weekIndex: number, categoryIndex: number, category: string) => {
    const newSelections = [...weeklySelections];
    const weekCategories = [...newSelections[weekIndex]];
    weekCategories[categoryIndex] = category;
    newSelections[weekIndex] = weekCategories as [string, string, string];
    onSelectionsChange(newSelections);
  };

  const handleCopyToAll = (weekIndex: number) => {
    const sourceWeek = weeklySelections[weekIndex];
    const newSelections = Array(numberOfWeeks).fill(null).map(() => [...sourceWeek] as [string, string, string]);
    onSelectionsChange(newSelections);
  };

  const handleRandomizeWeek = (weekIndex: number) => {
    const availableCategories = ['Random', ...categories];
    const randomSelections: [string, string, string] = [
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)]
    ];
    
    const newSelections = [...weeklySelections];
    newSelections[weekIndex] = randomSelections;
    onSelectionsChange(newSelections);
  };

  const handleRandomizeAll = () => {
    const availableCategories = ['Random', ...categories];
    const newSelections: WeeklyCategorySelections = Array(numberOfWeeks).fill(null).map(() => [
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)],
      availableCategories[Math.floor(Math.random() * availableCategories.length)]
    ] as [string, string, string]);
    onSelectionsChange(newSelections);
  };

  const getWeekLabel = (weekIndex: number) => {
    const weekNumber = weekIndex + 1;
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
    
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + (weekIndex * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `Week ${weekNumber} (${formatDate(weekStart)} - ${formatDate(weekEnd)})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-charcoal">Weekly Category Selection</h3>
        <button
          onClick={handleRandomizeAll}
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-lg hover:bg-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🎲 Randomize All Weeks
        </button>
      </div>

      <div className="grid gap-4">
        {Array(numberOfWeeks).fill(null).map((_, weekIndex) => (
          <div key={weekIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-charcoal">{getWeekLabel(weekIndex)}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyToAll(weekIndex)}
                  disabled={disabled}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Copy to All
                </button>
                <button
                  onClick={() => handleRandomizeWeek(weekIndex)}
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
                    Category {categoryIndex + 1} (3 products/day)
                  </label>
                  <select
                    value={weeklySelections[weekIndex]?.[categoryIndex] || 'Random'}
                    onChange={(e) => handleCategoryChange(weekIndex, categoryIndex, e.target.value)}
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

            <div className="mt-3 text-sm text-gray-500">
              Each day this week will get 3 products from each selected category (9 products total per day)
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Monthly Planning</h3>
            <div className="mt-1 text-sm text-green-700">
              <p>• Set categories for each week of the month</p>
              <p>• Each day in a week uses the same 3 category selections</p>
              <p>• Each day gets 9 products total (3 from each category)</p>
              <p>• Products will be different each day, but from the same categories</p>
              <p>• Use "Copy to All" to apply one week's selection to all weeks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
