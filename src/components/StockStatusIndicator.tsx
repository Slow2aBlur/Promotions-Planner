'use client';

import React from 'react';

interface StockStatusIndicatorProps {
  stockStatus: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StockStatusIndicator({ stockStatus, size = 'md' }: StockStatusIndicatorProps) {
  const getStatusInfo = (status: string) => {
    const normalizedStatus = status.toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'outofstock':
      case 'out-of-stock':
      case 'oos':
        return {
          label: 'Out of Stock',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '⚠️',
          priority: 'high'
        };
      
      
      case 'instock':
      case 'in-stock':
      case 'available':
        return {
          label: 'In Stock',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✅',
          priority: 'low'
        };
      
      case 'lowstock':
      case 'low-stock':
        return {
          label: 'Low Stock',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: '⚡',
          priority: 'medium'
        };
      
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '❓',
          priority: 'low'
        };
    }
  };

  const statusInfo = getStatusInfo(stockStatus);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  // Only show indicator for non-standard stock statuses (out of stock, etc.)
  if (statusInfo.priority === 'low' && stockStatus.toLowerCase().includes('instock')) {
    return null; // Don't show indicator for normal in-stock items
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} ${sizeClasses[size]}`}
        title={`Stock Status: ${statusInfo.label}`}
      >
        <span className="text-xs">{statusInfo.icon}</span>
        <span>{statusInfo.label}</span>
      </span>
    </div>
  );
}

// Helper function to check if a product needs stock attention
export function needsStockAttention(stockStatus: string): boolean {
  const normalizedStatus = stockStatus.toLowerCase().trim();
  return ['outofstock', 'out-of-stock', 'oos', 'lowstock', 'low-stock'].includes(normalizedStatus);
}

// Helper function to get stock priority for sorting
export function getStockPriority(stockStatus: string): number {
  const normalizedStatus = stockStatus.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'outofstock':
    case 'out-of-stock':
    case 'oos':
      return 3; // Highest priority (most attention needed)
    
    case 'lowstock':
    case 'low-stock':
      return 2; // Medium priority
    
    case 'instock':
    case 'in-stock':
    case 'available':
      return 1; // Low priority (normal)
    
    default:
      return 0; // Unknown status
  }
}
