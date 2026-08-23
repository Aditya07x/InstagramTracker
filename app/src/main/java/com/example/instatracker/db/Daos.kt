package com.example.instatracker.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
interface CsvRowDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(row: CsvRowEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(rows: List<CsvRowEntity>)

    @Query("SELECT * FROM csv_rows ORDER BY timestamp ASC")
    fun getAllRows(): List<CsvRowEntity>

    @Query("SELECT * FROM csv_rows WHERE sessionNumber = :sessionNum ORDER BY timestamp ASC")
    fun getRowsForSession(sessionNum: Int): List<CsvRowEntity>

    @Update
    fun updateAll(rows: List<CsvRowEntity>)

    @Query("UPDATE csv_rows SET csvLine = :csvLine WHERE id = :id")
    fun updateRow(id: String, csvLine: String)

    @Query("DELETE FROM csv_rows")
    fun deleteAll()

    @Query("SELECT COUNT(*) FROM csv_rows")
    fun getRowCount(): Int
}
