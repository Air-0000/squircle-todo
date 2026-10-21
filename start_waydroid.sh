#!/bin/bash
# ==============================================================================
# Waydroid 启动助手 (针对 X11 会话自动嵌套 Wayland 合成器)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK_PATH="$DIR/app-debug.apk"

echo "=== 正在检测当前桌面环境 ==="
echo "XDG_SESSION_TYPE: $XDG_SESSION_TYPE"
echo "DISPLAY: $DISPLAY"

# 如果当前已经在 Wayland 环境下
if [ "$XDG_SESSION_TYPE" = "wayland" ] && [ -n "$WAYLAND_DISPLAY" ]; then
    echo "✓ 已处于原生 Wayland 环境 ($WAYLAND_DISPLAY)"
else
    echo "⚠️ 当前处于 X11 会话，检查嵌套 Wayland 合成器..."
    if which niri >/dev/null 2>&1; then
        if ! pgrep -x niri >/dev/null 2>&1; then
            echo "正在后台启动 niri 窗口..."
            niri &
            sleep 2
        else
            echo "✓ 检测到现有 niri 窗口实例已在运行"
        fi
        
        # 自动识别新生成的 wayland socket
        WAYLAND_SOCKET=$(ls -t /run/user/$(id -u)/wayland-* 2>/dev/null | head -n 1 | xargs -r basename)
        if [ -n "$WAYLAND_SOCKET" ]; then
            export WAYLAND_DISPLAY="$WAYLAND_SOCKET"
        else
            export WAYLAND_DISPLAY="wayland-1"
        fi
        echo "✓ 嵌套合成器已就绪，WAYLAND_DISPLAY=$WAYLAND_DISPLAY"
    elif which weston >/dev/null 2>&1; then
        if ! pgrep -x weston >/dev/null 2>&1; then
            weston &
            sleep 2
        fi
        export WAYLAND_DISPLAY="wayland-1"
        echo "✓ Weston 嵌套合成器已就绪"
    else
        echo "❌ 未检测到可用的嵌套合成器。请运行 'sudo apt install -y weston' 或注销切换至 Ubuntu Wayland 会话。"
        exit 1
    fi
fi

echo "=== 正在完全重置并启动 Waydroid 会话 (清理旧进程缓存) ==="
waydroid session stop 2>/dev/null || true
sleep 1
nohup waydroid session start > /tmp/waydroid_session.log 2>&1 &
sleep 3

if [ -f "$APK_PATH" ]; then
    echo "正在安装最新编译的 APK: $APK_PATH ..."
    waydroid app install "$APK_PATH" || true
fi

echo "=== 正在启动待办应用并在前台显示 ==="
waydroid show-full-ui &
sleep 1
waydroid app launch com.squircle.todo

echo "=========================================="
echo "🎉 启动完成！请查看 niri 窗口中的应用界面"
echo "=========================================="
