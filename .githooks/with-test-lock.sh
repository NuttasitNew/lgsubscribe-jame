#!/bin/sh
# ล็อกกลางทั้งเครื่อง: ให้เทสต์ทั้งชุดรันได้ทีละโปรเจกต์ — โปรเจกต์อื่นที่จะรันทั้งชุดต้องรอคิว
# เหตุผล: หลายโปรเจกต์รันเทสต์ทั้งชุดพร้อมกันแล้ว RAM 24GB หมด เครื่องค้าง
# ใช้: sh .githooks/with-test-lock.sh <คำสั่ง...>
# ล็อกค้าง (เครื่องดับกลางทาง): สคริปต์เช็ค pid เจ้าของล็อกเอง ถ้าตายแล้วจะยึดล็อกต่อให้อัตโนมัติ
LOCK="${TEST_LOCK_DIR:-$HOME/.cache/test-run-lock}"
mkdir -p "$(dirname "$LOCK")"

waited=0
while ! mkdir "$LOCK" 2>/dev/null; do
  owner=$(cat "$LOCK/pid" 2>/dev/null || true)
  if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then
    rm -rf "$LOCK"
    continue
  fi
  if [ $((waited % 20)) -eq 0 ]; then
    echo "with-test-lock: เทสต์ทั้งชุดของ $(cat "$LOCK/repo" 2>/dev/null || echo 'โปรเจกต์อื่น') กำลังรันอยู่ — รอคิว ($((waited * 3)) วินาที)"
  fi
  waited=$((waited + 1))
  if [ $waited -gt 600 ]; then
    echo "with-test-lock: รอเกิน 30 นาที — ถ้าไม่มีเทสต์รันอยู่จริง ลบล็อกด้วย: rm -rf \"$LOCK\""
    exit 1
  fi
  sleep 3
done

echo $$ > "$LOCK/pid"
pwd > "$LOCK/repo"
trap 'rm -rf "$LOCK"' EXIT
trap 'exit 130' INT TERM

# จำกัด worker ของ vitest (ค่าจากเชลล์ทับได้)
: "${VITEST_MAX_WORKERS:=6}"
export VITEST_MAX_WORKERS

"$@"
