package com.example.instatracker

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

object SurveyUIUtils {

    // ── Reelio landing-page inspired palette (solid, pastel, high-contrast) ──
    private const val BG = "#EDE8DF"
    private const val SURFACE = "#FDFAF6"
    private const val CARD_BASE = "#F7F3EC"
    private const val PRIMARY = "#6B3FA0"
    private const val MAGENTA = "#C4563A"
    private const val WARNING = "#C4973A"
    private const val TEXT = "#1A1612"
    private const val TEXT_DIM = "#6A5E56"
    private const val TEXT_FAINT = "#9A8E84"
    private const val BORDER = "#D8D0C4"
    private const val TRACK = "#D4CCBF"
    private const val BADGE_BG = "#4A2580"
    private const val BADGE_TEXT = "#F3EFFA"

    private fun c(hex: String) = Color.parseColor(hex)

    private fun tint(color: Int, alpha: Int): Int {
        val a = alpha.coerceIn(0, 255)
        return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun mix(a: Int, b: Int, t: Float): Int {
        val p = t.coerceIn(0f, 1f)
        val r = (Color.red(a) + ((Color.red(b) - Color.red(a)) * p)).toInt()
        val g = (Color.green(a) + ((Color.green(b) - Color.green(a)) * p)).toInt()
        val bl = (Color.blue(a) + ((Color.blue(b) - Color.blue(a)) * p)).toInt()
        return Color.rgb(r, g, bl)
    }

    private fun isLightColor(color: Int): Boolean {
        val yiq = (Color.red(color) * 299 + Color.green(color) * 587 + Color.blue(color) * 114) / 1000
        return yiq >= 170
    }

    private fun pastel(accent: Int): Int = mix(c(CARD_BASE), accent, 0.28f)
    private fun pastelStrong(accent: Int): Int = mix(c(CARD_BASE), accent, 0.42f)

    private fun dp(ctx: Context, v: Float) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.resources.displayMetrics).toInt()

