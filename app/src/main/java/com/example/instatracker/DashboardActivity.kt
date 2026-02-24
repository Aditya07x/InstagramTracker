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

            android.util.Log.d("ReactDashboard", "Cache valid with circadian data")
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
}