package com.example.instatracker.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface SessionDao {
    @Insert
    fun insert(session: SessionEntity)

    @Query("UPDATE sessions SET sessionEnd = :endTime WHERE sessionId = :sessionId")
    fun updateEndTime(sessionId: String, endTime: Long)

    @Query("SELECT COUNT(*) FROM sessions WHERE date(sessionStart/1000, 'unixepoch') = date('now')")
    fun sessionsToday(): Int

    @Query("SELECT * FROM sessions ORDER BY sessionStart DESC LIMIT 1")
    fun getLastSession(): SessionEntity?
}

@Dao
interface ReelDao {
    @Insert
    fun insert(reel: ReelEntity): Long

    @Query("SELECT * FROM reels WHERE sessionId = :sessionId ORDER BY reelIndex ASC")
    fun getReelsForSession(sessionId: String): List<ReelEntity>

    @Query("SELECT * FROM reels")
    fun getAll(): List<ReelEntity>

    @androidx.room.Update
    fun update(reel: ReelEntity)
}

@Dao
interface ScrollDao {
    @Insert
    fun insert(event: ScrollEventEntity): Long
}
