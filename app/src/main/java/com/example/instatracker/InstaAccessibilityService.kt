package com.example.instatracker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.ArrayDeque
import java.util.Calendar
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.BatteryManager
import android.media.AudioManager
import android.media.AudioDeviceInfo
import android.app.usage.UsageStatsManager
import android.app.usage.UsageEvents
import android.content.res.Configuration
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.example.instatracker.db.AppDatabase
import com.example.instatracker.db.SessionEntity

class InstaAccessibilityService : AccessibilityService(), SensorEventListener {

    private var currentSessionNumber = 0
    private var sessionStartTime: Long? = null
    private var lastActiveTime = 0L
    private var lastExitTime = 0L
    
    // Reel Extracted Variables
    private var reelCount = 0
    private var cumulativeReels = 0
    private var lastReelStartTime = 0L
    private var lastReelDebounceTime = 0L
    private var continuousScrollCount = 0
    
    // Layer 1
    private var scrollDistances = mutableListOf<Float>()
    private var lastScrollTime = 0L
    private var lastScrollY = -1
    private var scrollDirection = 1
    private var backScrollCount = 0
    
    private var liked = false
    private var commented = false
    private var shared = false
    private var saved = false
    
    private var scrollPauseCount = 0
    private var scrollPauseDurationMs = 0L
    private var lastScrollSpeed = 0f
    private var swipeCompletionRatio = 1.0f
    private var swipeAttempts = 0
    private var cleanSwipes = 0
    
    private var likeLatencyMs = -1L
    private var commentLatencyMs = -1L
    private var shareLatencyMs = -1L
    private var saveLatencyMs = -1L
    
    private var hasCaption = false
    private var captionExpanded = false
    private var hasAudio = false
    private var isAd = false
    private var adSkipLatencyMs = -1L
    
    private var appExitAttempts = 0
    private var returnLatencyS = 0L
    private var profileVisits = 0
    private var profileVisitDurationS = 0f
    private var hashtagTaps = 0
    private var notificationsDismissed = 0
    private var notificationsActedOn = 0
    
    // Layer 2
    private lateinit var sensorManager: SensorManager
    private var accelSensor: Sensor? = null
    private var lightSensor: Sensor? = null
    
    private var accelMagnitudes = mutableListOf<Float>()
    private var ambientLuxStart = -1f
    private var ambientLuxEnd = -1f
    private var isScreenInDarkRoom = false
    
    private var postureShiftCount = 0
    private var deviceOrientation = 1 // 1=Portrait, 2=Landscape
    private var lastGravityX = 0f
    private var lastGravityY = 0f
    
    private var batteryLevelStart = -1
    private var batteryLevelEnd = -1
    private var isChargingStart = false
    private var headphonesConnected = false
    private var audioOutputType = "SPEAKER"
    
    private var previousApp = "unknown"
    private var previousAppCategory = "unknown"
    private var previousAppDurationS = 0f
    private var directLaunch = false
    private var timeSinceLastSessionMin = 0
    private var dayOfWeek = 0
    private var isHoliday = false
    
    private var screenOnCount1hr = 0
    private var screenOnDuration1hr = 0L
    
    private var sessionTriggeredByNotif = false
    
    private var nightModeActive = false
    private var dndActive = false
    
    // Layer 4 & 5 Arrays
    private var sessionDwellTimes = mutableListOf<Double>()
    private var sessionScrollIntervals = mutableListOf<Long>()
    private var likeStreakLength = 0
    private var maxLikeStreakLength = 0
    private var halfSessionInteractions = mutableListOf<Int>() // 0 for first half, 1 for second half
    private var savedWithoutLike = false
    private var commentAbandoned = false
    
    private var scrollBurstStartTime = 0L
    private var scrollBurstDuration = 0L
    private var interBurstRestDuration = 0L
    private var lastScrollBurstTime = 0L
    
    private var uniqueAudioTracks = mutableSetOf<String>()
    
    // Layer 5 memory var
    private var sessionsToday = 0
    private var totalDwellTodayMin = 0f
    private var longestSessionTodayReels = 0
    private var doomStreakLength = 0
    private var morningSessionExists = false
    // Layer 6: Circadian & Physiological Proxies
    private var circadianPhase = 0f
    private var sleepProxyScore = 0f
    private var estimatedSleepDurationH = 0f
    private var consistencyScore = 0f
    private var isWeekend = false
    
    // Layer 8: Micro-Probes (Results placeholder for CSV)
    private var microprobeResults = listOf(0, "", 0, 0, 0, 0, 0)

    // Rolling
    private val dwellWindow = ArrayDeque<Double>()
    
