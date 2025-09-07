import React from 'react';
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
  if (!isOpen) return null;

  const handleSave = () => {
    if (!bundleCreation.bundleName.trim()) {
      alert('Please enter a bundle name.');
      return;
    }

    if (bundleCreation.selectedProducts.length === 0) {
      alert('Please select at least one product for the bundle.');
      return;
    }

    if (bundleCreation.bundlePrice <= 0) {
      alert('Please enter a valid bundle price.');
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
      bundlePrice: bundleCreation.bundlePrice,
      bundleMargin: calculateBundleMargin(),
      individualQuantity: 5 // Default quantity
    };

    onSave(bundle);
  };

  const availableProducts = approvedProducts.filter(approved => 
    !bundleCreation.selectedProducts.some(selected => selected.productId === approved.productId)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-charcoal">Create Product Bundle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Product Search/Add Section */}
          <div>
            <h3 className="text-lg font-medium text-charcoal mb-3">Add Products to Bundle</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Product Name or ID
                </label>
                <input
                  type="text"
                  placeholder="Enter product name or ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    if (searchTerm.length >= 2) {
                      // Filter products based on search term
                      const filtered = approvedProducts.filter(approved => 
                        approved.product.product_name.toLowerCase().includes(searchTerm) ||
                        approved.productId.toLowerCase().includes(searchTerm)
                      );
                      // You could set this to state to show filtered results
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Product ID..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const productId = e.currentTarget.value.trim();
                        if (productId) {
                          onAddProductToBundle(productId);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const productId = input.value.trim();
                      if (productId) {
                        onAddProductToBundle(productId);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bundle Configuration */}
          <div>
            <h3 className="text-lg font-medium text-charcoal mb-3">Bundle Configuration</h3>
            
            {/* Bundle Details */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundle Name *
                </label>
                <input
                  type="text"
                  value={bundleCreation.bundleName}
                  onChange={(e) => onUpdateBundleCreation({ bundleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Starter Pack, Value Bundle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={bundleCreation.description}
                  onChange={(e) => onUpdateBundleCreation({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description for the bundle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundle Price (R) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bundleCreation.bundlePrice}
                  onChange={(e) => onUpdateBundleCreation({ bundlePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Selected Products */}
            <div>
              <h4 className="font-medium text-charcoal mb-2">Selected Products</h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {bundleCreation.selectedProducts.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {bundleCreation.selectedProducts.map((item) => (
                      <div key={item.productId} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <h5 className="font-medium text-charcoal">{item.product.product_name}</h5>
                          <p className="text-sm text-gray-600">ID: {item.productId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onUpdateBundleProductQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => onRemoveProductFromBundle(item.productId)}
                            className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No products selected
                  </div>
                )}
              </div>
            </div>

            {/* Bundle Summary - Always visible when products are selected */}
            {bundleCreation.selectedProducts.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h4 className="text-lg font-semibold text-charcoal mb-3">Bundle Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Combined Cost:</span>
                    <p className="text-xl font-bold text-orange-600">
                      R{bundleCreation.selectedProducts.reduce((sum, item) => 
                        sum + (item.product.purchase_cost * item.quantity), 0
                      ).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Combined Selling Price:</span>
                    <p className="text-xl font-bold text-blue-600">
                      R{bundleCreation.bundlePrice.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Margin:</span>
                    <p className={`text-xl font-bold ${calculateBundleMargin() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{calculateBundleMargin().toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Margin %:</span>
                    <p className={`text-xl font-bold ${calculateBundleMargin() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bundleCreation.bundlePrice > 0 ? 
                        ((calculateBundleMargin() / bundleCreation.bundlePrice) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <p>Products in bundle: {bundleCreation.selectedProducts.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={bundleCreation.bundleName.trim() === '' || bundleCreation.selectedProducts.length === 0 || bundleCreation.bundlePrice <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Bundle
          </button>
        </div>
      </div>
    </div>
  );
}
