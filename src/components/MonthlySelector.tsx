'use client';

import React, { useState, useEffect } from 'react';
import { getMonthlyWeeks, getCurrentMonthYear, formatDisplayDate } from '@/utils/dateUtils';

interface MonthlySelectorProps {
  categories: string[];
  onSelectionsChange: (selections: Array<[string, string, string]>) => void;
}

export default function MonthlySelector({ categories, onSelectionsChange }: MonthlySelectorProps) {
  const { month, year } = getCurrentMonthYear();
  const monthlyWeeks = getMonthlyWeeks(year, month);
  
  // Initialize with default selections for each week
  const [weeklySelections, setWeeklySelections] = useState<Array<[string, string, string]>>(
    monthlyWeeks.map(() => ['Random', 'Random', 'Random'])
  );

  // Make all categories available for selection
  const availableCategories = categories;

  // Notify parent when selections change
  useEffect(() => {
    onSelectionsChange(weeklySelections);
  }, [weeklySelections, onSelectionsChange]);

  const handleSelectionChange = (weekIndex: number, categoryIndex: 0 | 1 | 2, value: string) => {
    const newSelections = [...weeklySelections];
    newSelections[weekIndex][categoryIndex] = value;
    setWeeklySelections(newSelections);
  };

  const getMonthName = (monthNum: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h3 className="text-lg font-semibold text-charcoal mb-4">
        Monthly Category Selection - {getMonthName(month)} {year}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Select three categories for each week of the month. Each day will feature 3 products from each selected category (9 products total per day).
        <br />
        <span className="text-xs text-primary font-medium">💡 Tip: All {categories.length} categories are available in alphabetical order for each week - scroll through dropdowns to find specific categories!</span>
      </p>
      <div className="mb-6 p-3 bg-primary bg-opacity-10 rounded-lg">
        <p className="text-sm text-primary font-medium">
          Found {categories.length} categories available for selection across all weeks (alphabetically sorted).
        </p>
      </div>
      
      <div className="space-y-6">
        {monthlyWeeks.map((week, weekIndex) => (
          <div key={weekIndex} className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-charcoal mb-3">
              Week {week.weekNumber}: {formatDisplayDate(week.startDate)} - {formatDisplayDate(week.endDate)}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weeklySelections[weekIndex].map((selection, categoryIndex) => (
                <div key={categoryIndex} className="space-y-2">
                  <label className="block text-sm font-medium text-charcoal">
                    Category {categoryIndex + 1}
                  </label>
                  <select
                    value={selection}
                    onChange={(e) => handleSelectionChange(weekIndex, categoryIndex as 0 | 1 | 2, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-charcoal text-sm max-h-40 overflow-y-auto"
                    size={1}
                  >
                    <option value="Random">🎲 Random Selection</option>
                    <optgroup label="--- All Categories ---">
                      {availableCategories.map((category) => (
                        <option key={category} value={category} className="py-1">
                          📁 {category || 'Uncategorized'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ))}
            </div>
            
            {/* Current selections for this week */}
            <div className="mt-4 p-3 bg-light-grey rounded-lg">
              <h5 className="text-xs font-semibold text-charcoal mb-2">Week {week.weekNumber} Selection:</h5>
              <div className="flex flex-wrap gap-2">
                {weeklySelections[weekIndex].map((selection, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selection === 'Random'
                        ? 'bg-accent bg-opacity-10 text-accent'
                        : 'bg-primary bg-opacity-10 text-primary'
                    }`}
                  >
                    {index + 1}: {selection}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
