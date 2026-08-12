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

    @Query("UPDATE sessions SET postSessionRating = :rating, regretScore = :regret, moodAfter = :focusAfter, actualVsIntendedMatch = :intentMatch, lastSessionDoomScore = :doomScore WHERE sessionId = :sessionId")
    fun updateSurveyFields(sessionId: String, rating: Int, regret: Int, focusAfter: Int, intentMatch: Boolean, doomScore: Float)

    @Query("SELECT COUNT(*) FROM sessions WHERE date(sessionStart/1000, 'unixepoch') = date('now')")
    fun sessionsToday(): Int

    @Query("SELECT * FROM sessions ORDER BY sessionStart DESC LIMIT 1")
    fun getLastSession(): SessionEntity?
}
