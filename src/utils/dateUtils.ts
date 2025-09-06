import { format, addDays, startOfDay, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';

export interface DateInfo {
  date: Date;
  dayName: string;
}

export interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: DateInfo[];
}

// Get the next 7 days starting from Monday, Sep 1st, 2025
// Based on the context that current date is Sunday, August 31, 2025
export function getNextSevenDays(): DateInfo[] {
  // Starting from Monday, September 1st, 2025
  const startDate = new Date(2025, 8, 1); // Month is 0-indexed, so 8 = September
  const days: DateInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(startDate, i);
    days.push({
      date: startOfDay(currentDate),
      dayName: format(currentDate, 'EEEE') // Full day name (Monday, Tuesday, etc.)
    });
  }

  return days;
}

// Get all weeks for a given month, including partial weeks from previous/next month
export function getMonthlyWeeks(year: number, month: number): WeekInfo[] {
  // month is 1-indexed (1 = January, 12 = December)
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  
  // Get all weeks that intersect with this month
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 } // Monday = 1
  );
  
  return weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days: DateInfo[] = [];
    
    // Generate all 7 days of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      days.push({
        date: startOfDay(currentDate),
        dayName: format(currentDate, 'EEEE')
      });
    }
    
    return {
      weekNumber: index + 1,
      startDate: weekStart,
      endDate: weekEnd,
      days
    };
  });
}

// Get current month and year (September 2025 for our context)
export function getCurrentMonthYear(): { month: number; year: number } {
  return { month: 9, year: 2025 }; // September 2025
}

// Utility function to format dates for display
export function formatDisplayDate(date: Date): string {
  return format(date, 'MMM dd, yyyy');
}

// Utility function to format dates for database storage
export function formatDbDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}