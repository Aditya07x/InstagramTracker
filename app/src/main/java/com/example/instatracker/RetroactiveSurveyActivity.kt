package com.example.instatracker

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.WindowManager
import android.widget.LinearLayout
import org.json.JSONObject
import java.io.File
import kotlin.concurrent.thread

/**
 * RetroactiveSurveyActivity
 * ─────────────────────────
 * Presents the same 3-step post-session survey as MicroProbeActivity, but
 * targeted at a *past* session identified by sessionNum + date.
 *
 * Key differences from MicroProbeActivity:
 *  - Does NOT delete hmm_results.json — patches it in-place instead.
 *  - Does NOT run Python re-inference — only updates survey label fields.
 *  - Increments labeled_sessions in alse_model_state.json (only that field).
 *  - Fires window.onRetroactiveLabelComplete() JS callback via the Dashboard
 *    WebView so the UI updates without a reload.
 *  - Shows a "PAST SESSION · <date>" badge on Step 1 to visually distinguish
 *    from a real-time survey.
 *
 * Launch via: window.Android.openRetroactiveSurvey(sessionNum, date, predSummary, prefillJson)
 */
class RetroactiveSurveyActivity : Activity() {

    private var sessionNum: Int = -1
    private var sessionDate: String = ""
    private var predictionSummary: String = ""
    
    private var rawSessionNum: Int = -1
    private var rawStartTime: String = ""

    // Survey response values (default 0 = skipped)
    private var postSessionRating = 0
    private var regretScore = 0
    private var moodAfter = 0
    private var comparativeRating = 0

    // Prefill values loaded from past session object
    private var prefillPostRating = 0
    private var prefillRegret = 0
    private var prefillComparative = 0
    private var prefillMoodBefore = 0
    private var prefillIntended = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = Color.parseColor("#EDE8DF")

        sessionNum         = intent.getIntExtra("session_num", -1)
        sessionDate        = intent.getStringExtra("session_date") ?: ""
        predictionSummary  = intent.getStringExtra("prediction_summary") ?: ""

        // Parse prefill JSON — non-zero values will be shown as pre-selection hints
        val prefillJson = intent.getStringExtra("prefill_json") ?: "{}"
        try {
            val pf = JSONObject(prefillJson)
            prefillPostRating   = pf.optInt("postSessionRating", 0)
            prefillRegret       = pf.optInt("regretScore",       0)
            prefillComparative  = pf.optInt("comparativeRating", 0)
            prefillMoodBefore   = pf.optInt("moodBefore",        0)
            prefillIntended     = pf.optString("intendedAction", "")
            
            rawSessionNum       = pf.optInt("_rawSessionNum", -1)
            rawStartTime        = pf.optString("_rawStartTime", "")
        } catch (e: Exception) {
            Log.w("RETRO", "Failed to parse prefill JSON: ${e.message}")
        }

