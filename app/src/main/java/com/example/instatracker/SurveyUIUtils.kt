package com.example.instatracker

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.os.Build
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.widget.*

object SurveyUIUtils {

    // ── Design Tokens (mirrors Android app) ──────────────────────────────────
    private const val BG         = "#05050A"
    private const val BG2        = "#0A1014"
    private const val CYAN       = "#0DDFF2"
    private const val MAGENTA    = "#F20DA6"
    private const val DOOM_RED   = "#FF2D55"
    private const val WARN       = "#FFB340"
    private const val VIOLET     = "#BF5AF2"
    private const val TEXT       = "#D0DCF0"
    private const val TEXT_DIM   = "#6B7A9F"
    private const val BORDER     = "#0DDFF244"  // 27% alpha cyan
    private const val CARD_BG    = "#0A1520"

    private fun c(hex: String) = Color.parseColor(hex)
    private fun dp(ctx: Context, v: Float) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.resources.displayMetrics).toInt()
    private fun sp(ctx: Context, v: Float) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, v, ctx.resources.displayMetrics)

    // ── Root scroll container ─────────────────────────────────────────────────
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
            val p = dp(context, 24f)
            setPadding(p, dp(context, 56f), p, dp(context, 40f))
            setBackgroundColor(c(BG))
        }
    }

    // ── Top system label  e.g. "REELIO // ALSE" ──────────────────────────────
    fun createSystemLabel(context: Context): TextView {
        return TextView(context).apply {
            text = "REELIO // ALSE  v3.0"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
            setTextColor(c(TEXT_DIM))
            letterSpacing = 0.28f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 32f)
            layoutParams = lp
        }
    }

    // ── Step indicator dots ───────────────────────────────────────────────────
    fun createStepIndicator(context: Context, totalSteps: Int, currentStep: Int): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 36f)
            layoutParams = lp

            for (i in 1..totalSteps) {
                val dot = View(context)
                val isActive = i == currentStep
                val isDone = i < currentStep
                val size = if (isActive) dp(context, 28f) else dp(context, 6f)
                val dotLp = LinearLayout.LayoutParams(size, dp(context, 6f))
                dotLp.setMargins(dp(context, 3f), 0, dp(context, 3f), 0)
                dot.layoutParams = dotLp
                dot.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dp(context, 3f).toFloat()
                    when {
                        isActive -> {
                            setColor(c(CYAN))
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                // shadow not available on drawable but we use elevation trick
                            }
                        }
                        isDone -> setColor(c(CYAN + "99"))
                        else -> setColor(c(TEXT_DIM + "44"))
                    }
                }
                addView(dot)
            }
        }
    }

    // ── Survey type badge  e.g. "PRE-SESSION" ────────────────────────────────
    fun createBadge(context: Context, label: String, color: String = CYAN): TextView {
        return TextView(context).apply {
            text = label
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
            setTextColor(c(color))
            letterSpacing = 0.22f
            gravity = Gravity.CENTER
            val hPad = dp(context, 10f)
            val vPad = dp(context, 4f)
            setPadding(hPad, vPad, hPad, vPad)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(context, 4f).toFloat()
                setColor(c(color.take(7) + "18"))
                setStroke(1, c(color.take(7) + "55"))
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

    // ── Title ─────────────────────────────────────────────────────────────────
    fun createTitleView(context: Context, titleText: String): TextView {
        return TextView(context).apply {
            text = titleText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setShadowLayer(24f, 0f, 0f, c(CYAN + "55"))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 8f)
            layoutParams = lp
        }
    }

    // ── Question text ─────────────────────────────────────────────────────────
    fun createQuestionView(context: Context, questionText: String): TextView {
        return TextView(context).apply {
            text = questionText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTextColor(c(TEXT))
            gravity = Gravity.CENTER
            setLineSpacing(dp(context, 4f).toFloat(), 1f)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 36f)
            layoutParams = lp
        }
    }

    // ── Divider line ──────────────────────────────────────────────────────────
    fun createDivider(context: Context): View {
        return View(context).apply {
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                1
            )
            lp.bottomMargin = dp(context, 28f)
            layoutParams = lp
            setBackgroundColor(c(BORDER))
        }
    }

    // ── Horizontal button row (for 1-5 numeric ratings) ───────────────────────
    fun createButtonLayout(context: Context): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 12f)
            layoutParams = lp
        }
    }

    // ── Numeric rating button (glassy card style) ─────────────────────────────
    fun createStyledButton(context: Context, label: String, onClick: () -> Unit): TextView {
        return TextView(context).apply {
            text = label
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setTextColor(c(TEXT))
            gravity = Gravity.CENTER
            val vPad = dp(context, 16f)
            setPadding(0, vPad, 0, vPad)

            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(context, 12f).toFloat()
                setColor(c(CARD_BG))
                setStroke(1, c(BORDER))
            }

            setOnClickListener {
                // Neon flash on tap
                animateButtonTap(this, label.toIntOrNull() ?: 0, onClick)
            }
        }
    }

    // ── Vertical option button (for intention choices) ────────────────────────
    fun createOptionButton(
        context: Context,
        label: String,
        emoji: String = "",
        accentColor: String = CYAN,
        onClick: () -> Unit
    ): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            val hPad = dp(context, 18f)
            val vPad = dp(context, 16f)
            setPadding(hPad, vPad, hPad, vPad)

            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(context, 14f).toFloat()
                setColor(c(CARD_BG))
                setStroke(1, c(accentColor.take(7) + "30"))
            }

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 10f)
            layoutParams = lp

            // Accent dot
            val dot = View(context).apply {
                val dotLp = LinearLayout.LayoutParams(dp(context, 8f), dp(context, 8f))
                dotLp.rightMargin = dp(context, 14f)
                layoutParams = dotLp
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(c(accentColor.take(7)))
                }
            }

            val textView = TextView(context).apply {
                text = if (emoji.isNotEmpty()) "$emoji  $label" else label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                setTextColor(c(TEXT))
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            val arrow = TextView(context).apply {
                text = "›"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                setTextColor(c(accentColor.take(7) + "66"))
            }

            addView(dot)
            addView(textView)
            addView(arrow)

            setOnClickListener {
                animateOptionTap(this, accentColor, onClick)
            }
        }
    }

    // ── Mood scale labels (below rating buttons) ──────────────────────────────
    fun createMoodScaleLabels(context: Context, leftLabel: String, rightLabel: String): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dp(context, 8f)
            lp.bottomMargin = dp(context, 4f)
            layoutParams = lp

            val leftTv = TextView(context).apply {
                text = leftLabel
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                setTextColor(c(TEXT_DIM))
                letterSpacing = 0.1f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            val rightTv = TextView(context).apply {
                text = rightLabel
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                setTextColor(c(TEXT_DIM))
                letterSpacing = 0.1f
                gravity = Gravity.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            addView(leftTv)
            addView(rightTv)
        }
    }

    // ── Section subtitle ──────────────────────────────────────────────────────
    fun createSubtitle(context: Context, text: String): TextView {
        return TextView(context).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            setTextColor(c(TEXT_DIM))
            letterSpacing = 0.15f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dp(context, 24f)
            layoutParams = lp
        }
    }

    // ── Skip button ───────────────────────────────────────────────────────────
    fun createSkipButton(context: Context, onSkip: () -> Unit): TextView {
        return TextView(context).apply {
            text = "SKIP"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            setTextColor(c(TEXT_DIM))
            letterSpacing = 0.2f
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dp(context, 24f)
            layoutParams = lp
            setOnClickListener { onSkip() }
        }
    }

    // ── Animation: numeric button tap with color flash ────────────────────────
    private fun animateButtonTap(view: TextView, value: Int, onClick: () -> Unit) {
        val accentHex = when {
            value <= 2 -> CYAN
            value == 3 -> WARN
            else -> MAGENTA
        }
        val accent = c(accentHex)

        // Scale down
        view.animate()
            .scaleX(0.88f).scaleY(0.88f)
            .setDuration(80)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                // Flash color
                view.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP, 12f, view.resources.displayMetrics
                    )
                    setColor(c(accentHex.take(7) + "22"))
                    setStroke(2, accent)
                }
                view.setTextColor(accent)
                view.setShadowLayer(16f, 0f, 0f, accent)

                // Scale back up
                view.animate()
                    .scaleX(1f).scaleY(1f)
                    .setDuration(120)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction { onClick() }
                    .start()
            }
            .start()
    }

    // ── Animation: option button tap ──────────────────────────────────────────
    private fun animateOptionTap(view: LinearLayout, accentColor: String, onClick: () -> Unit) {
        val accent = c(accentColor.take(7))
        view.animate()
            .scaleX(0.97f).scaleY(0.97f)
            .setDuration(80)
            .withEndAction {
                view.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP, 14f, view.resources.displayMetrics
                    )
                    setColor(c(accentColor.take(7) + "18"))
                    setStroke(2, accent)
                }
                view.animate()
                    .scaleX(1f).scaleY(1f)
                    .setDuration(100)
                    .withEndAction { onClick() }
                    .start()
            }
            .start()
    }

    // ── Pulse animation helper (for active dot indicators) ───────────────────
    fun startPulseAnimation(view: View): ValueAnimator {
        return ValueAnimator.ofFloat(1f, 0.4f, 1f).apply {
            duration = 2000
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { view.alpha = it.animatedValue as Float }
            start()
        }
    }
}