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
        showMoodPrompt()
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

        val cardStartIdx = layout.childCount
        val stressOptions = listOf(
            Triple("Calm and focused",        "", "#3A9E6F") to 1,
            Triple("A bit restless or bored", "", "#6B3FA0") to 6,
            Triple("Stressed or overwhelmed", "", "#C4563A") to 10,
            Triple("Tired / winding down",    "", "#9B6FCC") to 7,
            Triple("Fine, just taking a break","", "#C4973A") to 2
        )

        for ((choice, encodedRisk) in stressOptions) {
            val (label, _, color) = choice
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    moodBefore = encodedRisk
                    showContextPrompt()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            moodBefore = 0
            showContextPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

        // Stagger card entrance
        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, stressOptions.size) }
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

        val cardStartIdx = layout.childCount
        val contexts = listOf(
            Pair("Work / Study",  "#6B3FA0"),
            Pair("Socializing",   "#9B6FCC"),
            Pair("Relaxing",      "#3A9E6F"),
            Pair("Chores / Task", "#C4973A"),
            Pair("Just woke up",  "#6366F1"),
            Pair("Boredom",       "#8C7F73")
        )

        for ((label, color) in contexts) {
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    previousContext = label
                    showIntentionPrompt()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            previousContext = "unknown"
            showIntentionPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, contexts.size) }
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

        val cardStartIdx = layout.childCount
        val options = listOf(
            Pair("Bored / Nothing to do",     "#C4973A"),
            Pair("Stressed / Avoidance",      "#C4563A"),
            Pair("Procrastinating something", "#C4973A"),
            Pair("Habit / Automatic",         "#6B3FA0"),
            Pair("Quick break (intentional)", "#3A9E6F")
        )

        for ((label, color) in options) {
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    intendedAction = label
                    saveAndFinish()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            intendedAction = ""
            saveAndFinish()
        })

        scroll.addView(layout)
        setContentView(root)

        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, options.size) }
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
