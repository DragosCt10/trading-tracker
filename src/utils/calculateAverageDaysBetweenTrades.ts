export const calculateAverageDaysBetweenTrades = (trades: any[]) => {
  if (!trades || trades.length < 2) return 0;
  
  // Sort trades by date. ISO YYYY-MM-DD strings sort lexicographically — no Date() needed.
  const sortedTrades = [...trades].sort((a, b) => {
    const da = (a.trade_date ?? '') as string;
    const db = (b.trade_date ?? '') as string;
    return da < db ? -1 : da > db ? 1 : 0;
  });

  let totalDays = 0;
  for (let i = 1; i < sortedTrades.length; i++) {
    const currentTradeDate = new Date(sortedTrades[i].trade_date);
    const previousTradeDate = new Date(sortedTrades[i - 1].trade_date);
    
    const diffTime = Math.abs(currentTradeDate.getTime() - previousTradeDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    totalDays += diffDays;
  }

  const average = Math.round((totalDays / (sortedTrades.length - 1)) * 10) / 10;
  
  return average;
};
