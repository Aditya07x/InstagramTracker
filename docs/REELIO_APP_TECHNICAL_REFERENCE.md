# Reelio v3.0 // Neural Engine Technical Reference (Expanded)

This document provides a comprehensive, end-to-end breakdown of how Reelio captures behavioral data, models it using the **Adaptive Latent State Engine (ALSE)**, and surfaces actionable intelligence to the user. It covers the data ingestion layer, the 9 architectural pillars of the ALSE framework, the explicit mathematical feature modeling, and the UX interpretation layer.

---

## Part 1: The Data Capture Layer
Reelio functions as a passive behavioral monitor. It avoids cloud telemetry entirely to ensure absolute privacy, storing and processing all mathematical inference directly on the local Android device loop.

### 1.1 Ingestion Mechanism (`InstaAccessibilityService.kt`)
Reelio leverages Android’s native `AccessibilityService` API. When `com.instagram.android` is active in the foreground, this service attaches to the view hierarchy and begins intercepting standard UI layout events.
- **Micro-interactions:** It isolates `AccessibilityEvent.TYPE_VIEW_SCROLLED` to demarcate the start and end of individual content consumption.
- **Atomic Dwell Times:** The exact millisecond delta between scroll events is calculated as the baseline "Dwell Time" for a given piece of content.
- **Interaction Breadcrumbs:** It listens for node clicks correlating to Likes, Comments, or Shares, mapping these back to the current Reel index.

### 1.2 Local Persistence and Session Boundaries
As events occur, they are asynchronously dumped into an Android Room Database (SQLite wrapper).
- **Session Demarcation:** A continuous "Session" is broken and logged whenever Instagram loses foreground dominance (the user switches apps) or the device screen turns off. 
- **The CSV Intermediary:** When the Reelio dashboard is opened, the Kotlin backend queries Room and compiles a massive `insta_data.csv` file. This flat file contains rows of individual Reels, annotated by `SessionNum`, ready for Python inference via the embedded Chaquopy environment.

---

## Part 2: Feature Engineering & Preprocessing
Before the data enters the state machine, it is transformed into normalized mathematical features that are robust to outliers and skewed human behavioral distributions.

### 2.1 The 6 Core Observable Features
The Python engine extracts a 6-dimensional feature vector for every single reel:

1. **`log_dwell` (Logarithmic Dwell Time):** Human attention follows a heavy-tailed log-normal distribution. Raw seconds are converted using `np.log(max(dwell, 1e-3))` to pull in extreme 500-second outliers and make the feature Gaussian-compatible.
2. **`log_speed` (Logarithmic Scroll Velocity):** Captures the physical urgency of the swipe gesture.
3. **`rhythm_dissociation` (Scroll Rhythm Entropy):** Calculates the Shannon entropy of inter-scroll intervals. Low entropy means the user has locked into a highly predictable, metronomic swiping rhythm—a primary indicator of autonomic "Doom" capture.
4. **`rewatch_flag` (Back-Scrolls):** A Bernoulli binary (0 or 1). Did the user scroll backward to re-consume the content?
5. **`exit_flag` (App Exit Attempts):** A Bernoulli binary. Did the user try to close the app, open the recent apps menu, or hit the home button during this reel's dwell time?
6. **`swipe_incomplete` (Swipe Completion Ratio):** Measures "lazy swiping"—when a user fails to drag their thumb across the requisite threshold to complete a swipe on the first physical attempt.

### 2.2 Environmental & Contextual Augmentation
The engine also passes session-level physiological context:
- `AmbientLuxStart`: Is the user in a dark room?
- `IsCharging` / `BatteryDelta`: Is the phone tethered to a wall?
- `CircadianPhase`: An estimation of the user's biological clock based on local time and historical data.

---

## Part 3: The Adaptive Latent State Engine (ALSE)
The heart of Reelio is `reelio_alse.py`. It is a pure Numpy, zero-dependency statistical engine designed to overcome the primary problem of unsupervised AI: calculating accuracy without ground truth labels. It achieves this using a **Hidden Markov Model (HMM)** governed by 9 Architectural Pillars.

### Pillar 1: Personalized Bayesian Baseline
Off-the-shelf models fail because "addiction" is relative. A 5-second average dwell time might be normal for User A, but indicate deep boredom for User B.
Reelio tracks a rolling Exponential Moving Average (EMA) of your specific lifetime statistics (`dwell_mu_personal`, `speed_sig_personal`, `exit_rate_baseline`). When the HMM initializes its Gaussian distributions, it anchors the "Doom" state prior to `mu + 1.5 * sigma` of your historical average, forcing the model to define Doom relative to your own baseline standard.

### Pillar 2: Self-Calibrating Emission Model (Weighted Features)
The engine doesn't weight all 6 features equally. For the Gaussian features (Dwell and Speed), it uses a **Bivariate Normal Distribution** that calculates the covariance $\rho$ between how fast you swipe and how long you dwell. 
After every session, the engine calculates the Kullback-Leibler (KL) Divergence between the learned Doom state and the Casual state for every feature. If a feature (like `rewatch_rate`) fails to separate the two states, its weight dynamically decays. If `log_dwell` shows massive separation, its weight increases, ensuring the engine focuses only on features that actually predict your specific doomscrolling behavior.

