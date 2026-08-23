package com.example.instatracker.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "csv_rows",
    indices = [
        Index(value = ["sessionNumber"]),
        Index(value = ["timestamp"])
    ]
)
data class CsvRowEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val sessionNumber: Int,
    val timestamp: Long,
    val csvLine: String
)
