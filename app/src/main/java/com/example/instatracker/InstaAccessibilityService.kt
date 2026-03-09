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
import android.app.Notification
import android.app.AlarmManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.jvm.Volatile
import java.util.UUID
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.example.instatracker.db.AppDatabase
import com.example.instatracker.db.SessionEntity

class InstaAccessibilityService : AccessibilityService(), SensorEventListener {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private var currentSessionNumber = 0
    private var sessionStartTime: Long? = null
    private var lastActiveTime = 0L
    private var lastExitTime = 0L
    
    // Reel Extracted Variables
    private var reelCount = 0
    private var cumulativeReels = 0
    private var lastReelStartTime = 0L
    @Volatile private var currentReelIndex: Int? = null
    private var lastReelSettleJob: Job? = null
    private var settleTargetIndex: Int = -1
    private var settleScheduledAt: Long = 0L
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
    private var timeSinceLastSessionMin = 0.0
    private var dayOfWeek = 0
    private var isHoliday = false
    
    private var screenOnCount1hr = 0
    private var screenOnDuration1hr = 0L
    
    private var sessionTriggeredByNotif = false
    private var comparativeRating = 0
    
    private var nightModeActive = false
    private var dndActive = false
    
    // Layer 4 & 5 Arrays
    private var sessionDwellTimes = mutableListOf<Double>()
    private var sessionScrollIntervals = mutableListOf<Long>()
    private var likeStreakLength = 0
    private var maxLikeStreakLength = 0
    private var halfSessionInteractions = mutableListOf<Int>()
    private var savedWithoutLike = false
    private var commentAbandoned = false
    
    private var scrollBurstStartTime = 0L
    private var scrollBurstDuration = 0L
    private var interBurstRestDuration = 0L
    private var lastScrollBurstTime = 0L
    
    private var uniqueAudioTracks = mutableSetOf<String>()
    
    // ── Welford incremental stats ──
    private var wDwellN = 0
    private var wDwellMean = 0.0
    private var wDwellM2 = 0.0          // for variance/std
    private var prevDwellSec = 0.0

    private var wTrendSumX = 0.0        // regression: Σi
    private var wTrendSumY = 0.0        // regression: Σdwell
    private var wTrendSumXY = 0.0       // regression: Σi*dwell
    private var wTrendSumXX = 0.0       // regression: Σi²

    private var wScrollN = 0
    private var wScrollMean = 0.0
    private var wScrollM2 = 0.0         // for scrollIntervalCV

    private var wInteractionN = 0
    private var wInteractionMean = 0.0
    private var wInteractionM2 = 0.0    // for interactionBurstiness

    private var erFirstHalfSum = 0.0
    private var erFirstHalfN = 0
    private var erSecondHalfSum = 0.0  
    private var erSecondHalfN = 0

    private val scrollBins = mutableMapOf<Long, Int>()  // scrollRhythmEntropy bins
    private val sessionSortedDwells = mutableListOf<Double>() // for O(n) exact-ish percentile
    
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
    
    // Layer 8: Micro-Probes (Live state for current session)
    private var currentIntention = ""
    private var currentMoodBefore = 0
    private var lastMicroprobeResults = listOf(0, "", 0, 0, 0, 0, 0)
    
    // ── Per-Reel Data Structures (For Modular Refactor) ──
    private data class DwellResult(val ms: Long, val sec: Double)
    private data class WelfordResult(
        val zScore: Double,
        val pctile: Double,
        val accel: Double,
        val trend: Double,
        val ratio: Double
    )
    private data class InteractionResult(
        val interactionDwellRatio: Float,
        val swipeCompletionRatio: Float,
        val interactionRate: Float,
        val burstiness: Double,
        val dropoff: Float
    )
    private data class ScrollResult(
        val cv: Double,
        val entropy: Double
    )
    private data class EnvironmentResult(
        val rollingMean: Double,
        val rollingStd: Double,
        val avgSpeed: Double,
        val maxSpeed: Double,
        val accVar: Double,
        val isStationary: Int,
        val luxDelta: Float,
        val batteryDelta: Int
    )

    // Rolling
    private val dwellWindow = ArrayDeque<Double>()
    
