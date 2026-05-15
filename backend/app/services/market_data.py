"""
Servicio de Datos de Mercado Ultra-Resiliente - Production Grade
================================================================

Sistema de 3 capas con SURGICAL FETCH y fallback matemáticamente válido:
1. LIVE: Yahoo Finance API - ticker por ticker (aislamiento de fallos)
2. CACHED: Datos persistentes en disco
3. SYNTHETIC: Random Walk Geométrico (NO precios fijos)

CRÍTICO: Evita división por cero con datos sintéticos realistas.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Literal, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt import expected_returns, risk_models

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tipos para metadata
DataSource = Literal["LIVE", "CACHED", "SYNTHETIC"]
DATA_PROVIDER = "YAHOO"  # Preparado para multi-provider


class MarketDataService:
    """
    Servicio ultra-resiliente con Surgical Fetch.
    
    - Descarga ticker por ticker (aislamiento de fallos)
    - Fallback con Random Walk Geométrico (varianza > 0)
    - Logs detallados por asset
    """
    
    # Universo expandido
    DEFAULT_UNIVERSE = [
        "SPY", "QQQ",           # Índices
        "NVDA", "TSLA", "AAPL", # Tech/Growth
        "BTC-USD", "ETH-USD",   # Cripto
        "GLD", "TLT",           # Defensa
    ]
    
    CACHE_FILE = Path(__file__).parent.parent.parent / "data" / "market_cache.json"
    
    # Caché en memoria
    _memory_cache: Dict[Tuple[tuple, str], Tuple[pd.DataFrame, datetime]] = {}
    _MEMORY_TTL = timedelta(hours=1)
    
    @classmethod
    def fetch_data_with_resilience(
        cls,
        tickers: List[str] | None = None,
        period: str = "2y"
    ) -> Tuple[pd.Series, pd.DataFrame, Dict]:
        """
        Obtiene datos con SURGICAL FETCH y fallback inteligente.
        """
        if tickers is None:
            tickers = cls.DEFAULT_UNIVERSE
        
        tickers_tuple = tuple(sorted(tickers))
        cache_key = (tickers_tuple, period)
        
        # ========== INTENTO 1: SURGICAL LIVE FETCH ==========
        logger.info(f"🔄 Attempting SURGICAL FETCH for {len(tickers)} tickers...")
        
        try:
            prices_df = cls._surgical_fetch(tickers, period)
            
            if prices_df is not None and len(prices_df) > 0 and len(prices_df.columns) > 0:
                # Guardar a disco
                cls._save_to_disk(tickers, period, prices_df)
                cls._memory_cache[cache_key] = (prices_df, datetime.now())
                
                mu, S = cls._calculate_statistics(prices_df)
                
                metadata = {
                    "source": "LIVE",
                    "timestamp": datetime.now().isoformat(),
                    "tickers_count": len(mu),
                    "data_points": len(prices_df),
                    "successful_tickers": list(prices_df.columns)
                }
                
                logger.info(f"✅ SURGICAL FETCH successful: {len(prices_df.columns)} tickers")
                return mu, S, metadata
                
        except Exception as e:
            logger.warning(f"⚠️ SURGICAL FETCH failed: {str(e)}")
        
        # ========== INTENTO 2: DISK CACHE ==========
        logger.info(f"💾 Attempting DISK cache...")
        
        try:
            cached_data = cls._load_from_disk(tickers, period)
            
            if cached_data is not None:
                prices_df, saved_timestamp = cached_data
                mu, S = cls._calculate_statistics(prices_df)
                
                metadata = {
                    "source": "CACHED",
                    "timestamp": datetime.now().isoformat(),
                    "last_updated": saved_timestamp,
                    "tickers_count": len(mu),
                    "data_points": len(prices_df)
                }
                
                logger.info(f"✅ DISK cache loaded (saved: {saved_timestamp})")
                return mu, S, metadata
                
        except Exception as e:
            logger.warning(f"⚠️ DISK cache failed: {str(e)}")
        
        # ========== INTENTO 3: GEOMETRIC RANDOM WALK ==========
        logger.warning(f"🔧 Using GEOMETRIC RANDOM WALK (mathematically valid)")
        
        mu, S = cls._generate_geometric_random_walk(tickers, period)
        
        metadata = {
            "source": "SYNTHETIC",
            "timestamp": datetime.now().isoformat(),
            "tickers_count": len(mu),
            "warning": "Emergency fallback - Geometric Random Walk data"
        }
        
        logger.info(f"⚠️ Returning SYNTHETIC data (valid for optimization)")
        return mu, S, metadata
    
    @classmethod
    def _surgical_fetch(cls, tickers: List[str], period: str) -> pd.DataFrame | None:
        """
        Fetch ticker por ticker para aislar fallos.
        
        Si BTC falla, aún tenemos SPY, NVDA, etc.
        """
        all_prices = {}
        successful_count = 0
        
        for ticker in tickers:
            try:
                logger.info(f"  📡 Fetching {ticker}...")
                
                ticker_obj = yf.Ticker(ticker)
                hist = ticker_obj.history(period=period)
                
                if hist.empty or len(hist) < 10:
                    logger.warning(f"  ❌ {ticker}: No data or insufficient data ({len(hist)} rows)")
                    continue
                
                # Usar Adj Close si existe, sino Close
                if 'Adj Close' in hist.columns:
                    prices = hist['Adj Close']
                elif 'Close' in hist.columns:
                    prices = hist['Close']
                else:
                    logger.warning(f"  ❌ {ticker}: No price column found")
                    continue
                
                # Verificar que no esté todo en NaN
                if prices.isna().all():
                    logger.warning(f"  ❌ {ticker}: All prices are NaN")
                    continue
                
                all_prices[ticker] = prices
                successful_count += 1
                logger.info(f"  ✅ {ticker}: Success ({len(prices)} rows, last=${prices.iloc[-1]:.2f})")
                
            except Exception as e:
                logger.error(f"  ❌ {ticker}: Error - {str(e)}")
                continue
        
        if successful_count == 0:
            logger.error("💥 SURGICAL FETCH: 0 successful downloads")
            return None
        
        # Combinar en DataFrame
        prices_df = pd.DataFrame(all_prices)
        logger.info(f"📊 SURGICAL FETCH: {successful_count}/{len(tickers)} tickers successful")
        
        return prices_df
    
    @classmethod
    def _generate_geometric_random_walk(
        cls,
        tickers: List[str],
        period: str
    ) -> Tuple[pd.Series, pd.DataFrame]:
        """
        Genera datos sintéticos con Random Walk Geométrico.
        
        Fórmula: price_t = price_{t-1} * (1 + return_t)
        donde return_t ~ N(μ, σ)
        
        CRÍTICO: Garantiza varianza > 0 (NO división por cero)
        """
        logger.warning(f"🔧 Generating GEOMETRIC RANDOM WALK for {len(tickers)} tickers")
        
        # Parámetros realistas por tipo de asset
        params = {
            "SPY": (0.0004, 0.01),    # 10% anual, 15% vol
            "QQQ": (0.0005, 0.013),   # 12% anual, 20% vol
            "NVDA": (0.0012, 0.03),   # 35% anual, 45% vol
            "TSLA": (0.0009, 0.04),   # 25% anual, 60% vol
            "AAPL": (0.0007, 0.016),  # 18% anual, 25% vol
            "BTC-USD": (0.0013, 0.05), # 40% anual, 80% vol
            "ETH-USD": (0.0016, 0.06), # 50% anual, 90% vol
            "GLD": (0.0002, 0.012),   # 6% anual, 18% vol
            "TLT": (0.0001, 0.008),   # 3% anual, 12% vol
        }
        
        # Determinar número de días según period
        period_days = {
            "1y": 252,
            "2y": 504,
            "5y": 1260,
            "10y": 2520
        }
        n_days = period_days.get(period, 504)
        
        # Generar precios para cada ticker
        price_data = {}
        
        for ticker in tickers:
            # Obtener parámetros
            mu_daily, sigma_daily = params.get(ticker, (0.0003, 0.013))
            
            # Precio inicial aleatorio realista
            initial_price = np.random.uniform(50, 500)
            
            # Generar retornos diarios
            returns = np.random.normal(mu_daily, sigma_daily, n_days)
            
            # Calcular precios con Random Walk Geométrico
            prices = np.zeros(n_days)
            prices[0] = initial_price
            
            for t in range(1, n_days):
                prices[t] = prices[t-1] * (1 + returns[t])
            
            # Crear fecha index
            dates = pd.date_range(
                end=datetime.now(),
                periods=n_days,
                freq='D'
            )
            
            price_data[ticker] = pd.Series(prices, index=dates)
            
            logger.info(f"  🎲 {ticker}: Generated {n_days} days, ${prices[0]:.2f} → ${prices[-1]:.2f}")
        
        # Crear DataFrame
        prices_df = pd.DataFrame(price_data)
        
        # Calcular estadísticas
        mu = expected_returns.mean_historical_return(prices_df, frequency=252)
        S = risk_models.sample_cov(prices_df, frequency=252)
        
        # Verificar que la matriz NO es singular
        try:
            np.linalg.inv(S)
            logger.info("✅ Covariance matrix is invertible")
        except np.linalg.LinAlgError:
            logger.warning("⚠️ Covariance matrix is singular, adding jitter")
            S = S + np.eye(len(S)) * 1e-6
        
        logger.info(f"📊 Synthetic stats: Returns {mu.min():.2%} to {mu.max():.2%}")
        logger.info(f"               Volatility {S.values.diagonal().min()**0.5:.2%} to {S.values.diagonal().max()**0.5:.2%}")
        
        return mu, S
    
    @classmethod
    def _save_to_disk(cls, tickers: List[str], period: str, prices: pd.DataFrame):
        """Guarda a disco."""
        try:
            cls.CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            
            if cls.CACHE_FILE.exists():
                with open(cls.CACHE_FILE, 'r') as f:
                    cache = json.load(f)
            else:
                cache = {}
            
            cache_key = f"{','.join(sorted(tickers))}_{period}"
            
            cache[cache_key] = {
                "timestamp": datetime.now().isoformat(),
                "tickers": list(tickers),
                "period": period,
                "data": prices.to_json(orient='split', date_format='iso')
            }
            
            with open(cls.CACHE_FILE, 'w') as f:
                json.dump(cache, f, indent=2)
            
            logger.info(f"💾 Saved to disk: {len(prices.columns)} tickers")
            
        except Exception as e:
            logger.error(f"Failed to save to disk: {str(e)}")
    
    @classmethod
    def _load_from_disk(cls, tickers: List[str], period: str) -> Tuple[pd.DataFrame, str] | None:
        """Carga desde disco."""
        try:
            if not cls.CACHE_FILE.exists():
                return None
            
            with open(cls.CACHE_FILE, 'r') as f:
                cache = json.load(f)
            
            cache_key = f"{','.join(sorted(tickers))}_{period}"
            
            if cache_key not in cache:
                return None
            
            entry = cache[cache_key]
            prices = pd.read_json(entry['data'], orient='split')
            timestamp = entry['timestamp']
            
            return prices, timestamp
            
        except Exception as e:
            logger.error(f"Failed to load from disk: {str(e)}")
            return None
    
    @classmethod
    def _calculate_statistics(cls, prices: pd.DataFrame) -> Tuple[pd.Series, pd.DataFrame]:
        """Calcula rendimientos y covarianza."""
        mu = expected_returns.mean_historical_return(prices, frequency=252)
        S = risk_models.sample_cov(prices, frequency=252)
        
        logger.info(f"📊 Stats: {len(mu)} assets")
        logger.info(f"   Returns: {mu.min():.2%} to {mu.max():.2%}")
        logger.info(f"   Volatility: {S.values.diagonal().min()**0.5:.2%} to {S.values.diagonal().max()**0.5:.2%}")
        
        return mu, S
