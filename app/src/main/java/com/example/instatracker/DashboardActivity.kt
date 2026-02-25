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

class DashboardActivity : ComponentActivity() {

    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var injectionRunnable: Runnable? = null
    @Volatile private var isProcessing = false
    private var injectionAttempts = 0
    private val MAX_INJECTION_ATTEMPTS = 3

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = WebView(this)
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
                injectionAttempts = 0  // Reset retry counter
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

                    val jsonContent: String = when {
                        hmmFile.exists() && hmmFile.length() > 10 && isCacheValid(hmmFile, csvFile) -> {
                            android.util.Log.d("ReactDashboard", "Loading pre-computed HMM JSON (${hmmFile.length()} bytes)")
                            hmmFile.readText(Charsets.UTF_8)
                        }
                        csvFile.exists() -> {
                            android.util.Log.d("ReactDashboard", "Running HMM inference on CSV…")
                            if (!Python.isStarted()) {
                                Python.start(AndroidPlatform(this@DashboardActivity))
                            }
                            val csvContent = csvFile.readText()
                            val py = Python.getInstance()
                            val hmmModule = py.getModule("reelio_alse")
                            val result = hmmModule.callAttr("run_dashboard_payload", csvContent).toString()
                            // Cache the fresh result
                            hmmFile.writeText(result)
                            result
                        }
                        else -> {
                            handler.post {
                                injectErrorToReact(webView, "No data yet. Open Instagram and scroll some Reels first!")
                                isProcessing = false
                            }
                            return@execute
                        }
                    }

                    if (jsonContent.isBlank() || jsonContent == "{}" || jsonContent.contains("\"error\"")) {
                        handler.post {
                            injectErrorToReact(webView, "Not enough data yet — scroll a few more sessions!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    // ── Encode as Base64 to avoid escaping nightmares ─────────────
                    val b64 = android.util.Base64.encodeToString(
                        jsonContent.toByteArray(Charsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    )

                    handler.post {
                        try {
                            webView.evaluateJavascript("javascript:injectDataB64('$b64');", null)
                            android.util.Log.d("ReactDashboard", "HMM JSON injected via B64 (${b64.length} chars)")
                        } catch (e: Exception) {
                            android.util.Log.e("ReactDashboard", "JS injection error: ${e.message}", e)
                            injectErrorToReact(webView, "Failed to render: ${e.message}")
                        } finally {
                            isProcessing = false
                        }
                    }

                } catch (e: Exception) {
                    android.util.Log.e("ReactDashboard", "Unexpected error: ${e.message}", e)
                    handler.post {
                        injectErrorToReact(webView, "Unexpected error: ${e.message}")
                        isProcessing = false
                    }
                }
            }
        }

        handler.postDelayed(injectionRunnable!!, 250)
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

            android.util.Log.d("ReactDashboard", "Cache valid with circadian and ticker data")
            true
        } catch (e: Exception) {
            android.util.Log.e("ReactDashboard", "Cache read error: ${e.message}")
            false
        }
    }

    // New helper to inject error state directly to React
    private fun injectErrorToReact(webView: WebView, errorMsg: String) {
        val errorJson = "{\"error\": \"$errorMsg\"}".replace("\"", "\\\"")
        try {
            val jsCode = "javascript:injectData('$errorJson');"
            webView.evaluateJavascript(jsCode, null)
            android.util.Log.d("ReactDashboard", "Error injected: $errorMsg")
        } catch (e: Exception) {
            android.util.Log.e("ReactDashboard", "Failed to inject error: ${e.message}")
        }
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
                        val py = Python.getInstance()
                        val hmmModule = py.getModule("reelio_alse")
                        hmmModule.callAttr("run_report_payload", csvContent).toString()
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
    }
}