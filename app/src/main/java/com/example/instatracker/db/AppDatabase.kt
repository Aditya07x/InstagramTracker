package com.example.instatracker.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        SessionEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
}
