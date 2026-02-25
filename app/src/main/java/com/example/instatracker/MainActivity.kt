package com.example.instatracker

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {

    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var injectionRunnable: Runnable? = null
    @Volatile private var isProcessing = false
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request Notification Permission (Android 13+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
             if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != 
                 android.content.pm.PackageManager.PERMISSION_GRANTED) {
                 requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
             }
        }

        webView = WebView(this)
        setContentView(webView)

        // Configure WebView
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_NO_CACHE

        // Expose Native Android Methods to React
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage): Boolean {
                Log.d("ReactDashboard", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()}")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectDataWithDebounce(webView)
            }
        }

        webView.clearCache(true)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            // Re-trigger update in case permissions changed while app was configured in settings
            val isEnabled = isAccessibilityServiceEnabled()
            val jsCode = "javascript:if(window.updateServiceStatus) window.updateServiceStatus($isEnabled);"
            webView.evaluateJavascript(jsCode, null)
            
            // Re-trigger python injection to get latest events
            injectDataWithDebounce(webView)
        }
    }

    private fun injectDataWithDebounce(webView: WebView) {
        injectionRunnable?.let { handler.removeCallbacks(it) }

        injectionRunnable = Runnable {
            if (isProcessing) {
                Log.w("ReactDashboard", "Already processing, skipping injection")
                return@Runnable
            }
            isProcessing = true
            
            executorService.execute {
                try {
                    val file = File(filesDir, "insta_data.csv")
                    var csvContent = ""
                    
                    if (file.exists()) {
                        csvContent = file.readText()
                    } else {
                        handler.post {
                            injectErrorToReact(webView, "No data file found. Please scroll some reels first!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    if (csvContent.isEmpty()) {
                        handler.post {
                            injectErrorToReact(webView, "No data available yet. Scroll a few more reels!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    if (!Python.isStarted()) {
                        Python.start(AndroidPlatform(this@MainActivity))
                    }
                    
                    var jsonContent = "{}"
                    try {
                        val py = Python.getInstance()
                        val alseModule = py.getModule("reelio_alse")
                        jsonContent = alseModule.callAttr("run_dashboard_payload", csvContent).toString()
                    } catch (e: Exception) {
                        Log.e("ReactDashboard", "Python Error: ${e.message}", e)
                        handler.post {
                            injectErrorToReact(webView, "Processing error: ${e.message}")
                            isProcessing = false
                        }
                        return@execute
                    }

                    if (jsonContent.isEmpty() || jsonContent == "{}" || jsonContent == "null") {
                        handler.post {
                            injectErrorToReact(webView, "No sufficient data yet. Scroll a few more reels!")
                            isProcessing = false
                        }
                        return@execute
                    }

                     val b64Json = android.util.Base64.encodeToString(
                         jsonContent.toByteArray(Charsets.UTF_8),
                         android.util.Base64.NO_WRAP
                     )

                     handler.post {
                         try {
                             val jsCode = "injectDataB64('$b64Json');"
                             webView.evaluateJavascript(jsCode, null)
                            Log.d("ReactDashboard", "Data injected successfully")
                        } catch (e: Exception) {
                            Log.e("ReactDashboard", "JS Evaluation Error: ${e.message}", e)
                            injectErrorToReact(webView, "Failed to render dashboard: ${e.message}")
                        } finally {
                            isProcessing = false
                        }
                    }
                } catch (e: Exception) {
                    Log.e("ReactDashboard", "Unexpected error in executor: ${e.message}", e)
                    handler.post {
                        injectErrorToReact(webView, "Unexpected error: ${e.message}")
                        isProcessing = false
                    }
                }
            }
        }
        
        handler.postDelayed(injectionRunnable!!, 250)
    }

    private fun injectErrorToReact(webView: WebView, errorMsg: String) {
        val safeMsg = errorMsg.replace("\"", "'")
        val errorJson = "{\"error\": \"$safeMsg\"}"
        val b64 = android.util.Base64.encodeToString(
            errorJson.toByteArray(Charsets.UTF_8),
            android.util.Base64.NO_WRAP
        )
        try {
            webView.evaluateJavascript("injectDataB64('$b64');", null)
            Log.d("ReactDashboard", "Error injected: $errorMsg")
        } catch (e: Exception) {
            Log.e("ReactDashboard", "Failed to inject error: ${e.message}")
        }
    }

    fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as android.view.accessibility.AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_GENERIC)
        return enabledServices.any { it.resolveInfo.serviceInfo.packageName == packageName }
    }

    override fun onDestroy() {
        super.onDestroy()
        injectionRunnable?.let { handler.removeCallbacks(it) }
        executorService.shutdown()
    }

    inner class WebAppInterface(private val mContext: Context) {
        @JavascriptInterface
        fun isAccessibilityEnabled(): Boolean {
            return isAccessibilityServiceEnabled()
        }

        @JavascriptInterface
        fun enableAccessibility() {
            handler.post {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        }

        @JavascriptInterface
        fun exportCsv() {
            handler.post {
                val file = File(filesDir, "insta_data.csv")
                if (!file.exists()) return@post

                val uri: Uri = FileProvider.getUriForFile(mContext, "${packageName}.fileprovider", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_STREAM, uri as android.os.Parcelable)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "Share Behavioral Baseline Data"))
            }
        }

        @JavascriptInterface
        fun clearData() {
            // Need to run AlertDialog on UI thread
            handler.post {
                AlertDialog.Builder(mContext)
                    .setTitle("Clear Behavioral Data")
                    .setMessage("Are you sure you want to permanently delete all tracked UI events? The behavioral model will reset.")
                    .setPositiveButton("Delete Data") { _, _ ->
                        val file = File(filesDir, "insta_data.csv")
                        if (file.exists()) file.delete()
                        // Force a refresh of the webview
                        injectDataWithDebounce(webView)
                    }
                    .setNeutralButton("Cancel", null)
                    .show()
            }
        }

        @JavascriptInterface
        fun generateIntelligenceReport(payloadJson: String?) {
            handler.post {
                try {
                    val payload = JSONObject(payloadJson ?: "{}")
                    val file = createIntelligenceReportPdf(payload)
                    if (file == null || !file.exists()) {
                        android.widget.Toast.makeText(mContext, "Failed to generate report", android.widget.Toast.LENGTH_SHORT).show()
                        return@post
                    }

                    val uri: Uri = FileProvider.getUriForFile(mContext, "${packageName}.fileprovider", file)
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "application/pdf"
                        putExtra(Intent.EXTRA_STREAM, uri as android.os.Parcelable)
                        putExtra(Intent.EXTRA_SUBJECT, "Reelio Intelligence Report")
                        putExtra(Intent.EXTRA_TEXT, "Generated from on-device ALSE model")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(intent, "Share Intelligence Report"))
                } catch (e: Exception) {
                    Log.e("ReactDashboard", "PDF generation error: ${e.message}", e)
                    android.widget.Toast.makeText(mContext, "Unable to generate report", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun setSurveyFrequency(prob: Float) {
            mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .edit().putFloat("survey_probability", prob).apply()
        }

        @JavascriptInterface
        fun getSurveyFrequency(): Float {
            return mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .getFloat("survey_probability", 0.30f)
        }

        @JavascriptInterface
        fun setSleepSchedule(startHour: Int, endHour: Int) {
            mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .edit()
                .putInt("sleep_start_hour", startHour)
                .putInt("sleep_end_hour", endHour)
                .apply()
        }

        @JavascriptInterface
        fun getSleepSchedule(): String {
            val prefs = mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            val start = prefs.getInt("sleep_start_hour", 23) // default 11 PM
            val end = prefs.getInt("sleep_end_hour", 7)      // default 7 AM
            return "$start,$end"
        }
    }

    private fun createIntelligenceReportPdf(payload: JSONObject): File? {
        return try {
            val sessions = payload.optJSONArray("sessions")
            val sessionCount = sessions?.length() ?: 0
            val modelParams = payload.optJSONObject("model_parameters")
            val modelConfidence = payload.optDouble("model_confidence", 0.0)

            var totalReels = 0
            var totalInteractions = 0
            var avgDoom = 0.0
            var latestDoom = 0.0
            if (sessionCount > 0 && sessions != null) {
                for (i in 0 until sessionCount) {
                    val s = sessions.optJSONObject(i) ?: continue
                    totalReels += s.optInt("nReels", 0)
                    totalInteractions += s.optInt("totalInteractions", 0)
                    avgDoom += s.optDouble("S_t", 0.0)
                    if (i == sessionCount - 1) latestDoom = s.optDouble("S_t", 0.0)
                }
                avgDoom /= sessionCount.toDouble()
            }

            val reportFile = File(cacheDir, "reelio_intelligence_report_${System.currentTimeMillis()}.pdf")
            val pdf = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
            val page = pdf.startPage(pageInfo)
            val canvas = page.canvas

            val titlePaint = Paint().apply {
                color = Color.BLACK
                textSize = 20f
                isFakeBoldText = true
            }
            val sectionPaint = Paint().apply {
                color = Color.BLACK
                textSize = 14f
                isFakeBoldText = true
            }
            val bodyPaint = Paint().apply {
                color = Color.DKGRAY
                textSize = 11f
            }

            var y = 50f
            canvas.drawText("Reelio Intelligence Report", 40f, y, titlePaint)
            y += 20f
            canvas.drawText("Generated on-device • ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(java.util.Date())}", 40f, y, bodyPaint)
            y += 30f

            canvas.drawText("Executive Summary", 40f, y, sectionPaint)
            y += 20f
            y = drawWrappedLine(canvas, "Sessions analyzed: $sessionCount", 40f, y, bodyPaint)
            y = drawWrappedLine(canvas, "Latest session doom score: ${"%.2f".format(latestDoom)}", 40f, y, bodyPaint)
            y = drawWrappedLine(canvas, "Average doom score: ${"%.2f".format(avgDoom)}", 40f, y, bodyPaint)
            y = drawWrappedLine(canvas, "Model confidence: ${"%.2f".format(modelConfidence)}", 40f, y, bodyPaint)
            y += 12f

            canvas.drawText("Behavior Totals", 40f, y, sectionPaint)
            y += 20f
            y = drawWrappedLine(canvas, "Total reels observed: $totalReels", 40f, y, bodyPaint)
            y = drawWrappedLine(canvas, "Total interactions (likes/comments/shares/saves): $totalInteractions", 40f, y, bodyPaint)
            y += 12f

            canvas.drawText("Model Dynamics", 40f, y, sectionPaint)
            y += 20f
            val transition = modelParams?.optJSONArray("transition_matrix")
            val regime = modelParams?.optDouble("regime_stability_score", 0.0) ?: 0.0
            y = drawWrappedLine(canvas, "Regime stability score: ${"%.2f".format(regime)}", 40f, y, bodyPaint)
            y = drawWrappedLine(canvas, "Transition matrix: ${transition?.toString() ?: "N/A"}", 40f, y, bodyPaint)
            y += 12f

            canvas.drawText("Interpretation", 40f, y, sectionPaint)
            y += 20f
            val riskBand = when {
                latestDoom >= 0.65 -> "High capture risk"
                latestDoom >= 0.35 -> "Moderate capture risk"
                else -> "Low capture risk"
            }
            y = drawWrappedLine(canvas, "Current risk band: $riskBand", 40f, y, bodyPaint)
            drawWrappedLine(canvas, "This report is generated from local session telemetry and ALSE probabilities without sending data off-device.", 40f, y, bodyPaint)

            pdf.finishPage(page)
            FileOutputStream(reportFile).use { pdf.writeTo(it) }
            pdf.close()
            reportFile
        } catch (e: Exception) {
            Log.e("ReactDashboard", "createIntelligenceReportPdf failed: ${e.message}", e)
            null
        }
    }

    private fun drawWrappedLine(canvas: android.graphics.Canvas, text: String, x: Float, yStart: Float, paint: Paint): Float {
        val maxChars = 80
        var y = yStart
        text.chunked(maxChars).forEach {
            canvas.drawText(it, x, y, paint)
            y += 16f
        }
        return y
    }
}
