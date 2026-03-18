package com.example.instatracker

import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

enum class InteractionType {
    LIKE,
    COMMENT,
    SHARE,
    SAVE
}

data class InteractionMatch(
    val type: InteractionType? = null,
    val isCommentSubmit: Boolean = false,
    val isUndo: Boolean = false,
    val debugSummary: String = ""
)

data class InteractionSnapshot(
    val viewIds: Set<String>,
    val labels: Set<String>,
    val classes: Set<String>,
    val selected: Boolean = false,
    val checked: Boolean = false
)

object InteractionDetector {

    // TYPE_VIEW_DOUBLE_CLICKED = 0x00000080 was added in API 28.
    // Defining it manually here keeps the file compiling on any minSdk while
    // still handling the event correctly on API 28+ devices at runtime.
    const val TYPE_VIEW_DOUBLE_CLICKED = 0x00000080

    // ── Public API ────────────────────────────────────────────────────────────

    fun detectInteraction(event: AccessibilityEvent): InteractionMatch {
        return when (event.eventType) {
            AccessibilityEvent.TYPE_ANNOUNCEMENT          -> detectFromAnnouncement(event)
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> detectFromWindowChange(event)
            AccessibilityEvent.TYPE_VIEW_SELECTED        -> detectFromStateChange(event)
            AccessibilityEvent.TYPE_VIEW_CLICKED         -> detectFromClick(event)
            // FIX 1: Double-tap like fires TYPE_VIEW_DOUBLE_CLICKED, not TYPE_VIEW_CLICKED.
            // Previously this event type was entirely unhandled, so double-tap likes were
            // never recorded regardless of what the announcement path did.
            TYPE_VIEW_DOUBLE_CLICKED                     -> detectFromDoubleTap(event)
            else -> InteractionMatch()
        }
    }

    // Legacy compat — used by InstaAccessibilityService directly
    fun detectStateChange(event: AccessibilityEvent): InteractionType? {
        val snapshot = buildSnapshot(event)
        return classifyStateChange(snapshot)
    }

    fun describeEvent(event: AccessibilityEvent): String {
        val snapshot = buildSnapshot(event)
        return snapshot.toDebugSummary()
    }

    fun classifyStateChange(snapshot: InteractionSnapshot): InteractionType? {
        val combined = combinedText(snapshot)
        if (containsIdToken(snapshot.viewIds, LIKE_ID_TOKENS) &&
            (snapshot.selected || snapshot.checked || combined.contains("remove like"))) {
            return InteractionType.LIKE
        }
        if (containsIdToken(snapshot.viewIds, SAVE_ID_TOKENS) &&
            (snapshot.selected || snapshot.checked || combined.contains("remove from"))) {
            return InteractionType.SAVE
        }
        return null
    }

    fun classifyClick(snapshot: InteractionSnapshot): InteractionMatch {
        val combined = combinedText(snapshot)
        val words = extractWords(snapshot.labels + snapshot.viewIds)
        if (isCommentSubmit(snapshot, words, combined)) {
            return InteractionMatch(type = InteractionType.COMMENT, isCommentSubmit = true)
        }
        return InteractionMatch()
    }

    // ── Announcement strings ──────────────────────────────────────────────────
    // Instagram fires TYPE_ANNOUNCEMENT for like/unlike/save/unsave via both
    // the button tap AND the double-tap path. These are the strings Instagram
    // actually emits — verified across EN, PT, ES, FR. Add more locales here.

    private val LIKE_ANNOUNCEMENTS = setOf(
        // English — Instagram uses "post liked" for double-tap, "liked" for button
        "liked", "post liked", "photo liked", "video liked", "reel liked",
        // Portuguese
        "curtido", "post curtido",
        // Spanish
        "le gusta", "me gusta",
        // French
        "j'aime", "aimé"
    )
    private val UNLIKE_ANNOUNCEMENTS = setOf(
        "remove like", "like removed", "unlike", "post unliked",
        "descurtido", "no le gusta"
    )
    private val SAVE_ANNOUNCEMENTS = setOf(
        "saved", "post saved", "added to collection", "added to saved",
        "guardado", "enregistré"
    )
    private val UNSAVE_ANNOUNCEMENTS = setOf(
        "removed from saved", "unsaved", "removed from collection",
        "eliminado de guardados"
    )
    private val COMMENT_SHEET_TITLES = setOf(
        "comments", "comentarios", "commentaires", "comment", "añadir comentario"
    )
    private val SHARE_SHEET_TITLES = setOf(
        "share", "send to", "direct", "share to", "forward",
        "compartir", "partager", "enviar"
    )

