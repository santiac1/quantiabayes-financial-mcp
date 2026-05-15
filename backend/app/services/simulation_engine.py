from __future__ import annotations

import os
import cmdstanpy
import json
from pathlib import Path
from typing import Callable, Dict, List

import numpy as np
from cmdstanpy import CmdStanModel
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import DummyVecEnv
from stable_baselines3.common.vec_env import VecEnv
from gymnasium import Env
from gymnasium import spaces

from app.core.config import get_settings
from app.models.schemas import ForecastPoint, SimulationRequest, SimulationResult

ProgressCallback = Callable[[str], None]


def ensure_cmdstan_installed():
    """Autoreparación: Instala CmdStan si falta"""
    cmdstan_path = os.getenv('CMDSTAN', '/opt/cmdstan')
    bin_path = os.path.join(cmdstan_path, 'bin', 'stanc')
    
    if not os.path.exists(bin_path):
        print(f"⚠️ CmdStan no encontrado en {bin_path}. Intentando instalar...")
        try:
            cmdstanpy.install_cmdstan(dir=cmdstan_path, version='2.34.1', overwrite=True)
            print("✅ CmdStan instalado correctamente.")
        except Exception as e:
            print(f"❌ Error instalando CmdStan: {e}")
            raise e


class FinancialEnv(Env):
    """
    Ambiente de RL para decisiones financieras.
    
    Estado: [saldo_actual, tendencia_proyectada, riesgo_calculado]
    Acciones: 0 = Ahorrar agresivamente, 1 = Invertir excedente, 2 = Mantener liquidez
    """
    metadata = {"render_modes": []}

    def __init__(self, initial_balance: float, projected_trend: float, risk: float) -> None:
        super().__init__()
        self.action_space = spaces.Discrete(3)
        # Estado: [balance, trend, risk]
        self.observation_space = spaces.Box(
            low=np.array([-1e6, -1e4, 0.0], dtype=np.float32),
            high=np.array([1e6, 1e4, 1000.0], dtype=np.float32),
            dtype=np.float32
        )
        self.initial_state = np.array([initial_balance, projected_trend, risk], dtype=np.float32)
        self.state = self.initial_state.copy()
        self.step_count = 0

    def reset(self, *, seed: int | None = None, options: Dict | None = None):  # type: ignore[override]
        super().reset(seed=seed)
        self.state = self.initial_state.copy()
        self.step_count = 0
        return self.state, {}

    def step(self, action: int):  # type: ignore[override]
        balance, trend, risk = self.state
        
        # Simulación de impacto de cada acción
        if action == 0:  # Ahorrar agresivamente
            balance_change = 50.0  # Incremento conservador
            risk_change = -10.0    # Reduce riesgo
        elif action == 1:  # Invertir excedente
            balance_change = trend * 0.5  # Depende de la tendencia
            risk_change = 5.0     # Aumenta riesgo
        else:  # Mantener liquidez
            balance_change = 0.0
            risk_change = 0.0
        
        balance += balance_change
        risk = max(0.0, risk + risk_change)
        
        # Recompensa: balance ponderado por riesgo
        reward = float(balance - 0.01 * risk)
        
        self.step_count += 1
        terminated = self.step_count >= 10
        truncated = False
        
        self.state = np.array([balance, trend, risk], dtype=np.float32)
        return self.state, reward, terminated, truncated, {}


def _build_env(initial_balance: float, projected_trend: float, risk: float) -> VecEnv:
    """Construye el ambiente vectorizado para entrenamiento del agente"""
    return DummyVecEnv([lambda: FinancialEnv(initial_balance, projected_trend, risk)])


def _estimate_financial_parameters(transactions: List, current_balance: float) -> tuple[float, float, float]:
    """
    Extrae parámetros financieros de las transacciones históricas.
    
    Returns:
        (ingresos_promedio, gastos_promedio, volatilidad_estimada)
    """
    if not transactions:
        return 0.0, 0.0, 100.0
    
    amounts = np.array([txn.amount for txn in transactions], dtype=float)
    
    # Separar ingresos (positivos) y gastos (negativos)
    ingresos = amounts[amounts > 0]
    gastos = amounts[amounts < 0]
    
    ingresos_promedio = float(np.mean(ingresos)) if len(ingresos) > 0 else 0.0
    gastos_promedio = float(abs(np.mean(gastos))) if len(gastos) > 0 else 0.0
    
    # Estimar volatilidad como desviación estándar de los montos
    volatilidad = float(np.std(amounts)) if len(amounts) > 1 else 100.0
    volatilidad = max(volatilidad, 10.0)  # Minimum volatility threshold
    
    return ingresos_promedio, gastos_promedio, volatilidad


