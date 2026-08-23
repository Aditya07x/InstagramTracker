# The Definitive Mathematical & Architectural Guide to Reelio ALSE

This guide details the exact mathematical computations, architectural assumptions, and fallback mechanisms of the 4,000-line 
eelio_alse.py tracking engine. It is written to maintain transparent, human-readable insights into *why* the model acts the way it does, while exposing the exact formulas for anyone auditing the mathematics.

---

## Part 1: Signal Preprocessing (The Bouncers)

Raw telemetry from an Android Accessibility Service is noisy. The preprocess_session function transforms unstructured touch coordinates into a feature matrix **O** for **T** videos (reels).

### The Feature Vector 
For every reel **t**, the system computes 7 features:

1. **Log Dwell Time:**
   *Formula:* x1 = log(1 + dwell_ms / 1000)
   *Assumption:* Dwell time follows a log-normal distribution. The +1 prevents log(0) resulting in negative infinity for micro-swipes.
2. **Log Speed:**
   *Formula:* Extracted from vertical scroll velocity, logged to suppress extreme flick outliers.
3. **Rhythm Dissociation (target beat vs. actual beat):**
   *Formula:* x3 = | delta_t_swipe - mu_beat | in ms
   *Assumption:* Zombie scrolling falls into a hypnotic metronomic rhythm. High dissociation means mindful searching.
4. **Rewatch Intensity:**
   *Formula:* Discrete count of loop triggers (>= 0).
5. **Exit Flag:**
   *Formula:* Boolean 1 if the user backed completely out of the reel, 0 if they just swiped to the next.
6. **Dwell Percentile:**
   *Formula:* Rank of current dwell time divided by total reels T. Result is between 0 and 1.
7. **Scroll Interval Coefficient of Variation (CV):**
   *Formula:* CV = sigma_trailing_5 / mu_trailing_5
   *Assumption:* The Coefficient of Variation over a 5-reel trailing window. If the variance sigma is extremely low, it signals robotic scrolling. If t < 5, or logs are missing, the fallback is 0.0.

---

## Part 2: Temporal Personalization (The Memory Book)

### UserBaseline (Exponential Moving Average)
The model must compare current sessions to a user's historical normal.
*Formula:* For continuous features (like dwell and speed), the baseline updates via:
mu_t = rho * x_session + (1 - rho) * mu_{t-1}

*The Adaptive rho Assumption:*
Instead of a fixed rho (e.g., 0.1), rho adapts conditionally. If the system detects the user is currently doomscrolling, it lowers rho to prevent the doom state from corrupting the baseline of what normal looks like.
*Fallbacks:* Initial mu_dwell = 3.5 sec, mu_speed = 1.0.

### RegimeDetector (CUSUM Algorithm)
Detects structural life shifts (e.g., losing a job) which ruin EMA tracking.
*Formula:* Cumulative Sum of session deviations.
S_i = max(0, S_{i-1} + (L_i - mu_L - k))
Where L_i is session length, mu_L is baseline length, and k is an assumed allowance drift (e.g., 0.05).
*Assumption:* If S_i > 8.0, a Regime Shift is declared. The HMM responds by intentionally forgetting old priors by flattening them to uniform distributions, allowing rapid relearning.

---

## Part 3: The Probabilistic Engine (Hidden Markov Model)

The core is a 2-State HMM. 
- State 0: Mindful (Regulated)
- State 1: Doomscrolling (Dysregulated)

### 1. State Transitions & Gap Decay (_a_gap)
Standard HMMs assume discrete time steps. Reelio uses a **Continuous-Time Markov Chain (CTMC)** because a user can close the app for 3 minutes or 3 days.

*Formula:* The generator matrix Q defines the instantaneous rate of moving between states:
Q = [[-q_01, q_01], [q_10, -q_10]]
The transition matrix for a time gap delta_t hours is the Matrix Exponential:
A_gap(delta_t) = exp(Q * delta_t)

*Assumption:* q_10 (recovery rate) is strictly bounded. It assumes reverting to Mindful takes biological time. At delta_t >= 4.0 hours, A_gap completely converges to the steady-state bounds, forgiving any prior momentum.

### 2. Weighted Log Emissions (_log_emission)
Given a state S, what is the probability of the feature vector O_t?
Instead of a pure multivariate Gaussian, Reelio uses explicitly weighted separable probabilities to prevent one noisy feature (like a broken speed metric) from hijacking the inference.

*Formula:*
log P(O_t | S) = SUM( w_j * log P_model(x_jt | theta_js) )
Where w_j is the feature_weight constrained to sum(w_j) = 1. The distributions P_model are normal N(mu, sigma^2) for continuous variables (dwell, speed) and Bernoulli for discrete (exit flag).

### 3. Inference (Forward-Backward / Baum-Welch)
The model calculates the exact probability of doomscrolling gamma_t(1) = P(S_t=1 | O_1...O_T) for every video t using scaled dynamic programming.

*Formulas:*
- **Forward Path:** alpha_t(j) = P(x_t | S_t=j) * SUM( alpha_{t-1}(i) * A_ij )
- **Backward Path:** beta_t(i) = SUM( A_ij * P(x_{t+1} | S_{t+1}=j) * beta_{t+1}(j) )
*Assumption:* Computations use logsumexp tricks entirely in log-space to prevent absolute arithmetic underflow, since multiplying 50 probabilities < 0.1 yields numbers too small for a 64-bit Python float.

### 4. Expectation-Maximization Updates (_m_step)
If the model guesses you were doomscrolling, it adjusts the feature weights w_j for tomorrow.
*Formula Idea:* It measures the Kullback-Leibler (KL) Divergence between the mindful distribution and doomscrolling distribution for each feature. If Rewatch Intensity cleanly separates State 0 and State 1, its weight goes up.

---

## Part 4: Explanatory Heuristics (DoomScorer)

Because an HMMs matrix exponentials and KL divergences are biologically opaque, the app translates behavior into a deterministic, human-readable 0-to-1 payload (C between 0 and 1) for the UI Radar Chart.

*Formulas:*
1. **Length:** max(0, min(1, T_sec / 1800)). Caps at 30 minutes.
2. **Volatile Content:** Normalized variance of empirical swipe speed.
3. **Rapid Re-entry:** If gap to last session < 5 mins, score -> 1.0. Assumes compulsivity.
4. **Environment:** Sine transform mapping 1 AM - 4 AM to 1.0, plus linear penalty for remaining battery percentage < 20%.
5. **Autopilot:** Ratio of predictable CV scroll intervals.
6. **Collapse:** Missing intent interactions (failed taps).
7. **Rewatch:** Pure ratio of loops.

*Architectural Contract:* To render correctly in the pp.jsx front-end, the scorer mathematically normalizes these 7 components so their sum equals 1.0.

---

## Part 5: Human-in-the-Loop Override (RegretValidator)

The final block integrates survey responses. If the computational math declares you were Mindful (gamma(1) = 0.1), but you manually survey I heavily regret that session.

*Formula:* Survey R (1 to 5) maps to Ground Truth Y (0 to 1).
Disagreement bias delta = | gamma(1) - Y |. 
If delta is large, the _compute_disagreement_bias acts as a catastrophic penalty on the unsupervised priors pi, mathematically forcing P(S=1) closer to Y.
*Assumption:* Human subjective reality always overrides kinematic inference. Computational accuracy is secondary to the user feeling heard by the system.