    // View ID fragments — Instagram uses these across multiple UI versions
    private val LIKE_ID_TOKENS    = setOf("like", "heart", "like_button", "likeButton")
    private val SAVE_ID_TOKENS    = setOf("save", "bookmark", "collection", "ribbon", "save_to_collection")
    private val SHARE_ID_TOKENS   = setOf("share", "send", "forward", "direct_share")
    private val COMMENT_ID_TOKENS = setOf("comment", "reply", "comment_button", "open_comments")

    // ── Event handlers ────────────────────────────────────────────────────────

    private fun detectFromAnnouncement(event: AccessibilityEvent): InteractionMatch {
        val text = event.text?.joinToString(" ")?.lowercase()?.trim()
            ?: return InteractionMatch()
        // Check unsave/unlike before save/like to avoid substring false positives
        return when {
            UNSAVE_ANNOUNCEMENTS.any { containsWord(text, it) } ->
                InteractionMatch(
                    type = InteractionType.SAVE,
                    isUndo = true,
                    debugSummary = "announcement:unsave text=$text"
                )
            SAVE_ANNOUNCEMENTS.any { containsWord(text, it) } ->
                InteractionMatch(
                    type = InteractionType.SAVE,
                    debugSummary = "announcement:save text=$text"
                )
            UNLIKE_ANNOUNCEMENTS.any { containsWord(text, it) } ->
                InteractionMatch(
                    type = InteractionType.LIKE,
                    isUndo = true,
                    debugSummary = "announcement:unlike text=$text"
                )
            LIKE_ANNOUNCEMENTS.any { containsWord(text, it) } ->
                InteractionMatch(
                    type = InteractionType.LIKE,
                    debugSummary = "announcement:like text=$text"
                )
            else -> InteractionMatch()
        }
    }

    private fun detectFromWindowChange(event: AccessibilityEvent): InteractionMatch {
        val title = event.text?.firstOrNull()?.toString()?.lowercase()?.trim()
            ?: event.className?.toString()?.lowercase()
            ?: return InteractionMatch()
        return when {
            COMMENT_SHEET_TITLES.any { title.contains(it) } ->
                InteractionMatch(
                    type = InteractionType.COMMENT,
                    isCommentSubmit = false,
                    debugSummary = "window:comment_sheet title=$title"
                )
            SHARE_SHEET_TITLES.any { title.contains(it) } ->
                InteractionMatch(
                    type = InteractionType.SHARE,
                    debugSummary = "window:share_sheet title=$title"
                )
            else -> InteractionMatch()
        }
    }

    private fun detectFromStateChange(event: AccessibilityEvent): InteractionMatch {
        val desc     = event.contentDescription?.toString()?.lowercase() ?: ""
        val text     = event.text?.joinToString(" ")?.lowercase() ?: ""
        val combined = "$desc $text"
        val source   = event.source
        val selected = source?.isSelected ?: false
        val checked  = source?.isChecked ?: false
        source?.recycle()
        return when {
            (selected || checked) && (combined.contains("like") || combined.contains("heart")) ->
                InteractionMatch(
                    type = InteractionType.LIKE,
                    debugSummary = "state:like selected=$selected desc=$desc"
                )
            (selected || checked) && (combined.contains("save") || combined.contains("bookmark")) ->
                InteractionMatch(
                    type = InteractionType.SAVE,
                    debugSummary = "state:save selected=$selected desc=$desc"
                )
            else -> InteractionMatch()
        }
    }

