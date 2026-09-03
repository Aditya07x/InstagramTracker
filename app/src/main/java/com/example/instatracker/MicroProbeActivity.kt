package com.example.instatracker

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.io.File
import kotlin.concurrent.thread

/**
 * Post-session survey — reduced from 4 to 3 steps:
 *   1. Post-session affective state (how do you feel after closing?)
 *   2. Regret / volition (did it go as intended?)
 *   3. Comparative experience (overall session quality)
 *
 * Step 2 ("mood after" / focus change) was removed — it was redundant
 * with Step 1 since we already capture moodBefore from pre-session.
 * moodAfter is now derived from postSessionRating for backward compat.
 */
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
        window.statusBarColor = Color.parseColor("#EDE8DF")

        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("survey_activity_open", true)
            .putLong("survey_activity_open_since", System.currentTimeMillis())
            .apply()

        val sessNum = prefs.getInt("pending_survey_session_num", 0)
        val notifId = InstaAccessibilityService.SURVEY_NOTIF_ID_BASE + sessNum
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(notifId)

        val intentionTs = prefs.getLong("intention_session_timestamp", 0L)
        val intentionIsStale = System.currentTimeMillis() - intentionTs > 4 * 60 * 60 * 1000L

        moodBefore     = if (intentionIsStale) 0 else prefs.getInt("current_mood_before", 0)
        intendedAction = if (intentionIsStale) "" else prefs.getString("current_intended_action", "") ?: ""

        showSessionRatingPrompt()
    }

    override fun onDestroy() {
        getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .edit()
            .putBoolean("survey_activity_open", false)
            .remove("survey_activity_open_since")
            .apply()
        super.onDestroy()
    }

    // ── Step 1: Post-Session Affective State ──────────────────────────────────
    private fun showSessionRatingPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 1, accentColor = "#4A2580"))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  REVIEW", "#4A2580"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "After closing Instagram, I feel...", "#4A2580"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "be honest — there are no wrong answers"))

        val affectiveOptions = listOf(
            "Refreshed / entertained" to 5,
            "About the same as before" to 4,
            "A little drained" to 3,
            "Regret I opened it" to 2,
            "Worse than before I opened it" to 1
        )

        val letters = listOf("A", "B", "C", "D", "E")
        val startIndex = layout.childCount
        affectiveOptions.forEachIndexed { i, (label, rating) ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    postSessionRating = rating
                    moodAfter = when {
                        postSessionRating >= 4 -> 5
                        postSessionRating == 3 -> 3
                        else -> 1
                    }
                    showRegretPrompt()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, affectiveOptions.size)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            postSessionRating = 0
            moodAfter = 0
            showRegretPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Step 2: Regret / Volition ─────────────────────────────────────────────
    private fun showRegretPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 2, accentColor = "#4A2580"))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  INTENT CHECK", "#4A2580"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "Did this session go as intended?", "#4A2580"))

        val subtitle = when {
            intendedAction == "Stressed / Avoidance" ->
                "you opened this to avoid something"
            intendedAction == "Procrastinating something" ->
                "you opened this to procrastinate"
            intendedAction == "Quick break (intentional)" ->
                "you planned a quick break"
            intendedAction == "Habit / Automatic" ->
                "you said this was automatic"
            intendedAction.isNotEmpty() ->
                "you opened this: ${intendedAction.lowercase()}"
            else ->
                "reflect on how the session went"
        }
        layout.addView(SurveyUIUtils.createSubtitle(this, subtitle))

        val options = listOf(
            "Yes, it went as planned" to 1,
            "Somewhat" to 3,
            "No, it went off track" to 5
        )

        val letters = listOf("A", "B", "C")
        val startIndex = layout.childCount
        options.forEachIndexed { i, (label, score) ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    regretScore = score
                    showComparativePrompt()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, options.size)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            regretScore = 0
            showComparativePrompt()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Step 3: Comparative Experience ────────────────────────────────────────
    private fun showComparativePrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 3, accentColor = "#4A2580"))
        layout.addView(SurveyUIUtils.createBadge(this, "POST-SESSION  ·  EXPERIENCE", "#4A2580"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "This session was...", "#4A2580"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "how did this session feel overall?"))

        val options = listOf(
            "Intentional — I got what I came for" to 5,
            "Okay, nothing special" to 4,
            "Longer than I wanted" to 3,
            "A waste of time" to 2,
            "I could not stop — it took over" to 1
        )

        val letters = listOf("A", "B", "C", "D", "E")
        val startIndex = layout.childCount
        options.forEachIndexed { i, (label, rating) ->
            val letter = letters.getOrElse(i) { "${i + 1}" }
            layout.addView(
                SurveyUIUtils.createMcqCard(this, label, letter) {
                    comparativeRating = rating
                    finalizeProbe()
                }
            )
        }
        SurveyUIUtils.staggerCards(layout, startIndex, options.size)

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            comparativeRating = 0
            finalizeProbe()
        })

        scroll.addView(layout)
        setContentView(root)

    }

    // ── Save + close ──────────────────────────────────────────────────────────
    private fun finalizeProbe() {
        val actualMatch = when {
            intendedAction.isEmpty()                       -> 0
            intendedAction == "Habit / Automatic"          -> 1
            intendedAction == "Stressed / Avoidance"       -> 0
            intendedAction == "Procrastinating something"  -> 0
            regretScore >= 4                               -> 0
            regretScore <= 2                               -> 1
            else                                           -> 2
        }

        val consolidatedResult = listOf(
            postSessionRating,
            intendedAction,
            actualMatch,
            regretScore,
            moodBefore,
            moodAfter,
            0, // moodDelta intentionally disabled
            comparativeRating
        ).joinToString(",")

        getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .edit()
            .putInt("probe_post_rating",        postSessionRating)
            .putInt("probe_regret_score",       regretScore)
            .putInt("probe_focus_after",        moodAfter)
            .putInt("probe_mood_delta",         0)
            .putInt("probe_actual_vs_intended", actualMatch)
            .putInt("comparative_rating",        comparativeRating)
            .putString("last_microprobe_result", consolidatedResult)
            .putBoolean("survey_activity_open", false)
            .remove("survey_activity_open_since")
            .putInt("survey_completed_for_session",
                getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
                    .getInt("pending_survey_session_num", -1))
            .putString("survey_completed_for_session_date",
                getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
                    .getString("pending_survey_session_date", "") ?: "")
            .apply()

        val sessNum = getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
            .getInt("pending_survey_session_num", 0)
        val notifId = InstaAccessibilityService.SURVEY_NOTIF_ID_BASE + sessNum
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(notifId)

        applyRetroactiveSurveyUpdate(actualMatch)
        finish()
    }

    private fun applyRetroactiveSurveyUpdate(actualMatch: Int) {
        val prefs = getSharedPreferences("InstaTrackerPrefs", MODE_PRIVATE)
        val sessionUuid = prefs.getString("pending_survey_session_uuid", null)

        thread {
            try {
                var updatedDoomScore = 0f
                synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                    try {
                        if (!Python.isStarted()) {
                            Python.start(AndroidPlatform(this))
                        }
                        val py = Python.getInstance()
                        val reelioModule = py.getModule("reelio_alse")

                        val csvContent = DatabaseProvider.getCsvString(this@MicroProbeActivity)
                        val cappedCsv = if (csvContent.isNotBlank()) {
                            val lines = csvContent.lines()
                            if (lines.size > 2) {
                                val header1 = lines[0]
                                val header2 = lines[1]
                                val dataLines = lines.drop(2).filter { it.isNotBlank() }
                                (listOf(header1, header2) + dataLines.takeLast(200)).joinToString("\n")
                            } else {
                                csvContent
                            }
                        } else ""

                        val statePath = File(filesDir, "alse_model_state.json").absolutePath

                        val pyDict = py.getBuiltins().callAttr("dict")
                        pyDict.callAttr("__setitem__", "PostSessionRating", postSessionRating)
                        pyDict.callAttr("__setitem__", "IntendedAction", intendedAction)
                        pyDict.callAttr("__setitem__", "ActualVsIntendedMatch", actualMatch)
                        pyDict.callAttr("__setitem__", "RegretScore", regretScore)
                        pyDict.callAttr("__setitem__", "MoodBefore", moodBefore)
                        pyDict.callAttr("__setitem__", "MoodAfter", moodAfter)
                        pyDict.callAttr("__setitem__", "ComparativeRating", comparativeRating)
                        // Delayed regret survey feature was removed — column stays in the CSV
                        // schema (avoids a schema migration) but is always 0 going forward.
                        pyDict.callAttr("__setitem__", "DelayedRegretScore", 0)
                        pyDict.callAttr("__setitem__", "MorningRestScore", prefs.getInt("morning_rest_score", 0))
                        pyDict.callAttr("__setitem__", "PreviousContext",
                            prefs.getString("previous_context", "unknown") ?: "unknown")

                        val result = reelioModule.callAttr("run_inference_on_latest", cappedCsv, statePath, pyDict)
                        val resultMap = result.asMap()

                        val scoreObj = resultMap[py.getBuiltins().callAttr("str", "doom_score")]
                        if (scoreObj != null) updatedDoomScore = scoreObj.toFloat()

                        prefs.edit()
                            .putFloat("last_session_doom_score", updatedDoomScore)
                            .apply()

                        Log.d("ALSE", "Retroactive survey re-inference: score=$updatedDoomScore")
                    } catch (t: Throwable) {
                        Log.e("ALSE", "Retroactive Python inference failed: ${t.message}")
                    }
                }

                val targetSessionNum = prefs.getInt("pending_survey_session_num", -1).toString()
                retroactivelyUpdateCsv(targetSessionNum, actualMatch, prefs)

                try {
                    val hmmCache = File(filesDir, "hmm_results.json")
                    if (hmmCache.exists()) {
                        hmmCache.delete()
                        Log.d("ALSE", "Invalidated HMM cache after survey update")
                    }
                } catch (t: Throwable) {
                    Log.e("ALSE", "Failed to invalidate HMM cache: ${t.message}")
                }
            } catch (t: Throwable) {
                Log.e("ALSE", "Retroactive survey update failed: ${t.message}")
            }
        }
    }

    private fun retroactivelyUpdateCsv(
        targetSessionNum: String,
        actualMatch: Int,
        prefs: android.content.SharedPreferences
    ) {
        synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
            try {
                val db = DatabaseProvider.getDatabase(this)
                val targetNum = targetSessionNum.toIntOrNull() ?: return
                val rows = db.csvRowDao().getRowsForSession(targetNum)
                if (rows.isEmpty()) return

                val csvContent = DatabaseProvider.getCsvString(this)
                val lines = csvContent.lines()
                if (lines.size < 2) return
                val header = lines[1].split(",")

                val sessNumIdx       = header.indexOf("SessionNum")
                val startTimeIdx     = header.indexOf("StartTime")
                val postRatingIdx    = header.indexOf("PostSessionRating")
                val intendedIdx      = header.indexOf("IntendedAction")
                val matchIdx         = header.indexOf("ActualVsIntendedMatch")
                val regretIdx        = header.indexOf("RegretScore")
                val moodBeforeIdx    = header.indexOf("MoodBefore")
                val moodAfterIdx     = header.indexOf("MoodAfter")
                val comparativeIdx   = header.indexOf("ComparativeRating")
                if (sessNumIdx < 0 || startTimeIdx < 0 || postRatingIdx < 0) return

                val targetDatePrefix = (prefs.getString("pending_survey_session_date", "") ?: "").trim()

                val updatedRows = ArrayList<com.example.instatracker.db.CsvRowEntity>(rows.size)
                for (row in rows) {
                    val fields = row.csvLine.split(",").toMutableList()
                    if (fields.size <= sessNumIdx || fields.size <= startTimeIdx) continue
                    if (fields[sessNumIdx].trim() != targetSessionNum) continue

                    val rowStartTime = fields[startTimeIdx].trim()
                    if (targetDatePrefix.isNotEmpty() && !rowStartTime.startsWith(targetDatePrefix)) continue

                    if (postRatingIdx < fields.size)    fields[postRatingIdx]  = postSessionRating.toString()
                    if (intendedIdx in 0 until fields.size)  fields[intendedIdx]   = intendedAction
                    if (matchIdx in 0 until fields.size)     fields[matchIdx]      = actualMatch.toString()
                    if (regretIdx in 0 until fields.size)    fields[regretIdx]     = regretScore.toString()
                    if (moodBeforeIdx in 0 until fields.size && moodBefore > 0) fields[moodBeforeIdx] = moodBefore.toString()
                    if (moodAfterIdx in 0 until fields.size) fields[moodAfterIdx]  = moodAfter.toString()
                    if (comparativeIdx in 0 until fields.size) fields[comparativeIdx] = comparativeRating.toString()

                    updatedRows.add(row.copy(csvLine = fields.joinToString(",")))
                }

                if (updatedRows.isNotEmpty()) {
                    // Anti-N+1: Update all affected rows in a single batch transaction
                    db.csvRowDao().updateAll(updatedRows)
                    Log.d("ALSE", "Retroactive DB update: Updated ${updatedRows.size} rows in SQLite.")
                }
            } catch (t: Throwable) {
                Log.e("ALSE", "Retroactive DB update failed: ${t.message}")
            }
            Unit
        }
    }
}
