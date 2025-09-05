'use client';

import React from 'react';
import { MonthlyPlan } from '@/lib/types';
import { formatDisplayDate } from '@/utils/dateUtils';
import EditablePrice from './EditablePrice';
import StockStatusIndicator, { needsStockAttention } from './StockStatusIndicator';

interface MonthlyPromotionTableProps {
  monthlyPlan: MonthlyPlan;
  onReplaceProduct?: (weekIndex: number, dayIndex: number, productIndex: number) => void;
  onPriceChange?: (weekIndex: number, dayIndex: number, productIndex: number, newPrice: number, newGP: number) => void;
}

export default function MonthlyPromotionTable({ monthlyPlan, onReplaceProduct, onPriceChange }: MonthlyPromotionTableProps) {
  
  const handlePriceChange = (weekIndex: number, dayIndex: number, productIndex: number) => (productId: string, newPrice: number, newGP: number) => {
    if (onPriceChange) {
      onPriceChange(weekIndex, dayIndex, productIndex, newPrice, newGP);
    }
  };
  const getMonthName = (monthNum: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNum - 1];
  };

  return (
    <div className="w-full print-break-inside-avoid">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-charcoal border-b border-gray-200">
          <h2 className="text-xl font-semibold text-white">
            Monthly Promotion Plan - {getMonthName(monthlyPlan.month)} {monthlyPlan.year}
          </h2>
          <p className="text-sm text-light-grey mt-1">
            {monthlyPlan.weeks.length} weeks, {monthlyPlan.totalDays} total days
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {monthlyPlan.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="border-b border-gray-200 last:border-b-0 print-break-inside-avoid">
              {/* Week Header */}
              <div className="px-6 py-4 bg-primary">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Week {week.weekNumber}: {formatDisplayDate(week.startDate)} - {formatDisplayDate(week.endDate)}
                  </h3>
                  <div className="mt-2 sm:mt-0 flex flex-wrap gap-2">
                    {week.days[0]?.selectedCategories.map((category, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          category === 'Random'
                            ? 'bg-accent bg-opacity-20 text-white'
                            : 'bg-white bg-opacity-20 text-white'
                        }`}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Days for this week */}
              {week.days.map((day, dayIndex) => (
                <div key={dayIndex} className="border-b border-gray-100 last:border-b-0 print-break-inside-avoid">
                  <div className="px-6 py-3 bg-light-grey">
                    <h4 className="text-md font-semibold text-charcoal">
                      {day.dayName} - {formatDisplayDate(day.date)}
                    </h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-24">
                            Product ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider min-w-[300px]">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32">
                            Brand
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-40">
                            Supplier
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32">
                            Regular Price (ZAR)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-accent uppercase tracking-wider font-bold w-36">
                            5% Sale Price (ZAR)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-24">
                            Views
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32">
                            Stock Status
                          </th>
                          {onReplaceProduct && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-20 print-hidden">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {day.products.map((product, productIndex) => (
                          <tr key={productIndex} className={`hover:bg-pale-teal hover:bg-opacity-10 ${
                            productIndex % 2 === 0 ? 'bg-white' : 'bg-light-grey'
                          }`}>
                            <td className="px-4 py-4 text-sm font-medium text-charcoal">
                              {product.product_id}
                            </td>
                            <td className="px-4 py-4 text-sm text-charcoal">
                              <div className="max-w-[280px] break-words" title={product.product_name}>
                                {product.product_name}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-charcoal">
                              <div className="max-w-[120px] truncate" title={product.brand || 'N/A'}>
                                {product.brand || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-charcoal">
                              <div className="max-w-[150px] truncate" title={product.supplier_name || 'N/A'}>
                                {product.supplier_name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-charcoal">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border border-primary text-primary bg-white">
                                <div className="max-w-[100px] truncate" title={product.category?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') || 'Uncategorized'}>
                                  {product.category?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') || 'Uncategorized'}
                                </div>
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-charcoal">
                              R{Math.round(product.regular_price)}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <EditablePrice 
                                product={product}
                                onPriceChange={handlePriceChange(weekIndex, dayIndex, productIndex)}
                              />
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {product.views.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <StockStatusIndicator stockStatus={product.stock_status} size="sm" />
                              {!needsStockAttention(product.stock_status) && (
                                <span className="text-xs text-gray-500">In Stock</span>
                              )}
                            </td>
                            {onReplaceProduct && (
                              <td className="px-4 py-4 text-sm print-hidden">
                                <button
                                  onClick={() => onReplaceProduct(weekIndex, dayIndex, productIndex)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                                  title="Replace this product with an alternative"
                                >
                                  🔄
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {day.products.length === 0 && (
                    <div className="px-6 py-4 text-center text-gray-500">
                      No products available for this day
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
