from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Transaction(BaseModel):
    timestamp: int = Field(..., description="Unix timestamp for the transaction")
    amount: float = Field(..., description="Transaction amount")


class SimulationRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    transactions: List[Transaction] = Field(..., description="Historical transactions ordered by time")
    current_balance: float = Field(..., description="Current account balance")


class ForecastPoint(BaseModel):
    day: int
    mean: float
    lower: float
    upper: float


class SimulationResult(BaseModel):
    forecast_data: List[ForecastPoint]
    recommended_action: str
    analytics: Optional[Dict[str, float]] = Field(
        default=None,
        description="Métricas financieras analíticas: monthly_avg_income, monthly_avg_expenses, expense_volatility, savings_rate, trend_slope"
    )

