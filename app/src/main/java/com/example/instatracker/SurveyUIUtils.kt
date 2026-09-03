package com.example.instatracker

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
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

    data class KnobOption(
        val label: String,
        val accentColor: String,
        val emoji: String = ""
    )

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

    fun createChoiceKnob(
        context: Context,
        options: List<KnobOption>,
        hint: String = "tap the dial",
        onSelect: (Int) -> Unit
    ): LinearLayout {
        val useSemiCircle = options.size >= 5
        val knobWidth = dp(context, if (useSemiCircle) 298f else 254f)
        val knobHeight = dp(context, if (useSemiCircle) 224f else 272f)
        val trackThickness = dpF(context, if (useSemiCircle) 30f else 26f)

        val wrapper = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(context, 12f)
            }
            alpha = 0f
            translationY = dpF(context, 20f)
        }

        val floatingLabel = TextView(context).apply {
            text = hint
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTextColor(c(TEXT))
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            letterSpacing = -0.01f
            setPadding(dp(context, 16f), dp(context, 11f), dp(context, 16f), dp(context, 11f))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpF(context, 999f)
                setColor(c(SURFACE))
                setStroke(1, mix(c(BORDER), Color.WHITE, 0.35f))
            }
            alpha = 0.92f
            scaleX = 0.96f
            scaleY = 0.96f
            elevation = dpF(context, 10f)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(context, 14f)
            }
        }
        wrapper.addView(floatingLabel)

        wrapper.addView(TextView(context).apply {
            text = if (useSemiCircle) "slide your finger across the dial" else "drag or tap the dial"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
            setTextColor(c(TEXT_FAINT))
            gravity = Gravity.CENTER
            letterSpacing = 0.04f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(context, 12f)
            }
        })

        val knobView = object : View(context) {
            private val segmentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = trackThickness
                strokeCap = Paint.Cap.ROUND
            }
            private val segmentGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = trackThickness + dpF(context, 10f)
                strokeCap = Paint.Cap.ROUND
            }
            private val inactivePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = trackThickness + dpF(context, 2f)
                color = mix(c(TRACK), c(SURFACE), 0.32f)
                strokeCap = Paint.Cap.ROUND
            }
            private val bezelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dpF(context, 1.2f)
                color = mix(c(BORDER), Color.WHITE, 0.18f)
            }
            private val innerTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dpF(context, 10f)
                color = mix(c(SURFACE), c(BG), 0.5f)
                strokeCap = Paint.Cap.ROUND
            }
            private val tickPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dpF(context, 2f)
                color = mix(c(SURFACE), Color.WHITE, 0.65f)
                strokeCap = Paint.Cap.ROUND
            }
            private val knobFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = mix(c(SURFACE), Color.WHITE, 0.2f)
            }
            private val knobInnerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = mix(c(BG), c(SURFACE), 0.55f)
            }
            private val knobStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dpF(context, 1.4f)
                color = mix(c(BORDER), Color.WHITE, 0.18f)
            }
            private val pointerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = c(TEXT)
            }
            private val pointerAccentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
            }
            private val hubRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dpF(context, 4f)
                color = mix(c(BORDER), c(TEXT), 0.14f)
            }
            private val hubDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = c(TEXT)
            }
            private val centerLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = c(TEXT)
                textAlign = Paint.Align.CENTER
                textSize = dpF(context, 12f)
                typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            }
            private val centerHintPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = c(TEXT_DIM)
                textAlign = Paint.Align.CENTER
                textSize = dpF(context, 10f)
                typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            }

            private val sweep = if (useSemiCircle) 208f else 300f
            private val startAngle = if (useSemiCircle) 166f else 120f
            private val gapAngle = if (useSemiCircle) 5f else 7f
            private var selectedIndex = -1
            private var highlightedIndex = -1
            private var hasDragged = false

            init {
                setLayerType(View.LAYER_TYPE_SOFTWARE, null)
            }

            private fun setActiveLabel(index: Int, immediate: Boolean = false) {
                if (index !in options.indices) {
                    if (immediate) {
                        floatingLabel.text = hint
                        floatingLabel.alpha = 0.92f
                        floatingLabel.scaleX = 0.96f
                        floatingLabel.scaleY = 0.96f
                    } else {
                        floatingLabel.animate().cancel()
                        floatingLabel.animate()
                            .alpha(0.92f)
                            .scaleX(0.96f)
                            .scaleY(0.96f)
                            .setDuration(140)
                            .start()
                        floatingLabel.text = hint
                    }
                    return
                }

                floatingLabel.text = options[index].label
                floatingLabel.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpF(context, 999f)
                    setColor(pastel(c(options[index].accentColor.take(7))))
                    setStroke(1, mix(c(options[index].accentColor.take(7)), Color.WHITE, 0.25f))
                }
                if (immediate) {
                    floatingLabel.alpha = 1f
                    floatingLabel.scaleX = 1f
                    floatingLabel.scaleY = 1f
                    return
                }
                floatingLabel.animate().cancel()
                floatingLabel.scaleX = 0.94f
                floatingLabel.scaleY = 0.94f
                floatingLabel.animate()
                    .alpha(1f)
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(170)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .start()
            }

            private fun radiusValues(): Triple<Float, Float, Float> {
                val cx = width / 2f
                val cy = if (useSemiCircle) height * 0.82f else height / 2f
                val radiusBase = minOf(width.toFloat(), height.toFloat() * if (useSemiCircle) 1.45f else 1f)
                val radius = radiusBase / 2f - trackThickness
                return Triple(cx, cy, radius)
            }

            private fun angleToIndex(angle: Float): Int {
                val relativeAngle = ((angle - startAngle) + 360f) % 360f
                if (relativeAngle > sweep) return -1
                val segmentSweep = (sweep - gapAngle * (options.size - 1).toFloat()) / options.size.toFloat()
                val slotSize = segmentSweep + gapAngle
                val candidate = (relativeAngle / slotSize).toInt().coerceIn(0, options.lastIndex)
                return if ((relativeAngle % slotSize) > segmentSweep) -1 else candidate
            }

            private fun updateHighlight(index: Int, fromUser: Boolean = false) {
                if (index == highlightedIndex) return
                highlightedIndex = index
                if (index >= 0) {
                    setActiveLabel(index)
                    if (fromUser) {
                        performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                    }
                } else {
                    setActiveLabel(selectedIndex)
                }
                invalidate()
            }

            override fun onDraw(canvas: Canvas) {
                super.onDraw(canvas)
                val (cx, cy, radius) = radiusValues()
                val rect = RectF(cx - radius, cy - radius, cx + radius, cy + radius)
                val segmentSweep = (sweep - gapAngle * (options.size - 1).toFloat()) / options.size.toFloat()

                canvas.drawArc(rect, startAngle, sweep, false, inactivePaint)
                canvas.drawArc(rect, startAngle, sweep, false, bezelPaint)

                val innerTrackRect = RectF(
                    cx - (radius - trackThickness * 0.62f),
                    cy - (radius - trackThickness * 0.62f),
                    cx + (radius - trackThickness * 0.62f),
                    cy + (radius - trackThickness * 0.62f)
                )
                canvas.drawArc(innerTrackRect, startAngle, sweep, false, innerTrackPaint)

                options.forEachIndexed { index, option ->
                    val accent = c(option.accentColor.take(7))
                    val isActive = index == if (highlightedIndex >= 0) highlightedIndex else selectedIndex
                    if (isActive) {
                        segmentGlowPaint.color = tint(accent, 58)
                        segmentGlowPaint.setShadowLayer(dpF(context, 12f), 0f, 0f, tint(accent, 46))
                    }
                    segmentPaint.color = if (isActive) {
                        mix(accent, Color.WHITE, 0.06f)
                    } else {
                        pastelStrong(accent)
                    }
                    val segStart = startAngle + index.toFloat() * (segmentSweep + gapAngle)
                    if (isActive) {
                        canvas.drawArc(rect, segStart, segmentSweep, false, segmentGlowPaint)
                    }
                    canvas.drawArc(rect, segStart, segmentSweep, false, segmentPaint)

                    val tickAngle = Math.toRadians((segStart + segmentSweep / 2f).toDouble())
                    val inner = radius - trackThickness * 0.34f
                    val outer = radius + trackThickness * 0.14f
                    val sx = cx + kotlin.math.cos(tickAngle).toFloat() * inner
                    val sy = cy + kotlin.math.sin(tickAngle).toFloat() * inner
                    val ex = cx + kotlin.math.cos(tickAngle).toFloat() * outer
                    val ey = cy + kotlin.math.sin(tickAngle).toFloat() * outer
                    canvas.drawLine(sx, sy, ex, ey, tickPaint)
                }

                val knobRadius = if (useSemiCircle) radius - trackThickness * 0.92f else radius - trackThickness * 1.02f
                canvas.drawCircle(cx, cy, knobRadius, knobFillPaint)
                canvas.drawCircle(cx, cy, knobRadius * 0.78f, knobInnerPaint)
                canvas.drawCircle(cx, cy, knobRadius, knobStrokePaint)

                val activeIndex = if (highlightedIndex >= 0) highlightedIndex else selectedIndex
                val pointerAngle = if (activeIndex >= 0) {
                    startAngle + activeIndex.toFloat() * (segmentSweep + gapAngle) + segmentSweep / 2f
                } else {
                    startAngle + sweep / 2f
                }
                val pointerRad = Math.toRadians(pointerAngle.toDouble())
                val pointerLen = knobRadius * 0.84f
                val pointerBase = knobRadius * 0.16f
                val shaftStart = knobRadius * 0.24f
                val headLen = knobRadius * 0.22f
                val shaftEnd = pointerLen - headLen
                val sx = cx + kotlin.math.cos(pointerRad).toFloat() * shaftStart
                val sy = cy + kotlin.math.sin(pointerRad).toFloat() * shaftStart
                val ex = cx + kotlin.math.cos(pointerRad).toFloat() * shaftEnd
                val ey = cy + kotlin.math.sin(pointerRad).toFloat() * shaftEnd
                val perp = pointerRad + Math.PI / 2
                val offsetX = kotlin.math.cos(perp).toFloat() * pointerBase
                val offsetY = kotlin.math.sin(perp).toFloat() * pointerBase
                val tipX = cx + kotlin.math.cos(pointerRad).toFloat() * pointerLen
                val tipY = cy + kotlin.math.sin(pointerRad).toFloat() * pointerLen
                val accent = if (activeIndex >= 0) c(options[activeIndex].accentColor.take(7)) else c(PRIMARY)
                pointerAccentPaint.color = mix(accent, Color.WHITE, 0.12f)

                val shaftPath = Path().apply {
                    moveTo(sx + offsetX, sy + offsetY)
                    lineTo(ex + offsetX * 0.58f, ey + offsetY * 0.58f)
                    lineTo(ex - offsetX * 0.58f, ey - offsetY * 0.58f)
                    lineTo(sx - offsetX, sy - offsetY)
                    close()
                }
                val headPath = Path().apply {
                    moveTo(tipX, tipY)
                    lineTo(ex + offsetX * 1.22f, ey + offsetY * 1.22f)
                    lineTo(ex - offsetX * 1.22f, ey - offsetY * 1.22f)
                    close()
                }
                canvas.drawPath(shaftPath, pointerPaint)
                canvas.drawPath(headPath, pointerAccentPaint)
                canvas.drawCircle(cx, cy, knobRadius * 0.17f, knobFillPaint)
                canvas.drawCircle(cx, cy, knobRadius * 0.17f, hubRingPaint)
                canvas.drawCircle(cx, cy, knobRadius * 0.07f, hubDotPaint)

                val centerLabel = if (activeIndex >= 0) "Release to choose" else "Slide to choose"
                canvas.drawText(centerLabel, cx, cy + dpF(context, 6f), centerLabelPaint)
                canvas.drawText(hint, cx, cy + dpF(context, 25f), centerHintPaint)
            }

            override fun onTouchEvent(event: MotionEvent): Boolean {
                val (cx, cy, radius) = radiusValues()
                val dx = event.x - cx
                val dy = event.y - cy
                val touchRadius = kotlin.math.sqrt(dx * dx + dy * dy)
                val minRadius = radius - trackThickness * 1.3f
                val maxRadius = radius + trackThickness * 0.9f
                if ((event.action == MotionEvent.ACTION_DOWN || hasDragged) && touchRadius !in minRadius..maxRadius) {
                    if (event.action == MotionEvent.ACTION_UP || event.action == MotionEvent.ACTION_CANCEL) {
                        updateHighlight(-1)
                        hasDragged = false
                    }
                    return true
                }

                var angle = Math.toDegrees(kotlin.math.atan2(dy.toDouble(), dx.toDouble())).toFloat()
                if (angle < 0f) angle += 360f
                val currentIndex = angleToIndex(angle)

                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        parent?.requestDisallowInterceptTouchEvent(true)
                        hasDragged = true
                        updateHighlight(currentIndex, fromUser = currentIndex >= 0)
                        animate().cancel()
                        animate()
                            .scaleX(0.992f)
                            .scaleY(0.992f)
                            .setDuration(80)
                            .start()
                    }
                    MotionEvent.ACTION_MOVE -> {
                        hasDragged = true
                        updateHighlight(currentIndex, fromUser = currentIndex >= 0)
                    }
                    MotionEvent.ACTION_UP -> {
                        parent?.requestDisallowInterceptTouchEvent(false)
                        animate().cancel()
                        animate()
                            .scaleX(1f)
                            .scaleY(1f)
                            .setDuration(120)
                            .setInterpolator(AccelerateDecelerateInterpolator())
                            .start()
                        hasDragged = false
                        if (currentIndex >= 0) {
                            selectedIndex = currentIndex
                            highlightedIndex = currentIndex
                            setActiveLabel(currentIndex, immediate = true)
                            performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            invalidate()
                            postDelayed({ onSelect(currentIndex) }, 90)
                        } else {
                            updateHighlight(-1)
                        }
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        parent?.requestDisallowInterceptTouchEvent(false)
                        hasDragged = false
                        updateHighlight(-1)
                        animate().cancel()
                        animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                    }
                }
                return true
            }
        }.apply {
            layoutParams = LinearLayout.LayoutParams(knobWidth, knobHeight).apply {
                gravity = Gravity.CENTER_HORIZONTAL
            }
        }
        wrapper.addView(knobView)
        wrapper.post {
            wrapper.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(220)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }
        return wrapper
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

    // ── Fresh editorial MCQ card (clean neutral surface, letter badge, no AI cliches) ─
    fun createMcqCard(
        context: Context,
        label: String,
        letter: String = "",
        onClick: () -> Unit
    ): LinearLayout {
        val baseCardColor = c("#FAF7F2")
        val borderNeutral = c("#DCD5CB")
        val activeBg = c("#221C18")
        val activeIndexBg = c("#38302A")
        val normalIndexBg = c("#EFE8DE")

        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            val hPad = dp(context, 18f)
            val vPad = dp(context, 16f)
            setPadding(hPad, vPad, hPad, vPad)
            minimumHeight = dp(context, 56f)

            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpF(context, 14f)
                setColor(baseCardColor)
                setStroke(dp(context, 1f), borderNeutral)
            }

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 10f)
            layoutParams = lp

            // Letter indicator badge (A, B, C...)
            val badgeSize = dp(context, 26f)
            val indexPill = TextView(context).apply {
                text = letter
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                setTextColor(c("#7A6F65"))
                typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                gravity = Gravity.CENTER
                val badgeLp = LinearLayout.LayoutParams(badgeSize, badgeSize)
                badgeLp.rightMargin = dp(context, 14f)
                layoutParams = badgeLp
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(normalIndexBg)
                }
            }

            val textView = TextView(context).apply {
                text = label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                setTextColor(c(TEXT))
                typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                setLineSpacing(dpF(context, 2f), 1f)
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            val chevron = TextView(context).apply {
                text = "›"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
                setTextColor(c("#B8AEA2"))
                val chevLp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                chevLp.leftMargin = dp(context, 8f)
                layoutParams = chevLp
            }

            if (letter.isNotEmpty()) {
                addView(indexPill)
            }
            addView(textView)
            addView(chevron)

            alpha = 0f
            translationY = dpF(context, 16f)

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                animateMcqTap(this, indexPill, textView, chevron, activeBg, activeIndexBg, onClick)
            }
        }
    }

    private fun animateMcqTap(
        view: LinearLayout,
        indexPill: TextView,
        textView: TextView,
        chevron: TextView,
        activeBg: Int,
        activeIndexBg: Int,
        onClick: () -> Unit
    ) {
        val parent = view.parent as? LinearLayout
        parent?.let {
            for (i in 0 until it.childCount) {
                val sibling = it.getChildAt(i)
                if (sibling != view && sibling is LinearLayout) {
                    sibling.animate().alpha(0.38f).setDuration(120).start()
                }
            }
        }

        view.animate()
            .scaleX(0.985f)
            .scaleY(0.985f)
            .setDuration(70)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                view.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpF(view.context, 14f)
                    setColor(activeBg)
                    setStroke(dp(view.context, 1.2f), activeBg)
                }
                textView.setTextColor(Color.WHITE)
                chevron.setTextColor(Color.parseColor("#A89F95"))
                indexPill.setTextColor(Color.WHITE)
                indexPill.background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(activeIndexBg)
                }

                view.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(110)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction {
                        view.postDelayed({ onClick() }, 140)
                    }
                    .start()
            }
            .start()
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
