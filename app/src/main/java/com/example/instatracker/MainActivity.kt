package com.example.instatracker

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
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
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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

            // Instant transition: inject cached JSON immediately if available
            val cachedFile = File(filesDir, "hmm_results.json")
            if (cachedFile.exists() && cachedFile.length() > 50) {
                try {
                    val cachedJson = cachedFile.readText()
                    val b64 = android.util.Base64.encodeToString(
                        cachedJson.toByteArray(Charsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    )
                    webView.evaluateJavascript("injectDataB64('$b64');", null)
                    Log.d("ReactDashboard", "Cached data injected instantly")
                } catch (e: Exception) {
                    Log.w("ReactDashboard", "Cache inject failed: ${e.message}")
                }
            }

            // Background refresh with latest data
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

                    // Cache for instant injection on next onResume
                    try { File(filesDir, "hmm_results.json").writeText(jsonContent) } catch (_: Exception) {}

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
        
        handler.postDelayed(injectionRunnable!!, 100)
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

        @JavascriptInterface
        fun generateReport() {
            CoroutineScope(Dispatchers.Main).launch {
                // Show magenta spinner via JS callback
                webView.evaluateJavascript("if(window.showReportLoading) window.showReportLoading(true);", null)
                val result = withContext(Dispatchers.IO) {
                    try {
                        // Use the pre-computed JSON (hmm_results.json) — no CSV re-parsing
                        val jsonFile = File(filesDir, "hmm_results.json")
                        val jsonContent = when {
                            jsonFile.exists() && jsonFile.length() > 10 -> jsonFile.readText()
                            else -> {
                                // Fallback: run dashboard first to build json
                                val csvFile = File(filesDir, "insta_data.csv")
                                if (!csvFile.exists() || csvFile.length() < 10)
                                    return@withContext "{\"error\": \"No session data found. Scroll some Reels first!\"}"
                                if (!Python.isStarted()) Python.start(AndroidPlatform(mContext))
                                val py = Python.getInstance()
                                val mod = py.getModule("reelio_alse")
                                val freshJson = mod.callAttr("run_dashboard_payload", csvFile.readText()).toString()
                                jsonFile.writeText(freshJson)
                                freshJson
                            }
                        }
                        if (!Python.isStarted()) Python.start(AndroidPlatform(mContext))
                        val py = Python.getInstance()
                        val alseModule = py.getModule("reelio_alse")
                        // Pass both json and csv — csv needed for dates, times, top driver
                        val csvFile = File(filesDir, "insta_data.csv")
                        val csvContent = if (csvFile.exists()) csvFile.readText() else ""
                        alseModule.callAttr("run_report_payload", jsonContent, csvContent).toString()
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
}
