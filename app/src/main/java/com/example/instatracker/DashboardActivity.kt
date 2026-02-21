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
    private var isProcessing = false

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
                injectDataWithDebounce(webView)
            }

            override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                android.util.Log.e("ReactDashboard", "WebView Error: ${error?.description} for URL: ${request?.url}")
                super.onReceivedError(view, request, error)
            }

            override fun onReceivedHttpError(view: WebView?, request: android.webkit.WebResourceRequest?, errorResponse: android.webkit.WebResourceResponse?) {
                android.util.Log.e("ReactDashboard", "HTTP Error: ${errorResponse?.statusCode} ${errorResponse?.reasonPhrase} for URL: ${request?.url}")
                super.onReceivedHttpError(view, request, errorResponse)
            }
        }

        // Load the local HTML file
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    private fun injectDataWithDebounce(webView: WebView) {
        injectionRunnable?.let { handler.removeCallbacks(it) }

        injectionRunnable = Runnable {
            if (isProcessing) return@Runnable // Prevent concurrent Python executions
            isProcessing = true
            
            executorService.execute {
                val file = File(filesDir, "insta_data.csv")
                var csvContent = ""
                
                if (file.exists()) {
                    csvContent = file.readText()
                }

                if (!Python.isStarted()) {
                    Python.start(AndroidPlatform(this))
                }
                
                var jsonContent = "{}"
                try {
                    val py = Python.getInstance()
                    val hmmModule = py.getModule("hmm")
                    jsonContent = hmmModule.callAttr("run_hmm_from_string", csvContent).toString()
                } catch (e: Exception) {
                    android.util.Log.e("ReactDashboard", "Python Error: ${e.message}")
                    jsonContent = "{\"error\": \"${e.message}\"}"
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
                    } catch (e: Exception) {
                        android.util.Log.e("ReactDashboard", "JS Evaluation Error: ${e.message}")
                    } finally {
                        isProcessing = false
                    }
                }
            }
        }
        
        // 500ms debounce
        handler.postDelayed(injectionRunnable!!, 500)
    }

    override fun onDestroy() {
        super.onDestroy()
        injectionRunnable?.let { handler.removeCallbacks(it) }
        executorService.shutdown()
    }
}