### Pillar 3: Hierarchical Temporal Memory (HTM)
Human behavior shifts over months. To prevent the model from entirely forgetting what Doom looked like last year, it utilizes three memory banks that update at different speeds during the Maximum Likelihood Estimation (M-Step):
- `SS_recent`: Learns aggressively (Decay $\rho = 0.60$). Tracks your mood today.
- `SS_medium`: Learns steadily (Decay $\rho = 0.85$). Tracks your habits this month.
- `SS_long`: Learns agonizingly slowly (Decay $\rho = 0.97$). Protects the foundational definition of what constitutes a Doom State.

### Pillar 4: Continuous-Time Markov Chain (CTMC)
Standard models assume sessions are contiguous. In reality, a user might close the app and return in 2 minutes, or return in 14 hours. 
Reelio treats the gap between sessions as a Continuous-Time Markov process using an exponential decay function based on biological hazard rates `q_01` (Trap rate) and `q_10` (Escape rate). If you return to the app 5 minutes after a Doom session, the state matrix calculates that you are still highly likely to start in the Doom state. If you return 14 hours later, the matrix resets to its neutral priors.

### Pillar 5: Survival Framing (Geometric Hazard)
Instead of just asking "Is the user dooming?", the ALSE models the biological hazard rate of session death. It calculates the Geometric distribution parameter `h`, representing the probability that the user will terminate the session on the *very next reel*. The model learns that the Hazard Rate in the Casual state `h[0]` is much higher (you can easily leave) than the Hazard Rate in the Doom state `h[1]` (you are trapped).

### Pillar 6: Regime Change Detector
What if you get the flu and stay in bed scrolling for 14 hours a day for a week? A standard model would permanently corrupt your baseline, learning that 14 hours of scrolling is the new "Casual".
Reelio runs a regime change detector parallel to the HMM. It monitors 7-day vs 30-day variations in session length, hourly clustering (KL-divergence of daily hour usage), and average doom scores. If it detects a massive statistical anomaly, it triggers a `regime_alert` boolean, which instantly freezes updates to the `SS_long` memory bank until behavior normalizes.

### Pillar 7: Sparse-Data Guard & Model Confidence
Because there are no ground truth labels, the engine must guard against hallucinating false patterns during your first few days using the app.
It calculates an explicit `model_confidence` multiplier (out of 1.0), penalizing the score based on:
1. Volumetric Scarcity (Sessions < 20).
2. State Separation (Are the Doom and Casual Gaussian curves overlapping?).
3. Label Starvation (Have you filled out any manual symptom tracking surveys?).
While confidence is low, the Viterbi decoding explicitly blends its raw predictions with the safe, rigid Bayesian priors to prevent wildly swinging UI scores.

### Pillar 8: Contextual State Priors
The probability you start a session in the Doom state is not uniform. Reelio utilizes a Logistic Regression layer `_compute_contextual_pi` that adjusts your starting probabilities based on physical telemetry.
If the phone detects `lux < 10` (dark room), the biological clock says 2:00 AM, and the phone is charging, the logistics classifier automatically boosts the starting Doom state prior significantly before a single reel is even watched.

### Pillar 9: The Composite Doom Score Heuristic
The raw HMM math generates a strict probability sequence. However, users need a human-interpretable score. Reelio runs a parallel, model-free heuristic scorer that evaluates the session strictly on penalty mechanics:
- **Dwell Collapse:** Did your mean scroll time shrink rapidly during the session?
- **Volitional Conflict:** Did you attempt to exit the app but get pulled back in?
- **Rapid Re-entry:** Did this session begin immediately after you closed the app?
These factors combine into an interpretable 0-100% "Intervention Score" designed strictly for UI presentation and behavioral intervention triggering.

---

## Part 4: Interpretation and Actionable Metrics

The React dashboard computes specific insight equations derived from the ALSE backend matrices:

### 1. The Scroll Inertia Model (Pull Index)
The Transition Matrix `A` holds the HMM's core recursive logic. The dashboard calculates the **Doom Pull Index** using the equation `(A[0][1] / A[1][0])`.
- `A[0][1]` is your unique **Trap Rate** (Probability of transitioning from Casual to Doom).
- `A[1][0]` is your unique **Escape Rate** (Probability of transitioning from Doom to Casual).
- **Interpretation:** If your Trap Rate is 20% but your Escape Rate is 5%, your Pull Index is 4.0x. This mathematically proves you are facing a massive algorithmic deficit: you get sucked in 4 times faster than your brain is capable of pulling you out. 

### 2. Cognitive Recovery Rate (Regime Stability)
The dashboard takes the Escape Rate and calculates `1 / A[1][0]`. In Markov physics, this derives the exact **Expected Duration** of the state. 
- **Interpretation:** If the dashboard says "Doom episodes last ~15 reels", it is stating that once you breach the algorithm's event horizon, it will take your brain roughly 15 consecutive, rhythmic scrolls to muster the prefrontal cortex energy required to break the trance.

### 3. Capture Rate & Peak Vulnerability
While the "Doom Score" evaluates a single session, the **Capture Rate** evaluates your macro-lifestyle, checking what absolute percentage of your total sessions collapse into State 1 dominance.
By cross-referencing this against your Contextual Priors (Pillar 8), the dashboard identifies your "Peak Vulnerability" hours. 

### Final Philosophy
Reelio does not use screen-time limiters or app blockers. It is built on the empirical psychology tenet that **awareness of autonomic behavior must precede the restoration of agency.** By revealing the hidden, sub-perceptual statistical boundaries of your algorithmic trap, Reelio transforms a subconscious, involuntary loop back into a conscious choice.
