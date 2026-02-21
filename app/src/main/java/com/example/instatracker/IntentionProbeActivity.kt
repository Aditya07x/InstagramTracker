package com.example.instatracker

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.io.File
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import kotlin.random.Random

// Triggered at Session START (sampled at ~30%)
class IntentionProbeActivity : Activity() {
    
    private var moodBefore = 0
    private var intendedAction = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 30% Sampling Rate
        if (Random.nextFloat() > 0.3f) {
            finish()
            return
        }

        showMoodPrompt()
    }
    
    private fun showMoodPrompt() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.parseColor("#0B1220"))
        }
        
        val title = TextView(this).apply {
            text = "Reelio Pre-Session"
            textSize = 24f
            setTextColor(Color.parseColor("#22D3EE"))
            setPadding(0, 0, 0, 16)
            gravity = Gravity.CENTER
        }
        
        val question = TextView(this).apply {
            text = "Rate your mood right now (1-5)"
            textSize = 18f
            setTextColor(Color.parseColor("#F3F4F6"))
            setPadding(0, 0, 0, 48)
            gravity = Gravity.CENTER
        }
        
        val buttonsLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        
        for (i in 1..5) {
            val btn = Button(this).apply {
                text = i.toString()
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#1F2A3D"))
                setOnClickListener {
                    moodBefore = i
                    showIntentionPrompt()
                }
            }
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(8, 0, 8, 0) }
            buttonsLayout.addView(btn, params)
        }
        
        layout.addView(title)
        layout.addView(question)
        layout.addView(buttonsLayout)
        setContentView(layout)
    }

    private fun showIntentionPrompt() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.parseColor("#0B1220"))
        }

        val question = TextView(this).apply {
            text = "What do you want to do?"
            textSize = 18f
            setTextColor(Color.parseColor("#F3F4F6"))
            setPadding(0, 0, 0, 48)
            gravity = Gravity.CENTER
        }

        val options = listOf("Browse", "Specific Search", "Habit", "Killing Time")
        
        layout.addView(question)
        
        for (opt in options) {
            val btn = Button(this).apply {
                text = opt
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#1F2A3D"))
                width = 500
                setOnClickListener {
                    intendedAction = opt
                    savePreSessionData()
                    finish()
                }
            }
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 8, 0, 8) }
            layout.addView(btn, params)
        }
        
        setContentView(layout)
    }

    private fun savePreSessionData() {
        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("current_mood_before", moodBefore)
            .putString("current_intended_action", intendedAction)
            .apply()
    }
}
