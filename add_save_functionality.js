const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Add immediate save after daily plan generation
content = content.replace(
  '        setSuccess(`Successfully generated a daily promotion plan with ${plan.products.length} products!`);',
  `        setSuccess(\`Successfully generated a daily promotion plan with \${plan.products.length} products!\`);
        
        // IMMEDIATELY SAVE TO SUPABASE
        if (backupSessionId) {
          try {
            const currentState = {
              products,
              dailyPlan: plan,
              weeklyPlan: null,
              monthlyPlan: null,
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
            await saveFullApplicationState(backupSessionId, currentState, 'Auto-save');
            console.log('Daily plan saved to Supabase immediately!');
          } catch (error) {
            console.error('Failed to save daily plan:', error);
          }
        }`
);

// Add immediate save after weekly plan generation
content = content.replace(
  '        setSuccess(`Successfully generated a ${weeklyConfig.numberOfWeeks}-week promotion plan with custom category selections!`);',
  `        setSuccess(\`Successfully generated a \${weeklyConfig.numberOfWeeks}-week promotion plan with custom category selections!\`);
        
        // IMMEDIATELY SAVE TO SUPABASE
        if (backupSessionId) {
          try {
            const currentState = {
              products,
              dailyPlan,
              weeklyPlan: plan,
              monthlyPlan: null,
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
            await saveFullApplicationState(backupSessionId, currentState, 'Auto-save');
            console.log('Weekly plan saved to Supabase immediately!');
          } catch (error) {
            console.error('Failed to save weekly plan:', error);
          }
        }`
);

// Add immediate save after monthly plan generation
content = content.replace(
  '        setSuccess(`Successfully generated a monthly promotion plan with custom weekly category selections!`);',
  `        setSuccess(\`Successfully generated a monthly promotion plan with custom weekly category selections!\`);
        
        // IMMEDIATELY SAVE TO SUPABASE
        if (backupSessionId) {
          try {
            const currentState = {
              products,
              dailyPlan,
              weeklyPlan: null,
              monthlyPlan: plan,
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
            await saveFullApplicationState(backupSessionId, currentState, 'Auto-save');
            console.log('Monthly plan saved to Supabase immediately!');
          } catch (error) {
            console.error('Failed to save monthly plan:', error);
          }
        }`
);

// Write the modified content back
fs.writeFileSync('src/app/page.tsx', content);

console.log('Added immediate save functionality to all plan generations!');
