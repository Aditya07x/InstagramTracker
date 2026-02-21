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
            // Check flag INSIDE the runnable (thread-safe)
            if (isProcessing) {
                android.util.Log.w("ReactDashboard", "Already processing, skipping injection")
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
                        // Send error immediately if file doesn't exist
                        handler.post {
                            injectErrorToReact(webView, "No data file found. Please scroll some reels first!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    if (csvContent.isEmpty()) {
                        // Handle empty CSV case
                        handler.post {
                            injectErrorToReact(webView, "No data available yet. Scroll a few more reels!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    if (!Python.isStarted()) {
                        Python.start(AndroidPlatform(this@DashboardActivity))
                    }
                    
                    var jsonContent = "{}"
                    try {
                        val py = Python.getInstance()
                        val alseModule = py.getModule("reelio_alse")
                        jsonContent = alseModule.callAttr("run_dashboard_payload", csvContent).toString()
                    } catch (e: Exception) {
                        android.util.Log.e("ReactDashboard", "Python Error: ${e.message}", e)
                        // Always send error back to React
                        handler.post {
                            injectErrorToReact(webView, "Processing error: ${e.message}")
                            isProcessing = false
                        }
                        return@execute
                    }

                    // Validate JSON response
                    if (jsonContent.isEmpty() || jsonContent == "{}" || jsonContent == "null") {
                        handler.post {
                            injectErrorToReact(webView, "No sufficient data yet. Scroll a few more reels!")
                            isProcessing = false
                        }
                        return@execute
                    }

                    // Escape newlines and quotes to safely pass into Javascript string literal
                    val escapedJson = jsonContent
                        .replace("\\", "\\\\")
                        .replace("\n", "\\n")
                        .replace("\r", "")
                        .replace("'", "\\'")
                        .replace("\"", "\\\"")

                    // Return to main thread to interact with WebView
                    handler.post {
                        try {
                            val jsCode = "javascript:injectData('$escapedJson');"
                            webView.evaluateJavascript(jsCode, null)
                            android.util.Log.d("ReactDashboard", "Data injected successfully")
                        } catch (e: Exception) {
                            android.util.Log.e("ReactDashboard", "JS Evaluation Error: ${e.message}", e)
                            injectErrorToReact(webView, "Failed to render dashboard: ${e.message}")
                        } finally {
                            isProcessing = false  // Always reset flag in finally block
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("ReactDashboard", "Unexpected error in executor: ${e.message}", e)
                    handler.post {
                        injectErrorToReact(webView, "Unexpected error: ${e.message}")
                        isProcessing = false
                    }
                }
            }
        }
        
        // Reduce debounce to 250ms
        handler.postDelayed(injectionRunnable!!, 250)
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