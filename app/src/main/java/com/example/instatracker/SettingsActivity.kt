package com.example.instatracker

import android.app.AlertDialog
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {
    private lateinit var prefs: PreferencesHelper

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PreferencesHelper(this)

        // Simple vertical layout
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
            setPadding(20, 20, 20, 20)
        }

        // Title
        layout.addView(TextView(this).apply {
            text = "Settings"
            textSize = 20f
            setTextColor(0xFFF3F4F6.toInt())
            setPadding(0, 0, 0, 16)
        })

        // Daily Limit Toggle
        layout.addView(createLimitSection())

        // Session Timeout Slider
        layout.addView(createTimeoutSection())

        // Notifications Toggle
        layout.addView(createNotificationToggle())

        // Theme Toggle
        layout.addView(createThemeToggle())

        // Clear Data Button
        layout.addView(createClearDataButton())

        setContentView(layout)
    }

    private fun createLimitSection(): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setPadding(0, 16, 0, 16)
        }

        container.addView(TextView(this).apply {
            text = "Daily Usage Limit (minutes)"
            textSize = 14f
            setTextColor(0xFFF3F4F6.toInt())
            setPadding(0, 0, 0, 8)
        })

        val limitText = TextView(this).apply {
            text = if (prefs.dailyLimitMinutes == 0) "Disabled" else "${prefs.dailyLimitMinutes} min"
            textSize = 12f
            setTextColor(0xFF9CA3AF.toInt())
        }
        container.addView(limitText)

        val seekBar = SeekBar(this).apply {
            max = 180  // 0–180 minutes
            progress = prefs.dailyLimitMinutes
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                    limitText.text = if (progress == 0) "Disabled" else "$progress min"
                    prefs.dailyLimitMinutes = progress
                }
                override fun onStartTrackingTouch(sb: SeekBar?) {}
                override fun onStopTrackingTouch(sb: SeekBar?) {}
            })
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        container.addView(seekBar)
        return container
    }

    private fun createTimeoutSection(): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setPadding(0, 16, 0, 16)
        }

        container.addView(TextView(this).apply {
            text = "Session Timeout (seconds)"
            textSize = 14f
            setTextColor(0xFFF3F4F6.toInt())
            setPadding(0, 0, 0, 8)
        })

        val timeoutText = TextView(this).apply {
            text = "${prefs.sessionTimeoutSeconds}s"
            textSize = 12f
            setTextColor(0xFF9CA3AF.toInt())
        }
        container.addView(timeoutText)

        val seekBar = SeekBar(this).apply {
            max = 28  // 20–300 seconds in 10s increments
            progress = (prefs.sessionTimeoutSeconds - 20) / 10
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                    val seconds = 20 + (progress * 10)
                    timeoutText.text = "${seconds}s"
                    prefs.sessionTimeoutSeconds = seconds
                }
                override fun onStartTrackingTouch(sb: SeekBar?) {}
                override fun onStopTrackingTouch(sb: SeekBar?) {}
            })
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        container.addView(seekBar)
        return container
    }

    private fun createNotificationToggle(): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setPadding(0, 16, 0, 16)
        }

        container.addView(TextView(this).apply {
            text = "Enable Notifications"
            textSize = 14f
            setTextColor(0xFFF3F4F6.toInt())
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        })

        container.addView(Switch(this).apply {
            isChecked = prefs.notificationsEnabled
            setOnCheckedChangeListener { _, isChecked ->
                prefs.notificationsEnabled = isChecked
            }
        })

        return container
    }

    private fun createThemeToggle(): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setPadding(0, 16, 0, 16)
        }

        container.addView(TextView(this).apply {
            text = "Dark Theme"
            textSize = 14f
            setTextColor(0xFFF3F4F6.toInt())
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        })

        container.addView(Switch(this).apply {
            isChecked = prefs.darkThemeEnabled
            setOnCheckedChangeListener { _, isChecked ->
                prefs.darkThemeEnabled = isChecked
                // Would restart activity here in a real app
            }
        })

        return container
    }

    private fun createClearDataButton(): TextView {
        return TextView(this).apply {
            text = "Clear All Data"
            textSize = 14f
            setTextColor(0xFFEF4444.toInt())
            setPadding(12, 16, 12, 16)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                AlertDialog.Builder(this@SettingsActivity)
                    .setTitle("Clear All Data?")
                    .setMessage("This will delete all sessions, preferences, and streak data. This cannot be undone.")
                    .setPositiveButton("Clear") { _, _ ->
                        prefs.clearAllData()
                        finish()
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }
    }
}
