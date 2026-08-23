package com.example.instatracker

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var injectionRunnable: Runnable? = null
    @Volatile private var latestResumeNonce: Long = 0L
    @Volatile private var isProcessing = false
    @Volatile private var pendingInjectionRequest = false
    private lateinit var webView: WebView

    companion object {
        const val LOCAL_ASSET_URL = "file:///android_asset/www/index.html"
        // Remote dashboard for instant OTA updates (~20s K8s pipeline).
        // Since React is static and data is injected via evaluateJavascript, privacy is 100% maintained.
        const val DEFAULT_REMOTE_DASHBOARD_URL = "https://dashboard.reelio.app/index.html"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // One-time cache invalidation for updated hasSurvey semantics.
        // Older hmm_results.json payloads may still mark sessions as "surveyed"
        // based solely on delayed-regret fields. Bump this version if the
        // backend survey schema changes again in the future.
        try {
            val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            val currentSchemaVersion = prefs.getInt("dashboard_schema_version", 0)
            val requiredSchemaVersion = 1
            if (currentSchemaVersion < requiredSchemaVersion) {
                // Force regeneration of dashboard payload with latest Python logic.
                listOf("hmm_results.json").forEach { name ->
                    File(filesDir, name).takeIf { it.exists() }?.delete()
                }
                prefs.edit()
                    .putInt("dashboard_schema_version", requiredSchemaVersion)
                    .apply()
                Log.d("MainActivity", "Dashboard schema bump -> invalidated cached hmm_results.json")
            }
        } catch (e: Exception) {
            Log.w("MainActivity", "Schema bump cache invalidation failed: ${e.message}")
        }

        // Request Notification Permission (Android 13+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
             if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != 
                 android.content.pm.PackageManager.PERMISSION_GRANTED) {
                 requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
             }
        }

        webView = WebView(this)
        webView.setBackgroundColor(android.graphics.Color.parseColor("#FBF7F0")) // Match index.html bg
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
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Expose Native Android Methods to React
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage): Boolean {
                Log.d("ReactDashboard", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()}")
                return true
            }
        }

        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val targetDashboardUrl = prefs.getString("remote_dashboard_url", DEFAULT_REMOTE_DASHBOARD_URL) ?: DEFAULT_REMOTE_DASHBOARD_URL

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("ReactDashboard", "Page finished loading: $url")
                // Skip the Python recompute entirely when a fresh cached payload exists —
                // previously this branch only applied on Vivo devices, so every other
                // device re-ran run_dashboard_payload() on every cold start even when
                // nothing had changed since the last computed hmm_results.json.
                val usedCache = injectCachedPayloadIfAvailable(webView, reason = "onPageFinished")
                if (!usedCache) {
                    injectDataWithDebounce(webView)
                }
            }

            override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                super.onReceivedError(view, request, error)
                Log.e("ReactDashboard", "WebView Error: ${error?.description} on url: ${request?.url}")
                // If the remote dashboard is unreachable (offline, bad IP, container stopped),
                // degrade seamlessly to the local bundled asset without disrupting user experience.
                if (request?.isForMainFrame == true && view?.url != LOCAL_ASSET_URL) {
                    Log.w("ReactDashboard", "Remote dashboard unreachable. Falling back seamlessly to local bundled assets.")
                    view?.loadUrl(LOCAL_ASSET_URL)
                }
            }
        }

        webView.loadUrl(targetDashboardUrl)

        // Schedule weekly notification worker (runs every 7 days at 9 AM)
        scheduleWeeklyNotificationWorker()
    }

    private fun scheduleWeeklyNotificationWorker() {
        try {
            val now = java.util.Calendar.getInstance()
            val nextSunday = now.clone() as java.util.Calendar
            nextSunday.set(java.util.Calendar.DAY_OF_WEEK, java.util.Calendar.SUNDAY)
            nextSunday.set(java.util.Calendar.HOUR_OF_DAY, 9)
            nextSunday.set(java.util.Calendar.MINUTE, 0)
            nextSunday.set(java.util.Calendar.SECOND, 0)
            nextSunday.set(java.util.Calendar.MILLISECOND, 0)
            if (nextSunday.before(now)) {
                nextSunday.add(java.util.Calendar.WEEK_OF_YEAR, 1)
            }
            val initialDelayMs = nextSunday.timeInMillis - now.timeInMillis

            val weeklyWorkRequest = PeriodicWorkRequestBuilder<WeeklyNotificationWorker>(
                7, TimeUnit.DAYS
            ).setInitialDelay(initialDelayMs, TimeUnit.MILLISECONDS).build()
            
            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "weekly_doom_summary",
                ExistingPeriodicWorkPolicy.KEEP,
                weeklyWorkRequest
            )
            
            Log.d("MainActivity", "Weekly notification worker scheduled")
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to schedule weekly worker: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            val resumeNonce = System.currentTimeMillis()
            latestResumeNonce = resumeNonce

            // Re-trigger update in case permissions changed while app was configured in settings
            val isEnabled = isAccessibilityServiceEnabled()
            val jsCode = "if(window.updateServiceStatus) window.updateServiceStatus($isEnabled);"
            webView.evaluateJavascript(jsCode, null)

            maybePromptVivoBatteryProtection()

            // Instant transition: inject cached JSON immediately if available
            val usedCachedPayload = injectCachedPayloadIfAvailable(webView, reason = "onResume")

            // Ensure we aren't showing a blank page if it failed to load earlier
            if (webView.url == null || webView.url == "about:blank") {
                Log.w("ReactDashboard", "WebView URL is null or blank on resume, reloading...")
                webView.loadUrl(LOCAL_ASSET_URL)
            } else {
                // Background refresh with latest data
                if (isVivoFamilyDevice() && usedCachedPayload) {
                    Log.d("ReactDashboard", "Vivo memory mode: skipped eager dashboard refresh on resume")
                } else {
                    injectDataWithDebounce(webView)
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        if (isVivoFamilyDevice() && !isChangingConfigurations && !isFinishing) {
            // Release heavy WebView memory on background to reduce OEM low-memory kills.
            Log.d("MainActivity", "Vivo memory mode: finishing activity in background")
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        Log.d("ReactDashboard", "onNewIntent called")
        if (::webView.isInitialized) {
            injectDataWithDebounce(webView)
        }
    }

    private fun injectDataWithDebounce(webView: WebView) {
        injectionRunnable?.let { handler.removeCallbacks(it) }

        injectionRunnable = Runnable {
            if (isProcessing) {
                Log.w("ReactDashboard", "Already processing, marking pending injection request")
                pendingInjectionRequest = true
                return@Runnable
            }
            isProcessing = true
            
            executorService.execute {
                try {
                    val csvContent = DatabaseProvider.getCsvString(this@MainActivity)
                    
                    if (csvContent.isBlank()) {
                        handler.post {
                            injectErrorToReact(webView, "No data available yet. Scroll a few more reels!")
                        }
                        return@execute
                    }

                    var jsonContent = "{}"
                    val mainLockWait1 = System.currentTimeMillis()
                    android.util.Log.i("ReelioDiag", "MainActivity awaiting PYTHON_LOCK (dashboard_payload). time=$mainLockWait1")
                    synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                        android.util.Log.i("ReelioDiag", "MainActivity acquired PYTHON_LOCK (dashboard_payload). waited=${System.currentTimeMillis() - mainLockWait1}ms")
                        try {
                            if (!Python.isStarted()) {
                                Python.start(AndroidPlatform(this@MainActivity))
                            }
                            val py = Python.getInstance()
                            val alseModule = py.getModule("reelio_alse")
                            val statePath = File(filesDir, "alse_model_state.json").absolutePath
                            jsonContent = alseModule.callAttr("run_dashboard_payload", csvContent, statePath).toString()
                        } catch (e: Exception) {
                            Log.e("ReactDashboard", "Python Error: ${e.message}", e)
                            handler.post {
                                injectErrorToReact(webView, "Processing error: ${e.message}")
                            }
                            return@execute
                        } finally {
                            android.util.Log.i("ReelioDiag", "MainActivity releasing PYTHON_LOCK (dashboard_payload). time=${System.currentTimeMillis()}")
                        }
                    }

                    if (jsonContent.isEmpty() || jsonContent == "{}" || jsonContent == "null") {
                        handler.post {
                            injectErrorToReact(webView, "No sufficient data yet. Scroll a few more reels!")
                        }
                        return@execute
                    }

                    // Cache for instant injection on next onResume
                    try { File(filesDir, "hmm_results.json").writeText(jsonContent) } catch (_: Exception) {}

                     val b64Json = android.util.Base64.encodeToString(
                         jsonContent.toByteArray(Charsets.UTF_8),
                         android.util.Base64.NO_WRAP
                     )

                     handler.post {
                         injectWhenReady(webView, b64Json)
                     }
                } catch (e: Exception) {
                    Log.e("ReactDashboard", "Unexpected error in executor: ${e.message}", e)
                    handler.post {
                        injectErrorToReact(webView, "Unexpected error: ${e.message}")
                    }
                } finally {
                    isProcessing = false
                    if (pendingInjectionRequest) {
                        pendingInjectionRequest = false
                        handler.post { injectDataWithDebounce(webView) }
                    }
                }
            }
        }
        
        handler.postDelayed(injectionRunnable!!, 100)
    }

    private fun injectWhenReady(webView: WebView, b64: String, attemptsLeft: Int = 20) {
        webView.evaluateJavascript("typeof injectDataB64 === 'function'") { result ->
            if (result == "true") {
                webView.evaluateJavascript("injectDataB64('$b64');", null)
                Log.d("ReactDashboard", "Data injected successfully via polling")
            } else if (attemptsLeft > 0) {
                handler.postDelayed({ injectWhenReady(webView, b64, attemptsLeft - 1) }, 150)
            } else {
                Log.e("ReactDashboard", "injectWhenReady: JS not ready after max attempts, re-queuing")
                handler.post { injectDataWithDebounce(webView) }
            }
        }
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

    private fun injectCachedPayloadIfAvailable(targetWebView: WebView, reason: String = "unknown"): Boolean {
        val cachedFile = File(filesDir, "hmm_results.json")
        val csvFile = File(filesDir, "insta_data.csv")
        
        if (!cachedFile.exists() || cachedFile.length() <= 50) {
            return false
        }

        // Invalidate cache if CSV is meaningfully newer
        val MIN_CACHE_STALENESS_MS = 30_000L
        if (csvFile.exists() && csvFile.lastModified() > cachedFile.lastModified() + MIN_CACHE_STALENESS_MS) {
            Log.d("ReactDashboard", "Cache invalidated: CSV is newer than cached hmm_results.json")
            return false
        }

        val resumeNonce = latestResumeNonce
        executorService.execute {
            try {
                val cachedJson = cachedFile.readText()
                val b64 = android.util.Base64.encodeToString(
                    cachedJson.toByteArray(Charsets.UTF_8),
                    android.util.Base64.NO_WRAP
                )
                handler.post {
                    if (!::webView.isInitialized || isFinishing || isDestroyed || latestResumeNonce != resumeNonce) {
                        return@post
                    }
                    injectWhenReady(targetWebView, b64)
                    Log.d("ReactDashboard", "Cached data injection triggered via polling ($reason)")
                }
            } catch (e: Exception) {
                Log.w("ReactDashboard", "Cache inject failed ($reason): ${e.message}")
            }
        }
        return true
    }

    private fun isVivoFamilyDevice(): Boolean {
        val manufacturer = Build.MANUFACTURER?.lowercase() ?: ""
        return manufacturer.contains("vivo") || manufacturer.contains("iqoo") || manufacturer.contains("bbk")
    }

    private fun maybePromptVivoBatteryProtection() {
        if (!isVivoFamilyDevice()) return

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isWhitelisted = powerManager?.isIgnoringBatteryOptimizations(packageName) == true
        if (isWhitelisted) return

        val prefs = getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val lastPromptAt = prefs.getLong("last_vivo_battery_prompt_at", 0L)
        if (now - lastPromptAt < TimeUnit.HOURS.toMillis(12)) return
        prefs.edit().putLong("last_vivo_battery_prompt_at", now).apply()

        AlertDialog.Builder(this)
            .setTitle("Keep Reelio running")
            .setMessage("Your device is force-stopping Reelio in the background. Open battery settings and allow background activity/autostart for Reelio.")
            .setPositiveButton("Open Settings") { _, _ ->
                openBatteryProtectionSettings()
            }
            .setNegativeButton("Later", null)
            .show()
    }

    private fun openBatteryProtectionSettings() {
        val candidates = listOf(
            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")),
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
            Intent().setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
            Intent().setClassName("com.iqoo.secure", "com.iqoo.secure.MainActivity"),
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
        )

        val launched = launchFirstResolvableIntent(candidates)
        if (!launched) {
            android.widget.Toast.makeText(this, "Could not open battery settings automatically", android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    private fun launchFirstResolvableIntent(candidates: List<Intent>): Boolean {
        for (intent in candidates) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val resolved = intent.resolveActivity(packageManager)
            if (resolved != null) {
                return try {
                    startActivity(intent)
                    true
                } catch (_: Exception) {
                    false
                }
            }
        }
        return false
    }

    fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as android.view.accessibility.AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_GENERIC)
        return enabledServices.any { it.resolveInfo.serviceInfo.packageName == packageName }
    }

    override fun onDestroy() {
        injectionRunnable?.let { handler.removeCallbacks(it) }
        if (::webView.isInitialized) {
            try {
                webView.stopLoading()
                webView.loadUrl("about:blank")
                webView.webChromeClient = WebChromeClient()
                webView.webViewClient = WebViewClient()
                webView.removeJavascriptInterface("Android")
                webView.removeAllViews()
                webView.destroy()
            } catch (e: Exception) {
                Log.w("MainActivity", "WebView cleanup failed: ${e.message}")
            }
        }
        executorService.shutdown()
        super.onDestroy()
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
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val csvContent = DatabaseProvider.getCsvString(mContext)
                    if (csvContent.isBlank()) return@launch

                    val tempFile = File(cacheDir, "export.csv")
                    tempFile.writeText(csvContent)
                    val uri: Uri = FileProvider.getUriForFile(mContext, "${packageName}.fileprovider", tempFile)
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/csv"
                        putExtra(Intent.EXTRA_STREAM, uri as android.os.Parcelable)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    mContext.startActivity(Intent.createChooser(intent, "Share Behavioral Baseline Data"))
                } catch (e: Exception) {
                    Log.e("ReactDashboard", "Error exporting CSV: ${e.message}", e)
                }
            }
        }

        /**
         * Prompts the user to confirm and clear stored behavioral event data.
         *
         * Exposed to JavaScript via the WebView interface. Shows a confirmation dialog; if the user confirms,
         * deletes all rows from SQLite and temporary model state files, then triggers a refresh.
         */
        @JavascriptInterface
        fun clearData() {
            // Need to run AlertDialog on UI thread
            handler.post {
                AlertDialog.Builder(mContext)
                    .setTitle("Clear Behavioral Data")
                    .setMessage("Are you sure you want to permanently delete all tracked UI events? The behavioral model will reset.")
                    .setPositiveButton("Delete Data") { _, _ ->
                        CoroutineScope(Dispatchers.IO).launch {
                            DatabaseProvider.getDatabase(mContext).csvRowDao().deleteAll()
                            listOf("insta_data.csv", "insta_data.csv.migrated", "alse_model_state.json", "hmm_results.json")
                                .forEach { name -> File(filesDir, name).takeIf { it.exists() }?.delete() }
                            handler.post {
                                // Force a refresh of the webview
                                injectDataWithDebounce(webView)
                            }
                        }
                    }
                    .setNeutralButton("Cancel", null)
                    .show()
            }
        }

        /**
         * Generates an intelligence report PDF from the provided JSON payload and launches a share intent for the PDF.
         *
         * Parses the given JSON payload, creates a timestamped PDF via createIntelligenceReportPdf, and if successful
         * exposes the file through a FileProvider and opens the system share sheet. On failure shows a toast message.
         *
         * @param payloadJson JSON string containing the report payload; if null or invalid an empty payload is used.
         */
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

        /**
         * Stores the survey sampling probability in the app's shared preferences under the key "survey_probability".
         *
         * @param prob The probability (0.0 to 1.0) that determines how frequently surveys are presented.
         */
        @JavascriptInterface
        fun setSurveyFrequency(prob: Float) {
            val bounded = prob.coerceIn(0f, 1f)
            mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
                .edit().putFloat("survey_probability", bounded).apply()
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

        /**
         * Fetches the stored sleep schedule as a comma-separated "startHour,endHour" string.
         *
         * Reads values from SharedPreferences "InstaTrackerPrefs" under keys `sleep_start_hour` and
         * `sleep_end_hour`; defaults are 23 (11 PM) for start and 7 (7 AM) for end when keys are absent.
         *
         * @return A string formatted as "startHour,endHour" where each hour is an integer in 24-hour format.
         */
        @JavascriptInterface
        fun getSleepSchedule(): String {
            val prefs = mContext.getSharedPreferences("InstaTrackerPrefs", Context.MODE_PRIVATE)
            val start = prefs.getInt("sleep_start_hour", 23) // default 11 PM
            val end = prefs.getInt("sleep_end_hour", 7)      // default 7 AM
            return "$start,$end"
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
                val emptyCircadian = Regex("\"circadian\"\\s*:\\s*[\\[{]\\s*[\\]{}]")
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

                if (!text.contains("\"pipeline_version\"")) {
                    android.util.Log.d("ReactDashboard", "Cache missing pipeline_version, forcing recompute")
                    hmmFile.delete()
                    return false
                }

                android.util.Log.d("ReactDashboard", "Cache valid with circadian and ticker data")
                true
            } catch (e: Exception) {
                android.util.Log.e("ReactDashboard", "Cache read error: ${e.message}")
                false
            }
        }

        @JavascriptInterface
        fun generateReport() {
            CoroutineScope(Dispatchers.Main).launch {
                // Show magenta spinner via JS callback
                webView.evaluateJavascript("if(window.showReportLoading) window.showReportLoading(true);", null)
                val result = withContext(Dispatchers.IO) {
                    try {
                        val mainLockWait2 = System.currentTimeMillis()
                        android.util.Log.i("ReelioDiag", "MainActivity awaiting PYTHON_LOCK (report_payload). time=$mainLockWait2")
                        synchronized(InstaAccessibilityService.GLOBAL_PYTHON_LOCK) {
                            android.util.Log.i("ReelioDiag", "MainActivity acquired PYTHON_LOCK (report_payload). waited=${System.currentTimeMillis() - mainLockWait2}ms")
                            
                            val csvContent = DatabaseProvider.getCsvString(mContext)
                            if (csvContent.isBlank())
                                return@withContext "{\"error\": \"No session data found. Scroll some Reels first!\"}"
                            
                            val jsonFile = File(filesDir, "hmm_results.json")
                            val jsonContent = when {
                                jsonFile.exists() && jsonFile.length() > 10 -> jsonFile.readText()
                                else -> {
                                    if (!Python.isStarted()) Python.start(AndroidPlatform(mContext))
                                    val py = Python.getInstance()
                                    val mod = py.getModule("reelio_alse")
                                    val statePath = File(filesDir, "alse_model_state.json").absolutePath
                                    val freshJson = mod.callAttr("run_dashboard_payload", csvContent, statePath).toString()
                                    jsonFile.writeText(freshJson)
                                    freshJson
                                }
                            }
                            
                            if (!Python.isStarted()) Python.start(AndroidPlatform(mContext))
                            val py = Python.getInstance()
                            val alseModule = py.getModule("reelio_alse")
                            val resultStr = alseModule.callAttr("run_report_payload", jsonContent, csvContent).toString()
                            android.util.Log.i("ReelioDiag", "MainActivity releasing PYTHON_LOCK (report_payload). time=${System.currentTimeMillis()}")
                            resultStr
                        }
                    } catch (e: Exception) {
                        "{\"error\": \"${e.message}\"}"
                    }
                }
                // Hide spinner
                webView.evaluateJavascript("if(window.showReportLoading) window.showReportLoading(false);", null)
                // Save PDF
                if (result.startsWith("{") && result.contains("error")) {
                    Log.e("ReactDashboard", "Report error: $result")
                    // Extract and show the real Python error message so we can debug it
                    val errMsg = try {
                        val raw = org.json.JSONObject(result).optString("error", result)
                        // Show the LAST 200 chars — that's where the actual exception type lives
                        if (raw.length > 200) "...${raw.takeLast(200)}" else raw
                    } catch (_: Exception) {
                        val r = result; if (r.length > 200) "...${r.takeLast(200)}" else r
                    }
                    android.widget.Toast.makeText(mContext, errMsg, android.widget.Toast.LENGTH_LONG).show()
                } else {
                    saveReportToDownloads(result)
                }
            }
        }

        private fun saveReportToDownloads(base64pdf: String) {
            try {
                val pdfBytes = android.util.Base64.decode(base64pdf, android.util.Base64.DEFAULT)
                val fileName = "reelio_report_${System.currentTimeMillis()}.pdf"
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    val resolver = (mContext as? MainActivity)?.contentResolver ?: return
                    val cv = android.content.ContentValues().apply {
                        put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                        put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)
                    if (uri != null) {
                        resolver.openOutputStream(uri)?.use { it.write(pdfBytes) }
                        android.widget.Toast.makeText(mContext, "Report saved to Downloads/$fileName", android.widget.Toast.LENGTH_LONG).show()
                    }
                } else {
                    val dl = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
                    if (!dl.exists()) dl.mkdirs()
                    File(dl, fileName).writeBytes(pdfBytes)
                    android.widget.Toast.makeText(mContext, "Report saved to Downloads/$fileName", android.widget.Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("ReactDashboard", "PDF save failed: ${e.message}", e)
                android.widget.Toast.makeText(mContext, "Error saving report: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Generate a timestamped intelligence report PDF from the provided analytics payload.
     *
     * The payload is expected to contain session telemetry and model outputs used to populate
     * sections such as Executive Summary, Behavior Totals, Model Dynamics, and Interpretation.
     * Recognized fields include:
     * - "sessions": an array of session objects (each may contain `nReels`, `totalInteractions`, `S_t`)
     * - "model_parameters": an object (e.g., containing `transition_matrix`, `regime_stability_score`)
     * - "model_confidence": a numeric confidence value
     *
     * @param payload JSON object containing sessions and model information used to build the report.
     * @return A File pointing to the generated PDF saved in the app cache directory, or `null` if generation failed.
     */
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

    /**
     * Draws the given text onto the canvas, wrapping it into lines of up to 80 characters.
     *
     * @param canvas Canvas to draw onto.
     * @param text The text to render; it will be chunked into lines of up to 80 characters.
     * @param x The x-coordinate where each line starts.
     * @param yStart The starting y-coordinate for the first line.
     * @param paint Paint used to style and measure the text.
     * @return The y-coordinate immediately after the last drawn line.
     */
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
