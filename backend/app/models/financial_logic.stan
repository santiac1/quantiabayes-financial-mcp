// Hierarchical Bayesian trend estimation for spending patterns
// Models a latent linear trend with observation noise and propagates
// uncertainty to future days.

data {
  int<lower=1> N;                 // number of observations
  vector[N] y;                    // spending amounts
  int<lower=1> N_forecast;        // forecast horizon
}

parameters {
  real alpha;                     // baseline
  real beta;                      // linear trend
  real<lower=0> sigma;            // noise
}

model {
  alpha ~ normal(0, 10);
  beta ~ normal(0, 5);
  sigma ~ exponential(1);
  y ~ normal(alpha + beta * linspaced_vector(N, 1, N), sigma);
}

generated quantities {
  vector[N_forecast] y_forecast;
  for (n in 1:N_forecast) {
    real t = N + n;
    y_forecast[n] = normal_rng(alpha + beta * t, sigma);
  }
}
