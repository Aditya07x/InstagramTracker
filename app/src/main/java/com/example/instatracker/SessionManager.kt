package com.example.instatracker

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.util.Calendar
import java.util.UUID
import java.util.ArrayDeque
import kotlin.math.abs
import kotlin.math.min

// Reverting SessionManager to the state viewed in Step 286.
import com.example.instatracker.db.SessionDao
import com.example.instatracker.db.SessionEntity

object SessionManager {

    private const val BURST_WINDOW_MS = 30_000L
    private const val BURST_DENSITY_THRESHOLD = 0.5 // scrolls / second
    private const val IDLE_TIMEOUT_MS = 20_000L
    private const val MAX_INTERVALS = 50
    private const val MAX_DURATION_SECONDS_NORM = 1_800f
    private const val MAX_SCROLLS_PER_MINUTE_NORM = 60f
    private const val MAX_REEL_STREAK_NORM = 50f
    private const val MAX_VELOCITY_PROXY_NORM = 5f
    private const val MAX_REEL_EXPOSURE_SECONDS_NORM = 60f
    private const val MAX_BURST_COUNT_NORM = 10f
    private const val MIN_REEL_EXPOSURE_MS = 450L

    private const val IMMERSION_WEIGHT_DURATION = 0.3f
    private const val IMMERSION_WEIGHT_VELOCITY = 0.25f
    private const val IMMERSION_WEIGHT_REEL_EXPOSURE = 0.2f
    private const val IMMERSION_WEIGHT_BURST = 0.15f
    private const val IMMERSION_WEIGHT_LATE_NIGHT = 0.1f

    private val mutex = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private lateinit var sessionDao: SessionDao

    @Volatile
    private var currentSessionId: String? = null
    private var sessionStartTime: Long = 0L
    private var lastScrollTime: Long = 0L
    private var lastActivityTime: Long = 0L

    var scrollCount: Int = 0
        private set
    var currentReelStreak: Int = 0
        private set
    var maxReelStreak: Int = 0
        private set

    private var burstCountInternal: Int = 0
    val burstCount: Int
        get() = burstCountInternal

    private val scrollTimestamps = ArrayDeque<Long>()
    private val interScrollIntervals = ArrayDeque<Long>()

    private var inBurst: Boolean = false
    private var burstStartTime: Long = 0L
    private val burstDurations = mutableListOf<Long>()

    private var currentReelIndex: Int? = null
    private var currentReelStartTime: Long = 0L
    private var lastReelChangeTime: Long = 0L
    private val reelExposureDurations = mutableListOf<Long>()
    private var totalReelsViewedInternal: Int = 0

    var likeCount: Int = 0
        private set
    var commentClickCount: Int = 0
        private set
    var shareCount: Int = 0
        private set

    private var idleJob: Job? = null

    @Volatile
    private var isActive: Boolean = false

    fun init(context: Context) {
        val db = DatabaseProvider.getDatabase(context)
        sessionDao = db.sessionDao()
    }

    fun startSession() {
        scope.launch {
            mutex.withLock {
                if (isActive) return@withLock
                currentSessionId = UUID.randomUUID().toString()
                sessionStartTime = System.currentTimeMillis()
                lastScrollTime = 0L
                lastActivityTime = sessionStartTime

                scrollCount = 0
                currentReelStreak = 0
                maxReelStreak = 0
                burstCountInternal = 0
                scrollTimestamps.clear()
                interScrollIntervals.clear()

                inBurst = false
                burstStartTime = 0L
                burstDurations.clear()

                currentReelIndex = null
                currentReelStartTime = 0L
                lastReelChangeTime = 0L
                reelExposureDurations.clear()
                totalReelsViewedInternal = 0

                likeCount = 0
                commentClickCount = 0
                shareCount = 0

                isActive = true
                scheduleIdleCheckLocked()
            }
        }
    }

    fun endSession() {
        scope.launch {
            mutex.withLock {
                if (!isActive || currentSessionId == null) return@withLock
                finalizeAndPersistSessionLocked(System.currentTimeMillis())
            }
        }
    }

