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

    // Loaded from pre-session
    private var moodBefore = 0
    private var intendedAction = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#05050A")

        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        moodBefore = prefs.getInt("current_mood_before", 0)
        intendedAction = prefs.getString("current_intended_action", "") ?: ""

        showSessionRatingPrompt()
    }

    // ── Step 1: How was the session? ──────────────────────────────────────────
    private fun showSessionRatingPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 3, currentStep = 1))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  REVIEW", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Session Complete"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "HOW WAS THAT SESSION?"))
        layout.addView(SurveyUIUtils.createDivider(this))

        val ratingRow = buildEmojiRatingRow(
            emojis    = listOf("😩", "😕", "😐", "🙂", "😌"),
            sublabels = listOf("Terrible", "Bad", "Okay", "Good", "Great")
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
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 3, currentStep = 2))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  MOOD CHECK", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Mood right now?"))

        // Show mood delta context if pre-session mood was recorded
        if (moodBefore > 0) {
            layout.addView(SurveyUIUtils.createSubtitle(this, "YOU RATED $moodBefore BEFORE THIS SESSION"))
        } else {
            layout.addView(SurveyUIUtils.createSubtitle(this, "RATE YOUR CURRENT MOOD"))
        }

        layout.addView(SurveyUIUtils.createDivider(this))

        val moodRow = buildEmojiRatingRow(
            emojis    = listOf("😞", "😕", "😐", "🙂", "😊"),
            sublabels = listOf("Low", "", "Neutral", "", "High")
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
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 3, currentStep = 3))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  VOLITION", "#F20DA6"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Did you mean to scroll that long?"))

        // Show intention context if captured
        val subtitle = if (intendedAction.isNotEmpty())
            "YOU SAID YOU WERE HERE TO: ${intendedAction.uppercase()}"
        else
            "WAS THIS SESSION INTENTIONAL?"
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
                    finalizeProbe()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            regretScore = 0
            finalizeProbe()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Save + close ──────────────────────────────────────────────────────────
    private fun finalizeProbe() {
        // MoodDelta is calculated here before writing,
        // daemon service reads these values at CSV flush
        getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .edit()
            .putInt("probe_post_rating", postSessionRating)
            .putInt("probe_regret_score", regretScore)
            .putInt("probe_mood_after", moodAfter)
            // Pre-calculated delta so service doesn't have to
            .putInt("probe_mood_delta", if (moodBefore > 0 && moodAfter > 0) moodAfter - moodBefore else 0)
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