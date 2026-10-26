package com.squircle.todo;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * In-app updates, following CheckMarkScanner: the desktop update server publishes
 * squircle-todo/version.json three ways and every source is asked at once, picked by priority
 * (UpdateSourceResolver.pickSource). No UI here; each step is reported to the web app as an
 * event object (see src/stores/useUpdateStore.ts).
 */
public final class AppUpdater {

    /** Receives events such as {"type":"checked","status":"available",...}. Called on any thread. */
    public interface Listener {
        void onEvent(JSONObject event);
    }

    // Desktop update server on the LAN: fastest at home.
    static final String LAN_SOURCE = "http://10.0.0.192:8080/squircle-todo/version.json";
    // Same server through the SakuraFrp relay in Changsha (public CA certificate): used off the LAN.
    static final String RELAY_SOURCE = "https://www.haa95d85b.nyat.app:19846/squircle-todo/version.json";
    // Same server through Tailscale Funnel (entry overseas, slow): last resort.
    static final String FUNNEL_SOURCE =
            "https://constant-b850m-eagle-wifi6e-ice.taild05f40.ts.net:8443/squircle-todo/version.json";

    private static final String TAG = "AppUpdater";
    // LAN addresses never connect off the LAN, so give up on them quickly.
    private static final int LAN_CONNECT_TIMEOUT_MS = 3000;
    private static final int PUBLIC_CONNECT_TIMEOUT_MS = 8000;
    // Upper bound for asking all sources at once.
    private static final long RACE_MAX_MS = 15000;
    private static final long PROGRESS_INTERVAL_MS = 150;

    private final Activity activity;
    private final Listener listener;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService race = Executors.newCachedThreadPool();
    private final AtomicBoolean cancelled = new AtomicBoolean();
    // Last version.json newer than the installed app; downloadUpdate() fetches this one.
    private volatile UpdateInfo pending;

    static final class UpdateInfo {
        int versionCode;
        String versionName;
        String apkUrl;
        String apkSize;
        String updateLog;
        boolean forceUpdate;
        String sourceUrl; // the version.json that answered; decides the download route

        static UpdateInfo fromJson(String text, String sourceUrl) throws JSONException {
            JSONObject json = new JSONObject(text);
            UpdateInfo info = new UpdateInfo();
            info.versionCode = json.optInt("versionCode", 0);
            info.versionName = json.optString("versionName", "");
            info.apkUrl = json.optString("apkUrl", "");
            info.apkSize = json.optString("apkSize", "");
            info.updateLog = json.optString("updateLog", "");
            info.forceUpdate = json.optBoolean("forceUpdate", false);
            info.sourceUrl = sourceUrl;
            return info;
        }

        JSONObject toJson() throws JSONException {
            return new JSONObject()
                    .put("versionCode", versionCode)
                    .put("versionName", versionName)
                    .put("apkSize", apkSize)
                    .put("updateLog", updateLog)
                    .put("forceUpdate", forceUpdate);
        }
    }

