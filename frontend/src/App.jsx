import React, { useEffect, useState, useRef } from 'react';
import { Activity, TrendingUp, TrendingDown, Crosshair, Brain, Settings, AlertTriangle, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChartComponent } from './ChartComponent';

function App() {
  const [marketState, setMarketState] = useState({ signals: [], balance: 100000, pnl: 0, markets: [], positions: [] });
  const [status, setStatus] = useState('Connecting...');
  const [lastTrade, setLastTrade] = useState(null);
  const [tradeAsset, setTradeAsset] = useState('BTC/USDT');
  const [tradeQty, setTradeQty] = useState(0.1);
  const ws = useRef(null);

  useEffect(() => {
    try {
        setStatus('Connecting...');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log("Connecting to WebSocket:", wsUrl);
        ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setStatus('Connected');
    ws.current.onclose = () => setStatus('Disconnected');
    ws.current.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            setMarketState(prev => ({ ...prev, ...data }));
        } catch (e) {
            console.error(e);
        }
    };
        ws.current.onerror = (err) => {
            console.error("WS Error:", err);
            setStatus('Connection Error');
        };
        return () => {
            if (ws.current) ws.current.close();
        };
    } catch (e) {
        console.error("Setup Error:", e);
        setStatus('App Error');
    }
  }, []);

  const executeTrade = (side) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          setLastTrade(`Sending ${side} order...`);
          ws.current.send(JSON.stringify({
              action: "TRADE",
              pair: tradeAsset,
              side: side,
              qty: parseFloat(tradeQty)
          }));
          setTimeout(() => setLastTrade(null), 3000);
      } else {
          setLastTrade("Error: Not Connected");
          setTimeout(() => setLastTrade(null), 3000);
      }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-2 md:p-4 font-sans">
      {/* Header */}
      <header className="glass flex flex-col md:flex-row items-center justify-between p-4 rounded-xl mb-6 shadow-2xl border-gray-800 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="text-green-400 w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold tracking-wider">NEURAL<span className="text-green-400">TRADE</span> PRO</h1>
            <p className="text-xs text-gray-400">INSTITUTIONAL AI TERMINAL</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Net Worth</p>
            <p className="text-xl font-mono">${marketState.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Session PnL</p>
            <p className={`text-xl font-mono ${marketState.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketState.pnl >= 0 ? '+' : ''}${marketState.pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="flex flex-col items-end justify-center">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.includes('Connected') ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs text-gray-400">{status}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart Area */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          <div className="glass rounded-xl p-4 h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-blue-400" /> Pro Chart
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">1m</button>
                <button className="px-3 py-1 text-xs bg-blue-900 text-blue-300 rounded border border-blue-700">5m</button>
                <button className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">1h</button>
              </div>
            </div>
            <div className="flex-1 bg-[#131722] rounded overflow-hidden border border-gray-800 relative scan-line">
              <ChartComponent />
            </div>
          </div>

          {/* AI Discovery Engine */}
          <div className="glass rounded-xl p-4 min-h-[300px]">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" /> Neural Discovery Engine (CIO AI)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketState.signals.length === 0 && <p className="text-gray-500 italic text-sm">Scanning for confluence setups...</p>}
              {marketState.signals.map(signal => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={signal.id} 
                  className="bg-[#131722] p-4 rounded-lg border border-gray-800 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {signal.action === 'BUY' ? <TrendingUp className="text-green-400 w-5 h-5" /> : <TrendingDown className="text-red-400 w-5 h-5" />}
                      <span className="font-bold text-lg">{signal.pair}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-bold ${signal.action === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {signal.action}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-sm font-mono">
                    <div>
                      <p className="text-gray-500 text-xs">Entry</p>
                      <p>{signal.entry}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Target</p>
                      <p className="text-green-400">{signal.target}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Stop Loss</p>
                      <p className="text-red-400">{signal.sl}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Neural Confidence</span>
                      <span className="text-xs font-bold text-purple-400">{signal.confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${signal.confidence}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 italic flex items-start gap-1">
                      <Brain className="w-3 h-3 mt-0.5 inline-block text-purple-400" /> "{signal.aiReasoning}"
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <div className="glass rounded-xl p-4 min-h-[300px]">
             <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
               <Activity className="w-5 h-5 text-green-400" /> Active Positions
             </h2>
             <div className="space-y-3">
               {!marketState.positions || marketState.positions.length === 0 ? (
                 <p className="text-gray-500 italic text-sm">No open positions.</p>
               ) : marketState.positions.map((pos, i) => (
                 <div key={i} className="bg-[#131722] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                   <div>
                     <p className="font-bold flex items-center gap-2">
                       <span className={pos.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>{pos.side}</span>
                       {pos.pair}
                     </p>
                     <p className="text-xs text-gray-500">Qty: {pos.qty} @ ${pos.entry_price.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-gray-500">{pos.time}</p>
                     <p className="text-xs text-blue-400">PAPER TRADE</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="glass rounded-xl p-4 h-[400px]">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-400" /> Trade Execution
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Asset</label>
                <select value={tradeAsset} onChange={(e) => setTradeAsset(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500">
                  <option value="BTC/USDT">BTC/USDT</option>
                  <option value="ETH/USDT">ETH/USDT</option>
                  <option value="SOL/USDT">SOL/USDT</option>
                  <option value="BNB/USDT">BNB/USDT</option>
                  <option value="XRP/USDT">XRP/USDT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                  <input type="number" value={tradeQty} onChange={(e) => setTradeQty(e.target.value)} step="0.01" className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white font-mono outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Leverage</label>
                  <select className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500">
                    <option>1x</option>
                    <option>10x</option>
                  </select>
                </div>
              </div>
               <div className="flex gap-4 mt-6">
                  <button onClick={() => executeTrade('BUY')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                    BUY / LONG
                  </button>
                  <button onClick={() => executeTrade('SELL')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    SELL / SHORT
                  </button>
               </div>
               {lastTrade && (
                 <div className="mt-4 p-2 bg-blue-900/40 text-blue-300 text-center text-xs rounded animate-pulse">
                   {lastTrade}
                 </div>
               )}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200">Paper Trading Engine active. Live Binance prices used. Clicking Buy deducts from Balance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
