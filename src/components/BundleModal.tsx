import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Product, Bundle, BundleProduct } from '@/lib/types';

interface BundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bundle: Omit<Bundle, 'id' | 'createdAt'>) => void;
  approvedProducts: Array<{
    id: string;
    productId: string;
    product: Product;
    targetPrice: number;
    targetMargin: number;
    quantity: number;
    approvedAt: Date;
  }>;
  bundleCreation: {
    bundleName: string;
    description: string;
    selectedProducts: Array<{
      productId: string;
      product: Product;
      quantity: number;
      targetPrice: number;
    }>;
    bundlePrice: number;
  };
  onUpdateBundleCreation: (updates: Partial<{
    bundleName: string;
    description: string;
    selectedProducts: Array<{
      productId: string;
      product: Product;
      quantity: number;
      targetPrice: number;
    }>;
    bundlePrice: number;
  }>) => void;
  onAddProductToBundle: (productId: string) => void;
  onRemoveProductFromBundle: (productId: string) => void;
  onUpdateBundleProductQuantity: (productId: string, quantity: number) => void;
  calculateBundleMargin: () => number;
}

export default function BundleModal({
  isOpen,
  onClose,
  onSave,
  approvedProducts,
  bundleCreation,
  onUpdateBundleCreation,
  onAddProductToBundle,
  onRemoveProductFromBundle,
  onUpdateBundleProductQuantity,
  calculateBundleMargin
}: BundleModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [bundlePriceInput, setBundlePriceInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize bundle price input when modal opens
  useEffect(() => {
    if (isOpen) {
      setBundlePriceInput(bundleCreation.bundlePrice.toString());
    }
  }, [isOpen, bundleCreation.bundlePrice]);

  // Parse currency string to number
  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[R,\s]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format number to currency string
  const formatCurrency = (value: number): string => {
    return `R${Math.round(value).toLocaleString()}`;
  };

  // Debounced bundle price update
  const debouncedUpdateBundlePrice = useCallback((value: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const numericValue = parseCurrency(value);
      onUpdateBundleCreation({ bundlePrice: numericValue });
    }, 200);
  }, [onUpdateBundleCreation]);

  // Handle bundle price input change
  const handleBundlePriceChange = (value: string) => {
    setBundlePriceInput(value);
    debouncedUpdateBundlePrice(value);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (bundleCreation.selectedProducts.length < 2) {
      setToastMessage('Bundle must have at least 2 products');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    if (bundleCreation.selectedProducts.length > 5) {
      setToastMessage('Bundle cannot have more than 5 products');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const bundleSellingPrice = bundleCreation.bundlePrice || accumulatedSellingPrice;
    if (bundleSellingPrice <= 0) {
      setToastMessage('Bundle selling price must be greater than 0');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const bundle: Omit<Bundle, 'id' | 'createdAt'> = {
      bundleName: bundleCreation.bundleName,
      description: bundleCreation.description,
      products: bundleCreation.selectedProducts.map(item => ({
        productId: item.productId,
        product: item.product,
        quantity: item.quantity
      })),
      bundlePrice: bundleSellingPrice,
      bundleMargin: grossProfit,
      individualQuantity: 1
    };

    onSave(bundle);
  };

  const handleAddProducts = async (input: string) => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setErrors([]);
    setToastMessage('');
    
    const productIds = input.split(',').map(id => id.trim()).filter(id => id);
    
    if (productIds.length === 0) {
      setErrors(['Please enter at least one Product ID']);
      setIsLoading(false);
      return;
    }

    // Check if adding these would exceed the limit
    if (bundleCreation.selectedProducts.length + productIds.length > 5) {
      setToastMessage(`Max 5 items per bundle. Currently have ${bundleCreation.selectedProducts.length}`);
      setTimeout(() => setToastMessage(''), 3000);
      setIsLoading(false);
      return;
    }

    let addedCount = 0;
    const errors: string[] = [];

    for (const productId of productIds) {
      // Check if product already exists
      const existingProduct = bundleCreation.selectedProducts.find(p => p.productId.toLowerCase() === productId.toLowerCase());
      if (existingProduct) {
        // Increase quantity instead of adding duplicate
        onUpdateBundleProductQuantity(productId, existingProduct.quantity + 1);
        addedCount++;
        continue;
      }

      // Find product in approved products
      const approvedProduct = approvedProducts.find(p => p.productId.toLowerCase() === productId.toLowerCase());
      if (!approvedProduct) {
        errors.push(productId);
        continue;
      }

      // Add product to bundle
      onAddProductToBundle(productId);
      addedCount++;
    }

    if (errors.length > 0) {
      setErrors(errors);
    }

    if (addedCount > 0) {
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddProducts(inputValue);
    }
  };

  const handleAddClick = () => {
    handleAddProducts(inputValue);
  };

  // Calculate accumulated costs with proper quantity-aware maths
  const accumulatedCost = useMemo(() => {
    return bundleCreation.selectedProducts.reduce((sum, item) => {
      const cost = item.product.purchase_cost || 0;
      const quantity = item.quantity || 0;
      return sum + (cost * quantity);
    }, 0);
  }, [bundleCreation.selectedProducts]);

  const accumulatedSellingPrice = useMemo(() => {
    return bundleCreation.selectedProducts.reduce((sum, item) => {
      const promoPrice = item.targetPrice || 0;
      const quantity = item.quantity || 0;
      return sum + (promoPrice * quantity);
    }, 0);
  }, [bundleCreation.selectedProducts]);

  const bundleSellingPrice = useMemo(() => {
    return bundleCreation.bundlePrice > 0 ? bundleCreation.bundlePrice : accumulatedSellingPrice;
  }, [bundleCreation.bundlePrice, accumulatedSellingPrice]);

  const grossProfit = useMemo(() => {
    return bundleSellingPrice - accumulatedCost;
  }, [bundleSellingPrice, accumulatedCost]);

  const marginPercent = useMemo(() => {
    return bundleSellingPrice > 0 ? (grossProfit / bundleSellingPrice) * 100 : 0;
  }, [grossProfit, bundleSellingPrice]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-charcoal">Create Product Bundle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Product ID Input */}
        <div className="p-6 border-b">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Product ID (comma-separated): 33102,51473,52871"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              {errors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <p>Products not found: {errors.join(', ')}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleAddClick}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                'Add'
              )}
            </button>
          </div>
        </div>

        {/* Top Summary Bar - Always Visible */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <span className="text-sm font-medium text-gray-600">Accumulated Cost (R)</span>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(accumulatedCost)}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Accumulated Selling Price (R)</span>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(accumulatedSellingPrice)}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Bundle Selling Price (R)</span>
              <input
                type="text"
                value={bundlePriceInput}
                onChange={(e) => handleBundlePriceChange(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">GP (R)</span>
              <p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-600">Margin %</span>
                <p className={`text-lg font-bold ${marginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginPercent.toFixed(1)}%
                </p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Selected ({bundleCreation.selectedProducts.length}/5)
              </span>
            </div>
          </div>
        </div>

        {/* Selected Products Table */}
        <div className="flex-1 overflow-hidden">
          {bundleCreation.selectedProducts.length > 0 ? (
            <div className="h-full overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Product ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Product Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Brand</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Supplier</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Cost (R)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Promo Price (R)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">GP R</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Margin %</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bundleCreation.selectedProducts.map((item, index) => {
                    const cost = item.product.purchase_cost || 0;
                    const promoPrice = item.targetPrice || 0;
                    const quantity = item.quantity || 0;
                    
                    // Row calculations (quantity-aware)
                    const rowTotalCost = cost * quantity;
                    const rowTotalSelling = promoPrice * quantity;
                    const rowGP = rowTotalSelling - rowTotalCost;
                    const rowMarginPercent = rowTotalSelling > 0 ? (rowGP / rowTotalSelling) * 100 : 0;

                    return (
                      <tr key={item.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.productId}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={item.product.product_name}>
                          {item.product.product_name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.product.brand}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.product.category}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.product.supplier_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onUpdateBundleProductQuantity(item.productId, parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.stopPropagation();
                              }
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(cost)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(promoPrice)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(rowGP)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{rowMarginPercent.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <button
                            onClick={() => onRemoveProductFromBundle(item.productId)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">No products selected</p>
                <p className="text-sm">Add products using the Product ID input above</p>
              </div>
            </div>
          )}
        </div>

        {/* Toast Message */}
        {toastMessage && (
          <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {toastMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={bundleCreation.selectedProducts.length < 2 || bundleCreation.selectedProducts.length > 5 || bundleSellingPrice <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Bundle
          </button>
        </div>
      </div>
    </div>
  );
}
