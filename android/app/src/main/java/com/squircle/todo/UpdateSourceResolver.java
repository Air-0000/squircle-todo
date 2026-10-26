package com.squircle.todo;

import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/**
 * Which update source to trust and where to download the APK from. Plain Java (no Android
 * dependencies) so it is unit-tested; ported from CheckMarkScanner's UpdateSourceResolver.
 */
public final class UpdateSourceResolver {

    private UpdateSourceResolver() {}

    // State of one source while all of them are asked at once.
    public static final int STATE_PENDING = 0;
    public static final int STATE_OK = 1;
    public static final int STATE_FAILED = 2;
    // pickSource results besides an index: keep waiting / every source failed.
    public static final int PICK_WAIT = -1;
    public static final int PICK_NONE = -2;
    // How long a higher-priority source that is still pending is waited for: the LAN answers
    // well within 1 s when the phone is on it; remote sources get 4 s.
    public static final long LAN_GRACE_MS = 1000;
    public static final long REMOTE_GRACE_MS = 4000;

    /** Sources in priority order, deduplicated; blanks and non-http entries are dropped. */
    public static List<String> buildSources(String... urls) {
        List<String> sources = new ArrayList<>();
        if (urls != null) {
            for (String url : urls) addIfValid(sources, url);
        }
        return sources;
    }

    /**
     * APK download candidates. sameHost is the file of the same name next to the version.json
     * that answered. From the LAN: sameHost first (fastest), then apkUrl. Otherwise apkUrl first
     * (the server hands out the quickest public address for the caller), then sameHost.
     * A relative apkUrl resolves against sourceUrl.
     */
    public static List<String> buildDownloadCandidates(String sourceUrl, String apkUrl) {
        List<String> candidates = new ArrayList<>();
        if (apkUrl == null || apkUrl.trim().isEmpty()) return candidates;
        String apk = apkUrl.trim();
        try {
            URL source = new URL(sourceUrl);
            URL resolved = new URL(source, apk);
            String path = resolved.getPath();
            String fileName = path.substring(path.lastIndexOf('/') + 1);
            String sameHost = fileName.isEmpty() ? null : new URL(source, fileName).toString();
            if (isPrivateHost(sourceUrl)) {
                addIfValid(candidates, sameHost);
                addIfValid(candidates, resolved.toString());
            } else {
                addIfValid(candidates, resolved.toString());
                addIfValid(candidates, sameHost);
            }
        } catch (Exception e) {
            addIfValid(candidates, apk);
        }
        return candidates;
    }

    /**
     * Picks a source while all are being asked (sources in priority order). Waits while a
     * higher-priority source is pending inside its grace window; otherwise takes the
     * highest-priority success. E.g. the LAN is used if it answers within 1 s, else the relay.
     *
     * @return the chosen index, PICK_WAIT or PICK_NONE
     */
    public static int pickSource(List<String> sources, int[] states, long elapsedMs) {
        boolean anyPending = false;
        for (int i = 0; i < sources.size(); i++) {
            if (states[i] == STATE_OK) return i;
            if (states[i] == STATE_PENDING) {
                if (elapsedMs < graceFor(sources.get(i))) return PICK_WAIT;
                anyPending = true;
            }
        }
        return anyPending ? PICK_WAIT : PICK_NONE;
    }

    /** Time until the next grace window ends (pickSource may change its answer then); maxMs if none. */
    public static long nextDecisionDelay(List<String> sources, int[] states, long elapsedMs, long maxMs) {
        long delay = maxMs;
        for (int i = 0; i < sources.size(); i++) {
            long grace = graceFor(sources.get(i));
            if (states[i] == STATE_PENDING && elapsedMs < grace) {
                delay = Math.min(delay, grace - elapsedMs);
            }
        }
        return Math.max(1, delay);
    }

    /** 10.x / 172.16–31.x / 192.168.x: unreachable off the LAN, so callers use short timeouts. */
    public static boolean isPrivateHost(String url) {
        try {
            String host = new URL(url).getHost();
            if (host.startsWith("10.") || host.startsWith("192.168.")) return true;
            if (host.startsWith("172.")) {
                int second = Integer.parseInt(host.split("\\.")[1]);
                return second >= 16 && second <= 31;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static long graceFor(String url) {
        return isPrivateHost(url) ? LAN_GRACE_MS : REMOTE_GRACE_MS;
    }

    private static void addIfValid(List<String> list, String url) {
        if (url == null) return;
        String u = url.trim();
        if (u.isEmpty() || !u.startsWith("http") || list.contains(u)) return;
        list.add(u);
    }
}
