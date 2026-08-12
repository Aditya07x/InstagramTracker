package com.example.instatracker

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager

/**
 * Pre-session survey — 3 steps:
 *   1. Current mood / stress state
 *   2. Previous context (what were you doing)
 *   3. Intention (why are you opening Instagram)
 *
 * Uses blob background, progress ring, glass cards, gradient titles.
 */
class IntentionProbeActivity : Activity() {

    private var moodBefore = 0
    private var previousContext = "unknown"
    private var intendedAction = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#EDE8DF")
        getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("survey_activity_open", true)
            .putLong("survey_activity_open_since", System.currentTimeMillis())
            .apply()
        showMoodPrompt()
    }

    override fun onDestroy() {
        getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .edit()
            .putBoolean("survey_activity_open", false)
            .remove("survey_activity_open_since")
            .apply()
        super.onDestroy()
    }

    // ── Step 1: Mood / Stress State ───────────────────────────────────────────
    private fun showMoodPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.PRE)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 1, accentColor = "#6B3FA0"))
        layout.addView(SurveyUIUtils.createBadge(this, "PRE-SESSION  \u00B7  STATE CHECK", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "Right now I feel...", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "take a moment to check in"))

        val stressOptions = listOf(
            SurveyUIUtils.KnobOption("Calm and focused", "#3A9E6F") to 1,
            SurveyUIUtils.KnobOption("A bit restless or bored", "#6B3FA0") to 6,
            SurveyUIUtils.KnobOption("Stressed or overwhelmed", "#C4563A") to 10,
            SurveyUIUtils.KnobOption("Tired / winding down", "#9B6FCC") to 7,
            SurveyUIUtils.KnobOption("Fine, just taking a break", "#C4973A") to 2
        )

        layout.addView(
            SurveyUIUtils.createChoiceKnob(
                this,
                stressOptions.map { it.first },
                hint = "where are you starting from?"
            ) { index ->
                moodBefore = stressOptions[index].second
                showContextPrompt()
            }
        )

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            moodBefore = 0
            showContextPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Step 2: Previous Context ──────────────────────────────────────────────
    private fun showContextPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.PRE)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 2, accentColor = "#6B3FA0"))
        layout.addView(SurveyUIUtils.createBadge(this, "PRE-SESSION  \u00B7  CONTEXT", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "What were you just doing?", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "what was happening before you opened up?"))

        val contexts = listOf(
            SurveyUIUtils.KnobOption("Work / Study", "#6B3FA0"),
            SurveyUIUtils.KnobOption("Socializing", "#9B6FCC"),
            SurveyUIUtils.KnobOption("Relaxing", "#3A9E6F"),
            SurveyUIUtils.KnobOption("Chores / Task", "#C4973A"),
            SurveyUIUtils.KnobOption("Just woke up", "#6366F1"),
            SurveyUIUtils.KnobOption("Boredom", "#8C7F73")
        )

        layout.addView(
            SurveyUIUtils.createChoiceKnob(
                this,
                contexts,
                hint = "what were you in the middle of?"
            ) { index ->
                previousContext = contexts[index].label
                showIntentionPrompt()
            }
        )

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            previousContext = "unknown"
            showIntentionPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Step 3: Intention ─────────────────────────────────────────────────────
    private fun showIntentionPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.PRE)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 3, accentColor = "#6B3FA0"))
        layout.addView(SurveyUIUtils.createBadge(this, "PRE-SESSION  \u00B7  INTENTION", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "Why are you opening this?", "#6B3FA0"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "knowing this helps you notice patterns"))

        val options = listOf(
            SurveyUIUtils.KnobOption("Bored / Nothing to do", "#C4973A"),
            SurveyUIUtils.KnobOption("Stressed / Avoidance", "#C4563A"),
            SurveyUIUtils.KnobOption("Procrastinating something", "#C4973A"),
            SurveyUIUtils.KnobOption("Habit / Automatic", "#6B3FA0"),
            SurveyUIUtils.KnobOption("Quick break (intentional)", "#3A9E6F")
        )

        layout.addView(
            SurveyUIUtils.createChoiceKnob(
                this,
                options,
                hint = "what's pulling you in?"
            ) { index ->
                intendedAction = options[index].label
                saveAndFinish()
            }
        )

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            intendedAction = ""
            saveAndFinish()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Persist + close ───────────────────────────────────────────────────────
    private fun saveAndFinish() {
        getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            .edit()
            .putInt("current_mood_before", moodBefore)
            .putString("previous_context", previousContext)
            .putString("current_intended_action", intendedAction)
            .putLong("intention_session_timestamp", System.currentTimeMillis())
            .apply()
        finish()
    }
}
