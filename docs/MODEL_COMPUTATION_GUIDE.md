# The Definitive Mathematical & Architectural Guide to Reelio ALSE (v3.0)

This guide details the exact mathematical computations, architectural assumptions, fallback mechanisms, and signal flows of the Adaptive Latent State Engine ([reelio_alse.py](file:///c:/Users/Laptop/OneDrive%20-%20IIT%20Kanpur/Android%20Projects/InstagramTracker/app/src/main/python/reelio_alse.py)) tracking engine. It provides transparent, human-readable insights into *why* the model behaves the way it does, alongside exact formulas for rigorous verification and auditing.

---

## Architecture Overview

Reelio models smartphone short-video consumption ("doomscrolling") using an on-device, unsupervised-first probabilistic architecture. Rather than relying on rigid heuristic rules or cloud inference, Reelio uses a continuous-time Hidden Markov Model with Bayesian personalization, multi-tier temporal memory, and human-in-the-loop survey calibration.

```
+-----------------------------------------------------------------------------------+
|                           Android Ingestion Layer                                 |
|          (InstaAccessibilityService.kt + SessionManager.kt -> insta_data.csv)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Part 1: Signal Preprocessing                               |
|        - Session deduplication (dedupe_session_rows)                              |
|        - 7-dimensional feature matrix O_t (log_dwell, log_speed, rhythm, etc.)    |
|        - Pre-session context & fatigue proxies                                    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                 Part 2: Bayesian Personalization & Temporal Memory                |
|        - UserBaseline: Retention-weighted EMA updates (rho = 0.95 / 0.99)         |
|        - RegimeDetector: 4-criteria changepoint detection (CUSUM, dwell, len, KL) |
|        - 3 Memory Banks: Recent (rho=0.60), Medium (rho=0.85), Long (rho=0.97)    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                   Part 3: The Probabilistic Engine (HMM / CTMC)                   |
|        - Continuous-Time Markov Chain (CTMC) gap decay: A_gap(Delta t)            |
|        - Contextual Prior pi via 9-dimensional logistic regression                |
|        - Bivariate Gaussian emission (dwell + speed) + Gaussian feature emissions |
|        - Forward-Backward (Baum-Welch) inference in log-space (logsumexp)         |
|        - Dynamic feature weight adaptation via KL divergence                      |
|        - Architectural inequality constraints enforcement                         |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
                    v                                       v
+---------------------------------------+   +---------------------------------------+
|    Part 4: Explanatory Heuristics     |   |   Part 5: Human-in-the-Loop Override  |
|              (DoomScorer)             |   |           (RegretValidator)           |
|  - 7 normalized heuristic components  |   |  - Hierarchical supervision priority  |
|  - Online soft-supervision weights    |   |  - Label confidence L_conf            |
|  - Additive survey amplifiers         |   |  - Label-aware exponential decay      |
+-------------------+-------------------+   +-------------------+-------------------+
                    |                                       |
                    +-------------------+-------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|              Part 6: Post-Processing, Calibration & UI Presentation               |
|        - Systematic over-prediction calibration bias (CALIBRATION_BIAS = 0.357)   |
|        - Single source of truth classification (DOOM_PROBABILITY_THRESHOLD = 0.55)|
|        - Day-frequency recurrence amplification (compute_frequency_risk)          |
|        - Interpretable Model Confidence Decomposition (Bhattacharyya separation)      |
|        - Hybrid fallback & calibration display in app.jsx                         |
+-----------------------------------------------------------------------------------+
```

---

## Part 1: Signal Preprocessing & Feature Engineering

Raw telemetry from `InstaAccessibilityService.kt` is stored in `insta_data.csv` (Schema Version 5, 100 columns). The `preprocess_session` pipeline prepares the feature observation matrix $\mathbf{O} \in \mathbb{R}^{T \times 7}$ for a session of $T$ reels.

### 1.1 Session Deduplication
To prevent end-of-session writing artifacts (where the last reel row is repeatedly appended), `dedupe_session_rows` inspects `CumulativeReels` and discards duplicate trailing records while preserving the initial entry.

### 1.2 The 7 Emission Features ($\mathbf{O}_t$)
For every reel $t \in \{1, \dots, T\}$, the system computes a 7-dimensional feature vector $\mathbf{x}_t$:

1. **Log Dwell Time ($x_{0,t}$):**
   $$\text{log\_dwell}_t = \log(\max(\text{DwellTime}_t, 10^{-3}))$$
   *Rationale:* Raw dwell times in seconds follow a log-normal distribution. Lower clipping prevents $\log(0) \to -\infty$ on micro-swipes.
2. **Log Speed ($x_{1,t}$):**
   $$\text{log\_speed}_t = \log(\max(\text{AvgScrollSpeed}_t, 1.0))$$
   *Rationale:* Vertical scroll velocity is right-skewed; logarithmic compression dampens extreme flick outliers.
3. **Rhythm Dissociation ($x_{2,t}$):**
   $$\text{rhythm\_dissociation}_t = \text{ScrollRhythmEntropy}_t$$
   *Rationale:* Shannon entropy over inter-scroll interval histograms. Hypnotic, metronomic scrolling produces concentrated, low-entropy intervals. Single-reel sessions fallback to a neutral midpoint of $0.80$.
4. **Rewatch Intensity ($x_{3,t}$):**
   $$\text{rewatch\_intensity}_t = \log(1 + \text{BackScrollCount}_t)$$
   *Rationale:* Count of upward back-scrolls per reel, log-transformed via $\log(1+x)$ to represent compulsive loop-checking.
5. **Exit Conflict Flag ($x_{4,t}$):**
   $$\text{exit\_flag}_t = \log(1 + \text{AppExitAttempts}_t)$$
   *Rationale:* Captures physical resistance when a user initiates back/home gestures but remains inside the feed.
6. **Dwell Percentile ($x_{5,t}$):**
   $$\text{dwell\_pctile}_t = \text{PercentileRank}(\text{DwellTime}_t) \in [0, 100]$$
   *Rationale:* Relative dwell duration compared across the session history (defaults to $50.0$ if uncomputed).
7. **Scroll Interval Coefficient of Variation ($x_{6,t}$):**
   $$\text{scroll\_interval\_cv}_t = \frac{\sigma_{\text{dwell}, \text{session}}}{\max(\mu_{\text{dwell}, \text{session}}, 10^{-3})}$$
   *Rationale:* Measures kinematic regularity. Extremely low CV indicates robotic, automatic scrolling without selective pauses.

### 1.3 Pre-Session Risk & Fatigue Context
- **Intent Mismatch (`intent_mismatch`):** Triggered when the user declared a low-risk intent ("Quick break", "Specific content lookup") but engaged in a prolonged session ($T > 20$ reels) or high exit conflict ($>0.05$).
- **Fatigue Risk (`fatigue_risk`):** Wakefulness proxy computed from inferred sleep end:
  $$\text{hours\_awake} = (\text{hour} - \text{SleepEnd}) \pmod{24}, \quad \text{fatigue\_risk} = \text{clip}\left(\frac{\text{hours\_awake}}{16.0}, 0.0, 1.0\right)$$

---

## Part 2: Temporal Personalization & Memory Architecture

### 2.1 Personalized Bayesian Baseline (`UserBaseline`)
The model anchors priors to each individual's rolling behavioral distribution rather than using population-wide constants.

- **Initialization Defaults:**
  - $\mu_{\text{dwell}, \text{personal}} = 1.60$ ($\approx 4.95\text{s}$ in natural time), $\sigma_{\text{dwell}, \text{personal}} = 0.50$
  - $\mu_{\text{speed}, \text{personal}} = 0.00$, $\sigma_{\text{speed}, \text{personal}} = 1.00$
  - $\mu_{\text{len}} = 10.0$ reels, $\sigma_{\text{len}} = 5.0$ reels
  - $\text{entropy\_baseline} = 2.50$, $\text{exit\_rate\_baseline} = 0.05$, $\text{rewatch\_rate\_base} = 0.10$

- **Retention-Weighted Exponential Moving Average:**
  $$\mu_{\text{personal}, t} = \rho \cdot \mu_{\text{personal}, t-1} + (1 - \rho) \cdot \bar{x}_{\text{session}}$$
  - **Standard Operation:** $\rho = 0.95$ (5% new session learning rate).
  - **Regime Alert Active:** $\rho = 0.99$ (1% learning rate), freezing the baseline to prevent anomalous life transitions from corrupting the normal profile.

- **Priors Anchor Generation (`baseline.get_priors()`):**
  $$\mu_{\text{prior}, \text{doom}} = \mu_{\text{dwell}, \text{personal}} - 1.2 \cdot \sigma_{\text{dwell}, \text{personal}}$$
  $$\mu_{\text{prior}, \text{casual}} = \mu_{\text{dwell}, \text{personal}} + 0.4 \cdot \sigma_{\text{dwell}, \text{personal}}$$
  $$\mu_{\text{speed}, \text{doom}} = \mu_{\text{speed}, \text{personal}} + 0.5 \cdot \sigma_{\text{speed}, \text{personal}}$$

### 2.2 Multi-Criteria Regime Change Detector (`RegimeDetector`)
To distinguish compulsive capture from legitimate life changes (vacations, job shifts, schedule overhauls), the `RegimeDetector` evaluates 4 criteria over a rolling 30-session window:

1. **Criterion A (Split-Half CUSUM on Doom History):**
   Computes mean $\mu_{\text{half}}$ on the first half of the window and tests cumulative positive/negative drift on the second half:
   $$S_i^+ = \max(0, S_{i-1}^+ + (x_i - \mu_{\text{half}}) - 0.05), \quad S_i^- = \max(0, S_{i-1}^- + (\mu_{\text{half}} - x_i) - 0.05)$$
   Triggers if $S_i^+ > 8.0$ or $S_i^- > 8.0$.
2. **Criterion B (Dwell Deviation):**
   $$|\mu_{\text{dwell}, 7d} - \mu_{\text{dwell}, \text{personal}}| > 2.0 \cdot \sigma_{\text{dwell}, \text{personal}}$$
3. **Criterion C (Session Length Deviation):**
   $$|\mu_{\text{len}, 7d} - \mu_{\text{len}, \text{personal}}| > 2.5 \cdot \sigma_{\text{len}, \text{personal}}$$
4. **Criterion D (Circadian Shift):**
   Categorical Kullback-Leibler divergence of hourly session frequency:
   $$\text{KL}(\mathbf{p}_{\text{recent\_hours}} \parallel \mathbf{p}_{\text{baseline\_smoothed}}) > 1.50$$

- **Cooldown & HMM Adaptation:**
  - Requires a 14-session cooldown (`time_since_last_alert >= 14`) to prevent rapid re-triggering.
  - When active, the HMM shifts M-step memory bank weighting from $(w_r=0.20, w_m=0.50, w_l=0.30)$ to $(w_r=0.60, w_m=0.30, w_l=0.10)$ and bypasses updates to long-term memory (`SS_long`), rapidly adapting to the new pattern without discarding core prior anchors.

---

## Part 3: The Probabilistic Engine (Hidden Markov Model / CTMC)

The engine models two latent behavioral states:
- **State 0 (Mindful / Regulated / Casual):** Purposeful navigation, longer content absorption, high exit fluidity.
- **State 1 (Captured / Dysregulated / Doomscrolling):** Skimming velocity, hypnotic regularity, exit conflict, loop compulsion.

```
                   +--------------------------+
                   |         State 0          |
                   |   Mindful / Regulated    |
                   +-------------+------------+
                          |             ^
             q_01 (Pull)  |             |  q_10 (Recovery)
                          v             |
                   +-------------+------------+
                   |         State 1          |
                   |  Captured / Doomscroll   |
                   +--------------------------+
```

### 3.1 Continuous-Time Markov Chain (CTMC) Gap Transitions
Because sessions occur at arbitrary real-world intervals $\Delta t$ (hours), state transitions across session boundaries are modeled via a 2-state CTMC generator matrix:
$$Q = \begin{bmatrix} -q_{01} & q_{01} \\ q_{10} & -q_{10} \end{bmatrix}$$

The matrix exponential $A_{\text{gap}}(\Delta t) = \exp(Q \Delta t)$ is computed analytically with $\lambda = q_{01} + q_{10}$:
$$A_{\text{gap}}(\Delta t) = \begin{bmatrix} \frac{q_{10} + q_{01} e^{-\lambda \Delta t}}{\lambda} & \frac{q_{01}(1 - e^{-\lambda \Delta t})}{\lambda} \\ \frac{q_{10}(1 - e^{-\lambda \Delta t})}{\lambda} & \frac{q_{01} + q_{10} e^{-\lambda \Delta t}}{\lambda} \end{bmatrix}$$

- **Rate Dynamics:** Rates are bounded ($q_{01} \in [0.02, 5.0]$, $q_{10} \in [0.01, 4.99]$) and updated online via gradient ascent on the expected inter-session transition likelihood $L_{\text{gap}}(q_{01}, q_{10})$.
- **Architectural Constraint:** Pull rate strictly exceeds escape rate ($q_{01} > q_{10}$).

### 3.2 Contextual State Priors ($\boldsymbol{\pi}$)
The initial state distribution $\boldsymbol{\pi} = [\pi_0, \pi_1]$ is predicted using a 9-dimensional physical context vector $\mathbf{u}_t$:
$$\mathbf{u}_t = [1.0, \sin(2\pi\phi), \cos(2\pi\phi), \Delta t / 10.0, \text{rest\_disruption}, \text{entry\_risk}, \mathbb{I}(\text{weekend}), \text{stress\_flag}, \text{mood\_risk}]$$
$$\pi_1 = \sigma(\mathbf{w}_{\text{logistic}}^T \mathbf{u}_t), \quad \pi_0 = 1 - \pi_1$$

A gradual activation schedule blends contextual priors with the stationary default $\boldsymbol{\pi}_{\text{prior}} = [0.65, 0.35]$:
$$\boldsymbol{\pi} = \alpha_{\text{sess}} \boldsymbol{\pi}_{\text{ctx}} + (1 - \alpha_{\text{sess}}) \boldsymbol{\pi}_{\text{prior}}, \quad \alpha_{\text{sess}} = \min(1.0, n_{\text{sessions}} / 5.0)$$

### 3.3 Emission Likelihood Modeling
To capture the joint kinematic signature of skimming, features 0 and 1 are modeled as a **Bivariate Gaussian distribution** with learned correlation $\rho_{\text{dwell, speed}} \in [-0.95, 0.95]$:
$$\log \mathcal{N}_{2D}(x_0, x_1; \boldsymbol{\mu}_s, \boldsymbol{\Sigma}_s) = -\log(2\pi \sigma_{d,s} \sigma_{v,s} \sqrt{1 - \rho_s^2}) - \frac{z_{d,s}^2 - 2\rho_s z_{d,s} z_{v,s} + z_{v,s}^2}{2(1 - \rho_s^2)}$$
where $z_{d,s} = \frac{x_0 - \mu_{0,s}}{\sigma_{0,s}}$ and $z_{v,s} = \frac{x_1 - \mu_{1,s}}{\sigma_{1,s}}$.

Features $k \in \{2, 3, 4, 5, 6\}$ are evaluated with independent Gaussian log-likelihoods. The full emission is weighted across active features:
$$\log P(\mathbf{x}_t | S_t = s) = (w_0 + w_1) \log \mathcal{N}_{2D}(x_{0,t}, x_{1,t}; s) + \sum_{k=2}^6 w_k \log \mathcal{N}(x_{k,t}; \mu_{k,s}, \sigma_{k,s}^2)$$

### 3.4 Scaled Forward-Backward & EM Updates
- **Forward Path:** $\alpha_t(j) = \log P(\mathbf{x}_t | S_t=j) + \text{logsumexp}_i(\alpha_{t-1}(i) + \log A_{ij})$
- **Backward Path:** $\beta_t(i) = \text{logsumexp}_j(\log A_{ij} + \log P(\mathbf{x}_{t+1} | S_{t+1}=j) + \beta_{t+1}(j))$
- **Posterior Latent State:** $\gamma_t(s) = P(S_t = s | \mathbf{O}) = \frac{\exp(\alpha_t(s) + \beta_t(s))}{\sum_j \exp(\alpha_t(j) + \beta_t(j))}$
- **Feature Weight Adaptation:** Updated via normalized Kullback-Leibler divergence between state distributions:
  $$\text{KL}_k = \log\frac{\sigma_{k,1}}{\sigma_{k,0}} + \frac{\sigma_{k,0}^2 + (\mu_{k,0} - \mu_{k,1})^2}{2\sigma_{k,1}^2} - 0.5, \quad w_k = \frac{\max(\text{KL}_k, 0)}{\sum_j \max(\text{KL}_j, 0)}$$

### 3.5 Invariant Architectural Constraints
After every parameter update, `_enforce_architectural_constraints` guarantees semantic integrity:
1. $\mu_{\text{rewatch}, 1} > \mu_{\text{rewatch}, 0}$ (Compulsive looping must be higher in State 1)
2. $\mu_{\text{exit}, 1} > \mu_{\text{exit}, 0}$ (Exit attempts must be higher in State 1)
3. $\mu_{\text{speed}, 1} > \mu_{\text{speed}, 0}$ (Scroll speed must be higher in State 1)
4. $q_{01} > q_{10}$ (CTMC pull rate must exceed escape rate)

---

## Part 4: Explanatory Heuristics (`DoomScorer`)

To provide interpretable explanations for UI radar charts and dashboards without modifying the latent state math, `DoomScorer` computes 7 normalized components $C_k \in [0, 1]$:

```
+-----------------------------------------------------------------------------+
|                            DoomScorer Radar Chart                           |
|                                                                             |
|                           [session_length]                                  |
|                                  /\                                         |
|                                 /  \                                        |
|              [environment]     /    \     [exit_conflict]                   |
|                     \         /      \         /                            |
|                      \       +--------+       /                             |
|                       \     /          \     /                              |
|   [rewatch_compulsion] \---/   RADAR    \---/ [rapid_reentry]               |
|                         \ /              \ /                                |
|                          +----------------+                                 |
|                         /                  \                                |
|              [dwell_collapse]          [scroll_automaticity]                |
+-----------------------------------------------------------------------------+
```

### 4.1 The 7 Heuristic Formulas
1. **Session Length (`session_length`):**
   $$C_{\text{len}} = \min\left(\frac{T}{\max(1.0, \mu_{\text{len}} + 2\sigma_{\text{len}})}, 1.0\right)$$
2. **Exit Conflict (`exit_conflict`):**
   $$C_{\text{exit}} = 1.0 - \exp\left(-\frac{\text{exit\_rate}}{1.5 \cdot \max(\text{exit\_baseline}, 0.01)}\right)$$
3. **Rapid Re-entry (`rapid_reentry`):**
   $$C_{\text{rapid}} = \exp\left(-\frac{\Delta t_{\text{gap}}}{\text{gap\_scale}}\right) \cdot (0.35 + 0.65 \cdot \text{evidence})$$
4. **Scroll Automaticity (`scroll_automaticity`):**
   $$C_{\text{auto}} = \text{clip}(0.45 \cdot (1.0 - \text{entropy}/4.0) + 0.55 \cdot \frac{\text{entropy\_base} - \text{entropy}}{\text{entropy\_base}}, 0.0, 1.0)$$
5. **Dwell Collapse (`dwell_collapse`):**
   $$C_{\text{collapse}} = \text{clip}\left(\frac{\mu_{\text{trend, base}} - \text{slope}_{\text{dwell}}}{1.5 \cdot \sigma_{\text{trend, base}}}, 0.0, 1.0\right)$$
6. **Rewatch Compulsion (`rewatch_compulsion`):**
   $$C_{\text{rewatch}} = \min\left(\frac{\text{rewatch\_rate}}{\max(0.01, \text{rewatch\_base} + 0.01)}, 1.0\right)$$
7. **Environment Context (`environment`):**
   Combines night-time sleep window indicators, dark room detection, charging status, and wakefulness fatigue proxy.

### 4.2 Online Soft Supervision Alignment
The component weights $\mathbf{w}_c$ dynamically align with the individual's empirical capture triggers via online logistic gradient descent targeting the HMM posterior $\bar{\gamma}_1$:
$$\hat{y} = \sigma(\mathbf{w}_c^T \mathbf{C}), \quad \mathbf{w}_c \leftarrow \mathbf{w}_c - \eta_t (\hat{y} - \bar{\gamma}_1) \mathbf{C}, \quad \eta_t = 0.05 \cdot 0.97^{n_{\text{updates}}}$$

---

## Part 5: Human-in-the-Loop & Supervised Layer (`RegretValidator`)

When self-reported survey labels are available, Reelio prioritizes user subjective lived experience over pure kinematics through a hierarchical priority chain.

### 5.1 Supervision Priority Chain
`compute_supervised_doom_label` resolves survey answers in order of cognitive depth:
$$\text{Delayed Regret} \succ \text{Comparative Rating} \succ \text{Immediate Regret} \succ \text{Post-Session Rating}$$

- **Immediate Regret ($R \in [1, 5]$):** $Y_{\text{regret}} = R / 5.0$
- **Post-Session Rating ($P \in [1, 5]$):** $Y_{\text{post}} = (5.0 - P) / 4.0$
- **Intent Mismatch Bonus:** $+0.10$ if actual consumption mismatched declared intention; $+0.25$ if opened for avoidance/boredom.

### 5.2 Label Confidence & Adaptive Disagreement Decay
- **Label Confidence ($L_{\text{conf}}$):** High ($1.00$) when direct regret questions are answered; Moderate ($0.75$) for comparative scores; Lower ($0.35$) for standalone affective ratings.
- **Disagreement Bias:**
  $$\text{bias} = (Y_{\text{supervised}} - \bar{\gamma}_1) \cdot L_{\text{conf}} \cdot \eta_{\text{disagree}} \quad (\text{active if } |Y - \bar{\gamma}_1| \ge 0.10)$$
- **Label-Aware Exponential Decay:**
  $$\delta_t = \delta_{t-1} \cdot \text{decay}^{(2.0 - L_{\text{conf}})} + \text{bias}, \quad \delta_t \in [-0.25, 0.25]$$
  High-confidence labels persist across sessions ($\text{decay}^1 = 0.80$), while accidental taps decay rapidly ($\text{decay}^2 = 0.64$).
- **Reported Score Blend:**
  $$S_t = (1 - L_{\text{conf}}) \cdot \bar{\gamma}_1 + L_{\text{conf}} \cdot Y_{\text{supervised}}$$

---

## Part 6: Calibration, Recurrence & Presentation Standards

### 6.1 Systematic Over-Prediction Bias Correction
Empirical validation across 43 ground-truth pairs identified a systematic kinematic over-prediction bias ($\mu_{\text{pred}} = 0.636$ vs $\mu_{\text{actual}} = 0.279$). The engine applies:
$$\text{CALIBRATION\_BIAS} = 0.357$$
$$\text{calibrated\_score} = \text{clip}(\text{raw\_score} - 0.357, 0.0, 1.0)$$

### 6.2 Single Source of Truth Classification
$$\text{DOOM\_PROBABILITY\_THRESHOLD} = 0.55$$
A session is classified as **Captured / Doomscrolling** if and only if $S_t \ge 0.55$.

### 6.3 Daily Frequency Recurrence Amplification
When a user opens Instagram repeatedly in a single day, `compute_frequency_risk` evaluates daily frequency against their baseline:
$$\text{freq\_ratio} = \frac{\text{sessions\_today}}{\text{baseline\_daily\_sessions}}, \quad \text{freq\_risk} = \text{clip}\left(\frac{\text{freq\_ratio} - 1.35}{1.65}, 0.0, 1.0\right)$$
Repeated sessions receive an ordinal recurrence boost (up to $+0.12$), ensuring that fragmented compulsive bingeing is accurately reflected in weekly and calendar summaries.

### 6.4 Interpretable Model Confidence Decomposition
`compute_model_confidence_breakdown` calculates model maturity across 4 orthogonal dimensions:
- **Volume Confidence ($C_{\text{vol}}$):** $\text{clip}(n_{\text{sessions}} / 20.0, 0.0, 1.0)$
- **State Separation ($C_{\text{sep}}$):** $1 - \exp(-D_B / 1.5)$, where $D_B = \sum_{k=0}^6 D_{\text{Bhattacharyya}}(P(x_k|S=0), P(x_k|S=1))$
- **Stability ($C_{\text{stab}}$):** $1.0 - (\text{regime\_alerts} / n_{\text{sessions}})$
- **Supervision Quality ($C_{\text{sup}}$):** $0.6 \cdot \text{label\_coverage} + 0.4 \cdot (1 - |\delta| / 0.25)$
- **Overall Confidence:**
  $$C_{\text{overall}} = (0.35 C_{\text{vol}} + 0.35 C_{\text{sep}} + 0.20 C_{\text{stab}} + 0.10 C_{\text{sup}}) \times (0.35 + 0.65 \cdot \text{gate})$$

### 6.5 Front-End Hybrid Blending (`app.jsx`)
When $C_{\text{overall}} < 0.70$, the UI displays a **Behavioral Calibration Active** indicator and blends HMM posterior inference with heuristic scores to guarantee reliable user feedback during initial cold-start learning.

---

## Part 7: Exhaustive Inventory of Hardcoded & Assumed Parameters

This section catalogs every hardcoded constant, assumed default, heuristic hyperparameter, prior parameter, and bounding threshold across the entire ALSE v3.0 pipeline.

### 7.1 Global & System Constants

| Parameter | Value | Location | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| `DOOM_PROBABILITY_THRESHOLD` | `0.55` | Line 27 | **Single source of truth** for doomscrolling classification across Python, Kotlin, and React. Assumes binary capture starts when posterior probability exceeds 55%. |
| `CALIBRATION_BIAS` | `0.357` | Line 32 | Systematic over-prediction offset fitted from 43 empirical validation pairs ($\mu_{\text{pred}}=0.636, \mu_{\text{actual}}=0.279$). |
| `PIPELINE_VERSION` | `6` | Line 28 | Monotonic version tag tracking serialization schema compatibility. |
| `EXPECTED_SCHEMA_VERSION` | `5` | Line 226 | Version of the 100-column CSV data structure generated by `InstaAccessibilityService.kt`. |

---

### 7.2 Preprocessing & Feature Engineering Parameters

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| Dwell Lower Clip | `1e-3` ($0.001\text{s}$) | `preprocess_session` | Prevents $\log(0) \to -\infty$ when computing `log_dwell` on zero-dwell touch glitches. |
| Speed Lower Clip | `1.0` | `preprocess_session` | Prevents negative logs on near-zero velocity readings. |
| Rhythm Dissociation Fallback | `0.80` | `preprocess_session` | Neutral emission midpoint assigned to single-reel sessions where Shannon entropy is undefined. |
| Default Ambient Lux | `50.0` lux | `preprocess_session` | Assumed baseline ambient illumination when sensor readings are missing. |
| Default Circadian Phase | `0.50` | `preprocess_session` | Neutral midpoint for time-of-day circadian features when timestamps are missing. |
| Default Sleep Window | `SleepStart=23`, `SleepEnd=7` | `preprocess_session` | Assumes standard 11:00 PM to 7:00 AM sleep schedule when personalized sleep heuristics are uninitialized. |
| Intent Mismatch Reel Cutoff | `20` reels | `preprocess_session` | A session exceeding 20 reels when the user intended a "Quick break" or "Specific content lookup" triggers behavioral intent mismatch. |
| Intent Mismatch Exit Cutoff | `0.05` ($5\%$ exit attempts) | `preprocess_session` | Exit attempts exceeding 5% in low-risk intent sessions triggers behavioral intent mismatch. |
| Wakefulness Scaling Divisor | `16.0` hours | `preprocess_session` | Assumes maximum regular cognitive wakefulness before fatigue saturation is 16 hours. |
| Target Evidence Reel Count | `8.0` reels (default) | `compute_session_behavior_evidence` | Minimum reels needed before kinematic evidence is trusted over environmental priors; clipped to $[8.0, 40.0]$. |
| Target Evidence Duration | `120.0` sec (default) | `compute_session_behavior_evidence` | Minimum duration (2 minutes) needed for within-session evidence; clipped to $[120.0, 900.0]$ sec. |

---

### 7.3 `UserBaseline` Initial Defaults & Prior Modifiers

| Parameter | Initial Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| `dwell_mu_personal` | `1.60` ($\approx 4.95\text{s}$) | Baseline Init | Assumed average logarithmic dwell time for a fresh user profile. |
| `dwell_sig_personal` | `0.50` | Baseline Init | Initial logarithmic dwell standard deviation. |
| `speed_mu_personal` | `0.00` | Baseline Init | Initial mean log scroll speed. |
| `speed_sig_personal` | `1.00` | Baseline Init | Initial log scroll speed standard deviation. |
| `session_len_mu` / `sig` | `10.0` / `5.0` reels | Baseline Init | Prior session length mean and standard deviation. |
| `lux_mu_personal` / `mad` | `50.0` / `25.0` lux | Baseline Init | Initial light level baseline and median absolute deviation. |
| `dark_room_rate` | `0.50` | Baseline Init | Initial assumed rate of sessions conducted in dark rooms ($50\%$). |
| `charging_rate` | `0.20` | Baseline Init | Initial assumed rate of sessions conducted while charging ($20\%$). |
| `typical_hour` | $\mathbf{1}_{24} / 24.0$ ($\approx 0.0417$) | Baseline Init | Flat uniform distribution across 24 hours of the day. |
| `typical_gap_mu` / `sig` | `120.0` / `60.0` min | Baseline Init | Assumes 2-hour average inter-session gap with 1-hour standard deviation. |
| `exit_rate_baseline` | `0.05` ($5\%$) | Baseline Init | Expected normal exit attempt frequency per reel. |
| `rewatch_rate_base` | `0.10` ($10\%$) | Baseline Init | Expected normal back-scroll loop frequency per reel. |
| `entropy_baseline` | `2.50` | Baseline Init | Expected normal Shannon entropy of inter-scroll intervals. |
| `dwell_trend_mu` / `sig` | `0.00` / `0.50` | Baseline Init | Initial linear dwell slope mean and standard deviation. |
| Baseline Retention ($\rho$) | `0.95` (Normal) / `0.99` (Alert) | `UserBaseline.update` | Exponential retention rate on historical baseline ($5\%$ learning rate normally, $1\%$ during regime shift). |
| Doom Dwell Prior Offset | $\mu_{\text{dwell}} - 1.2 \cdot \sigma_{\text{dwell}}$ | `baseline.get_priors` | Assumes doomscrolling is characterized by rapid skimming dwell times. |
| Casual Dwell Prior Offset | $\mu_{\text{dwell}} + 0.4 \cdot \sigma_{\text{dwell}}$ | `baseline.get_priors` | Assumes casual browsing involves mindful, above-average dwell times. |
| Doom Speed Prior Offset | $\mu_{\text{speed}} + 0.5 \cdot \sigma_{\text{speed}}$ | `baseline.get_priors` | Assumes doomscrolling involves higher vertical swipe velocities. |

---

### 7.4 `RegimeDetector` Changepoint Hyperparameters

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| Window History Capacity | `30` sessions | Rolling Buffer | Memory buffer capacity for evaluating structural life transitions. |
| Minimum Sessions for Checks | `7` sessions | `update` | Minimum data required before evaluating regime shift criteria. |
| Minimum Points for CUSUM | `10` sessions ($5$ per half) | `_cusum_check` | Minimum history required for split-half changepoint test. |
| CUSUM Drift Allowance ($k$) | `0.05` | `_cusum_check` | Allowed stochastic drift per session before cumulative divergence accumulates. |
| CUSUM Alert Threshold ($h$) | `8.0` | `_cusum_check` | Cumulative deviation threshold triggering a changepoint alert. |
| Dwell Shift Threshold | $2.0 \cdot \sigma_{\text{dwell}}$ | `update` (Criterion B) | Triggers alert if 7-day dwell mean shifts by more than 2 standard deviations. |
| Length Shift Threshold | $2.5 \cdot \sigma_{\text{len}}$ | `update` (Criterion C) | Triggers alert if 7-day session length shifts by more than 2.5 standard deviations. |
| Hourly Distribution Floor | $1/48$ | `update` (Criterion D) | Floor applied to baseline hourly frequencies to prevent KL divergence explosion on unobserved hours. |
| Circadian KL Threshold | `1.50` | `update` (Criterion D) | Maximum allowable divergence between recent 7-day usage hours and historical baseline. |
| Alert Cooldown Counter | `14` sessions | State Control | Suppresses recurring alerts within 14 sessions of a previous trigger. |
| Alert Recovery Requirement | $\ge 3$ sessions | State Control | Regime alert must persist at least 3 sessions and require $7\text{d\_doom} \le 30\text{d\_doom} + 1.5\sigma_{30\text{d}}$ to clear. |

---

### 7.5 Hidden Markov Model & CTMC Parameters (`ReelioCLSE`)

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| Initial Transition Matrix ($A$) | $\begin{bmatrix} 0.80 & 0.20 \\ 0.30 & 0.70 \end{bmatrix}$ | HMM Init | Assumes high state inertia within sessions ($80\%$ casual retention, $70\%$ doom retention). |
| Initial Stationary Prior ($\boldsymbol{\pi}$) | $[0.65, 0.35]$ | HMM Init | Uninformative population prior assuming $65\%$ casual, $35\%$ doom start state. |
| Initial CTMC Pull / Escape ($q_{01}, q_{10}$) | `0.50`, `0.50` | CTMC Init | Initial continuous-time transition rate parameters per hour. |
| CTMC Parameter Bounds | $q_{01} \in [0.02, 5.0]$, $q_{10} \in [0.01, 4.99]$ | `_enforce_constraints` | Hard numerical bounding for transition rates. |
| CTMC Gap Bounds | $[1/60, 48.0]$ hours | `_a_gap`, `_update_ctmc_rates` | CTMC transitions ignored for gaps $<1$ min; capped at 48 hours for matrix exponential convergence. |
| CTMC Rate Learning Rate | `0.05` | `_update_ctmc_rates` | Online gradient step size for inter-session transition rate updates. |
| CTMC Gradient Numerical Step | `0.01` (clipped $[-1, 1]$) | `_update_ctmc_rates` | Finite-difference perturbation step for computing rate gradients. |
| Initial Hazard Vector ($\mathbf{h}$) | $[0.15, 0.05]$ | Survival Hazard | Initial stopping probability per reel ($15\%$ casual exit rate, $5\%$ doom exit rate). |
| Hazard Beta Priors ($\alpha_{\text{prior}}, \beta_{\text{prior}}$) | $\alpha=[3.0, 1.0]$, $\beta=[5.0, 12.0]$ | `_m_step` | Conjugate Beta hyperparameters anchoring survival hazard rates. |
| Memory Bank Retentions ($\rho_{\text{banks}}$) | `[0.60, 0.85, 0.97]` | `_update_ss` | Retention rates for Recent (fast), Medium (intermediate), and Long (stable) memory banks. |
| Normal M-Step Weights ($w_{\text{banks}}$) | `[0.20, 0.50, 0.30]` | `_m_step` | Bank blend under normal operation (emphasizes medium-term stability). |
| Alert M-Step Weights ($w_{\text{banks}}$) | `[0.60, 0.30, 0.10]` | `_m_step` | Bank blend under regime shift (emphasizes recent sessions to accelerate adaptation). |
| Cold-Start M-Step Weights ($w_{\text{banks}}$) | `[0.70, 0.30, 0.00]` | `_m_step` | Bank blend for first 5 sessions (long-term memory disabled). |
| Minimum Emission Variance ($\sigma_{\min}^2$) | `0.0025` ($\sigma_{\min} = 0.05$) | `_m_step`, `_log_emission` | Floor preventing zero-variance singularities in Gaussian emissions. |
| Bivariate Correlation Bounds | $\rho_{\text{dwell, speed}} \in [-0.95, 0.95]$ | `_bivariate_log_emission` | Clamping preventing singular determinant in 2D covariance matrix. |
| Initial Logistic Prior Weights | $[0.0, 0.5, 0.3, 0.2, 0.8, 0.6, 0.0, 0.9, 0.7]$ | Context Prior | Priors for 9-dim context: index 7 (stress/avoidance intent) = $0.90$, index 8 (mood risk) = $0.70$. |
| Logistic Logit Clamping | $[-10.0, 10.0]$ | `_compute_contextual_pi` | Prevents arithmetic overflow in sigmoid function. |
| Contextual Prior Output Bounds | $[0.10, 0.90]$ | `_compute_contextual_pi` | Prevents deterministic 0/1 state initialization from context alone. |
| Contextual Prior Activation Schedule | $\min(1.0, n_{\text{sessions}} / 5.0)$ | `_compute_contextual_pi` | Linear ramp-up over first 5 sessions before fully activating contextual priors. |
| Logistic Weight Learning Rate | `0.05` | `_update_contextual_prior` | Gradient descent step size for updating context weights. |
| Internal Bayesian Blend Schedule | $\min(1.0, n_{\text{sessions}} / 10.0)$ | `process_session` | Soft blending parameter between stationary prior and raw posterior during early sessions. |
| Inequality Separation Margins | `mid +/- 0.01` | `_enforce_constraints` | Minimal separation enforced between doom and casual parameters when ordering constraints violate. |

---

### 7.6 `DoomScorer` Heuristic Parameters & Amplifiers

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| `DOOM` Threshold | `0.55` | `DoomScorer.__init__` | Heuristic score threshold for `DOOM` label assignment. |
| `BORDERLINE` Threshold | `0.35` | `DoomScorer.__init__` | Heuristic score threshold for `BORDERLINE` label assignment. |
| Initial Component Weights | $\mathbf{1}_7 / 7.0$ ($\approx 0.1429$) | `DoomScorer.__init__` | Uniform weight allocation across 7 heuristic drivers. |
| Minimum Component Weight Floor | `0.01` | `update_weights` | Prevents any individual heuristic component from being entirely eliminated. |
| Component Weight Learning Rate | $\eta_t = 0.05 \cdot 0.97^{n_{\text{updates}}}$ | `update_weights` | Exponentially decaying learning rate targeting HMM soft supervision. |
| Exit Conflict Scale Multiplier | $1.5 \cdot \text{baseline\_exit}$ (floor $0.02$) | `score` | Scale factor in $1 - \exp(-\text{rate}/\text{scale})$ for exit conflict scoring. |
| Rapid Re-entry Center Bounds | $[5.0, 180.0]$ min | `score` | Clamping bounds for typical gap mean when scaling re-entry urgency. |
| Rapid Re-entry Scale Bounds | $[3.0, 45.0]$ min | `score` | Clamping bounds for gap scale ($0.35 \cdot \mu_{\text{gap}} + 0.5 \cdot \sigma_{\text{gap}}$). |
| Automaticity Entropy Blend | $0.45 \cdot \text{abs} + 0.55 \cdot \text{rel}$ | `score` | Blend between absolute entropy ($1 - H/4$) and relative entropy drop vs user baseline. |
| Absolute Entropy Normalizer | `4.0` nats/bits | `score` | Assumed maximum theoretical entropy for inter-scroll intervals. |
| Baseline Entropy Floor | `0.75` | `score` | Floor preventing division-by-zero on low baseline entropy. |
| Dwell Trend Scale Multiplier | $1.5 \cdot \sigma_{\text{trend}}$ (bounds $[0.25, 3.0]$) | `score` | Normalization scale for steepness of dwell collapse slope. |
| Context Evidence Weighting | $0.35 + 0.65 \cdot \text{evidence}$ | `score` | Scales environmental penalties down when within-session behavioral evidence is scarce. |
| Sleep Window Gap Penalty | Floor `0.25 * evidence` | `score` | Preserves rapid re-entry penalty if gap $>60$ min occurred entirely inside sleep window. |
| Late Night Context Multiplier | $\times (1.0 + 0.25 \cdot \text{evidence})$ | `score` | Multiplicative amplification when session occurs in sleep window with $C_{\text{env}} \ge 0.45$. |
| Exit Attempt Hard Floor | Floor `0.35` | `score` | If raw `AppExitAttempts >= 2`, doom score is strictly floored at 0.35. |
| Post-Rating / Regret Amplifier | $+0.20$ | `score` | Additive penalty if post-session rating $<3$ or regret score $\ge 3$. |
| Impaired Focus Amplifier | $+0.15$ | `score` | Additive penalty if `MoodAfter <= 2` ("Can't focus" / "Scattered"). |
| Intent Mismatch Survey Amplifier | $+0.10$ | `score` | Additive penalty if `ActualVsIntendedMatch == 0`. |
| Behavioral Intent Mismatch Amplifier | $+0.15$ | `score` | Additive penalty if `intent_mismatch == 1.0`. |

---

### 7.7 `RegretValidator` & Supervised Layer Parameters

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| Disagreement Significance Cutoff | $|Y - \bar{\gamma}_1| \ge 0.10$ ($10\%$) | `_compute_disagreement_bias` | Disagreement adjustments ignored for minor differences under 10%. |
| Disagreement Learning Rate | `0.05` | `_compute_disagreement_bias` | Step size scaling disagreement bias toward ground truth. |
| Max Disagreement Bias per Session | `0.10` | `_compute_disagreement_bias` | Hard clamp on single-session bias magnitude. |
| Running Disagreement Clamping Bounds | $[-0.25, 0.25]$ | `process_session` | Hard clamp on cumulative running disagreement carry-over. |
| Base Disagreement Decay | `0.80` | `process_session` | Inter-session retention factor for historical survey bias. |
| Label-Aware Decay Exponent | $\text{decay}^{2.0 - L_{\text{conf}}}$ | `process_session` | Modulates decay: high-confidence labels persist longer ($0.80^1=0.80$), low-confidence decay quickly ($0.80^2=0.64$). |
| Standalone Affective Cap | `0.60` | `compute_supervised_doom_label` | Caps supervised target when only post-session rating is provided without cognitive regret anchor. |
| Passive Mood Signal Scale | $\text{clip}(-\Delta_{\text{mood}} \cdot 0.05, -0.15, 0.15)$ | `compute_supervised_doom_label` | Weak modifier applied around $0.50$ baseline when no explicit surveys exist. |
| Stated Avoidance Intent Bonus | $+0.25$ | `compute_supervised_doom_label` | Added to supervised doom target if opened for "Stressed / Avoidance" or "Procrastinating". |
| History Buffer Capacity | `50` sessions | `RegretValidator` | Rolling memory buffer for empirical regret validation pairs. |
| Systematic Bias Correction Clamp | $[-0.15, 0.15]$ | `get_calibration_bias` | Clamping limit applied to running systematic bias correction. |

---

### 7.8 Model Confidence & Recurrence Parameters

| Parameter | Value | Scope | Description & Underlying Assumption |
| :--- | :--- | :--- | :--- |
| Volume Saturation Target | `20` sessions | `compute_model_confidence_breakdown` | Assumes 20 sessions provide sufficient observation density for model stability. |
| Bhattacharyya Distance Scaling | `1.50` | `compute_model_confidence_breakdown` | Normalization scale in $1 - \exp(-D_B / 1.5)$ for multivariate state separation. |
| Confidence Component Weights | $0.35 C_{\text{vol}} + 0.35 C_{\text{sep}} + 0.20 C_{\text{stab}} + 0.10 C_{\text{sup}}$ | `compute_model_confidence_breakdown` | Relative importance of data volume, state separation, stability, and supervision. |
| Readiness Gate Scaling | $0.35 + 0.65 \cdot (0.5 C_{\text{vol}} + 0.5 C_{\text{sep}})$ | `compute_model_confidence_breakdown` | Prevents confidence from reading as settled until both volume and state separation mature. |
| UI Hybrid Blend Threshold | `0.70` ($70\%$) | Frontend (`app.jsx`) | Triggers heuristic blending and UI calibration notice when model confidence $< 70\%$. |
| Daily Frequency Minimum Baseline | `0.75` sessions/day | `compute_frequency_risk` | Frequency risk multiplier disabled for very low baseline usage profiles. |
| Daily Frequency Ramp Threshold | `1.35` ($135\%$ of norm) | `compute_frequency_risk` | Session count must exceed baseline by $35\%$ before frequency risk begins ramping. |
| Daily Frequency Saturation Divisor | `1.65` | `compute_frequency_risk` | Risk saturates at $3.0\times$ daily baseline ($1.35 + 1.65$). |
| Day Behavior Severity Blend | $\max(\text{peak}, 0.65 \cdot \text{mean} + 0.35 \cdot \text{peak})$ | `apply_frequency_recurrence` | Combines peak session capture with day-wide average severity. |
| Max Day Frequency Boost | `0.18` ($+18\%$) | `apply_frequency_recurrence` | Maximum capture score increase added to daily summary. |
| Max Session Recurrence Boost | `0.12` ($+12\%$) | `apply_frequency_recurrence` | Maximum capture score increase applied to later sessions within a high-frequency day. |

