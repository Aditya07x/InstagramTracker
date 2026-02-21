package com.example.instatracker.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val sessionId: String = UUID.randomUUID().toString(),
    val sessionStart: Long,
    val sessionEnd: Long?,
    val durationSeconds: Long,
    val timeOfDayCategory: String,
    val isLateNight: Boolean,
    val totalScrolls: Int,
    val maxReelStreak: Int,
    val burstCount: Int,
    val scrollsPerMinute: Float,
    val likeCount: Int,
    val commentClickCount: Int,
    val shareCount: Int,
    val immersionScore: Float,
    val totalReelsViewed: Int,
    val avgReelExposure: Float,
    val maxReelExposure: Float,
    val meanScrollInterval: Float,
    val scrollIntervalVariance: Float,
    val peakAcceleration: Float,
    val velocityProxy: Float,
    val maxVelocityProxy: Float,
    val avgBurstDuration: Float,
    val maxBurstDuration: Float,
    
    // Layer 4: Within-Session Derived Features
    val sessionDwellTrend: Float = 0f,
    val earlyVsLateRatio: Float = 0f,
    val interactionRate: Float = 0f,
    val interactionDropoff: Float = 0f,
    val scrollIntervalCV: Float = 0f,
    val scrollRhythmEntropy: Float = 0f,
    
    // Layer 5: Cross-Session Memory Features
    val sessionsToday: Int = 0,
    val totalDwellTodayMin: Float = 0f,
    val longestSessionTodayReels: Int = 0,
    val lastSessionDoomScore: Float = 0f,
    val rollingDoomRate7d: Float = 0f,
    val doomStreakLength: Int = 0,
    val morningSessionExists: Boolean = false,
    
    // Layer 6: Circadian and Physiological Proxies
    val circadianPhase: Float = 0f,
    val sleepProxyScore: Float = 0f,
    val estimatedSleepDurationH: Float = 0f,
    val consistencyScore: Float = 0f,
    
    // Layer 8: Active Micro-Probes
    val postSessionRating: Int = 0,
    val intendedAction: String = "",
    val actualVsIntendedMatch: Boolean = false,
    val regretScore: Int = 0,
    val moodBefore: Int = 0,
    val moodAfter: Int = 0,
    val moodDelta: Int = 0
)
