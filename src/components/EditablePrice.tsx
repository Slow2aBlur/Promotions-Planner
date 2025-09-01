'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { calculateGPPercentage } from '@/lib/dataProcessor';

interface EditablePriceProps {
  product: Product;
  onPriceChange: (productId: string, newPrice: number, newGP: number) => void;
}

export default function EditablePrice({ product, onPriceChange }: EditablePriceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState<string>('');
  
  // Determine which price to display (custom or default)
  const displayPrice = product.custom_sale_price || product.five_percent_sale_price || 0;
  const displayGP = product.custom_gp_percentage !== undefined 
    ? product.custom_gp_percentage 
    : calculateGPPercentage(displayPrice, product.purchase_cost);

  useEffect(() => {
    if (isEditing) {
      setEditPrice(Math.round(displayPrice).toString());
    }
  }, [isEditing, displayPrice]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSavePrice = () => {
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      // Reset to original if invalid
      setEditPrice(Math.round(displayPrice).toString());
      setIsEditing(false);
      return;
    }

    const newGP = calculateGPPercentage(newPrice, product.purchase_cost);
    onPriceChange(product.product_id, newPrice, newGP);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditPrice(Math.round(displayPrice).toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePrice();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const savings = product.regular_price - displayPrice;

  return (
    <div className="flex flex-col">
      {!isEditing ? (
        // Display mode
        <div 
          onClick={handleStartEdit}
          className="cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
          title="Click to edit price"
        >
          <span className="font-bold text-accent text-base">
            R{Math.round(displayPrice)}
          </span>
          {savings > 0 && (
            <span className="text-xs text-success font-medium block">
              Save R{Math.round(savings)}
            </span>
          )}
          <span className={`text-xs font-medium block ${
            displayGP >= 20 ? 'text-success' : displayGP >= 10 ? 'text-orange-600' : 'text-danger'
          }`}>
            GP: {displayGP.toFixed(1)}%
          </span>
          {product.custom_sale_price && (
            <span className="text-xs text-primary block">✏️ Custom</span>
          )}
        </div>
      ) : (
        // Edit mode
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">R</span>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSavePrice}
              className="w-20 px-1 py-0.5 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              min="0"
              step="1"
            />
          </div>
          
          {/* Real-time GP% preview */}
          {editPrice && !isNaN(parseFloat(editPrice)) && (
            <span className={`text-xs font-medium ${
              calculateGPPercentage(parseFloat(editPrice), product.purchase_cost) >= 20 
                ? 'text-success' 
                : calculateGPPercentage(parseFloat(editPrice), product.purchase_cost) >= 10 
                ? 'text-orange-600' 
                : 'text-danger'
            }`}>
              GP: {calculateGPPercentage(parseFloat(editPrice), product.purchase_cost).toFixed(1)}%
            </span>
          )}
          
          <div className="flex gap-1">
            <button
              onClick={handleSavePrice}
              className="text-xs px-1 py-0.5 bg-success text-white rounded hover:bg-green-600"
              title="Save (Enter)"
            >
              ✓
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-xs px-1 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500"
              title="Cancel (Esc)"
            >
              ✗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
