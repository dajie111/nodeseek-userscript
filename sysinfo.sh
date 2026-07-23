#!/usr/bin/env bash

# 设置输出颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # 清除颜色

# 刷新间隔时间（秒）
INTERVAL=2

# ==========================================
# 退出机制（恢复光标并清屏退出）
# ==========================================
cleanup() {
    # 1. 恢复终端光标显示
    tput cnorm 2>/dev/null || printf '\033[?25h'

    # 2. 退出时清屏
    clear

    # 3. 输出简洁的退出提示
    echo -e "${GREEN}实时监控已退出。${NC}"
    exit 0
}

# 捕获 Ctrl+C (SIGINT) 和 SIGTERM 信号
trap cleanup SIGINT SIGTERM

# 1. 启动时执行清屏
clear

# 2. 隐藏终端光标，提供流畅的刷新视觉体验
tput civis 2>/dev/null || printf '\033[?25l'

# ==========================================
# 实时监控主循环
# ==========================================
while true; do
    # 将光标定位到左上角 (0,0) 实现原位覆盖刷新
    tput cup 0 0 2>/dev/null || printf '\033[H'

    # 1. 基本系统信息
    hostname=$(hostname)
    kernel=$(uname -r)
    uptime_str=$(uptime -p | sed 's/up //;s/ hours\?/小时/;s/ minutes\?/分钟/;s/ days\?/天/')
    debian_ver=$(cat /etc/debian_version 2>/dev/null || echo "未知")

    echo -e "${YELLOW}${BOLD}【 基础信息 】${NC}\033[K"
    printf "  %-12s : %s\033[K\n" "主机名称" "$hostname"
    printf "  %-12s : Debian %s\033[K\n" "系统版本" "$debian_ver"
    printf "  %-12s : %s\033[K\n" "内核版本" "$kernel"
    printf "  %-12s : %s\033[K\n" "运行时间" "$uptime_str"

    # 2. CPU 信息及占用率
    cpu_model=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | sed 's/^[ \t]*//')
    cpu_cores=$(nproc)
    cpu_idle=$(top -bn1 | grep "%Cpu(s)" | sed -n 's/.*,\s*\([0-9.]*\)\s*id.*/\1/p')
    if [ -n "$cpu_idle" ]; then
        cpu_usage=$(awk "BEGIN {printf \"%.1f\", 100 - $cpu_idle}")
    else
        cpu_usage="未知"
    fi

    echo -e "\n${YELLOW}${BOLD}【 CPU 状态 】${NC}\033[K"
    printf "  %-12s : %s (%s 核心)\033[K\n" "CPU 型号" "$cpu_model" "$cpu_cores"
    printf "  %-12s : %s%%\033[K\n" "当前使用率" "$cpu_usage"

    # 3. 内存与虚拟内存 (Swap) 使用情况
    read mem_total mem_used mem_free mem_buff_cache mem_avail < <(free -m | awk 'NR==2{print $2, $3, $4, $6, $7}')
    read swap_total swap_used swap_free < <(free -m | awk 'NR==3{print $2, $3, $4}')

    mem_usage_pct=$(awk "BEGIN {printf \"%.1f\", ($mem_used/$mem_total)*100}")

    echo -e "\n${YELLOW}${BOLD}【 内存状态 】${NC}\033[K"
    printf "  %-12s : %s MB / %s MB (%s%%)\033[K\n" "物理内存" "$mem_used" "$mem_total" "$mem_usage_pct"
    printf "  %-12s : %s MB\033[K\n" "可用内存" "$mem_avail"

    if [ "$swap_total" -gt 0 ] 2>/dev/null; then
        swap_usage_pct=$(awk "BEGIN {printf \"%.1f\", ($swap_used/$swap_total)*100}")
        printf "  %-12s : %s MB / %s MB (%s%%)\033[K\n" "虚拟内存" "$swap_used" "$swap_total" "$swap_usage_pct"
    else
        printf "  %-12s : 未开启 / 0 MB\033[K\n" "虚拟内存"
    fi

    # 4. 磁盘使用情况
    echo -e "\n${YELLOW}${BOLD}【 磁盘占用 (主要挂载点) 】${NC}\033[K"
    df -h -x tmpfs -x devtmpfs -x squashfs -x overlay | awk 'NR>1 {printf "  挂载点: %-12s 总容量: %-8s 已用: %-8s 剩余: %-8s 占用率: %s\033[K\n", $NF, $2, $3, $4, $5}'

    echo -e "\n${CYAN}================================================================${NC}\033[K"

    # 5. Top 5 CPU 占用进程
    echo -e "\n${GREEN}${BOLD}【 CPU 占用最高的前 5 个进程 】${NC}\033[K"
    {
        printf "PID 用户 CPU(%%) 进程指令\n"
        ps -eo pid,user,%cpu,comm --sort=-%cpu | head -n 6 | tail -n 5
    } | column -t | sed 's/^/  /' | sed '1s/.*/\x1b[1m&\x1b[0m/' | while read -r line; do
        echo -e "${line}\033[K"
    done

    # 6. Top 5 内存占用进程
    echo -e "\n${GREEN}${BOLD}【 内存占用最高的前 5 个进程 】${NC}\033[K"
    {
        printf "PID 用户 内存(%%) 进程指令\n"
        ps -eo pid,user,%mem,comm --sort=-%mem | head -n 6 | tail -n 5
    } | column -t | sed 's/^/  /' | sed '1s/.*/\x1b[1m&\x1b[0m/' | while read -r line; do
        echo -e "${line}\033[K"
    done

    # 7. Top 5 磁盘 Reads/Writes I/O 读写最高进程
    echo -e "\n${GREEN}${BOLD}【 磁盘累积 I/O (读写总和) 最高的前 5 个进程 】${NC}\033[K"

    if [ -r "/proc/1/io" ]; then
        {
            printf "PID 总读写量 进程指令\n"
            for pid in /proc/[0-9]*; do
                pid_num=${pid##*/}
                if [ -r "$pid/io" ] && [ -r "$pid/comm" ]; then
                    rbytes=$(sed -n 's/^read_bytes: //p' "$pid/io" 2>/dev/null)
                    wbytes=$(sed -n 's/^write_bytes: //p' "$pid/io" 2>/dev/null)
                    comm=$(cat "$pid/comm" 2>/dev/null)
                    if [[ -n "$rbytes" && -n "$wbytes" ]]; then
                        total_bytes=$((rbytes + wbytes))
                        echo "$pid_num $total_bytes $comm"
                    fi
                fi
            done | sort -k2 -nr | head -n 5 | while read pid bytes comm; do
                hr_size=$(awk -v b="$bytes" 'BEGIN {
                    if (b >= 1073741824) printf "%.2fGB", b/1073741824;
                    else if (b >= 1048576) printf "%.2fMB", b/1048576;
                    else if (b >= 1024) printf "%.2fKB", b/1024;
                    else printf "%dB", b;
                }')
                echo "$pid $hr_size $comm"
            done
        } | column -t | sed 's/^/  /' | sed '1s/.*/\x1b[1m&\x1b[0m/' | while read -r line; do
            echo -e "${line}\033[K"
        done
    else
        echo -e "  ${RED}(需要 root 权限才能查看各进程的磁盘 I/O 读写状态)${NC}\033[K"
    fi

    echo -e "\n${CYAN}${BOLD}================================================================${NC}\033[K"
    echo -e "${YELLOW}按 Ctrl+C 即可退出监控${NC}\033[K"

    # 清除下方残存行
    printf "\033[J"

    sleep "$INTERVAL"
done
