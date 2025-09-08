'use client';

import React, { useMemo, useState } from 'react';
import { Product, BuilderBundle, BuilderBundleItem, BuilderPricingMode } from '@/lib/types';

interface BundleBuilderProps {
  products: Product[];
  onSaveBundles: (bundles: BuilderBundle[]) => void;
}

const formatCurrency = (v: number) => `R${Math.round(v).toLocaleString('en-ZA')}`;

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
        // placeholder object; will be replaced on selection
        product: products[0] || {
          product_id: '', product_name: '', supplier_name: '', brand: '', regular_price: 0, sale_price: 0, purchase_cost: 0, category: '', views: 0, stock_status: ''
        },
        qty: 1
      } as BuilderBundleItem)),
      pricingMode: 'Sum',
      bundlePrice: 0,
      createdAt: new Date()
    }));
    setBundles(initial);
    setStep(3);
  };

  const handlePick = (bIndex: number, iIndex: number, value: string) => {
    setBundles(prev => prev.map((b, bi) => {
      if (bi !== bIndex) return b;
      const found = products.find(p => p.product_id === value || p.product_name.toLowerCase().includes(value.toLowerCase()));
      if (!found) return b;
      const items = b.items.map((it, ii) => ii === iIndex ? { ...it, productId: found.product_id, product: found } : it);
      return { ...b, items };
    }));
  };

  const handleQty = (bIndex: number, iIndex: number, qty: number) => {
    setBundles(prev => prev.map((b, bi) => bi === bIndex ? { ...b, items: b.items.map((it, ii) => ii === iIndex ? { ...it, qty: Math.max(1, qty) } : it) } : b));
  };

  const handleName = (bIndex: number, name: string) => setBundles(prev => prev.map((b, bi) => bi === bIndex ? { ...b, name } : b));
  const handleMode = (bIndex: number, mode: BuilderPricingMode) => setBundles(prev => prev.map((b, bi) => bi === bIndex ? { ...b, pricingMode: mode } : b));
  const handleDiscount = (bIndex: number, pct: number) => setBundles(prev => prev.map((b, bi) => bi === bIndex ? { ...b, discountPct: pct } : b));
  const handleManualPrice = (bIndex: number, price: number) => setBundles(prev => prev.map((b, bi) => bi === bIndex ? { ...b, bundlePrice: Math.max(0, price) } : b));

  const computed = useMemo(() => bundles.map(b => {
    const totalCost = b.items.reduce((s, it) => s + it.product.purchase_cost * it.qty, 0);
    const totalRSP = b.items.reduce((s, it) => s + (it.product.sale_price || it.product.regular_price) * it.qty, 0);
    let bundlePrice = b.bundlePrice;
    if (b.pricingMode === 'Sum') bundlePrice = totalRSP;
    if (b.pricingMode === 'Discount') bundlePrice = totalRSP * (1 - (b.discountPct || 0) / 100);
    const gpR = bundlePrice - totalCost;
    const gpPct = bundlePrice > 0 ? (gpR / bundlePrice) * 100 : 0;
    return { totalCost, totalRSP, bundlePrice, gpR, gpPct };
  }), [bundles]);

  const save = () => {
    const withPrices = bundles.map((b, i) => ({
      ...b,
      name: b.name || `Bundle ${i + 1}`,
      bundlePrice: computed[i].bundlePrice
    }));
    onSaveBundles(withPrices);
  };

  return (
    <div className="p-4">
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How many bundles do you want to create?</h3>
          <input type="number" className="border px-2 py-1 rounded w-28" min={1} value={bundleCount} onChange={e => setBundleCount(Number(e.target.value) || 1)} />
          <div>
            <button onClick={() => setStep(2)} className="px-3 py-2 bg-blue-600 text-white rounded">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How many products per bundle?</h3>
          <input type="number" className="border px-2 py-1 rounded w-28" min={2} max={10} value={itemsPerBundle} onChange={e => setItemsPerBundle(Math.min(10, Math.max(2, Number(e.target.value) || 2)))} />
          <div className="space-x-2">
            <button onClick={() => setStep(1)} className="px-3 py-2 bg-gray-200 rounded">Back</button>
            <button onClick={startWizard} className="px-3 py-2 bg-blue-600 text-white rounded">Create Placeholders</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {bundles.map((b, bi) => (
            <div key={b.id} className="border rounded p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input value={b.name} onChange={e => handleName(bi, e.target.value)} className="border px-2 py-1 rounded w-64" />
                <select value={b.pricingMode} onChange={e => handleMode(bi, e.target.value as BuilderPricingMode)} className="border px-2 py-1 rounded">
                  <option value="Manual">Manual</option>
                  <option value="Sum">Sum</option>
                  <option value="Discount">Discount</option>
                </select>
                {b.pricingMode === 'Discount' && (
                  <input type="number" placeholder="Discount %" className="border px-2 py-1 rounded w-28" value={b.discountPct || 0} onChange={e => handleDiscount(bi, Number(e.target.value) || 0)} />
                )}
                {b.pricingMode === 'Manual' && (
                  <input type="number" placeholder="Bundle Price" className="border px-2 py-1 rounded w-36" value={b.bundlePrice} onChange={e => handleManualPrice(bi, Number(e.target.value) || 0)} />
                )}
                <div className="ml-auto text-sm">
                  <span className="mr-4">Total Cost: <strong>{formatCurrency(computed[bi]?.totalCost || 0)}</strong></span>
                  <span className="mr-4">Total RSP: <strong>{formatCurrency(computed[bi]?.totalRSP || 0)}</strong></span>
                  <span className="mr-4">Bundle Price: <strong>{formatCurrency(computed[bi]?.bundlePrice || 0)}</strong></span>
                  <span>GP: <strong>{formatCurrency(computed[bi]?.gpR || 0)} ({(computed[bi]?.gpPct || 0).toFixed(1)}%)</strong></span>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1 text-left">Product</th>
                    <th className="border px-2 py-1 text-right">Qty</th>
                    <th className="border px-2 py-1 text-right">Cost</th>
                    <th className="border px-2 py-1 text-right">RSP</th>
                    <th className="border px-2 py-1">Brand</th>
                    <th className="border px-2 py-1">Supplier</th>
                    <th className="border px-2 py-1">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {b.items.map((it, ii) => (
                    <tr key={`${ii}`} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1">
                        <input placeholder="ID or name" className="border px-2 py-1 rounded w-full" value={it.productId}
                          onChange={e => handlePick(bi, ii, e.target.value)} />
                        <div className="text-xs text-gray-600 truncate">{it.product.product_name}</div>
                      </td>
                      <td className="border px-2 py-1 text-right">
                        <input type="number" min={1} className="border px-2 py-1 rounded w-20 text-right" value={it.qty} onChange={e => handleQty(bi, ii, Number(e.target.value) || 1)} />
                      </td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(it.product.purchase_cost || 0)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency((it.product.sale_price || it.product.regular_price) || 0)}</td>
                      <td className="border px-2 py-1">{it.product.brand}</td>
                      <td className="border px-2 py-1">{it.product.supplier_name}</td>
                      <td className="border px-2 py-1">{it.product.stock_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-3 py-2 bg-gray-200 rounded">Back</button>
            <button onClick={save} className="px-3 py-2 bg-green-600 text-white rounded">Save Bundles</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BundleBuilder;


