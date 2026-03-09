package com.example.instatracker

import android.content.Context
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

class MicroProbeActivity : Activity() {

    private var postSessionRating = 0
    private var regretScore = 0
    private var moodAfter = 0
    private var comparativeRating = 0

    // Loaded from pre-session
    private var moodBefore = 0
    private var intendedAction = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#05050A")

        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val intentionTs = prefs.getLong("intention_session_timestamp", 0L)
        val intentionIsStale = System.currentTimeMillis() - intentionTs > 4 * 60 * 60 * 1000L

        moodBefore    = if (intentionIsStale) 0 else prefs.getInt("current_mood_before", 0)
        intendedAction = if (intentionIsStale) "" else prefs.getString("current_intended_action", "") ?: ""

        showSessionRatingPrompt()
    }

    // ── Step 1: How was the session? ──────────────────────────────────────────
    private fun showSessionRatingPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 4, currentStep = 1))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  REVIEW", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Session Complete"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "HOW DO YOU FEEL ABOUT THE TIME YOU SPENT?"))
        layout.addView(SurveyUIUtils.createDivider(this))

        val ratingRow = buildEmojiRatingRow(
            emojis    = listOf("😩", "😕", "😐", "🙂", "😌"),
            sublabels = listOf("Wasted", "Mostly wasted", "Mixed", "Mostly worth it", "Well spent")
        ) { rating ->
            postSessionRating = rating
            showMoodAfterPrompt()
        }
        layout.addView(ratingRow)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            postSessionRating = 0
            showMoodAfterPrompt()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Step 2: Mood After ────────────────────────────────────────────────────
    private fun showMoodAfterPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 4, currentStep = 2))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  FOCUS CHECK", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "How's your focus right now?"))

        // Show mood delta context if pre-session mood was recorded
        if (moodBefore > 0) {
            layout.addView(SurveyUIUtils.createSubtitle(this, "YOU RATED YOUR MOOD $moodBefore BEFORE THIS SESSION"))
        } else {
            layout.addView(SurveyUIUtils.createSubtitle(this, "RATE YOUR CURRENT FOCUS"))
        }

        layout.addView(SurveyUIUtils.createDivider(this))

        val moodRow = buildEmojiRatingRow(
            emojis    = listOf("🌫️", "😕", "😐", "🙂", "⚡"),
            sublabels = listOf("Can't focus", "Scattered", "Okay", "Fairly sharp", "Sharp")
        ) { rating ->
            moodAfter = rating
            showRegretPrompt()
        }
        layout.addView(moodRow)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            moodAfter = 0
            showRegretPrompt()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Step 3: Regret / Volition ─────────────────────────────────────────────
    private fun showRegretPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 4, currentStep = 3))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  VOLITION", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Did you mean to scroll that long?"))

        // Show intention context if captured
        val subtitle = when {
            intendedAction == "Stressed / Avoidance" ->
                "YOU OPENED THIS TO AVOID SOMETHING"
            intendedAction == "Quick break (intentional)" ->
                "YOU PLANNED A QUICK BREAK"
            intendedAction == "Habit / Automatic" ->
                "YOU SAID THIS WAS AUTOMATIC"
            intendedAction.isNotEmpty() ->
                "YOU OPENED THIS: ${intendedAction.uppercase()}"
            else ->
                "WAS THIS SESSION INTENTIONAL?"
        }
        layout.addView(SurveyUIUtils.createSubtitle(this, subtitle))
        layout.addView(SurveyUIUtils.createDivider(this))

        val options = listOf(
            Triple("Definitely not",  "😤", "#FF2D55"),
            Triple("Not really",      "😬", "#FFB340"),
            Triple("Somewhat",        "😐", "#D0DCF0"),
            Triple("Pretty much",     "🙂", "#0A84FF"),
            Triple("Completely yes",  "✅", "#0DDFF2"),
        )

        options.forEachIndexed { index, (label, emoji, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(
                    context     = this,
                    label       = label,
                    emoji       = emoji,
                    accentColor = color
                ) {
                    // Invert: "Definitely not" = highest regret score (5)
                    regretScore = 5 - index
                    showComparativePrompt()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            regretScore = 0
            showComparativePrompt()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Step 4: Comparative ──────────────────────────────────────────────────
    private fun showComparativePrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)
        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val lastDoom = prefs.getFloat("last_session_doom_for_compare", 0f)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 4, currentStep = 4))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  STABILITY", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Relative to last time?"))
        
        val subtitle = if (lastDoom > 0.6f) {
            "LAST SESSION WAS DETECTED AS HIGH-DOOM"
        } else {
            "COMPARED TO YOUR PREVIOUS INSTAGRAM SESSION"
        }
        layout.addView(SurveyUIUtils.createSubtitle(this, subtitle))
        layout.addView(SurveyUIUtils.createDivider(this))

        val options = listOf(
            Triple("Significantly better", "🌟", "#34C759"),
            Triple("Slightly better",      "🙂", "#0A84FF"),
            Triple("About the same",       "😐", "#D0DCF0"),
            Triple("Slightly worse",       "😬", "#FFB340"),
            Triple("Significantly worse",  "😤", "#FF2D55")
        )

        options.forEachIndexed { index, (label, emoji, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, emoji, color) {
                    comparativeRating = 5 - index
                    finalizeProbe()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            comparativeRating = 0
            finalizeProbe()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Save + close ──────────────────────────────────────────────────────────
    private fun finalizeProbe() {
        val actualMatch = when {
            intendedAction.isEmpty()              -> 0
            intendedAction == "Habit / Automatic" -> 1   // no stated intent to violate
            intendedAction == "Stressed / Avoidance" -> 0 // opening to avoid is inherently low-match
            regretScore >= 4                      -> 0   // high regret = didn't match
            regretScore <= 2                      -> 1   // low regret = matched
            else                                  -> 2
        }

        val consolidatedResult = listOf(
            postSessionRating,
            intendedAction,
            actualMatch,
            regretScore,
            moodBefore,
            moodAfter,
            if (moodAfter > 0 && moodBefore > 0) moodAfter - moodBefore else 0, // moodDelta
            comparativeRating
        ).joinToString(",")

        getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .edit()
            .putInt("probe_post_rating",       postSessionRating)
            .putInt("probe_regret_score",      regretScore)
            .putInt("probe_focus_after",       moodAfter)   // renamed: now captures focus, not mood
            .putInt("probe_mood_delta",        if (moodAfter > 0 && moodBefore > 0) moodAfter - moodBefore else 0)
            .putInt("probe_actual_vs_intended", actualMatch)
            .putInt("comparative_rating",       comparativeRating)
            .putString("last_microprobe_result", consolidatedResult)
            .apply()

        finish()
    }

    // ── Emoji rating row ──────────────────────────────────────────────────────
    private fun buildEmojiRatingRow(
        emojis: List<String>,
        sublabels: List<String>,
        onSelect: (Int) -> Unit
    ): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics
            ).toInt()
            layoutParams = lp
        }

        emojis.forEachIndexed { index, emoji ->
            val value = index + 1
            val cell = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                val cellLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                cellLp.setMargins(5, 0, 5, 0)
                layoutParams = cellLp
            }

            val emojiTv = TextView(this).apply {
                text = emoji
                textSize = 22f
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.bottomMargin = 8 }
            }

            val btn = SurveyUIUtils.createStyledButton(this, value.toString()) {
                onSelect(value)
            }
            btn.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )

            val subTv = TextView(this).apply {
                text = sublabels[index]
                textSize = 8f
                setTextColor(Color.parseColor("#6B7A9F"))
                gravity = Gravity.CENTER
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                lp.topMargin = 6
                layoutParams = lp
            }

            cell.addView(emojiTv)
            cell.addView(btn)
            cell.addView(subTv)
            row.addView(cell)
        }

        return row
    }
}