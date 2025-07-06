import { Timeframe } from '../components/TimeframeSelector';

export function filterByTimeframe<T extends { createdAt?: string; completedAt?: string }>(
  items: T[],
  timeframe: Timeframe,
  dateField: 'createdAt' | 'completedAt' = 'createdAt'
): T[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate: Date;
  
  switch (timeframe) {
    case 'today':
      startDate = today;
      break;
      
    case 'week':
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToSubtract);
      break;
      
    case 'sprint':
      // For sprint, we'll need to use the current sprint dates
      // This will be handled differently in the component
      return items;
      
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
      
    default:
      return items;
  }
  
  return items.filter(item => {
    const itemDate = item[dateField];
    if (!itemDate) return false;
    
    const date = new Date(itemDate);
    return date >= startDate;
  });
}

export function getDateRangeText(timeframe: Timeframe): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeframe) {
    case 'today':
      return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      
    case 'week':
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToSubtract);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
    case 'sprint':
      return 'Current Sprint';
      
    case 'month':
      return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
    default:
      return '';
  }
}