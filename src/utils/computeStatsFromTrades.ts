import { Trade } from '@/types/trade';
import { TIME_INTERVALS } from '@/constants/analytics';
import { isLocalHighLowLiquidated } from '@/utils/calculateCategoryStats';

export function computeStatsFromTrades(trades: Trade[]) {
  // Setup stats - add total field to track all trades including non-executed
  const setupMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // Liquidity stats
  const liquidityMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // Direction stats
  const directionMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // Local H/L stats
  const localHLStats = { liquidated: { wins: 0, losses: 0, winsWithBE: 0, lossesWithBE: 0, total: 0 }, notLiquidated: { wins: 0, losses: 0, winsWithBE: 0, lossesWithBE: 0, total: 0 } };
  // SL Size stats
  const slSizeMap = new Map<string, { total: number; sum: number }>();
  // Reentry stats
  const reentryStats = { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 };
  // Break-even stats
  const breakEvenStats = { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 };
  // Interval stats
  const intervalMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // MSS stats
  const mssMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // News stats
  const newsMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // Day stats
  const dayMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
  // Market stats
  const marketMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();

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

    // Setup stats
    if (!setupMap.has(setup)) {
      setupMap.set(setup, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const setupStat = setupMap.get(setup)!;
    setupStat.total++;
    if (isBE) {
      if (isWin) setupStat.beWins++;
      else if (isLoss) setupStat.beLosses++;
    } else {
      if (isWin) setupStat.wins++;
      else if (isLoss) setupStat.losses++;
    }

    // Liquidity stats
    if (!liquidityMap.has(liquidity)) {
      liquidityMap.set(liquidity, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const liquidityStat = liquidityMap.get(liquidity)!;
    liquidityStat.total++;
    if (isBE) {
      if (isWin) liquidityStat.beWins++;
      else if (isLoss) liquidityStat.beLosses++;
    } else {
      if (isWin) liquidityStat.wins++;
      else if (isLoss) liquidityStat.losses++;
    }

    // Direction stats
    if (!directionMap.has(direction)) {
      directionMap.set(direction, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const directionStat = directionMap.get(direction)!;
    directionStat.total++;
    if (isBE) {
      if (isWin) directionStat.beWins++;
      else if (isLoss) directionStat.beLosses++;
    } else {
      if (isWin) directionStat.wins++;
      else if (isLoss) directionStat.losses++;
    }

    // Local H/L stats - same categorization as calculateLocalHLStats (boolean/string/number from API)
    const isLiquidated = isLocalHighLowLiquidated(trade.local_high_low);
    if (isLiquidated) {
      localHLStats.liquidated.total++;
      if (isBE) {
        if (isWin) localHLStats.liquidated.winsWithBE++;
        else if (isLoss) localHLStats.liquidated.lossesWithBE++;
      } else {
        if (isWin) localHLStats.liquidated.wins++;
        else if (isLoss) localHLStats.liquidated.losses++;
      }
    } else {
      localHLStats.notLiquidated.total++;
      if (isBE) {
        if (isWin) localHLStats.notLiquidated.winsWithBE++;
        else if (isLoss) localHLStats.notLiquidated.lossesWithBE++;
      } else {
        if (isWin) localHLStats.notLiquidated.wins++;
        else if (isLoss) localHLStats.notLiquidated.losses++;
      }
    }

    // SL Size stats
    if (!slSizeMap.has(market)) {
      slSizeMap.set(market, { total: 0, sum: 0 });
    }
    const slSizeStat = slSizeMap.get(market)!;
    slSizeStat.total++;
    slSizeStat.sum += slSize;

    // Reentry stats
    if (trade.reentry) {
      reentryStats.total++;
      if (isBE) {
        if (isWin) reentryStats.beWins++;
        else if (isLoss) reentryStats.beLosses++;
      } else {
        if (isWin) reentryStats.wins++;
        else if (isLoss) reentryStats.losses++;
      }
    }

    // Break-even stats
    // For BE trades, count them
    if (isBE) {
      breakEvenStats.total++;
      if (isWin) breakEvenStats.beWins++;
      else if (isLoss) breakEvenStats.beLosses++;
    } else {
      // For non-BE trades, also count them
      breakEvenStats.total++;
      if (isWin) breakEvenStats.wins++;
      else if (isLoss) breakEvenStats.losses++;
      // Non-executed trades are counted in total but don't increment wins/losses
    }

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

    // Interval stats
    if (!intervalMap.has(intervalLabel)) {
      intervalMap.set(intervalLabel, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const intervalStat = intervalMap.get(intervalLabel)!;
    intervalStat.total++;
    if (isBE) {
      if (isWin) intervalStat.beWins++;
      else if (isLoss) intervalStat.beLosses++;
    } else {
      if (isWin) intervalStat.wins++;
      else if (isLoss) intervalStat.losses++;
    }

    // MSS stats
    if (!mssMap.has(mss)) {
      mssMap.set(mss, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const mssStat = mssMap.get(mss)!;
    mssStat.total++;
    if (isBE) {
      if (isWin) mssStat.beWins++;
      else if (isLoss) mssStat.beLosses++;
    } else {
      if (isWin) mssStat.wins++;
      else if (isLoss) mssStat.losses++;
    }

    // News stats
    if (!newsMap.has(news)) {
      newsMap.set(news, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const newsStat = newsMap.get(news)!;
    newsStat.total++;
    if (isBE) {
      if (isWin) newsStat.beWins++;
      else if (isLoss) newsStat.beLosses++;
    } else {
      if (isWin) newsStat.wins++;
      else if (isLoss) newsStat.losses++;
    }

    // Day stats
    if (!dayMap.has(day)) {
      dayMap.set(day, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const dayStat = dayMap.get(day)!;
    dayStat.total++;
    if (isBE) {
      if (isWin) dayStat.beWins++;
      else if (isLoss) dayStat.beLosses++;
    } else {
      if (isWin) dayStat.wins++;
      else if (isLoss) dayStat.losses++;
    }

    // Market stats
    if (!marketMap.has(market)) {
      marketMap.set(market, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
    }
    const marketStat = marketMap.get(market)!;
    marketStat.total++;
    if (isBE) {
      if (isWin) marketStat.beWins++;
      else if (isLoss) marketStat.beLosses++;
    } else {
      if (isWin) marketStat.wins++;
      else if (isLoss) marketStat.losses++;
    }
  });

  // Calculate win rates
  const calculateWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? (wins / total) * 100 : 0;
  };

  const calculateWinRateWithBE = (wins: number, losses: number, beWins: number, beLosses: number) => {
    const total = wins + losses + beWins + beLosses;
    return total > 0 ? ((wins + beWins) / total) * 100 : 0;
  };
  // Win Rate: non-BE wins / (non-BE wins + all losses) so BE losses count (1 win + 1 BE loss → 50%)
  const winRateWithAllLosses = (w: number, l: number, beL: number) => {
    const denom = w + l + beL;
    return denom > 0 ? (w / denom) * 100 : 0;
  };

  // Convert maps to arrays with win rates
  const setupStatsArray = Array.from(setupMap.entries()).map(([setup, stat]) => ({
    setup,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const liquidityStatsArray = Array.from(liquidityMap.entries()).map(([liquidity, stat]) => ({
    liquidity,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const directionStatsArray = Array.from(directionMap.entries()).map(([direction, stat]) => ({
    direction,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const slSizeStatsArray = Array.from(slSizeMap.entries()).map(([market, stat]) => ({
    market,
    averageSlSize: stat.total > 0 ? stat.sum / stat.total : 0,
  }));

  // Win Rate for intervals: non-BE wins / (non-BE wins + all losses) so BE losses count (1 win + 1 BE loss → 50%)
  const intervalWinRateDenom = (w: number, l: number, beL: number) => w + l + beL;
  const intervalStatsArray = Array.from(intervalMap.entries()).map(([label, stat]) => {
    const denom = intervalWinRateDenom(stat.wins, stat.losses, stat.beLosses);
    return {
      label,
      total: stat.total,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: denom > 0 ? (stat.wins / denom) * 100 : 0,
      winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
    };
  });

  const mssStatsArray = Array.from(mssMap.entries()).map(([mss, stat]) => ({
    mss,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const newsStatsArray = Array.from(newsMap.entries()).map(([news, stat]) => ({
    news,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const dayStatsArray = Array.from(dayMap.entries()).map(([day, stat]) => ({
    day,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  const marketStatsArray = Array.from(marketMap.entries()).map(([market, stat]) => ({
    market,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: winRateWithAllLosses(stat.wins, stat.losses, stat.beLosses),
    winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
  }));

  // Calculate local H/L win rates
  const liquidatedTotal = localHLStats.liquidated.wins + localHLStats.liquidated.losses;
  const notLiquidatedTotal = localHLStats.notLiquidated.wins + localHLStats.notLiquidated.losses;
  const liquidatedTotalWithBE = liquidatedTotal + localHLStats.liquidated.winsWithBE + localHLStats.liquidated.lossesWithBE;
  const notLiquidatedTotalWithBE = notLiquidatedTotal + localHLStats.notLiquidated.winsWithBE + localHLStats.notLiquidated.lossesWithBE;

  const localHLStatsComputed = {
    liquidated: {
      ...localHLStats.liquidated,
      wins: localHLStats.liquidated.wins,
      losses: localHLStats.liquidated.losses,
      winRate: winRateWithAllLosses(
        localHLStats.liquidated.wins,
        localHLStats.liquidated.losses,
        localHLStats.liquidated.lossesWithBE
      ),
      winRateWithBE: calculateWinRateWithBE(
        localHLStats.liquidated.wins,
        localHLStats.liquidated.losses,
        localHLStats.liquidated.winsWithBE,
        localHLStats.liquidated.lossesWithBE
      ),
    },
    notLiquidated: {
      ...localHLStats.notLiquidated,
      wins: localHLStats.notLiquidated.wins,
      losses: localHLStats.notLiquidated.losses,
      winRate: winRateWithAllLosses(
        localHLStats.notLiquidated.wins,
        localHLStats.notLiquidated.losses,
        localHLStats.notLiquidated.lossesWithBE
      ),
      winRateWithBE: calculateWinRateWithBE(
        localHLStats.notLiquidated.wins,
        localHLStats.notLiquidated.losses,
        localHLStats.notLiquidated.winsWithBE,
        localHLStats.notLiquidated.lossesWithBE
      ),
    },
  };

  // Calculate reentry and break-even win rates
  const reentryStatsComputed = {
    ...reentryStats,
    winRate: calculateWinRate(reentryStats.wins, reentryStats.losses),
    winRateWithBE: calculateWinRateWithBE(reentryStats.wins, reentryStats.losses, reentryStats.beWins, reentryStats.beLosses),
  };

  const breakEvenStatsComputed = {
    ...breakEvenStats,
    winRate: calculateWinRate(breakEvenStats.wins, breakEvenStats.losses),
    winRateWithBE: calculateWinRateWithBE(breakEvenStats.wins, breakEvenStats.losses, breakEvenStats.beWins, breakEvenStats.beLosses),
  };

  return {
    setupStats: setupStatsArray,
    liquidityStats: liquidityStatsArray,
    directionStats: directionStatsArray,
    localHLStats: localHLStatsComputed,
    slSizeStats: slSizeStatsArray,
    reentryStats: [reentryStatsComputed],
    breakEvenStats: [breakEvenStatsComputed],
    intervalStats: intervalStatsArray,
    mssStats: mssStatsArray,
    newsStats: newsStatsArray,
    dayStats: dayStatsArray,
    marketStats: marketStatsArray,
  };
}
