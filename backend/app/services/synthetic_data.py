"""
Generador de Datos Financieros Sintéticos Complejos
====================================================

Este módulo genera series temporales realistas con:
- Ingresos quincenales (días 1 y 15 de cada mes)
- Gastos diarios con distribución variable
- Estacionalidad (picos en Diciembre y Julio)
- Tendencia oculta "Lifestyle Creep" (0.5% mensual)
- Ruido aleatorio gaussiano
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

import numpy as np
import pandas as pd

from app.models.schemas import Transaction


def generate_complex_user_history(
    n_months: int = 24,
    base_income: float = 2500.0,
    base_expenses: float = 1800.0,
    lifestyle_creep_rate: float = 0.005,  # 0.5% mensual
    random_seed: int | None = None
) -> List[Transaction]:
    """
    Genera un historial financiero sintético complejo y realista.
    
    Parámetros:
    -----------
    n_months : int
        Número de meses de historial a generar (default: 24)
    base_income : float
        Ingreso quincenal base en USD (default: 2500)
    base_expenses : float
        Gasto mensual base en USD (default: 1800)
    lifestyle_creep_rate : float
        Tasa de inflación personal mensual (default: 0.5%)
    random_seed : int | None
        Semilla para reproducibilidad (default: None)
        
    Retorna:
    --------
    List[Transaction]
        Lista de transacciones ordenadas cronológicamente
        
    Ejemplo:
    --------
    >>> transactions = generate_complex_user_history(n_months=12)
    >>> len(transactions)  # ~365 días de transacciones
    730
    >>> df = pd.DataFrame([t.dict() for t in transactions])
    >>> df['amount'].describe()
    """
    if random_seed is not None:
        np.random.seed(random_seed)
    
    # Configuración temporal
    start_date = datetime.now() - timedelta(days=n_months * 30)
    end_date = datetime.now()
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    transactions: List[Transaction] = []
    
    # ========== GENERACIÓN DÍA A DÍA ==========
    for day_idx, current_date in enumerate(date_range):
        month_num = (current_date - start_date).days // 30
        day_of_month = current_date.day
        month_of_year = current_date.month
        
        # ========== INGRESOS QUINCENALES ==========
        if day_of_month in [1, 15]:
            # Aplicar lifestyle creep acumulativo
            income_multiplier = (1 + lifestyle_creep_rate) ** month_num
            income_amount = base_income * income_multiplier
            
            # Pequeña variabilidad en el ingreso (±2%)
            income_amount *= np.random.uniform(0.98, 1.02)
            
            transactions.append(Transaction(
                timestamp=int(current_date.timestamp()),
                amount=round(income_amount, 2)
            ))
        
        # ========== GASTOS DIARIOS ==========
        # Factor de estacionalidad
        seasonality_factor = _calculate_seasonality_factor(month_of_year)
        
        # Aplicar lifestyle creep a gastos también
        expense_multiplier = (1 + lifestyle_creep_rate) ** month_num
        daily_expense_base = (base_expenses / 30) * expense_multiplier * seasonality_factor
        
        # Distribución de gastos: mayoría de días gasto normal, algunos días picos
        if np.random.rand() < 0.1:  # 10% de días con gasto alto
            daily_expense = daily_expense_base * np.random.uniform(2.0, 4.0)
        elif np.random.rand() < 0.3:  # 30% de días con gasto moderado
            daily_expense = daily_expense_base * np.random.uniform(1.2, 2.0)
        else:  # 60% de días con gasto normal
            daily_expense = daily_expense_base * np.random.uniform(0.7, 1.3)
        
        # Ruido gaussiano adicional
        noise = np.random.normal(0, daily_expense_base * 0.1)
        daily_expense += noise
        
        # Asegurar que el gasto sea negativo
        daily_expense = -abs(daily_expense)
        
        transactions.append(Transaction(
            timestamp=int(current_date.timestamp()),
            amount=round(daily_expense, 2)
        ))
    
    # Ordenar por timestamp
    transactions.sort(key=lambda t: t.timestamp)
    
    return transactions


def _calculate_seasonality_factor(month: int) -> float:
    """
    Calcula el factor de estacionalidad para un mes dado.
    
    Parámetros:
    -----------
    month : int
        Mes del año (1-12)
        
    Retorna:
    --------
    float
        Factor multiplicador (1.0 = normal, >1.0 = más gastos)
        
    Notas:
    ------
    - Diciembre (12): +50% gastos (Navidad, regalos, cenas)
    - Julio (7): +30% gastos (Vacaciones de verano)
    - Otros meses: variación menor ±10%
    """
    seasonality_map = {
        1: 1.05,   # Enero: cuesta de enero, pero aún gastos
        2: 0.95,   # Febrero: mes corto
        3: 1.0,    # Marzo: normal
        4: 1.05,   # Abril: Semana Santa
        5: 1.0,    # Mayo: normal
        6: 1.1,    # Junio: inicio de verano
        7: 1.3,    # Julio: VACACIONES 🏖️
        8: 1.15,   # Agosto: aún vacaciones
        9: 1.05,   # Septiembre: regreso a clases
        10: 1.0,   # Octubre: normal
        11: 1.1,   # Noviembre: preparación para fiestas
        12: 1.5,   # Diciembre: NAVIDAD 🎄
    }
    return seasonality_map.get(month, 1.0)


def calculate_analytics(transactions: List[Transaction]) -> dict:
    """
    Calcula métricas analíticas a partir de transacciones históricas.
    
    Parámetros:
    -----------
    transactions : List[Transaction]
        Lista de transacciones históricas
        
    Retorna:
    --------
    dict
        Diccionario con métricas clave:
        - monthly_avg_income: Ingreso promedio mensual
        - monthly_avg_expenses: Gasto promedio mensual
        - expense_volatility: Desviación estándar de gastos
        - savings_rate: Tasa de ahorro (%)
        - trend_slope: Pendiente de la tendencia lineal de gastos
    """
    if not transactions:
        return {
            "monthly_avg_income": 0.0,
            "monthly_avg_expenses": 0.0,
            "expense_volatility": 0.0,
            "savings_rate": 0.0,
            "trend_slope": 0.0
        }
    
    # Convertir a DataFrame de pandas
    df = pd.DataFrame([{
        'timestamp': t.timestamp,
        'amount': t.amount
    } for t in transactions])
    
    df['date'] = pd.to_datetime(df['timestamp'], unit='s')
    df['month'] = df['date'].dt.to_period('M')
    
    # Separar ingresos y gastos
    income_df = df[df['amount'] > 0]
    expenses_df = df[df['amount'] < 0]
    
    # Métricas mensuales
    monthly_income = income_df.groupby('month')['amount'].sum()
    monthly_expenses = expenses_df.groupby('month')['amount'].sum().abs()
    
    # Volatilidad (desviación estándar)
    expense_volatility = float(monthly_expenses.std()) if len(monthly_expenses) > 1 else 0.0
    
    # Tasa de ahorro
    avg_income = float(monthly_income.mean()) if len(monthly_income) > 0 else 0.0
    avg_expenses = float(monthly_expenses.mean()) if len(monthly_expenses) > 0 else 0.0
    savings_rate = ((avg_income - avg_expenses) / avg_income * 100) if avg_income > 0 else 0.0
    
    # Detectar tendencia en gastos (regresión lineal simple)
    if len(monthly_expenses) > 1:
        x = np.arange(len(monthly_expenses))
        y = monthly_expenses.values
        trend_slope = float(np.polyfit(x, y, 1)[0])  # Coeficiente lineal
    else:
        trend_slope = 0.0
    
    return {
        "monthly_avg_income": round(avg_income, 2),
        "monthly_avg_expenses": round(avg_expenses, 2),
        "expense_volatility": round(expense_volatility, 2),
        "savings_rate": round(savings_rate, 2),
        "trend_slope": round(trend_slope, 4)
    }


# ========== EJEMPLO DE USO ==========
if __name__ == "__main__":
    print("🔬 Generando datos sintéticos...")
    
    # Generar 24 meses de historial
    transactions = generate_complex_user_history(n_months=24, random_seed=42)
    
    print(f"✅ Generadas {len(transactions)} transacciones")
    
    # Calcular analytics
    analytics = calculate_analytics(transactions)
    
    print("\n📊 ANALYTICS:")
    print(f"  Ingreso mensual promedio: ${analytics['monthly_avg_income']:.2f}")
    print(f"  Gasto mensual promedio: ${analytics['monthly_avg_expenses']:.2f}")
    print(f"  Volatilidad de gastos: ${analytics['expense_volatility']:.2f}")
    print(f"  Tasa de ahorro: {analytics['savings_rate']:.2f}%")
    print(f"  Tendencia de gastos: ${analytics['trend_slope']:.4f}/mes")
    
    # Convertir a DataFrame para visualización
    df = pd.DataFrame([{'timestamp': t.timestamp, 'amount': t.amount} for t in transactions])
    df['date'] = pd.to_datetime(df['timestamp'], unit='s')
    
    print("\n🔍 Primeras 10 transacciones:")
    print(df.head(10))
