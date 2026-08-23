CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    client_session_id VARCHAR(255) UNIQUE NOT NULL,
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    duration_seconds FLOAT,
    time_of_day_category VARCHAR(50),
    is_late_night BOOLEAN,
    total_scrolls INTEGER,
    like_count INTEGER,
    comment_click_count INTEGER,
    share_count INTEGER,
    save_count INTEGER,
    immersion_score FLOAT,
    total_reels_viewed INTEGER,
    avg_reel_exposure FLOAT,
    max_reel_exposure FLOAT,
    mean_scroll_interval FLOAT,
    scroll_interval_variance FLOAT,
    peak_acceleration FLOAT,
    session_dwell_trend FLOAT,
    early_vs_late_ratio FLOAT,
    interaction_rate FLOAT,
    interaction_dropoff FLOAT,
    scroll_interval_cv FLOAT,
    scroll_rhythm_entropy FLOAT,
    sessions_today INTEGER,
    total_dwell_today_min FLOAT,
    rolling_doom_rate_7d FLOAT,
    doom_streak_length INTEGER,
    circadian_phase FLOAT,
    sleep_proxy_score FLOAT,
    post_session_rating INTEGER,
    intended_action VARCHAR(255),
    actual_vs_intended_match FLOAT,
    regret_score INTEGER,
    mood_before INTEGER,
    mood_after INTEGER,
    mood_delta INTEGER,
    regime_flag BOOLEAN
);

CREATE TABLE reels (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    reel_index INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    dwell_time_sec FLOAT,
    avg_scroll_speed FLOAT,
    max_scroll_speed FLOAT,
    scroll_friction_index FLOAT,
    liked BOOLEAN,
    commented BOOLEAN,
    paused BOOLEAN,
    immersion_score FLOAT,
    log_dwell FLOAT,
    log_speed FLOAT,
    rhythm_dissociation FLOAT,
    rewatch_intensity FLOAT,
    exit_flag BOOLEAN,
    dwell_percentile FLOAT,
    scroll_interval_cv FLOAT
);

CREATE TABLE scroll_events (
    id SERIAL PRIMARY KEY,
    reel_id INTEGER REFERENCES reels(id) ON DELETE CASCADE,
    ts TIMESTAMP,
    velocity FLOAT,
    acceleration FLOAT
);

CREATE TABLE model_state (
    user_id VARCHAR(255) PRIMARY KEY,
    a_matrix JSONB,
    pi JSONB,
    q_01 FLOAT,
    q_10 FLOAT,
    mu JSONB,
    sigma JSONB,
    rho_dwell_speed JSONB,
    feature_weights JSONB,
    logistic_weights JSONB,
    running_disagreement FLOAT,
    last_label_conf FLOAT,
    labeled_sessions INTEGER,
    ss_recent JSONB,
    ss_medium JSONB,
    ss_long JSONB,
    scorer_component_weights JSONB,
    baseline_memory JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_scores (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    s_t FLOAT,
    raw_s_t FLOAT,
    dominant_state INTEGER,
    day_adjusted_capture FLOAT,
    day_frequency_risk FLOAT,
    heuristic_score FLOAT,
    heuristic_components JSONB,
    session_top_driver VARCHAR(255),
    model_confidence FLOAT,
    model_confidence_breakdown JSONB,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regime_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    s_i FLOAT,
    resolved_at TIMESTAMP
);

CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    post_session_rating INTEGER,
    regret_score INTEGER,
    comparative_rating INTEGER,
    mood_before INTEGER,
    mood_after INTEGER,
    intended_action VARCHAR(255),
    actual_vs_intended FLOAT,
    survey_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insights (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    narrative_text TEXT,
    retrieved_chunk_ids JSONB,
    model_used VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE psych_corpus_chunks (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255),
    title VARCHAR(255),
    text TEXT,
    embedding VECTOR(1536)
);

CREATE TABLE model_hyperparams (
    version_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    doom_cutoff FLOAT,
    calibration_bias FLOAT,
    cusum_threshold FLOAT,
    cusum_drift_k FLOAT,
    arbitration_weights JSONB,
    confidence_weights JSONB,
    label_confidence_table JSONB,
    disagreement_decay_base FLOAT,
    disagreement_clip FLOAT,
    freq_risk_params JSONB,
    ctmc_full_decay_hours FLOAT,
    notes TEXT
);

INSERT INTO model_hyperparams (
    is_active, doom_cutoff, calibration_bias, cusum_threshold, cusum_drift_k,
    arbitration_weights, confidence_weights, label_confidence_table,
    disagreement_decay_base, disagreement_clip, freq_risk_params, ctmc_full_decay_hours, notes
) VALUES (
    TRUE, 0.55, -0.357, 8.0, 0.05,
    '{"behavior": 0.45, "length": 0.25, "disagreement": 0.25, "base": 0.05, "cap": 0.9, "damping": 0.35}'::jsonb,
    '{"volume": 0.35, "separation": 0.35, "stability": 0.20, "label": 0.10, "readiness_base": 0.35, "readiness_scale": 0.65}'::jsonb,
    '[1.00, 0.85, 0.70, 0.50, 0.35]'::jsonb,
    0.80, 0.25, '{"base1": 1.35, "base2": 1.65, "cap1": 0.18, "cap2": 0.12}'::jsonb,
    4.0, 'Initial hand-tuned parameters from v3'
);
