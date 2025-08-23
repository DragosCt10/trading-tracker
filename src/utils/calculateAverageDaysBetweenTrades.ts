export const calculateAverageDaysBetweenTrades = (trades: any[]) => {
  if (!trades || trades.length < 2) return 0;
  
  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

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
