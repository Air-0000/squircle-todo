package com.squircle.todo;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.HapticFeedbackConstants;
import android.webkit.JavascriptInterface;

import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Exposed to the web app as window.AndroidBridge. Keep in sync with
 * src/types/bridge.d.ts — every @JavascriptInterface method here is callable
 * by any script running in the WebView.
 */
public class WebAppInterface {
    private static final String TAG = "WebAppInterface";
    private final Activity activity;
    private final AppUpdater updater;

    public WebAppInterface(Activity activity, AppUpdater.Listener updateListener) {
        this.activity = activity;
        this.updater = new AppUpdater(activity, updateListener);
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

                // Keep only the last path segment so a crafted name can't escape exports/.
                String safeFileName = (fileName != null && !fileName.trim().isEmpty())
                        ? new File(fileName.trim()).getName()
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

    /** Opens http(s) links in the system browser; other schemes are ignored. */
    @JavascriptInterface
    public void openBrowser(final String url) {
        if (url == null || url.trim().isEmpty()) return;
        final Uri uri = Uri.parse(url.trim());
        final String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            Log.w(TAG, "Refusing to open non-web URL: " + url);
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
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

    // In-app update: results arrive asynchronously through window.__onUpdateEvent.

    @JavascriptInterface
    public void checkForUpdate() {
        updater.check();
    }

    @JavascriptInterface
    public void downloadUpdate() {
        updater.download();
    }

    @JavascriptInterface
    public void cancelUpdateDownload() {
        updater.cancel();
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
