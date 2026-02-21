package com.example.instatracker.db

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "reels",
    foreignKeys = [
        ForeignKey(
            entity = SessionEntity::class,
            parentColumns = ["sessionId"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class ReelEntity(
    @PrimaryKey(autoGenerate = true)
    val reelId: Long = 0,

    val sessionId: String,
    val reelIndex: Int,

    val startTime: Long,
    val endTime: Long? = null,

    val dwellTimeSec: Double = 0.0,
    val avgScrollSpeed: Double = 0.0,
    val maxScrollSpeed: Double = 0.0,
    val scrollFrictionIndex: Double = 0.0,

    val liked: Boolean = false,
    val commented: Boolean = false,
    val paused: Boolean = false,

    val immersionScore: Double = 0.0
)
