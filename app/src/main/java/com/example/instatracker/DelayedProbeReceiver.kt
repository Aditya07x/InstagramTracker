package com.example.instatracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DelayedProbeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val sessionNum = intent.getIntExtra("session_num", -1)
        val activityIntent = Intent(context, DelayedProbeActivity::class.java).apply {
            putExtra("session_num", sessionNum)
            putExtra("is_morning", false)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        context.startActivity(activityIntent)
    }
}
