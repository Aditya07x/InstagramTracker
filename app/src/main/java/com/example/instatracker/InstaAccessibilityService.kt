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
import kotlin.random.Random
import kotlin.jvm.Volatile
import java.util.UUID
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.example.instatracker.db.AppDatabase
import com.example.instatracker.db.SessionEntity

class InstaAccessibilityService : AccessibilityService(), SensorEventListener {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private var currentSessionNumber = 0
    private var pendingSessionUuid: String? = null
    private var sessionStartTime: Long? = null
    private var lastActiveTime = 0L
    private var lastExitTime = 0L
    
    // Reel Extracted Variables
    private var reelCount = 0
    private var cumulativeReels = 0
    private var lastReelStartTime = 0L
    private var lastInteractionGestureAt = 0L
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
    
    private var likeEventCount = 0  // counts raw like/unlike signals; even=not liked, odd=liked (modulo-2)
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
    
    // Layer 1.5
    private var isOverlaySheetOpen = false
    private var overlayOpenTimeMs = 0L
    private var lastLikeRecordingLatencyMs = -1L
    
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
        private const val ACTION_LOG_TAG = "ReelioAction"
        const val SURVEY_CHANNEL_ID = "survey_channel"
        const val SURVEY_NOTIF_ID_BASE = 90000
        private const val REENTRY_NEW_SESSION_GAP_MS = 5_000L
        private const val STATEFUL_INTERACTION_WINDOW_MS = 1_500L
        private const val SURVEY_ACTIVITY_STALE_MS = 15 * 60 * 1000L
        private const val POST_SURVEY_DELAY_MIN_MS = 30_000L
        private const val POST_SURVEY_DELAY_MAX_MS = 45_000L
        private const val POST_SURVEY_REQUEST_CODE_OFFSET = 2_000
        private const val MIN_REELS_FOR_POST_SURVEY = 1
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

        fun showPostSurveyNotification(context: Context, sessionNum: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (!prefs.getBoolean("notifications_enabled", true)) {
                return
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    SURVEY_CHANNEL_ID,
                    "Survey Requests",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Post-session micro probes"
                }
                (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                    .createNotificationChannel(channel)
            }

            val intent = Intent(context, MicroProbeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val notifId = SURVEY_NOTIF_ID_BASE + sessionNum

            val builder = NotificationCompat.Builder(context, SURVEY_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_aware_notification)
                .setContentTitle("Reelio Check-In")
                .setContentText("Tap to record your post-session mood rating.")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setTimeoutAfter(10 * 60 * 1000L)

            Log.i("ReelioDiag", "Showing post survey notification id=$notifId session=$sessionNum")
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(notifId, builder.build())
        }
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val CHANNEL_ID = SURVEY_CHANNEL_ID

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i("ReelioDiag", "Service connected. PID=${android.os.Process.myPid()} thread=${Thread.currentThread().name}")
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_SCROLLED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_ANNOUNCEMENT or
                         AccessibilityEvent.TYPE_VIEW_SELECTED or
                         0x00000080 // TYPE_VIEW_DOUBLE_CLICKED — API 28+, defined as literal to compile on any minSdk
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
                type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
                type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
                type != AccessibilityEvent.TYPE_ANNOUNCEMENT &&
                type != AccessibilityEvent.TYPE_VIEW_SELECTED &&
                type != 0x00000080) return // TYPE_VIEW_DOUBLE_CLICKED

            val now = System.currentTimeMillis()
            val packageName = event.packageName?.toString() ?: ""
        
            if (packageName != "com.instagram.android") {
                if (sessionStartTime != null) {
                    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    val surveyOpen = prefs.getBoolean("survey_activity_open", false)
                    if (surveyOpen) {
                        val surveyOpenSince = prefs.getLong("survey_activity_open_since", 0L)
                        val ageMs = if (surveyOpenSince > 0L) now - surveyOpenSince else Long.MAX_VALUE
                        if (ageMs <= SURVEY_ACTIVITY_STALE_MS) {
                            // While a survey is visible, keep the same Instagram session alive.
                            // This prevents an immediate re-entry split and duplicate pre-session prompt.
                            lastExitTime = 0L
                            resetSessionTimer(now)
                            return
                        }

                        Log.w("ReelioDiag", "Clearing stale survey_activity_open in background branch. ageMs=$ageMs")
                        prefs.edit()
                            .putBoolean("survey_activity_open", false)
                            .remove("survey_activity_open_since")
                            .apply()
                    }

                    if (lastExitTime == 0L) lastExitTime = now
                    checkSessionTimeout(now, packageName)
                }
                return
            } else {
                if (lastExitTime != 0L) {
                    val exitDuration = now - lastExitTime
                    if (sessionStartTime != null && exitDuration >= REENTRY_NEW_SESSION_GAP_MS) {
                        // If user left Instagram and came back after a short gap,
                        // split sessions immediately so post-survey can fire and
                        // next entry can show a fresh pre-session prompt.
                        endCurrentSession(lastActiveTime)
                    } else if (exitDuration < 20_000L) {
                        // Only count as exit-attempt if user was actively in the reel feed.
                        // lastScrollTime tracks the last reel-feed scroll; 10s threshold means
                        // "the last thing they were doing was scrolling reels."
                        val timeSinceLastReelActivity = now - lastScrollTime
                        if (currentReelIndex != null && reelCount > 0 && timeSinceLastReelActivity < 10_000L) {
                            appExitAttempts++
                        }
                    }
                    lastExitTime = 0L
                }
            }

