# Reelio App Tracking Capability & Dashboard Logic Overview

Here is a comprehensive breakdown of exactly what the Reelio app tracks (via Android's Accessibility & Usage Stats APIs), how the ALSE backend processes it, and the mathematical logic behind the current React dashboard. 

You can pass this document directly to Claude as context to inspire and guide dramatic UI/UX improvements.

---

## 1. Data Collection Layer: What the App Tracks
The Android app (`InstaAccessibilityService.kt`) passively monitors Instagram usage without root access. It collects ~80 high-dimension data points per Reel viewed, categorized into:

### A. Core Engagement & Scrolling Metrics
* **Reel Dwell Time (`DwellTime`)**: Exact milliseconds spent on a reel.
* **Scroll Speed & Distance (`AvgScrollSpeed`, `MaxScrollSpeed`)**: How fast the user swipes.
* **Scroll Rhythm (`ScrollRhythmEntropy`, `ScrollIntervalCV`)**: The erraticness or consistency of swipe intervals.
* **Continuous Scroll Streaks (`ContinuousScrollCount`)**: How many reels watched under 5 seconds sequentially.
* **Rewatching (`BackScrollCount`)**: Did the user scroll backwards to view an earlier reel?
* **Micro-Hesitations (`ScrollPauseCount`, `ScrollPauseDurationMs`)**: Mid-swipe pauses indicating conflict.
* **Incomplete Swipes (`SwipeCompletionRatio`)**: Aborted scrolls.

### B. UI Interactions & Content Context
* **Boolean Actions**: Liked, Commented, Shared, Saved.
* **Latencies**: Milliseconds taken to Like (`LikeLatencyMs`), Comment, Share, or Save after the reel started.
* **Content Flags**: Does the reel have a text caption (`HasCaption`)? Was it expanded (`CaptionExpanded`)? Does it have audio (`HasAudio`)?
* **Ad Avoidance**: Is the reel sponsored (`IsAd`)? How fast was it skipped (`AdSkipLatencyMs`)?
* **Other taps**: Profile visits (`ProfileVisits`), hashtag taps (`HashtagTaps`).

### C. Physical Posture & Environmental Sensors
* **Ambient Light Deltas (`AmbientLuxStart`, `LuxDelta`)**: Light sensor changes (e.g., turning off room lights to doomscroll in the dark).
* **Movement Variance (`AccelVariance`, `IsStationary`)**: Accelerometer variance to detect walking vs laying perfectly still.
* **Posture Shifts (`PostureShiftCount`)**: Gravity vector drift indicating uncomfortable shifting while consumed.
* **Orientation (`DeviceOrientation`)**: Portrait or Landscape mode.
* **Hardware Context**: Battery depletion (`BatteryDeltaPerSession`), charging status (`IsCharging`), Audio Output (`Speaker`, `Bluetooth`, `Headphones`).

### D. Digital Context & Session History
* **Previous App (`PreviousApp`, `PreviousAppCategory`)**: What app was used before Instagram (e.g., switching from work apps vs WhatsApp).
* **Direct Launcher (`DirectLaunch`)**: Did they open it from their home screen intentionally?
* **Time Away (`TimeSinceLastSessionMin`)**: How long they abstained.
* **Circadian Anchors (`TimePeriod`, `DayOfWeek`, `CircadianPhase`)**: Time of day (Morning/Night/Graveyard), Weekend vs Weekday flag.
* **System Stats**: Notifications dismissed vs acted upon while scrolling, Screen-on time in the preceding 1 hour.

### E. Subjective Micro-Probes (Surveys)
Occasional lock-screen prompts gather active psychological ground truth:
* **Pre-session**: `IntendedAction` (why they opened the app).
* **Post-session**: `PostSessionRating`, `RegretScore`, `ActualVsIntendedMatch`, `MoodBefore`, `MoodAfter`.

---

## 2. Modeling Layer: The ALSE Backend Logic
The Python backend (`reelio_alse.py`) ingests this CSV data and runs the **Continuous Latent State Engine (CLSE)**—a Bayesian Hidden Markov Model (HMM). 

Instead of classifying behavior statically, the model assumes the user's brain transitions between two unseen psychological states:
*   **State 0 (Casual Browsing)**: Goal-oriented, intentional, higher interactions, varied scrolling speed.
*   **State 1 (Capture / Doomscrolling)**: Autopilot, completely passive (no likes/comments), stationary posture, robotic scroll rhythm.

The output for the dashboard is passed as a JSON object containing:
1.  **`S_t`**: The capture severity representing the percentage of the session spent in "State 1" (doomscrolling).
2.  **Transition Matrix (`A`)**: The probability of transitioning from `[State 0 -> State 0, State 0 -> State 1]` and `[State 1 -> State 0, State 1 -> State 1]`.
3.  **Risk Timeline (`p_capture`)**: An array of floating-point probabilities (0.0 to 1.0) for every single reel watched in a session detailing exactly *when* the user entered State 1.
4.  **Overall Regime Stability**: A metric on how 'sticky' the doomscroll state is once entered `(1.0 / (1.0 - A[1][1]))`.

---

## 3. UI Layer: Current Dashboard Visuals & Logic
The React Dashboard (`app.jsx`) translates the JSON outputs into 5 main UI components. Currently, it visually looks very basic (a dark theme with teal/amber accents and Recharts graphs). 

Here is exactly how the math works for the current UI modules that Claude must redesign:

### A. Cognitive Stability Score
*   **Logic:** Combines average `S_t` (Capture prob) and the user's `A11` transition rate (likelihood of staying captured).
*   **Math:** `(1.0 - mean(S_t)) * 80 + (1.0 - A[1][1]) * 20`. Result is capped 0-100.
*   **Current UI:** A simple large numeric card `[84]`. Green if >70, Amber if 40-70, Red if <40.

### B. State Dynamics (Transition Matrix)
*   **Logic:** Shows the raw 2x2 Markov Transition matrix. 
    *   `Casual → Casual`: `A[0][0]`
    *   `Casual → Capture`: `A[0][1]` (The Trap Rate)
    *   `Capture → Casual`:  `A[1][0]` (The Escape Rate)
    *   `Capture → Capture`: `A[1][1]` (The Inertia Rate)
*   **Current UI:** 4 boring square boxes with percentages.

### C. Risk Heatmap (14 Days)
*   **Logic:** Aggregates `S_t` (Capture Severity) per day for the last two weeks. Shows how prone to doomscrolling the user is chronologically.
*   **Current UI:** Little square colored blocks (resembling a GitHub contribution graph) where darker red = higher daily `S_t`.

### D. Behavior Timeline Playback
*   **Logic:** Plots `p_capture` (y-axis: 0.0 to 1.0) over the number of Reels scrolled (x-axis: 0 to N).
*   **Current UI:** A Recharts area chart with a step sequence underneath it representing the "Risk Zone". Includes a scrubbable slider input to step through reel by reel.

### E. Automated Behavioral Insights
*   **Peak Vulnerability:** A string finding which `timePeriod` (Morning, Afternoon, Graveyard, etc) had the highest average `S_t` score. Formatted as an alert `⚠️`.
*   **Cognitive Recovery Rate:** A pseudo-metric calculating a "half-life" using `Math.log(2) / 0.5`. Formatted with a brain icon `🧠`.
*   **Scroll Inertia Model:** Literally just prints `A[1][1] * 100%`, representing passive state retention. Formatted with a chain icon `⛓️`.

---

## 4. Prompting Recommendations for Claude

When you hand this to Claude, you can use the following prompt context:

> *"I am redesigning the React dashboard for an app called Reelio. Reelio tracks incredibly granular passive behavioral data (scroll rhythms, posture shifts, ambient light, engagement latencies) to run a continuous Hidden Markov Model that determines if a user is actively doomscrolling. I have attached the full documentation of what the app tracks, what the modeling pipeline outputs, and the mathematical logic for the current 5 UI components.*
> 
> *The current UI (attached in the screenshot) looks like a generic admin dashboard. I want this to look like a premium, cyberpunk, physiological monitoring HUD—think intricate data visualization, dynamic animations, and complex glassmorphism that wows the user.*
> 
> *Please redesign the React component code layout. Expand on the 'Automated Insights' card by incorporating more of the tracked environmental/sensor data context. Redesign the 'State Dynamics' matrix away from four boring boxes into a circular flow chart or fluid sankey-style element. Give me a stunning, highly animated, single-file React component utilizing Tailwind CSS, Lucide icons, and Recharts."*