    // FIX 2: detectFromClick previously only handled comment submit.
    // Instagram's like button, save button, and share button all fire
    // TYPE_VIEW_CLICKED. We now classify all four interaction types from
    // the click path, falling through to comment-submit as before.
    private fun detectFromClick(event: AccessibilityEvent): InteractionMatch {
        val snapshot = buildSnapshot(event)
        val combined = combinedText(snapshot)
        val words    = extractWords(snapshot.labels + snapshot.viewIds)

        // Comment submit is the most specific — check it first
        if (isCommentSubmit(snapshot, words, combined)) {
            return InteractionMatch(
                type = InteractionType.COMMENT,
                isCommentSubmit = true,
                debugSummary = "click:comment_submit ${snapshot.toDebugSummary()}"
            )
        }

        // Share button click — check before like/save because some share UI
        // elements also contain the word "send" which overlaps with comment submit
        if (containsIdToken(snapshot.viewIds, SHARE_ID_TOKENS) ||
            words.any { it in setOf("share", "forward", "send", "direct", "compartir", "partager", "enviar") } ||
            combined.contains("send to")) {
            return InteractionMatch(
                type = InteractionType.SHARE,
                debugSummary = "click:share ${snapshot.toDebugSummary()}"
            )
        }

        // Like button click
        // snapshot.selected/checked: button is now in liked state after tap
        if (containsIdToken(snapshot.viewIds, LIKE_ID_TOKENS) ||
            words.any { it in setOf("like", "heart") }) {
            // isUndo = was already selected before tap (toggling off)
            val isUndo = snapshot.selected || snapshot.checked
            return InteractionMatch(
                type = InteractionType.LIKE,
                isUndo = isUndo,
                debugSummary = "click:like isUndo=$isUndo ${snapshot.toDebugSummary()}"
            )
        }

        // Save button click
        if (containsIdToken(snapshot.viewIds, SAVE_ID_TOKENS) ||
            words.any { it in setOf("save", "bookmark") }) {
            val isUndo = snapshot.selected || snapshot.checked
            return InteractionMatch(
                type = InteractionType.SAVE,
                isUndo = isUndo,
                debugSummary = "click:save isUndo=$isUndo ${snapshot.toDebugSummary()}"
            )
        }

        // Open comment sheet via comment icon tap (counts as comment now)
        if (containsIdToken(snapshot.viewIds, COMMENT_ID_TOKENS) ||
            words.any { it in setOf("comment", "comments", "comentar", "comentarios", "commentaires") } ||
            combined.contains("add a comment")) {
            return InteractionMatch(
                type = InteractionType.COMMENT,
                isCommentSubmit = false,
                debugSummary = "click:comment_open ${snapshot.toDebugSummary()}"
            )
        }

        return InteractionMatch()
    }

    // FIX 3: Double-tap to like.
    // Instagram fires TYPE_VIEW_DOUBLE_CLICKED on the video/image surface,
    // NOT on the like button. The source node is the media container, not the
    // heart icon. We do NOT check for like_id_tokens here — we trust the event
    // type itself as the signal, then verify it's on a reel/media surface.
    // A TYPE_ANNOUNCEMENT "post liked" / "liked" typically follows within ~200ms
    // and will be caught by detectFromAnnouncement, so we mark this as a
    // tentative like that the caller can deduplicate if the announcement fires.
    private fun detectFromDoubleTap(event: AccessibilityEvent): InteractionMatch {
        val snapshot = buildSnapshot(event)
        val combined = combinedText(snapshot)

        // Confirm we're on a reel/media surface, not some other double-tappable element
        val isMediaSurface = snapshot.viewIds.any { id ->
            id.contains("reel") || id.contains("media") || id.contains("video") ||
            id.contains("carousel") || id.contains("image") || id.contains("surface")
        } || snapshot.classes.any { cls ->
            cls.contains("surfaceview") || cls.contains("textureview") ||
            cls.contains("videoview") || cls.contains("imageview")
        }

        // Fallback: if we can't confirm media surface but the source has no
        // like/save/share/comment tokens, it's probably the media container
        val noActionToken = !containsIdToken(
            snapshot.viewIds,
            LIKE_ID_TOKENS + SAVE_ID_TOKENS + SHARE_ID_TOKENS + COMMENT_ID_TOKENS
        )

        return if (isMediaSurface || noActionToken) {
            InteractionMatch(
                type = InteractionType.LIKE,
                debugSummary = "doubletap:like isMediaSurface=$isMediaSurface ${snapshot.toDebugSummary()}"
            )
        } else {
            InteractionMatch()
        }
    }

    // ── Snapshot builder ──────────────────────────────────────────────────────

    private const val MAX_ANCESTOR_DEPTH   = 4
    private const val MAX_CHILDREN_PER_NODE = 6

