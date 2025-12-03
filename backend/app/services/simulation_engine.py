from __future__ import annotations

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


def _build_env(initial_balance: float, forecast_mean: float) -> VecEnv:
    class SpendingEnv(Env):
        metadata = {"render_modes": []}

        def __init__(self) -> None:
            self.action_space = spaces.Discrete(3)  # 0: Save, 1: Spend, 2: Invest
            self.observation_space = spaces.Box(low=-1e6, high=1e6, shape=(2,), dtype=np.float32)
            self.state = np.array([initial_balance, forecast_mean], dtype=np.float32)
            self.step_count = 0

        def reset(self, *, seed: int | None = None, options: Dict | None = None):  # type: ignore[override]
            super().reset(seed=seed)
            self.state = np.array([initial_balance, forecast_mean], dtype=np.float32)
            self.step_count = 0
            return self.state, {}

        def step(self, action: int):  # type: ignore[override]
            balance, forecast = self.state
            adjustment = np.array([20.0, -30.0, 10.0], dtype=np.float32)[action]
            balance += adjustment
            reward = float(balance + 0.1 * forecast)
            self.step_count += 1
            terminated = self.step_count >= 5
            truncated = False
            self.state = np.array([balance, forecast], dtype=np.float32)
            return self.state, reward, terminated, truncated, {}

    return DummyVecEnv([SpendingEnv])


def run_simulation(user_data: SimulationRequest, progress: ProgressCallback | None = None) -> SimulationResult:
    progress = progress or (lambda message: None)
    settings = get_settings()
    progress("Compilando modelo Stan...")

    stan_file = Path(__file__).resolve().parent.parent / "models" / "financial_logic.stan"
    stan_cache = Path(settings.stan_model_dir)
    stan_cache.mkdir(parents=True, exist_ok=True)
    model = CmdStanModel(stan_file=str(stan_file), compile_dir=str(stan_cache))

    amounts = np.array([txn.amount for txn in user_data.transactions], dtype=float)
    if amounts.size == 0:
        raise ValueError("Se requieren transacciones para la simulación")

    data = {"N": len(amounts), "y": amounts, "N_forecast": 7}
    progress("Ejecutando muestreo HMC...")
    fit = model.sample(data=data, chains=2, iter_sampling=500, iter_warmup=250, show_progress=False)

    y_forecast = fit.stan_variable("y_forecast")
    forecast_mean = np.mean(y_forecast, axis=0)
    lower = np.quantile(y_forecast, 0.1, axis=0)
    upper = np.quantile(y_forecast, 0.9, axis=0)

    forecast_points: List[ForecastPoint] = []
    for idx, (m, l, u) in enumerate(zip(forecast_mean, lower, upper), start=1):
        forecast_points.append(ForecastPoint(day=idx, mean=float(m), lower=float(l), upper=float(u)))

    progress("Entrenando agente PPO...")
    env = _build_env(user_data.current_balance, float(np.mean(forecast_mean)))
    model_rl = PPO("MlpPolicy", env, verbose=0, n_steps=16, batch_size=16)
    model_rl.learn(total_timesteps=200)

    obs = env.reset()
    action, _ = model_rl.predict(obs, deterministic=True)
    action_map = {0: "AHORRAR", 1: "GASTAR", 2: "INVERTIR"}
    recommended_action = action_map.get(int(action), "AHORRAR")

    progress("Listo")
    return SimulationResult(forecast_data=forecast_points, recommended_action=recommended_action)
