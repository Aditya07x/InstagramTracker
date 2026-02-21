// Updated DashboardActivity.kt to improve error handling, fix race conditions, and manage isProcessing flag properly.

package com.example.instagramtracker

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity

class DashboardActivity : AppCompatActivity() {
    private var isProcessing: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)
        loadData()
    }

    private fun loadData() {
        if (isProcessing) return
        isProcessing = true

        try {
            // Simulate data loading
            // If there's an error loading data, handle it gracefully
            val result = fetchData()  // assume this is a method that fetches data
            updateUI(result)
        } catch (e: Exception) {
            handleError(e)
        } finally {
            isProcessing = false
        }
    }

    private fun fetchData(): String {
        // Placeholder for fetching data logic, which may throw errors
        throw Exception("Data loading error") // For testing error handling
    }

    private fun updateUI(data: String) {
        // Update UI with fetched data
        Log.d("DashboardActivity", "Data received: $data")
    }

    private fun handleError(e: Exception) {
        // Handle the error accordingly
        Log.e("DashboardActivity", "Error: ${e.message}")
    }
}