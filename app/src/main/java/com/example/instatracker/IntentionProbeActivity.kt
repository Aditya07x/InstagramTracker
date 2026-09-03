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
            "Calm and focused" to 1,
            "Fine, just taking a break" to 2,
            "A bit restless or bored" to 6,
            "Tired / winding down" to 7,
            "Stressed or overwhelmed" to 10
        )

        val letters = listOf("A", "B", "C", "D", "E")
        val startIndex = layout.childCount
        stressOptions.forEachIndexed { i, (label, score) ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    moodBefore = score
                    showContextPrompt()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, stressOptions.size)

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
            "Relaxing",
            "Socializing",
            "Just woke up",
            "Work / Study",
            "Chores / Task",
            "Boredom"
        )

        val letters = listOf("A", "B", "C", "D", "E", "F")
        val startIndex = layout.childCount
        contexts.forEachIndexed { i, label ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    previousContext = label
                    showIntentionPrompt()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, contexts.size)

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

        val intentions = listOf(
            "Quick break (intentional)",
            "Habit / Automatic",
            "Bored / Nothing to do",
            "Procrastinating something",
            "Stressed / Avoidance"
        )

        val letters = listOf("A", "B", "C", "D", "E")
        val startIndex = layout.childCount
        intentions.forEachIndexed { i, label ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    intendedAction = label
                    saveAndFinish()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, intentions.size)

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