    private fun dpF(ctx: Context, v: Float) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.resources.displayMetrics)

    // ── Root container: solid cream background + blob view + scroll ──────────
    fun createRootWithBlobs(context: Context, palette: BlobBackgroundView.Palette): Pair<FrameLayout, ScrollView> {
        val frame = FrameLayout(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(c(BG))
        }

        val blobs = BlobBackgroundView(context, palette).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        val scroll = ScrollView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }

        frame.addView(blobs)
        frame.addView(scroll)
        return frame to scroll
    }

    // Legacy helper
    fun createScrollRoot(context: Context): ScrollView {
        return ScrollView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(c(BG))
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }
    }

    // ── Main content layout ───────────────────────────────────────────────────
    fun createMainLayout(context: Context): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            val hPad = dp(context, 24f)
            setPadding(hPad, dp(context, 44f), hPad, dp(context, 34f))

            alpha = 0f
            translationY = dpF(context, 12f)
            post {
                animate()
                    .alpha(1f)
                    .translationY(0f)
                    .setDuration(260)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
        }
    }

    // ── Top system label ──────────────────────────────────────────────────────
    fun createSystemLabel(context: Context): TextView {
        return TextView(context).apply {
            text = "reelio  ·  session check-in"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f)
            setTextColor(c(TEXT_FAINT))
            typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            letterSpacing = 0.07f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 20f)
            layoutParams = lp
        }
    }

    // ── Progress ring (solid colors only) ────────────────────────────────────
    fun createProgressRing(context: Context, totalSteps: Int, currentStep: Int, accentColor: String = PRIMARY): FrameLayout {
        val accent = c(accentColor.take(7))
        val size = dp(context, 52f)
        val strokeWidth = dpF(context, 3f)

        return FrameLayout(context).apply {
            val lp = LinearLayout.LayoutParams(size, size)
            lp.gravity = Gravity.CENTER_HORIZONTAL
            lp.bottomMargin = dp(context, 20f)
            layoutParams = lp

            val arcView = object : View(context) {
                private val trackPaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                    style = android.graphics.Paint.Style.STROKE
                    this.strokeWidth = strokeWidth
                    color = c(TRACK)
                    strokeCap = android.graphics.Paint.Cap.ROUND
                }
                private val fillPaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                    style = android.graphics.Paint.Style.STROKE
                    this.strokeWidth = strokeWidth
                    color = accent
                    strokeCap = android.graphics.Paint.Cap.ROUND
                }

                override fun onDraw(canvas: android.graphics.Canvas) {
                    super.onDraw(canvas)
                    val pad = strokeWidth / 2f + 2f
                    val rect = RectF(pad, pad, width - pad, height - pad)
                    canvas.drawArc(rect, -90f, 360f, false, trackPaint)
                    val sweep = (currentStep.toFloat() / totalSteps) * 360f
                    canvas.drawArc(rect, -90f, sweep, false, fillPaint)
                }
            }
            arcView.layoutParams = FrameLayout.LayoutParams(size, size)
            addView(arcView)

            val label = TextView(context).apply {
                text = "$currentStep of $totalSteps"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                setTextColor(c(TEXT_DIM))
                typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            addView(label)
        }
    }

    // Legacy dot indicator
    fun createStepIndicator(context: Context, totalSteps: Int, currentStep: Int): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 24f)
            layoutParams = lp

            for (i in 1..totalSteps) {
                val isActive = i == currentStep
                val isDone = i < currentStep
                val segment = View(context).apply {
                    val width = if (isActive) dp(context, 34f) else dp(context, 10f)
                    val segLp = LinearLayout.LayoutParams(width, dp(context, 6f))
                    segLp.setMargins(dp(context, 4f), 0, dp(context, 4f), 0)
                    layoutParams = segLp
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        cornerRadius = dpF(context, 4f)
                        when {
                            isActive -> setColor(c(PRIMARY))
                            isDone -> setColor(c(TEXT_FAINT))
                            else -> setColor(c(TRACK))
                        }
                    }
                }
                addView(segment)
            }
        }
    }

    // ── Badge pill ────────────────────────────────────────────────────────────
    fun createBadge(context: Context, label: String, color: String = PRIMARY): TextView {
        val accent = c(color.take(7))
        val badgeBg = if (isLightColor(accent)) c(BADGE_BG) else mix(accent, Color.BLACK, 0.32f)

        return TextView(context).apply {
            text = label
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            setTextColor(c(BADGE_TEXT))
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            letterSpacing = 0.1f
            gravity = Gravity.CENTER
            val hPad = dp(context, 14f)
            val vPad = dp(context, 7f)
            setPadding(hPad, vPad, hPad, vPad)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpF(context, 999f)
                setColor(badgeBg)
                setStroke(1, mix(badgeBg, Color.WHITE, 0.20f))
            }
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.gravity = Gravity.CENTER_HORIZONTAL
            lp.bottomMargin = dp(context, 16f)
            layoutParams = lp
        }
    }

    // Kept function name for compatibility; now intentionally solid text (no gradient)
    @Suppress("UNUSED_PARAMETER")
    fun createGradientTitle(context: Context, titleText: String, accentColor: String = PRIMARY): TextView {
        return TextView(context).apply {
            text = titleText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 25f)
            setTextColor(c(TEXT))
            typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
            letterSpacing = -0.02f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 6f)
            layoutParams = lp
        }
    }

    fun createTitleView(context: Context, titleText: String): TextView {
        return TextView(context).apply {
            text = titleText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            setTextColor(c(TEXT))
            typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
            letterSpacing = -0.02f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 8f)
            layoutParams = lp
        }
    }

    fun createQuestionView(context: Context, questionText: String): TextView {
        return TextView(context).apply {
            text = questionText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTextColor(c(TEXT_DIM))
            gravity = Gravity.CENTER
            setLineSpacing(dpF(context, 4f), 1f)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 24f)
            layoutParams = lp
        }
    }

    fun createSubtitle(context: Context, text: String): TextView {
        return TextView(context).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTextColor(c(TEXT_DIM))
            letterSpacing = 0.01f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 18f)
            layoutParams = lp
        }
    }

    fun createDivider(context: Context): View {
        return View(context).apply {
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                1
            )
            lp.bottomMargin = dp(context, 18f)
            layoutParams = lp
            setBackgroundColor(c(BORDER))
        }
    }

    // ── Solid pastel option card (high contrast text) ────────────────────────
    @Suppress("UNUSED_PARAMETER")
    fun createOptionButton(
        context: Context,
        label: String,
        emoji: String = "",
        accentColor: String = PRIMARY,
        onClick: () -> Unit
    ): LinearLayout {
        val accent = c(accentColor.take(7))
        val baseCardColor = pastel(accent)

        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            val hPad = dp(context, 18f)
            val vPad = dp(context, 18f)
            setPadding(hPad, vPad, hPad, vPad)

            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpF(context, 14f)
                setColor(baseCardColor)
                setStroke(1, mix(accent, Color.WHITE, 0.18f))
            }

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 10f)
            layoutParams = lp

            val dot = View(context).apply {
                val dotLp = LinearLayout.LayoutParams(dp(context, 8f), dp(context, 8f))
                dotLp.rightMargin = dp(context, 14f)
                layoutParams = dotLp
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(mix(accent, c(TEXT), 0.18f))
                }
            }

            val textView = TextView(context).apply {
                text = label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                setTextColor(c(TEXT))
                typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            addView(dot)
            addView(textView)

            alpha = 0f
            translationY = dpF(context, 20f)

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                animateCardTap(this, accent, onClick)
            }
        }
    }

    fun staggerCards(parent: LinearLayout, startIndex: Int, count: Int) {
        for (i in 0 until count) {
            val child = parent.getChildAt(startIndex + i) ?: continue
            child.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay(i * 55L)
                .setDuration(200)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }
    }

    fun createSkipButton(context: Context, onSkip: () -> Unit): TextView {
        return TextView(context).apply {
            text = "skip for now"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTextColor(c(TEXT_DIM))
            typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            letterSpacing = 0.02f
            gravity = Gravity.CENTER
            paintFlags = paintFlags or Paint.UNDERLINE_TEXT_FLAG

            val hPad = dp(context, 16f)
            val vPad = dp(context, 12f)
            setPadding(hPad, vPad, hPad, vPad)

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.gravity = Gravity.CENTER_HORIZONTAL
            lp.topMargin = dp(context, 14f)
            layoutParams = lp
            setOnClickListener { onSkip() }
        }
    }

    fun createButtonLayout(context: Context): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 14f)
            layoutParams = lp
        }
    }

    fun createStyledButton(context: Context, label: String, onClick: () -> Unit): TextView {
        return TextView(context).apply {
            text = label
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(c(TEXT))
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, dp(context, 14f), 0, dp(context, 14f))

            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpF(context, 14f)
                setColor(c(SURFACE))
                setStroke(1, c(BORDER))
            }

            setOnClickListener {
                animateButtonTap(this, label.toIntOrNull() ?: 0, onClick)
            }
        }
    }

    fun createMoodScaleLabels(context: Context, leftLabel: String, rightLabel: String): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dp(context, 6f)
            lp.bottomMargin = dp(context, 4f)
            layoutParams = lp

            val leftTv = TextView(context).apply {
                text = leftLabel
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                setTextColor(c(TEXT_FAINT))
                letterSpacing = 0.05f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            val rightTv = TextView(context).apply {
                text = rightLabel
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                setTextColor(c(TEXT_FAINT))
                letterSpacing = 0.05f
                gravity = Gravity.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            addView(leftTv)
            addView(rightTv)
        }
    }

    private fun animateCardTap(view: LinearLayout, accent: Int, onClick: () -> Unit) {
        val parent = view.parent as? LinearLayout
        parent?.let {
            for (i in 0 until it.childCount) {
                val sibling = it.getChildAt(i)
                if (sibling != view && sibling is LinearLayout) {
                    sibling.animate().alpha(0.45f).setDuration(130).start()
                }
            }
        }

        view.animate()
            .scaleX(0.985f)
            .scaleY(0.985f)
            .setDuration(80)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                view.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpF(view.context, 14f)
                    setColor(pastelStrong(accent))
                    setStroke(2, mix(accent, Color.BLACK, 0.1f))
                }

                view.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(120)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction {
                        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                        view.postDelayed({ onClick() }, 170)
                    }
                    .start()
            }
            .start()
    }

    private fun animateButtonTap(view: TextView, value: Int, onClick: () -> Unit) {
        val accentHex = when {
            value <= 2 -> PRIMARY
            value == 3 -> WARNING
            else -> MAGENTA
        }
        val accent = c(accentHex)

        view.animate()
            .scaleX(0.96f)
            .scaleY(0.96f)
            .setDuration(70)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                view.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpF(view.context, 14f)
                    setColor(pastelStrong(accent))
                    setStroke(2, mix(accent, Color.BLACK, 0.1f))
                }
                view.setTextColor(c(TEXT))
                view.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(110)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction { onClick() }
                    .start()
            }
            .start()
    }

    fun startPulseAnimation(view: View): ValueAnimator {
        return ValueAnimator.ofFloat(1f, 0.55f, 1f).apply {
            duration = 1800
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { view.alpha = it.animatedValue as Float }
            start()
        }
    }
}
