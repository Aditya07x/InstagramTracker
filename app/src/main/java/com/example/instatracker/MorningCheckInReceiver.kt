package com.example.instatracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MorningCheckInReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val activityIntent = Intent(context, DelayedProbeActivity::class.java).apply {
            putExtra("is_morning", true)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        context.startActivity(activityIntent)
    }
}