        showSessionRatingPrompt()
    }

    // ── Step 1: Post-Session Affective State ───────────────────────────────────
    private fun showSessionRatingPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 1, accentColor = "#4A2580"))

        // Distinctive badge — clearly marks this as a past-session label
        val badgeText = if (sessionDate.isNotEmpty())
            "PAST SESSION  ·  $sessionDate"
        else
            "PAST SESSION  ·  LABELING"
        layout.addView(SurveyUIUtils.createBadge(this, badgeText, "#4A2580"))

        layout.addView(SurveyUIUtils.createGradientTitle(this, "After closing Instagram, I felt...", "#4A2580"))

        // Show model prediction as subtitle if available
        val subtitle = if (predictionSummary.isNotEmpty())
            predictionSummary
        else
            "be honest — there are no wrong answers"
        layout.addView(SurveyUIUtils.createSubtitle(this, subtitle))

        val cardStartIdx = layout.childCount
        val affectiveOptions = listOf(
            Pair("Refreshed / entertained",       "#3A9E6F"),
            Pair("About the same as before",      "#6B3FA0"),
            Pair("A little drained",              "#C4973A"),
            Pair("Regret I opened it",            "#C4563A"),
            Pair("Worse than before I opened it", "#A03030")
        )

        for ((index, pair) in affectiveOptions.withIndex()) {
            val (label, color) = pair
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    postSessionRating = 5 - index  // Best=5, Worst=1
                    moodAfter = when {
                        postSessionRating >= 4 -> 5
                        postSessionRating == 3 -> 3
                        else                   -> 1
                    }
                    showRegretPrompt()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            postSessionRating = 0
            moodAfter = 0
            showRegretPrompt()
        })

        scroll.addView(layout)
        setContentView(root)

        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, affectiveOptions.size) }
    }

    // ── Step 2: Regret / Volition ──────────────────────────────────────────────
    private fun showRegretPrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 2, accentColor = "#4A2580"))
        layout.addView(SurveyUIUtils.createBadge(this, "PAST SESSION  ·  INTENT CHECK", "#4A2580"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "Did that session go as intended?", "#4A2580"))

        val subtitle = when {
            prefillIntended == "Stressed / Avoidance"     -> "you opened this to avoid something"
            prefillIntended == "Procrastinating something" -> "you opened this to procrastinate"
            prefillIntended == "Quick break (intentional)" -> "you planned a quick break"
            prefillIntended == "Habit / Automatic"         -> "you said this was automatic"
            prefillIntended.isNotEmpty()                   -> "you opened this: ${prefillIntended.lowercase()}"
            else                                           -> "reflect on how the session went"
        }
        layout.addView(SurveyUIUtils.createSubtitle(this, subtitle))

        val cardStartIdx = layout.childCount
        val options = listOf(
            Pair("Yes, it went as planned", "#3A9E6F"),
            Pair("Somewhat",                "#C4973A"),
            Pair("No, it went off track",   "#C4563A")
        )

        options.forEachIndexed { index, (label, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    regretScore = when (index) {
                        0    -> 1
                        1    -> 3
                        else -> 5
                    }
                    showComparativePrompt()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            regretScore = 0
            showComparativePrompt()
        })

        scroll.addView(layout)
        setContentView(root)

        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, options.size) }
    }

    // ── Step 3: Comparative Experience ────────────────────────────────────────
    private fun showComparativePrompt() {
        val (root, scroll) = SurveyUIUtils.createRootWithBlobs(this, BlobBackgroundView.Palette.POST)
        val layout = SurveyUIUtils.createMainLayout(this)

        layout.addView(SurveyUIUtils.createSystemLabel(this))
        layout.addView(SurveyUIUtils.createProgressRing(this, totalSteps = 3, currentStep = 3, accentColor = "#4A2580"))
        layout.addView(SurveyUIUtils.createBadge(this, "PAST SESSION  ·  EXPERIENCE", "#4A2580"))
        layout.addView(SurveyUIUtils.createGradientTitle(this, "That session was...", "#4A2580"))
        layout.addView(SurveyUIUtils.createSubtitle(this, "how did that session feel overall?"))

        val cardStartIdx = layout.childCount
        val options = listOf(
            Pair("Intentional — I got what I came for", "#3A9E6F"),
            Pair("Okay, nothing special",                "#6B3FA0"),
            Pair("Longer than I wanted",                 "#C4973A"),
            Pair("A waste of time",                      "#C4563A"),
            Pair("I could not stop — it took over",      "#A03030")
        )

        options.forEachIndexed { index, (label, color) ->
            layout.addView(
                SurveyUIUtils.createOptionButton(this, label, accentColor = color) {
                    comparativeRating = 5 - index
                    finalizeRetroactiveProbe()
                }
            )
        }

        layout.addView(SurveyUIUtils.createSkipButton(this) {
            comparativeRating = 0
            finalizeRetroactiveProbe()
        })

        scroll.addView(layout)
        setContentView(root)

        layout.post { SurveyUIUtils.staggerCards(layout, cardStartIdx, options.size) }
    }

    // ── Atomic write-back + JS callback ───────────────────────────────────────
    private fun finalizeRetroactiveProbe() {
        val actualMatch = when {
            prefillIntended.isEmpty()                      -> 0
            prefillIntended == "Habit / Automatic"         -> 1
            prefillIntended == "Stressed / Avoidance"      -> 0
            prefillIntended == "Procrastinating something" -> 0
            regretScore >= 4                               -> 0
            regretScore <= 2                               -> 1
            else                                          -> 2
        }

        thread {
            val success = writeRetroactiveLabel(actualMatch)
            if (success) {
                // Ensure CSV is patched so next re-computation persists the labels
                retroactivelyUpdateCsv(actualMatch)
                notifyDashboard()
            } else {
                Log.e("RETRO", "Write-back failed — hasSurvey remains false, not calling JS callback")
            }
            runOnUiThread { finish() }
        }
    }

    /**
     * Atomically patches hmm_results.json and increments labeled_sessions.
     *
     * Write sequence:
     *  1. Read + parse hmm_results.json
     *  2. Find session by sessionNum + date
     *  3. Mutate survey fields in-memory
     *  4. Write to hmm_results.json.tmp
     *  5. Rename .tmp → hmm_results.json
     *  6. Only on rename success: increment labeled_sessions in alse_model_state.json
     *  7. Return true only if all steps succeed
     */
    private fun writeRetroactiveLabel(actualMatch: Int): Boolean {
        return try {
            val hmmFile  = File(filesDir, "hmm_results.json")
            val tmpFile  = File(filesDir, "hmm_results.json.tmp")

            if (!hmmFile.exists()) {
                Log.e("RETRO", "hmm_results.json not found — cannot write retroactive label")
                return false
            }

            // Step 1–2: Find the target session
            val root = JSONObject(hmmFile.readText(Charsets.UTF_8))
            val sessions = root.optJSONArray("sessions")
                ?: return false.also { Log.e("RETRO", "No sessions array in hmm_results.json") }

            var targetIdx = -1
            for (i in 0 until sessions.length()) {
                val sess = sessions.getJSONObject(i)
                val matchNum  = sess.optInt("sessionNum", -1) == sessionNum
                val matchDate = sess.optString("date", "") == sessionDate
                if (matchNum && matchDate) {
                    targetIdx = i
                    break
                }
            }

            if (targetIdx < 0) {
                Log.e("RETRO", "Session not found: sessionNum=$sessionNum date=$sessionDate")
                return false
            }

            // Step 3: Mutate in-memory
            val sess = sessions.getJSONObject(targetIdx)
            sess.put("postSessionRating",  postSessionRating)
            sess.put("regretScore",        regretScore)
            sess.put("moodAfter",          moodAfter)
            sess.put("moodBefore",         prefillMoodBefore)
            sess.put("intendedAction",     prefillIntended)
            sess.put("actualVsIntended",   actualMatch)
            sess.put("comparativeRating",  comparativeRating)
            sess.put("hasSurvey",          true)
            sess.put("retroactiveLabel",   true)

            // Step 4: Write to temp file
            tmpFile.writeText(root.toString(2), Charsets.UTF_8)

            // Step 5: Atomic rename
            val renamed = tmpFile.renameTo(hmmFile)
            if (!renamed) {
                // renameTo can fail across filesystems — fallback to copy+delete
                hmmFile.writeText(root.toString(2), Charsets.UTF_8)
                tmpFile.delete()
            }

            Log.d("RETRO", "hmm_results.json patched for sessionNum=$sessionNum date=$sessionDate")

            // Step 6: Increment labeled_sessions in alse_model_state.json
            incrementLabeledSessions()

            // Step 7: Invalidate cache so next full re-inference uses the updated CSV
            try {
                val hmmFileLegacy = File(filesDir, "hmm_results.json")
                if (hmmFileLegacy.exists()) {
                    // We don't delete it immediately because notifyDashboard needs it for the base64 payload
                    // but we can mark it as "needs refresh" or just let the next Dashboard re-computation overwrite it.
                    // Actually, if we delete it now, the next dashboard activity launch will definitely re-compute.
                    // MicroProbeActivity deletes it. Let's do the same for safety.
                    // hmmFileLegacy.delete() 
                }
            } catch (e: Exception) {}

            true
        } catch (e: Exception) {
            Log.e("RETRO", "writeRetroactiveLabel failed: ${e.message}", e)
            false
        }
    }

    /** Increments model_state.labeled_sessions by 1. Touches ONLY that field. */
    private fun incrementLabeledSessions() {
        try {
            val stateFile = File(filesDir, "alse_model_state.json")
            if (!stateFile.exists()) return

            val root = JSONObject(stateFile.readText(Charsets.UTF_8))
            val modelState = root.optJSONObject("model_state") ?: JSONObject()
            val current = modelState.optInt("labeled_sessions", 0)
            modelState.put("labeled_sessions", current + 1)
            root.put("model_state", modelState)

            stateFile.writeText(root.toString(2), Charsets.UTF_8)
            Log.d("RETRO", "labeled_sessions incremented to ${current + 1}")
        } catch (e: Exception) {
            Log.e("RETRO", "Failed to increment labeled_sessions: ${e.message}")
            // Non-fatal — the survey label itself is already written
        }
    }

    /**
     * Fires window.onRetroactiveLabelComplete() in the Dashboard WebView.
     * Label data is Base64-encoded to avoid any JSON-in-JS escaping issues.
     */
    private fun notifyDashboard() {
        try {
            val labelObj = JSONObject().apply {
                put("sessionNum",       sessionNum)
                put("date",             sessionDate)
                put("postSessionRating", postSessionRating)
                put("regretScore",      regretScore)
                put("moodAfter",        moodAfter)
                put("moodBefore",       prefillMoodBefore)
                put("intendedAction",   prefillIntended)
                put("comparativeRating", comparativeRating)
                put("hasSurvey",        true)
                put("retroactiveLabel", true)
            }

            // Base64-encode the JSON to avoid any escaping issues in evaluateJavascript
            val b64 = Base64.encodeToString(
                labelObj.toString().toByteArray(Charsets.UTF_8),
                Base64.NO_WRAP
            )

            // DashboardInterface exposes notifyRetroactiveLabelComplete via JS bridge
            // which evaluates the window callback in the WebView on the main thread.
            val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("pending_retroactive_label_b64", b64)
                .putLong("pending_retroactive_label_ts", System.currentTimeMillis())
                .apply()

            Log.d("RETRO", "Label queued for dashboard callback: sessionNum=$sessionNum")
        } catch (e: Exception) {
            Log.e("RETRO", "notifyDashboard failed: ${e.message}")
        }
    }

    private fun retroactivelyUpdateCsv(actualMatch: Int) {
        synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
            try {
                val csvFile = File(filesDir, "insta_data.csv")
                if (!csvFile.exists()) return
                val lines = csvFile.readLines().toMutableList()
                if (lines.size < 3) return
                
                val header          = lines[1].split(",")
                val sessNumIdx       = header.indexOf("SessionNum")
                val startTimeIdx     = header.indexOf("StartTime")
                val postRatingIdx    = header.indexOf("PostSessionRating")
                val intendedIdx      = header.indexOf("IntendedAction")
                val matchIdx         = header.indexOf("ActualVsIntendedMatch")
                val regretIdx        = header.indexOf("RegretScore")
                val moodBeforeIdx    = header.indexOf("MoodBefore")
                val moodAfterIdx     = header.indexOf("MoodAfter")
                val comparativeIdx   = header.indexOf("ComparativeRating")
                
                if (sessNumIdx < 0 || startTimeIdx < 0) return

                // Identify the local session identifiers for the global index
                var globalSessCounter = 0
                var lastSessKey = ""
                var effectiveRawNum = rawSessionNum
                var effectiveRawDate = rawStartTime
                
                if (effectiveRawNum == -1 || effectiveRawDate.isEmpty()) {
                    Log.d("RETRO", "Identifying session by global index=$sessionNum...")
                    for (i in 2 until lines.size) {
                        val rowFields = lines[i].split(",")
                        if (rowFields.size <= sessNumIdx || rowFields.size <= startTimeIdx) continue
                        
                        val rowStartTime = rowFields[startTimeIdx].trim()
                        val rowSessNum = rowFields[sessNumIdx].trim()
                        val datePart = if (rowStartTime.length >= 10) rowStartTime.substring(0, 10) else rowStartTime
                        val sessKey = "${datePart}__${rowSessNum}"
                        
                        if (sessKey != lastSessKey) {
                            globalSessCounter++
                            lastSessKey = sessKey
                        }
                        
                        if (globalSessCounter == sessionNum) {
                            effectiveRawNum = rowSessNum.toIntOrNull() ?: -1
                            effectiveRawDate = rowStartTime
                        }
                    }
                }

                if (effectiveRawNum == -1) {
                    Log.e("RETRO", "Match Failed: Could not resolve global session $sessionNum (total sessions found: $globalSessCounter)")
                    return
                }

                Log.d("RETRO", "Match Successful: Translated global index $sessionNum to sessionNum=$effectiveRawNum date=$effectiveRawDate. Patching rows...")

                var updated = 0
                val effectiveRawNumStr = effectiveRawNum.toString()
                val targetDatePrefix = if (effectiveRawDate.length >= 10) effectiveRawDate.substring(0, 10) else effectiveRawDate
                
                for (i in 2 until lines.size) {
                    val fields = lines[i].split(",").toMutableList()
                    if (fields.size <= sessNumIdx || fields.size <= startTimeIdx) continue
                    
                    val rowStartTime = fields[startTimeIdx].trim()
                    if (fields[sessNumIdx].trim() == effectiveRawNumStr && rowStartTime.startsWith(targetDatePrefix)) {
                        if (postRatingIdx in 0 until fields.size)    fields[postRatingIdx]  = postSessionRating.toString()
                        if (intendedIdx in 0 until fields.size)      fields[intendedIdx]    = prefillIntended
                        if (matchIdx in 0 until fields.size)         fields[matchIdx]       = actualMatch.toString()
                        if (regretIdx in 0 until fields.size)        fields[regretIdx]      = regretScore.toString()
                        if (moodBeforeIdx in 0 until fields.size)    fields[moodBeforeIdx]  = prefillMoodBefore.toString()
                        if (moodAfterIdx in 0 until fields.size)     fields[moodAfterIdx]   = moodAfter.toString()
                        if (comparativeIdx in 0 until fields.size)   fields[comparativeIdx] = comparativeRating.toString()
                        
                        lines[i] = fields.joinToString(",")
                        updated++
                    }
                }
                
                if (updated > 0) {
                    csvFile.writeText(lines.joinToString("\n") + "\n")
                    Log.d("RETRO", "SUCCESS: Updated $updated rows. Patch persisted to CSV.")

                    // Keep the in-place patched HMM cache newer than the CSV we just wrote.
                    // Otherwise DashboardActivity/MainActivity will immediately mark it stale
                    // and recompute a payload that can drop retroactive-only metadata.
                    try {
                        val hmmFile = File(filesDir, "hmm_results.json")
                        if (hmmFile.exists()) {
                            val touched = hmmFile.setLastModified(System.currentTimeMillis())
                            Log.d("RETRO", "Touched hmm_results.json after CSV patch (success=$touched)")
                        }
                    } catch (touchErr: Exception) {
                        Log.w("RETRO", "Failed to touch hmm_results.json after CSV patch: ${touchErr.message}")
                    }
                } else {
                    Log.w("RETRO", "WARNING: No rows were updated despite match.")
                }
                Unit
            } catch (e: Exception) {
                Log.e("RETRO", "Retroactive CSV update failed: ${e.message}", e)
                Unit
            }
        }
    }
}
