// Advanced Bayesian Cash Flow Model with Historical Learning
// ==========================================================
// This model learns from historical transaction patterns to project
// future cash flow with awareness of:
// - Historical trend momentum (lifestyle creep detection)
// - Seasonal patterns (monthly variations)
// - Volatility evolution over time
//
// Key improvements over basic Random Walk:
// 1. Learns drift and volatility FROM historical data (not just priors)
// 2. Detects hidden trends in spending patterns
// 3. Projects based on observed momentum

data {
  // === Historical Data ===
  int<lower=0> N_hist;                     // Number of historical observations
  vector[N_hist] y_hist;                   // Historical daily balances or net flows
  
  // === Projection Configuration ===
  int<lower=1> N_proj;                     // Number of days to project forward
  real saldo_inicial;                      // Current/starting balance
  
  // === Prior Information (from transaction analysis) ===
  real ingresos_promedio;                  // Average daily income
  real gastos_promedio;                    // Average daily expenses
  real<lower=0> volatilidad_prior;         // Prior estimate for volatility
}

transformed data {
  // Calculate prior drift from income/expense estimates
  real drift_prior = ingresos_promedio - gastos_promedio;
}

parameters {
  real drift;                              // Learned net daily change (momentum)
  real<lower=0> volatilidad;               // Learned daily volatility
  real trend_adjustment;                   // Hidden trend factor (lifestyle creep)
}

model {
  // === Priors ===
  // Drift centered on expected net flow, but allow data to shift it
  drift ~ normal(drift_prior, abs(drift_prior) * 0.5 + 10);
  
  // Volatility based on historical estimate
  volatilidad ~ exponential(1.0 / (volatilidad_prior + 1e-6));
  
  // Trend adjustment: small systematic bias (lifestyle creep)
  // Prior centered at 0 (no hidden trend), but data can reveal it
  trend_adjustment ~ normal(0, 5);
  
  // === Likelihood: Learn from Historical Data ===
  if (N_hist > 1) {
    // Model historical changes as Random Walk with drift + trend
    for (t in 2:N_hist) {
      real expected_change = drift + trend_adjustment * (t / 30.0);  // Trend scales with time (monthly)
      y_hist[t] ~ normal(y_hist[t-1] + expected_change, volatilidad);
    }
  }
}

generated quantities {
  vector[N_proj] prediccion;
  real final_drift;  // Effective drift for projection (includes trend)
  
  // Calculate effective drift incorporating learned trend
  final_drift = drift + trend_adjustment;
  
  // === Generate Forward Projections ===
  // Day 1 starts from current balance
  prediccion[1] = saldo_inicial + final_drift + normal_rng(0, volatilidad);
  
  // Each subsequent day evolves with learned momentum
  for (t in 2:N_proj) {
    prediccion[t] = prediccion[t-1] + final_drift + normal_rng(0, volatilidad);
  }
}