    companion object {
        private const val WINDOW_SIZE = 5
        private const val PREFS_NAME = "InstaTrackerPrefs"
        private const val KEY_SESSION_NUM = "session_number"
        private const val CSV_HEADER = "SCHEMA_VERSION=4\nSessionNum,ReelIndex,StartTime,EndTime,DwellTime,TimePeriod," +
            "AvgScrollSpeed,MaxScrollSpeed,RollingMean,RollingStd,CumulativeReels," +
            "ScrollStreak,Liked,Commented,Shared,Saved," +
            "LikeLatency,CommentLatency,ShareLatency,SaveLatency,InteractionDwellRatio," +
            "ScrollDirection,BackScrollCount,ScrollPauseCount,ScrollPauseDurationMs,SwipeCompletionRatio," +
            "HasCaption,CaptionExpanded,HasAudio,IsAd,AdSkipLatencyMs," +
            "AppExitAttempts,ReturnLatencyS," +
            "NotificationsDismissed,NotificationsActedOn,ProfileVisits,ProfileVisitDurationS," +
            "HashtagTaps," +
            "AmbientLuxStart,AmbientLuxEnd,LuxDelta,IsScreenInDarkRoom," +
            "AccelVariance,MicroMovementRms,PostureShiftCount,IsStationary,DeviceOrientation," +
            "BatteryStart,BatteryDeltaPerSession,IsCharging," +
            "Headphones,AudioOutputType," +
            "PreviousApp,PreviousAppDurationS,PreviousAppCategory,DirectLaunch," +
            "TimeSinceLastSessionMin,DayOfWeek,IsHoliday," +
            "ScreenOnCount1hr,ScreenOnDuration1hr,NightMode,DND," +
            "SessionTriggeredByNotif," +
            "DwellTimeZscore,DwellTimePctile,DwellAcceleration,SessionDwellTrend,EarlyVsLateRatio," +
            "InteractionRate,InteractionBurstiness,LikeStreakLength,InteractionDropoff,SavedWithoutLike,CommentAbandoned," +
            "ScrollIntervalCV,ScrollBurstDuration,InterBurstRestDuration,ScrollRhythmEntropy," +
            "UniqueAudioCount,RepeatContentFlag,ContentRepeatRate," +
            "CircadianPhase,SleepProxyScore,EstimatedSleepDurationH,ConsistencyScore,IsWeekend," +
            "PostSessionRating,IntendedAction,ActualVsIntendedMatch,RegretScore,MoodBefore,MoodAfter,MoodDelta\n"
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val CHANNEL_ID = "survey_channel"

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_SCROLLED or AccessibilityEvent.TYPE_VIEW_CLICKED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        serviceInfo = info
        lastActiveTime = System.currentTimeMillis()
        
        createNotificationChannel()
        ensureCsvHeader()
        
        // Force HMM cold start on next initialization because prior model arrays were corrupted
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val stateWiped = prefs.getBoolean("alse_state_wiped_v3", false)
            
            if (!stateWiped) {
                val stateFile = File(filesDir, "alse_model_state.json")
                if (stateFile.exists()) {
                    stateFile.delete()
                    android.util.Log.d("InstaTracker", "Deleted corrupted alse_model_state.json")
                }
                prefs.edit().putBoolean("alse_state_wiped_v3", true).apply()
            }
        } catch (e: Exception) {
            android.util.Log.e("InstaTracker", "Failed to delete old model state", e)
        }
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event == null) return
            val now = System.currentTimeMillis()
            val packageName = event.packageName?.toString() ?: ""
        
        if (packageName != "com.instagram.android") {
            if (sessionStartTime != null) {
                if (lastExitTime == 0L) lastExitTime = now // Register exit attempt
                checkSessionTimeout(now, packageName)
            }
            return
        } else {
            // Re-entered Instagram
            if (lastExitTime != 0L) {
                val exitDuration = now - lastExitTime
                if (exitDuration < 20_000L) {
                    appExitAttempts++ // Increment if user returned quickly
                }
                lastExitTime = 0L
            }
        }

        if (sessionStartTime == null) startNewSession(now)

        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val desc = event.contentDescription?.toString()?.lowercase() ?: ""
            val text = event.text?.joinToString(" ")?.lowercase() ?: ""
            val latency = now - lastReelStartTime
            
            if (desc.contains("like") || text.contains("like")) {
                liked = true
                if (likeLatencyMs == -1L) likeLatencyMs = latency
                likeStreakLength++
                if (likeStreakLength > maxLikeStreakLength) maxLikeStreakLength = likeStreakLength
                halfSessionInteractions.add(reelCount)
            }
            if (desc.contains("reply") || desc.contains("comment") || text.contains("reply")) {
                commented = true
                if (commentLatencyMs == -1L) commentLatencyMs = latency
                commentAbandoned = true // Default to true, would clear if post completes (complex to track, assume proxy)
                halfSessionInteractions.add(reelCount)
            }
            if (desc.contains("share") || desc.contains("send") || text.contains("share")) {
                shared = true
                if (shareLatencyMs == -1L) shareLatencyMs = latency
                halfSessionInteractions.add(reelCount)
            }
            if (desc.contains("save") || desc.contains("bookmark") || text.contains("save")) {
                saved = true
                if (saveLatencyMs == -1L) saveLatencyMs = latency
            }
            if (text == "more" || desc.contains("expand")) {
                captionExpanded = true
            }
            if (desc.contains("profile") || text.contains("profile")) {
                profileVisits++
            }
            if (text.startsWith("#") || desc.startsWith("#")) {
                hashtagTaps++
            }
            
            resetSessionTimer(now)
            return
        }

        if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
             swipeAttempts++
             val fromIdx = event.fromIndex
             if (fromIdx > -1) {
                 if (lastScrollY != -1) {
                     if (fromIdx < lastScrollY) {
                         scrollDirection = -1
                         backScrollCount++
                     } else if (fromIdx > lastScrollY) {
                         scrollDirection = 1
                     }
                 }
                 lastScrollY = fromIdx
             }
             
             if (lastScrollTime != 0L) {
                 val timeDelta = now - lastScrollTime
                 sessionScrollIntervals.add(timeDelta)
                 
                 // Burst tracking
                 if (timeDelta < 400L) { // Rapid consecutive swipes
                     if (scrollBurstStartTime == 0L) {
                         scrollBurstStartTime = lastScrollTime
                         if (lastScrollBurstTime > 0L) interBurstRestDuration = scrollBurstStartTime - lastScrollBurstTime
                     }
                     scrollBurstDuration = now - scrollBurstStartTime
                 } else {
                     if (scrollBurstStartTime > 0L) {
                         lastScrollBurstTime = now
                         scrollBurstStartTime = 0L
                     }
                 }
                 
                 if (timeDelta in 1..499) {
                     val speed = 1000f / timeDelta
                     scrollDistances.add(speed)
                     cleanSwipes++
                     
                     if (lastScrollSpeed > 0 && speed < lastScrollSpeed * 0.2f) { // Pause detected
                         scrollPauseCount++
                         scrollPauseDurationMs += timeDelta
                     }
                     lastScrollSpeed = speed
                 }
             }
             lastScrollTime = now
             resetSessionTimer(now)
        }

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED || event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            traverseNode(event.source)
            if (now - lastReelDebounceTime > 800) {
                if (lastReelStartTime != 0L) processPreviousReel(now)
                startNextReel(now)
            }
        }
        } catch (e: Exception) {
            android.util.Log.e("InstaTracker", "Handled exception in accessibility loop: ${e.localizedMessage}")
        }
    }
    
    private fun traverseNode(node: AccessibilityNodeInfo?) {
        if (node == null) return
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        
        if (text.contains("sponsored") || desc.contains("sponsored")) isAd = true
        if (text.isNotEmpty() && text.length > 25) hasCaption = true
        if (desc.contains("audio") || desc.contains("sound") || desc.contains("music")) {
            hasAudio = true
            uniqueAudioTracks.add(desc) // Use description as proxy for track identity
        }
        
        for (i in 0 until node.childCount) {
            traverseNode(node.getChild(i))
        }
    }

    private fun startNextReel(now: Long) {
        reelCount++
        cumulativeReels++
        
        lastReelDebounceTime = now
        lastReelStartTime = now
        
        scrollDistances.clear()
        accelMagnitudes.clear()
        
        liked = false
        commented = false
        shared = false
        saved = false
        
        likeLatencyMs = -1L
        commentLatencyMs = -1L
        shareLatencyMs = -1L
        saveLatencyMs = -1L
        scrollDirection = 1
        
        hasCaption = false
        captionExpanded = false
        hasAudio = false
        isAd = false
        adSkipLatencyMs = -1L
        
        scrollPauseCount = 0
        scrollPauseDurationMs = 0L
        lastScrollSpeed = 0f
        swipeAttempts = 0
        cleanSwipes = 0
        profileVisits = 0
        hashtagTaps = 0
        
        if (!liked) likeStreakLength = 0
        savedWithoutLike = false
        commentAbandoned = false
    }

    private fun processPreviousReel(now: Long) {
        val dwellMs = now - lastReelStartTime
        val dwellSec = dwellMs / 1000.0
        
        if (dwellSec < 5.0) continuousScrollCount++ else continuousScrollCount = 0
        
        if (isAd && adSkipLatencyMs == -1L) adSkipLatencyMs = dwellMs
        
        val interactionDwellRatio = if (likeLatencyMs > 0 && dwellMs > 0) likeLatencyMs.toFloat() / dwellMs.toFloat() else 0f
        swipeCompletionRatio = if (swipeAttempts > 0) cleanSwipes.toFloat() / swipeAttempts.toFloat() else 1.0f
        
        savedWithoutLike = saved && !liked
        
        // Start computing Layer 4 Derived Features
        sessionDwellTimes.add(dwellSec)
        val sessionDwellMean = sessionDwellTimes.average()
        val sessionDwellVar = sessionDwellTimes.map { (it - sessionDwellMean) * (it - sessionDwellMean) }.average()
        val sessionDwellStd = sqrt(sessionDwellVar).takeIf { it > 0 } ?: 1.0
        val dwellZScore = (dwellSec - sessionDwellMean) / sessionDwellStd
        
        val sortedDwells = sessionDwellTimes.sorted()
        val dwellPctile = (sortedDwells.indexOf(dwellSec).toDouble() / sessionDwellTimes.size.coerceAtLeast(1)) * 100.0
        
        val dwellAccel = if (sessionDwellTimes.size > 1) dwellSec - sessionDwellTimes[sessionDwellTimes.size - 2] else 0.0
        
        // Linear regression slope of dwell over session
        var sessionDwellTrend = 0.0
        if (sessionDwellTimes.size > 1) {
            val n = sessionDwellTimes.size
            val sumX = (0 until n).sum()
            val sumY = sessionDwellTimes.sum()
            val sumXY = sessionDwellTimes.mapIndexed { i, v -> i * v }.sum()
            val sumXX = (0 until n).map { it * it }.sum()
            val slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX).coerceAtLeast(1)
            sessionDwellTrend = slope
        }
        
        val halfSize = sessionDwellTimes.size / 2
        val earlyVsLateRatio = if (halfSize > 0) {
            sessionDwellTimes.take(halfSize).average() / sessionDwellTimes.takeLast(halfSize).average().coerceAtLeast(0.1)
        } else 1.0
        
        val interactionRate = halfSessionInteractions.size.toFloat() / sessionDwellTimes.size.coerceAtLeast(1)
        
        // Variance of interaction indexes = proxy for burstiness
        val interactionBurstiness = if (halfSessionInteractions.size > 1) {
            val mean = halfSessionInteractions.average()
            halfSessionInteractions.map { (it - mean)*(it - mean) }.average()
        } else 0.0
        
        val interactionDropoff = if (halfSessionInteractions.isNotEmpty()) {
            val threshold = sessionDwellTimes.size / 2
            val early = halfSessionInteractions.count { it < threshold }
            val late = halfSessionInteractions.count { it >= threshold }
            if (early > 0) late.toFloat() / early.toFloat() else 1f
        } else 0f
        
        val scrollIntervalCV = if (sessionScrollIntervals.size > 1) {
            val mean = sessionScrollIntervals.average()
            val variance = sessionScrollIntervals.map { (it - mean)*(it - mean) }.average()
            if (mean > 0) sqrt(variance) / mean else 0.0
        } else 0.0
        
        // Calculate Shannon Entropy of scroll intervals by bucketing into 200ms bins
        var scrollRhythmEntropy = 0.0
        if (sessionScrollIntervals.isNotEmpty()) {
            val bins = sessionScrollIntervals.map { it / 200 }.groupBy { it }.mapValues { it.value.size }
            val total = sessionScrollIntervals.size.toDouble()
            scrollRhythmEntropy = -bins.values.sumOf { (it / total) * kotlin.math.log2(it / total) }
        }
        
        dwellWindow.addLast(dwellSec)
        if (dwellWindow.size > WINDOW_SIZE) dwellWindow.removeFirst()
        val rollingMean = dwellWindow.average()
        val variance = if (dwellWindow.isNotEmpty()) dwellWindow.map { (it - rollingMean) * (it - rollingMean) }.average() else 0.0
        val rollingStd = sqrt(variance)

        val avgSpeed = if (scrollDistances.isNotEmpty()) scrollDistances.average() else 0.0
        val maxSpeed = if (scrollDistances.isNotEmpty()) scrollDistances.maxOrNull()?.toDouble() ?: 0.0 else 0.0

        val accVar = calculateVariance(accelMagnitudes)
        val isStationary = if (accVar < 0.2f && accelMagnitudes.isNotEmpty()) 1 else 0

        val formStart = dateFormat.format(Date(lastReelStartTime))
        val formEnd = timeFormat.format(Date(now))
        
        val luxDelta = if (ambientLuxStart != -1f && ambientLuxEnd != -1f) ambientLuxEnd - ambientLuxStart else 0f
        val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        batteryLevelEnd = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val batteryDelta = if (batteryLevelStart != -1 && batteryLevelEnd != -1) batteryLevelStart - batteryLevelEnd else 0

            val line = listOf(
            currentSessionNumber, reelCount, formStart, formEnd,
            String.format("%.2f", dwellSec), getTimePeriod(),
            String.format("%.2f", avgSpeed), String.format("%.2f", maxSpeed),
            String.format("%.2f", rollingMean), String.format("%.2f", rollingStd),
            cumulativeReels, continuousScrollCount,
            if (liked) 1 else 0, if (commented) 1 else 0, if (shared) 1 else 0, if (saved) 1 else 0,
            likeLatencyMs, commentLatencyMs, shareLatencyMs, saveLatencyMs, String.format("%.4f", interactionDwellRatio),
            scrollDirection, backScrollCount, scrollPauseCount, scrollPauseDurationMs, String.format("%.2f", swipeCompletionRatio),
            if (hasCaption) 1 else 0, if (captionExpanded) 1 else 0, if (hasAudio) 1 else 0, if (isAd) 1 else 0, adSkipLatencyMs,
            appExitAttempts, returnLatencyS,
            notificationsDismissed, notificationsActedOn, profileVisits, String.format("%.2f", profileVisitDurationS),
            hashtagTaps,
            String.format("%.1f", ambientLuxStart), String.format("%.1f", ambientLuxEnd), String.format("%.1f", luxDelta), if (isScreenInDarkRoom) 1 else 0,
            String.format("%.4f", accVar), 0f, postureShiftCount, isStationary, deviceOrientation, // micro movement pending in next phase
            batteryLevelStart, batteryDelta, if (isChargingStart) 1 else 0,
            if (headphonesConnected) 1 else 0, audioOutputType,
            previousApp, String.format("%.2f", previousAppDurationS), previousAppCategory, if (directLaunch) 1 else 0,
            timeSinceLastSessionMin, dayOfWeek, if (isHoliday) 1 else 0,
            screenOnCount1hr, screenOnDuration1hr, if (nightModeActive) 1 else 0, if (dndActive) 1 else 0,
            if (sessionTriggeredByNotif) 1 else 0,
            String.format("%.2f", dwellZScore), String.format("%.2f", dwellPctile), String.format("%.2f", dwellAccel), String.format("%.4f", sessionDwellTrend), String.format("%.2f", earlyVsLateRatio),
            String.format("%.2f", interactionRate), String.format("%.2f", interactionBurstiness), maxLikeStreakLength, String.format("%.2f", interactionDropoff), if (savedWithoutLike) 1 else 0, if (commentAbandoned) 1 else 0,
            String.format("%.4f", scrollIntervalCV), scrollBurstDuration, interBurstRestDuration, String.format("%.4f", scrollRhythmEntropy),
            uniqueAudioTracks.size, 0, 0f, // Repeat content placeholders
            String.format("%.4f", circadianPhase), String.format("%.2f", sleepProxyScore), String.format("%.1f", estimatedSleepDurationH), String.format("%.2f", consistencyScore), if (isWeekend) 1 else 0,
            microprobeResults.joinToString(",")
        ).joinToString(",")
        
        appendToCsv(line)
        backScrollCount = 0
        ambientLuxStart = ambientLuxEnd // Carry over lux to next reel
        appExitAttempts = 0 // Reset for next reel
    }
    
    private fun calculateVariance(mags: List<Float>): Float {
        if (mags.isEmpty()) return 0f
        val mean = mags.average().toFloat()
        var v = 0f
        for (m in mags) { v += (m - mean) * (m - mean) }
        return v / mags.size
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val gx = event.values[0]
            val gy = event.values[1]
            val gz = event.values[2]
            val mag = sqrt(gx*gx + gy*gy + gz*gz)
            accelMagnitudes.add(mag)
            
            // Check orientation
            deviceOrientation = if (abs(gx) > abs(gy)) 2 else 1
            
            // Check posture shift
            if (lastGravityX != 0f && lastGravityY != 0f) {
                val shift = sqrt((gx - lastGravityX)*(gx - lastGravityX) + (gy - lastGravityY)*(gy - lastGravityY))
                if (shift > 3.0f) {
                    postureShiftCount++
                }
            }
            lastGravityX = gx
            lastGravityY = gy
            
        } else if (event.sensor.type == Sensor.TYPE_LIGHT) {
            val lux = event.values[0]
            if (ambientLuxStart == -1f) ambientLuxStart = lux
            ambientLuxEnd = lux
            
            if (lux < 10f) isScreenInDarkRoom = true
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun startNewSession(now: Long) {
        sessionStartTime = now
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // --- Layer 8: Micro-Probes Data Extraction ---
        val rawProbe = prefs.getString("last_microprobe_result", "0,,0,0,0,0,0") ?: "0,,0,0,0,0,0"
        val splitProbe = rawProbe.split(",")
        if (splitProbe.size == 7) {
            val rating = splitProbe[0].toIntOrNull() ?: 0
            val action = splitProbe[1]
            val match = splitProbe[2].toIntOrNull() ?: 0
            val regret = splitProbe[3].toIntOrNull() ?: 0
            val mBefore = splitProbe[4].toIntOrNull() ?: 0
            val mAfter = splitProbe[5].toIntOrNull() ?: 0
            val mDelta = splitProbe[6].toIntOrNull() ?: 0
            microprobeResults = listOf(rating, action, match, regret, mBefore, mAfter, mDelta)
            // Clear it out for next session
            prefs.edit().remove("last_microprobe_result").apply()
        } else {
            microprobeResults = listOf(0, "unknown", 0, 0, 0, 0, 0)
        }
        // ---------------------------------------------
        
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(now))
        val lastDate = prefs.getString("last_session_date", "")
        val lastSessionEnd = prefs.getLong("last_session_end", 0L)
        
        sessionsToday = prefs.getInt("sessions_today", 0)
        totalDwellTodayMin = prefs.getFloat("total_dwell_today", 0f)
        longestSessionTodayReels = prefs.getInt("longest_session_today", 0)
        doomStreakLength = prefs.getInt("doom_streak_length", 0)
        morningSessionExists = prefs.getBoolean("morning_session_exists", false)
        
        if (today != lastDate) {
            sessionsToday = 0
            totalDwellTodayMin = 0f
            longestSessionTodayReels = 0
            morningSessionExists = false
        }
        
        val cal = Calendar.getInstance()
        cal.timeInMillis = now
        dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        // Simple heuristic - can be fleshed out with actual holiday APIs later
        isHoliday = (dayOfWeek == Calendar.SUNDAY)
        isWeekend = (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY)
        
        // Circadian Phase: [0.0 to 1.0] from midnight to midnight
        val hr = cal.get(Calendar.HOUR_OF_DAY)
        val mn = cal.get(Calendar.MINUTE)
        circadianPhase = (hr * 60 + mn) / (24 * 60f)
        
        // Track first session time for consistency and sleep proxy
        val firstSessionStr = prefs.getString("first_session_times", "") ?: ""
        var firstSessionTimes = firstSessionStr.split(",").filter { it.isNotEmpty() }.map { it.toInt() }.toMutableList()
        
        if (today != lastDate) {
            sessionsToday = 0
            totalDwellTodayMin = 0f
            longestSessionTodayReels = 0
            morningSessionExists = false
            
            // Calculate sleep proxy using user-defined heuristic
            val sleepStart = prefs.getInt("sleep_start_hour", 23)
            val sleepEnd = prefs.getInt("sleep_end_hour", 7)
            
            val phaseStart = sleepStart / 24f
            val phaseEnd = sleepEnd / 24f
            
            val isSleeping = if (sleepStart > sleepEnd) {
                circadianPhase >= phaseStart || circadianPhase <= phaseEnd
            } else {
                circadianPhase >= phaseStart && circadianPhase <= phaseEnd
            }
            
            if (isSleeping) {
                sleepProxyScore = 0.0f
            } else {
                sleepProxyScore = 1.0f
            }
            
            // Log this time of day for consistency score
            firstSessionTimes.add(hr * 60 + mn)
            if (firstSessionTimes.size > 7) firstSessionTimes.removeAt(0)
            prefs.edit().putString("first_session_times", firstSessionTimes.joinToString(",")).apply()
        }
        
        // Calculate Consistency Score: Variance of first session times across last N days
        if (firstSessionTimes.size > 1) {
            val mean = firstSessionTimes.average()
            val vr = firstSessionTimes.map { (it - mean)*(it - mean) }.average()
            consistencyScore = (1.0 / (1.0 + sqrt(vr))).toFloat() // normalized 0-1, 1 is highly consistent (low variance)
        } else {
            consistencyScore = 1.0f
        }
        
        sessionsToday++
        
        if (lastSessionEnd > 0L) {
            timeSinceLastSessionMin = ((now - lastSessionEnd) / (1000 * 60)).toInt()
        } else {
            timeSinceLastSessionMin = -1
        }
        
        // --- Layer 8: Trigger Probabilistic Paired Surveys ---
        val surveyProb = prefs.getFloat("survey_probability", 0.30f)
        val isSurveySession = Math.random() < surveyProb
        prefs.edit()
            .putBoolean("is_survey_session", isSurveySession)
            // Zero-out all survey variables at start so dismissals default to 0 cleanly
            .putInt("current_mood_before", 0)
            .putString("current_intended_action", "")
            .putInt("probe_post_rating", 0)
            .putInt("probe_regret_score", 0)
            .putInt("probe_mood_after", 0)
            .putInt("probe_mood_delta", 0)
            .putInt("probe_actual_vs_intended", 0)
            .apply()
            
        if (isSurveySession) {
            showIntentionPrompt()
        }
        // -----------------------------------------------------
        
        currentSessionNumber = if (today != lastDate) 1 else prefs.getInt(KEY_SESSION_NUM, 0) + 1
        prefs.edit().putInt(KEY_SESSION_NUM, currentSessionNumber).putString("last_session_date", today).apply()
        
        cumulativeReels = 0
        reelCount = 0
        continuousScrollCount = 0
        appExitAttempts = 0
        lastExitTime = 0L
        dwellWindow.clear()
        
        accelSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        lightSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        
        captureSystemContext()
        
        lastActiveTime = now
        lastReelDebounceTime = now
    }
    
    private fun captureSystemContext() {
        val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        batteryLevelStart = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        isChargingStart = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        headphonesConnected = false
        audioOutputType = "SPEAKER"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            for (device in devices) {
                if (device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET) {
                    headphonesConnected = true
                    audioOutputType = "WIRED"
                    break
                } else if (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || device.type == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                    headphonesConnected = true
                    audioOutputType = "BLUETOOTH"
                    break
                }
            }
        }
        
        val currentNightMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        nightModeActive = currentNightMode == Configuration.UI_MODE_NIGHT_YES
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        dndActive = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            notificationManager.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL
        } else false
        
        // Capture Previous App Logic
        previousApp = "unknown"
        previousAppCategory = "unknown"
        previousAppDurationS = 0f
        directLaunch = false
        screenOnCount1hr = 0
        screenOnDuration1hr = 0L
        
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager?
        if (usm != null) {
            val time = System.currentTimeMillis()
            val events = usm.queryEvents(time - 1000 * 60 * 60, time) // last 1 hour
            val event = UsageEvents.Event()
            
            var lastResumed = 0L
            var lastScreenOn = 0L
            
            val pkgDurations = mutableMapOf<String, Long>()
            var currentForegroundApp: String? = null
            var currentForegroundStart = 0L
            
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val pkg = event.packageName
                
                when (event.eventType) {
                    UsageEvents.Event.ACTIVITY_RESUMED -> {
                        if (pkg != "com.instagram.android" && pkg != packageName) {
                            if (event.timeStamp > lastResumed) {
                                lastResumed = event.timeStamp
                                previousApp = pkg
                            }
                        }
                        currentForegroundApp = pkg
                        currentForegroundStart = event.timeStamp
                    }
                    UsageEvents.Event.ACTIVITY_PAUSED -> {
                        if (currentForegroundApp == pkg) {
                            val dur = event.timeStamp - currentForegroundStart
                            pkgDurations[pkg] = (pkgDurations[pkg] ?: 0L) + dur
                        }
                    }
                    UsageEvents.Event.SCREEN_INTERACTIVE -> {
                        screenOnCount1hr++
                        lastScreenOn = event.timeStamp
                    }
                    UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
                        if (lastScreenOn > 0L) {
                            screenOnDuration1hr += (event.timeStamp - lastScreenOn)
                        }
                    }
                }
            }
            
            if (previousApp != "unknown" && pkgDurations.containsKey(previousApp)) {
                previousAppDurationS = (pkgDurations[previousApp] ?: 0L) / 1000f
            }
            if (previousApp == "com.android.launcher" || previousApp.contains("launcher")) {
                directLaunch = true
            }
            
            previousAppCategory = when {
                previousApp.contains("whatsapp") || previousApp.contains("messenger") -> "communication"
                previousApp.contains("youtube") || previousApp.contains("netflix") -> "entertainment"
                previousApp.contains("gmail") || previousApp.contains("mail") || previousApp.contains("docs") -> "productivity"
                previousApp.contains("facebook") || previousApp.contains("twitter") || previousApp.contains("tiktok") -> "social"
                else -> "other"
            }
        }
    }

    private fun resetSessionTimer(now: Long) {
        lastActiveTime = now
    }

    private fun checkSessionTimeout(now: Long, packageName: String) {
        if (sessionStartTime == null) return
        val idleTime = now - lastActiveTime
        if (packageName == "com.instagram.android") {
            if (idleTime > 300_000L) endCurrentSession(now)
        } else {
            if (idleTime > 20_000L) endCurrentSession(lastActiveTime)
        }
    }

    private fun endCurrentSession(endTime: Long) {
        try {
            if (sessionStartTime == null) return
            if (lastReelStartTime != 0L && endTime > lastReelStartTime) processPreviousReel(endTime)
            
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            // --- Layer 8: Trigger Post-Session MicroProbe ---
            if (prefs.getBoolean("is_survey_session", false)) {
                showSurveyPrompt()
            }
            // ------------------------------------------------
            
            sensorManager.unregisterListener(this)
            
            val dwellMin = ((endTime - (sessionStartTime ?: endTime)) / 60000f).toFloat()
            totalDwellTodayMin += dwellMin
            if (reelCount > longestSessionTodayReels) longestSessionTodayReels = reelCount
            if (getTimePeriod() == "Morning") morningSessionExists = true
            
            prefs.edit()
                .putLong("last_session_end", endTime)
                .putInt("sessions_today", sessionsToday)
                .putFloat("total_dwell_today", totalDwellTodayMin)
                .putInt("longest_session_today", longestSessionTodayReels)
                .putBoolean("morning_session_exists", morningSessionExists)
                .apply()
                
            injectSessionToDatabase(sessionStartTime!!, endTime)
            
            sessionStartTime = null
            reelCount = 0
            dwellWindow.clear()
            
            lastReelStartTime = 0L // prevent triggering after timeout
        } catch (e: Exception) {
            android.util.Log.e("InstaTracker", "Exception in endCurrentSession", e)
        }
    }
    
    private fun injectSessionToDatabase(startTime: Long, endTime: Long) {
        val sTime = startTime
        val eTime = endTime
        val durSec = ((eTime - sTime) / 1000).toLong()
        val timeCat = getTimePeriod()
        val isLate = nightModeActive
        val tScrolls = scrollDistances.size
        val mReelSt = longestSessionTodayReels
        val rCount = reelCount
        val mInterval = sessionScrollIntervals.average().toFloat().takeIf { !it.isNaN() } ?: 0f
        val peakAccel = accelMagnitudes.maxOrNull() ?: 0f
        val maxBurst = scrollBurstDuration.toFloat()
        
        val sToday = sessionsToday
        val totDwell = totalDwellTodayMin
        val doomSt = doomStreakLength
        val mSession = morningSessionExists
        
        val cPhase = circadianPhase
        val sProxy = sleepProxyScore
        val constSc = consistencyScore
        
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val rat = prefs.getInt("probe_post_rating", 0)
        val act = prefs.getString("current_intended_action", "") ?: ""
        
        // Dummy check for actual vs intended match
        val calculatedMatch = if (act == "Killing Time") 1 else 0
        prefs.edit().putInt("probe_actual_vs_intended", calculatedMatch).apply()
        val mat = calculatedMatch == 1
        val reg = prefs.getInt("probe_regret_score", 0)
        val mBf = prefs.getInt("current_mood_before", 0)
        val mAf = prefs.getInt("probe_mood_after", 0)
        
        // Explicit calculation preventing zero-out bugs
        val calculatedMoodDelta = if (mBf != 0 && mAf != 0) (mAf - mBf) else 0
        prefs.edit().putInt("probe_mood_delta", calculatedMoodDelta).apply()
        val mDl = calculatedMoodDelta

        CoroutineScope(Dispatchers.IO).launch {
            try {
                var doomScore = 0f
                var doomLabel = "UNSCORED"
                var modelConf = 0f
                
                try {
                    if (!Python.isStarted()) {
                        Python.start(AndroidPlatform(this@InstaAccessibilityService))
                    }
                    val py = Python.getInstance()
                    val reelioModule = py.getModule("reelio_alse")
                    
                    val csvPath = File(filesDir, "insta_data.csv").absolutePath
                    val statePath = File(filesDir, "alse_model_state.json").absolutePath
                    
                    val result = reelioModule.callAttr("run_inference_on_latest", csvPath, statePath)
                    val resultMap = result.asMap()
                    
                    val scoreObj = resultMap[py.getBuiltins().callAttr("str", "doom_score")]
                    if (scoreObj != null) doomScore = scoreObj.toFloat()
                    
                    val labelObj = resultMap[py.getBuiltins().callAttr("str", "doom_label")]
                    if (labelObj != null) doomLabel = labelObj.toString()
                    
                    val confObj = resultMap[py.getBuiltins().callAttr("str", "model_confidence")]
                    if (confObj != null) modelConf = confObj.toFloat()
                    
                    android.util.Log.d("ALSE", "HMM Result: label=$doomLabel score=$doomScore conf=$modelConf")
                } catch (e: Exception) {
                    android.util.Log.e("ALSE", "Python inference failed: ${e.message}")
                    doomScore = computeKotlinFallbackScore()
                    doomLabel = "UNSCORED"
                    modelConf = 0.0f
                }
                
                val db = DatabaseProvider.getDatabase(this@InstaAccessibilityService)
                val dbSession = SessionEntity(
                    sessionId = UUID.randomUUID().toString(),
                    sessionStart = sTime,
                    sessionEnd = eTime,
                    durationSeconds = durSec,
                    timeOfDayCategory = timeCat,
                    isLateNight = isLate,
                    totalScrolls = tScrolls,
                    maxReelStreak = mReelSt,
                    burstCount = 0,
                    scrollsPerMinute = 0f,
                    likeCount = 0, commentClickCount = 0, shareCount = 0, immersionScore = 0f,
                    totalReelsViewed = rCount, avgReelExposure = 0f, maxReelExposure = 0f,
                    meanScrollInterval = mInterval, scrollIntervalVariance = 0f,
                    peakAcceleration = peakAccel, velocityProxy = 0f, maxVelocityProxy = 0f,
                    avgBurstDuration = maxBurst, maxBurstDuration = maxBurst,
                    // Layer 4
                    sessionDwellTrend = 0f, earlyVsLateRatio = 0f, interactionRate = 0f, interactionDropoff = 0f, scrollIntervalCV = 0f, scrollRhythmEntropy = 0f,
                    // Layer 5
                    sessionsToday = sToday, totalDwellTodayMin = totDwell, longestSessionTodayReels = mReelSt,
                    lastSessionDoomScore = doomScore, rollingDoomRate7d = 0f, doomStreakLength = doomSt, morningSessionExists = mSession,
                    // Layer 6
                    circadianPhase = cPhase, sleepProxyScore = sProxy, estimatedSleepDurationH = 0f, consistencyScore = constSc,
                    // Layer 8
                    postSessionRating = rat, intendedAction = act, actualVsIntendedMatch = mat, regretScore = reg, moodBefore = mBf, moodAfter = mAf, moodDelta = mDl
                )
                db.sessionDao().insert(dbSession)
            } catch (e: Exception) {
                android.util.Log.e("InstaTracker", "Exception in Database Injector Coroutine", e)
            }
        }
    }
    
    private fun computeKotlinFallbackScore(): Float {
        // Simple heuristic fallback if Chaquopy crashes
        val base = sessionDwellTimes.average().toFloat().takeIf { !it.isNaN() } ?: 0f
        return (base / 10f).coerceIn(0f, 1f)
    }

    private fun showSurveyPrompt() {
        val intent = Intent(this, MicroProbeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Reelio Check-In")
            .setContentText("Tap to record your post-session mood rating.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(currentSessionNumber, builder.build())
    }
    
    private fun showIntentionPrompt() {
        val intent = Intent(this, com.example.instatracker.IntentionProbeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Reelio Intention")
            .setContentText("Tap to record your session intention.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(currentSessionNumber + 1000, builder.build())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Survey Requests", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Post-session micro probes"
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }

    private fun getTimePeriod(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 5..11 -> "Morning"
            in 12..16 -> "Afternoon"
            in 17..20 -> "Evening"
            in 21..23 -> "Night"
            in 0..4 -> "Late Night"
            else -> "Night"
        }
    }

    private fun ensureCsvHeader() {
        val file = File(filesDir, "insta_data.csv")
        if (!file.exists() || file.length() == 0L) {
            file.writeText(CSV_HEADER)
        } else {
            // Check if it's the correct schema version, if not, wipe and start fresh
            val firstLine = file.useLines { it.firstOrNull() }
            if (firstLine != "SCHEMA_VERSION=4") {
                Log.w("InstaTracker", "Old schema detected. Overwriting insta_data.csv")
                file.writeText(CSV_HEADER)
            }
        }
    }

    private fun appendToCsv(line: String) {
        val file = File(filesDir, "insta_data.csv")
        try {
           if (!file.exists()) ensureCsvHeader()
           file.appendText(line + "\n")
        } catch (e: Exception) {
           Log.e("CSV", "Error writing csv", e)
        }
    }

    override fun onInterrupt() {}
}
