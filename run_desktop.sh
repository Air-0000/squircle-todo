#!/bin/bash
# ==============================================================================
# 圆润灵动待办 · PC 桌面独立应用窗口启动器 (免除 Waydroid 显卡卡顿/开机卡死)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=8089

# 1. 检查或启动本地前端轻量服务
if ! curl -s "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
    echo "正在启动本地独立服务..."
    nohup npx vite preview --port $PORT --host 127.0.0.1 > /dev/null 2>&1 &
    sleep 1.5
fi

# 2. 以独立沉浸式原生窗口（无地址栏、手机 412x915 比例）直接启动 Chrome App 容器
echo "正在呼出独立应用窗口 (412x915 手机视图)..."
google-chrome \
    --app="http://127.0.0.1:$PORT" \
    --window-size=430,932 \
    --window-position=500,80 \
    --user-data-dir="/tmp/squircle_todo_desktop_app" \
    --disable-features=Translate \
    --no-first-run \
    --no-default-browser-check &

echo "🎉 桌面独立窗口已就绪！"
