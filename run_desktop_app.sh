#!/usr/bin/env bash
# ==============================================================================
# run_desktop_app.sh — 电脑桌面独立手机窗口运行脚本 (Linux PC)
#
# 特性：
#   - 极速秒开（免下载 GB 级虚拟机系统镜像，无需配置庞大模拟器）
#   - 独立手机比例窗口（420x920），无多余浏览器边框与地址栏，高保真还原手机体验
#   - 完整支持所有交互：自填待办、方框划掉、日历打卡追溯、冷暖早晚换肤、本地数据导出
#   - 窗口关闭时自动清理后台服务与端口占用
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT=8099
DIST_DIR="$SCRIPT_DIR/dist"

# 1. 确保已编译前端资源
if [ ! -f "$DIST_DIR/index.html" ]; then
    echo "==> 未检测到编译产物，正在快速构建..."
    npm run build
fi

# 2. 检查并清理旧的端口占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "==> 释放端口 $PORT..."
    kill -9 $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 0.5
fi

# 3. 启动本地轻量静态服务
echo "==> 启动本地服务 (http://localhost:$PORT)..."
python3 -m http.server $PORT --directory "$DIST_DIR" >/dev/null 2>&1 &
SERVER_PID=$!

# 退出时清理后台服务
cleanup() {
    echo ""
    echo "==> 正在退出桌面窗口并关闭本地服务..."
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# 等待端口就绪
sleep 0.6

# 4. 查找 Chrome 或 Chromium 浏览器
CHROME_BIN=""
if command -v google-chrome >/dev/null 2>&1; then
    CHROME_BIN="google-chrome"
elif command -v google-chrome-stable >/dev/null 2>&1; then
    CHROME_BIN="google-chrome-stable"
elif command -v chromium >/dev/null 2>&1; then
    CHROME_BIN="chromium"
elif command -v chromium-browser >/dev/null 2>&1; then
    CHROME_BIN="chromium-browser"
fi

if [ -z "$CHROME_BIN" ]; then
    echo "⚠️ 未找到 Chrome/Chromium 浏览器，正在尝试使用系统默认浏览器打开..."
    xdg-open "http://localhost:$PORT"
    echo "按 Ctrl+C 停止服务..."
    wait $SERVER_PID
    exit 0
fi

PROFILE_DIR="/tmp/squircle_todo_desktop_profile"

echo "======================================================================"
echo "🚀 已成功启动「圆润灵动待办」电脑独立手机窗口！"
echo "   运行地址: http://localhost:$PORT"
echo "   窗口规格: 420 × 920 (Android 移动端黄金纵横比)"
echo "   按 Ctrl+C 或直接关闭桌面窗口即可退出"
echo "======================================================================"

# 5. 以独立 App 模式启动，无地址栏与标签栏，手机窗口尺寸
"$CHROME_BIN" \
    --app="http://localhost:$PORT" \
    --window-size="420,920" \
    --user-data-dir="$PROFILE_DIR" \
    --enable-features=OverlayScrollbar \
    --disable-features=Translate \
    --disable-session-crashed-bubble \
    >/dev/null 2>&1

