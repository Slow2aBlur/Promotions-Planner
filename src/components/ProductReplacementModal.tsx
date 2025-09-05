'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';

interface ProductReplacementModalProps {
  isOpen: boolean;
  productToReplace: Product;
  availableCategories: string[];
  allProducts: Product[];
  usedProductIds: Set<string>;
  onReplace: (newProduct: Product) => void;
  onCancel: () => void;
}

export default function ProductReplacementModal({
  isOpen,
  productToReplace,
  availableCategories,
  allProducts,
  usedProductIds,
  onReplace,
  onCancel
}: ProductReplacementModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'category' | 'search'>('category');

  if (!isOpen) return null;

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
    setSearchMode('category');
    
    if (category === '') {
      setAvailableProducts([]);
      return;
    }

    // Find products in the selected category that aren't already used
    const categoryProducts = allProducts.filter(product => 
      product.category === category &&
      !usedProductIds.has(product.product_id) &&
      product.product_id !== productToReplace.product_id
    );

    // Sort by views (descending)
    categoryProducts.sort((a, b) => b.views - a.views);
    setAvailableProducts(categoryProducts);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setSelectedProduct(null);
    setSearchMode('search');
    
    if (term.trim() === '') {
      setAvailableProducts([]);
      return;
    }

    const searchTermLower = term.toLowerCase();
    const searchResults = allProducts.filter(product => {
      // Search by product ID, name, SKU, supplier_price, sale_price
      const matchesId = product.product_id.toLowerCase().includes(searchTermLower);
      const matchesName = product.product_name.toLowerCase().includes(searchTermLower);
      const matchesSku = (product as any).sku?.toLowerCase().includes(searchTermLower) || false;
      const matchesSupplierPrice = (product as any).supplier_price?.toString().includes(searchTermLower) || false;
      const matchesSalePrice = product.five_percent_sale_price?.toString().includes(searchTermLower) || false;
      
      return (matchesId || matchesName || matchesSku || matchesSupplierPrice || matchesSalePrice) &&
             !usedProductIds.has(product.product_id) &&
             product.product_id !== productToReplace.product_id;
    });

    // Sort by views (descending)
    searchResults.sort((a, b) => b.views - a.views);
    setAvailableProducts(searchResults);
  };

  const handleReplace = () => {
    if (selectedProduct) {
      onReplace(selectedProduct);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-charcoal">
              Replace Product
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Product Info */}
          <div className="bg-light-grey rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-charcoal mb-2">Current Product:</h4>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <span><strong>Name:</strong> {productToReplace.product_name}</span>
              <span><strong>Category:</strong> {productToReplace.category}</span>
              <span><strong>Views:</strong> {productToReplace.views.toLocaleString()}</span>
            </div>
          </div>

          {/* Search Mode Toggle */}
          <div className="mb-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => {
                  setSearchMode('category');
                  setSearchTerm('');
                  setAvailableProducts([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'category' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📁 Browse by Category
              </button>
              <button
                onClick={() => {
                  setSearchMode('search');
                  setSelectedCategory('');
                  setAvailableProducts([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'search' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔍 Search Products
              </button>
            </div>

            {searchMode === 'category' ? (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Choose Replacement Category:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-charcoal"
                >
                  <option value="">Select a category...</option>
                  <option value={productToReplace.category}>
                    🔄 Same Category ({productToReplace.category})
                  </option>
                  <optgroup label="--- Other Categories ---">
                    {availableCategories
                      .filter(cat => cat !== productToReplace.category)
                      .map((category) => (
                        <option key={category} value={category}>
                          📁 {category}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Search by Product ID, Name, SKU, or Price:
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Enter product ID, name, SKU, or price..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-charcoal"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Search by: Product ID, Product Name, SKU, Supplier Price, or Sale Price
                </p>
              </div>
            )}
          </div>

          {/* Product Selection */}
          {availableProducts.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-2">
                Choose Replacement Product:
              </label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {availableProducts.map((product) => (
                  <div
                    key={product.product_id}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-light-grey transition-colors ${
                      selectedProduct?.product_id === product.product_id ? 'bg-primary bg-opacity-10 border-primary' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <h5 className="text-sm font-medium text-charcoal mb-1">
                          {product.product_name}
                        </h5>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          <span>Brand: {product.brand || 'N/A'}</span>
                          <span>SKU: {(product as any).sku || 'N/A'}</span>
                          <span>Views: {product.views.toLocaleString()}</span>
                          <span>Reg Price: R{Math.round(product.regular_price)}</span>
                          {(product as any).supplier_price && <span>Supplier: R{Math.round((product as any).supplier_price)}</span>}
                          {product.five_percent_sale_price && <span>Sale: R{Math.round(product.five_percent_sale_price)}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {selectedProduct?.product_id === product.product_id && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCategory && availableProducts.length === 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700">
                No available products in the "{selectedCategory}" category that aren't already used in your plan.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReplace}
              disabled={!selectedProduct}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-pale-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Replace Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
