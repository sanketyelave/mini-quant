from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import yfinance as yf
from datetime import datetime, date
from typing import List

from database import get_db, create_tables
from models import StockPrice

app = FastAPI(title="Mini-Quant API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
create_tables()

@app.get("/")
def root():
    return {"message": "Welcome to Mini-Quant API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/stocks/{symbol}")
def get_stock_data(symbol: str, db: Session = Depends(get_db)):
    stocks = db.query(StockPrice).filter(StockPrice.symbol == symbol.upper()).all()
    if not stocks:
        raise HTTPException(status_code=404, detail="No data found for this symbol")
    
    return {"symbol": symbol.upper(), "data": [stock.to_dict() for stock in stocks]}

@app.post("/api/stocks/fetch/{symbol}")
def fetch_stock_data(symbol: str, db: Session = Depends(get_db)):
    try:
        # Fetch data from Yahoo Finance
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1mo")  # Last 30 days
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")
        
        # Clear existing data for this symbol
        db.query(StockPrice).filter(StockPrice.symbol == symbol.upper()).delete()
        
        # Insert new data
        for date_idx, row in hist.iterrows():
            stock_price = StockPrice(
                symbol=symbol.upper(),
                date=date_idx.date(),
                open=round(row['Open'], 2),
                high=round(row['High'], 2),
                low=round(row['Low'], 2),
                close=round(row['Close'], 2),
                volume=int(row['Volume'])
            )
            db.add(stock_price)
        
        db.commit()
        
        return {
            "message": f"Successfully fetched and stored data for {symbol.upper()}",
            "records_added": len(hist)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)