def _load_or_create_rl_agent(env: VecEnv, model_path: Path) -> PPO:
    """
    Carga un agente PPO pre-entrenado o crea uno nuevo si no existe.
    
    Args:
        env: Ambiente de RL
        model_path: Ruta al modelo guardado
        
    Returns:
        Agente PPO (cargado o nuevo)
    """
    if model_path.exists():
        try:
            print(f"📦 Cargando agente RL desde {model_path}")
            return PPO.load(str(model_path), env=env)
        except Exception as e:
            print(f"⚠️ Error cargando modelo RL: {e}. Creando nuevo agente...")
    
    # Crear nuevo agente con configuración optimizada
    print("🆕 Creando nuevo agente RL...")
    return PPO(
        "MlpPolicy",
        env,
        verbose=0,
        n_steps=32,
        batch_size=32,
        learning_rate=3e-4,
        ent_coef=0.01,
    )


def run_simulation(user_data: SimulationRequest, progress: ProgressCallback | None = None) -> SimulationResult:
    """
    Ejecuta la simulación Bayesiana con Random Walk + Decisión del Agente RL.
    
    NUEVO: Genera datos sintéticos complejos si el usuario no tiene historial,
    permitiendo que el modelo Bayesiano aprenda patrones ocultos.
    
    Args:
        user_data: Datos del usuario (balance actual, transacciones)
        progress: Callback opcional para reportar progreso
        
    Returns:
        Resultado de la simulación con proyecciones y recomendación
    """
    ensure_cmdstan_installed()
    progress = progress or (lambda message: None)
    settings = get_settings()
    
    # ========== PASO 1: Preparar datos (reales o sintéticos) ==========
    transactions = user_data.transactions
    
    # Si no hay transacciones o muy pocas, generar datos sintéticos complejos
    if not transactions or len(transactions) < 30:
        progress("⚙️ Generando historial sintético complejo (24 meses)...")
        from app.services.synthetic_data import generate_complex_user_history, calculate_analytics
        
        transactions = generate_complex_user_history(
            n_months=24,
            base_income=2500.0,
            base_expenses=1800.0,
            lifestyle_creep_rate=0.005,  # 0.5% mensual
            random_seed=None  # Datos diferentes cada vez
        )
        
        print(f"✅ Generadas {len(transactions)} transacciones sintéticas")
        
        # Calcular analytics de los datos sintéticos
        analytics = calculate_analytics(transactions)
        print(f"📊 Analytics: Ahorro mensual = ${analytics['monthly_avg_income'] - analytics['monthly_avg_expenses']:.2f}")
    else:
        # Usar datos reales del usuario
        from app.services.synthetic_data import calculate_analytics
        analytics = calculate_analytics(transactions)
        print(f"📊 Usando {len(transactions)} transacciones reales del usuario")
    
    # ========== PASO 2: Extraer parámetros financieros ==========
    progress("Extrayendo parámetros financieros...")
    ingresos_promedio, gastos_promedio, volatilidad = _estimate_financial_parameters(
        transactions, 
        user_data.current_balance
    )
    
    print(f"📊 Parámetros estimados:")
    print(f"   - Saldo inicial: ${user_data.current_balance:.2f}")
    print(f"   - Ingresos promedio: ${ingresos_promedio:.2f}/día")
    print(f"   - Gastos promedio: ${gastos_promedio:.2f}/día")
    print(f"   - Volatilidad: ${volatilidad:.2f}")
    
    # ========== PASO 3: Preparar historial para Stan ==========
    progress("Preparando serie temporal histórica...")
    
    # Convertir transacciones a serie de balance diario acumulativo
    import pandas as pd
    df = pd.DataFrame([{
        'timestamp': t.timestamp,
        'amount': t.amount
    } for t in transactions])
    df['date'] = pd.to_datetime(df['timestamp'], unit='s')
    df = df.sort_values('date')
    
    # Calcular balance acumulativo diario
    # Agrupamos por día y sumamos todas las transacciones de ese día
    daily_balance = df.groupby(df['date'].dt.date)['amount'].sum()
    cumulative_balance = daily_balance.cumsum()
    
    # Tomar últimos N días para el modelo (máximo 90 días para velocidad)
    max_hist_days = 90
    if len(cumulative_balance) > max_hist_days:
        historical_balances = cumulative_balance.iloc[-max_hist_days:].values
    else:
        historical_balances = cumulative_balance.values
    
    # Ajustar saldo inicial basado en el historial
    if len(historical_balances) > 0:
        # Normalizar para que termine en saldo_inicial
        balance_adjustment = user_data.current_balance - historical_balances[-1]
        historical_balances = historical_balances + balance_adjustment
    
    print(f"📈 Preparados {len(historical_balances)} días de historial para Stan")
    
    # ========== PASO 4: Compilar y ejecutar modelo Stan MEJORADO ==========
    progress("Compilando modelo Stan mejorado (con aprendizaje histórico)...")
    stan_file = Path(__file__).resolve().parent.parent / "models" / "financial_logic.stan"
    stan_cache = Path(settings.stan_model_dir)
    stan_cache.mkdir(parents=True, exist_ok=True)
    
    model = CmdStanModel(stan_file=str(stan_file))
    
    # Datos para el modelo mejorado con historial
    stan_data = {
        "N_hist": len(historical_balances),
        "y_hist": historical_balances.tolist() if len(historical_balances) > 0 else [user_data.current_balance],
        "N_proj": 7,  # Proyectar 7 días
        "saldo_inicial": user_data.current_balance,
        "ingresos_promedio": ingresos_promedio,
        "gastos_promedio": gastos_promedio,
        "volatilidad_prior": volatilidad,
    }
    
    progress("Ejecutando muestreo Bayesiano (HMC con aprendizaje)...")
    fit = model.sample(
        data=stan_data,
        chains=2,
        iter_sampling=500,
        iter_warmup=250,
        show_progress=False
    )
    
    # Extraer predicciones
    prediccion = fit.stan_variable("prediccion")  # Shape: (n_samples, N)
    forecast_mean = np.mean(prediccion, axis=0)
    lower = np.quantile(prediccion, 0.1, axis=0)
    upper = np.quantile(prediccion, 0.9, axis=0)
    
    # ========== PASO 5: Lógica de RL - Agente Financiero ==========
    progress("Preparando agente de Reinforcement Learning...")
    
    # Calcular métricas para el estado del agente
    projected_trend = float(forecast_mean[-1] - user_data.current_balance) / 7  # Tendencia diaria
    calculated_risk = float(np.mean(upper - lower))  # Amplitud del intervalo de confianza
    
    print(f"🤖 Estado del agente RL:")
    print(f"   - Balance actual: ${user_data.current_balance:.2f}")
    print(f"   - Tendencia proyectada: ${projected_trend:.2f}/día")
    print(f"   - Riesgo calculado: ${calculated_risk:.2f}")
    
    # Construir ambiente y cargar/crear agente
    env = _build_env(user_data.current_balance, projected_trend, calculated_risk)
    rl_model_path = stan_cache / "rl_agent_ppo.zip"
    
    agent = _load_or_create_rl_agent(env, rl_model_path)
    
    # Entrenar brevemente (o skip si ya existe modelo)
    if not rl_model_path.exists():
        progress("Entrenando agente PPO...")
        agent.learn(total_timesteps=500)
        agent.save(str(rl_model_path))
        print(f"💾 Agente guardado en {rl_model_path}")
    
    # Obtener recomendación del agente
    obs = env.reset()
    action, _ = agent.predict(obs, deterministic=True)
    
    # Mapear acción a recomendación en español
    action_map = {
        0: "AHORRAR_AGRESIVAMENTE",
        1: "INVERTIR_EXCEDENTE",
        2: "MANTENER_LIQUIDEZ"
    }
    recommended_action = action_map.get(int(action), "MANTENER_LIQUIDEZ")
    
    print(f"✅ Recomendación del agente: {recommended_action}")
    
    # ========== PASO 6: Estructurar respuesta JSON con Analytics ==========
    forecast_points: List[ForecastPoint] = []
    for idx, (m, l, u) in enumerate(zip(forecast_mean, lower, upper), start=1):
        forecast_points.append(
            ForecastPoint(
                day=idx,
                mean=float(m),
                lower=float(l),
                upper=float(u)
            )
        )
    
    progress("✅ Simulación completada")
    
    # Crear resultado con analytics incluidos
    result = SimulationResult(
        forecast_data=forecast_points,
        recommended_action=recommended_action,
        analytics=analytics if 'analytics' in locals() else None
    )
    
    return result

