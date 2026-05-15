"""
Optimizador de Portafolio Cuantitativo - LIVE Market Data Edition
==================================================================

Módulo profesional de gestión de portafolios usando Modern Portfolio Theory (MPT).

**UPGRADE:** Ahora usa datos de mercado REALES desde Yahoo Finance vía yfinance.

Utiliza PyPortfolioOpt para:
- Cálculo de la Frontera Eficiente
- Optimización Max Sharpe Ratio
- Ajuste por tolerancia al riesgo del usuario

**Assets Universe (Expandido):**
- SPY, QQQ: Índices (S&P 500, Nasdaq)
- NVDA, TSLA, AAPL: Tech/Growth
- BTC-USD, ETH-USD: Criptomonedas
- GLD, TLT: Defensa/Cobertura
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt import EfficientFrontier
from pypfopt.discrete_allocation import DiscreteAllocation

from app.services.market_data import MarketDataService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PortfolioOptimizer:
    """
    Motor de optimización cuantitativa de portafolios con datos REALES.
    
    Implementa Modern Portfolio Theory usando PyPortfolioOpt y datos
    de mercado en vivo desde Yahoo Finance.
    """
    
    def __init__(self, tickers: List[str] | None = None, use_live_data: bool = True):
        """
        Inicializa el optimizador.
        
        Args:
            tickers: Lista de símbolos a optimizar. Si None, usa DEFAULT_UNIVERSE
            use_live_data: Si True, usa datos reales; si False, usa sintéticos (testing)
        """
        self.tickers = tickers
        self.use_live_data = use_live_data
        self.metadata = {}  # Store data source metadata
        
        # Obtener datos de mercado (reales o sintéticos)
        if use_live_data:
            logger.info("📡 Using resilient data fetch (LIVE → CACHED → SYNTHETIC)")
            self.mu, self.S, self.metadata = MarketDataService.fetch_data_with_resilience(
                tickers=tickers,
                period="2y"
            )
        else:
            logger.info("⚠️ Using SYNTHETIC data (testing mode)")
            self.mu, self.S = self._generate_synthetic_market_data()
            self.metadata = {
                "source": "SYNTHETIC",
                "timestamp": datetime.now().isoformat(),
                "reason": "Testing mode enabled"
            }
    
    def _generate_synthetic_market_data(self) -> Tuple[pd.Series, pd.DataFrame]:
        """
        Genera rendimientos esperados y matriz de covarianza sintéticos.
        
        SOLO PARA TESTING - No debe usarse en producción.
        
        Returns:
            Tuple[pd.Series, pd.DataFrame]: (rendimientos esperados, matriz covarianza)
        """
        import numpy as np
        
        # Usar tickers especificados o fallback
        asset_list = self.tickers if self.tickers else ["SPY", "BND", "GLD", "BTC-USD"]
        
        # Rendimientos anuales esperados (sintéticos pero realistas)
        expected_annual_returns = {
            "SPY": 0.10,
            "BND": 0.04,
            "GLD": 0.06,
            "BTC-USD": 0.40,
            "QQQ": 0.12,
            "NVDA": 0.35,
            "TSLA": 0.25,
            "AAPL": 0.18,
            "ETH-USD": 0.50,
            "TLT": 0.03,
        }
        
        mu = pd.Series({asset: expected_annual_returns.get(asset, 0.08) for asset in asset_list})
        
        # Generar matriz de covarianza sintética
        n = len(asset_list)
        corr_matrix = np.eye(n) + np.random.uniform(-0.3, 0.3, (n, n))
        corr_matrix = (corr_matrix + corr_matrix.T) / 2
        np.fill_diagonal(corr_matrix, 1.0)
        
        volatilities = {
            "SPY": 0.15, "BND": 0.05, "GLD": 0.18, "BTC-USD": 0.80,
            "QQQ": 0.20, "NVDA": 0.45, "TSLA": 0.60, "AAPL": 0.25,
            "ETH-USD": 0.90, "TLT": 0.12
        }
        
        vol_array = np.array([volatilities.get(asset, 0.20) for asset in asset_list])
        vol_matrix = np.diag(vol_array)
        
        S = pd.DataFrame(
            vol_matrix @ corr_matrix @ vol_matrix,
            index=asset_list,
            columns=asset_list
        )
        
        return mu, S
    
    def optimize_portfolio(
        self,
        risk_tolerance: float,
        current_assets: float = 10000.0
    ) -> Dict:
        """
        Optimiza el portafolio usando Max Sharpe Ratio ajustado por tolerancia al riesgo.
        
        Args:
            risk_tolerance: Tolerancia al riesgo del usuario (0.0 = conservador, 1.0 = agresivo)
            current_assets: Capital disponible para invertir (USD)
            
        Returns:
            Dict con:
            - allocation: Pesos óptimos por activo
            - expected_return: Retorno esperado anual
            - volatility: Volatilidad (riesgo) anual
            - sharpe_ratio: Ratio de Sharpe
            - discrete_allocation: Asignación discreta (número de acciones)
            
        Raises:
            ValueError: Si la optimización falla
        """
        # Validar input
        if not 0.0 <= risk_tolerance <= 1.0:
            raise ValueError("risk_tolerance debe estar entre 0.0 y 1.0")
        
        # Validar que tenemos datos
        if len(self.mu) == 0 or len(self.S) == 0:
            raise ValueError("No market data available for optimization")
        
        # Verificar matriz de covarianza invertible
        try:
            np.linalg.inv(self.S)
            logger.info("✅ Covariance matrix is invertible")
        except np.linalg.LinAlgError:
            logger.warning("⚠️ Singular covariance matrix detected, adding jitter")
            # Agregar pequeño ruido a la diagonal (truc numérico estándar)
            jitter = np.eye(len(self.S)) * 1e-6
            self.S = self.S + jitter
            logger.info("✅ Jitter added, matrix should now be invertible")
        
        try:
            # Crear objeto de Frontera Eficiente
            ef = EfficientFrontier(self.mu, self.S)
            
            # Estrategia basada en tolerancia al riesgo
            if risk_tolerance < 0.3:
                # Conservador: Minimizar volatilidad
                ef.efficient_risk(target_volatility=0.07)
            elif risk_tolerance < 0.7:
                # Moderado: Max Sharpe Ratio
                ef.max_sharpe(risk_free_rate=0.03)
            else:
                # Agresivo: Alta volatilidad
                ef.efficient_risk(target_volatility=0.25)
            
            # Limpiar pesos
            weights = ef.clean_weights(cutoff=0.01)
            
            # Calcular métricas
            performance = ef.portfolio_performance(verbose=False, risk_free_rate=0.03)
            expected_return, volatility, sharpe_ratio = performance
            
            logger.info(f"📈 Optimization successful: Return={expected_return:.2%}, Vol={volatility:.2%}, Sharpe={sharpe_ratio:.3f}")
            
        except Exception as e:
            logger.error(f"❌ Optimization failed: {str(e)}")
            raise ValueError(f"Portfolio optimization failed: {str(e)}")
        
        # Calcular asignación discreta (cuántas acciones comprar)
        # Obtener precios actuales reales
        try:
            tickers_list = list(weights.keys())
            
            # Fetch latest prices
            latest_prices = {}
            for ticker in tickers_list:
                if weights[ticker] > 0:  # Solo para activos con peso > 0
                    try:
                        ticker_obj = yf.Ticker(ticker)
                        hist = ticker_obj.history(period="1d")
                        if not hist.empty:
                            latest_prices[ticker] = hist['Close'].iloc[-1]
                        else:
                            logger.warning(f"No price data for {ticker}, using fallback")
                            latest_prices[ticker] = 100.0  # Fallback
                    except Exception as e:
                        logger.warning(f"Error fetching price for {ticker}: {e}")
                        latest_prices[ticker] = 100.0  # Fallback
            
            latest_prices_series = pd.Series(latest_prices)
            logger.info(f"📊 Latest prices: {latest_prices}")
            
        except Exception as e:
            logger.error(f"Error fetching latest prices: {e}, using fallback")
            # Fallback genérico
            latest_prices_series = pd.Series({k: 100.0 for k in weights.keys() if weights[k] > 0})
        
        da = DiscreteAllocation(
            weights,
            latest_prices_series,
            total_portfolio_value=current_assets
        )
        
        allocation_shares, leftover = da.greedy_portfolio()
        
        return {
            "allocation": weights,
            "expected_return": float(expected_return),
            "volatility": float(volatility),
            "sharpe_ratio": float(sharpe_ratio),
            "discrete_allocation": allocation_shares,
            "leftover_cash": float(leftover),
            "total_value": float(current_assets),
            "tickers_used": list(self.mu.index),
            "meta": self.metadata  # Propagar metadata de la fuente de datos
        }


# ========== EJEMPLO DE USO ==========
if __name__ == "__main__":
    print("🔬 Probando Portfolio Optimizer...\n")
    
    optimizer = PortfolioOptimizer()
    
    # Prueba con 3 perfiles de riesgo
    risk_profiles = [
        (0.2, "Conservador"),
        (0.5, "Moderado"),
        (0.9, "Agresivo")
    ]
    
    for risk, label in risk_profiles:
        print(f"{'='*60}")
        print(f"📊 PERFIL: {label} (riesgo={risk})")
        print(f"{'='*60}")
        
        result = optimizer.optimize_portfolio(
            risk_tolerance=risk,
            current_assets=10000.0
        )
        
        print(f"\n💼 ASIGNACIÓN ÓPTIMA:")
        for asset, weight in result['allocation'].items():
            if weight > 0:
                print(f"   {asset}: {weight*100:.2f}%")
        
        print(f"\n📈 MÉTRICAS:")
        print(f"   Retorno Esperado: {result['expected_return']*100:.2f}% anual")
        print(f"   Volatilidad: {result['volatility']*100:.2f}% anual")
        print(f"   Sharpe Ratio: {result['sharpe_ratio']:.3f}")
        
        print(f"\n🎯 ASIGNACIÓN DISCRETA (con $10,000):")
        for asset, shares in result['discrete_allocation'].items():
            print(f"   {asset}: {shares} acciones")
        print(f"   Cash restante: ${result['leftover_cash']:.2f}\n")
