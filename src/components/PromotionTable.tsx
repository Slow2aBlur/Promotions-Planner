'use client';

import React from 'react';
import { WeeklyPlan, Product } from '@/lib/types';
import { formatDisplayDate } from '@/utils/dateUtils';
import EditablePrice from './EditablePrice';
import StockStatusIndicator, { needsStockAttention } from './StockStatusIndicator';

interface PromotionTableProps {
  weeklyPlan: WeeklyPlan;
  onReplaceProduct?: (dayIndex: number, productIndex: number) => void;
  onPriceChange?: (dayIndex: number, productIndex: number, newPrice: number, newGP: number) => void;
}

export default function PromotionTable({ weeklyPlan, onReplaceProduct, onPriceChange }: PromotionTableProps) {
  
  const abbreviateDayName = (dayName: string): string => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Mon',
      'Tuesday': 'Tue', 
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    return dayMap[dayName] || dayName;
  };

  const handlePriceChange = (dayIndex: number, productIndex: number) => (productId: string, newPrice: number, newGP: number) => {
    if (onPriceChange) {
      onPriceChange(dayIndex, productIndex, newPrice, newGP);
    }
  };
  return (
    <div className="w-full print-break-inside-avoid">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-charcoal border-b border-gray-200">
          <h2 className="text-xl font-semibold text-white">
            7-Day Promotion Plan
          </h2>
          <p className="text-sm text-light-grey mt-1">
            {formatDisplayDate(weeklyPlan.startDate)} - {formatDisplayDate(weeklyPlan.endDate)}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {weeklyPlan.days.map((day, dayIndex) => (
            <div key={dayIndex} className="border-b border-gray-200 last:border-b-0 print-break-inside-avoid">
              <div className="px-6 py-4 bg-primary">
                <h3 className="text-lg font-bold text-white">
                  {abbreviateDayName(day.dayName)} - {formatDisplayDate(day.date)}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-max divide-y divide-gray-200">
                  <thead className="bg-light-grey">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-24 print-col-id">
                        Product ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider min-w-[300px] print-col-name">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32 print-col-brand">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-40 print-col-supplier">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32 print-col-category">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32 print-col-price">
                        Regular Price (ZAR)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-accent uppercase tracking-wider font-bold w-36 print-col-sale">
                        5% Sale Price (ZAR)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-24 print-col-views">
                        Views
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider w-32 print-col-stock">
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
                            onPriceChange={handlePriceChange(dayIndex, productIndex)}
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
                              onClick={() => onReplaceProduct(dayIndex, productIndex)}
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
      </div>
    </div>
  );
}