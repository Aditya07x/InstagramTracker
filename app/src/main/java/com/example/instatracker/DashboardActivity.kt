package com.example.instatracker

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import android.webkit.JavascriptInterface
import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

class DashboardActivity : ComponentActivity() {

    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var injectionRunnable: Runnable? = null
    @Volatile private var isProcessing = false
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        webView.setBackgroundColor(android.graphics.Color.parseColor("#FBF7F0"))
        webView.layoutParams = android.view.ViewGroup.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT, 
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        )
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

        webView.clearCache(true)

        // Expose Interface for PDF Report Generation
        webView.addJavascriptInterface(DashboardInterface(this, webView), "Android")

        // Optional: ChromeClient for debugging console logs
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage): Boolean {
                android.util.Log.d("ReactDashboard", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                return true
            }
        }

        // Handle page load 
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectDataWithDebounce(webView)
            }

            override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                android.util.Log.e("ReactDashboard", "WebView Error: ${error?.description} for URL: ${request?.url}")
                // Inject error state to React
                injectErrorToReact(webView, "WebView Error: ${error?.description}")
                super.onReceivedError(view, request, error)
            }

            override fun onReceivedHttpError(view: WebView?, request: android.webkit.WebResourceRequest?, errorResponse: android.webkit.WebResourceResponse?) {
                android.util.Log.e("ReactDashboard", "HTTP Error: ${errorResponse?.statusCode} ${errorResponse?.reasonPhrase} for URL: ${request?.url}")
                // Inject error state to React
                injectErrorToReact(webView, "HTTP ${errorResponse?.statusCode}: ${errorResponse?.reasonPhrase}")
                super.onReceivedHttpError(view, request, errorResponse)
            }
        }

        // Load the local HTML file
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            // Re-inject HMM data (covers Settings changes + post-survey model updates)
            injectDataWithDebounce(webView)
            // If RetroactiveSurveyActivity wrote a label while we were away, fire the JS callback
            drainPendingRetroactiveLabel(webView)
        }
    }

    /**
     * Reads any pending retroactive label written by RetroactiveSurveyActivity and fires
     * window.onRetroactiveLabelComplete(b64) in the WebView.
     * The label payload is already Base64-encoded JSON — JS decodes with atob() + JSON.parse().
     */
    private fun drainPendingRetroactiveLabel(webView: WebView) {
        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val b64   = prefs.getString("pending_retroactive_label_b64", null) ?: return
        val ts    = prefs.getLong("pending_retroactive_label_ts", 0L)
        // Ignore stale entries older than 5 minutes
        if (System.currentTimeMillis() - ts > 5 * 60 * 1000L) {
            prefs.edit().remove("pending_retroactive_label_b64").remove("pending_retroactive_label_ts").apply()
            return
        }
        prefs.edit().remove("pending_retroactive_label_b64").remove("pending_retroactive_label_ts").apply()
        handler.post {
            webView.evaluateJavascript(
                "if(typeof window.onRetroactiveLabelComplete==='function') window.onRetroactiveLabelComplete('$b64');",
                null
            )
        }
        android.util.Log.d("ReactDashboard", "Drained retroactive label callback to WebView")
    }

    private fun mergePendingRetroactiveLabelIntoPayload(jsonContent: String): String {
        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val b64 = prefs.getString("pending_retroactive_label_b64", null) ?: return jsonContent
        val ts = prefs.getLong("pending_retroactive_label_ts", 0L)
        if (System.currentTimeMillis() - ts > 5 * 60 * 1000L) return jsonContent

        return try {
            val label = JSONObject(String(Base64.decode(b64, Base64.DEFAULT), Charsets.UTF_8))
            val root = JSONObject(jsonContent)
            val sessionNum = label.optString("sessionNum", "")
            val sessionDate = label.optString("date", "")
            var patched = false

            fun patchSessions(arr: JSONArray?) {
                if (arr == null) return
                for (i in 0 until arr.length()) {
                    val sess = arr.optJSONObject(i) ?: continue
                    val matchesNum = sess.optString("sessionNum", "") == sessionNum
                    val matchesDate = sess.optString("date", "") == sessionDate
                    if (!matchesNum || !matchesDate) continue
                    val keys = label.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        sess.put(key, label.get(key))
                    }
                    patched = true
                }
            }

            patchSessions(root.optJSONArray("sessions"))
            patchSessions(root.optJSONArray("todaySessions"))

            if (patched) root.toString() else jsonContent
        } catch (e: Exception) {
            android.util.Log.w("ReactDashboard", "Failed to merge pending retroactive label into payload: ${e.message}")
            jsonContent
        }
    }

    private fun injectDataWithDebounce(webView: WebView) {
        injectionRunnable?.let { handler.removeCallbacks(it) }

        injectionRunnable = Runnable {
            if (isProcessing) {
                android.util.Log.w("ReactDashboard", "Already processing, skipping injection")
                return@Runnable
            }
            isProcessing = true

            executorService.execute {
                try {
                    // ── Prefer pre-computed HMM JSON ──────────────────────────────
                    val hmmFile  = File(filesDir, "hmm_results.json")
                    val csvFile  = File(filesDir, "insta_data.csv")

                    val jsonContentRaw: String = when {
                        hmmFile.exists() && hmmFile.length() > 10 && isCacheValid(hmmFile, csvFile) -> {
                            android.util.Log.d("ReactDashboard", "Loading pre-computed HMM JSON (${hmmFile.length()} bytes)")
                            hmmFile.readText(Charsets.UTF_8)
                        }
                        csvFile.exists() && csvFile.length() > 50 -> {
                            android.util.Log.d("ReactDashboard", "Running HMM inference on CSV…")
                            if (!Python.isStarted()) {
                                Python.start(AndroidPlatform(this@DashboardActivity))
                            }
                            val csvContent = csvFile.readText()
                            val py = Python.getInstance()
                            
                            val dashLockWait1 = System.currentTimeMillis()
                            android.util.Log.i("ReelioDiag", "Dashboard awaiting PYTHON_LOCK (dashboard_payload). time=$dashLockWait1")
                            synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                                android.util.Log.i("ReelioDiag", "Dashboard acquired PYTHON_LOCK (dashboard_payload). waited=${System.currentTimeMillis() - dashLockWait1}ms")
                                val hmmModule = py.getModule("reelio_alse")
                                val statePath = File(filesDir, "alse_model_state.json").absolutePath
                                val result = hmmModule.callAttr("run_dashboard_payload", csvContent, statePath).toString()
                                // Cache the fresh result
                                hmmFile.writeText(result)
                                android.util.Log.i("ReelioDiag", "Dashboard releasing PYTHON_LOCK (dashboard_payload). time=${System.currentTimeMillis()}")
                                result
                            }
                        }
                        else -> {
                            handler.post {
                                injectErrorToReact(webView, "No data yet. Open Instagram and scroll some Reels first!")
                            }
                            return@execute
                        }
                    }
                    val jsonContent = mergePendingRetroactiveLabelIntoPayload(jsonContentRaw)

                    if (jsonContent.isBlank() || jsonContent == "{}" || jsonContent.contains("\"error\"")) {
                        handler.post {
                            injectErrorToReact(webView, "Not enough data yet — scroll a few more sessions!")
                        }
                        return@execute
                    }

                    // ── Encode as Base64 to avoid escaping nightmares ─────────────
                    val b64 = android.util.Base64.encodeToString(
                        jsonContent.toByteArray(Charsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    )

                    handler.post {
                        injectWhenReady(webView, b64)
                    }

                } catch (e: Exception) {
                    android.util.Log.e("ReactDashboard", "Unexpected error: ${e.message}", e)
                    handler.post {
                        injectErrorToReact(webView, "Unexpected error: ${e.message}")
                    }
                } finally {
                    isProcessing = false
                }
            }
        }

        handler.postDelayed(injectionRunnable!!, 250)
    }

    private fun injectWhenReady(webView: WebView, b64: String, attemptsLeft: Int = 20) {
        webView.evaluateJavascript("typeof injectDataB64 === 'function'") { result ->
            if (result == "true") {
                webView.evaluateJavascript("injectDataB64('$b64');", null)
                android.util.Log.d("ReactDashboard", "Data injected successfully via polling")
            } else if (attemptsLeft > 0) {
                handler.postDelayed({ injectWhenReady(webView, b64, attemptsLeft - 1) }, 150)
            } else {
                injectErrorToReact(webView, "Dashboard failed to initialise")
            }
        }
    }

    private fun isCacheValid(hmmFile: File, csvFile: File): Boolean {
        // 1. Cache must be newer than CSV
        if (csvFile.exists() && hmmFile.lastModified() < csvFile.lastModified()) {
            android.util.Log.d("ReactDashboard", "Cache stale: CSV is newer, forcing recompute")
            return false
        }
        // 2. Cache must contain circadian key with non-empty data
        return try {
            val text = hmmFile.readText(Charsets.UTF_8)

            // Check key exists at all
            if (!text.contains("\"circadian\"")) {
                android.util.Log.d("ReactDashboard", "Cache missing circadian key, forcing recompute")
                hmmFile.delete()
                return false
            }

            // Check circadian value is not empty — reject: "circadian": [] or "circadian": {}
            val emptyCircadian = Regex("\"circadian\"\\s*:\\s*[\\[{]\\s*[\\]|}]")
            if (emptyCircadian.containsMatchIn(text)) {
                android.util.Log.d("ReactDashboard", "Cache has empty circadian array, forcing recompute")
                hmmFile.delete()
                return false
            }

            // Migration FIX: Ensure cache contains new endTime metric for live ticker
            if (!text.contains("\"endTime\"")) {
                android.util.Log.d("ReactDashboard", "Cache missing endTime for Live Ticker, forcing recompute")
                hmmFile.delete()
                return false
            }

            // Migration FIX: enforce pipeline version key so stale pre-dedupe
            // payloads are invalidated and Monitor time metrics recompute.
            if (!text.contains("\"pipeline_version\"")) {
                android.util.Log.d("ReactDashboard", "Cache missing pipeline_version, forcing recompute")
                hmmFile.delete()
                return false
            }

            android.util.Log.d("ReactDashboard", "Cache valid with circadian, ticker, and pipeline version")
            true
        } catch (e: Exception) {
            android.util.Log.e("ReactDashboard", "Cache read error: ${e.message}")
            false
        }
    }

    // New helper to inject error state directly to React
    private fun injectErrorToReact(webView: WebView, errorMsg: String) {
        val safeMsg = errorMsg.replace("\"", "'")
        val errorJson = "{\"error\": \"$safeMsg\", \"sessions\": []}"
        val b64 = android.util.Base64.encodeToString(
            errorJson.toByteArray(Charsets.UTF_8),
            android.util.Base64.NO_WRAP
        )
        injectWhenReady(webView, b64)
    }

    override fun onDestroy() {
        super.onDestroy()
        injectionRunnable?.let { handler.removeCallbacks(it) }
        executorService.shutdown()
    }

    private fun saveAndNotify(base64result: String) {
        if (base64result.contains("\"error\"")) {
            android.util.Log.e("ReactDashboard", "Report Gen Error: $base64result")
            handler.post {
                android.widget.Toast.makeText(this@DashboardActivity, "Error generating report", android.widget.Toast.LENGTH_SHORT).show()
            }
            return
        }
        try {
            val pdfBytes = android.util.Base64.decode(base64result, android.util.Base64.DEFAULT)
            val fileName = "reelio_report_${System.currentTimeMillis()}.pdf"
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                val resolver = contentResolver
                val contentValues = android.content.ContentValues().apply {
                    put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { outputStream ->
                        outputStream.write(pdfBytes)
                    }
                    handler.post {
                        android.widget.Toast.makeText(this@DashboardActivity, "Report saved to Downloads", android.widget.Toast.LENGTH_LONG).show()
                    }
                }
            } else {
                if (androidx.core.content.ContextCompat.checkSelfPermission(this@DashboardActivity, android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    androidx.core.app.ActivityCompat.requestPermissions(this@DashboardActivity, arrayOf(android.Manifest.permission.WRITE_EXTERNAL_STORAGE), 112)
                    handler.post {
                        android.widget.Toast.makeText(this@DashboardActivity, "Storage permission required. Try again.", android.widget.Toast.LENGTH_SHORT).show()
                    }
                    return
                }
                val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val file = java.io.File(downloadsDir, fileName)
                file.writeBytes(pdfBytes)
                handler.post {
                    android.widget.Toast.makeText(this@DashboardActivity, "Report saved to Downloads", android.widget.Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ReactDashboard", "File save error: ${e.message}", e)
            handler.post {
                android.widget.Toast.makeText(this@DashboardActivity, "Failed to save report to Downloads", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    inner class DashboardInterface(private val mContext: Context, private val webView: WebView) {
        @JavascriptInterface
        fun generateReport() {
            CoroutineScope(Dispatchers.Main).launch {
                webView.evaluateJavascript("if(window.showReportLoading) window.showReportLoading(true);", null)
                val result = withContext(Dispatchers.IO) {
                    try {
                        val file = File(filesDir, "insta_data.csv")
                        if (!file.exists() || file.length() < 10) return@withContext "{\"error\": \"No data to generate report.\"}"
                        val csvContent = file.readText()
                        if (!Python.isStarted()) {
                            Python.start(AndroidPlatform(mContext))
                        }
                        
                        val dashLockWait2 = System.currentTimeMillis()
                        android.util.Log.i("ReelioDiag", "Dashboard awaiting PYTHON_LOCK (report_payload). time=$dashLockWait2")
                        synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                            android.util.Log.i("ReelioDiag", "Dashboard acquired PYTHON_LOCK (report_payload). waited=${System.currentTimeMillis() - dashLockWait2}ms")
                            val py = Python.getInstance()
                            val hmmModule = py.getModule("reelio_alse")
                            // Read or generate the dashboard JSON — run_report_payload expects it as first arg
                            val hmmFile = File(filesDir, "hmm_results.json")
                            val jsonContent = if (hmmFile.exists() && hmmFile.length() > 10 && isCacheValid(hmmFile, file)) {
                                hmmFile.readText(Charsets.UTF_8)
                            } else {
                                val statePath = File(filesDir, "alse_model_state.json").absolutePath
                                val fresh = hmmModule.callAttr("run_dashboard_payload", csvContent, statePath).toString()
                                hmmFile.writeText(fresh)
                                fresh
                            }
                            val result = hmmModule.callAttr("run_report_payload", jsonContent, csvContent).toString()
                            android.util.Log.i("ReelioDiag", "Dashboard releasing PYTHON_LOCK (report_payload). time=${System.currentTimeMillis()}")
                            result
                        }
                    } catch (e: Exception) {
                        "{\"error\": \"${e.message}\"}"
                    }
                }
                saveAndNotify(result)
                webView.evaluateJavascript("if(window.showReportLoading) window.showReportLoading(false);", null)
            }
        }
        
        @JavascriptInterface
        fun exportCsv() {
            // Needed so existing HTML "Export CSV" buttons don't break when embedded in DashboardActivity
            handler.post {
                val file = File(filesDir, "insta_data.csv")
                if (!file.exists()) return@post
                val uri: android.net.Uri = androidx.core.content.FileProvider.getUriForFile(mContext, "${packageName}.fileprovider", file)
                val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(android.content.Intent.EXTRA_STREAM, uri as android.os.Parcelable)
                    addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                mContext.startActivity(android.content.Intent.createChooser(intent, "Share Behavioral Baseline Data"))
            }
        }

        @JavascriptInterface
        fun getLaunchTab(): String = "dashboard"

        @JavascriptInterface
        fun isAccessibilityEnabled(): Boolean = true // Mocked for DashboardActivity

        @JavascriptInterface
        fun enableAccessibility() {}

        @JavascriptInterface
        fun clearData() {}

        @JavascriptInterface
        fun getSurveyFrequency(): Float {
            return mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .getFloat("survey_probability", 0.30f)
        }

        @JavascriptInterface
        fun setSurveyFrequency(freq: Float) {
            val bounded = freq.coerceIn(0f, 1f)
            mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .edit()
                .putFloat("survey_probability", bounded)
                .apply()
        }

        @JavascriptInterface
        fun getSleepSchedule(): String {
            val prefs = mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            val start = prefs.getInt("sleep_start_hour", 23)
            val end = prefs.getInt("sleep_end_hour", 7)
            return "$start,$end"
        }

        @JavascriptInterface
        fun setSleepSchedule(start: Int, end: Int) {
            mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .edit()
                .putInt("sleep_start_hour", start)
                .putInt("sleep_end_hour", end)
                .apply()
        }

        /**
         * Launches RetroactiveSurveyActivity for a specific past session.
         * Called from JS as: window.Android.openRetroactiveSurvey(sessionNum, date, predSummary, prefillJson)
         * - sessionNum:    integer session number from hmm_results.json
         * - date:          date string "YYYY-MM-DD" from hmm_results.json
         * - predSummary:   human-readable model prediction string (shown as subtitle in Step 1)
         * - prefillJson:   JSON string with existing non-zero label fields for context
         */
        @JavascriptInterface
        fun openRetroactiveSurvey(sessionNumStr: String, date: String, predSummary: String, prefillJson: String) {
            android.util.Log.d("ReactDashboard", "[Bridge] openRetroactiveSurvey called with: sessionNum=$sessionNumStr, date=$date")
            val sessionNum = sessionNumStr.toIntOrNull()
            if (sessionNum == null) {
                android.util.Log.e("ReactDashboard", "[Bridge] Aborting: sessionNum '$sessionNumStr' is not a valid integer")
                return
            }
            try {
                val intent = android.content.Intent(mContext, RetroactiveSurveyActivity::class.java).apply {
                    putExtra("session_num",         sessionNum)
                    putExtra("session_date",        date)
                    putExtra("prediction_summary",  predSummary)
                    putExtra("prefill_json",         prefillJson)
                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                mContext.startActivity(intent)
                android.util.Log.d("ReactDashboard", "[Bridge] Activity launch triggered for session $sessionNum")
            } catch (e: Exception) {
                android.util.Log.e("ReactDashboard", "[Bridge] Failed to launch activity: ${e.message}", e)
            }
        }
    }
}
