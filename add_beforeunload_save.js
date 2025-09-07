const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Add beforeunload save functionality after the auto-save useEffect
const beforeunloadCode = `
  // Save on window close/beforeunload
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (backupSessionId && (dailyPlan || weeklyPlan || monthlyPlan || adHocPlan.approvedProducts.length > 0)) {
        try {
          const currentState = {
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

          // Use sendBeacon for reliable saving on page unload
          const data = JSON.stringify(currentState);
          navigator.sendBeacon('/api/save-state', data);
          
          console.log('Saved state before page unload');
        } catch (error) {
          console.error('Failed to save on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backupSessionId, dailyPlan, weeklyPlan, monthlyPlan, adHocPlan, products, dailySelections, weeklySelections, weeklyConfig, weeklyCategoryConfig, planningMode, uniqueCategories, uploadedFileName, expectedQuantity]);
`;

// Find the auto-save useEffect and add the beforeunload code after it
const autoSaveEndPattern = '  }, [autoSaveEnabled, backupSessionId, products, dailyPlan, weeklyPlan, monthlyPlan, adHocPlan, dailySelections, expectedQuantity, planningMode, uniqueCategories, uploadedFileName, weeklyCategoryConfig, weeklyConfig, weeklySelections]);';

if (content.includes(autoSaveEndPattern)) {
  content = content.replace(autoSaveEndPattern, autoSaveEndPattern + beforeunloadCode);
} else {
  // Fallback: add after the first useEffect
  const firstUseEffectEnd = content.indexOf('  }, [autoSaveEnabled, backupSessionId, products, dailyPlan, weeklyPlan, monthlyPlan, adHocPlan, dailySelections, expectedQuantity, planningMode, uniqueCategories, uploadedFileName, weeklyCategoryConfig, weeklyConfig, weeklySelections]);');
  if (firstUseEffectEnd !== -1) {
    const insertPoint = firstUseEffectEnd + content.substring(firstUseEffectEnd).indexOf(');') + 2;
    content = content.substring(0, insertPoint) + beforeunloadCode + content.substring(insertPoint);
  }
}

// Write the modified content back
fs.writeFileSync('src/app/page.tsx', content);

console.log('Added beforeunload save functionality!');
