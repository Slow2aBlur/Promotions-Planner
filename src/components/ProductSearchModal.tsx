"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";

interface ProductSearchModalProps {
  isOpen: boolean;
  allProducts: Product[];
  excludedProductIds?: Set<string>;
  onAddProduct: (product: Product) => void;
  onClose: () => void;
}

const normalize = (value: string): string => {
  if (!value) return "";
  return value.toString().toLowerCase().trim();
};

export default function ProductSearchModal({
  isOpen,
  allProducts,
  excludedProductIds,
  onAddProduct,
  onClose,
}: ProductSearchModalProps) {
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query) return [] as Product[];
    const q = normalize(query);
    const matches = allProducts.filter((p) => {
      if (excludedProductIds && excludedProductIds.has(p.product_id)) return false;
      const idMatch = normalize(p.product_id).includes(q);
      const nameMatch = normalize(p.product_name).includes(q);
      const brandMatch = normalize(p.brand || "").includes(q);
      const supplierMatch = normalize(p.supplier_name || "").includes(q);
      return idMatch || nameMatch || brandMatch || supplierMatch;
    });
    return matches.slice(0, 25);
  }, [query, allProducts, excludedProductIds]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add individual product"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-md bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-charcoal">Add Individual Product</h3>
          <button
            onClick={onClose}
            aria-label="Close add product dialog"
            className="rounded bg-gray-100 px-3 py-1 text-sm text-charcoal hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Close
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="product-search" className="mb-1 block text-sm font-medium text-charcoal">
            Search by product ID, name, brand, or supplier
          </label>
          <input
            id="product-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="max-h-96 overflow-auto rounded border border-gray-200">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-28 px-3 py-2 text-left font-medium text-charcoal">ID</th>
                <th className="px-3 py-2 text-left font-medium text-charcoal">Name</th>
                <th className="w-28 px-3 py-2 text-left font-medium text-charcoal">Brand</th>
                <th className="w-32 px-3 py-2 text-left font-medium text-charcoal">Supplier</th>
                <th className="w-24 px-3 py-2 text-left font-medium text-charcoal">Add</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    {query ? "No products found for your search." : "Start typing to search for products."}
                  </td>
                </tr>
              ) : (
                results.map((p) => (
                  <tr key={p.product_id} className="odd:bg-white even:bg-gray-50">
                    <td className="truncate px-3 py-2 text-charcoal">{p.product_id}</td>
                    <td className="truncate px-3 py-2 text-charcoal" title={p.product_name}>
                      {p.product_name}
                    </td>
                    <td className="truncate px-3 py-2 text-charcoal">{p.brand || ""}</td>
                    <td className="truncate px-3 py-2 text-charcoal">{p.supplier_name || ""}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onAddProduct(p)}
                        className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-pale-teal focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
                        aria-label={`Add product ${p.product_id}`}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


