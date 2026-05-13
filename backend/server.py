from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import asyncio
import json
import ccxt.async_support as ccxt
import time
import os
import random

app = FastAPI(title="NeuralTrade Pro API - Real Data")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import pandas as pd
import pandas_ta as ta
import aiohttp

class MarketStateEngine:
    def __init__(self):
        self.state = {
            "balance": 100000.0,
            "pnl": 0.0,
            "signals": [],
            "markets": [],
            "positions": []
        }
        self.clients = set()
        self.positions = [] # {"pair": "BTC/USDT", "side": "BUY", "qty": 0.1, "entry_price": 60000}
        self.prices = {} # Live prices
        self.last_signal_time = 0
        self.sambanova_api_key = "3678794e-a6da-4f80-89b5-4a811a491ae0"

    async def get_ai_reasoning(self, symbol, action, price, technical_factors):
        try:
            prompt = f"As an elite quantitative Crypto CIO, provide a single, punchy 10-word maximum reasoning for a {action} on {symbol} at ${price}. The technical indicators show: {technical_factors}. Sound highly professional and institutional. No introductory phrases, just the verdict."
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.sambanova_api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "Llama-3.3-70B-Instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 30
                }
                async with session.post("https://api.sambanova.ai/v1/chat/completions", json=payload, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        reasoning = data["choices"][0]["message"]["content"].strip().replace('"', '')
                        return reasoning
                    else:
                        print(f"SambaNova error: {resp.status} {await resp.text()}")
                        return f"{technical_factors} (Algorithmic)"
        except Exception as e:
            print(f"AI API Error: {e}")
            return f"{technical_factors} (Algorithmic)"

    async def run_technical_scanner(self, exchange, symbols):
        # Background task for scanning 15m or 5m candles
        while True:
            try:
                new_signals = []
                for symbol in symbols:
                    # Fetch 5m candles (limit 100)
                    ohlcv = await exchange.fetch_ohlcv(symbol, timeframe='5m', limit=100)
                    df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                    
                    # Calculate indicators using pandas_ta
                    df.ta.ema(length=9, append=True)
                    df.ta.ema(length=21, append=True)
                    df.ta.rsi(length=14, append=True)
                    df.ta.macd(fast=12, slow=26, signal=9, append=True)
                    
                    last_row = df.iloc[-1]
                    prev_row = df.iloc[-2]
                    
                    price = last_row['close']
                    ema9 = last_row['EMA_9']
                    ema21 = last_row['EMA_21']
                    rsi = last_row['RSI_14']
                    macd_hist = last_row['MACDh_12_26_9']
                    
                    # Basic Confluence Engine (Algorithmic, real data)
                    confidence = 0
                    action = None
                    reasoning = []
                    
                    # Bullish check (Loosened for demo purposes)
                    if ema9 > 0: # Almost always true, so it generates a signal
                        action = "BUY" if rsi > 50 else "SELL"
                        confidence += 30
                        reasoning.append("EMA Trend Active")
                        if rsi > 50: confidence += 20; reasoning.append("Momentum Stable")
                        if macd_hist > 0: confidence += 30; reasoning.append("MACD Favorable")
                        
                        factors_str = " + ".join(reasoning)
                        ai_text = await self.get_ai_reasoning(symbol, action, price, factors_str)
                        
                        new_signals.append({
                            "id": int(time.time() * 1000) + hash(symbol) % 1000,
                            "pair": symbol,
                            "action": action,
                            "confidence": min(confidence + random.randint(10, 30), 99),
                            "entry": price,
                            "target": round(price * 1.015, 4) if action == "BUY" else round(price * 0.985, 4),
                            "sl": round(price * 0.99, 4) if action == "BUY" else round(price * 1.01, 4),
                            "aiReasoning": ai_text
                        })
                
                if new_signals:
                    self.state["signals"] = new_signals[:4] # Keep top 4
                
            except Exception as e:
                print(f"Scanner error: {e}")
            
            await asyncio.sleep(60) # Scan every 1 minute

    async def fetch_real_data(self):
        exchange = ccxt.binance()
        symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT']
        
        # Start scanner thread
        asyncio.create_task(self.run_technical_scanner(exchange, symbols))
        
        while True:
            try:
                tickers = await exchange.fetch_tickers(symbols)
                market_updates = []
                for symbol in symbols:
                    if symbol in tickers:
                        ticker = tickers[symbol]
                        self.prices[symbol] = ticker['last']
                        market_updates.append({
                            "pair": symbol,
                            "price": ticker['last'],
                            "change": ticker.get('percentage', 0.0)
                        })
                
                self.state["markets"] = market_updates
                
                # Calculate real paper PNL
                total_pnl = 0.0
                for pos in self.positions:
                    current_price = self.prices.get(pos["pair"], pos["entry_price"])
                    diff = current_price - pos["entry_price"]
                    if pos["side"] == "SELL":
                        diff = -diff
                    pnl = diff * pos["qty"]
                    total_pnl += pnl
                
                self.state["pnl"] = round(total_pnl, 2)
                self.state["positions"] = self.positions # Ensure positions are in state for frontend
                
            except Exception as e:
                print(f"Error fetching data: {e}")
            
            # Broadcast state
            await self.broadcast()
            await asyncio.sleep(2) # Poll every 2 seconds to avoid rate limits

    async def broadcast(self):
        disconnected = set()
        for ws in self.clients:
            try:
                await ws.send_json(self.state)
            except Exception:
                disconnected.add(ws)
        self.clients -= disconnected

    def handle_trade(self, payload):
        pair = payload.get("pair")
        side = payload.get("side") # BUY or SELL
        qty = float(payload.get("qty", 0))
        
        if pair not in self.prices or qty <= 0:
            return
            
        entry_price = self.prices[pair]
        cost = entry_price * qty
        
        if self.state["balance"] >= cost:
            self.state["balance"] -= cost
            new_pos = {
                "pair": pair,
                "side": side,
                "qty": qty,
                "entry_price": entry_price,
                "time": time.strftime("%H:%M:%S")
            }
            self.positions.append(new_pos)
            self.state["positions"] = self.positions
            print(f"✅ EXECUTED: {side} {qty} {pair} at ${entry_price}")
        else:
            print(f"❌ REJECTED: Insufficient balance for {side} {qty} {pair}")

engine = MarketStateEngine()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(engine.fetch_real_data())

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(frontend_dist, "index.html"))
    
    @app.get("/{full_path:path}")
    def serve_react_router(full_path: str):
        if not full_path.startswith("ws"):
            return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"status": "NeuralTrade Pro API Running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    engine.clients.add(websocket)
    print("Websocket client connected")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received WS data: {data}")
            try:
                payload = json.loads(data)
                if payload.get("action") == "TRADE":
                    print(f"Handling trade: {payload}")
                    engine.handle_trade(payload)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
    except WebSocketDisconnect:
        print("Websocket client disconnected")
        engine.clients.remove(websocket)
    except Exception as e:
        print(f"Websocket error: {e}")
        engine.clients.remove(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8888)
