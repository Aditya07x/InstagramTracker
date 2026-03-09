package com.example.instatracker

import android.view.accessibility.AccessibilityEvent

enum class InteractionType {
    LIKE,
    COMMENT,
    SHARE,
    SAVE
}

object InteractionDetector {

    fun detectInteraction(event: AccessibilityEvent): InteractionType? {
        val source = event.source ?: return null
        try {
            val viewId = source.viewIdResourceName.orEmpty().lowercase()
            val className = source.className?.toString()?.lowercase().orEmpty()
            val contentDesc = source.contentDescription?.toString()?.lowercase().orEmpty()
            val text = event.text?.joinToString(" ")?.lowercase().orEmpty()
            val combinedLabel = "$contentDesc $text"
            val words = extractWords(combinedLabel)

            if (isLike(viewId, className, combinedLabel, words)) {
                return InteractionType.LIKE
            }
            if (isComment(viewId, className, combinedLabel, words)) {
                return InteractionType.COMMENT
            }
            if (isShare(viewId, className, combinedLabel, words)) {
                return InteractionType.SHARE
            }
            if (isSave(viewId, className, combinedLabel, words)) {
                return InteractionType.SAVE
            }

            return null
        } finally {
            source.recycle()
        }
    }

    private val likeWords = setOf("like", "liked", "curtir", "curtido", "gusta")
    private val commentWords = setOf("comment", "comments", "coment", "comentar", "reply", "replies")
    private val shareWords = setOf("share", "shared", "send", "enviar", "compart", "compartir")
    private val saveWords = setOf("save", "saved", "bookmark", "collection", "ribbon")

    private fun extractWords(label: String): Set<String> {
        return label
            .split(Regex("[^a-z0-9]+"))
            .filter { it.isNotBlank() }
            .toSet()
    }

    private fun isLikelyActionLabel(label: String, words: Set<String>): Boolean {
        return label.length in 1..40 && words.size in 1..5
    }

    private fun idContainsAny(viewId: String, tokens: Set<String>): Boolean {
        return tokens.any { viewId.contains(it) }
    }

    private fun hasAnyActionWord(words: Set<String>, tokens: Set<String>): Boolean {
        return words.any { word -> tokens.any { token -> word == token || word.startsWith(token) } }
    }

    private fun isLike(viewId: String, className: String, label: String, words: Set<String>): Boolean {
        if (idContainsAny(viewId, setOf("like", "heart"))) return true
        if (className.contains("button") && hasAnyActionWord(words, likeWords)) return true
        if (isLikelyActionLabel(label, words) && hasAnyActionWord(words, likeWords)) return true
        return false
    }

    private fun isComment(viewId: String, className: String, label: String, words: Set<String>): Boolean {
        if (idContainsAny(viewId, setOf("comment", "reply"))) return true
        if (className.contains("button") && hasAnyActionWord(words, commentWords)) return true
        if (isLikelyActionLabel(label, words) && hasAnyActionWord(words, commentWords)) return true
        return false
    }

    private fun isShare(viewId: String, className: String, label: String, words: Set<String>): Boolean {
        if (idContainsAny(viewId, setOf("share", "send", "forward"))) return true
        if (className.contains("button") && hasAnyActionWord(words, shareWords)) return true
        if (isLikelyActionLabel(label, words) && hasAnyActionWord(words, shareWords)) return true
        return false
    }

    private fun isSave(viewId: String, className: String, label: String, words: Set<String>): Boolean {
        if (idContainsAny(viewId, setOf("save", "bookmark", "collection", "ribbon"))) return true
        if (className.contains("button") && hasAnyActionWord(words, saveWords)) return true
        if (isLikelyActionLabel(label, words) && hasAnyActionWord(words, saveWords)) return true
        return false
    }
}

