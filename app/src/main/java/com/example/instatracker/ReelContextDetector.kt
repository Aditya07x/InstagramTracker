package com.example.instatracker

import android.graphics.Rect
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.content.res.Resources
import java.util.ArrayDeque

data class ReelScrollInfo(
    val reelIndex: Int?,
    val isInReelContext: Boolean
)

object ReelContextDetector {

    fun isInReelContext(root: AccessibilityNodeInfo?, resources: Resources): Boolean {
        if (root == null) return false

        val displayMetrics = resources.displayMetrics
        val screenHeight = displayMetrics.heightPixels

        var hasFullscreenChild = false
        var hasReelsLabel = false
        var hasPagerLikeContainer = false

        val queue: ArrayDeque<AccessibilityNodeInfo> = ArrayDeque()
        queue.add(root)

        val rect = Rect()

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()

            try {
                node.getBoundsInScreen(rect)
                val height = rect.height()
                if (height >= (0.8f * screenHeight)) {
                    hasFullscreenChild = true
                }

                val className = node.className?.toString().orEmpty()
                if (className.contains("RecyclerView", ignoreCase = true) ||
                    className.contains("ViewPager", ignoreCase = true) ||
                    className.contains("ViewPager2", ignoreCase = true)
                ) {
                    hasPagerLikeContainer = true
                }

                val text = node.text?.toString().orEmpty()
                val description = node.contentDescription?.toString().orEmpty()
                val combinedLabel = (text + " " + description).lowercase()
                if ("reels" in combinedLabel) {
                    hasReelsLabel = true
                }

                for (i in 0 until node.childCount) {
                    node.getChild(i)?.let { queue.add(it) }
                }
            } finally {
                node.recycle()
            }
        }

        return (hasFullscreenChild && hasPagerLikeContainer) || hasReelsLabel
    }

    fun extractReelScrollInfo(
        event: AccessibilityEvent,
        root: AccessibilityNodeInfo?,
        resources: Resources
    ): ReelScrollInfo {
        val inReelContext = isInReelContext(root, resources)

        val fromIndex = if (event.fromIndex != AccessibilityEvent.INVALID_POSITION) {
            event.fromIndex
        } else null
        val toIndex = if (event.toIndex != AccessibilityEvent.INVALID_POSITION) {
            event.toIndex
        } else null

        val reelIndex = when {
            toIndex != null -> toIndex
            fromIndex != null -> fromIndex
            else -> null
        }

        return ReelScrollInfo(
            reelIndex = reelIndex,
            isInReelContext = inReelContext
        )
    }
}

