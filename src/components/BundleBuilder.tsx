'use client';

import React, { useMemo, useState } from 'react';
import { Product, BuilderBundle, BuilderBundleItem, BuilderPricingMode } from '@/lib/types';

interface BundleBuilderProps {
  products: Product[];
  onSaveBundles: (bundles: BuilderBundle[]) => void;
}

const formatCurrency = (v: number) => `R${Math.round(v).toLocaleString('en-ZA')}`;
const formatPercentage = (v: number) => `${v.toFixed(1)}%`;

const BundleBuilder: React.FC<BundleBuilderProps> = ({ products, onSaveBundles }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bundleCount, setBundleCount] = useState<number>(1);
  const [itemsPerBundle, setItemsPerBundle] = useState<number>(3);

  const [bundles, setBundles] = useState<BuilderBundle[]>([]);
  
  const startWizard = () => {
    const initial: BuilderBundle[] = Array.from({ length: Math.max(1, bundleCount) }).map((_, idx) => ({
      id: `builder_${Date.now()}_${idx}`,
      name: `Bundle ${idx + 1}`,
      items: Array.from({ length: Math.min(10, Math.max(2, itemsPerBundle)) }).map(() => ({
        productId: '',
        product: {
          product_id: '', product_name: '', supplier_name: '', brand: '', regular_price: 0, sale_price: 0, purchase_cost: 0, category: '', views: 0, stock_status: ''
        },
        qty: 1,
        proposedPrice: undefined
      } as BuilderBundleItem)),
      pricingMode: 'Manual',
      bundlePrice: 0,
      createdAt: new Date()
    }));
    setBundles(initial);
    setStep(3);
  };

  const handleProductSearch = (bIndex: number, iIndex: number, value: string) => {
    setBundles(prev => prev.map((b, bi) => {
      if (bi !== bIndex) return b;
      const found = products.find(p => 
        p.product_id === value || 
        p.product_name.toLowerCase().includes(value.toLowerCase())
      );
      if (!found) return b;
      const items = b.items.map((it, ii) => 
        ii === iIndex 
          ? { ...it, productId: found.product_id, product: found, proposedPrice: undefined }
          : it
      );
      return { ...b, items };
    }));
  };

  const handleQtyChange = (bIndex: number, iIndex: number, qty: number) => {
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex 
        ? { ...b, items: b.items.map((it, ii) => 
            ii === iIndex ? { ...it, qty: Math.max(1, qty) } : it
          )}
        : b
    ));
  };

  const handleProposedPriceChange = (bIndex: number, iIndex: number, price: number) => {
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex 
        ? { ...b, items: b.items.map((it, ii) => 
            ii === iIndex ? { ...it, proposedPrice: Math.max(0, price) } : it
          )}
        : b
    ));
  };

  const handleBundleNameChange = (bIndex: number, name: string) => 
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex ? { ...b, name } : b
    ));

  const handlePricingModeChange = (bIndex: number, mode: BuilderPricingMode) => 
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex ? { ...b, pricingMode: mode } : b
    ));

  const handleDiscountChange = (bIndex: number, pct: number) => 
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex ? { ...b, discountPct: pct } : b
    ));

  const handleManualPriceChange = (bIndex: number, price: number) => 
    setBundles(prev => prev.map((b, bi) => 
      bi === bIndex ? { ...b, bundlePrice: Math.max(0, price) } : b
    ));

  // Calculate totals and margins for each bundle
  const bundleCalculations = useMemo(() => bundles.map(b => {
    const totalCost = b.items.reduce((sum, item) => 
      sum + (item.product.purchase_cost || 0) * item.qty, 0
    );
    
    const totalRegularPrice = b.items.reduce((sum, item) => 
      sum + (item.product.regular_price || 0) * item.qty, 0
    );
    
    const totalCurrentSellPrice = b.items.reduce((sum, item) => 
      sum + (item.product.sale_price || item.product.regular_price || 0) * item.qty, 0
    );
    
    const totalProposedPrice = b.items.reduce((sum, item) => 
      sum + (item.proposedPrice || 0) * item.qty, 0
    );

    // Calculate bundle price based on pricing mode
    let bundlePrice = b.bundlePrice;
    if (b.pricingMode === 'Sum') bundlePrice = totalRegularPrice;
    if (b.pricingMode === 'Discount') bundlePrice = totalRegularPrice * (1 - (b.discountPct || 0) / 100);
    if (b.pricingMode === 'Manual') bundlePrice = b.bundlePrice;

    const currentGPMargin = totalCurrentSellPrice > 0 ? ((totalCurrentSellPrice - totalCost) / totalCurrentSellPrice) * 100 : 0;
    const proposedGPMargin = totalProposedPrice > 0 ? ((totalProposedPrice - totalCost) / totalProposedPrice) * 100 : 0;
    const bundleGPMargin = bundlePrice > 0 ? ((bundlePrice - totalCost) / bundlePrice) * 100 : 0;

    return {
      totalCost,
      totalRegularPrice,
      totalCurrentSellPrice,
      totalProposedPrice,
      bundlePrice,
      currentGPMargin,
      proposedGPMargin,
      bundleGPMargin
    };
  }), [bundles]);

  // Calculate individual item margins
  const itemCalculations = useMemo(() => bundles.map(b => 
    b.items.map(item => {
      const cost = (item.product.purchase_cost || 0) * item.qty;
      const regularPrice = (item.product.regular_price || 0) * item.qty;
      const currentSellPrice = (item.product.sale_price || item.product.regular_price || 0) * item.qty;
      const proposedPrice = (item.proposedPrice || 0) * item.qty;
      
      const currentGPMargin = currentSellPrice > 0 ? ((currentSellPrice - cost) / currentSellPrice) * 100 : 0;
      const proposedGPMargin = proposedPrice > 0 ? ((proposedPrice - cost) / proposedPrice) * 100 : 0;

      return {
        cost,
        regularPrice,
        currentSellPrice,
        proposedPrice,
        currentGPMargin,
        proposedGPMargin
      };
    })
  ), [bundles]);

  const save = () => {
    const withPrices = bundles.map((b, i) => ({
      ...b,
      name: b.name || `Bundle ${i + 1}`,
      bundlePrice: bundleCalculations[i].bundlePrice
    }));
    onSaveBundles(withPrices);
  };

  return (
    <div className="p-4">
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How many bundles do you want to create?</h3>
          <input 
            type="number" 
            className="border px-2 py-1 rounded w-28" 
            min={1} 
            value={bundleCount} 
            onChange={e => setBundleCount(Number(e.target.value) || 1)} 
          />
          <div>
            <button 
              onClick={() => setStep(2)} 
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How many products per bundle?</h3>
          <input 
            type="number" 
            className="border px-2 py-1 rounded w-28" 
            min={2} 
            max={10} 
            value={itemsPerBundle} 
            onChange={e => setItemsPerBundle(Math.min(10, Math.max(2, Number(e.target.value) || 2)))} 
          />
          <div className="space-x-2">
            <button 
              onClick={() => setStep(1)} 
              className="px-3 py-2 bg-gray-200 rounded"
            >
              Back
            </button>
            <button 
              onClick={startWizard} 
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Create Bundles
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {bundles.map((bundle, bi) => (
            <div key={bundle.id} className="border rounded p-4 space-y-4">
              {/* Bundle Header */}
              <div className="flex items-center gap-3">
                <input 
                  value={bundle.name} 
                  onChange={e => handleBundleNameChange(bi, e.target.value)} 
                  className="border px-2 py-1 rounded w-64" 
                  placeholder="Enter bundle name"
                />
                <select 
                  value={bundle.pricingMode} 
                  onChange={e => handlePricingModeChange(bi, e.target.value as BuilderPricingMode)} 
                  className="border px-2 py-1 rounded"
                >
                  <option value="Manual">Manual Pricing</option>
                  <option value="Sum">Sum of Regular Prices</option>
                  <option value="Discount">Apply Discount</option>
                </select>
                {bundle.pricingMode === 'Discount' && (
                  <input 
                    type="number" 
                    placeholder="Discount %" 
                    className="border px-2 py-1 rounded w-28" 
                    value={bundle.discountPct || ''} 
                    onChange={e => handleDiscountChange(bi, Number(e.target.value) || 0)} 
                  />
                )}
                {bundle.pricingMode === 'Manual' && (
                  <input 
                    type="number" 
                    placeholder="Bundle Price" 
                    className="border px-2 py-1 rounded w-36" 
                    value={bundle.bundlePrice || ''} 
                    onChange={e => handleManualPriceChange(bi, Number(e.target.value) || 0)} 
                  />
                )}
              </div>

              {/* Totals Section */}
              <div className="bg-gray-50 p-3 rounded border">
                <h4 className="font-semibold mb-2">Bundle Totals</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Cost:</span>
                    <div className="font-semibold">{formatCurrency(bundleCalculations[bi]?.totalCost || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Regular Price:</span>
                    <div className="font-semibold">{formatCurrency(bundleCalculations[bi]?.totalRegularPrice || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Sell Price:</span>
                    <div className="font-semibold">{formatCurrency(bundleCalculations[bi]?.totalCurrentSellPrice || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Proposed Bundle Price:</span>
                    <div className="font-semibold text-blue-600">{formatCurrency(bundleCalculations[bi]?.totalProposedPrice || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Current GP Margin:</span>
                    <div className="font-semibold">{formatPercentage(bundleCalculations[bi]?.currentGPMargin || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Proposed GP Margin:</span>
                    <div className="font-semibold text-blue-600">{formatPercentage(bundleCalculations[bi]?.proposedGPMargin || 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Bundle GP Margin:</span>
                    <div className="font-semibold text-green-600">{formatPercentage(bundleCalculations[bi]?.bundleGPMargin || 0)}</div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1 text-left">Product</th>
                    <th className="border px-2 py-1 text-right">Qty</th>
                    <th className="border px-2 py-1 text-right">Current Cost</th>
                    <th className="border px-2 py-1 text-right">Current Regular Price</th>
                    <th className="border px-2 py-1 text-right">Current Sell Price</th>
                    <th className="border px-2 py-1 text-right">Current GP%</th>
                    <th className="border px-2 py-1 text-right">Proposed Price</th>
                    <th className="border px-2 py-1 text-right">Proposed GP%</th>
                    <th className="border px-2 py-1">Brand</th>
                    <th className="border px-2 py-1">Supplier</th>
                    <th className="border px-2 py-1">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.items.map((item, ii) => {
                    const calc = itemCalculations[bi]?.[ii];
                    return (
                      <tr key={`${ii}`} className="odd:bg-white even:bg-gray-50">
                        <td className="border px-2 py-1">
                          <input 
                            placeholder="Search by ID or name" 
                            className="border px-2 py-1 rounded w-full" 
                            value={item.productId}
                            onChange={e => handleProductSearch(bi, ii, e.target.value)} 
                          />
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {item.product.product_name || 'No product selected'}
                          </div>
                        </td>
                        <td className="border px-2 py-1 text-right">
                          <input 
                            type="number" 
                            min={1} 
                            className="border px-2 py-1 rounded w-20 text-right" 
                            value={item.qty} 
                            onChange={e => handleQtyChange(bi, ii, Number(e.target.value) || 1)} 
                          />
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {formatCurrency(calc?.cost || 0)}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {formatCurrency(calc?.regularPrice || 0)}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {formatCurrency(calc?.currentSellPrice || 0)}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {formatPercentage(calc?.currentGPMargin || 0)}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          <input 
                            type="number" 
                            placeholder="Enter proposed price" 
                            className="border px-2 py-1 rounded w-24 text-right" 
                            value={item.proposedPrice || ''} 
                            onChange={e => handleProposedPriceChange(bi, ii, Number(e.target.value) || 0)} 
                          />
                        </td>
                        <td className="border px-2 py-1 text-right">
                          <span className={item.proposedPrice ? 'text-blue-600 font-semibold' : ''}>
                            {formatPercentage(calc?.proposedGPMargin || 0)}
                          </span>
                        </td>
                        <td className="border px-2 py-1">{item.product.brand}</td>
                        <td className="border px-2 py-1">{item.product.supplier_name}</td>
                        <td className="border px-2 py-1">{item.product.stock_status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          <div className="flex justify-between">
            <button 
              onClick={() => setStep(2)} 
              className="px-3 py-2 bg-gray-200 rounded"
            >
              Back
            </button>
            <button 
              onClick={save} 
              className="px-3 py-2 bg-green-600 text-white rounded"
            >
              Save Bundles
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BundleBuilder;