    public AppUpdater(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    /** Emits one "checked" event: available (with the update), latest, or failed. */
    public void check() {
        worker.execute(() -> {
            List<String> sources = UpdateSourceResolver.buildSources(LAN_SOURCE, RELAY_SOURCE, FUNNEL_SOURCE);
            StringBuilder errors = new StringBuilder();
            UpdateInfo info = raceSources(sources, errors);
            try {
                JSONObject event = event("checked").put("current", currentVersion());
                if (info == null) {
                    event.put("status", "failed").put("message", errors.toString().trim());
                } else if (info.versionCode > currentVersionCode()) {
                    pending = info;
                    event.put("status", "available").put("update", info.toJson());
                } else {
                    pending = null;
                    event.put("status", "latest");
                }
                listener.onEvent(event);
            } catch (JSONException e) {
                Log.e(TAG, "Cannot report update check", e);
            }
        });
    }

    /**
     * Downloads the update found by check() and opens the system installer. Emits "progress"
     * events, then "installing", "needs_permission", "cancelled" or "error". A completed download
     * is kept, so calling this again after granting the install permission installs at once.
     */
    public void download() {
        final UpdateInfo info = pending;
        if (info == null) {
            emitError("没有可下载的更新，请先检查更新");
            return;
        }
        cancelled.set(false);
        worker.execute(() -> {
            try {
                File apk = new File(updatesDir(), "squircle-todo_v" + info.versionName + ".apk");
                if (!apk.exists()) fetchApk(info, apk);
                if (apk.exists()) install(apk);
            } catch (Exception e) {
                Log.w(TAG, "Update download failed", e);
                emitError(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        });
    }

    public void cancel() {
        cancelled.set(true);
    }

    /** Asks every source at once and returns the pick, or null with the reasons appended to errors. */
    private UpdateInfo raceSources(List<String> sources, StringBuilder errors) {
        int n = sources.size();
        int[] states = new int[n];
        UpdateInfo[] infos = new UpdateInfo[n];
        String[] failures = new String[n];
        BlockingQueue<Integer> finished = new LinkedBlockingQueue<>();
        for (int i = 0; i < n; i++) {
            final int idx = i;
            race.execute(() -> {
                try {
                    infos[idx] = fetchVersionJson(sources.get(idx));
                } catch (Exception e) {
                    failures[idx] = e.getMessage() != null ? e.getMessage() : e.toString();
                }
                finished.offer(idx);
            });
        }

        long start = SystemClock.elapsedRealtime();
        while (true) {
            long elapsed = SystemClock.elapsedRealtime() - start;
            int pick = UpdateSourceResolver.pickSource(sources, states, elapsed);
            if (pick >= 0) {
                Log.i(TAG, "Using update source " + sources.get(pick) + " after " + elapsed + "ms");
                return infos[pick];
            }
            if (pick == UpdateSourceResolver.PICK_NONE || elapsed > RACE_MAX_MS) {
                for (int i = 0; i < n; i++) {
                    errors.append(sources.get(i)).append(" → ")
                            .append(states[i] == UpdateSourceResolver.STATE_FAILED ? failures[i] : "超时").append('\n');
                }
                Log.w(TAG, "No update source answered:\n" + errors);
                return null;
            }
            long wait = UpdateSourceResolver.nextDecisionDelay(sources, states, elapsed, RACE_MAX_MS - elapsed);
            try {
                Integer idx = finished.poll(wait, TimeUnit.MILLISECONDS);
                if (idx != null) {
                    states[idx] = infos[idx] != null ? UpdateSourceResolver.STATE_OK : UpdateSourceResolver.STATE_FAILED;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
    }

    private UpdateInfo fetchVersionJson(String sourceUrl) throws Exception {
        HttpURLConnection conn = open(sourceUrl, 6000);
        try {
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) throw new Exception("HTTP " + code);
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int len;
                while ((len = in.read(buffer)) != -1) out.write(buffer, 0, len);
                return UpdateInfo.fromJson(out.toString(StandardCharsets.UTF_8.name()), sourceUrl);
            }
        } finally {
            conn.disconnect();
        }
    }

    /** Downloads to a .part file and renames it on completion, so an existing APK is always whole. */
    private void fetchApk(UpdateInfo info, File apk) throws Exception {
        HttpURLConnection conn = openFirstOk(UpdateSourceResolver.buildDownloadCandidates(info.sourceUrl, info.apkUrl));
        File part = new File(apk.getPath() + ".part");
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(part)) {
            long total = conn.getContentLengthLong();
            long done = 0;
            long lastReport = 0;
            byte[] buffer = new byte[16384];
            int len;
            while ((len = in.read(buffer)) != -1) {
                if (cancelled.get()) {
                    out.close();
                    part.delete();
                    listener.onEvent(event("cancelled"));
                    return;
                }
                out.write(buffer, 0, len);
                done += len;
                long now = SystemClock.elapsedRealtime();
                if (now - lastReport >= PROGRESS_INTERVAL_MS) {
                    lastReport = now;
                    listener.onEvent(event("progress").put("downloaded", done).put("total", total));
                }
            }
            listener.onEvent(event("progress").put("downloaded", done).put("total", total));
        } finally {
            conn.disconnect();
        }
        if (!part.renameTo(apk)) throw new Exception("无法保存安装包");
    }

    /** First candidate answering HTTP 200; anything else (e.g. a 404 page) is skipped, never saved as the APK. */
    private HttpURLConnection openFirstOk(List<String> candidates) throws Exception {
        StringBuilder errors = new StringBuilder();
        for (String candidate : candidates) {
            HttpURLConnection conn = null;
            try {
                conn = open(candidate, 15000);
                conn.setRequestProperty("Accept-Encoding", "identity");
                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_OK) return conn;
                errors.append("HTTP ").append(code);
            } catch (Exception e) {
                errors.append(e.getMessage());
            }
            errors.append(" (").append(candidate).append(")\n");
            if (conn != null) conn.disconnect();
        }
        throw new Exception("所有下载地址都不可用：\n" + errors.toString().trim());
    }

    private HttpURLConnection open(String url, int readTimeoutMs) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(UpdateSourceResolver.isPrivateHost(url) ? LAN_CONNECT_TIMEOUT_MS : PUBLIC_CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(readTimeoutMs);
        conn.setRequestProperty("User-Agent", "SquircleTodo/" + currentVersionName());
        return conn;
    }

    private void install(File apk) throws JSONException {
        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            listener.onEvent(event("needs_permission"));
            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                } catch (Exception e) {
                    Log.w(TAG, "Cannot open the install-permission screen", e);
                }
            });
            return;
        }
        Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        listener.onEvent(event("installing"));
        activity.runOnUiThread(() -> {
            try {
                activity.startActivity(intent);
            } catch (Exception e) {
                emitError("无法打开系统安装器：" + e.getMessage());
            }
        });
    }

    /** cache/updates/, cleared of other versions' APKs before a download. */
    private File updatesDir() throws Exception {
        File dir = new File(activity.getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("无法创建下载目录");
        UpdateInfo info = pending;
        File[] files = dir.listFiles();
        if (files != null && info != null) {
            String keep = "squircle-todo_v" + info.versionName + ".apk";
            for (File f : files) {
                if (!f.getName().equals(keep)) f.delete();
            }
        }
        return dir;
    }

    private void emitError(String message) {
        try {
            listener.onEvent(event("error").put("message", message));
        } catch (JSONException e) {
            Log.e(TAG, "Cannot report update error: " + message, e);
        }
    }

    private static JSONObject event(String type) throws JSONException {
        return new JSONObject().put("type", type);
    }

    private JSONObject currentVersion() throws JSONException {
        return new JSONObject().put("versionCode", currentVersionCode()).put("versionName", currentVersionName());
    }

    private long currentVersionCode() {
        try {
            return PackageInfoCompat.getLongVersionCode(packageInfo());
        } catch (Exception e) {
            return 0;
        }
    }

    private String currentVersionName() {
        try {
            String name = packageInfo().versionName;
            return name != null ? name : "";
        } catch (Exception e) {
            return "";
        }
    }

    private PackageInfo packageInfo() throws Exception {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
    }
}
