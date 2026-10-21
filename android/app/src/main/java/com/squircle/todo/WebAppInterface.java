package com.squircle.todo;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.HapticFeedbackConstants;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;
import java.util.Scanner;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class WebAppInterface {
    private static final String TAG = "WebAppInterface";
    private final Activity activity;
    private WebView webView;
    private final ExecutorService executorService = Executors.newFixedThreadPool(4);
    private int insetTopDp = 0;
    private int insetBottomDp = 0;
    private int insetLeftDp = 0;
    private int insetRightDp = 0;

    public WebAppInterface(Activity activity) {
        this(activity, null);
    }

    public WebAppInterface(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    public void setWebView(WebView webView) {
        this.webView = webView;
    }

    public void destroy() {
        this.webView = null;
        try {
            executorService.shutdownNow();
        } catch (Exception ignored) {}
    }

    public synchronized void updateInsets(int topDp, int bottomDp, int leftDp, int rightDp) {
        this.insetTopDp = topDp;
        this.insetBottomDp = bottomDp;
        this.insetLeftDp = leftDp;
        this.insetRightDp = rightDp;
    }

    @JavascriptInterface
    public synchronized String getSafeAreaInsets() {
        return String.format(
            "{\"top\":%d,\"bottom\":%d,\"left\":%d,\"right\":%d}",
            insetTopDp, insetBottomDp, insetLeftDp, insetRightDp
        );
    }

    @JavascriptInterface
    public String getAppVersion() {
        try {
            android.content.pm.PackageInfo pInfo =
                    activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            long vCode = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                    ? pInfo.getLongVersionCode()
                    : pInfo.versionCode;
            return String.format(Locale.US, "{\"versionCode\":%d,\"versionName\":\"%s\"}", vCode, pInfo.versionName);
        } catch (Exception e) {
            return "{\"versionCode\":1,\"versionName\":\"1.0.0\"}";
        }
    }

    @JavascriptInterface
    public String getNetworkType() {
        try {
            ConnectivityManager cm =
                    (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return "unknown";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network net = cm.getActiveNetwork();
                if (net == null) return "none";
                NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                if (caps == null) return "none";
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    return "wifi";
                }
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                    return "cellular";
                }
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    return "wifi";
                }
                return "other";
            } else {
                NetworkInfo info = cm.getActiveNetworkInfo();
                if (info == null || !info.isConnected()) return "none";
                if (info.getType() == ConnectivityManager.TYPE_WIFI) return "wifi";
                if (info.getType() == ConnectivityManager.TYPE_MOBILE) return "cellular";
                return "other";
            }
        } catch (Exception e) {
            return "unknown";
        }
    }

    @JavascriptInterface
    public void setStatusBarTheme(final boolean dark, final String hexColor) {
        activity.runOnUiThread(() -> {
            try {
                if (hexColor != null && !hexColor.trim().isEmpty()) {
                    int parsedColor = Color.parseColor(hexColor.trim());
                    activity.getWindow().setStatusBarColor(parsedColor);
                    activity.getWindow().setNavigationBarColor(parsedColor);
                }

                WindowInsetsControllerCompat controller =
                        WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!dark);
                    controller.setAppearanceLightNavigationBars(!dark);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error applying status bar theme: " + hexColor, e);
            }
        });
    }

    @JavascriptInterface
    public void performHapticFeedback(final String type) {
        activity.runOnUiThread(() -> {
            try {
                Vibrator vibrator = getVibrator();
                if (vibrator == null || !vibrator.hasVibrator()) {
                    activity.getWindow().getDecorView().performHapticFeedback(
                            HapticFeedbackConstants.KEYBOARD_TAP
                    );
                    return;
                }

                if ("light".equalsIgnoreCase(type)) {
                    vibrator.vibrate(VibrationEffect.createOneShot(15, 70));
                } else if ("medium".equalsIgnoreCase(type)) {
                    vibrator.vibrate(VibrationEffect.createOneShot(30, 150));
                } else if ("heavy".equalsIgnoreCase(type)) {
                    vibrator.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                } else if ("success".equalsIgnoreCase(type)) {
                    long[] timings = new long[]{0, 20, 50, 35};
                    int[] amplitudes = new int[]{0, 100, 0, 180};
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
                } else if ("error".equalsIgnoreCase(type)) {
                    long[] timings = new long[]{0, 40, 40, 40, 40, 60};
                    int[] amplitudes = new int[]{0, 180, 0, 180, 0, 220};
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
                } else {
                    vibrator.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to perform haptic feedback for type: " + type, e);
                try {
                    activity.getWindow().getDecorView().performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
                } catch (Exception ignored) {}
            }
        });
    }

    @JavascriptInterface
    public void shareBackupFile(final String fileName, final String mimeType, final String content) {
        activity.runOnUiThread(() -> {
            try {
                File exportDir = new File(activity.getCacheDir(), "exports");
                if (!exportDir.exists() && !exportDir.mkdirs()) {
                    Log.e(TAG, "Failed to create exports directory in cache");
                    return;
                }

                String safeFileName = (fileName != null && !fileName.trim().isEmpty())
                        ? fileName.trim()
                        : ("backup_" + System.currentTimeMillis() + ".json");
                File targetFile = new File(exportDir, safeFileName);

                try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                }

                Uri uri = FileProvider.getUriForFile(
                        activity,
                        activity.getPackageName() + ".fileprovider",
                        targetFile
                );

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(mimeType != null && !mimeType.trim().isEmpty() ? mimeType.trim() : "text/plain");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(shareIntent, "Share Backup");
                activity.startActivity(chooser);
            } catch (IOException e) {
                Log.e(TAG, "File I/O error while preparing export: " + fileName, e);
            } catch (Exception e) {
                Log.e(TAG, "Error initiating share intent for: " + fileName, e);
            }
        });
    }

    @JavascriptInterface
    public void downloadAndInstallApk(final String primaryUrl, final String fallbackUrl, final String authHeader, final String versionName) {
        executorService.execute(() -> {
            File updatesDir = new File(activity.getCacheDir(), "updates");
            if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                updatesDir = activity.getExternalFilesDir(null);
            }
            if (updatesDir != null) updatesDir.setReadable(true, false);

            String safeName = (versionName != null && !versionName.trim().isEmpty())
                    ? "update_" + versionName.trim() + ".apk"
                    : "update_latest.apk";
            File targetApk = new File(updatesDir, safeName);

            String[] candidateUrls = new String[] { primaryUrl, fallbackUrl };
            boolean downloaded = false;
            String lastError = "";

            postUpdateProgress(0, 0, 0, "正在连接路由器高速更新通道...");

            for (String urlStr : candidateUrls) {
                if (urlStr == null || urlStr.trim().isEmpty()) continue;
                HttpURLConnection conn = null;
                try {
                    Log.i(TAG, "Attempting to download update from: " + urlStr);
                    URL url = new URL(urlStr);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(35000);
                    conn.setInstanceFollowRedirects(true);

                    if (authHeader != null && !authHeader.trim().isEmpty()) {
                        conn.setRequestProperty("Authorization", authHeader);
                    }

                    conn.connect();
                    int responseCode = conn.getResponseCode();

                    // Handle 301/302 redirects
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == HttpURLConnection.HTTP_MOVED_TEMP) {
                        String newUrl = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (newUrl != null) {
                            conn = (HttpURLConnection) new URL(newUrl).openConnection();
                            conn.setRequestMethod("GET");
                            conn.setConnectTimeout(8000);
                            conn.setReadTimeout(35000);
                            if (authHeader != null && !authHeader.trim().isEmpty()) {
                                conn.setRequestProperty("Authorization", authHeader);
                            }
                            conn.connect();
                            responseCode = conn.getResponseCode();
                        }
                    }

                    if (responseCode >= 200 && responseCode < 300) {
                        long totalBytes = conn.getContentLength();
                        long readBytes = 0;
                        int lastReportedPercent = -1;

                        try (java.io.InputStream is = conn.getInputStream();
                             FileOutputStream fos = new FileOutputStream(targetApk)) {
                            byte[] buffer = new byte[16384];
                            int len;
                            while ((len = is.read(buffer)) != -1) {
                                fos.write(buffer, 0, len);
                                readBytes += len;
                                if (totalBytes > 0) {
                                    int percent = (int) (readBytes * 100 / totalBytes);
                                    if (percent != lastReportedPercent && (percent % 4 == 0 || percent == 100)) {
                                        lastReportedPercent = percent;
                                        postUpdateProgress(percent, readBytes, totalBytes, "正在下载 " + percent + "%");
                                    }
                                }
                            }
                            fos.flush();
                        }

                        targetApk.setReadable(true, false);
                        downloaded = true;
                        postUpdateProgress(100, readBytes, readBytes, "下载完成，正在唤起系统安装器...");
                        break;
                    } else {
                        lastError = "HTTP " + responseCode;
                        Log.w(TAG, "Download failed from " + urlStr + " with HTTP " + responseCode);
                    }
                } catch (Exception e) {
                    lastError = e.getMessage() != null ? e.getMessage() : e.toString();
                    Log.w(TAG, "Failed downloading from " + urlStr + ": " + lastError);
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }

            if (downloaded && targetApk.exists() && targetApk.length() > 0) {
                activity.runOnUiThread(() -> {
                    if (activity instanceof MainActivity) {
                        ((MainActivity) activity).installApk(targetApk);
                    } else {
                        try {
                            Uri apkUri = FileProvider.getUriForFile(
                                    activity,
                                    activity.getPackageName() + ".fileprovider",
                                    targetApk
                            );
                            Intent intent = new Intent(Intent.ACTION_VIEW);
                            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            activity.startActivity(intent);
                        } catch (Exception e) {
                            Log.e(TAG, "Fallback launch installer failed", e);
                        }
                    }
                });
            } else {
                final String finalErr = lastError.isEmpty() ? "无法连接到路由器下载新版本" : lastError;
                activity.runOnUiThread(() -> {
                    android.widget.Toast.makeText(activity, "下载更新失败 (" + finalErr + ")，可使用浏览器下载", android.widget.Toast.LENGTH_LONG).show();
                });
                postUpdateError("下载失败: " + finalErr);
            }
        });
    }

    @JavascriptInterface
    public void downloadAndInstallApk(final String apkUrl, final String versionName) {
        downloadAndInstallApk(apkUrl, "", "", versionName);
    }

    @JavascriptInterface
    public void openBrowser(final String url) {
        if (url == null || url.trim().isEmpty()) return;
        activity.runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to open browser for: " + url, e);
                android.widget.Toast.makeText(activity, "无法打开系统浏览器", android.widget.Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public float getDisplayRefreshRate() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return activity.getDisplay().getRefreshRate();
            } else {
                return activity.getWindowManager().getDefaultDisplay().getRefreshRate();
            }
        } catch (Exception e) {
            return 60.0f;
        }
    }

    private void postUpdateProgress(int percent, long readBytes, long totalBytes, String statusText) {
        if (webView == null) return;
        webView.post(() -> {
            String js = String.format(Locale.ROOT,
                    "if (typeof window.__onNativeUpdateProgress === 'function') { window.__onNativeUpdateProgress(%d, %d, %d, '%s'); }",
                    percent, readBytes, totalBytes, statusText.replace("'", "\\'")
            );
            webView.evaluateJavascript(js, null);
        });
    }

    private void postUpdateError(String errorMsg) {
        if (webView == null) return;
        webView.post(() -> {
            String js = String.format(Locale.ROOT,
                    "if (typeof window.__onNativeUpdateError === 'function') { window.__onNativeUpdateError('%s'); }",
                    errorMsg.replace("'", "\\'")
            );
            webView.evaluateJavascript(js, null);
        });
    }

    @JavascriptInterface
    public String requestHttp(final String urlString, final String method, final String headersJson, final String body) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            String httpMethod = (method != null && !method.trim().isEmpty())
                    ? method.trim().toUpperCase(Locale.ROOT)
                    : "GET";
            conn.setRequestMethod(httpMethod);
            conn.setConnectTimeout(1500);
            conn.setReadTimeout(2500);
            conn.setDoInput(true);

            // Apply custom request headers (Authorization, Content-Type, etc.)
            if (headersJson != null && !headersJson.trim().isEmpty()) {
                try {
                    JSONObject headersObj = new JSONObject(headersJson);
                    Iterator<String> keys = headersObj.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        conn.setRequestProperty(key, headersObj.getString(key));
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to parse headers JSON: " + headersJson, e);
                }
            }

            // Write request body if present
            if (body != null && ("POST".equalsIgnoreCase(httpMethod) || "PUT".equalsIgnoreCase(httpMethod))) {
                conn.setDoOutput(true);
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                try (java.io.OutputStream os = conn.getOutputStream()) {
                    os.write(bytes);
                    os.flush();
                }
            }

            int statusCode = conn.getResponseCode();
            java.io.InputStream is = (statusCode >= 200 && statusCode < 400)
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            String responseBody = "";
            if (is != null) {
                try (Scanner s = new Scanner(is, StandardCharsets.UTF_8.name())) {
                    s.useDelimiter("\\A");
                    responseBody = s.hasNext() ? s.next() : "";
                }
            }

            JSONObject res = new JSONObject();
            res.put("status", statusCode);
            res.put("data", responseBody);
            res.put("ok", statusCode >= 200 && statusCode < 300);
            return res.toString();
        } catch (Exception e) {
            Log.e(TAG, "requestHttp failed for: " + urlString, e);
            try {
                JSONObject err = new JSONObject();
                err.put("status", 0);
                err.put("data", "");
                err.put("error", e.getMessage() != null ? e.getMessage() : e.toString());
                err.put("ok", false);
                return err.toString();
            } catch (Exception ignored) {
                return "{\"status\":0,\"data\":\"\",\"error\":\"Request failed\",\"ok\":false}";
            }
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    @JavascriptInterface
    public void requestHttpAsync(
            final String requestId,
            final String urlString,
            final String method,
            final String headersJson,
            final String body,
            final int timeoutMs
    ) {
        executorService.execute(() -> {
            HttpURLConnection conn = null;
            int statusCode = 0;
            String responseBody = "";
            boolean ok = false;
            String error = null;

            try {
                URL url = new URL(urlString);
                conn = (HttpURLConnection) url.openConnection();
                String httpMethod = (method != null && !method.trim().isEmpty())
                        ? method.trim().toUpperCase(Locale.ROOT)
                        : "GET";
                conn.setRequestMethod(httpMethod);

                int effectiveTimeout = (timeoutMs > 0 && timeoutMs <= 15000) ? timeoutMs : 2500;
                conn.setConnectTimeout(effectiveTimeout);
                conn.setReadTimeout(effectiveTimeout * 2);
                conn.setDoInput(true);

                if (headersJson != null && !headersJson.trim().isEmpty()) {
                    try {
                        JSONObject headersObj = new JSONObject(headersJson);
                        Iterator<String> keys = headersObj.keys();
                        while (keys.hasNext()) {
                            String key = keys.next();
                            conn.setRequestProperty(key, headersObj.getString(key));
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to parse headers JSON in requestHttpAsync: " + headersJson, e);
                    }
                }

                if (body != null && ("POST".equalsIgnoreCase(httpMethod) || "PUT".equalsIgnoreCase(httpMethod))) {
                    conn.setDoOutput(true);
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    try (java.io.OutputStream os = conn.getOutputStream()) {
                        os.write(bytes);
                        os.flush();
                    }
                }

                statusCode = conn.getResponseCode();
                java.io.InputStream is = (statusCode >= 200 && statusCode < 400)
                        ? conn.getInputStream()
                        : conn.getErrorStream();

                if (is != null) {
                    try (Scanner s = new Scanner(is, StandardCharsets.UTF_8.name())) {
                        s.useDelimiter("\\A");
                        responseBody = s.hasNext() ? s.next() : "";
                    }
                }
                ok = (statusCode >= 200 && statusCode < 300);
            } catch (Exception e) {
                statusCode = 0;
                responseBody = "";
                ok = false;
                error = e.getMessage() != null ? e.getMessage() : e.toString();
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }

            dispatchNativeHttpResponse(requestId, statusCode, responseBody, ok, error);
        });
    }

    private void dispatchNativeHttpResponse(
            final String requestId,
            final int status,
            final String data,
            final boolean ok,
            final String error
    ) {
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed() || webView == null) {
                return;
            }
            try {
                JSONObject res = new JSONObject();
                res.put("requestId", requestId != null ? requestId : "");
                res.put("status", status);
                res.put("data", data != null ? data : "");
                res.put("ok", ok);
                if (error != null) {
                    res.put("error", error);
                } else {
                    res.put("error", JSONObject.NULL);
                }

                String payload = res.toString();
                String js = "try { if (window.__onNativeHttpResponse) { window.__onNativeHttpResponse("
                        + JSONObject.quote(payload) + "); } } catch(e) {}";
                webView.evaluateJavascript(js, null);
            } catch (Exception e) {
                Log.e(TAG, "Failed to dispatch native HTTP response callback to WebView", e);
            }
        });
    }

    @SuppressWarnings("deprecation")
    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager =
                    (VibratorManager) activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vibratorManager != null) {
                return vibratorManager.getDefaultVibrator();
            }
        }
        return (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
    }
}
