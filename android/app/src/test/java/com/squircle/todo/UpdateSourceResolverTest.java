package com.squircle.todo;

import static com.squircle.todo.UpdateSourceResolver.PICK_NONE;
import static com.squircle.todo.UpdateSourceResolver.PICK_WAIT;
import static com.squircle.todo.UpdateSourceResolver.STATE_FAILED;
import static com.squircle.todo.UpdateSourceResolver.STATE_OK;
import static com.squircle.todo.UpdateSourceResolver.STATE_PENDING;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class UpdateSourceResolverTest {
    private static final String LAN = "http://10.0.0.192:8080/squircle-todo/version.json";
    private static final String RELAY = "https://relay.example.com:19846/squircle-todo/version.json";
    private static final String FUNNEL = "https://box.example.ts.net:8443/squircle-todo/version.json";
    private static final List<String> SOURCES = Arrays.asList(LAN, RELAY, FUNNEL);

    @Test
    public void buildSourcesKeepsOrderAndDropsDuplicatesAndJunk() {
        assertEquals(Arrays.asList(LAN, RELAY), UpdateSourceResolver.buildSources(LAN, " ", null, "ftp://x", RELAY, LAN));
    }

    @Test
    public void lanAnswerWithinGraceWins() {
        assertEquals(PICK_WAIT, UpdateSourceResolver.pickSource(SOURCES, new int[]{STATE_PENDING, STATE_OK, STATE_PENDING}, 500));
        assertEquals(0, UpdateSourceResolver.pickSource(SOURCES, new int[]{STATE_OK, STATE_OK, STATE_PENDING}, 600));
    }

    @Test
    public void relayIsUsedOnceTheLanGraceRunsOut() {
        assertEquals(1, UpdateSourceResolver.pickSource(SOURCES, new int[]{STATE_PENDING, STATE_OK, STATE_PENDING}, 1200));
    }

    @Test
    public void funnelWaitsForTheRelayGraceThenWins() {
        int[] states = {STATE_FAILED, STATE_PENDING, STATE_OK};
        assertEquals(PICK_WAIT, UpdateSourceResolver.pickSource(SOURCES, states, 2000));
        assertEquals(2, UpdateSourceResolver.pickSource(SOURCES, states, 4100));
    }

    @Test
    public void allFailedPicksNone() {
        assertEquals(PICK_NONE, UpdateSourceResolver.pickSource(SOURCES, new int[]{STATE_FAILED, STATE_FAILED, STATE_FAILED}, 100));
    }

    @Test
    public void nextDecisionDelayIsTheNearestOpenGraceWindow() {
        int[] states = {STATE_PENDING, STATE_PENDING, STATE_PENDING};
        assertEquals(700, UpdateSourceResolver.nextDecisionDelay(SOURCES, states, 300, 15000));
        assertEquals(2800, UpdateSourceResolver.nextDecisionDelay(SOURCES, states, 1200, 15000));
        assertEquals(500, UpdateSourceResolver.nextDecisionDelay(SOURCES, states, 5000, 500));
    }

    @Test
    public void downloadPrefersTheLanCopyWhenTheLanAnswered() {
        assertEquals(Arrays.asList(
                        "http://10.0.0.192:8080/squircle-todo/squircle-todo_v1.4.0.apk",
                        "https://relay.example.com:19846/squircle-todo/squircle-todo_v1.4.0.apk"),
                UpdateSourceResolver.buildDownloadCandidates(LAN,
                        "https://relay.example.com:19846/squircle-todo/squircle-todo_v1.4.0.apk"));
    }

    @Test
    public void downloadPrefersApkUrlOffTheLan() {
        assertEquals(Arrays.asList(
                        "https://relay.example.com:19846/squircle-todo/squircle-todo_v1.4.0.apk",
                        "https://box.example.ts.net:8443/squircle-todo/squircle-todo_v1.4.0.apk"),
                UpdateSourceResolver.buildDownloadCandidates(FUNNEL,
                        "https://relay.example.com:19846/squircle-todo/squircle-todo_v1.4.0.apk"));
    }

    @Test
    public void relativeApkUrlResolvesAgainstTheSource() {
        assertEquals(Arrays.asList("https://box.example.ts.net:8443/squircle-todo/app.apk"),
                UpdateSourceResolver.buildDownloadCandidates(FUNNEL, "app.apk"));
    }

    @Test
    public void privateHosts() {
        assertTrue(UpdateSourceResolver.isPrivateHost(LAN));
        assertTrue(UpdateSourceResolver.isPrivateHost("http://172.20.1.1/x"));
        assertTrue(UpdateSourceResolver.isPrivateHost("http://192.168.1.2/x"));
        assertFalse(UpdateSourceResolver.isPrivateHost("http://172.32.1.1/x"));
        assertFalse(UpdateSourceResolver.isPrivateHost("http://100.99.125.73:8080/x"));
        assertFalse(UpdateSourceResolver.isPrivateHost(FUNNEL));
    }
}
