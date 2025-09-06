'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import FileUploader from '@/components/FileUploader';
import PromotionTable from '@/components/PromotionTable';

import MonthlyPromotionTable from '@/components/MonthlyPromotionTable';
import ProductReplacementModal from '@/components/ProductReplacementModal';
import CategoryAlternativeModal from '@/components/CategoryAlternativeModal';
import { processProductCSV, generateDailyPromotionPlan, generateFlexibleWeeklyPromotionPlan, generateMonthlyPromotionPlan, getUniqueCategories, filterEligibleProducts, getStockStatusSummary } from '@/lib/dataProcessor';
import { saveDailyPlan, saveWeeklyPlan, saveMonthlyPlan, saveAdHocPlan } from '@/lib/supabaseActions';
import { 
  createNewSession, 
  getActiveSessions, 
  setActiveSession, 
  saveFullApplicationState, 
  loadFullApplicationState, 
  autoSaveApplicationState,
  BackupSession,
  FullApplicationState
} from '@/lib/backupActions';
import { Product, DayPlan, WeeklyPlan, MonthlyPlan, DailyCategorySelections, WeeklyCategorySelections, WeeklyConfiguration } from '@/lib/types';
import ProductSearchModal from '@/components/ProductSearchModal';
import SavePromotionModal from '@/components/SavePromotionModal';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [loading, setLoading] = useState(false);
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
  
  const [weeklySelections, setWeeklySelections] = useState<Array<string[]>>([
    ['Random', 'Random', 'Random'], // Week 1
    ['Random', 'Random', 'Random'], // Week 2
    ['Random', 'Random', 'Random'], // Week 3
    ['Random', 'Random', 'Random']  // Week 4
  ]);
  
  const [dailyPlan, setDailyPlan] = useState<DayPlan | null>(null);
  
  const [planningMode, setPlanningMode] = useState<'daily' | 'weekly' | 'monthly' | 'adHoc'>('daily');
  
  // Weekly planning configuration
  const [weeklyConfig, setWeeklyConfig] = useState<WeeklyConfiguration>({
    numberOfWeeks: 1,
    weeks: [
      { startDate: '', endDate: '', targetGPMargin: 0 }
    ]
  });

  // Weekly category and product configuration
  const [weeklyCategoryConfig, setWeeklyCategoryConfig] = useState({
    numberOfCategories: 3,
    productsPerCategory: 3
  });

  // Expected sales quantity per product
  const [expectedQuantity, setExpectedQuantity] = useState<number>(5);

  // Ad-hoc plan state
  const [adHocPlan, setAdHocPlan] = useState<{
    isOpen: boolean;
    products: Array<{
      id: string;
      productId: string;
      product: Product | null;
      targetPrice: number;
      targetMargin: number;
      inputMode: 'price' | 'margin';
      quantity: number;
    }>;
    approvedProducts: Array<{
      id: string;
      productId: string;
      product: Product;
      targetPrice: number;
      targetMargin: number;
      quantity: number;
      approvedAt: Date;
    }>;
    currentProductId: string;
    maxProducts: number;
  }>({
    isOpen: false,
    products: [],
    approvedProducts: [],
    currentProductId: '',
    maxProducts: 30
  });


  // Backup system state
  const [backupSessionId, setBackupSessionId] = useState<string | null>(null);
  const [availableSessions, setAvailableSessions] = useState<BackupSession[]>([]);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Local state for date inputs to allow typing
  const [dateInputs, setDateInputs] = useState<{[key: string]: string}>({});
  
  // Plan view preference
  const [planViewMode, setPlanViewMode] = useState<'daily' | 'consolidated'>('daily');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  
  // Replacement modal state
  const [replacementModal, setReplacementModal] = useState({
    isOpen: false,
    productToReplace: null as Product | null,
    dayIndex: -1,
    productIndex: -1,
    weekIndex: -1,
    isMonthly: false,
    viewType: 'daily' as 'daily' | 'consolidated' | 'monthly'
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

  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);

  // BACKUP SYSTEM FUNCTIONS
  
  // Auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled || !backupSessionId) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        const currentState: FullApplicationState = {
          products,
          dailyPlan,
          weeklyPlan,
          monthlyPlan,
          adHocPlan,
          dailySelections,
          weeklySelections,
          weeklyConfig,
          weeklyCategoryConfig,
          planningMode,
          uniqueCategories,
          uploadedFileName,
          lastUploadedFile: null, // Can't save File objects
          expectedQuantity
        };

        await autoSaveApplicationState(backupSessionId, currentState);
        setLastAutoSave(new Date());
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [autoSaveEnabled, backupSessionId, products, dailyPlan, weeklyPlan, monthlyPlan, adHocPlan, dailySelections, expectedQuantity, planningMode, uniqueCategories, uploadedFileName, weeklyCategoryConfig, weeklyConfig, weeklySelections]);

  // Load sessions on component mount
  useEffect(() => {
    loadAvailableSessions();
  }, []);

  const loadAvailableSessions = async () => {
    try {
      const sessions = await getActiveSessions();
      setAvailableSessions(sessions);
      
      // Set active session if available
      const activeSession = sessions.find(s => s.is_active);
      if (activeSession) {
        setBackupSessionId(activeSession.id);
      }
    } catch {
      console.warn('Failed to load sessions');
    }
  };

  const createNewBackupSession = async () => {
    try {
      const sessionName = prompt('Enter session name:');
      if (!sessionName) return;

      const sessionId = await createNewSession(sessionName);
      setBackupSessionId(sessionId);
      await loadAvailableSessions();
      setSuccess('New backup session created!');
    } catch {
      setError('Failed to create backup session');
    }
  };

  const loadBackupSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const state = await loadFullApplicationState(sessionId);
      
      // Restore all state
      setProducts(state.products);
      setDailyPlan(state.dailyPlan);
      setWeeklyPlan(state.weeklyPlan);
      setMonthlyPlan(state.monthlyPlan);
      setAdHocPlan(state.adHocPlan);
      setDailySelections(state.dailySelections);
      setWeeklySelections(state.weeklySelections);
      setWeeklyConfig(state.weeklyConfig);
      setWeeklyCategoryConfig(state.weeklyCategoryConfig);
      setPlanningMode(state.planningMode as 'daily' | 'weekly' | 'monthly' | 'adHoc');
      setUniqueCategories(state.uniqueCategories);
      setUploadedFileName(state.uploadedFileName);
      setExpectedQuantity(state.expectedQuantity);
      setBackupSessionId(sessionId);
      
      setSuccess('Session restored successfully!');
    } catch {
      setError('Failed to restore session');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentSession = async () => {
    if (!backupSessionId) {
      await createNewBackupSession();
      return;
    }

    try {
      const currentState: FullApplicationState = {
        products,
        dailyPlan,
        weeklyPlan,
        monthlyPlan,
        adHocPlan,
        dailySelections,
        weeklySelections,
        weeklyConfig,
        weeklyCategoryConfig,
        planningMode,
        uniqueCategories,
        uploadedFileName,
        lastUploadedFile: null,
        expectedQuantity
      };

      await saveFullApplicationState(backupSessionId, currentState, 'Manual Save');
      setSuccess('Session saved successfully!');
    } catch {
      setError('Failed to save session');
    }
  };

  const handleSavePromotion = async (saveName: string) => {
    try {
      setLoading(true);
      
      switch (planningMode) {
        case 'daily':
          if (dailyPlan) {
            await saveDailyPlan(dailyPlan, saveName);
            setSuccess(`Daily promotion plan "${saveName}" saved successfully!`);
          } else {
            setError('No daily plan to save');
          }
          break;
          
        case 'weekly':
          if (weeklyPlan) {
            await saveWeeklyPlan(weeklyPlan, saveName);
            setSuccess(`Weekly promotion plan "${saveName}" saved successfully!`);
          } else {
            setError('No weekly plan to save');
          }
          break;
          
        case 'monthly':
          if (monthlyPlan) {
            await saveMonthlyPlan(monthlyPlan, saveName);
            setSuccess(`Monthly promotion plan "${saveName}" saved successfully!`);
          } else {
            setError('No monthly plan to save');
          }
          break;
          
        case 'adHoc':
          if (adHocPlan.approvedProducts.length > 0) {
            const adHocProducts = adHocPlan.approvedProducts.map(ap => ap.product);
            await saveAdHocPlan(adHocProducts, saveName);
            setSuccess(`Ad-hoc promotion plan "${saveName}" saved successfully!`);
          } else {
            setError('No approved ad-hoc products to save');
          }
          break;
          
        default:
          setError('Invalid planning mode');
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      setError(`Failed to save promotion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Store the filename and file
      setUploadedFileName(file.name);
      setLastUploadedFile(file);

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
      if (planningMode === 'daily') {
        // Generate daily promotion plan using the first day's selections
        const plan = generateDailyPromotionPlan(products, dailySelections[0] as [string, string, string]);
        setDailyPlan(plan);
        setWeeklyPlan(null);
        setMonthlyPlan(null);
        setSuccess(`Successfully generated a daily promotion plan with ${plan.products.length} products!`);
      } else if (planningMode === 'weekly') {
        // Validate that all weeks have dates set
        const hasAllDates = weeklyConfig.weeks.every(week => week.startDate && week.endDate);
        if (!hasAllDates) {
          setError('Please set start and end dates for all weeks before generating the plan.');
          setLoading(false);
          return;
        }

        // Generate plan with whatever products are available (no validation blocking)

        // Generate flexible weekly promotion plan
        const plan = generateFlexibleWeeklyPromotionPlan(products, weeklySelections.slice(0, weeklyConfig.numberOfWeeks), weeklyConfig.weeks, weeklyCategoryConfig);
        setWeeklyPlan(plan);
        setMonthlyPlan(null);

        setSuccess(`Successfully generated a ${weeklyConfig.numberOfWeeks}-week promotion plan with custom category selections!`);
        
        // Show plan view selection modal
        setPlanViewMode('daily'); // Reset to daily view
      } else {
        // Generate plan with whatever products are available (no validation blocking)

        // Generate monthly promotion plan
        const plan = generateMonthlyPromotionPlan(products, weeklySelections as Array<[string, string, string]>);
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


  const handleReplaceWeeklyProduct = (dayIndex: number, productIndex: number) => {
    if (!weeklyPlan || !products.length) return;
    
    const productToReplace = weeklyPlan.days[dayIndex].products[productIndex];
    setReplacementModal({
      isOpen: true,
      productToReplace,
      dayIndex,
      productIndex,
      weekIndex: -1,
      isMonthly: false,
      viewType: 'daily'
    });
  };

  const handleReplaceConsolidatedProduct = (productId: string) => {
    if (!weeklyPlan || !products.length) return;
    
    // Find the product in the weekly plan
    let productToReplace: Product | null = null;
    let dayIndex = -1;
    let productIndex = -1;
    
    for (let d = 0; d < weeklyPlan.days.length; d++) {
      for (let p = 0; p < weeklyPlan.days[d].products.length; p++) {
        if (weeklyPlan.days[d].products[p].product_id === productId) {
          productToReplace = weeklyPlan.days[d].products[p];
          dayIndex = d;
          productIndex = p;
          break;
        }
      }
      if (productToReplace) break;
    }
    
    if (productToReplace) {
      setReplacementModal({
        isOpen: true,
        productToReplace,
        dayIndex,
        productIndex,
        weekIndex: -1,
        isMonthly: false,
        viewType: 'consolidated'
      });
    }
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
      isMonthly: true,
      viewType: 'monthly'
    });
  };

  const handleConfirmReplacement = (newProduct: Product) => {
    const { dayIndex, productIndex, weekIndex, isMonthly, viewType } = replacementModal;
    
    try {
      if (isMonthly && monthlyPlan) {
        // Replace in monthly plan
        const updatedPlan = { ...monthlyPlan };
        updatedPlan.weeks[weekIndex].days[dayIndex].products[productIndex] = newProduct;
        setMonthlyPlan(updatedPlan);
      } else if (!isMonthly && weeklyPlan) {
        // Replace in weekly plan (works for both daily and consolidated views)
        const updatedPlan = { ...weeklyPlan };
        updatedPlan.days[dayIndex].products[productIndex] = newProduct;
        setWeeklyPlan(updatedPlan);
      }
      
      setSuccess(`Product replaced successfully with ${newProduct.product_name} in ${viewType} view!`);
      setTimeout(() => setSuccess(null), 3000);
      setReplacementModal({ 
        isOpen: false, 
        productToReplace: null, 
        dayIndex: -1, 
        productIndex: -1, 
        weekIndex: -1, 
        isMonthly: false,
        viewType: 'daily'
      });
    } catch (error) {
      console.error('Error replacing product:', error);
      setError('Failed to replace product. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelReplacement = () => {
    setReplacementModal({ 
      isOpen: false, 
      productToReplace: null, 
      dayIndex: -1, 
      productIndex: -1, 
      weekIndex: -1, 
      isMonthly: false,
      viewType: 'daily'
    });
  };

  // Ad-hoc plan functions
  const handleAdHocProductLookup = () => {
    if (!adHocPlan.currentProductId.trim() || !products.length) return;
    
    const product = products.find(p => p.product_id.toLowerCase() === adHocPlan.currentProductId.toLowerCase());
    if (product) {
      // Check if product already exists
      const existingProduct = adHocPlan.products.find(p => p.productId.toLowerCase() === adHocPlan.currentProductId.toLowerCase());
      if (existingProduct) {
        setError('Product already added to the analysis.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if we've reached the maximum number of products
      if (adHocPlan.products.length >= adHocPlan.maxProducts) {
        setError(`Maximum number of products (${adHocPlan.maxProducts}) reached.`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const newProduct = {
        id: `product_${Date.now()}`,
        productId: adHocPlan.currentProductId,
        product,
        targetPrice: 0,
        targetMargin: 0,
        inputMode: 'price' as 'price' | 'margin',
        quantity: 1
      };

      setAdHocPlan(prev => ({
        ...prev,
        products: [...prev.products, newProduct],
        currentProductId: ''
      }));
    } else {
      setError('Product not found. Please check the Product ID.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateAdHocProduct = (productId: string, field: 'targetPrice' | 'targetMargin' | 'quantity' | 'inputMode', value: number | string) => {
    setAdHocPlan(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          const updatedProduct = { ...p, [field]: value };
          
          // If updating price, calculate margin
          if (field === 'targetPrice' && typeof value === 'number' && p.product) {
            const purchaseCost = p.product.purchase_cost || 0;
            const newMargin = value > 0 ? Math.round(((value - purchaseCost) / value) * 100) : 0;
            updatedProduct.targetMargin = newMargin;
          }
          
          // If updating margin, calculate price
          if (field === 'targetMargin' && typeof value === 'number' && p.product) {
            const purchaseCost = p.product.purchase_cost || 0;
            const newPrice = value > 0 ? Math.round(purchaseCost / (1 - value / 100)) : purchaseCost;
            updatedProduct.targetPrice = newPrice;
          }
          
          return updatedProduct;
        }
        return p;
      })
    }));
  };

  const removeAdHocProduct = (productId: string) => {
    setAdHocPlan(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  const approveAdHocProduct = (productId: string) => {
    const productData = adHocPlan.products.find(p => p.id === productId);
    if (!productData || !productData.product) return;

    const approvedProduct = {
      id: `approved_${Date.now()}`,
      productId: productData.productId,
      product: productData.product,
      targetPrice: productData.targetPrice,
      targetMargin: productData.targetMargin,
      quantity: productData.quantity,
      approvedAt: new Date()
    };

    setAdHocPlan(prev => ({
      ...prev,
      approvedProducts: [...prev.approvedProducts, approvedProduct],
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  const removeApprovedProduct = (productId: string) => {
    setAdHocPlan(prev => ({
      ...prev,
      approvedProducts: prev.approvedProducts.filter(p => p.id !== productId)
    }));
  };

  const updateApprovedProductQuantity = (productId: string, quantity: number) => {
    setAdHocPlan(prev => ({
      ...prev,
      approvedProducts: prev.approvedProducts.map(p => 
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    }));
  };

  const updateApprovedProductPrice = (productId: string, targetPrice: number) => {
    setAdHocPlan(prev => ({
      ...prev,
      approvedProducts: prev.approvedProducts.map(p => {
        if (p.id === productId) {
          const purchaseCost = p.product.purchase_cost || 0;
          const newMargin = targetPrice > 0 ? Math.round(((targetPrice - purchaseCost) / targetPrice) * 100) : 0;
          return { ...p, targetPrice: Math.max(0, targetPrice), targetMargin: newMargin };
        }
        return p;
      })
    }));
  };

  const calculateAdHocMargins = (productData: { product: Product | null; targetPrice: number; quantity: number }) => {
    if (!productData.product) return null;
    const { product, targetPrice, quantity } = productData;
    
    // All prices already include VAT - no need to strip VAT
    const purchaseCost = product.purchase_cost || 0; // Already includes VAT
    const regularPrice = product.regular_price || 0; // Already includes VAT
    const currentSalePrice = product.custom_sale_price || product.five_percent_sale_price || regularPrice; // Already includes VAT
    
    // Calculate current margins (all prices include VAT)
    const currentLowestPrice = Math.min(regularPrice, currentSalePrice);
    const currentMargin = currentLowestPrice - purchaseCost;
    const currentMarginPercent = currentLowestPrice > 0 ? ((currentMargin / currentLowestPrice) * 100) : 0;
    
    // Calculate target margins (all prices include VAT)
    const targetMargin = targetPrice - purchaseCost;
    const targetMarginPercent = targetPrice > 0 ? ((targetMargin / targetPrice) * 100) : 0;
    
    // Calculate totals (all prices include VAT)
    const totalSalesValue = targetPrice * quantity;
    const totalMargin = targetMargin * quantity;
    
    return {
      product,
      purchaseCost,
      regularPrice,
      currentSalePrice,
      currentLowestPrice,
      currentMargin,
      currentMarginPercent,
      targetPrice,
      targetPriceExVAT: targetPrice, // Same as target price since all prices include VAT
      targetMargin,
      targetMarginPercent,
      quantity,
      totalSalesValue,
      totalSalesValueExVAT: targetPrice * quantity, // Same as total sales value since all prices include VAT
      totalMargin,
      vatAmount: 0 // No separate VAT calculation since all prices include VAT
    };
  };

  const calculateAdHocTotals = () => {
    let totalSalesValue = 0;
    let totalSalesValueExVAT = 0;
    let totalMargin = 0;
    let totalVAT = 0;

    adHocPlan.products.forEach(productData => {
      if (productData.product) {
        const calculations = calculateAdHocMargins(productData);
        if (calculations) {
          totalSalesValue += calculations.totalSalesValue;
          totalSalesValueExVAT += calculations.totalSalesValueExVAT;
          totalMargin += calculations.totalMargin;
          totalVAT += calculations.vatAmount;
        }
      }
    });

    return {
      totalSalesValue: Math.round(totalSalesValue),
      totalSalesValueExVAT: Math.round(totalSalesValueExVAT),
      totalMargin: Math.round(totalMargin),
      totalVAT: Math.round(totalVAT),
      productCount: adHocPlan.products.length
    };
  };

  const calculateApprovedTotals = () => {
    let totalSalesValue = 0;
    let totalMargin = 0;
    let totalPurchaseCost = 0;

    adHocPlan.approvedProducts.forEach(approvedProduct => {
      // All prices already include VAT - no need to strip VAT
      const purchaseCost = approvedProduct.product.purchase_cost || 0; // Already includes VAT
      const targetMargin = approvedProduct.targetPrice - purchaseCost; // Direct calculation since all prices include VAT
      
      totalSalesValue += approvedProduct.targetPrice * approvedProduct.quantity;
      totalMargin += targetMargin * approvedProduct.quantity;
      totalPurchaseCost += purchaseCost * approvedProduct.quantity;
    });

    return {
      totalSalesValue: Math.round(totalSalesValue),
      totalSalesValueExVAT: Math.round(totalSalesValue), // Same as total sales value since all prices include VAT
      totalMargin: Math.round(totalMargin),
      totalPurchaseCost: Math.round(totalPurchaseCost),
      totalVAT: 0, // No separate VAT calculation since all prices include VAT
      productCount: adHocPlan.approvedProducts.length
    };
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
    setDailyPlan(null);
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
    setLastUploadedFile(null);
    setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false, viewType: 'daily' });
    setPlanningMode('daily');
    setWeeklyConfig({
      numberOfWeeks: 1,
        weeks: [{ startDate: '', endDate: '', targetGPMargin: 0 }]
    });
    
    setSuccess('Complete reset successful! Upload a new CSV file to start fresh.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleWeeklyReset = () => {
    // Reset only the plans but keep the uploaded products and categories
    setDailyPlan(null);
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
    setReplacementModal({ isOpen: false, productToReplace: null, dayIndex: -1, productIndex: -1, weekIndex: -1, isMonthly: false, viewType: 'daily' });
    
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

  const handleAddIndividualProduct = (product: Product) => {
    if (!dailyPlan) return;
    // Prevent duplicates
    const alreadyIncluded = dailyPlan.products.some(p => p.product_id === product.product_id);
    if (alreadyIncluded) {
      setSuccess(`Product ${product.product_id} is already in the plan.`);
      setTimeout(() => setSuccess(null), 2000);
      return;
    }
    const updated = { ...dailyPlan, products: [...dailyPlan.products, product] };
    setDailyPlan(updated);
    setSuccess(`Added product ${product.product_id} to the plan.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleAddIndividualProductToWeekly = (product: Product) => {
    if (!weeklyPlan) return;
    // Prevent duplicates
    const alreadyIncluded = weeklyPlan.days.some(day => 
      day.products.some(p => p.product_id === product.product_id)
    );
    if (alreadyIncluded) {
      setSuccess(`Product ${product.product_id} is already in the weekly plan.`);
      setTimeout(() => setSuccess(null), 2000);
      return;
    }
    
    // Add product to the first day of the week
    const updated = {
      ...weeklyPlan,
      days: weeklyPlan.days.map((day, dayIndex) => {
        if (dayIndex === 0) {
          return {
            ...day,
            products: [...day.products, product]
          };
        }
        return day;
      })
    };
    setWeeklyPlan(updated);
    setSuccess(`Added product ${product.product_id} to the weekly plan.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleNumberOfWeeksChange = (numberOfWeeks: number) => {
    const newWeeks = Array.from({ length: numberOfWeeks }, (_, weekIndex) => ({
      startDate: weeklyConfig.weeks[weekIndex]?.startDate || '',
      endDate: weeklyConfig.weeks[weekIndex]?.endDate || '',
      targetGPMargin: weeklyConfig.weeks[weekIndex]?.targetGPMargin || 0
    }));
    setWeeklyConfig({
      numberOfWeeks,
      weeks: newWeeks
    });
  };

  const handleWeekDateChange = (weekIndex: number, field: 'startDate' | 'endDate', value: string) => {
    const newWeeks = [...weeklyConfig.weeks];
    newWeeks[weekIndex] = {
      ...newWeeks[weekIndex],
      [field]: value
    };
    setWeeklyConfig({
      ...weeklyConfig,
      weeks: newWeeks
    });
  };

  const handleWeekGPMarginChange = (weekIndex: number, value: number) => {
    const newWeeks = [...weeklyConfig.weeks];
    newWeeks[weekIndex] = {
      ...newWeeks[weekIndex],
      targetGPMargin: value
    };
    setWeeklyConfig({
      ...weeklyConfig,
      weeks: newWeeks
    });
  };

  const handleCategoryConfigChange = (field: 'numberOfCategories' | 'productsPerCategory', value: number) => {
    setWeeklyCategoryConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDateToYYMMDD = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

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

  // Export functions
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    
    // Get headers from the first row
    const headers = Object.keys(data[0]);
    
    // Create CSV content with headers
    const csvContent = [
      // Headers row
      headers.map(header => `"${header}"`).join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle special characters and escape quotes
          const escapedValue = String(value || '').replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (data: Record<string, unknown>[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Promotion Plan');
    XLSX.writeFile(workbook, filename);
  };

  const exportToGoogleSheets = (data: Record<string, unknown>[]) => {
    if (data.length === 0) return;
    
    // Get headers from the first row
    const headers = Object.keys(data[0]);
    
    // Create CSV content with headers (same as CSV export)
    const csvContent = [
      // Headers row
      headers.map(header => `"${header}"`).join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle special characters and escape quotes
          const escapedValue = String(value || '').replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');
    
    // Create a data URI for CSV
    const csvDataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    // Open in new tab for Google Sheets
    window.open(csvDataUri, '_blank');
  };

  // Export functions for approved products
  const prepareApprovedProductsExportData = () => {
    return adHocPlan.approvedProducts.map((approvedProduct) => {
      const purchaseCost = approvedProduct.product.purchase_cost || 0;
      const targetMargin = approvedProduct.targetPrice - purchaseCost;
      const totalValue = approvedProduct.targetPrice * approvedProduct.quantity;
      const totalGP = targetMargin * approvedProduct.quantity;
      const marginPercent = approvedProduct.targetPrice > 0 ? Math.round(((targetMargin) / approvedProduct.targetPrice) * 100) : 0;

      return {
        'Product Name': String(approvedProduct.product.product_name || ''),
        'Brand': String(approvedProduct.product.brand || ''),
        'Category': String(approvedProduct.product.category || ''),
        'Product ID': String(approvedProduct.productId || ''),
        'Supplier': String(approvedProduct.product.supplier_name || ''),
        'Cost': Math.round(purchaseCost),
        'Promo Price': Math.round(approvedProduct.targetPrice),
        'Margin %': marginPercent,
        'Quantity': approvedProduct.quantity,
        'Total Value': Math.round(totalValue),
        'Total GP': Math.round(totalGP),
        'Approved Date': approvedProduct.approvedAt.toLocaleDateString()
      };
    });
  };

  const exportApprovedProductsToExcel = () => {
    const data = prepareApprovedProductsExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Approved Products');
    XLSX.writeFile(wb, 'approved-products.xlsx');
  };

  const exportApprovedProductsToCSV = () => {
    const data = prepareApprovedProductsExportData();
    exportToCSV(data, 'approved-products.csv');
  };

  const exportApprovedProductsToGoogleSheets = () => {
    const data = prepareApprovedProductsExportData();
    exportToGoogleSheets(data);
  };

  const printApprovedProducts = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const data = prepareApprovedProductsExportData();
    const totals = calculateApprovedTotals();

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Approved Products Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0.1in; /* Ultra-narrow margins */
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 9px; /* Smaller base font */
              line-height: 1.1; /* Tighter line spacing */
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 8px; /* Reduced margins */
              border-bottom: 1px solid #333; /* Thinner border */
              padding-bottom: 5px; /* Reduced padding */
            }
            .header h1 {
              font-size: 12px; /* Smaller title */
              margin: 2px 0; /* Reduced margins */
            }
            .header p {
              font-size: 8px; /* Smaller date */
              margin: 1px 0; /* Reduced margins */
            }
            .summary {
              display: flex;
              justify-content: space-around;
              margin-bottom: 8px; /* Reduced margins */
              padding: 4px; /* Reduced padding */
              background-color: #f5f5f5;
              border-radius: 3px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-label {
              font-weight: bold;
              display: block;
              font-size: 8px; /* Smaller labels */
            }
            .summary-value {
              font-size: 10px; /* Smaller values */
              margin-top: 2px; /* Reduced margin */
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px; /* Reduced margin */
              page-break-inside: avoid; /* Keep table on one page */
            }
            thead {
              display: table-header-group;
            }
            tbody {
              display: table-row-group;
            }
            tr {
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #333;
              padding: 2px; /* Minimal padding */
              text-align: left;
              vertical-align: top;
              word-wrap: break-word;
              font-size: 7px; /* Smaller table font */
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
            }
            .product-name {
              max-width: 200px;
              word-wrap: break-word;
            }
            .number {
              text-align: right;
            }
            .positive {
              color: #008000;
            }
            .negative {
              color: #ff0000;
            }
            .footer {
              margin-top: 5px; /* Reduced margin */
              text-align: center;
              font-size: 6px; /* Smaller footer font */
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Approved Products Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Products</span>
              <span class="summary-value">${totals.productCount}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Purchase Value</span>
              <span class="summary-value">R${totals.totalPurchaseCost}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Sales Value</span>
              <span class="summary-value">R${totals.totalSalesValue}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total GP</span>
              <span class="summary-value ${totals.totalMargin >= 0 ? 'positive' : 'negative'}">R${totals.totalMargin}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">All Prices Include VAT</span>
              <span class="summary-value">15%</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>ID</th>
                <th>Supplier</th>
                <th>Cost</th>
                <th>Promo Price</th>
                <th>Margin %</th>
                <th>Qty</th>
                <th>Total Value</th>
                <th>Total GP</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td class="product-name">${row['Product Name']}</td>
                  <td>${row['Brand']}</td>
                  <td>${row['Category']}</td>
                  <td>${row['Product ID']}</td>
                  <td>${row['Supplier']}</td>
                  <td class="number">R${row['Cost']}</td>
                  <td class="number">R${row['Promo Price']}</td>
                  <td class="number ${row['Margin %'] >= 0 ? 'positive' : 'negative'}">${row['Margin %']}%</td>
                  <td class="number">${row['Quantity']}</td>
                  <td class="number">R${row['Total Value']}</td>
                  <td class="number ${row['Total GP'] >= 0 ? 'positive' : 'negative'}">R${row['Total GP']}</td>
                  <td>${row['Approved Date']}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary" style="margin-top: 5px; page-break-inside: avoid;">
            <div class="summary-item">
              <span class="summary-label">Total Products</span>
              <span class="summary-value">${totals.productCount}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Purchase Value</span>
              <span class="summary-value">R${totals.totalPurchaseCost}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Sales Value</span>
              <span class="summary-value">R${totals.totalSalesValue}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total GP</span>
              <span class="summary-value ${totals.totalMargin >= 0 ? 'positive' : 'negative'}">R${totals.totalMargin}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">All Prices Include VAT</span>
              <span class="summary-value">15%</span>
            </div>
          </div>
          
          <div class="footer">
            <p>All prices include 15% VAT | Generated by Promotion Planner</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const prepareExportData = (plan: WeeklyPlan, viewMode: 'daily' | 'consolidated') => {
    if (viewMode === 'daily') {
      // For daily view, create separate sheets for each day
      const exportData: Record<string, unknown>[] = [];
      plan.days.forEach(day => {
        day.products.forEach(product => {
          const purchaseCost = product.purchase_cost || 0;
          const salePrice = product.custom_sale_price || product.five_percent_sale_price || product.regular_price || 0;
          const gpRandValue = Math.round(salePrice - purchaseCost);
          const gpPercentage = purchaseCost > 0 ? Math.round(((salePrice - purchaseCost) / salePrice) * 100) : 0;
          const quantity = expectedQuantity;
          const salesValue = Math.round(salePrice * quantity);
          const totalGP = Math.round(gpRandValue * quantity);

          exportData.push({
            'Day': abbreviateDayName(day.dayName),
            'Date': day.date.toLocaleDateString(),
            'Product ID': String(product.product_id || ''),
            'Name': String(product.product_name || ''),
            'Brand': String(product.brand || ''),
            'Supplier': String(product.supplier_name || ''),
            'Category': String(product.category || ''),
            'Purchase Cost': Math.round(purchaseCost),
            'Reg Price': Math.round(product.regular_price || 0),
            '5% Sale Price': Math.round(salePrice),
            'GP Rand Value': gpRandValue,
            'GP %': gpPercentage,
            'Quantity': quantity,
            'Sales Value': salesValue,
            'Total GP': totalGP,
            'Save': Math.round((product.regular_price || 0) - salePrice),
            'Views': Number(product.views || 0),
            'Stock Status': product.stock_status === 'instock' ? 'In Stock' : 
                    product.stock_status === 'outofstock' ? 'Out of Stock' : 
                    String(product.stock_status || '')
          });
        });
      });
      return exportData;
    } else {
      // For consolidated view, show all products with their featured days
      const allProducts = new Map();
      plan.days.forEach(day => {
        day.products.forEach(product => {
          if (!allProducts.has(product.product_id)) {
            allProducts.set(product.product_id, {
              ...product,
              featuredDays: new Set()
            });
          }
          allProducts.get(product.product_id).featuredDays.add(day.dayName);
        });
      });

      return Array.from(allProducts.values()).map(product => {
        const purchaseCost = product.purchase_cost || 0;
        const salePrice = product.custom_sale_price || product.five_percent_sale_price || product.regular_price || 0;
        const gpRandValue = Math.round(salePrice - purchaseCost);
        const gpPercentage = purchaseCost > 0 ? Math.round(((salePrice - purchaseCost) / salePrice) * 100) : 0;
        const quantity = expectedQuantity;
        const salesValue = Math.round(salePrice * quantity);
        const totalGP = Math.round(gpRandValue * quantity);

        return {
          'Product ID': String(product.product_id || ''),
          'Name': String(product.product_name || ''),
          'Brand': String(product.brand || ''),
          'Supplier': String(product.supplier_name || ''),
          'Category': String(product.category || ''),
          'Purchase Cost': Math.round(purchaseCost),
          'Reg Price': Math.round(product.regular_price || 0),
          '5% Sale Price': Math.round(salePrice),
          'GP Rand Value': gpRandValue,
          'GP %': gpPercentage,
          'Quantity': quantity,
          'Sales Value': salesValue,
          'Total GP': totalGP,
          'Save': Math.round((product.regular_price || 0) - salePrice),
          'Views': Number(product.views || 0),
          'Stock': product.stock_status === 'instock' ? 'In Stock' : 
                  product.stock_status === 'outofstock' ? 'Out of Stock' : 
                  String(product.stock_status || ''),
          'Day': Array.from(product.featuredDays as Set<string>).map(abbreviateDayName).join(', ')
        };
      });
    }
  };

  const prepareMonthlyExportData = (plan: MonthlyPlan) => {
    const exportData: Array<{
      week: number;
      day: string;
      date: string;
      product_id: string;
      product_name: string;
      brand: string;
      supplier_name: string;
      category: string;
      'Purchase Cost': number;
      'Reg Price': number;
      '5% Sale Price': number;
      'GP Rand Value': number;
      'GP %': number;
      'Quantity': number;
      'Sales Value': number;
      'Total GP': number;
      'Save': number;
      'Views': number;
      'Stock Status': string;
    }> = [];
    plan.weeks.forEach(week => {
      week.days.forEach(day => {
        day.products.forEach(product => {
          const purchaseCost = product.purchase_cost || 0;
          const salePrice = product.custom_sale_price || product.five_percent_sale_price || product.regular_price || 0;
          const gpRandValue = Math.round(salePrice - purchaseCost);
          const gpPercentage = purchaseCost > 0 ? Math.round(((salePrice - purchaseCost) / salePrice) * 100) : 0;
          const quantity = expectedQuantity;
          const salesValue = Math.round(salePrice * quantity);
          const totalGP = Math.round(gpRandValue * quantity);

          exportData.push({
            week: week.weekNumber,
            day: abbreviateDayName(day.dayName),
            date: day.date.toLocaleDateString(),
            product_id: String(product.product_id || ''),
            product_name: String(product.product_name || ''),
            brand: String(product.brand || ''),
            supplier_name: String(product.supplier_name || ''),
            category: String(product.category || ''),
            'Purchase Cost': Math.round(purchaseCost),
            'Reg Price': Math.round(product.regular_price || 0),
            '5% Sale Price': Math.round(salePrice),
            'GP Rand Value': gpRandValue,
            'GP %': gpPercentage,
            'Quantity': quantity,
            'Sales Value': salesValue,
            'Total GP': totalGP,
            'Save': Math.round((product.regular_price || 0) - salePrice),
            'Views': Number(product.views || 0),
            'Stock Status': product.stock_status === 'instock' ? 'In Stock' : 
                    product.stock_status === 'outofstock' ? 'Out of Stock' : 
                    String(product.stock_status || '')
          });
        });
      });
    });
    return exportData;
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

      {/* Backup System Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-charcoal">Backup System</h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Auto-save (30s)
                </label>
                {lastAutoSave && (
                  <span className="text-xs text-gray-500">
                    Last saved: {lastAutoSave.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={backupSessionId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    loadBackupSession(e.target.value);
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
                disabled={loading}
              >
                <option value="">Select Session</option>
                {availableSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} ({new Date(session.updated_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
              
              <button
                onClick={createNewBackupSession}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                New Session
              </button>
              
              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                Save Now
              </button>
              
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Manage
              </button>
            </div>
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

        {/* Current File Status - Show when file is loaded */}
        {products.length > 0 && lastUploadedFile && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Current File: {lastUploadedFile.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {products.length} products loaded • {uniqueCategories.length} categories available
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setProducts([]);
                      setUniqueCategories([]);
                      setUploadedFileName('');
                      setLastUploadedFile(null);
                      setWeeklyPlan(null);
                      setMonthlyPlan(null);
                      setDailyPlan(null);
                      setSuccess('File cleared. Upload a new file to continue.');
                      setTimeout(() => setSuccess(null), 3000);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      input.click();
                    }}
                    className="text-sm text-primary hover:text-pale-teal px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Load New File
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description Section - Only show if no products uploaded yet */}
        {products.length === 0 && (
          <div className="text-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-lg text-charcoal max-w-4xl mx-auto">
                Upload your product CSV file, then choose between daily, weekly or monthly planning modes.
                Daily mode generates a single day plan with 3 categories. Weekly mode generates plans for 7 days.
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
                      setDailyPlan(null);
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
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => setPlanningMode('daily')}
                  className={`px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    planningMode === 'daily'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  📋 Daily Planning
                </button>
                <button
                  onClick={() => setPlanningMode('weekly')}
                  className={`px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    planningMode === 'weekly'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  📅 Weekly Planning
                </button>
                <button
                  onClick={() => setPlanningMode('monthly')}
                  className={`px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
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

        {/* Daily Category Selector - Only show after CSV is processed and in daily mode */}
        {uniqueCategories.length > 0 && planningMode === 'daily' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Daily Category Selection</h3>
            <p className="text-sm text-gray-600 mb-6">
              Select 3 categories for your daily promotion plan. Each category will provide 3 products (9 products total).
            </p>
            
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  const availableCategories = ['Random', ...uniqueCategories];
                  const randomSelections: [string, string, string] = [
                    availableCategories[Math.floor(Math.random() * availableCategories.length)],
                    availableCategories[Math.floor(Math.random() * availableCategories.length)],
                    availableCategories[Math.floor(Math.random() * availableCategories.length)]
                  ];
                  const newSelections = [...dailySelections];
                  newSelections[0] = randomSelections;
                  setDailySelections(newSelections);
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-lg hover:bg-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🎲 Randomize All Categories
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[0, 1, 2].map((categoryIndex) => (
                <div key={categoryIndex}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category {categoryIndex + 1} (3 products)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={dailySelections[0][categoryIndex]}
                      onChange={(e) => {
                        const newSelections = [...dailySelections];
                        const dayCategories = [...newSelections[0]] as [string, string, string];
                        dayCategories[categoryIndex] = e.target.value;
                        newSelections[0] = dayCategories;
                        setDailySelections(newSelections);
                      }}
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="Random">🎲 Random Selection</option>
                      {uniqueCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const availableCategories = ['Random', ...uniqueCategories];
                        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
                        const newSelections = [...dailySelections];
                        const dayCategories = [...newSelections[0]] as [string, string, string];
                        dayCategories[categoryIndex] = randomCategory;
                        newSelections[0] = dayCategories;
                        setDailySelections(newSelections);
                      }}
                      disabled={loading}
                      className="px-3 py-2 text-xs font-medium text-accent bg-accent bg-opacity-10 border border-accent rounded hover:bg-accent hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Randomize this category"
                    >
                      🎲
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Daily Planning</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>• Select 3 categories for your daily promotion plan</p>
                    <p>• Each category will provide 3 products (9 products total)</p>
                    <p>• You can select the same category multiple times for variety</p>
                    <p>• Use &quot;Random&quot; to let the system choose any available product</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Planning Configuration - Only show after CSV is processed and in weekly mode */}
        {uniqueCategories.length > 0 && planningMode === 'weekly' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Weekly Planning Configuration</h3>
            
            {/* Number of Weeks Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many weeks do you want to plan for?
              </label>
              <select
                value={weeklyConfig.numberOfWeeks}
                onChange={(e) => handleNumberOfWeeksChange(parseInt(e.target.value))}
                disabled={loading}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Week' : 'Weeks'}
                  </option>
                ))}
              </select>
            </div>

          {/* Category and Product Configuration */}
            <div className="mb-6">
            <h4 className="text-md font-medium text-charcoal mb-4">Configure Categories and Products</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Categories
                </label>
                <select
                  value={weeklyCategoryConfig.numberOfCategories}
                  onChange={(e) => handleCategoryConfigChange('numberOfCategories', parseInt(e.target.value))}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Category' : 'Categories'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Products per Category
                </label>
                <select
                  value={weeklyCategoryConfig.productsPerCategory}
                  onChange={(e) => handleCategoryConfigChange('productsPerCategory', parseInt(e.target.value))}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30].map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Product' : 'Products'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total Products per Day:</strong> {weeklyCategoryConfig.numberOfCategories * weeklyCategoryConfig.productsPerCategory} products
                {weeklyConfig.numberOfWeeks > 1 && (
                  <span> • <strong>Total for {weeklyConfig.numberOfWeeks} weeks:</strong> {weeklyCategoryConfig.numberOfCategories * weeklyCategoryConfig.productsPerCategory * 7 * weeklyConfig.numberOfWeeks} products</span>
                )}
              </p>
            </div>
          </div>

          {/* Expected Sales Quantity Configuration */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-charcoal mb-4">Expected Sales Quantity</h4>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Quantity to Sell per Product
              </label>
              <input
                type="number"
                min="1"
                value={expectedQuantity}
                onChange={(e) => setExpectedQuantity(parseInt(e.target.value) || 1)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to calculate total sales value and total GP in exports
              </p>
            </div>
          </div>

            {/* Week Date Ranges and Target GP Margins */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-charcoal mb-4">Set Date Ranges and Target GP Margins for Each Week</h4>
              <div className="space-y-4">
                {weeklyConfig.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="text-sm font-medium text-charcoal mb-3">Week {weekIndex + 1}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={dateInputs[`startDate_${weekIndex}`] || formatDateToYYMMDD(week.startDate)}
                          onChange={(e) => {
                            const value = e.target.value;
                            const inputKey = `startDate_${weekIndex}`;
                            
                            // Update local state for immediate display
                            setDateInputs(prev => ({
                              ...prev,
                              [inputKey]: value
                            }));
                            
                            // If complete pattern, update main state
                            if (value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                              const [year, month, day] = value.split('/');
                              const fullYear = `20${year}`;
                              const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                              handleWeekDateChange(weekIndex, 'startDate', formattedDate);
                            } else if (value === '') {
                              handleWeekDateChange(weekIndex, 'startDate', '');
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            const inputKey = `startDate_${weekIndex}`;
                            
                            if (value && !value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                              // Invalid format on blur - clear both local and main state
                              setDateInputs(prev => {
                                const newInputs = { ...prev };
                                delete newInputs[inputKey];
                                return newInputs;
                              });
                              handleWeekDateChange(weekIndex, 'startDate', '');
                            }
                          }}
                          disabled={loading}
                          placeholder="yy/mm/dd"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="text"
                          value={dateInputs[`endDate_${weekIndex}`] || formatDateToYYMMDD(week.endDate)}
                          onChange={(e) => {
                            const value = e.target.value;
                            const inputKey = `endDate_${weekIndex}`;
                            
                            // Update local state for immediate display
                            setDateInputs(prev => ({
                              ...prev,
                              [inputKey]: value
                            }));
                            
                            // If complete pattern, update main state
                            if (value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                              const [year, month, day] = value.split('/');
                              const fullYear = `20${year}`;
                              const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                              handleWeekDateChange(weekIndex, 'endDate', formattedDate);
                            } else if (value === '') {
                              handleWeekDateChange(weekIndex, 'endDate', '');
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            const inputKey = `endDate_${weekIndex}`;
                            
                            if (value && !value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                              // Invalid format on blur - clear both local and main state
                              setDateInputs(prev => {
                                const newInputs = { ...prev };
                                delete newInputs[inputKey];
                                return newInputs;
                              });
                              handleWeekDateChange(weekIndex, 'endDate', '');
                            }
                          }}
                          disabled={loading}
                          placeholder="yy/mm/dd"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Target GP Margin (%)
                        </label>
                        <input
                          type="number"
                          value={week.targetGPMargin === 0 ? '' : week.targetGPMargin || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              handleWeekGPMarginChange(weekIndex, 0);
                            } else {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue)) {
                                handleWeekGPMarginChange(weekIndex, numValue);
                              }
                            }
                          }}
                          disabled={loading}
                          placeholder="0"
                          min="-100"
                          max="100"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {week.targetGPMargin && week.targetGPMargin < 0 ? 'Negative margin allowed for loss-leader strategies' : 'Enter desired GP margin percentage'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Selection for Each Week */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-charcoal mb-4">Select Categories for Each Week</h4>
              <div className="space-y-4">
                {weeklyConfig.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-charcoal mb-3">
                      Week {weekIndex + 1} - {week.startDate && week.endDate ? 
                        `${new Date(week.startDate).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '')} to ${new Date(week.endDate).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '')}` : 
                        'Set dates above'
                      }
                      {week.targetGPMargin !== undefined && (
                        <span className="ml-2 text-xs font-normal text-gray-600">
                          (Target GP: {week.targetGPMargin}%)
                        </span>
                      )}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Array.from({ length: weeklyCategoryConfig.numberOfCategories }, (_, categoryIndex) => (
                        <div key={categoryIndex}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Category {categoryIndex + 1} ({weeklyCategoryConfig.productsPerCategory} products)
                          </label>
                          <select
                            value={weeklySelections[weekIndex]?.[categoryIndex] || 'Random'}
                            onChange={(e) => {
                              const newSelections = [...weeklySelections];
                              if (!newSelections[weekIndex]) {
                                newSelections[weekIndex] = Array(weeklyCategoryConfig.numberOfCategories).fill('Random');
                              }
                              // Ensure the array has the right length
                              while (newSelections[weekIndex].length < weeklyCategoryConfig.numberOfCategories) {
                                newSelections[weekIndex].push('Random');
                              }
                              newSelections[weekIndex][categoryIndex] = e.target.value;
                              setWeeklySelections(newSelections);
                            }}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="Random">🎲 Random Selection</option>
                            {uniqueCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Flexible Weekly Planning</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>• Choose any number of weeks (1-8 weeks)</p>
                  <p>• Configure number of categories (1-10) and products per category (1-30)</p>
                    <p>• Set custom start and end dates for each week period</p>
                  <p>• Set individual target GP margins for each week (including negative margins for loss-leader strategies)</p>
                    <p>• Perfect for irregular periods like 8-day weeks or custom promotional periods</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Plan Button Section */}
        {uniqueCategories.length > 0 && !loading && (
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-pale-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <>
                    {planningMode === 'daily' && '📋 Generate Daily Plan'}
                    {planningMode === 'weekly' && '📅 Generate Weekly Plan'}
                    {planningMode === 'monthly' && '🗓️ Generate Monthly Plan'}
                  </>
                )}
              </button>

              {/* Error and Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Success</h3>
                      <p className="text-sm text-green-700 mt-1">{success}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Plan Display */}
        {dailyPlan && (
          <div className="mb-8 daily-plan-container">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-charcoal border-b border-gray-200 flex justify-between items-center daily-plan-header">
                <div>
                  <h2 className="text-xl font-semibold text-white daily-plan-title">
                    Daily Promotion Plan
                  </h2>
                  <p className="text-sm text-light-grey mt-1 daily-plan-date">
                    {dailyPlan.dayName} - {new Date(dailyPlan.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3 no-print">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-light-orange transition-colors"
                    title="Print daily plan"
                  >
                    🖨️ Print Plan
                  </button>
                  <button
                    onClick={() => setIsAddProductOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-pale-teal transition-colors"
                    title="Add individual products"
                  >
                    ➕ Add Products Individually
                  </button>
                  <button
                    onClick={() => {
                      setDailyPlan(null);
                      setSuccess('Daily plan cleared. Select new categories to generate another plan.');
                      setTimeout(() => setSuccess(null), 3000);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    title="Clear daily plan"
                  >
                    🔄 New Plan
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-max divide-y divide-gray-200 daily-plan-table">
                  <thead className="bg-light-grey">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-id">
                        Product ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-name">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-brand">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-supplier">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-category">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-price">
                        Reg Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-accent uppercase tracking-wider font-bold daily-print-col-sale">
                        5% Sale Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-save">
                        Save
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-views">
                        Views
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-stock">
                        Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dailyPlan.products.map((product, productIndex) => (
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
                        <td className="px-4 py-4 text-sm text-accent font-bold">
                          R{Math.round(product.five_percent_sale_price || 0)}
                        </td>
                        <td className="px-4 py-4 text-sm text-charcoal font-medium">
                          R{Math.round(product.regular_price - (product.five_percent_sale_price || 0))}
                        </td>
                        <td className="px-4 py-4 text-sm text-charcoal">
                          {product.views}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.stock_status === 'instock'
                              ? 'bg-green-100 text-green-800'
                              : product.stock_status === 'outofstock'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.stock_status === 'instock' ? 'In Stock' : 
                             product.stock_status === 'outofstock' ? 'Out of Stock' : 
                             product.stock_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {dailyPlan.products.length === 0 && (
                <div className="px-6 py-4 text-center text-gray-500">
                  No products available for this day
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Promotion Table - Only show if monthly plan is generated */}
        {monthlyPlan && (
          <div>
          <MonthlyPromotionTable
            monthlyPlan={monthlyPlan}
            onPriceChange={handleMonthlyPriceChange}
            onReplaceProduct={handleReplaceMonthlyProduct}
          />
            
            {/* Monthly Plan Export Options */}
            <div className="mt-4 bg-white rounded-lg shadow-lg p-6">
              <h4 className="text-lg font-semibold text-charcoal mb-4">Export Monthly Plan</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const data = prepareMonthlyExportData(monthlyPlan);
                    const filename = `monthly-promotion-plan-${new Date().toISOString().split('T')[0]}.csv`;
                    exportToCSV(data, filename);
                  }}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={() => {
                    const data = prepareMonthlyExportData(monthlyPlan);
                    const filename = `monthly-promotion-plan-${new Date().toISOString().split('T')[0]}.xlsx`;
                    exportToExcel(data, filename);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📈 Export Excel
                </button>
                <button
                  onClick={() => {
                    const data = prepareMonthlyExportData(monthlyPlan);
                    exportToGoogleSheets(data);
                  }}
                  className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                >
                  📋 Open in Google Sheets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ad-Hoc Plan Section */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-charcoal">Ad-Hoc Product Analysis</h3>
                <p className="text-sm text-gray-600">
                  Analyze multiple products with VAT calculations ({adHocPlan.products.length}/{adHocPlan.maxProducts} products)
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Max Products:</div>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={adHocPlan.maxProducts}
                  onChange={(e) => setAdHocPlan(prev => ({ ...prev, maxProducts: parseInt(e.target.value) || 30 }))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                />
              </div>
            </div>
            
            {/* Add Product Section */}
            <div className="mb-6">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adHocPlan.currentProductId}
                    onChange={(e) => setAdHocPlan(prev => ({ ...prev, currentProductId: e.target.value }))}
                    placeholder="Enter Product ID"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleAdHocProductLookup}
                    disabled={!adHocPlan.currentProductId.trim() || !products.length || adHocPlan.products.length >= adHocPlan.maxProducts}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-pale-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Product
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  All prices include 15% VAT (South African standard rate)
                </p>
              </div>
            </div>

            {/* Products List */}
            {adHocPlan.products.length > 0 && (
              <div className="space-y-4">
                {/* Total Summary - Only for Approved Products */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-charcoal mb-3">Total Summary (Approved Products Only)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Total Products:</span>
                      <p className="text-lg font-semibold text-purple-600">{adHocPlan.approvedProducts.length}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Total Sales Value:</span>
                      <p className="text-lg font-semibold text-blue-600">R{adHocPlan.approvedProducts.length > 0 ? calculateApprovedTotals().totalSalesValue : 0}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Total GP:</span>
                      <p className={`text-lg font-semibold ${adHocPlan.approvedProducts.length > 0 && calculateApprovedTotals().totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R{adHocPlan.approvedProducts.length > 0 ? calculateApprovedTotals().totalMargin : 0}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">All Prices Include VAT:</span>
                      <p className="text-lg font-semibold text-orange-600">15%</p>
                    </div>
                  </div>
                </div>

                {/* Analysis Products Summary */}
                {adHocPlan.products.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-charcoal mb-3">Analysis Products ({adHocPlan.products.length} products being analyzed)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Products in Analysis:</span>
                        <p className="text-lg font-semibold text-blue-600">{adHocPlan.products.length}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total Sales Value:</span>
                        <p className="text-lg font-semibold text-blue-600">R{calculateAdHocTotals().totalSalesValue}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total GP:</span>
                        <p className={`text-lg font-semibold ${calculateAdHocTotals().totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R{calculateAdHocTotals().totalMargin}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">All Prices Include VAT:</span>
                        <p className="text-lg font-semibold text-orange-600">15%</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      💡 These products are being analyzed. Click &quot;Approve&quot; to add them to your approved products table below.
                    </p>
                  </div>
                )}

                {/* Individual Products */}
                {adHocPlan.products.map((productData, productIndex) => {
                  if (!productData.product) return null;
                  
                  const calculations = calculateAdHocMargins(productData);
                  if (!calculations) return null;

                  return (
                    <div key={productData.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-medium text-charcoal">
                          Product {productIndex + 1}: {productData.product.product_name}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveAdHocProduct(productData.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => removeAdHocProduct(productData.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Product Information */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-charcoal mb-2">Product Info</h5>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">ID:</span> {productData.productId}</p>
                            <p><span className="font-medium">Supplier:</span> {productData.product.supplier_name}</p>
                            <p><span className="font-medium">Brand:</span> {productData.product.brand}</p>
                            <p><span className="font-medium">Category:</span> {productData.product.category}</p>
                          </div>
                        </div>

                        {/* Current Pricing */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h5 className="font-medium text-charcoal mb-2">Current Pricing</h5>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Purchase Cost:</span> R{Math.round(calculations.purchaseCost)}</p>
                            <p><span className="font-medium">Regular Price:</span> R{Math.round(calculations.regularPrice)}</p>
                            <p><span className="font-medium">Current Sale:</span> R{Math.round(calculations.currentSalePrice)}</p>
                            <p><span className="font-medium">Current Margin:</span> R{Math.round(calculations.currentMargin)} ({Math.round(calculations.currentMarginPercent)}%)</p>
                            <p><span className="font-medium">Page Views:</span> {productData.product.views || 0}</p>
                            <p><span className="font-medium">Stock Status:</span> 
                              <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                                productData.product.stock_status === 'instock' 
                                  ? 'bg-green-100 text-green-800' 
                                  : productData.product.stock_status === 'outofstock'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {productData.product.stock_status === 'instock' ? 'In Stock' :
                                 productData.product.stock_status === 'outofstock' ? 'Out of Stock' :
                                 productData.product.stock_status || 'Unknown'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Target Pricing Inputs */}
                      <div className="mt-4 bg-green-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-charcoal">Target Pricing</h5>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateAdHocProduct(productData.id, 'inputMode', 'price')}
                              className={`px-3 py-1 text-xs rounded ${
                                productData.inputMode === 'price' 
                                  ? 'bg-primary text-white' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Set Price
                            </button>
                            <button
                              onClick={() => updateAdHocProduct(productData.id, 'inputMode', 'margin')}
                              className={`px-3 py-1 text-xs rounded ${
                                productData.inputMode === 'margin' 
                                  ? 'bg-primary text-white' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Set Margin
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {productData.inputMode === 'price' ? (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Target Price (Incl. VAT)
                              </label>
                                                          <input
                              type="number"
                              step="1"
                              value={productData.targetPrice || ''}
                              onChange={(e) => updateAdHocProduct(productData.id, 'targetPrice', Math.round(parseFloat(e.target.value) || 0))}
                              placeholder="Enter target price"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Target Margin (%)
                              </label>
                              <input
                                type="number"
                                step="1"
                                value={productData.targetMargin || ''}
                                onChange={(e) => updateAdHocProduct(productData.id, 'targetMargin', Math.round(parseFloat(e.target.value) || 0))}
                                placeholder="Enter target margin %"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={productData.quantity}
                              onChange={(e) => updateAdHocProduct(productData.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Target Price (Incl. VAT)
                            </label>
                            <div className="px-2 py-1 bg-gray-100 rounded text-sm text-charcoal">
                              {productData.targetPrice > 0 ? `R${Math.round(productData.targetPrice)}` : 'Enter price first'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {productData.inputMode === 'price' ? 'Calculated Margin (%)' : 'Calculated Price (Incl. VAT)'}
                            </label>
                            <div className="px-2 py-1 bg-gray-100 rounded text-sm text-charcoal">
                              {productData.inputMode === 'price' 
                                ? (productData.targetPrice > 0 ? `${Math.round(calculations.targetMarginPercent)}%` : 'Enter price first')
                                : (productData.targetMargin > 0 ? `R${Math.round(productData.targetPrice)}` : 'Enter margin first')
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Margin Analysis Results */}
                      {productData.targetPrice > 0 && (
                        <div className="mt-4 bg-yellow-50 rounded-lg p-3">
                          <h5 className="font-medium text-charcoal mb-3">Margin Analysis</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Target Margin (R):</span>
                              <p className={`font-semibold ${calculations.targetMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R{Math.round(calculations.targetMargin)}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Target Margin (%):</span>
                              <p className={`font-semibold ${calculations.targetMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.round(calculations.targetMarginPercent)}%
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total Sales Value:</span>
                              <p className="font-semibold text-blue-600">
                                R{Math.round(calculations.totalSalesValue)}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total GP:</span>
                              <p className={`font-semibold ${calculations.totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R{Math.round(calculations.totalMargin)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            <p>All prices include 15% VAT | Sales Value: R{Math.round(calculations.totalSalesValue)}</p>
                          </div>
                        </div>
                      )}
                      
                      {productData.targetPrice === 0 && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-600 text-center">
                            Enter a target price or margin to see margin analysis
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Approved Products Table */}
            {adHocPlan.approvedProducts.length > 0 && (
              <div className="mt-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-charcoal">Approved Products</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={printApprovedProducts}
                        className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        🖨️ Print PDF
                      </button>
                      <button
                        onClick={exportApprovedProductsToExcel}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📈 Export Excel
                      </button>
                      <button
                        onClick={exportApprovedProductsToCSV}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        📄 Export CSV
                      </button>
                      <button
                        onClick={exportApprovedProductsToGoogleSheets}
                        className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        📋 Open in Google Sheets
                      </button>
                    </div>
                  </div>
                  
                  {/* Approved Products Summary */}
                  <div className="bg-green-50 rounded-lg p-4 mb-6">
                    <h4 className="text-lg font-medium text-charcoal mb-3">Approved Products Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Approved Products:</span>
                        <p className="text-lg font-semibold text-green-600">{calculateApprovedTotals().productCount}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total Purchase Value:</span>
                        <p className="text-lg font-semibold text-purple-600">R{calculateApprovedTotals().totalPurchaseCost}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total Sales Value:</span>
                        <p className="text-lg font-semibold text-blue-600">R{calculateApprovedTotals().totalSalesValue}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total GP:</span>
                        <p className={`text-lg font-semibold ${calculateApprovedTotals().totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R{calculateApprovedTotals().totalMargin}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">All Prices Include VAT:</span>
                        <p className="text-lg font-semibold text-orange-600">15%</p>
                      </div>
                    </div>
                  </div>

                  {/* Approved Products Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promo Price</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty (Editable)</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total GP</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adHocPlan.approvedProducts.map((approvedProduct) => {
                          // All prices already include VAT - no need to strip VAT
                          const purchaseCost = approvedProduct.product.purchase_cost || 0; // Already includes VAT
                          const targetMargin = approvedProduct.targetPrice - purchaseCost; // Direct calculation since all prices include VAT
                          const totalValue = approvedProduct.targetPrice * approvedProduct.quantity;
                          const totalGP = targetMargin * approvedProduct.quantity;
                          const marginPercent = approvedProduct.targetPrice > 0 ? Math.round(((targetMargin) / approvedProduct.targetPrice) * 100) : 0;

                          return (
                            <tr key={approvedProduct.id} className="hover:bg-gray-50">
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-charcoal max-w-xs truncate">
                                  {approvedProduct.product.product_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {approvedProduct.product.brand} - {approvedProduct.product.category}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {approvedProduct.productId}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {approvedProduct.product.supplier_name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                R{Math.round(purchaseCost)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={approvedProduct.targetPrice || ''}
                                  onChange={(e) => updateApprovedProductPrice(approvedProduct.id, Math.round(parseFloat(e.target.value) || 0))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                />
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm">
                                <span className={`font-medium ${marginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {marginPercent}%
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="number"
                                  min="1"
                                  value={approvedProduct.quantity}
                                  onChange={(e) => updateApprovedProductQuantity(approvedProduct.id, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                />
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                                R{Math.round(totalValue)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm">
                                <span className={`font-medium ${totalGP >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R{Math.round(totalGP)}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {approvedProduct.approvedAt.toLocaleDateString()}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => removeApprovedProduct(approvedProduct.id)}
                                  className="text-red-600 hover:text-red-800"
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan View Selection */}
        {weeklyPlan && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Plan View Options</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="planView"
                    value="daily"
                    checked={planViewMode === 'daily'}
                    onChange={(e) => setPlanViewMode(e.target.value as 'daily' | 'consolidated')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Day-by-Day View</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="planView"
                    value="consolidated"
                    checked={planViewMode === 'consolidated'}
                    onChange={(e) => setPlanViewMode(e.target.value as 'daily' | 'consolidated')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Consolidated View (All Products for Period)</span>
                </label>
              </div>
              
              {/* Export Options */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Export Options</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const data = prepareExportData(weeklyPlan, planViewMode);
                      const filename = `promotion-plan-${planViewMode}-${new Date().toISOString().split('T')[0]}.csv`;
                      exportToCSV(data, filename);
                    }}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📊 Export CSV
                  </button>
                  <button
                    onClick={() => {
                      const data = prepareExportData(weeklyPlan, planViewMode);
                      const filename = `promotion-plan-${planViewMode}-${new Date().toISOString().split('T')[0]}.xlsx`;
                      exportToExcel(data, filename);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📈 Export Excel
                  </button>
                  <button
                    onClick={() => {
                      const data = prepareExportData(weeklyPlan, planViewMode);
                      exportToGoogleSheets(data);
                    }}
                    className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    📋 Open in Google Sheets
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Table - Only show if weekly plan is generated and daily view is selected */}
        {weeklyPlan && planViewMode === 'daily' && (
          <div>
          <PromotionTable
            weeklyPlan={weeklyPlan}
            onPriceChange={handleWeeklyPriceChange}
            onReplaceProduct={handleReplaceWeeklyProduct}
          />
            
            {/* Action buttons for weekly plan */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-pale-teal transition-colors"
                title="Add individual products to the weekly plan"
              >
                ➕ Add Products Individually
              </button>
            </div>
          </div>
        )}

        {/* Consolidated Weekly Plan Display */}
        {weeklyPlan && planViewMode === 'consolidated' && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4">
                Consolidated Weekly Promotion Plan
              </h3>
              <div className="mb-4 text-sm text-gray-600">
                Period: {weeklyPlan.startDate.toLocaleDateString()} - {weeklyPlan.endDate.toLocaleDateString()}
              </div>
              
              {/* Consolidated Product Table - Same format as day-by-day view */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-max divide-y divide-gray-200 daily-plan-table">
                  <thead className="bg-light-grey">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-id">
                        Product ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-name">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-brand">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-supplier">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-category">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-price">
                        Reg Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-accent uppercase tracking-wider font-bold daily-print-col-sale">
                        5% Sale Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-save">
                        Save
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-views">
                        Views
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider daily-print-col-stock">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-charcoal uppercase tracking-wider">
                        Day
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      // Collect all unique products from all days
                      const allProducts = new Map();
                      weeklyPlan.days.forEach(day => {
                        day.products.forEach(product => {
                          if (!allProducts.has(product.product_id)) {
                            allProducts.set(product.product_id, {
                              ...product,
                              featuredDays: new Set()
                            });
                          }
                          allProducts.get(product.product_id).featuredDays.add(day.dayName);
                        });
                      });
                      
                      return Array.from(allProducts.values()).map((product, productIndex) => (
                        <tr 
                          key={product.product_id} 
                          onClick={() => handleReplaceConsolidatedProduct(product.product_id)}
                          className={`hover:bg-pale-teal hover:bg-opacity-20 cursor-pointer transition-colors ${
                            productIndex % 2 === 0 ? 'bg-white' : 'bg-light-grey'
                          }`}
                          title="Click to replace this product"
                        >
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
                          <td className="px-4 py-4 text-sm text-accent font-bold">
                            R{Math.round(product.custom_sale_price || product.five_percent_sale_price || product.regular_price)}
                            {product.custom_sale_price && (
                              <div className="text-xs text-gray-500">
                                Custom GP: {product.custom_gp_percentage}%
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-charcoal font-medium">
                            R{Math.round(product.regular_price - (product.custom_sale_price || product.five_percent_sale_price || product.regular_price))}
                          </td>
                          <td className="px-4 py-4 text-sm text-charcoal">
                            {product.views}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.stock_status === 'instock'
                                ? 'bg-green-100 text-green-800'
                                : product.stock_status === 'outofstock'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.stock_status === 'instock' ? 'In Stock' : 
                               product.stock_status === 'outofstock' ? 'Out of Stock' : 
                               product.stock_status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-charcoal">
                            {Array.from(product.featuredDays as Set<string>).map(abbreviateDayName).join(', ')}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Product Replacement Modal */}
        {replacementModal.isOpen && replacementModal.productToReplace && (
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
        {categoryAlternativeModal.isOpen && (
          <CategoryAlternativeModal
            isOpen={categoryAlternativeModal.isOpen}
            emptyCategories={categoryAlternativeModal.emptyCategories}
            insufficientCategories={categoryAlternativeModal.insufficientCategories}
            availableByCategory={categoryAlternativeModal.availableByCategory}
            alternatives={categoryAlternativeModal.alternatives}
            onConfirm={handleCategoryAlternativeConfirm}
            onCancel={handleCategoryAlternativeCancel}
          />
        )}

        {/* Modal: Add individual products */}
        {(dailyPlan || weeklyPlan) && (
          <ProductSearchModal
            isOpen={isAddProductOpen}
            allProducts={products}
            excludedProductIds={new Set([
              ...(dailyPlan?.products.map(p => p.product_id) || []),
              ...(weeklyPlan?.days.flatMap(day => day.products.map(p => p.product_id)) || [])
            ])}
            onAddProduct={(p) => { 
              if (dailyPlan) {
                handleAddIndividualProduct(p);
              } else if (weeklyPlan) {
                handleAddIndividualProductToWeekly(p);
              }
              setIsAddProductOpen(false); 
            }}
            onClose={() => setIsAddProductOpen(false)}
          />
        )}

        {/* Backup Management Modal */}
        {isBackupModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-charcoal">Backup Session Management</h2>
                <button
                  onClick={() => setIsBackupModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-charcoal mb-2">Available Sessions</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          backupSessionId === session.id
                            ? 'border-primary bg-primary bg-opacity-10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setBackupSessionId(session.id);
                          setActiveSession(session.id);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-charcoal">{session.session_name}</h4>
                            <p className="text-sm text-gray-600">{session.description}</p>
                            <p className="text-xs text-gray-500">
                              Created: {new Date(session.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(session.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadBackupSession(session.id);
                              }}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              disabled={loading}
                            >
                              Load
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                                  // TODO: Implement delete session
                                  console.log('Delete session:', session.id);
                                }
                              }}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {availableSessions.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No backup sessions found</p>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <button
                    onClick={createNewBackupSession}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                    disabled={loading}
                  >
                    Create New Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Promotion Modal */}
        <SavePromotionModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSavePromotion}
          planningMode={planningMode}
        />
      </div>
    </div>
  );
}