            if (sessionStartTime == null) startNewSession(now)

            if (type != AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                ensureActiveReelStarted(now)
            }

            val hasActiveReel = currentReelIndex != null && reelCount > 0 && lastReelStartTime > 0L
            if (hasActiveReel &&
                type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
                lastInteractionGestureAt > 0L &&
                now - lastInteractionGestureAt <= STATEFUL_INTERACTION_WINDOW_MS) {
                val stateAction = InteractionDetector.detectStateChange(event)
                val stateSummary = InteractionDetector.describeEvent(event)
                logAction(
                    "state_probe",
                    "event=${eventTypeName(type)} detected=${stateAction ?: "NONE"} latencyMs=${now - lastReelStartTime} snapshot='${compactLogValue(stateSummary, 240)}'"
                )
                when (stateAction) {
                    InteractionType.LIKE -> recordInteraction(InteractionType.LIKE, now - lastReelStartTime, "state_change", stateSummary)
                    InteractionType.SAVE -> recordInteraction(InteractionType.SAVE, now - lastReelStartTime, "state_change", stateSummary)
                    else -> Unit
                }
            }

            if (type == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                
                val desc = event.contentDescription?.toString()?.lowercase() ?: ""
                val text = event.text?.joinToString(" ")?.lowercase() ?: ""
                val latency = now - lastReelStartTime

                if (hasActiveReel) {
                    lastInteractionGestureAt = now
                    val match = InteractionDetector.detectInteraction(event)
                    
                    if (match.type != null || match.isCommentSubmit || type == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                        logAction(
                            "interaction_probe",
                            "event=${eventTypeName(type)} detected=${match.type ?: "NONE"} submit=${if (match.isCommentSubmit) 1 else 0} latencyMs=$latency text='${compactLogValue(text)}' desc='${compactLogValue(desc)}' snapshot='${compactLogValue(match.debugSummary, 240)}'"
                        )
                    }

                    match.type?.let { interactionType ->
                        recordInteraction(interactionType, latency, "probe", match.debugSummary)
                        // Set overlay flag immediately on comment/share button tap — don't wait for
                        // TYPE_WINDOW_STATE_CHANGED which Instagram fires with an empty title, making
                        // the title-based detection in the window handler always miss.
                        if ((interactionType == InteractionType.COMMENT && !match.isCommentSubmit) ||
                             interactionType == InteractionType.SHARE) {
                            isOverlaySheetOpen = true
                            overlayOpenTimeMs = now
                            logAction("overlay_open", "type=$interactionType isOverlaySheetOpen=true")
                        }
                    }
                    if (match.isCommentSubmit) {
                        commentAbandoned = false
                        logAction(
                            "comment_submit_confirmed",
                            "latencyMs=$latency state='${compactLogValue(currentInteractionStateForLog(), 240)}' snapshot='${compactLogValue(match.debugSummary, 240)}'"
                        )
                    }
                }

                if (type == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                    if (text == "more" || desc.contains("expand")) {
                        captionExpanded = true
                    }
                    if (desc.contains("profile") || text.contains("profile")) {
                        profileVisits++
                    }
                    if (text.startsWith("#") || desc.startsWith("#")) {
                        hashtagTaps++
                    }
                }
                
                resetSessionTimer(now)
                return
            }

            // Handle announcements (like/save/unlike/unsave fired by Instagram's accessibility layer)
            // and double-tap (TYPE_VIEW_DOUBLE_CLICKED = 0x80).
            // Both route directly to recordInteraction — the liked/saved flags dedup any double-fires.
            if (type == AccessibilityEvent.TYPE_ANNOUNCEMENT ||
                type == AccessibilityEvent.TYPE_VIEW_SELECTED ||
                type == 0x00000080) {
                if (hasActiveReel) {
                    lastInteractionGestureAt = now
                    val match = InteractionDetector.detectInteraction(event)
                    logAction(
                        "announce_probe",
                        "eventType=${eventTypeName(type)} detected=${match.type ?: "NONE"} latencyMs=${now - lastReelStartTime} debug='${compactLogValue(match.debugSummary, 240)}'"
                    )
                    match.type?.let { recordInteraction(it, now - lastReelStartTime, "announcement", match.debugSummary) }
                }
                resetSessionTimer(now)
                return
            }

