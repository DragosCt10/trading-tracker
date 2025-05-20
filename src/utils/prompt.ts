export interface TradingAnalysisRequest {
  startDate: string;
  endDate: string;
  accountBalance: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  winRateWithBE: number;
  totalProfit: number;
  averageProfit: number;
  maxDrawdown: number;
  averagePnLPercentage: number;
  profitFactor: number;
  consistencyScore: number;
  consistencyScoreWithBE: number;
  sharpeWithBE: number;
}

export async function analyzeTradingData(data: TradingAnalysisRequest) {
  const prompt = `Please analyze my day trading performance over the period **${data.startDate}** to **${data.endDate}**, on an account balance of **${data.accountBalance}**.  \
Here are my aggregate statistics:  
• Total trades: ${data.totalTrades}  
• Total wins: ${data.totalWins}  
• Total losses: ${data.totalLosses}  
• Win rate (ex. break-even): ${data.winRate}%  
• Win rate (incl. break-even): ${data.winRateWithBE}%  
• Total net PnL: ${data.totalProfit} (in account currency)  
• Average PnL per trade: ${data.averageProfit}  
• Maximum drawdown: ${data.maxDrawdown}%  
• Average PnL per trade (as % of risk): ${data.averagePnLPercentage}%  
• Profit factor: ${data.profitFactor}  
• Consistency score (ex. BE): ${data.consistencyScore}  
• Consistency score (incl. BE): ${data.consistencyScoreWithBE}  
• Sharpe ratio (using BE exits): ${data.sharpeWithBE}  

**Context & risk management:**  
- Strategy: liquidity‐sweep setups (typically you win 1 then lose 1, or 2-1, but rarely multiple wins in a row).  
- Risk per trade: normally 0.5% (rarely up to 1%), but when key liquidity is near you risk only 0.25%.  
- Minimum reward-to-risk (RR) = 2, with a break-even exit at 1.35 RR.  
- My entry are on a 1m timeframe and I make the analysis on a 15m timeframe and 5m timeframe.  

**Ask:**  
1. What are my biggest statistical strengths and weaknesses?  
2. Where is my risk management under- or over-optimized?  
3. How can I improve win-rate consistency without compromising edge?  
4. Any suggestions to enhance my drawdown control, profit factor, or Sharpe profile given this style?  
5. What specific actions or tweaks should I test next?  

Answer with bullet points and concise, actionable advice.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: "o4-mini-2025-04-16",
        messages: [
          {
            role: "system",
            content: "You are a seasoned trading coach and data‐driven performance analyst. You help retail traders understand their edge, spot weaknesses, and refine their risk & trade management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 1,
        max_completion_tokens: 2000,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    let fullContent = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              // Emit the current content for streaming
              if (typeof window !== 'undefined') {
                const event = new CustomEvent('analysisUpdate', { detail: fullContent });
                window.dispatchEvent(event);
              }
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('Error analyzing trading data:', error);
    throw error;
  }
}
