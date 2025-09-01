'use client';

import React, { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import PromotionTable from '@/components/PromotionTable';

import MonthlyPromotionTable from '@/components/MonthlyPromotionTable';
import ProductReplacementModal from '@/components/ProductReplacementModal';
import CategoryAlternativeModal from '@/components/CategoryAlternativeModal';
import { processProductCSV, generateWeeklyPromotionPlan, generateMonthlyPromotionPlan, getUniqueCategories, replaceProductInPlan, calculateGPPercentage, filterEligibleProducts, getStockStatusSummary, validateDailyCategoryAvailability, validateWeeklyCategoryAvailability, getAlternativeCategories } from '@/lib/dataProcessor';
import { saveWeeklyPlan } from '@/lib/supabaseActions';
import { Product, WeeklyPlan, MonthlyPlan, DailyCategorySelections, WeeklyCategorySelections } from '@/lib/types';
import DailyCategorySelector from '@/components/DailyCategorySelector';
import WeeklyCategorySelector from '@/components/WeeklyCategorySelector';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  // New state for daily and weekly category selections
  const [dailySelections, setDailySelections] = useState<DailyCategorySelections>([
    ['Random', 'Random', 'Random'], // Monday
    ['Random', 'Random', 'Random'], // Tuesday
    ['Random', 'Random', 'Random'], // Wednesday
    ['Random', 'Random', 'Random'], // Thursday
    ['Random', 'Random', 'Random'], // Friday
    ['Random', 'Random', 'Random'], // Saturday
    ['Random', 'Random', 'Random']  // Sunday
  ]);
  
  const [weeklySelections, setWeeklySelections] = useState<WeeklyCategorySelections>([
    ['Random', 'Random', 'Random'], // Week 1
    ['Random', 'Random', 'Random'], // Week 2
    ['Random', 'Random', 'Random'], // Week 3
    ['Random', 'Random', 'Random']  // Week 4
  ]);
  
  const [planningMode, setPlanningMode] = useState<'weekly' | 'monthly'>('weekly');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Replacement modal state
  const [replacementModal, setReplacementModal] = useState({
    isOpen: false,
    productToReplace: null as Product | null,
    dayIndex: -1,
    productIndex: -1,
    weekIndex: -1,
    isMonthly: false
  });

  // Category alternative modal state
  const [categoryAlternativeModal, setCategoryAlternativeModal] = useState({
    isOpen: false,
    emptyCategories: [] as string[],
    insufficientCategories: [] as string[],
    availableByCategory: {} as Record<string, number>,
    alternatives: [] as Array<{ category: string, count: number }>,
    pendingSelections: null as DailyCategorySelections | WeeklyCategorySelections | null,
    isMonthly: false
  });

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Store the filename
      setUploadedFileName(file.name);

      // Step 2: Process CSV file
      const processedProducts = await processProductCSV(file);
      setProducts(processedProducts);

      // Step 3: Get unique categories from the processed products
      const categories = getUniqueCategories(processedProducts);
      setUniqueCategories(categories);

      // Step 4: Check how many products meet business rules
      const eligibleProducts = filterEligibleProducts(processedProducts);
      const belowMinPrice = processedProducts.length - eligibleProducts.length;
      
      // Step 5: Get stock status summary for eligible products
      const stockSummary = getStockStatusSummary(eligibleProducts);

      let successMessage = `Successfully processed ${processedProducts.length} products and found ${categories.length} unique categories!`;
      if (belowMinPrice > 0) {
        successMessage += ` ${belowMinPrice} products below R199 will be excluded from selection.`;
      }
      
      // Add stock status information
      if (stockSummary.outOfStock > 0 || stockSummary.lowStock > 0 || stockSummary.backOrder > 0) {
        successMessage += ` Stock status: ${stockSummary.inStock} in stock`;
        if (stockSummary.outOfStock > 0) {
          successMessage += `, ${stockSummary.outOfStock} out of stock`;
        }
        if (stockSummary.lowStock > 0) {
          successMessage += `, ${stockSummary.lowStock} low stock`;
        }
        if (stockSummary.backOrder > 0) {
          successMessage += `, ${stockSummary.backOrder} on back order`;
        }
        successMessage += '. Out-of-stock items can still be selected but will be flagged.';
      }
      
      successMessage += ' Now select your categories and generate your plan.';

      setSuccess(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the file');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (products.length === 0) {
      setError('Please upload a CSV file first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (planningMode === 'weekly') {
        // Validate category availability for weekly plan
        const validation = validateDailyCategoryAvailability(products, dailySelections);
        
        if (!validation.valid) {
          // Show alternative selection modal
          const problematicCategories = [...validation.emptyCategories, ...validation.insufficientCategories];
          const alternatives = getAlternativeCategories(products, problematicCategories);
          setCategoryAlternativeModal({
            isOpen: true,
            emptyCategories: validation.emptyCategories,
            insufficientCategories: validation.insufficientCategories,
            availableByCategory: validation.availableByCategory,
            alternatives,
            pendingSelections: dailySelections,
            isMonthly: false
          });
          setLoading(false);
          return;
        }

        // Generate weekly promotion plan with daily selections
        const plan = generateWeeklyPromotionPlan(products, dailySelections);
        setWeeklyPlan(plan);
        setMonthlyPlan(null);

        setSuccess(`Successfully generated a 7-day promotion plan with custom daily category selections!`);
      } else {
        // Validate category availability for monthly plan
        const validation = validateWeeklyCategoryAvailability(products, weeklySelections);
        
        if (!validation.valid) {
          // Show alternative selection modal
          const problematicCategories = [...validation.emptyCategories, ...validation.insufficientCategories];
          const alternatives = getAlternativeCategories(products, problematicCategories);
          setCategoryAlternativeModal({
            isOpen: true,
            emptyCategories: validation.emptyCategories,
            insufficientCategories: validation.insufficientCategories,
            availableByCategory: validation.availableByCategory,
            alternatives,
            pendingSelections: weeklySelections,
            isMonthly: true
          });
          setLoading(false);
          return;
        }

        // Generate monthly promotion plan
        const plan = generateMonthlyPromotionPlan(products, weeklySelections);
        setMonthlyPlan(plan);
        setWeeklyPlan(null);
        setSuccess(`Successfully generated a monthly promotion plan with custom weekly category selections!`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!weeklyPlan) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await saveWeeklyPlan(weeklyPlan);
      setSuccess('Weekly promotion plan saved to Supabase successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the plan');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceWeeklyProduct = (dayIndex: number, productIndex: number) => {
    if (!weeklyPlan || !products.length) return;
    
    const productToReplace = weeklyPlan.days[dayIndex].products[productIndex];
    setReplacementModal({
      isOpen: true,
      productToReplace,
      dayIndex,
      productIndex,
      weekIndex: -1,
      isMonthly: false
    });
  };

  const handleReplaceMonthlyProduct = (weekIndex: number, dayIndex: number, productIndex: number) => {
    if (!monthlyPlan || !products.length) return;
    
    const productToReplace = monthlyPlan.weeks[weekIndex].days[dayIndex].products[productIndex];
    setReplacementModal({
      isOpen: true,
      productToReplace,
      dayIndex,
      productIndex,
      weekIndex,
      isMonthly: true
    });
  };

  const handleConfirmReplacement = (newProduct: Product) => {
    const { dayIndex, productIndex, weekIndex, isMonthly } = replacementModal;
    
    try {
      if (isMonthly && monthlyPlan) {
        // Replace in monthly plan
        const updatedPlan = { ...monthlyPlan };
        updatedPlan.weeks[weekIndex].days[dayIndex].products[productIndex] = newProduct;
        setMonthlyPlan(updatedPlan);
      } else if (!isMonthly && weeklyPlan) {
        // Replace in weekly plan
        const updatedPlan = { ...weeklyPlan };
        updatedPlan.days[dayIndex].products[productIndex] = newProduct;
        setWeeklyPlan(updatedPlan);
      }
      
      setSuccess(`Product replaced successfully with ${newProduct.product_name}!`);
      setTimeout(() => setSuccess(null), 3000);
      setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false });
    } catch (error) {
      console.error('Error replacing product:', error);
      setError('Failed to replace product. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelReplacement = () => {
    setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false });
  };

  const handleCategoryAlternativeConfirm = (replacements: Record<string, string>) => {
    const { pendingSelections, isMonthly } = categoryAlternativeModal;
    
    if (isMonthly && Array.isArray(pendingSelections)) {
      // Update weekly selections with replacements
      const updatedSelections = (pendingSelections as WeeklyCategorySelections).map(weekSelections => {
        return weekSelections.map((category: string) => 
          replacements[category] || category
        ) as [string, string, string];
      });
      setWeeklySelections(updatedSelections);
    } else if (!isMonthly && Array.isArray(pendingSelections)) {
      // Update daily selections with replacements
      const updatedSelections = (pendingSelections as DailyCategorySelections).map(daySelections => {
        return daySelections.map((category: string) => 
          replacements[category] || category
        ) as [string, string, string];
      });
      setDailySelections(updatedSelections);
    }

    // Close modal
    setCategoryAlternativeModal({
      isOpen: false,
      emptyCategories: [],
      insufficientCategories: [],
      availableByCategory: {},
      alternatives: [],
      pendingSelections: null,
      isMonthly: false
    });

    // Retry plan generation
    setTimeout(() => {
      handleGeneratePlan();
    }, 100);
  };

  const handleCategoryAlternativeCancel = () => {
    setCategoryAlternativeModal({
      isOpen: false,
      emptyCategories: [],
      insufficientCategories: [],
      availableByCategory: {},
      alternatives: [],
      pendingSelections: null,
      isMonthly: false
    });
    setLoading(false);
  };

  const getUsedProductIds = (): Set<string> => {
    const usedIds = new Set<string>();
    
    if (replacementModal.isMonthly && monthlyPlan) {
      monthlyPlan.weeks.forEach(week => {
        week.days.forEach(day => {
          day.products.forEach(product => {
            usedIds.add(product.product_id);
          });
        });
      });
    } else if (!replacementModal.isMonthly && weeklyPlan) {
      weeklyPlan.days.forEach(day => {
        day.products.forEach(product => {
          usedIds.add(product.product_id);
        });
      });
    }
    
    // Remove the product being replaced
    if (replacementModal.productToReplace) {
      usedIds.delete(replacementModal.productToReplace.product_id);
    }
    
    return usedIds;
  };

  const handleWeeklyPriceChange = (dayIndex: number, productIndex: number, newPrice: number, newGP: number) => {
    if (!weeklyPlan) return;
    
    const updatedPlan = { ...weeklyPlan };
    const product = { ...updatedPlan.days[dayIndex].products[productIndex] };
    product.custom_sale_price = newPrice;
    product.custom_gp_percentage = newGP;
    updatedPlan.days[dayIndex].products[productIndex] = product;
    
    setWeeklyPlan(updatedPlan);
    setSuccess(`Price updated to R${Math.round(newPrice)} (GP: ${newGP.toFixed(1)}%)`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleMonthlyPriceChange = (weekIndex: number, dayIndex: number, productIndex: number, newPrice: number, newGP: number) => {
    if (!monthlyPlan) return;
    
    const updatedPlan = { ...monthlyPlan };
    const product = { ...updatedPlan.weeks[weekIndex].days[dayIndex].products[productIndex] };
    product.custom_sale_price = newPrice;
    product.custom_gp_percentage = newGP;
    updatedPlan.weeks[weekIndex].days[dayIndex].products[productIndex] = product;
    
    setMonthlyPlan(updatedPlan);
    setSuccess(`Price updated to R${Math.round(newPrice)} (GP: ${newGP.toFixed(1)}%)`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleCompleteReset = () => {
    // Reset everything to initial state
    setProducts([]);
    setUniqueCategories([]);
    setWeeklyPlan(null);
    setMonthlyPlan(null);
    // Reset daily selections
    setDailySelections([
      ['Random', 'Random', 'Random'], // Monday
      ['Random', 'Random', 'Random'], // Tuesday
      ['Random', 'Random', 'Random'], // Wednesday
      ['Random', 'Random', 'Random'], // Thursday
      ['Random', 'Random', 'Random'], // Friday
      ['Random', 'Random', 'Random'], // Saturday
      ['Random', 'Random', 'Random']  // Sunday
    ]);
    // Reset weekly selections
    setWeeklySelections([
      ['Random', 'Random', 'Random'], // Week 1
      ['Random', 'Random', 'Random'], // Week 2
      ['Random', 'Random', 'Random'], // Week 3
      ['Random', 'Random', 'Random']  // Week 4
    ]);
    setError(null);
    setSuccess(null);
    setUploadedFileName('');
    setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false });
    setPlanningMode('weekly');
    
    setSuccess('Complete reset successful! Upload a new CSV file to start fresh.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleWeeklyReset = () => {
    // Reset only the plans but keep the uploaded products and categories
    setWeeklyPlan(null);
    setMonthlyPlan(null);
    // Reset daily selections
    setDailySelections([
      ['Random', 'Random', 'Random'], // Monday
      ['Random', 'Random', 'Random'], // Tuesday
      ['Random', 'Random', 'Random'], // Wednesday
      ['Random', 'Random', 'Random'], // Thursday
      ['Random', 'Random', 'Random'], // Friday
      ['Random', 'Random', 'Random'], // Saturday
      ['Random', 'Random', 'Random']  // Sunday
    ]);
    // Reset weekly selections
    setWeeklySelections([
      ['Random', 'Random', 'Random'], // Week 1
      ['Random', 'Random', 'Random'], // Week 2
      ['Random', 'Random', 'Random'], // Week 3
      ['Random', 'Random', 'Random']  // Week 4
    ]);
    setError(null);
    setSuccess(null);
    setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false });
    
    setSuccess('Plans reset! Your products and categories are preserved. Generate a new plan.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const truncateFilename = (filename: string, maxLength: number = 40): string => {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop() || '';
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    const availableLength = maxLength - extension.length - 4; // 4 for "..." and "."
    
    return `${nameWithoutExt.slice(0, availableLength)}...${extension}`;
  };

  return (
    <div className="min-h-screen bg-light-grey">
      {/* Header Section */}
      <div className="bg-charcoal py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
              Daily Discounts Weekly Promotion Planner
            </h1>
            <p className="text-lg text-light-grey">
              developed by Michael Bruchhausen
            </p>
          </div>
        </div>
      </div>

            {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section - Only show if no products uploaded yet */}
        {products.length === 0 && (
          <div className="mb-6">
            <FileUploader onFileSelect={handleFileUpload} loading={loading} />
          </div>
        )}

        {/* Description Section - Only show if no products uploaded yet */}
        {products.length === 0 && (
          <div className="text-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-lg text-charcoal max-w-4xl mx-auto">
                Upload your product CSV file, then choose between weekly or monthly planning modes.
                Monthly mode generates plans for all weeks in a month, handling partial weeks from
                previous/next months. Each day will feature 3 products from each selected category.
              </p>
            </div>
          </div>
        )}

        {/* Status info when products are loaded */}
        {products.length > 0 && (
          <div className="text-center mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex flex-col items-center gap-3">
                <div className="text-sm text-charcoal">
                  <p className="mb-1">
                    <span className="font-semibold text-primary">{products.length}</span> products loaded from CSV • 
                    <span className="font-semibold text-primary"> {uniqueCategories.length}</span> categories available
                  </p>
                  {uploadedFileName && (
                    <p className="text-xs text-gray-600">
                      📄 File: <span 
                        className="font-medium text-charcoal" 
                        title={uploadedFileName}
                      >
                        {truncateFilename(uploadedFileName)}
                      </span>
                    </p>
                  )}
                </div>
                
                {/* Reset Buttons */}
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => {
                      setProducts([]);
                      setUniqueCategories([]);
                      setWeeklyPlan(null);
                      setMonthlyPlan(null);
                      // Reset daily selections
                      setDailySelections([
                        ['Random', 'Random', 'Random'], // Monday
                        ['Random', 'Random', 'Random'], // Tuesday
                        ['Random', 'Random', 'Random'], // Wednesday
                        ['Random', 'Random', 'Random'], // Thursday
                        ['Random', 'Random', 'Random'], // Friday
                        ['Random', 'Random', 'Random'], // Saturday
                        ['Random', 'Random', 'Random']  // Sunday
                      ]);
                      // Reset weekly selections
                      setWeeklySelections([
                        ['Random', 'Random', 'Random'], // Week 1
                        ['Random', 'Random', 'Random'], // Week 2
                        ['Random', 'Random', 'Random'], // Week 3
                        ['Random', 'Random', 'Random']  // Week 4
                      ]);
                      setError(null);
                      setSuccess(null);
                      setUploadedFileName('');
                    }}
                    className="text-xs text-accent hover:text-light-orange underline"
                  >
                    📁 Upload Different File
                  </button>
                  
                  <span className="text-gray-300">|</span>
                  
                  <button
                    onClick={handleWeeklyReset}
                    className="text-xs text-primary hover:text-pale-teal underline"
                    title="Reset plans but keep products"
                  >
                    🔄 Reset Plans
                  </button>
                  
                  <span className="text-gray-300">|</span>
                  
                  <button
                    onClick={handleCompleteReset}
                    className="text-xs text-danger hover:text-red-600 underline"
                    title="Reset everything - start completely fresh"
                  >
                    🗑️ Complete Reset
                  </button>
                </div>
              </div>
            </div>
        </div>
        )}

        {/* Planning Mode Toggle */}
        {uniqueCategories.length > 0 && (
          <div className="text-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Planning Mode</h3>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setPlanningMode('weekly')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    planningMode === 'weekly'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  📅 Weekly Planning
                </button>
                <button
                  onClick={() => setPlanningMode('monthly')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    planningMode === 'monthly'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  🗓️ Monthly Planning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daily Category Selector - Only show after CSV is processed and in weekly mode */}
        {uniqueCategories.length > 0 && planningMode === 'weekly' && (
          <DailyCategorySelector 
            categories={uniqueCategories} 
            dailySelections={dailySelections}
            onSelectionsChange={setDailySelections}
            disabled={loading}
          />
        )}

        {/* Weekly Category Selector - Only show after CSV is processed and in monthly mode */}
        {uniqueCategories.length > 0 && planningMode === 'monthly' && (
          <WeeklyCategorySelector 
            categories={uniqueCategories} 
            weeklySelections={weeklySelections}
            onSelectionsChange={setWeeklySelections}
            disabled={loading}
          />
        )}

        {/* Generate Plan Button - Only show after categories are available */}
        {uniqueCategories.length > 0 && !loading && (
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleGeneratePlan}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-white bg-primary hover:bg-pale-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 shadow-lg"
              >
                {planningMode === 'weekly' ? '📅 Generate Weekly Plan' : '🗓️ Generate Monthly Plan'}
              </button>
              
              {/* Reset buttons when plans exist */}
              {(weeklyPlan || monthlyPlan) && (
                <div className="flex gap-4">
                  <button
                    onClick={handleWeeklyReset}
                    className="inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-lg text-primary bg-white hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                    title="Reset plans but keep products and categories"
                  >
                    🔄 Reset Plans
                  </button>
                  
                  <button
                    onClick={handleCompleteReset}
                    className="inline-flex items-center px-4 py-2 border border-danger text-sm font-medium rounded-lg text-danger bg-white hover:bg-danger hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger transition-colors duration-200"
                    title="Complete reset - clear everything and start fresh"
                  >
                    🗑️ Complete Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        



        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-danger rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-danger" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-danger">Error</h3>
                <div className="mt-2 text-sm text-charcoal">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-success rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success">Success</h3>
                <div className="mt-2 text-sm text-charcoal">
                  {success}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-primary bg-opacity-10">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing CSV and generating promotion plan...
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {((weeklyPlan && planningMode === 'weekly') || (monthlyPlan && planningMode === 'monthly')) && !loading && (
          <div className="text-center mb-8 print-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              
              {/* Print Button */}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-6 py-3 border border-primary text-base font-semibold rounded-lg text-primary bg-white hover:bg-light-grey focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 shadow-md"
                title="Print your promotion plan in a clean, professional format"
              >
                🖨️ Print Plan
              </button>

              {/* Save Button - Only for weekly plans */}
              {weeklyPlan && (
                <button
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-white bg-accent hover:bg-light-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving to Supabase...
                    </>
                  ) : (
                    'Save to Supabase'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

                  {/* Results Display - Only show after promotion plan is generated */}
          {weeklyPlan && !loading && planningMode === 'weekly' && (
            <div className="mb-8">
              <PromotionTable 
                weeklyPlan={weeklyPlan} 
                onReplaceProduct={handleReplaceWeeklyProduct}
                onPriceChange={handleWeeklyPriceChange}
              />
            </div>
          )}

          {/* Monthly Results Display */}
          {monthlyPlan && !loading && planningMode === 'monthly' && (
            <div className="mb-8">
              <MonthlyPromotionTable 
                monthlyPlan={monthlyPlan} 
                onReplaceProduct={handleReplaceMonthlyProduct}
                onPriceChange={handleMonthlyPriceChange}
              />
            </div>
          )}
      </div>

      {/* Product Replacement Modal */}
      {replacementModal.productToReplace && (
        <ProductReplacementModal
          isOpen={replacementModal.isOpen}
          productToReplace={replacementModal.productToReplace}
          availableCategories={uniqueCategories}
          allProducts={products}
          usedProductIds={getUsedProductIds()}
          onReplace={handleConfirmReplacement}
          onCancel={handleCancelReplacement}
        />
      )}

      {/* Category Alternative Modal */}
      <CategoryAlternativeModal
        isOpen={categoryAlternativeModal.isOpen}
        emptyCategories={categoryAlternativeModal.emptyCategories}
        insufficientCategories={categoryAlternativeModal.insufficientCategories}
        availableByCategory={categoryAlternativeModal.availableByCategory}
        alternatives={categoryAlternativeModal.alternatives}
        onConfirm={handleCategoryAlternativeConfirm}
        onCancel={handleCategoryAlternativeCancel}
      />
    </div>
  );
}