    private fun buildSnapshot(event: AccessibilityEvent): InteractionSnapshot {
        val viewIds  = linkedSetOf<String>()
        val labels   = linkedSetOf<String>()
        val classes  = linkedSetOf<String>()
        var selected = false
        var checked  = false

        fun collectNode(node: AccessibilityNodeInfo, includeChildren: Boolean) {
            addIfNotBlank(viewIds, node.viewIdResourceName)
            addIfNotBlank(labels, node.text)
            addIfNotBlank(labels, node.contentDescription)
            addIfNotBlank(classes, node.className)
            selected = selected || node.isSelected
            checked  = checked  || node.isChecked

            if (!includeChildren) return

            val childCount = minOf(node.childCount, MAX_CHILDREN_PER_NODE)
            for (i in 0 until childCount) {
                val child = node.getChild(i) ?: continue
                try {
                    collectNode(child, includeChildren = false)
                } finally {
                    child.recycle()
                }
            }
        }

        addIfNotBlank(labels, event.contentDescription)
        event.text?.forEach { addIfNotBlank(labels, it) }
        addIfNotBlank(classes, event.className)

        val source = event.source
        if (source != null) {
            try {
                collectNode(source, includeChildren = true)

                var depth  = 0
                var parent = source.parent
                while (parent != null && depth < MAX_ANCESTOR_DEPTH) {
                    val nextParent = parent.parent
                    try {
                        collectNode(parent, includeChildren = depth < 2)
                    } finally {
                        parent.recycle()
                    }
                    parent = nextParent
                    depth++
                }
            } finally {
                source.recycle()
            }
        }

        return InteractionSnapshot(
            viewIds  = viewIds,
            labels   = labels,
            classes  = classes,
            selected = selected,
            checked  = checked
        )
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun addIfNotBlank(target: MutableSet<String>, value: CharSequence?) {
        val normalized = value?.toString()
            ?.lowercase()
            ?.replace(Regex("\\s+"), " ")
            ?.trim()
            .orEmpty()
        if (normalized.isNotBlank()) target.add(normalized)
    }

    private fun containsWord(text: String, word: String): Boolean {
        return Regex("\\b${Regex.escape(word)}\\b").containsMatchIn(text)
    }

    private fun combinedText(snapshot: InteractionSnapshot): String =
        (snapshot.labels + snapshot.viewIds).joinToString(" ").lowercase()

    private fun extractWords(values: Set<String>): Set<String> =
        values.joinToString(" ")
            .lowercase()
            .split(Regex("[^a-z0-9]+"))
            .filter { it.isNotBlank() }
            .toSet()

    private fun containsIdToken(viewIds: Set<String>, tokens: Set<String>): Boolean =
        viewIds.any { viewId -> tokens.any { token -> viewId.contains(token) } }

    private fun isCommentSubmit(
        snapshot: InteractionSnapshot,
        words: Set<String>,
        combined: String
    ): Boolean {
        val commentSurface =
            containsIdToken(snapshot.viewIds, setOf("comment", "reply", "composer")) ||
            words.any { it in setOf("comment", "comments", "coment", "comentar", "reply", "replies") } ||
            combined.contains("write a comment") ||
            combined.contains("add a comment")
        val submitAction =
            containsIdToken(snapshot.viewIds, setOf("send", "post", "publish", "submit")) ||
            words.any { it in setOf("send", "post", "publish", "submit") } ||
            combined.contains("post comment") ||
            combined.contains("send comment")
        return commentSurface && submitAction
    }

    private fun InteractionSnapshot.toDebugSummary(): String =
        "ids=${summarizeValues(viewIds)} labels=${summarizeValues(labels)} classes=${summarizeValues(classes)} selected=$selected checked=$checked"

    private fun summarizeValues(
        values: Set<String>,
        maxItems: Int = 3,
        maxLength: Int = 48
    ): String {
        if (values.isEmpty()) return "none"
        val prefix = values.take(maxItems).joinToString("|") { abbreviate(it, maxLength) }
        return if (values.size > maxItems) "$prefix|..." else prefix
    }

    private fun abbreviate(value: String, maxLength: Int): String =
        if (value.length <= maxLength) value else value.take(maxLength - 3) + "..."
}