    fun onInstagramForegroundGained() {
        startSession()
    }

    fun onInstagramForegroundLost() {
        endSession()
    }

    fun onReelScroll(reelIndex: Int?) {
        scope.launch {
            mutex.withLock {
                val now = System.currentTimeMillis()
                ensureSessionStartedLocked(now)
                markUserActiveLocked(now)
                handleScrollLocked(now)
                handleReelExposureLocked(reelIndex, now)
            }
        }
    }

    fun onInteraction(interactionType: InteractionType) {
        scope.launch {
            mutex.withLock {
                val now = System.currentTimeMillis()
                ensureSessionStartedLocked(now)
                markUserActiveLocked(now)
                when (interactionType) {
                    InteractionType.LIKE -> likeCount++
                    InteractionType.COMMENT -> commentClickCount++
                    InteractionType.SHARE -> shareCount++
                    InteractionType.SAVE -> {
                        // SessionManager does not currently persist a save counter.
                    }
                }
            }
        }
    }

    fun onGenericActivity() {
        scope.launch {
            mutex.withLock {
                if (!isActive) return@withLock
                val now = System.currentTimeMillis()
                markUserActiveLocked(now)
            }
        }
    }

    fun isSessionActive(): Boolean = isActive

    private fun ensureSessionStartedLocked(now: Long) {
        if (!isActive) {
            currentSessionId = UUID.randomUUID().toString()
            sessionStartTime = now
            lastScrollTime = 0L
            lastActivityTime = now

            scrollCount = 0
            currentReelStreak = 0
            maxReelStreak = 0
            burstCountInternal = 0
            scrollTimestamps.clear()
            interScrollIntervals.clear()

            inBurst = false
            burstStartTime = 0L
            burstDurations.clear()

            currentReelIndex = null
            currentReelStartTime = 0L
            lastReelChangeTime = 0L
            reelExposureDurations.clear()
            totalReelsViewedInternal = 0

            likeCount = 0
            commentClickCount = 0
            shareCount = 0

            isActive = true
            scheduleIdleCheckLocked()
        }
    }

    private fun markUserActiveLocked(now: Long) {
        lastActivityTime = now
        scheduleIdleCheckLocked()
    }

    private fun scheduleIdleCheckLocked() {
        idleJob?.cancel()
        idleJob = scope.launch {
            delay(IDLE_TIMEOUT_MS)
            mutex.withLock {
                val now = System.currentTimeMillis()
                if (isActive && now - lastActivityTime >= IDLE_TIMEOUT_MS) {
                    finalizeAndPersistSessionLocked(now)
                }
            }
        }
    }

    private fun handleScrollLocked(now: Long) {
        scrollCount++

        val intervalSinceLastScroll = if (lastScrollTime > 0L) now - lastScrollTime else Long.MAX_VALUE
        if (lastScrollTime > 0L) {
            interScrollIntervals.addLast(intervalSinceLastScroll)
            while (interScrollIntervals.size > MAX_INTERVALS) {
                interScrollIntervals.removeFirst()
            }
        }
        lastScrollTime = now

        if (intervalSinceLastScroll < 7_000L) {
            currentReelStreak++
        } else {
            currentReelStreak = 1
        }
        if (currentReelStreak > maxReelStreak) {
            maxReelStreak = currentReelStreak
        }

        scrollTimestamps.addLast(now)
        while (scrollTimestamps.isNotEmpty() && now - scrollTimestamps.first() > BURST_WINDOW_MS) {
            scrollTimestamps.removeFirst()
        }

        val density = if (scrollTimestamps.isNotEmpty()) {
            scrollTimestamps.size.toDouble() / (BURST_WINDOW_MS.toDouble() / 1000.0)
        } else 0.0

        if (!inBurst && density >= BURST_DENSITY_THRESHOLD) {
            inBurst = true
            burstStartTime = now
            burstCountInternal++
        } else if (inBurst && density < BURST_DENSITY_THRESHOLD) {
            inBurst = false
            val duration = now - burstStartTime
            if (duration > 0) {
                burstDurations.add(duration)
            }
            burstStartTime = 0L
        }
    }

