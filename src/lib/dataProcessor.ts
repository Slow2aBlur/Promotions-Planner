import Papa from 'papaparse';
import { Product, PromotionRecord, WeeklyPlan, DayPlan, MonthlyPlan, DailyCategorySelections, WeeklyCategorySelections } from './types';
import { getNextSevenDays, getMonthlyWeeks, getCurrentMonthYear } from '@/utils/dateUtils';

// CSV parsing and product enrichment
export async function processProductCSV(file: File): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const products: Product[] = (results.data as Record<string, string>[])
            .filter((row: Record<string, string>) => {
              // Only include published products
              const postStatus = row.post_status || '';
              return postStatus.toLowerCase() === 'publish';
            })
            .map((row: Record<string, string>) => {
              // Transform headers to match Product interface
              const product: Product = {
                product_id: row.ID || row.id || '',
                product_name: row.post_title || row.name || '',
                supplier_name: row._supplier_name || row.supplier_name || '',
                brand: row.product_brand || row.brand || '',
                regular_price: parseFloat(row._regular_price || row.regular_price || '0'),
                sale_price: parseFloat(row._sale_price || row.sale_price || '0'),
                purchase_cost: parseFloat(row.purchase_price || row.purchase_cost || '0'),
                category: (row.product_cat || row.category || '').toString().trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
                views: parseInt(row.ekit_post_views_count || row.views || '0', 10),
                stock_status: (row._stock_status || row.stock_status || row._stock || row.stock || 'instock').toString().toLowerCase().trim()
              };

              // Calculate additional fields
              if (product.regular_price > 0 && product.purchase_cost > 0) {
                product.regular_gp_percentage = ((product.regular_price - product.purchase_cost) / product.regular_price) * 100;
                product.five_percent_sale_price = product.purchase_cost / 0.95;
              }

              return product;
            })
            .filter(product => product.product_id && product.product_name); // Filter out invalid rows

          resolve(products);
        } catch (error) {
          reject(new Error(`Error processing CSV: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`Error parsing CSV: ${error.message}`));
      }
    });
  });
}

// Helper function to replace a product in a plan with an alternative
export function replaceProductInPlan(
  plan: WeeklyPlan | MonthlyPlan,
  dayIndex: number,
  productIndex: number,
  allProducts: Product[],
  isMonthly: boolean = false,
  weekIndex?: number
): WeeklyPlan | MonthlyPlan {
  const planCopy = JSON.parse(JSON.stringify(plan)) as typeof plan;
  
  // Get the product to replace
  let targetDay;
  let usedProductIds: Set<string>;
  
  if (isMonthly && weekIndex !== undefined) {
    const monthlyPlan = planCopy as MonthlyPlan;
    targetDay = monthlyPlan.weeks[weekIndex].days[dayIndex];
    
    // Collect all used product IDs across the entire month
    usedProductIds = new Set<string>();
    monthlyPlan.weeks.forEach(week => {
      week.days.forEach(day => {
        day.products.forEach(product => {
          usedProductIds.add(product.product_id);
        });
      });
    });
  } else {
    const weeklyPlan = planCopy as WeeklyPlan;
    targetDay = weeklyPlan.days[dayIndex];
    
    // Collect all used product IDs across the week
    usedProductIds = new Set<string>();
    weeklyPlan.days.forEach(day => {
      day.products.forEach(product => {
        usedProductIds.add(product.product_id);
      });
    });
  }
  
  const productToReplace = targetDay.products[productIndex];
  
  // Remove the product being replaced from the used set
  usedProductIds.delete(productToReplace.product_id);
  
  // Apply business rules filtering to available products
  const businessRuleFilteredProducts = filterEligibleProducts(allProducts);
  
  // Find eligible products from the same category
  const eligibleProducts = businessRuleFilteredProducts.filter(product => 
    product.category === productToReplace.category &&
    !usedProductIds.has(product.product_id) &&
    product.product_id !== productToReplace.product_id
  );
  
  // Sort by views (descending) and take the top candidate
  eligibleProducts.sort((a, b) => b.views - a.views);
  
  if (eligibleProducts.length > 0) {
    // Replace with the top alternative
    targetDay.products[productIndex] = eligibleProducts[0];
  } else {
    // If no alternatives in same category, try any category
    const anyEligibleProducts = businessRuleFilteredProducts.filter(product => 
      !usedProductIds.has(product.product_id) &&
      product.product_id !== productToReplace.product_id
    );
    
    anyEligibleProducts.sort((a, b) => b.views - a.views);
    
    if (anyEligibleProducts.length > 0) {
      targetDay.products[productIndex] = anyEligibleProducts[0];
    }
  }
  
  return planCopy;
}

// Helper function to calculate GP% based on sale price
export function calculateGPPercentage(salePrice: number, purchaseCost: number): number {
  if (salePrice <= 0) return 0;
  return ((salePrice - purchaseCost) / salePrice) * 100;
}

// Helper function to filter products based on business rules
export function filterEligibleProducts(products: Product[]): Product[] {
  return products.filter(product => {
    // Must have regular price of R199 or more
    if (product.regular_price < 199) {
      return false;
    }
    
    // Views can be 0 or more (no minimum requirement)
    // Stock status: Allow all stock statuses (including out of stock)
    // Out of stock items will be flagged with visual indicators
    // Already filtered for published products in CSV processing
    
    return true;
  });
}

// Helper function to validate category availability for daily selections
export function validateDailyCategoryAvailability(
  products: Product[], 
  dailySelections: DailyCategorySelections
): { valid: boolean, emptyCategories: string[], availableByCategory: Record<string, number>, insufficientCategories: string[] } {
  const eligibleProducts = filterEligibleProducts(products);
  const availableByCategory: Record<string, number> = {};
  const emptyCategories: string[] = [];
  const insufficientCategories: string[] = [];
  
  // Count available products by category
  eligibleProducts.forEach(product => {
    const category = product.category;
    availableByCategory[category] = (availableByCategory[category] || 0) + 1;
  });
  
  // Count how many times each category is selected across all days
  const categorySelectionCount: Record<string, number> = {};
  dailySelections.forEach(daySelections => {
    daySelections.forEach(category => {
      if (category !== 'Random') {
        categorySelectionCount[category] = (categorySelectionCount[category] || 0) + 1;
      }
    });
  });
  
  // Check each unique selected category
  Object.entries(categorySelectionCount).forEach(([category, selectionCount]) => {
    const availableCount = availableByCategory[category] || 0;
    const requiredCount = selectionCount * 3; // Each selection needs 3 products
    
    if (availableCount === 0) {
      if (!emptyCategories.includes(category)) {
        emptyCategories.push(category);
      }
    } else if (availableCount < requiredCount) {
      if (!insufficientCategories.includes(category)) {
        insufficientCategories.push(category);
      }
    }
  });
  
  return {
    valid: emptyCategories.length === 0 && insufficientCategories.length === 0,
    emptyCategories,
    availableByCategory,
    insufficientCategories
  };
}

// Helper function to validate category availability for weekly selections
export function validateWeeklyCategoryAvailability(
  products: Product[], 
  weeklySelections: WeeklyCategorySelections
): { valid: boolean, emptyCategories: string[], availableByCategory: Record<string, number>, insufficientCategories: string[] } {
  const eligibleProducts = filterEligibleProducts(products);
  const availableByCategory: Record<string, number> = {};
  const emptyCategories: string[] = [];
  const insufficientCategories: string[] = [];
  
  // Count available products by category
  eligibleProducts.forEach(product => {
    const category = product.category;
    availableByCategory[category] = (availableByCategory[category] || 0) + 1;
  });
  
  // Count how many times each category is selected across all weeks (each week = 7 days)
  const categorySelectionCount: Record<string, number> = {};
  weeklySelections.forEach(weekSelections => {
    weekSelections.forEach(category => {
      if (category !== 'Random') {
        // Each category selection in a week needs 21 products (3 per day × 7 days)
        categorySelectionCount[category] = (categorySelectionCount[category] || 0) + 21;
      }
    });
  });
  
  // Check each unique selected category
  Object.entries(categorySelectionCount).forEach(([category, requiredCount]) => {
    const availableCount = availableByCategory[category] || 0;
    
    if (availableCount === 0) {
      if (!emptyCategories.includes(category)) {
        emptyCategories.push(category);
      }
    } else if (availableCount < requiredCount) {
      if (!insufficientCategories.includes(category)) {
        insufficientCategories.push(category);
      }
    }
  });
  
  return {
    valid: emptyCategories.length === 0 && insufficientCategories.length === 0,
    emptyCategories,
    availableByCategory,
    insufficientCategories
  };
}

// Helper function to get alternative categories with product counts
export function getAlternativeCategories(
  products: Product[], 
  excludeCategories: string[] = []
): Array<{ category: string, count: number }> {
  const eligibleProducts = filterEligibleProducts(products);
  const categoryCount: Record<string, number> = {};
  
  eligibleProducts.forEach(product => {
    const category = product.category;
    if (!excludeCategories.includes(category)) {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  });
  
  return Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

// Helper function to get stock status summary
export function getStockStatusSummary(products: Product[]): { total: number, inStock: number, outOfStock: number, lowStock: number, backOrder: number, other: number } {
  const summary = {
    total: products.length,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0,
    backOrder: 0,
    other: 0
  };

  products.forEach(product => {
    const status = product.stock_status.toLowerCase().trim();
    
    switch (status) {
      case 'instock':
      case 'in-stock':
      case 'available':
        summary.inStock++;
        break;
      case 'outofstock':
      case 'out-of-stock':
      case 'oos':
        summary.outOfStock++;
        break;
      case 'lowstock':
      case 'low-stock':
        summary.lowStock++;
        break;
      case 'onbackorder':
      case 'on-backorder':
      case 'backorder':
        summary.backOrder++;
        break;
      default:
        summary.other++;
        break;
    }
  });

  return summary;
}

// Helper function to get unique categories from products, sorted alphabetically
export function getUniqueCategories(products: Product[]): string[] {
  const categorySet = new Set<string>();
  
  products.forEach(product => {
    if (product.category && product.category.trim() !== '') {
      const category = product.category.trim();
      categorySet.add(category);
    }
  });
  
  // Sort categories alphabetically for easier browsing
  const categories = Array.from(categorySet).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  
  return categories;
}

// Weekly promotion plan generation
export function generateWeeklyPromotionPlan(
  allProducts: Product[], 
  dailySelections: Array<[string, string, string]>
): WeeklyPlan {
  // Create a set of product IDs that have been promoted in the last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  // For now, we'll use an empty set since pastPromotions is removed from parameters
  // This can be enhanced later if needed
  const recentlyPromotedIds = new Set<string>();

  // Apply business rules filtering first
  const businessRuleFilteredProducts = filterEligibleProducts(allProducts);

  // Filter out recently promoted products
  const eligibleProducts = businessRuleFilteredProducts.filter(
    product => !recentlyPromotedIds.has(product.product_id)
  );

  // Get next 7 days
  const nextSevenDays = getNextSevenDays();
  
  // Track selected products to avoid duplicates across the entire week
  const selectedProductIds = new Set<string>();
  
  const days: DayPlan[] = nextSevenDays.map(({ date, dayName }, dayIndex) => {
    const dayProducts: Product[] = [];
    const daySelections = dailySelections[dayIndex] || ['Random', 'Random', 'Random'];
    
    // Get available products for this day (not used this week)
    const availableProducts = eligibleProducts.filter(product => 
      !selectedProductIds.has(product.product_id)
    );
    
    // Iterate through the three selected categories for this day (each gets 3 products)
    daySelections.forEach(categoryChoice => {
      let categoryProducts: Product[] = [];
      
      if (categoryChoice === 'Random') {
        // Select 3 random products from available pool
        const availableForSelection = availableProducts.filter(product => 
          !selectedProductIds.has(product.product_id)
        );
        const shuffledProducts = [...availableForSelection].sort(() => Math.random() - 0.5);
        categoryProducts = shuffledProducts.slice(0, 3);
      } else {
        // Select top 3 products by views from the specific category
        categoryProducts = availableProducts
          .filter(product => 
            product.category === categoryChoice && 
            !selectedProductIds.has(product.product_id)
          )
          .sort((a, b) => b.views - a.views)
          .slice(0, 3);
      }
      
      // Add selected products to the day and mark as used
      categoryProducts.forEach(product => {
        if (!selectedProductIds.has(product.product_id)) {
          selectedProductIds.add(product.product_id);
          dayProducts.push(product);
        }
      });
    });
    
    return {
      date,
      dayName,
      products: dayProducts,
      selectedCategories: daySelections
    };
  });

  return {
    weekNumber: 1,
    days,
    startDate: nextSevenDays[0].date,
    endDate: nextSevenDays[nextSevenDays.length - 1].date
  };
}

// Monthly promotion plan generation
export function generateMonthlyPromotionPlan(
  allProducts: Product[], 
  weeklySelections: Array<[string, string, string]>
): MonthlyPlan {
  const { month, year } = getCurrentMonthYear();
  const monthlyWeeks = getMonthlyWeeks(year, month);
  
  // Track selected products to avoid duplicates across the entire month
  const selectedProductIds = new Set<string>();
  
  // Apply business rules filtering first
  const businessRuleFilteredProducts = filterEligibleProducts(allProducts);
  
  // Filter out recently promoted products (same logic as before)
  const eligibleProducts = businessRuleFilteredProducts.filter(
    product => true // For now, no recent promotion filtering - can be enhanced later
  );
  
  const weeks: WeeklyPlan[] = monthlyWeeks.map((weekInfo, weekIndex) => {
    const weekSelections = weeklySelections[weekIndex] || ['Random', 'Random', 'Random'];
    const weekProducts = new Set<string>(); // Track products for this week only
    
    const days: DayPlan[] = weekInfo.days.map(({ date, dayName }) => {
      const dayProducts: Product[] = [];
      
      // Get available products for this day (not used this month)
      const availableProducts = eligibleProducts.filter(product => 
        !selectedProductIds.has(product.product_id)
      );
      
      // Iterate through the three selected categories for this week (each gets 3 products per day)
      weekSelections.forEach(categoryChoice => {
        let categoryProducts: Product[] = [];
        
        if (categoryChoice === 'Random') {
          // Select 3 random products from available pool
          const availableForSelection = availableProducts.filter(product => 
            !selectedProductIds.has(product.product_id)
          );
          const shuffledProducts = [...availableForSelection].sort(() => Math.random() - 0.5);
          categoryProducts = shuffledProducts.slice(0, 3);
        } else {
          // Select top 3 products by views from the specific category
          categoryProducts = availableProducts
            .filter(product => 
              product.category === categoryChoice && 
              !selectedProductIds.has(product.product_id)
            )
            .sort((a, b) => b.views - a.views)
            .slice(0, 3);
        }
        
        // Add selected products to the day and mark as used
        categoryProducts.forEach(product => {
          if (!selectedProductIds.has(product.product_id)) {
            selectedProductIds.add(product.product_id);
            dayProducts.push(product);
          }
        });
      });
      
      return {
        date,
        dayName,
        products: dayProducts,
        selectedCategories: weekSelections
      };
    });
    
    return {
      weekNumber: weekInfo.weekNumber,
      days,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      selectedCategories: weekSelections
    };
  });
  
  return {
    month,
    year,
    weeks,
    totalDays: weeks.reduce((total, week) => total + week.days.length, 0)
  };
}