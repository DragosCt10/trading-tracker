import { Trade } from '@/types/trade';
import { TIME_INTERVALS } from '@/constants/analytics';
import { isLocalHighLowLiquidated } from '@/utils/calculateCategoryStats';

type Bucket = { wins: number; losses: number; breakEven: number };
function totalBucket(b: Bucket) { return b.wins + b.losses + b.breakEven; }

export function computeStatsFromTrades(trades: Trade[]) {
  const setupMap = new Map<string, Bucket>();
  const liquidityMap = new Map<string, Bucket>();
  const directionMap = new Map<string, Bucket>();
  const localHLStats = { liquidated: { wins: 0, losses: 0, breakEven: 0 }, notLiquidated: { wins: 0, losses: 0, breakEven: 0 } };
  const slSizeMap = new Map<string, { total: number; sum: number }>();
  const reentryStats: Bucket = { wins: 0, losses: 0, breakEven: 0 };
  const breakEvenStats = { wins: 0, losses: 0, breakEven: 0, total: 0 };
  const intervalMap = new Map<string, Bucket>();
  const mssMap = new Map<string, Bucket>();
  const newsMap = new Map<string, Bucket>();
  const dayMap = new Map<string, Bucket>();
  const marketMap = new Map<string, Bucket>();
  const trendMap = new Map<string, Bucket>();

  const empty = (): Bucket => ({ wins: 0, losses: 0, breakEven: 0 });

  // Process all trades passed (tradesToUse already handles filtering)
  trades.forEach((trade) => {
    const isWin = trade.trade_outcome === 'Win';
    const isLoss = trade.trade_outcome === 'Lose';
    const isBE = trade.break_even;
    const setup = trade.setup_type || 'Unknown';
    const liquidity = trade.liquidity || 'Unknown';
    const direction = trade.direction || 'Unknown';
    const market = trade.market || 'Unknown';
    const mss = trade.mss || 'Unknown';
    const news = trade.news_related ? 'Yes' : 'No';
    const day = trade.day_of_week || 'Unknown';
    const slSize = trade.sl_size || 0;

    // Setup stats (wins, losses, breakEven)
    if (!setupMap.has(setup)) setupMap.set(setup, empty());
    const setupStat = setupMap.get(setup)!;
    if (isBE) setupStat.breakEven++;
    else if (isWin) setupStat.wins++;
    else if (isLoss) setupStat.losses++;

    if (!liquidityMap.has(liquidity)) liquidityMap.set(liquidity, empty());
    const liquidityStat = liquidityMap.get(liquidity)!;
    if (isBE) liquidityStat.breakEven++;
    else if (isWin) liquidityStat.wins++;
    else if (isLoss) liquidityStat.losses++;

    if (!directionMap.has(direction)) directionMap.set(direction, empty());
    const directionStat = directionMap.get(direction)!;
    if (isBE) directionStat.breakEven++;
    else if (isWin) directionStat.wins++;
    else if (isLoss) directionStat.losses++;

    const isLiquidated = isLocalHighLowLiquidated(trade.local_high_low);
    if (isLiquidated) {
      if (isBE) localHLStats.liquidated.breakEven++;
      else if (isWin) localHLStats.liquidated.wins++;
      else if (isLoss) localHLStats.liquidated.losses++;
    } else {
      if (isBE) localHLStats.notLiquidated.breakEven++;
      else if (isWin) localHLStats.notLiquidated.wins++;
      else if (isLoss) localHLStats.notLiquidated.losses++;
    }

    // SL Size stats
    if (!slSizeMap.has(market)) {
      slSizeMap.set(market, { total: 0, sum: 0 });
    }
    const slSizeStat = slSizeMap.get(market)!;
    slSizeStat.total++;
    slSizeStat.sum += slSize;

    if (trade.reentry) {
      if (isBE) reentryStats.breakEven++;
      else if (isWin) reentryStats.wins++;
      else if (isLoss) reentryStats.losses++;
    }

    breakEvenStats.total++;
    if (isBE) breakEvenStats.breakEven++;
    else if (isWin) breakEvenStats.wins++;
    else if (isLoss) breakEvenStats.losses++;

    // Interval stats (using trade_time) - match TIME_INTERVALS (full-day 4h buckets)
    const tradeTimeStr = trade.trade_time || '00:00';
    const [hours, minutes] = tradeTimeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    let intervalLabel = 'Unknown';
    for (const { label, start, end } of TIME_INTERVALS) {
      const [hS, mS] = start.split(':').map(Number);
      const [hE, mE] = end.split(':').map(Number);
      const sM = hS * 60 + mS;
      const eM = hE * 60 + mE;
      if (totalMinutes >= sM && totalMinutes <= eM) {
        intervalLabel = label;
        break;
      }
    }

    if (!intervalMap.has(intervalLabel)) intervalMap.set(intervalLabel, empty());
    const intervalStat = intervalMap.get(intervalLabel)!;
    if (isBE) intervalStat.breakEven++;
    else if (isWin) intervalStat.wins++;
    else if (isLoss) intervalStat.losses++;

    if (!mssMap.has(mss)) mssMap.set(mss, empty());
    const mssStat = mssMap.get(mss)!;
    if (isBE) mssStat.breakEven++;
    else if (isWin) mssStat.wins++;
    else if (isLoss) mssStat.losses++;

    if (!newsMap.has(news)) newsMap.set(news, empty());
    const newsStat = newsMap.get(news)!;
    if (isBE) newsStat.breakEven++;
    else if (isWin) newsStat.wins++;
    else if (isLoss) newsStat.losses++;

    if (!dayMap.has(day)) dayMap.set(day, empty());
    const dayStat = dayMap.get(day)!;
    if (isBE) dayStat.breakEven++;
    else if (isWin) dayStat.wins++;
    else if (isLoss) dayStat.losses++;

    if (!marketMap.has(market)) marketMap.set(market, empty());
    const marketStat = marketMap.get(market)!;
    if (isBE) marketStat.breakEven++;
    else if (isWin) marketStat.wins++;
    else if (isLoss) marketStat.losses++;

    const trend = (trade.trend ?? '').trim();
    if (trend === 'Trend-following' || trend === 'Counter-trend') {
      if (!trendMap.has(trend)) trendMap.set(trend, empty());
      const trendStat = trendMap.get(trend)!;
      if (isBE) trendStat.breakEven++;
      else if (isWin) trendStat.wins++;
      else if (isLoss) trendStat.losses++;
    }
  });

  const winRate = (w: number, l: number) => (w + l > 0 ? (w / (w + l)) * 100 : 0);
  const winRateWithBE = (w: number, l: number, be: number) => (w + l + be > 0 ? (w / (w + l + be)) * 100 : 0);

  const setupStatsArray = Array.from(setupMap.entries()).map(([setup, stat]) => ({
    setup,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const liquidityStatsArray = Array.from(liquidityMap.entries()).map(([liquidity, stat]) => ({
    liquidity,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const directionStatsArray = Array.from(directionMap.entries()).map(([direction, stat]) => ({
    direction,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const slSizeStatsArray = Array.from(slSizeMap.entries()).map(([market, stat]) => ({
    market,
    averageSlSize: stat.total > 0 ? stat.sum / stat.total : 0,
  }));

  const intervalStatsArray = Array.from(intervalMap.entries()).map(([label, stat]) => ({
    label,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const mssStatsArray = Array.from(mssMap.entries()).map(([mss, stat]) => ({
    mss,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const newsStatsArray = Array.from(newsMap.entries()).map(([news, stat]) => ({
    news,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const dayStatsArray = Array.from(dayMap.entries()).map(([day, stat]) => ({
    day,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const marketStatsArray = Array.from(marketMap.entries()).map(([market, stat]) => ({
    market,
    total: totalBucket(stat),
    wins: stat.wins,
    losses: stat.losses,
    breakEven: stat.breakEven,
    profit: 0,
    pnlPercentage: 0,
    profitTaken: true,
    winRate: winRate(stat.wins, stat.losses),
    winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
  }));

  const localHLStatsComputed = {
    liquidated: {
      wins: localHLStats.liquidated.wins,
      losses: localHLStats.liquidated.losses,
      breakEven: localHLStats.liquidated.breakEven,
      winRate: winRate(localHLStats.liquidated.wins, localHLStats.liquidated.losses),
      winRateWithBE: winRateWithBE(localHLStats.liquidated.wins, localHLStats.liquidated.losses, localHLStats.liquidated.breakEven),
      total: localHLStats.liquidated.wins + localHLStats.liquidated.losses + localHLStats.liquidated.breakEven,
    },
    notLiquidated: {
      wins: localHLStats.notLiquidated.wins,
      losses: localHLStats.notLiquidated.losses,
      breakEven: localHLStats.notLiquidated.breakEven,
      winRate: winRate(localHLStats.notLiquidated.wins, localHLStats.notLiquidated.losses),
      winRateWithBE: winRateWithBE(localHLStats.notLiquidated.wins, localHLStats.notLiquidated.losses, localHLStats.notLiquidated.breakEven),
      total: localHLStats.notLiquidated.wins + localHLStats.notLiquidated.losses + localHLStats.notLiquidated.breakEven,
    },
  };

  const reentryStatsComputed = {
    ...reentryStats,
    total: totalBucket(reentryStats),
    winRate: winRate(reentryStats.wins, reentryStats.losses),
    winRateWithBE: winRateWithBE(reentryStats.wins, reentryStats.losses, reentryStats.breakEven),
  };

  const breakEvenStatsComputed = {
    ...breakEvenStats,
    total: breakEvenStats.wins + breakEvenStats.losses + breakEvenStats.breakEven,
    winRate: winRate(breakEvenStats.wins, breakEvenStats.losses),
    winRateWithBE: breakEvenStats.total > 0 ? (breakEvenStats.wins / breakEvenStats.total) * 100 : 0,
  };

  const trendStatsArray = Array.from(trendMap.entries())
    .map(([tradeType, stat]) => ({
      tradeType,
      total: totalBucket(stat),
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven,
      winRate: winRate(stat.wins, stat.losses),
      winRateWithBE: winRateWithBE(stat.wins, stat.losses, stat.breakEven),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    setupStats: setupStatsArray,
    liquidityStats: liquidityStatsArray,
    directionStats: directionStatsArray,
    localHLStats: localHLStatsComputed,
    slSizeStats: slSizeStatsArray,
    reentryStats: [reentryStatsComputed],
    breakEvenStats: [breakEvenStatsComputed],
    trendStats: trendStatsArray,
    intervalStats: intervalStatsArray,
    mssStats: mssStatsArray,
    newsStats: newsStatsArray,
    dayStats: dayStatsArray,
    marketStats: marketStatsArray,
  };
}
