package com.example.instatracker

import android.app.Activity
import android.os.Bundle
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

// Triggered at Session START (sampled at ~30%)
class IntentionProbeActivity : Activity() {

    private var moodBefore = 0
    private var intendedAction = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Translucent status bar for immersive feel
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#05050A")

        showMoodPrompt()
    }

    // ── Step 1: Mood Before ───────────────────────────────────────────────────
    private fun showMoodPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 2, currentStep = 1))
        layout.addView(SurveyUIUtils.createBadge(this, "PRE-SESSION  ·  MOOD CHECK", "#0DDFF2"))
        layout.addView(SurveyUIUtils.createTitleView(this, "How are you feeling?"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "RATE YOUR CURRENT MOOD"))
        layout.addView(SurveyUIUtils.createDivider(this))

        // Mood labels with emojis above the buttons
        val moodRow = buildMoodButtonRow(
            labels   = listOf("1", "2", "3", "4", "5"),
            emojis   = listOf("😞", "😕", "😐", "🙂", "😊"),
            sublabels = listOf("Low", "", "Neutral", "", "High")
        ) { rating ->
            moodBefore = rating
            showIntentionPrompt()
        }
        layout.addView(moodRow)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            moodBefore = 0
            showIntentionPrompt()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    // ── Step 2: Intention ─────────────────────────────────────────────────────
    private fun showIntentionPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createStepIndicator(this, totalSteps = 2, currentStep = 2))
        layout.addView(SurveyUIUtils.createBadge(this, "PRE-SESSION  ·  INTENTION", "#0DDFF2"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Why are you opening this?"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "THE ALGORITHM WILL TRACK YOUR ACTUAL VS INTENDED"))
        layout.addView(SurveyUIUtils.createDivider(this))

        val options = listOf(
            Triple("Browse",          "🌊", "#0DDFF2"),
            Triple("Specific Search", "🔍", "#0A84FF"),
            Triple("Habit",           "🔁", "#BF5AF2"),
            Triple("Killing Time",    "⏱",  "#FFB340"),
        )

        for ((label, emoji, color) in options) {
            layout.addView(
                SurveyUIUtils.createOptionButton(
                    context     = this,
                    label       = label,
                    emoji       = emoji,
                    accentColor = color
                ) {
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
        setContentView(scroll)
    }

    // ── Persist + close ───────────────────────────────────────────────────────
    private fun saveAndFinish() {
        getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            .edit()
            .putInt("current_mood_before", moodBefore)
            .putString("current_intended_action", intendedAction)
            .apply()
        finish()
    }

    // ── Emoji + numeric mood button grid ──────────────────────────────────────
    private fun buildMoodButtonRow(
        labels: List<String>,
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
            lp.bottomMargin = SurveyUIUtils.run {
                android.util.TypedValue.applyDimension(
                    android.util.TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics
                ).toInt()
            }
            layoutParams = lp
        }

        labels.forEachIndexed { index, label ->
            val cell = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                val cellLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                cellLp.setMargins(6, 0, 6, 0)
                layoutParams = cellLp
            }

            val emojiTv = TextView(this).apply {
                text = emojis[index]
                textSize = 22f
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.bottomMargin = 8 }
            }

            val btn = SurveyUIUtils.createStyledButton(this, label) {
                onSelect(label.toInt())
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