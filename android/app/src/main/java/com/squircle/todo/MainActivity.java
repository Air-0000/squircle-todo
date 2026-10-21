package com.squircle.todo;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.Display;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private WebView webView;
    private WebAppInterface webAppInterface;
    private int currentTopDp = 38;
    private int currentBottomDp = 16;
    private int currentLeftDp = 0;
    private int currentRightDp = 0;
    private File pendingInstallApk = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge window setup
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Globally lock display to 120Hz or maximum supported high refresh rate
        lockHighRefreshRate();

        // Create WebView dynamically with hardware layer acceleration
        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(Color.parseColor("#FAF7F2"));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        setContentView(webView);

        // Initialize Native Bridge with safe initial insets
        webAppInterface = new WebAppInterface(this, webView);
        webAppInterface.updateInsets(currentTopDp, currentBottomDp, currentLeftDp, currentRightDp);
        webView.addJavascriptInterface(webAppInterface, "AndroidBridge");

        // Safe Area Insets Dispatcher
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;
            int calculatedTop = Math.round(insets.top / density);
            int calculatedBottom = Math.round(insets.bottom / density);
            currentTopDp = Math.max(calculatedTop, 38);
            currentBottomDp = Math.max(calculatedBottom, 16);
            currentLeftDp = Math.round(insets.left / density);
            currentRightDp = Math.round(insets.right / density);

            webAppInterface.updateInsets(currentTopDp, currentBottomDp, currentLeftDp, currentRightDp);
            injectSafeAreaCssVariables();
            return windowInsets;
        });

        // Setup WebView settings for optimal 60fps performance
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Setup AndroidX WebViewAssetLoader
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("appassets.androidplatform.net".equals(url.getHost())) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, url);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "Cannot launch external browser for URL: " + url, e);
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectSafeAreaCssVariables();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                result.confirm();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, android.webkit.JsResult result) {
                result.confirm();
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[WebView Console] " + consoleMessage.message() +
                        " -- From line " + consoleMessage.lineNumber() +
                        " of " + consoleMessage.sourceId());
                return true;
            }
        });

        // Modern Back Pressed Handling
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // Load the HTML entry point hosted via WebViewAssetLoader
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    private void injectSafeAreaCssVariables() {
        if (webView == null) return;
        String js = String.format(Locale.US,
                "try {" +
                "  document.documentElement.style.setProperty('--safe-area-inset-top', '%dpx');" +
                "  document.documentElement.style.setProperty('--safe-area-inset-bottom', '%dpx');" +
                "  document.documentElement.style.setProperty('--safe-area-inset-left', '%dpx');" +
                "  document.documentElement.style.setProperty('--safe-area-inset-right', '%dpx');" +
                "  document.documentElement.style.setProperty('--sat', '%dpx');" +
                "  document.documentElement.style.setProperty('--sab', '%dpx');" +
                "  if (window.__updateSafeAreaInsets) { window.__updateSafeAreaInsets(%d, %d, %d, %d); }" +
                "} catch(e) {}",
                currentTopDp, currentBottomDp, currentLeftDp, currentRightDp,
                currentTopDp, currentBottomDp,
                currentTopDp, currentBottomDp, currentLeftDp, currentRightDp
        );
        webView.evaluateJavascript(js, null);
    }

    public void lockHighRefreshRate() {
        try {
            Window window = getWindow();
            if (window == null) return;

            window.setFlags(
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
            );

            Display display = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                display = getDisplay();
            } else {
                display = getWindowManager().getDefaultDisplay();
            }

            if (display != null) {
                Display.Mode[] supportedModes = display.getSupportedModes();
                Display.Mode currentMode = display.getMode();
                Display.Mode bestMode = null;
                float maxRefreshRate = 60.0f;

                for (Display.Mode mode : supportedModes) {
                    boolean isSameResolution = (mode.getPhysicalWidth() == currentMode.getPhysicalWidth()
                            && mode.getPhysicalHeight() == currentMode.getPhysicalHeight());
                    if (isSameResolution && mode.getRefreshRate() > maxRefreshRate) {
                        maxRefreshRate = mode.getRefreshRate();
                        bestMode = mode;
                    }
                }

                if (bestMode == null) {
                    for (Display.Mode mode : supportedModes) {
                        if (mode.getRefreshRate() > maxRefreshRate) {
                            maxRefreshRate = mode.getRefreshRate();
                            bestMode = mode;
                        }
                    }
                }

                WindowManager.LayoutParams params = window.getAttributes();

                if (bestMode != null) {
                    params.preferredDisplayModeId = bestMode.getModeId();
                    Log.i(TAG, "Locked display mode to " + bestMode.getModeId()
                            + " (" + bestMode.getPhysicalWidth() + "x" + bestMode.getPhysicalHeight()
                            + " @ " + bestMode.getRefreshRate() + "Hz)");
                }

                float targetRate = Math.max(maxRefreshRate, 120.0f);
                params.preferredRefreshRate = targetRate;

                window.setAttributes(params);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to lock high refresh rate: " + e.getMessage());
        }
    }

    public void setPendingInstallApk(File apkFile) {
        this.pendingInstallApk = apkFile;
    }

    public void installApk(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            Toast.makeText(this, "未找到下载的更新安装包", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    this.pendingInstallApk = apkFile;
                    Toast.makeText(this, "请开启“允许安装未知应用”权限以完成升级", Toast.LENGTH_LONG).show();
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(settingsIntent);
                    return;
                }
            }

            apkFile.setReadable(true, false);

            Uri apkUri = FileProvider.getUriForFile(
                    this,
                    getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo resolveInfo : resInfoList) {
                String packageName = resolveInfo.activityInfo.packageName;
                grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            startActivity(intent);
            pendingInstallApk = null;
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch package installer", e);
            Toast.makeText(this, "调起系统安装器失败: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        lockHighRefreshRate();
        if (webView != null) {
            webView.onResume();
        }
        if (pendingInstallApk != null && pendingInstallApk.exists()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                File apk = pendingInstallApk;
                pendingInstallApk = null;
                installApk(apk);
            }
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webAppInterface != null) {
            webAppInterface.destroy();
            webAppInterface = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
