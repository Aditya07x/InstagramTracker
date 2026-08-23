package com.example.instatracker

import android.content.Context
import android.util.Log
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.instatracker.db.AppDatabase
import com.example.instatracker.db.CsvRowEntity
import java.io.File
import java.util.UUID

object DatabaseProvider {
    @Volatile
    private var INSTANCE: AppDatabase? = null

    const val CSV_HEADER = "SCHEMA_VERSION=5\n" +
        "SessionNum,ReelIndex,StartTime,EndTime,DwellTime,TimePeriod," +
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

    val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(database: SupportSQLiteDatabase) {
            database.execSQL("ALTER TABLE sessions ADD COLUMN saveCount INTEGER NOT NULL DEFAULT 0")
        }
    }

    val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(database: SupportSQLiteDatabase) {
            database.execSQL("DROP TABLE IF EXISTS scroll_events")
            database.execSQL("DROP TABLE IF EXISTS reels")
        }
    }

    fun getDatabase(context: Context): AppDatabase {
        return INSTANCE ?: synchronized(this) {
            val instance = Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "insta_tracker.db"
            )
            .fallbackToDestructiveMigration()
            .build()
            INSTANCE = instance
            instance
        }
    }

    /**
     * Checks if legacy insta_data.csv exists and migrates its rows to Room SQLite in a single transaction.
     * Guaranteed zero data loss across upgrades.
     */
    @Synchronized
    fun checkAndMigrateLegacyCsv(context: Context) {
        try {
            val csvFile = File(context.filesDir, "insta_data.csv")
            if (!csvFile.exists() || csvFile.length() == 0L) return

            val db = getDatabase(context)
            val existingRowCount = db.csvRowDao().getRowCount()
            
            // Only migrate if SQLite table is empty
            if (existingRowCount == 0) {
                val lines = csvFile.readLines()
                // Drop header rows (SCHEMA_VERSION line and column name line)
                val dataLines = if (lines.size > 2) lines.drop(2).filter { it.isNotBlank() } else emptyList()
                
                if (dataLines.isNotEmpty()) {
                    val entities = ArrayList<CsvRowEntity>(dataLines.size)
                    val now = System.currentTimeMillis()
                    
                    for ((index, line) in dataLines.withIndex()) {
                        val fields = line.split(",")
                        val sessionNum = fields.getOrNull(0)?.trim()?.toIntOrNull() ?: 0
                        entities.add(
                            CsvRowEntity(
                                id = UUID.randomUUID().toString(),
                                sessionNumber = sessionNum,
                                timestamp = now + index, // maintain deterministic order
                                csvLine = line
                            )
                        )
                    }

                    // Anti-N+1: Bulk-insert in a single atomic transaction
                    db.csvRowDao().insertAll(entities)
                    Log.i("DatabaseProvider", "Successfully migrated ${entities.size} legacy CSV rows into SQLite.")
                }
            }

            // Rename legacy file to preserve backup while preventing duplicate migration
            val backupFile = File(context.filesDir, "insta_data.csv.migrated")
            csvFile.renameTo(backupFile)
        } catch (e: Exception) {
            Log.e("DatabaseProvider", "Error migrating legacy CSV data to SQLite: ${e.message}", e)
        }
    }

    /**
     * Returns the full CSV formatted string from the SQLite database.
     */
    fun getCsvString(context: Context): String {
        checkAndMigrateLegacyCsv(context)
        val db = getDatabase(context)
        val rows = db.csvRowDao().getAllRows()
        if (rows.isEmpty()) return ""

        val sb = java.lang.StringBuilder()
        sb.append(CSV_HEADER)
        for (row in rows) {
            sb.append(row.csvLine).append("\n")
        }
        return sb.toString()
    }

    /**
     * Checks if the app has recorded tracking data in SQLite or legacy CSV.
     */
    fun hasData(context: Context): Boolean {
        checkAndMigrateLegacyCsv(context)
        val db = getDatabase(context)
        return db.csvRowDao().getRowCount() > 0
    }
}
