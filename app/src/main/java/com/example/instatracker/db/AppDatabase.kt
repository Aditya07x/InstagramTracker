package com.example.instatracker.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        CsvRowEntity::class
    ],
    version = 4,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun csvRowDao(): CsvRowDao
}