    companion object {
        private const val WINDOW_SIZE = 5
        private const val PREFS_NAME = "InstaTrackerPrefs"
        private const val MAX_DWELL_HISTORY = 200
        private const val MAX_SCROLL_INTERVALS = 200
        private const val MAX_INTERACTION_HISTORY = 200
        private const val KEY_SESSION_NUM = "session_number"
        private const val CSV_HEADER = "SCHEMA_VERSION=5\nSessionNum,ReelIndex,StartTime,EndTime,DwellTime,TimePeriod," +
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
            "PostSessionRating,IntendedAction,ActualVsIntendedMatch,RegretScore,MoodBefore,MoodAfter,MoodDelta,SleepStart,SleepEnd," +
            "PreviousContext,DelayedRegretScore,ComparativeRating,MorningRestScore\n"
            
        private val EXPECTED_CSV_COLUMNS = CSV_HEADER.lines().drop(1).first().split(",").size
            
        // Pillar 11: Process Stability. Global lock preventing race conditions between 
        // accessibility service (background) and Dashboard activity (foreground) when 
        // reading/writing CSV or model state via Python.
        val GLOBAL_PYTHON_LOCK = Any()
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val CHANNEL_ID = "survey_channel"

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i("ReelioDiag", "Service connected. PID=${android.os.Process.myPid()} thread=${Thread.currentThread().name}")
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_SCROLLED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        serviceInfo = info
        lastActiveTime = System.currentTimeMillis()
        
        createNotificationChannel()
        // SDK 34 requires explicit foreground service type
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(9999, buildPersistentNotification(),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(9999, buildPersistentNotification())
        }
        ensureCsvHeader()
        
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val stateWiped = prefs.getBoolean("alse_state_wiped_v4", false)
            
            if (!stateWiped) {
                val stateFile = File(filesDir, "alse_model_state.json")
                if (stateFile.exists()) {
                    stateFile.delete()
                    android.util.Log.d("InstaTracker", "Deleted corrupted alse_model_state.json")
                }
                prefs.edit().putBoolean("alse_state_wiped_v4", true).apply()
            }
        } catch (e: Exception) {
            android.util.Log.e("InstaTracker", "Failed to delete old model state", e)
        }
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // FIX 1: Catch Throwable instead of Exception.
        // Previously catching only Exception allowed Error subtypes (OutOfMemoryError,
        // StackOverflowError) to propagate uncaught and kill the service process.
        // These are the errors that manifest as the service "auto-disabling" — the
        // process died and Android removed the service from the active accessibility list.
        try {
            if (event == null) return
            // Fast exit for irrelevant event types before ANY other processing
            val type = event.eventType
            if (type != AccessibilityEvent.TYPE_VIEW_SCROLLED &&
                type != AccessibilityEvent.TYPE_VIEW_CLICKED &&
                type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return

            val now = System.currentTimeMillis()
            val packageName = event.packageName?.toString() ?: ""
        
            if (packageName != "com.instagram.android") {
                if (sessionStartTime != null) {
                    if (lastExitTime == 0L) lastExitTime = now
                    checkSessionTimeout(now, packageName)
                }
                return
            } else {
                if (lastExitTime != 0L) {
                    val exitDuration = now - lastExitTime
                    if (exitDuration < 20_000L) {
                        appExitAttempts++
                    }
                    lastExitTime = 0L
                }
            }

            if (sessionStartTime == null) startNewSession(now)

            if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                val desc = event.contentDescription?.toString()?.lowercase() ?: ""
                val text = event.text?.joinToString(" ")?.lowercase() ?: ""
                val latency = now - lastReelStartTime

                val hasActiveReel = currentReelIndex != null && reelCount > 0 && lastReelStartTime > 0L
                if (hasActiveReel) {
                    when (InteractionDetector.detectInteraction(event)) {
                        InteractionType.LIKE -> {
                            liked = true
                            savedWithoutLike = false
                            if (likeLatencyMs == -1L) likeLatencyMs = latency
                            likeStreakLength++
                            if (likeStreakLength > maxLikeStreakLength) maxLikeStreakLength = likeStreakLength
                            halfSessionInteractions.add(reelCount)
                        }
                        InteractionType.COMMENT -> {
                            commented = true
                            if (commentLatencyMs == -1L) commentLatencyMs = latency
                            commentAbandoned = true
                            halfSessionInteractions.add(reelCount)
                        }
                        InteractionType.SHARE -> {
                            shared = true
                            if (shareLatencyMs == -1L) shareLatencyMs = latency
                            halfSessionInteractions.add(reelCount)
                        }
                        InteractionType.SAVE -> {
                            saved = true
                            if (saveLatencyMs == -1L) saveLatencyMs = latency
                            if (!liked) savedWithoutLike = true
                            halfSessionInteractions.add(reelCount)
                        }
                        null -> {
                            // No recognized interaction for this click.
                        }
                    }
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
                    if (sessionScrollIntervals.size > 200) sessionScrollIntervals.removeAt(0)
                    
                    if (timeDelta < 400L) {
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
                        if (scrollDistances.size > 100) scrollDistances.removeAt(0)
                        cleanSwipes++
                        
                        if (lastScrollSpeed > 0 && speed < lastScrollSpeed * 0.2f) {
                            scrollPauseCount++
                            scrollPauseDurationMs += timeDelta
                        }
                        lastScrollSpeed = speed
                    }
                }
                lastScrollTime = now
                resetSessionTimer(now)

                // ── Index-Based Segmentation with 200ms Settle Window ──
                val toIdx = event.toIndex
                val fromIdxEvent = event.fromIndex
                val newIndex = if (toIdx != -1) toIdx else fromIdxEvent

                if (newIndex != -1) {
                    if (currentReelIndex == null) {
                        currentReelIndex = newIndex
                        startNextReel(now)
                    } else if (newIndex != currentReelIndex) {

                        // isProgression filters snap-back oscillation.
                        // During RecyclerView snap physics, toIndex bounces back toward
                        // the origin (e.g. 1→0 while settling ON reel 1). We only
                        // schedule a settle if the new index is moving at least as far
                        // from current as the already-pending target — i.e. it's a real
                        // navigation event, not a physics bounce.
                        val currentIdx = currentReelIndex ?: 0
                        val isProgression = settleTargetIndex == -1 ||
                            Math.abs(newIndex - currentIdx) >= Math.abs(settleTargetIndex - currentIdx)

                        if (isProgression) {
                            settleTargetIndex = newIndex
                            settleScheduledAt = now
                            lastReelSettleJob?.cancel()
                            val capturedTarget = newIndex
                            lastReelSettleJob = serviceScope.launch {
                                delay(150L) // 150ms: real swipe completes in ~100-130ms
                                val current = currentReelIndex ?: return@launch
                                if (capturedTarget != current) {

                                    // Account for skipped reels (fast multi-swipe).
                                    // If user swiped from reel 1 to reel 9, reels 2-8
                                    // were never dwelled on but ARE real automaticity
                                    // signal. We increment reel/session counters so the
                                    // next recorded row reflects the true reel position.
                                    // We do NOT write individual rows for skipped reels
                                    // because we have no per-reel data for them.
                                    val skippedCount = Math.abs(capturedTarget - current) - 1
                                    if (skippedCount > 0) {
                                        likeStreakLength = 0 // rapid skips reset like streak
                                    }

                                    processPreviousReel(System.currentTimeMillis())
                                    if (skippedCount > 0) {
                                        // Apply skipped reels after writing the previous row
                                        // so that row indices stay consistent.
                                        reelCount += skippedCount
                                        cumulativeReels += skippedCount
                                    }
                                    currentReelIndex = capturedTarget
                                    settleTargetIndex = -1
                                    startNextReel(System.currentTimeMillis())
                                }
                            }
                        }
                        // If not a progression (snap-back bounce), ignore entirely
                    }
                }
            }

            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                resetSessionTimer(now)
                val rootNode = event.source?.let { AccessibilityNodeInfo.obtain(it) }
                if (rootNode != null) {
                    traverseNode(rootNode)
                    rootNode.recycle()
                }
            }
        } catch (t: Throwable) {
            android.util.Log.e("InstaTracker", "Handled throwable in accessibility loop: ${t.localizedMessage}")
        }
    }
    
    // FIX 3: Replaced recursive DFS with iterative BFS + explicit node recycling.
    //
    // The original recursive implementation had two critical problems that caused the
    // service auto-disable bug:
    //
    // 1. MEMORY LEAK (primary cause): getChild() creates a new AccessibilityNodeInfo
    //    object backed by a binder reference in the Android accessibility framework.
    //    The framework maintains a fixed pool of these references (~50 per process).
    //    The old code never called recycle() on any child node, so each reel traversal
    //    consumed ~5-30 pool slots. After 100-200 reels the pool was exhausted, the
    //    framework threw an uncaught RuntimeException, and Android disabled the service.
    //
    // 2. STACK OVERFLOW RISK (secondary): Instagram's UI tree can be 30+ levels deep.
    //    Recursive traversal on deep trees risks StackOverflowError, which is an Error
    //    (not Exception) and was previously uncaught (now handled by FIX 1).
    //
    // This iterative BFS implementation guarantees every node from getChild() is
    // recycled in a finally block regardless of whether processing succeeds or throws.
    // The root node is recycled by the caller in onAccessibilityEvent.
    private fun traverseNode(root: AccessibilityNodeInfo) {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)

        while (queue.isNotEmpty()) {
            val node = queue.poll() ?: continue

            val text = node.text?.toString()?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""

            if (text.contains("sponsored") || desc.contains("sponsored")) isAd = true
            if (text.length > 25) hasCaption = true
            if (desc.contains("audio") || desc.contains("sound") || desc.contains("music")) {
                hasAudio = true
                uniqueAudioTracks.add(desc)
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) queue.add(child)
            }

            if (node !== root) {
                node.recycle()
            }
        }
    }

    private fun startNextReel(now: Long) {
        val previousReelLiked = liked
        reelCount++
        cumulativeReels++
        
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
        
        if (!previousReelLiked) likeStreakLength = 0
        savedWithoutLike = false
        commentAbandoned = false
        
        // backScrollCount, ambientLuxStart, and appExitAttempts moved to processPreviousReel
    }

    private fun processPreviousReel(now: Long) {
        if (reelCount % 10 == 0) Log.i("ReelioDiag", "Reel heartbeat: reel=$reelCount PID=${android.os.Process.myPid()}")
        val dwell = computeDwell(now)
        sessionDwellTimes.add(dwell.sec)
        if (sessionDwellTimes.size > 200) sessionDwellTimes.removeAt(0)
        val wStats = updateWelfordStats(dwell.sec)
        val iStats = updateInteractionStats(dwell)
        val sStats = updateScrollStats()
        val eStats = updateEnvironmentStats(now, dwell.sec)
        
        val line = buildCsvLine(dwell, wStats, iStats, sStats, eStats, now)
        appendToCsv(line)

        // Reset per-reel metrics after they are written to CSV
        backScrollCount = 0
        ambientLuxStart = ambientLuxEnd
        appExitAttempts = 0
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
            if (accelMagnitudes.size > 200) accelMagnitudes.removeAt(0)
            
            deviceOrientation = if (abs(gx) > abs(gy)) 2 else 1
            
            if (lastGravityX != 0f && lastGravityY != 0f) {
                val shift = sqrt((gx - lastGravityX)*(gx - lastGravityX) + (gy - lastGravityY)*(gy - lastGravityY))
                if (shift > 3.0f) postureShiftCount++
            }
            lastGravityX = gx
            lastGravityY = gy
            
        } else if (event.sensor.type == Sensor.TYPE_LIGHT) {
            val lux = event.values[0]
            if (ambientLuxStart <= 0f) ambientLuxStart = lux
            ambientLuxEnd = lux
            if (lux < 10f) isScreenInDarkRoom = true
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun startNewSession(now: Long) {
        Log.i("ReelioDiag", "Session START. PID=${android.os.Process.myPid()} sessionsToday=$sessionsToday reelCount=$reelCount thread=${Thread.currentThread().name}")
        sessionStartTime = now
        lastReelStartTime = now
        currentReelIndex = null
        uniqueAudioTracks.clear()
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // --- Layer 8: Micro-Probes Data Extraction ---
        val rawProbe = prefs.getString("last_microprobe_result", "0,,0,0,0,0,0,0") ?: "0,,0,0,0,0,0,0"
        val splitProbe = rawProbe.split(",")
        if (splitProbe.size == 8) {
            val rating = splitProbe[0].toIntOrNull() ?: 0
            val action = splitProbe[1]
            val match = splitProbe[2].toIntOrNull() ?: 0
            val regret = splitProbe[3].toIntOrNull() ?: 0
            val mBefore = splitProbe[4].toIntOrNull() ?: 0
            val mAfter = splitProbe[5].toIntOrNull() ?: 0
            val mDelta = splitProbe[6].toIntOrNull() ?: 0
            comparativeRating = splitProbe[7].toIntOrNull() ?: 0
            lastMicroprobeResults = listOf(rating, action, match, regret, mBefore, mAfter, mDelta)
        } else {
            lastMicroprobeResults = listOf(0, "unknown", 0, 0, 0, 0, 0)
            comparativeRating = 0
        }
        
        currentIntention = prefs.getString("current_intended_action", "") ?: ""
        currentMoodBefore = prefs.getInt("current_mood_before", 0)
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
        isHoliday = (dayOfWeek == Calendar.SUNDAY)
        isWeekend = (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY)
        
        val hr = cal.get(Calendar.HOUR_OF_DAY)
        val mn = cal.get(Calendar.MINUTE)
        circadianPhase = (hr * 60 + mn) / (24 * 60f)
        
        val firstSessionStr = prefs.getString("first_session_times", "") ?: ""
        var firstSessionTimes = firstSessionStr.split(",").filter { it.isNotEmpty() }.map { it.toInt() }.toMutableList()
        
        if (today != lastDate) {
            sessionsToday = 0
            totalDwellTodayMin = 0f
            longestSessionTodayReels = 0
            morningSessionExists = false
            
            val sleepStart = prefs.getInt("sleep_start_hour", 23)
            val sleepEnd = prefs.getInt("sleep_end_hour", 7)
            val phaseStart = sleepStart / 24f
            val phaseEnd = sleepEnd / 24f
            val isSleeping = if (sleepStart > sleepEnd) {
                circadianPhase >= phaseStart || circadianPhase <= phaseEnd
            } else {
                circadianPhase >= phaseStart && circadianPhase <= phaseEnd
            }
            sleepProxyScore = if (isSleeping) 0.0f else 1.0f
            
            firstSessionTimes.add(hr * 60 + mn)
            if (firstSessionTimes.size > 7) firstSessionTimes.removeAt(0)
            prefs.edit().putString("first_session_times", firstSessionTimes.joinToString(",")).apply()
        }
        
        if (firstSessionTimes.size > 1) {
            val mean = firstSessionTimes.average()
            val vr = firstSessionTimes.map { (it - mean)*(it - mean) }.average()
            consistencyScore = (1.0 / (1.0 + sqrt(vr))).toFloat()
        } else {
            consistencyScore = 1.0f
        }
        
        sessionsToday++
        
        timeSinceLastSessionMin = if (lastSessionEnd > 0L) {
            (now - lastSessionEnd) / (1000.0 * 60.0)
        } else {
            -1.0
        }
        
        // --- Layer 8: Trigger Probabilistic Paired Surveys ---
        val sliderValue = prefs.getFloat("survey_probability", 0.30f)
        val lastSt = prefs.getFloat("last_session_doom_score", 0.35f)
        val baseRate = when {
            lastSt >= 0.55f -> 0.90f
            lastSt >= 0.35f -> 0.40f
            else            -> 0.10f
        }
        val isSurveySession = when {
            sliderValue == 0f    -> false
            sliderValue >= 0.95f -> true
            else                 -> Math.random() < (sliderValue * baseRate)
        }

        prefs.edit()
            .putBoolean("is_survey_session", isSurveySession)
            .putInt("current_mood_before", 0)
            .putString("current_intended_action", "")
            .putInt("probe_post_rating", 0)
            .putInt("probe_regret_score", 0)
            .putInt("probe_focus_after", 0)
            .putInt("probe_mood_delta", 0)
            .putInt("probe_actual_vs_intended", 0)
            .putInt("comparative_rating", 0)
            .apply()

        if (isSurveySession) showIntentionPrompt()
        // -----------------------------------------------------
        
        currentSessionNumber = if (today != lastDate) 1 else prefs.getInt(KEY_SESSION_NUM, 0) + 1
        prefs.edit().putInt(KEY_SESSION_NUM, currentSessionNumber).putString("last_session_date", today).apply()
        
        cumulativeReels = 0
        reelCount = 0
        continuousScrollCount = 0
        settleTargetIndex = -1
        settleScheduledAt = 0L
        appExitAttempts = 0
        lastExitTime = 0L
        dwellWindow.clear()
        
        // --- Reset Session Data (FIX: Prevent Cross-Session Leakage) ---
        // ── Lists ──────────────────────────────────────────────
        sessionDwellTimes.clear()
        sessionScrollIntervals.clear()
        halfSessionInteractions.clear()
        scrollBins.clear()
        uniqueAudioTracks.clear()
        sessionSortedDwells.clear()

        // ── Interaction state ───────────────────────────────────
        likeStreakLength = 0
        maxLikeStreakLength = 0
        savedWithoutLike = false
        commentAbandoned = false

        // ── Scroll burst timing ─────────────────────────────────
        scrollBurstStartTime = 0L
        scrollBurstDuration = 0L
        interBurstRestDuration = 0L
        lastScrollBurstTime = 0L

        // ── Scroll direction/speed ──────────────────────────────
        lastScrollY = -1
        scrollDirection = 1
        lastScrollSpeed = 0f
        lastScrollTime = 0L
        backScrollCount = 0

        // ── Welford: dwell mean/std ─────────────────────────────
        wDwellN = 0
        wDwellMean = 0.0
        wDwellM2 = 0.0
        prevDwellSec = 0.0

        // ── Welford: regression trend ───────────────────────────
        wTrendSumX = 0.0
        wTrendSumY = 0.0
        wTrendSumXY = 0.0
        wTrendSumXX = 0.0

        // ── Welford: scroll CV ──────────────────────────────────
        wScrollN = 0
        wScrollMean = 0.0
        wScrollM2 = 0.0

        // ── Welford: interaction burstiness ────────────────────
        wInteractionN = 0
        wInteractionMean = 0.0
        wInteractionM2 = 0.0

        // ── Welford: early/late ratio ───────────────────────────
        erFirstHalfSum = 0.0
        erFirstHalfN = 0
        erSecondHalfSum = 0.0
        erSecondHalfN = 0
        // -----------------------------------------------------------------
        
        accelSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        lightSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        
        // Move heavy UsageStats query off main thread to prevent ANR kills.
        // The context data (previousApp, battery, headphones etc.) will be
        // populated slightly after session start but well before the first
        // reel's CSV line is written.
        serviceScope.launch(Dispatchers.IO) {
            captureSystemContext()
        }
        
        lastActiveTime = now
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
        
        previousApp = "unknown"
        previousAppCategory = "unknown"
        previousAppDurationS = 0f
        directLaunch = false
        screenOnCount1hr = 0
        screenOnDuration1hr = 0L
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
            if (idleTime > 25_000L) endCurrentSession(lastActiveTime)
        }
    }

    private fun endCurrentSession(endTime: Long) {
        Log.i("ReelioDiag", "Session END entry. PID=${android.os.Process.myPid()} reelCount=$reelCount thread=${Thread.currentThread().name}")
        try {
            lastReelSettleJob?.cancel()
            if (sessionStartTime == null) return
            val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            batteryLevelEnd = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            if (lastReelStartTime != 0L && endTime > lastReelStartTime) processPreviousReel(endTime)
            
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            if (prefs.getBoolean("is_survey_session", false)) showSurveyPrompt()
            
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
            
            schedulePostSessionProbes(endTime)
            injectSessionToDatabase(sessionStartTime!!, endTime)
            
            sessionStartTime = null
            reelCount = 0
            dwellWindow.clear()
            lastReelStartTime = 0L
        } catch (e: Exception) {
            android.util.Log.e("InstaTracker", "Exception in endCurrentSession", e)
        }
    }
    
    private fun schedulePostSessionProbes(sessionEndTime: Long) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean("is_survey_session", false)) return
        
        // Delayed probe: only if session scored above borderline threshold
        val lastDoom = prefs.getFloat("last_session_doom_score", 0f)
        if (lastDoom >= 0.35f) {
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(this, DelayedProbeReceiver::class.java).apply {
                putExtra("session_num", currentSessionNumber)
            }
            val pending = PendingIntent.getBroadcast(
                this,
                currentSessionNumber + 5000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                sessionEndTime + 60 * 60 * 1000L,
                pending
            )
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
        val mat = prefs.getInt("probe_actual_vs_intended", 0) == 1
        val reg = prefs.getInt("probe_regret_score", 0)
        val mBf = prefs.getInt("current_mood_before", 0)
        val mAf = prefs.getInt("probe_focus_after", 0)
        // Disabled: pre-state and post-focus now use different scales.
        val mDl = 0

        serviceScope.launch(Dispatchers.IO) {
            try {
                var doomScore = 0f
                var doomLabel = "UNSCORED"
                var modelConf = 0f
                
                val lockWaitStart = System.currentTimeMillis()
                Log.i("ReelioDiag", "Service awaiting PYTHON_LOCK. time=$lockWaitStart PID=${android.os.Process.myPid()}")
                synchronized(GLOBAL_PYTHON_LOCK) {
                    val lockAcquired = System.currentTimeMillis()
                    Log.i("ReelioDiag", "Service acquired PYTHON_LOCK. waited=${lockAcquired - lockWaitStart}ms")
                    try {
                        if (!Python.isStarted()) {
                            Python.start(AndroidPlatform(this@InstaAccessibilityService))
                        }
                        val py = Python.getInstance()
                        val reelioModule = py.getModule("reelio_alse")
                        
                        val file = File(filesDir, "insta_data.csv")
                        val cappedCsv = if (file.exists()) {
                            val lines = file.readLines()
                            if (lines.size > 2) {
                                val header1 = lines[0] // SCHEMA_VERSION
                                val header2 = lines[1] // Column names
                                val dataLines = lines.drop(2)
                                (listOf(header1, header2) + dataLines.takeLast(200)).joinToString("\n")
                            } else {
                                lines.joinToString("\n")
                            }
                        } else ""
                        
                        val statePath = File(filesDir, "alse_model_state.json").absolutePath
                        
                        val pyDict = py.getBuiltins().callAttr("dict")
                        pyDict.callAttr("__setitem__", "PostSessionRating", rat)
                        pyDict.callAttr("__setitem__", "IntendedAction", act)
                        pyDict.callAttr("__setitem__", "ActualVsIntendedMatch", if (mat) 1 else 0)
                        pyDict.callAttr("__setitem__", "RegretScore", reg)
                        pyDict.callAttr("__setitem__", "MoodBefore", mBf)
                        pyDict.callAttr("__setitem__", "MoodAfter", mAf)
                        pyDict.callAttr("__setitem__", "DelayedRegretScore", prefs.getInt("delayed_regret_score_${currentSessionNumber}", 0))
                        pyDict.callAttr("__setitem__", "ComparativeRating", prefs.getInt("comparative_rating", 0))
                        pyDict.callAttr("__setitem__", "MorningRestScore", prefs.getInt("morning_rest_score", 0))
                        pyDict.callAttr("__setitem__", "PreviousContext", prefs.getString("previous_context", "unknown") ?: "unknown")

                        val result = reelioModule.callAttr("run_inference_on_latest", cappedCsv, statePath, pyDict)
                        val resultMap = result.asMap()
                        
                        val scoreObj = resultMap[py.getBuiltins().callAttr("str", "doom_score")]
                        if (scoreObj != null) doomScore = scoreObj.toFloat()
                        
                        val labelObj = resultMap[py.getBuiltins().callAttr("str", "doom_label")]
                        if (labelObj != null) doomLabel = labelObj.toString()
                        
                        val confObj = resultMap[py.getBuiltins().callAttr("str", "model_confidence")]
                        if (confObj != null) modelConf = confObj.toFloat()
                        
                        android.util.Log.d("ALSE", "HMM Result: label=$doomLabel score=$doomScore conf=$modelConf")

                        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                            .remove("last_microprobe_result")
                            .putFloat("last_session_doom_score", doomScore)
                            .apply()
                    } catch (t: Throwable) {
                        android.util.Log.e("ALSE", "Python inference failed: ${t.message}")
                        doomScore = computeKotlinFallbackScore()
                        doomLabel = "UNSCORED"
                        modelConf = 0.0f
                    } finally {
                        Log.i("ReelioDiag", "Service releasing PYTHON_LOCK. time=${System.currentTimeMillis()} PID=${android.os.Process.myPid()}")
                    }
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
                    sessionDwellTrend = 0f, earlyVsLateRatio = 0f, interactionRate = 0f, interactionDropoff = 0f, scrollIntervalCV = 0f, scrollRhythmEntropy = 0f,
                    sessionsToday = sToday, totalDwellTodayMin = totDwell, longestSessionTodayReels = mReelSt,
                    lastSessionDoomScore = doomScore, rollingDoomRate7d = 0f, doomStreakLength = doomSt, morningSessionExists = mSession,
                    circadianPhase = cPhase, sleepProxyScore = sProxy, estimatedSleepDurationH = 0f, consistencyScore = constSc,
                    postSessionRating = rat, intendedAction = act, actualVsIntendedMatch = mat, regretScore = reg, moodBefore = mBf, moodAfter = mAf, moodDelta = mDl
                )
                db.sessionDao().insert(dbSession)
            } catch (t: Throwable) {
                android.util.Log.e("InstaTracker", "Fatal error in Database Injector Coroutine", t)
            }
        }
    }
    
    private fun computeDwell(now: Long): DwellResult {
        val ms = now - lastReelStartTime
        val sec = ms / 1000.0
        
        if (sec < 5.0) continuousScrollCount++ else continuousScrollCount = 0
        if (isAd && adSkipLatencyMs == -1L) adSkipLatencyMs = ms
        
        return DwellResult(ms, sec)
    }

    private fun updateWelfordStats(dwellSec: Double): WelfordResult {
        wDwellN++
        val dwellDelta = dwellSec - wDwellMean
        wDwellMean += dwellDelta / wDwellN
        val dwellDelta2 = dwellSec - wDwellMean
        wDwellM2 += dwellDelta * dwellDelta2
        
        val sessionDwellMean = wDwellMean
        val sessionDwellStd = if (wDwellN > 1) sqrt(wDwellM2 / wDwellN) else 1.0
        val zScore = (dwellSec - sessionDwellMean) / sessionDwellStd.coerceAtLeast(1.0)

        // Percentile: O(n) insertion-based (capped at 50)
        val insertIdx = sessionSortedDwells.binarySearch(dwellSec).let { if (it < 0) -(it + 1) else it }
        sessionSortedDwells.add(insertIdx, dwellSec)
        if (sessionSortedDwells.size > 50) sessionSortedDwells.removeAt(0)
        val pctile = (insertIdx.toDouble() / sessionSortedDwells.size.coerceAtLeast(1)) * 100.0
        
        val accel = if (wDwellN > 1) dwellSec - prevDwellSec else 0.0
        prevDwellSec = dwellSec

        // Incremental linear regression for dwell trend
        val iX = wDwellN.toDouble()
        wTrendSumX += iX
        wTrendSumY += dwellSec
        wTrendSumXY += iX * dwellSec
        wTrendSumXX += iX * iX
        val trend = if (wDwellN > 1) {
            val denom = (wDwellN * wTrendSumXX - wTrendSumX * wTrendSumX).coerceAtLeast(1.0)
            (wDwellN * wTrendSumXY - wTrendSumX * wTrendSumY) / denom
        } else 0.0

        // Early vs late ratio
        if (wDwellN <= 20) {
            erFirstHalfSum += dwellSec
            erFirstHalfN++
        } else {
            erSecondHalfSum += dwellSec
            erSecondHalfN++
        }
        val ratio = if (erSecondHalfN > 0 && erSecondHalfSum > 0.1)
            (erFirstHalfSum / erFirstHalfN.coerceAtLeast(1)) / (erSecondHalfSum / erSecondHalfN)
        else 1.0
        
        return WelfordResult(zScore, pctile, accel, trend, ratio)
    }

    private fun updateInteractionStats(dwell: DwellResult): InteractionResult {
        val interactionDwellRatio = if (likeLatencyMs > 0 && dwell.ms > 0) likeLatencyMs.toFloat() / dwell.ms.toFloat() else 0f
        val swipeCompletionRatio = if (swipeAttempts > 0) cleanSwipes.toFloat() / swipeAttempts.toFloat() else 1.0f
        val interactionRate = halfSessionInteractions.size.toFloat() / wDwellN.coerceAtLeast(1)

        if (halfSessionInteractions.isNotEmpty()) {
            val lastInteraction = halfSessionInteractions.last().toDouble()
            wInteractionN++
            val iDelta = lastInteraction - wInteractionMean
            wInteractionMean += iDelta / wInteractionN
            val iDelta2 = lastInteraction - wInteractionMean
            wInteractionM2 += iDelta * iDelta2
        }
        val burstiness = if (wInteractionN > 1) wInteractionM2 / wInteractionN else 0.0

        val dropoff = if (halfSessionInteractions.isNotEmpty()) {
            val threshold = wDwellN / 2
            val early = halfSessionInteractions.count { it < threshold }
            val late = halfSessionInteractions.count { it >= threshold }
            if (early > 0) late.toFloat() / early.toFloat() else 1f
        } else 0f
        
        return InteractionResult(interactionDwellRatio, swipeCompletionRatio, interactionRate, burstiness, dropoff)
    }

    private fun updateScrollStats(): ScrollResult {
        if (sessionScrollIntervals.isNotEmpty()) {
            val lastInterval = sessionScrollIntervals.last().toDouble()
            wScrollN++
            val sDelta = lastInterval - wScrollMean
            wScrollMean += sDelta / wScrollN
            val sDelta2 = lastInterval - wScrollMean
            wScrollM2 += sDelta * sDelta2
        }
        val cv = if (wScrollN > 1 && wScrollMean > 0)
            sqrt(wScrollM2 / wScrollN) / wScrollMean else 0.0

        if (sessionScrollIntervals.isNotEmpty()) {
            val bin = sessionScrollIntervals.last() / 200L
            scrollBins[bin] = (scrollBins[bin] ?: 0) + 1
        }
        val entropy = if (scrollBins.isNotEmpty()) {
            val totalE = scrollBins.values.sum().toDouble()
            -scrollBins.values.sumOf { c ->
                val pE = c / totalE
                if (pE > 0) pE * kotlin.math.log2(pE) else 0.0
            }
        } else 0.0

        if (sessionScrollIntervals.size > 50) sessionScrollIntervals.removeAt(0)
        
        return ScrollResult(cv, entropy)
    }

    private fun updateEnvironmentStats(now: Long, dwellSec: Double): EnvironmentResult {
        dwellWindow.addLast(dwellSec)
        if (dwellWindow.size > WINDOW_SIZE) dwellWindow.removeFirst()
        val rollingMean = dwellWindow.average()
        val variance = if (dwellWindow.isNotEmpty()) dwellWindow.map { (it - rollingMean) * (it - rollingMean) }.average() else 0.0
        val rollingStd = sqrt(variance)

        val avgSpeed = if (scrollDistances.isNotEmpty()) scrollDistances.average() else 0.0
        val maxSpeed = if (scrollDistances.isNotEmpty()) scrollDistances.maxOrNull()?.toDouble() ?: 0.0 else 0.0

        val accVar = calculateVariance(accelMagnitudes).toDouble()
        val isStationary = if (accVar < 0.2 && accelMagnitudes.isNotEmpty()) 1 else 0

        val luxDelta = if (ambientLuxStart != -1f && ambientLuxEnd != -1f) ambientLuxEnd - ambientLuxStart else 0f
        val batteryDelta = if (batteryLevelStart != -1 && batteryLevelEnd != -1) batteryLevelStart - batteryLevelEnd else 0
        
        return EnvironmentResult(rollingMean, rollingStd, avgSpeed, maxSpeed, accVar, isStationary, luxDelta, batteryDelta)
    }

    private fun buildCsvLine(
        dwell: DwellResult,
        wStats: WelfordResult,
        iStats: InteractionResult,
        sStats: ScrollResult,
        eStats: EnvironmentResult,
        now: Long
    ): String {
        val formStart = dateFormat.format(Date(lastReelStartTime))
        val formEnd = timeFormat.format(Date(now))
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val sleepStart = prefs.getInt("sleep_start_hour", 23)
        val sleepEnd = prefs.getInt("sleep_end_hour", 7)

        val line = listOf(
            currentSessionNumber, reelCount, formStart, formEnd,
            String.format("%.2f", dwell.sec), getTimePeriod(),
            String.format("%.2f", eStats.avgSpeed), String.format("%.2f", eStats.maxSpeed),
            String.format("%.2f", eStats.rollingMean), String.format("%.2f", eStats.rollingStd),
            cumulativeReels, continuousScrollCount,
            if (liked) 1 else 0, if (commented) 1 else 0, if (shared) 1 else 0, if (saved) 1 else 0,
            likeLatencyMs, commentLatencyMs, shareLatencyMs, saveLatencyMs, String.format("%.4f", iStats.interactionDwellRatio),
            scrollDirection, backScrollCount, scrollPauseCount, scrollPauseDurationMs, String.format("%.2f", iStats.swipeCompletionRatio),
            if (hasCaption) 1 else 0, if (captionExpanded) 1 else 0, if (hasAudio) 1 else 0, if (isAd) 1 else 0, adSkipLatencyMs,
            appExitAttempts, returnLatencyS,
            notificationsDismissed, notificationsActedOn, profileVisits, String.format("%.2f", profileVisitDurationS),
            hashtagTaps,
            String.format("%.1f", if (ambientLuxStart <= 0f) 50f else ambientLuxStart), 
            String.format("%.1f", if (ambientLuxEnd <= 0f) 50f else ambientLuxEnd), 
            String.format("%.1f", eStats.luxDelta), if (isScreenInDarkRoom) 1 else 0,
            String.format("%.4f", eStats.accVar), 0f, postureShiftCount, eStats.isStationary, deviceOrientation,
            batteryLevelStart, eStats.batteryDelta, if (isChargingStart) 1 else 0,
            if (headphonesConnected) 1 else 0, audioOutputType,
            previousApp, String.format("%.2f", previousAppDurationS), previousAppCategory, if (directLaunch) 1 else 0,
            String.format("%.4f", timeSinceLastSessionMin), dayOfWeek, if (isHoliday) 1 else 0,
            screenOnCount1hr, screenOnDuration1hr, if (nightModeActive) 1 else 0, if (dndActive) 1 else 0,
            if (sessionTriggeredByNotif) 1 else 0,
            String.format("%.2f", wStats.zScore), String.format("%.2f", wStats.pctile), String.format("%.2f", wStats.accel), String.format("%.4f", wStats.trend), String.format("%.2f", wStats.ratio),
            String.format("%.2f", iStats.interactionRate), String.format("%.2f", iStats.burstiness), maxLikeStreakLength, String.format("%.2f", iStats.dropoff), if (savedWithoutLike) 1 else 0, if (commentAbandoned) 1 else 0,
            String.format("%.4f", sStats.cv), scrollBurstDuration, interBurstRestDuration, String.format("%.4f", sStats.entropy),
            uniqueAudioTracks.size, 0, 0f,
            String.format("%.4f", circadianPhase), String.format("%.2f", sleepProxyScore), String.format("%.1f", estimatedSleepDurationH), String.format("%.2f", consistencyScore), if (isWeekend) 1 else 0,
            lastMicroprobeResults[0],
            if (currentIntention.isNotEmpty()) currentIntention else lastMicroprobeResults[1],
            lastMicroprobeResults[2],
            lastMicroprobeResults[3],
            if (currentMoodBefore > 0) currentMoodBefore else lastMicroprobeResults[4],
            lastMicroprobeResults[5],
            0,
            sleepStart, sleepEnd,
            prefs.getString("previous_context", "unknown") ?: "unknown",
            prefs.getInt("delayed_regret_score_${currentSessionNumber}", 0),
            prefs.getInt("comparative_rating", 0),
            prefs.getInt("morning_rest_score", 0)
        ).joinToString(",")
        
        val fields = line.split(",")
        if (fields.size != EXPECTED_CSV_COLUMNS) {
            throw IllegalStateException("CSV column count mismatch: expected $EXPECTED_CSV_COLUMNS, got ${fields.size}")
        }
        return line
    }


    private fun computeKotlinFallbackScore(): Float {
        val base = sessionDwellTimes.average().toFloat().takeIf { !it.isNaN() } ?: 0f
        return (base / 10f).coerceIn(0f, 1f)
    }

    private fun showSurveyPrompt() {
        val intent = Intent(this, MicroProbeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aware_notification)
            .setContentTitle("Reelio Check-In")
            .setContentText("Tap to record your post-session mood rating.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(currentSessionNumber, builder.build())
    }
    
    private fun showIntentionPrompt() {
        val intent = Intent(this, com.example.instatracker.IntentionProbeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aware_notification)
            .setContentTitle("Reelio Intention")
            .setContentText("Tap to record your session intention.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(currentSessionNumber + 1000, builder.build())
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
        synchronized(GLOBAL_PYTHON_LOCK) {
            val file = File(filesDir, "insta_data.csv")
            val expectedHeaderLine = CSV_HEADER.lines().drop(1).first()
            if (!file.exists() || file.length() == 0L) {
                file.writeText(CSV_HEADER)
            } else {
                val lines = file.readLines()
                val firstLine = lines.firstOrNull()
                if (firstLine != "SCHEMA_VERSION=5") {
                    Log.w("InstaTracker", "Old schema detected. Overwriting insta_data.csv")
                    file.writeText(CSV_HEADER)
                } else {
                    val headerLine = lines.getOrNull(1)
                    val headerCols = headerLine?.split(",")?.size ?: 0
                    val needsHeaderMigration =
                        headerLine == null ||
                        headerCols != EXPECTED_CSV_COLUMNS ||
                        headerLine != expectedHeaderLine

                    if (needsHeaderMigration) {
                        Log.w("InstaTracker", "CSV header mismatch detected. Migrating header in-place")
                        val dataLines = if (lines.size > 2) lines.drop(2) else emptyList()
                        val migrated = buildString {
                            append("SCHEMA_VERSION=5\n")
                            append(expectedHeaderLine)
                            if (dataLines.isNotEmpty()) {
                                append("\n")
                                append(dataLines.joinToString("\n"))
                            }
                            append("\n")
                        }
                        file.writeText(migrated)
                    }
                }
            }
        }
    }

    private fun appendToCsv(line: String) {
        synchronized(GLOBAL_PYTHON_LOCK) {
            val file = File(filesDir, "insta_data.csv")
            try {
               if (!file.exists()) ensureCsvHeader()
               file.appendText(line + "\n")
            } catch (e: Exception) {
               Log.e("CSV", "Error writing csv", e)
            }
        }
    }

    override fun onInterrupt() {}

    private fun buildPersistentNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aware_notification)
            .setContentTitle("Reelio is tracking")
            .setContentText("Monitoring Instagram sessions")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .setOngoing(true)
            .build()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        Log.i("ReelioDiag", "onUnbind called — service being killed by system. PID=${android.os.Process.myPid()}")
        serviceScope.cancel()
        android.util.Log.w("InstaTracker", "Service unbound — forcing session end")
        val now = System.currentTimeMillis()
        if (sessionStartTime != null) {
            try {
                endCurrentSession(now)
            } catch (t: Throwable) {
                android.util.Log.e("InstaTracker", "endCurrentSession in onUnbind failed: ${t.message}")
            }
        }
        return super.onUnbind(intent)
    }
}