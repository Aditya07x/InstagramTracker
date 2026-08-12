package com.example.instatracker

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.instatracker.db.AppDatabase

object DatabaseProvider {
    @Volatile
    private var INSTANCE: AppDatabase? = null

    val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(database: SupportSQLiteDatabase) {
            database.execSQL("ALTER TABLE sessions ADD COLUMN saveCount INTEGER NOT NULL DEFAULT 0")
        }
    }

    // reels/scroll_events were never written to (dead ReelEntity/ScrollEventEntity code path,
    // superseded by the flat insta_data.csv). Dropping them here preserves sessions data instead
    // of relying on fallbackToDestructiveMigration(), which would wipe the whole database.
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
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .fallbackToDestructiveMigration()
            .build()
            INSTANCE = instance
            instance
        }
    }
}
