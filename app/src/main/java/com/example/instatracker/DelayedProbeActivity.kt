package com.example.instatracker

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager

class DelayedProbeActivity : Activity() {

    private var sessionNum = -1
    private var isMorning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        sessionNum = intent.getIntExtra("session_num", -1)
        isMorning = intent.getBooleanExtra("is_morning", false)

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#05050A")

        if (isMorning) {
            showMorningPrompt()
        } else {
            showDelayedRegretPrompt()
        }
    }

    private fun showDelayedRegretPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  REFLECTION", "#BF5AF2"))
        layout.addView(SurveyUIUtils.createTitleView(this, "Reflecting on session #${sessionNum}"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "NOW THAT YOU'VE STEPPED AWAY, HOW DOES THAT TIME FEEL?"))
        layout.addView(SurveyUIUtils.createDivider(this))

        val options = listOf(
            Triple("Extreme Regret", "😩", "#FF2D55"),
            Triple("Some Regret",    "😕", "#FFB340"),
            Triple("Neutral",        "😐", "#D0DCF0"),
            Triple("Slightly Glad",  "🙂", "#0A84FF"),
            Triple("Very Glad",      "😌", "#34C759")
        )

        options.forEachIndexed { index, (label, emoji, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, emoji, color) {
                    val score = 5 - index
                    saveDelayedRegret(score)
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            finish()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    private fun showMorningPrompt() {
        val scroll = SurveyUIUtils.createScrollRoot(this)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createBadge(this, "MORNING CHECK-IN", "#34C759"))
        layout.addView(SurveyUIUtils.createTitleView(this, "How did you sleep?"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "YOUR LATE-NIGHT SCROLLING MAY HAVE IMPACTED REST"))
        layout.addView(SurveyUIUtils.createDivider(this))

        val options = listOf(
            Triple("Very Rested",   "⚡", "#34C759"),
            Triple("Fairly Rested", "🙂", "#0A84FF"),
            Triple("Okay",          "😐", "#D0DCF0"),
            Triple("Tired",         "🥱", "#FFB340"),
            Triple("Exhausted",     "😫", "#FF2D55")
        )

        options.forEachIndexed { index, (label, emoji, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, emoji, color) {
                    val score = 5 - index
                    saveMorningRest(score)
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            finish()
        })

        scroll.addView(layout)
        setContentView(scroll)
    }

    private fun saveDelayedRegret(score: Int) {
        if (sessionNum == -1) {
            finish()
            return
        }
        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("delayed_regret_score_${sessionNum}", score)
            .apply()
        
        // Apply delayed label to model state without re-running full HMM
        Thread {
            try {
                synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                    if (!com.chaquo.python.Python.isStarted()) {
                        com.chaquo.python.Python.start(
                            com.chaquo.python.android.AndroidPlatform(this)
                        )
                    }
                    val py = com.chaquo.python.Python.getInstance()
                    val module = py.getModule("reelio_alse")
                    val statePath = java.io.File(filesDir, "alse_model_state.json").absolutePath
                    val comp = prefs.getInt("comparative_rating", 0)
                    module.callAttr("apply_delayed_label", statePath, score, comp)
                    android.util.Log.d("ALSE", "Delayed label applied: regret=$score comp=$comp")
                }
            } catch (t: Throwable) {
                android.util.Log.e("ALSE", "Delayed label failed: ${t.message}")
            }
        }.start()
        
        finish()
    }

    private fun saveMorningRest(score: Int) {
        getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            .edit()
            .putInt("morning_rest_score", score)
            .apply()
        finish()
    }
}