    private fun handleReelExposureLocked(reelIndex: Int?, now: Long) {
        if (reelIndex == null) return

        if (currentReelIndex == null) {
            currentReelIndex = reelIndex
            currentReelStartTime = now
            lastReelChangeTime = now
            return
        }

        if (reelIndex != currentReelIndex) {
            val exposure = now - currentReelStartTime
            if (exposure > MIN_REEL_EXPOSURE_MS) {
                reelExposureDurations.add(exposure)
                totalReelsViewedInternal++
            }
            currentReelIndex = reelIndex
            currentReelStartTime = now
            lastReelChangeTime = now
        }
    }

    private suspend fun finalizeAndPersistSessionLocked(endTime: Long) {
        if (!isActive || currentSessionId == null) return

        idleJob?.cancel()
        idleJob = null

        if (currentReelIndex != null && currentReelStartTime > 0L) {
            val exposure = endTime - currentReelStartTime
            if (exposure > MIN_REEL_EXPOSURE_MS) {
                reelExposureDurations.add(exposure)
                totalReelsViewedInternal++
            }
            currentReelIndex = null
            currentReelStartTime = 0L
        }

        if (inBurst && burstStartTime > 0L) {
            val duration = endTime - burstStartTime
            if (duration > 0) {
                burstDurations.add(duration)
            }
            inBurst = false
            burstStartTime = 0L
        }

        val durationSeconds = (endTime - sessionStartTime) / 1000

        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val isLateNight = hour in 0..4
        val timeCategory = when (hour) {
            in 0..4 -> "LateNight"
            in 5..11 -> "Morning"
            in 12..16 -> "Afternoon"
            in 17..20 -> "Evening"
            else -> "Night"
        }

        val normDuration = min(durationSeconds.toFloat(), MAX_DURATION_SECONDS_NORM) / MAX_DURATION_SECONDS_NORM

        val scrollsPerMinute = if (durationSeconds > 0) {
            (scrollCount.toFloat() / durationSeconds) * 60f
        } else 0f

        val normScrollDensity = min(scrollsPerMinute, MAX_SCROLLS_PER_MINUTE_NORM) / MAX_SCROLLS_PER_MINUTE_NORM

        val normStreak = min(maxReelStreak.toFloat(), MAX_REEL_STREAK_NORM) / MAX_REEL_STREAK_NORM

        val intervalsSeconds = interScrollIntervals.map { it.toDouble() / 1000.0 }
        val meanInterval = if (intervalsSeconds.isNotEmpty()) {
            intervalsSeconds.average().toFloat()
        } else 0f

        val varianceInterval = if (intervalsSeconds.size > 1) {
            val mean = intervalsSeconds.average()
            intervalsSeconds.fold(0.0) { acc, v ->
                val d = v - mean
                acc + d * d
            }.toFloat() / intervalsSeconds.size.toFloat()
        } else 0f

        val accelerationValues = if (intervalsSeconds.size >= 2) {
            intervalsSeconds.zipWithNext { a, b -> abs(b - a) }
        } else emptyList()

        val peakAcceleration = if (accelerationValues.isNotEmpty()) {
            accelerationValues.maxOrNull()?.toFloat() ?: 0f
        } else 0f

        val velocityProxy = if (meanInterval > 0f) {
            1f / meanInterval
        } else 0f

        val minInterval = intervalsSeconds.minOrNull() ?: 0.0
        val maxVelocityProxy = if (minInterval > 0.0) {
            (1.0 / minInterval).toFloat()
        } else 0f

        val avgReelExposureSeconds: Float
        val maxReelExposureSeconds: Float
        if (reelExposureDurations.isNotEmpty()) {
            val avgMs = reelExposureDurations.average().toFloat()
            val maxMs = reelExposureDurations.maxOrNull()?.toFloat() ?: 0f
            avgReelExposureSeconds = avgMs / 1000f
            maxReelExposureSeconds = maxMs / 1000f
        } else {
            avgReelExposureSeconds = 0f
            maxReelExposureSeconds = 0f
        }

        val avgBurstDurationSeconds: Float
        val maxBurstDurationSeconds: Float
        if (burstDurations.isNotEmpty()) {
            val avgMs = burstDurations.average().toFloat()
            val maxMs = burstDurations.maxOrNull()?.toFloat() ?: 0f
            avgBurstDurationSeconds = avgMs / 1000f
            maxBurstDurationSeconds = maxMs / 1000f
        } else {
            avgBurstDurationSeconds = 0f
            maxBurstDurationSeconds = 0f
        }

        val normVelocityProxy = min(velocityProxy, MAX_VELOCITY_PROXY_NORM) / MAX_VELOCITY_PROXY_NORM

        val normReelExposure = min(avgReelExposureSeconds, MAX_REEL_EXPOSURE_SECONDS_NORM) / MAX_REEL_EXPOSURE_SECONDS_NORM

        val normBurstIntensity = if (burstCountInternal > 0 && durationSeconds > 0) {
            val burstsPer30s = burstCountInternal.toFloat() / (durationSeconds.toFloat() / 30f)
            min(burstsPer30s, MAX_BURST_COUNT_NORM) / MAX_BURST_COUNT_NORM
        } else 0f

        val lateNightScore = if (isLateNight) 1f else 0f

        val immersionScoreRaw =
            IMMERSION_WEIGHT_DURATION * normDuration +
                IMMERSION_WEIGHT_VELOCITY * normVelocityProxy +
                IMMERSION_WEIGHT_REEL_EXPOSURE * normReelExposure +
                IMMERSION_WEIGHT_BURST * normBurstIntensity +
                IMMERSION_WEIGHT_LATE_NIGHT * lateNightScore

        val immersionScore = immersionScoreRaw.coerceIn(0f, 1f)

        val session = SessionEntity(
            sessionId = currentSessionId!!,
            sessionStart = sessionStartTime,
            sessionEnd = endTime,
            durationSeconds = durationSeconds,
            timeOfDayCategory = timeCategory,
            isLateNight = isLateNight,
            totalScrolls = scrollCount,
            maxReelStreak = maxReelStreak,
            burstCount = burstCountInternal,
            scrollsPerMinute = scrollsPerMinute,
            likeCount = likeCount,
            commentClickCount = commentClickCount,
            shareCount = shareCount,
            immersionScore = immersionScore,
            totalReelsViewed = totalReelsViewedInternal,
            avgReelExposure = avgReelExposureSeconds,
            maxReelExposure = maxReelExposureSeconds,
            meanScrollInterval = meanInterval,
            scrollIntervalVariance = varianceInterval,
            peakAcceleration = peakAcceleration,
            velocityProxy = velocityProxy,
            maxVelocityProxy = maxVelocityProxy,
            avgBurstDuration = avgBurstDurationSeconds,
            maxBurstDuration = maxBurstDurationSeconds,
            // Layer 4
            sessionDwellTrend = 0f,
            earlyVsLateRatio = 0f,
            interactionRate = 0f,
            interactionDropoff = 0f,
            scrollIntervalCV = 0f,
            scrollRhythmEntropy = 0f,
            // Layer 5
            sessionsToday = 0,
            totalDwellTodayMin = 0f,
            longestSessionTodayReels = 0,
            lastSessionDoomScore = 0f,
            rollingDoomRate7d = 0f,
            doomStreakLength = 0,
            morningSessionExists = false,
            // Layer 6
            circadianPhase = 0f,
            sleepProxyScore = 0f,
            estimatedSleepDurationH = 0f,
            consistencyScore = 0f,
            // Layer 8
            postSessionRating = 0,
            intendedAction = "",
            actualVsIntendedMatch = false,
            regretScore = 0,
            moodBefore = 0,
            moodAfter = 0,
            moodDelta = 0
        )

        withContext(Dispatchers.IO) {
            sessionDao.insert(session)
        }
        
        currentSessionId = null
        isActive = false
    }
}