            // Handle window state changes: detect comment/share sheet open/close.
            // When a sheet is open, set isOverlaySheetOpen so the scroll handler ignores
            // reel-segmentation logic (scroll inside the comment list ≠ reel swipe).
            if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                val pkg = event.packageName?.toString() ?: ""
                val title = event.text?.firstOrNull()?.toString()?.lowercase()?.trim() ?: ""
                val className = event.className?.toString()?.lowercase() ?: ""
                
                val isCommentSheet = title.contains("comment") || className.contains("comment") ||
                                     title.contains("comentar") || title.contains("commentaire")
                val isShareSheet   = title.contains("share") || className.contains("share") ||
                                     title.contains("send to") || title.contains("direct") ||
                                     title.contains("forward")

                when {
                    isCommentSheet || isShareSheet -> {
                        // Sheet opened via window change (backup path — primary is the click handler above)
                        if (!isOverlaySheetOpen) {
                            isOverlaySheetOpen = true
                            overlayOpenTimeMs = now
                        }
                        if (hasActiveReel && isCommentSheet && !commented) {
                            recordInteraction(InteractionType.COMMENT, now - lastReelStartTime, "window_state_sheet", "sheet_open title=$title cls=$className")
                        }
                        if (hasActiveReel && isShareSheet && !shared) {
                            recordInteraction(InteractionType.SHARE, now - lastReelStartTime, "window_state_sheet", "sheet_open title=$title cls=$className")
                        }
                    }
                    pkg == "com.instagram.android" && isOverlaySheetOpen -> {
                        // Debounce by 1.5s to prevent immediate closure by empty overlay rendering events
                        if (now - overlayOpenTimeMs > 1500L) {
                            isOverlaySheetOpen = false
                            logAction("overlay_close", "isOverlaySheetOpen=false title=$title")
                        }
                    }
                }
                resetSessionTimer(now)
                return
            }

            if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                // If we think an overlay is open, and debounce has passed, verify it's still open on any scroll.
                // This catches the case where the user closed the comment sheet but Instagram
                // didn't fire a TYPE_WINDOW_STATE_CHANGED event, leaving our flag stuck as true.
                if (isOverlaySheetOpen && (now - overlayOpenTimeMs > 1500L)) {
                    val root = rootInActiveWindow?.let { AccessibilityNodeInfo.obtain(it) }
                    if (root != null) {
                        val overlayStillPresent = ReelContextDetector.isOverlayVisible(root)
                        root.recycle()
                        if (!overlayStillPresent) {
                            isOverlaySheetOpen = false
                            logAction("overlay_close", "isOverlaySheetOpen=false verified by root inspection on scroll")
                        }
                    }
                }

                // Filter out non-fullscreen scrolls (e.g. comment section scrolling)
                var isFullScreenScroll = true
                val sourceNode = event.source
                if (sourceNode != null) {
                    val rect = android.graphics.Rect()
                    sourceNode.getBoundsInScreen(rect)
                    val screenHeight = resources.displayMetrics.heightPixels
                    if (rect.height() > 0 && rect.height() < (0.6f * screenHeight)) {
                        isFullScreenScroll = false
                    }
                    val viewId = sourceNode.viewIdResourceName?.lowercase() ?: ""
                    if (viewId.contains("comment") || viewId.contains("bottom_sheet")) {
                        isFullScreenScroll = false
                    }
                    sourceNode.recycle()
                }

                if (!isFullScreenScroll) {
                    // Fallback: If we detect a partial-screen scroll, we are definitely in an overlay.
                    if (!isOverlaySheetOpen) {
                        isOverlaySheetOpen = true
                        overlayOpenTimeMs = now
                        logAction("overlay_open", "fallback: isOverlaySheetOpen=true via non-fullscreen scroll")
                    }
                    resetSessionTimer(now)
                    return
                }

                // If it's a full-screen scroll but the overlay is verified to be open (e.g. a 100% height comment sheet),
                // we drop the scroll event so it doesn't trigger a reel boundary.
                if (isOverlaySheetOpen) {
                    resetSessionTimer(now)
                    return
                }

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
                // Prefer fromIndex because it represents the top-most visible item.
                // When Instagram adds "liked by" text at the bottom, toIndex increments
                // but fromIndex stays the same, preventing a false reel flush.
                val newIndex = if (fromIdxEvent != -1) fromIdxEvent else toIdx

                if (newIndex != -1 && !isOverlaySheetOpen) {
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
                            lastReelSettleJob = serviceScope.launch(Dispatchers.Main) {
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
                                    // NOTE: We intentionally do NOT inflate reelCount
                                    // or cumulativeReels for skipped reels.  Only reels
                                    // that produce a CSV row (with dwell/interaction data)
                                    // should be counted. Inflating the counters here was
                                    // causing 1-reel sessions to appear as 139-reel sessions
                                    // in the CSV because CumulativeReels diverged from the
                                    // actual number of recorded rows.
                                    currentReelIndex = capturedTarget
                                    settleTargetIndex = -1
                                    startNextReel(System.currentTimeMillis())
                                }
                            }
                        }
                        // If not a progression (snap-back bounce), ignore entirely
                    } else {
                        // If newIndex reverts back to currentReelIndex, it was a bounce
                        // or a phantom scroll event. Cancel any pending settle to prevent
                        // a false reel flush.
                        if (settleTargetIndex != -1) {
                            settleTargetIndex = -1
                            lastReelSettleJob?.cancel()
                        }
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

    private fun ensureActiveReelStarted(now: Long) {
        if (sessionStartTime == null || currentReelIndex != null || reelCount > 0) return

        val rootNode = rootInActiveWindow?.let { AccessibilityNodeInfo.obtain(it) } ?: return
        if (!ReelContextDetector.isInReelContext(rootNode, resources)) return

        currentReelIndex = 0
        startNextReel(now)
        logAction(
            "reel_bootstrap",
            "reason=visible_without_scroll state='${compactLogValue(currentInteractionStateForLog(), 240)}'"
        )
    }

    private fun recordInteraction(type: InteractionType, latency: Long, origin: String, detectorSummary: String = "") {
        val beforeState = currentInteractionStateForLog()
        when (type) {
            InteractionType.LIKE -> {
                if (lastLikeRecordingLatencyMs != -1L && latency - lastLikeRecordingLatencyMs < 1000L) {
                    return
                }
                lastLikeRecordingLatencyMs = latency
                likeEventCount++
                // Modulo-2: odd count = net liked, even count = net unliked/toggled off.
                // This naturally handles like→unlike→like chains from announcement + click duplicates.
                val netLiked = (likeEventCount % 2) == 1
                if (netLiked && likeLatencyMs == -1L) likeLatencyMs = latency
                if (netLiked && likeEventCount == 1) {
                    // Only increment streak and record half-session on the first true like
                    likeStreakLength++
                    if (likeStreakLength > maxLikeStreakLength) maxLikeStreakLength = likeStreakLength
                    halfSessionInteractions.add(reelCount)
                }
                savedWithoutLike = if (netLiked) false else savedWithoutLike
            }

            InteractionType.COMMENT -> {
                if (!commented) {
                    commented = true
                    if (commentLatencyMs == -1L) commentLatencyMs = latency
                    halfSessionInteractions.add(reelCount)
                }
                commentAbandoned = true
            }

            InteractionType.SHARE -> {
                if (!shared) {
                    shared = true
                    if (shareLatencyMs == -1L) shareLatencyMs = latency
                    halfSessionInteractions.add(reelCount)
                }
            }

            InteractionType.SAVE -> {
                if (!saved) {
                    saved = true
                    if (saveLatencyMs == -1L) saveLatencyMs = latency
                    halfSessionInteractions.add(reelCount)
                }
                val netLiked = (likeEventCount % 2) == 1
                if (!netLiked) savedWithoutLike = true
            }
        }

        val afterState = currentInteractionStateForLog()
        val stage = if (beforeState != afterState) "action_recorded" else "action_ignored_duplicate"
        logAction(
            stage,
            "origin=$origin type=$type latencyMs=$latency before='${compactLogValue(beforeState, 240)}' after='${compactLogValue(afterState, 240)}' detector='${compactLogValue(detectorSummary, 240)}'"
        )
    }

    private fun startNextReel(now: Long) {
        val previousReelNetLiked = (likeEventCount % 2) == 1
        reelCount++
        cumulativeReels++
        
        lastReelStartTime = now
        lastInteractionGestureAt = 0L
        
        scrollDistances.clear()
        accelMagnitudes.clear()
        
        likeEventCount = 0
        commented = false
        shared = false
        saved = false
        
        likeLatencyMs = -1L
        commentLatencyMs = -1L
        shareLatencyMs = -1L
        saveLatencyMs = -1L
        lastLikeRecordingLatencyMs = -1L
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
        
        if (!previousReelNetLiked) likeStreakLength = 0
        savedWithoutLike = false
        commentAbandoned = false
        
        // backScrollCount, ambientLuxStart, and appExitAttempts moved to processPreviousReel
    }

    // Guard: last (sessionNumber, cumulativeReels) tuple that was written.
    // Prevents duplicate CSV rows if endCurrentSession or the settle job
    // somehow calls processPreviousReel twice for the same reel.
    private var lastWrittenSessionNum = -1
    private var lastWrittenCumulativeReel = -1

    private fun processPreviousReel(now: Long) {
        // Dedup guard: never write the same (session, reel) twice.
        if (currentSessionNumber == lastWrittenSessionNum && cumulativeReels == lastWrittenCumulativeReel) {
            Log.w("ReelioDiag", "Skipping duplicate CSV write for session=$currentSessionNumber reel=$cumulativeReels")
            return
        }
        lastWrittenSessionNum = currentSessionNumber
        lastWrittenCumulativeReel = cumulativeReels

        if (reelCount % 10 == 0) Log.i("ReelioDiag", "Reel heartbeat: reel=$reelCount PID=${android.os.Process.myPid()}")
        val dwell = computeDwell(now)
        sessionDwellTimes.add(dwell.sec)
        if (sessionDwellTimes.size > 200) sessionDwellTimes.removeAt(0)
        val wStats = updateWelfordStats(dwell.sec)
        val iStats = updateInteractionStats(dwell)
        val sStats = updateScrollStats()
        val eStats = updateEnvironmentStats(now, dwell.sec)
        
        val line = buildCsvLine(dwell, wStats, iStats, sStats, eStats, now)
        serviceScope.launch(Dispatchers.IO) {
            appendToCsv(line)
        }
        logAction(
            "reel_flush",
            "dwellSec=${String.format("%.2f", dwell.sec)} state='${compactLogValue(currentInteractionStateForLog(), 240)}'"
        )

        // Reset per-reel metrics after they are written to CSV
        backScrollCount = 0
        ambientLuxStart = ambientLuxEnd
        appExitAttempts = 0
    }

    private fun currentInteractionStateForLog(): String {
        val netLiked = (likeEventCount % 2) == 1
        return "liked=${if (netLiked) 1 else 0}(events=$likeEventCount) commented=${if (commented) 1 else 0} shared=${if (shared) 1 else 0} saved=${if (saved) 1 else 0} likeLatencyMs=$likeLatencyMs commentLatencyMs=$commentLatencyMs shareLatencyMs=$shareLatencyMs saveLatencyMs=$saveLatencyMs savedWithoutLike=${if (savedWithoutLike) 1 else 0} commentAbandoned=${if (commentAbandoned) 1 else 0}"
    }

    private fun compactLogValue(value: String, maxLen: Int = 120): String {
        val normalized = value
            .replace(Regex("\\s+"), " ")
            .replace("'", "\"")
            .trim()
        if (normalized.isBlank()) return "-"
        return if (normalized.length <= maxLen) normalized else normalized.take(maxLen - 3) + "..."
    }

    private fun eventTypeName(eventType: Int): String {
        return when (eventType) {
            AccessibilityEvent.TYPE_VIEW_CLICKED -> "VIEW_CLICKED"
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> "VIEW_SCROLLED"
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> "WINDOW_CONTENT_CHANGED"
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> "WINDOW_STATE_CHANGED"
            else -> eventType.toString()
        }
    }

    private fun logAction(stage: String, details: String) {
        Log.i(
            ACTION_LOG_TAG,
            "stage=$stage session=$currentSessionNumber reel=$reelCount idx=${currentReelIndex ?: -1} $details"
        )
    }

    private fun calculateVariance(mags: List<Float>): Float {
        // Defensive copy: mags may be mutated by onSensorChanged on the main
        // thread while this function iterates on a coroutine worker thread.
        val snapshot = ArrayList(mags)
        if (snapshot.isEmpty()) return 0f
        val mean = snapshot.average().toFloat()
        var v = 0f
        for (m in snapshot) { v += (m - mean) * (m - mean) }
        return v / snapshot.size
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

        // If process was restarted while a survey activity was on top, this flag can
        // remain stuck true and permanently block post-session probes.
        prefs.edit()
            .putBoolean("survey_activity_open", false)
            .remove("survey_activity_open_since")
            .putBoolean("is_survey_session", false)
            .putInt("survey_session_num", -1)
            .apply()
        
        // Post-session survey data must start empty for each new session.
        // A completed micro-probe patches the just-finished session later; carrying
        // the previous session's persisted result forward leaks stale labels into new rows.
        lastMicroprobeResults = listOf(0, "", 0, 0, 0, 0, 0)
        comparativeRating = 0
        
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

        // Assign session number before survey decision so all survey state is scoped
        // to the correct session and cannot be clobbered by previous-session cleanup.
        currentSessionNumber = if (today != lastDate) 1 else prefs.getInt(KEY_SESSION_NUM, 0) + 1
        prefs.edit().putInt(KEY_SESSION_NUM, currentSessionNumber).putString("last_session_date", today).apply()
        
        // --- Layer 8: Trigger Probabilistic Paired Surveys ---
        val sliderValue = prefs.getFloat("survey_probability", 0.30f).coerceIn(0f, 1f)
        val isSurveySession = when {
            sliderValue == 0f    -> false
            sliderValue >= 0.95f -> true
            else                 -> Math.random() < sliderValue
        }

        Log.i(
            "ReelioDiag",
            "Pre-survey decision: session=$currentSessionNumber slider=$sliderValue selected=$isSurveySession"
        )

        prefs.edit()
            .putBoolean("is_survey_session", isSurveySession)
            .putInt("survey_session_num", if (isSurveySession) currentSessionNumber else -1)
            .putInt("current_mood_before", 0)
            .putString("current_intended_action", "")
            .putInt("probe_post_rating", 0)
            .putInt("probe_regret_score", 0)
            .putInt("probe_focus_after", 0)
            .putInt("probe_mood_delta", 0)
            .putInt("probe_actual_vs_intended", 0)
            .putInt("comparative_rating", 0)
            .remove("survey_completed_for_session")
            .remove("survey_completed_for_session_date")
            .remove("last_microprobe_result")
            .apply()

        if (isSurveySession) showIntentionPrompt()
        // -----------------------------------------------------
        
        cumulativeReels = 0
        reelCount = 0
        lastInteractionGestureAt = 0L
        lastWrittenSessionNum = -1
        lastWrittenCumulativeReel = -1
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
        likeEventCount = 0
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
            val savedSessionStart = sessionStartTime!!
            val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            batteryLevelEnd = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            if (lastReelStartTime != 0L && endTime > lastReelStartTime) processPreviousReel(endTime)
            
            // CRITICAL: Null out session state IMMEDIATELY after the CSV write,
            // BEFORE any survey/notification/database code that could throw.
            // Previously these were at the bottom of the try block. If any line
            // between processPreviousReel() and here threw an exception, the
            // catch block ran but sessionStartTime stayed non-null and
            // lastReelStartTime stayed non-zero. Every subsequent accessibility
            // event then re-entered endCurrentSession via checkSessionTimeout
            // and re-wrote the same last reel — producing 100-344 duplicate
            // CSV rows with identical timestamps (the "poisoned session" bug).
            val savedReelCount = reelCount
            sessionStartTime = null
            lastReelStartTime = 0L
            reelCount = 0
            dwellWindow.clear()
            val hasMeaningfulReelActivity = savedReelCount >= MIN_REELS_FOR_POST_SURVEY
            
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            // Post-session surveys remain paired to sessions where the pre-session
            // intention probe fired. The actual post-survey queue decision now
            // happens later, after current-session inference is available.
            val surveySessionNum = prefs.getInt("survey_session_num", -1)
            val isSurvey = (surveySessionNum == currentSessionNumber)
            val sessionUuid = if (isSurvey && hasMeaningfulReelActivity) UUID.randomUUID().toString() else null
            prefs.edit()
                // Clear flag immediately so duplicate endCurrentSession calls
                // can't create multiple paired-survey candidates for one session.
                .putBoolean("is_survey_session", false)
                .putInt("survey_session_num", -1)
                .apply()
            pendingSessionUuid = sessionUuid

            Log.i(
                "ReelioDiag",
                "Post survey candidate: session=$currentSessionNumber preSurvey=$isSurvey meaningful=$hasMeaningfulReelActivity"
            )
            if (!hasMeaningfulReelActivity) {
                Log.i("ReelioDiag", "Post survey skipped: no reel activity for session=$currentSessionNumber")
            }
            
            sensorManager.unregisterListener(this)
            
            val dwellMin = ((endTime - savedSessionStart) / 60000f).toFloat()
            totalDwellTodayMin += dwellMin
            if (savedReelCount > longestSessionTodayReels) longestSessionTodayReels = savedReelCount
            if (getTimePeriod() == "Morning") morningSessionExists = true
            
            serviceScope.launch(Dispatchers.IO) {
                prefs.edit()
                    .putLong("last_session_end", endTime)
                    .putInt("sessions_today", sessionsToday)
                    .putFloat("total_dwell_today", totalDwellTodayMin)
                    .putInt("longest_session_today", longestSessionTodayReels)
                    .putBoolean("morning_session_exists", morningSessionExists)
                    .apply()
            }
            
            injectSessionToDatabase(savedSessionStart, endTime, pendingSessionUuid, hasMeaningfulReelActivity)
            
            pendingSessionUuid = null
        } catch (e: Exception) {
            // Even if we get here, sessionStartTime and lastReelStartTime are
            // already nulled/zeroed so re-entry won't duplicate CSV rows.
            android.util.Log.e("InstaTracker", "Exception in endCurrentSession", e)
        }
    }
    
    private fun schedulePostSessionProbes(sessionEndTime: Long, sessionNum: Int, doomScore: Float, isSurveySession: Boolean) {
        // Only schedule delayed probe for sessions that were actually sampled.
        if (!isSurveySession) return
        if (doomScore < 0.35f) return

        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, DelayedProbeReceiver::class.java).apply {
            putExtra("session_num", sessionNum)
        }
        val pending = PendingIntent.getBroadcast(
            this,
            sessionNum + 5000,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        // SCHEDULE_EXACT_ALARM requires explicit user grant on API 31+.
        // Fall back to inexact alarm if permission not yet granted.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Log.w("InstaTracker", "Exact alarm permission not granted — using inexact delayed-probe alarm")
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                sessionEndTime + 60 * 60 * 1000L,
                pending
            )
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                sessionEndTime + 60 * 60 * 1000L,
                pending
            )
        }
    }

    private fun queuePostSurveyForCurrentSession(
        sessionEndTime: Long,
        sessionNum: Int,
        sessionUuid: String,
        doomScore: Float
    ) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val prevPending = prefs.getInt("pending_survey_session_num", -1)
        if (prevPending >= 0 && prevPending != sessionNum) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(SURVEY_NOTIF_ID_BASE + prevPending)
            cancelPostSurveyAlarm(prevPending)
        }

        prefs.edit()
            .putInt("pending_survey_session_num", sessionNum)
            .putString("pending_survey_session_uuid", sessionUuid)
            .putString(
                "pending_survey_session_date",
                SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(sessionEndTime))
            )
            .apply()

        val delayMs = schedulePostSurveyPrompt(sessionEndTime, sessionNum)
        Log.i(
            "ReelioDiag",
            "Post survey queued after current-session inference: session=$sessionNum doom=$doomScore delayMs=$delayMs"
        )
    }

    private fun schedulePostSurveyPrompt(sessionEndTime: Long, sessionNum: Int): Long {
        val delayMs = Random.nextLong(POST_SURVEY_DELAY_MIN_MS, POST_SURVEY_DELAY_MAX_MS + 1)
        val triggerAt = sessionEndTime + delayMs
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, PostSurveyReceiver::class.java).apply {
            putExtra("session_num", sessionNum)
        }
        val pending = PendingIntent.getBroadcast(
            this,
            sessionNum + POST_SURVEY_REQUEST_CODE_OFFSET,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Log.w("InstaTracker", "Exact alarm permission not granted - using inexact post-survey alarm")
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
        }

        serviceScope.launch(Dispatchers.IO) {
            prefs.edit().putLong("pending_post_survey_trigger_at", triggerAt).apply()
        }
        return delayMs
    }

    private fun cancelPostSurveyAlarm(sessionNum: Int) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, PostSurveyReceiver::class.java)
        val pending = PendingIntent.getBroadcast(
            this,
            sessionNum + POST_SURVEY_REQUEST_CODE_OFFSET,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pending)
    }
    
    private fun injectSessionToDatabase(startTime: Long, endTime: Long, preGeneratedUuid: String? = null, hasMeaningfulReelActivity: Boolean = true) {
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
        val sessionNum = currentSessionNumber
        
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val sessionDate = sessionStartTime?.let { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(it)) } ?: ""
        val completedSurveySession = prefs.getInt("survey_completed_for_session", -1)
        val completedSurveyDate = prefs.getString("survey_completed_for_session_date", "") ?: ""
        val hasCompletedSurveyForThisSession =
            completedSurveySession == sessionNum && completedSurveyDate == sessionDate

        val rat = if (hasCompletedSurveyForThisSession) prefs.getInt("probe_post_rating", 0) else 0
        val act = prefs.getString("current_intended_action", "") ?: ""
        val mat = if (hasCompletedSurveyForThisSession) prefs.getInt("probe_actual_vs_intended", 0) == 1 else false
        val reg = if (hasCompletedSurveyForThisSession) prefs.getInt("probe_regret_score", 0) else 0
        val mBf = prefs.getInt("current_mood_before", 0)
        val mAf = if (hasCompletedSurveyForThisSession) prefs.getInt("probe_focus_after", 0) else 0
        // Disabled: pre-state and post-focus now use different scales.
        val mDl = 0
        val isSurveySession = preGeneratedUuid != null

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
                        pyDict.callAttr("__setitem__", "DelayedRegretScore", if (hasCompletedSurveyForThisSession) prefs.getInt("delayed_regret_score_${currentSessionNumber}", 0) else 0)
                        pyDict.callAttr("__setitem__", "ComparativeRating", if (hasCompletedSurveyForThisSession) prefs.getInt("comparative_rating", 0) else 0)
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

                        // Log explicit validation warning if present
                        val validationWarningObj = resultMap[py.getBuiltins().callAttr("str", "validation_warning")]
                        if (validationWarningObj != null) {
                            val warningMsg = validationWarningObj.toString()
                            if (warningMsg.isNotBlank()) {
                                Log.w("ALSE", "Model validation warning: $warningMsg")
                            }
                        }

                        android.util.Log.d("ALSE", "HMM Result: label=$doomLabel score=$doomScore conf=$modelConf")

                        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                            .remove("last_microprobe_result")
                            .putFloat("last_session_doom_score", doomScore)
                            .apply()

                        if (isSurveySession && hasMeaningfulReelActivity && preGeneratedUuid != null) {
                            try {
                                queuePostSurveyForCurrentSession(
                                    sessionEndTime = eTime,
                                    sessionNum = sessionNum,
                                    sessionUuid = preGeneratedUuid,
                                    doomScore = doomScore
                                )
                            } catch (e: Exception) {
                                android.util.Log.w("InstaTracker", "queuePostSurveyForCurrentSession failed (non-fatal): ${e.message}")
                            }
                        }

                        try {
                            schedulePostSessionProbes(eTime, sessionNum, doomScore, isSurveySession)
                        } catch (e: Exception) {
                            android.util.Log.w("InstaTracker", "schedulePostSessionProbes failed (non-fatal): ${e.message}")
                        }
                    } catch (t: Throwable) {
                        android.util.Log.e("ALSE", "Python inference failed: ${t.message}")
                        doomScore = computeKotlinFallbackScore()
                        doomLabel = "UNSCORED"
                        modelConf = 0.0f

                        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                            .remove("last_microprobe_result")
                            .putFloat("last_session_doom_score", doomScore)
                            .apply()

                        if (isSurveySession && hasMeaningfulReelActivity && preGeneratedUuid != null) {
                            try {
                                queuePostSurveyForCurrentSession(
                                    sessionEndTime = eTime,
                                    sessionNum = sessionNum,
                                    sessionUuid = preGeneratedUuid,
                                    doomScore = doomScore
                                )
                            } catch (e: Exception) {
                                android.util.Log.w("InstaTracker", "queuePostSurveyForCurrentSession failed after fallback score: ${e.message}")
                            }
                        }

                        try {
                            schedulePostSessionProbes(eTime, sessionNum, doomScore, isSurveySession)
                        } catch (e: Exception) {
                            android.util.Log.w("InstaTracker", "schedulePostSessionProbes failed after fallback score: ${e.message}")
                        }
                    } finally {
                        Log.i("ReelioDiag", "Service releasing PYTHON_LOCK. time=${System.currentTimeMillis()} PID=${android.os.Process.myPid()}")
                    }
                }
                
                val db = DatabaseProvider.getDatabase(this@InstaAccessibilityService)
                // Use the pre-generated UUID if available (survey sessions),
                // otherwise generate a new one (non-survey sessions).
                val sessionUuid = preGeneratedUuid ?: UUID.randomUUID().toString()
                val dbSession = SessionEntity(
                    sessionId = sessionUuid,
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
                
                // For non-survey sessions, store UUID in case it's needed.
                // For survey sessions, UUID was already written synchronously
                // before the notification was shown.
                if (preGeneratedUuid == null) {
                    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                        .putString("pending_survey_session_uuid", sessionUuid)
                        .apply()
                }
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
        // Use the earliest recorded interaction latency, regardless of type.
        // Previously only likeLatencyMs was used, which gave 0 for reels where the
        // user shared/commented/saved but did not like.
        val firstInteractionLatency = listOf(likeLatencyMs, commentLatencyMs, shareLatencyMs, saveLatencyMs)
            .filter { it > 0L }
            .minOrNull() ?: -1L
        val interactionDwellRatio = if (firstInteractionLatency > 0 && dwell.ms > 0) firstInteractionLatency.toFloat() / dwell.ms.toFloat() else 0f
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

        // Defensive copies: these lists are mutated by onAccessibilityEvent
        // and onSensorChanged on the main thread. processPreviousReel may be
        // running on a coroutine worker thread.
        val scrollSnap = ArrayList(scrollDistances)
        val avgSpeed = if (scrollSnap.isNotEmpty()) scrollSnap.average() else 0.0
        val maxSpeed = if (scrollSnap.isNotEmpty()) scrollSnap.maxOrNull()?.toDouble() ?: 0.0 else 0.0

        val accelSnap = ArrayList(accelMagnitudes)
        val accVar = calculateVariance(accelSnap).toDouble()
        val isStationary = if (accVar < 0.2 && accelSnap.isNotEmpty()) 1 else 0

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
            likeEventCount % 2, if (commented) 1 else 0, if (shared) 1 else 0, if (saved) 1 else 0,  // modulo-2: odd=liked, even=unliked/net-zero
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
            0,
            currentIntention,
            0,
            0,
            currentMoodBefore,
            0,
            0,
            sleepStart, sleepEnd,
            prefs.getString("previous_context", "unknown") ?: "unknown",
            0,
            0,
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
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val sessNum = prefs.getInt("pending_survey_session_num", currentSessionNumber)
        showPostSurveyNotification(this, sessNum)
    }
    
    private fun showIntentionPrompt() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Cancel any stale intention notification from a previous session
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val prevSessNum = prefs.getInt(KEY_SESSION_NUM, 0)
        if (prevSessNum > 0 && prevSessNum != currentSessionNumber) {
            nm.cancel(prevSessNum + 1000)
        }
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
            .setTimeoutAfter(5 * 60 * 1000L) // auto-dismiss after 5 min
        nm.notify(currentSessionNumber + 1000, builder.build())
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
