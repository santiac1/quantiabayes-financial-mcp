"""
API Router para Optimización de Portafolio - LIVE Market Data
============================================================

Endpoints para gestión cuantitativa de portafolios usando PyPortfolioOpt
con datos de mercado REALES desde Yahoo Finance.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.portfolio_optimizer import PortfolioOptimizer
from app.services.market_data import MarketDataService

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio Optimization"])

# ========== SCHEMAS ==========

class PortfolioOptimizationRequest(BaseModel):
    """Request para optimización de portafolio."""
    risk_tolerance: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Tolerancia al riesgo del usuario (0.0=Conservador, 1.0=Agresivo)"
    )
    current_assets: float = Field(
        ...,
        gt=0.0,
        description="Capital disponible para invertir en USD"
    )
    tickers: Optional[List[str]] = Field(
        default=None,
        description="Lista opcional de tickers (ej: ['AAPL', 'MSFT']). Si None, usa universo expandido por defect"
    )


class PortfolioOptimizationResponse(BaseModel):
    """Response de optimización de portafolio."""
    allocation: Dict[str, float] = Field(
        ...,
        description="Pesos óptimos por activo (porcentaje en decimal)"
    )
    expected_return: float = Field(
        ...,
        description="Retorno esperado anual (decimal, ej: 0.10 = 10%)"
    )
    volatility: float = Field(
        ...,
        description="Volatilidad (riesgo) anual (decimal)"
    )
    sharpe_ratio: float = Field(
        ...,
        description="Ratio de Sharpe (retorno ajustado por riesgo)"
    )
    discrete_allocation: Dict[str, int] = Field(
        default={},
        description="Número de acciones a comprar por activo"
    )
    leftover_cash: float = Field(
        default=0.0,
        description="Efectivo sobrante después de asignación discreta"
    )
    total_value: float = Field(
        ...,
        description="Valor total del portafolio"
    )
    tickers_used: List[str] = Field(
        default=[],
        description="Lista de tickers utilizados en la optimización"
    )
    meta: Dict = Field(
        default={},
        description="Metadata sobre la fuente de datos: source (LIVE/CACHED/SYNTHETIC), timestamp, etc."
    )


# ========== ENDPOINTS ==========

@router.post("/optimize", response_model=PortfolioOptimizationResponse)
async def optimize_portfolio(request: PortfolioOptimizationRequest) -> PortfolioOptimizationResponse:
    """
    Optimiza un portafolio usando Modern Portfolio Theory con datos REALES.
    
    **NUEVO:** Usa datos de mercado en vivo desde Yahoo Finance.
    
    Calcula la asignación óptima de activos basada en:
    - Tolerancia al riesgo del usuario
    - Capital disponible
    - Frontera eficiente y Max Sharpe Ratio
    - Datos históricos reales (2 años)
    
    Returns:
        Pesos óptimos, métricas de desempeño y asignación discreta
        
    Raises:
        HTTPException: Si la optimización falla
    """
    try:
        # Crear optimizador con tickers personalizados o default
        optimizer = PortfolioOptimizer(
            tickers=request.tickers,
            use_live_data=True  # SIEMPRE usar datos reales
        )
        
        # Ejecutar optimización
        result = optimizer.optimize_portfolio(
            risk_tolerance=request.risk_tolerance,
            current_assets=request.current_assets
        )
        
        # Retornar resultado
        return PortfolioOptimizationResponse(**result)
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error de validación: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en optimización de portafolio: {str(e)}"
        )


@router.get("/assets")
async def get_available_assets() -> Dict[str, str]:
    """
    Retorna el universo de activos EXPANDIDO disponible para inversión.
    
    Returns:
        Diccionario de activos con descripciones
    """
    return {
        # Índices
        "SPY": "S&P 500 ETF - Acciones de gran capitalización de EE.UU.",
        "QQQ": "Nasdaq-100 ETF - Sector tecnológico",
        
        # Tech/Growth
        "NVDA": "NVIDIA - Semiconductores e IA",
        "TSLA": "Tesla - Vehículos eléctricos",
        "AAPL": "Apple - Tecnología y hardware",
        
        # Cripto
        "BTC-USD": "Bitcoin - Criptomoneda líder",
        "ETH-USD": "Ethereum - Plataforma blockchain",
        
        # Defensa/Cobertura
        "GLD": "Gold ETF - Oro como cobertura contra inflación",
        "TLT": "Long-Term Treasury ETF - Bonos del tesoro a largo plazo"
    }


@router.get("/cache/info")
async def get_cache_info() -> Dict:
    """
    Retorna información sobre el estado del caché de market data.
    
    Útil para debugging y monitoreo.
    """
    return MarketDataService.get_cache_info()


@router.post("/cache/clear")
async def clear_cache() -> Dict[str, str]:
    """
    Limpia el caché de market data manualmente.
    
    Útil para forzar refresh de datos.
    """
    MarketDataService.clear_cache()
    return {"message": "Cache cleared successfully"}

