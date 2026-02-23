package com.example.instatracker

import android.content.Context
import android.content.SharedPreferences

class PreferencesHelper(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("reelio_prefs", Context.MODE_PRIVATE)

    // Daily usage limit in minutes (0 = disabled)
    var dailyLimitMinutes: Int
        get() = prefs.getInt("daily_limit_minutes", 0)
        set(value) = prefs.edit().putInt("daily_limit_minutes", value).apply()

    // Session timeout in seconds (20–300)
    var sessionTimeoutSeconds: Int
        get() = prefs.getInt("session_timeout_seconds", 20)
        set(value) = prefs.edit().putInt("session_timeout_seconds", value).apply()

    // Notifications enabled/disabled
    var notificationsEnabled: Boolean
        get() = prefs.getBoolean("notifications_enabled", true)
        set(value) = prefs.edit().putBoolean("notifications_enabled", value).apply()

    // Dark theme enabled
    var darkThemeEnabled: Boolean
        get() = prefs.getBoolean("dark_theme_enabled", true)
        set(value) = prefs.edit().putBoolean("dark_theme_enabled", value).apply()

    // Last weekly summary sent (timestamp in ms)
    var lastWeeklySummarySent: Long
        get() = prefs.getLong("last_weekly_summary_sent", 0)
        set(value) = prefs.edit().putLong("last_weekly_summary_sent", value).apply()

    // Doom-free streak start date (ISO format YYYY-MM-DD)
    var streakStartDate: String
        get() = prefs.getString("streak_start_date", "") ?: ""
        set(value) = prefs.edit().putString("streak_start_date", value).apply()

    // Clear all data
    fun clearAllData() {
        prefs.edit().clear().apply()
    }
}
