#!/usr/bin/env bash

# 设置输出颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m'

# 刷新间隔时间（秒）
INTERVAL=2

# 辅助函数：读取 /proc/stat 获取 CPU 状态
get_cpu_stat() {
    read -r _ user nice sys idle iowait irq softirq steal _ < /proc/stat
    local total=$((user + nice + sys + idle + iowait + irq + softirq + steal))
    local idle_total=$((idle + iowait))
    echo "$total $idle_total"
}

# 辅助函数：获取公网 IPv4
get_ipv4() {
    local ip
    ip=$(ip -4 addr show scope global 2>/dev/null | \
        grep -vE 'docker|br-|veth' | \
        grep -oP '(?<=inet\s)[0-9\.\/]+' | \
        grep -vE '^(10\.|192\.168\.|127\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)')
    echo "${ip:-无}"
}

# 辅助函数：获取公网 IPv6
get_ipv6() {
    local ip
    ip=$(ip -6 addr show scope global 2>/dev/null | \
        grep -vE 'docker|br-|veth' | \
        grep -oP '(?<=inet6\s)[a-f0-9:\/]+' | \
        grep -vE '^(fe80|fc00|fd00)')
    echo "${ip:-无}"
}

# 辅助函数：检测发行版并生成安装/卸载提示
get_pkg_management_info() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian|raspbian)
                echo "安装命令: apt update && apt install -y nethogs"
                echo "卸载命令: apt remove -y nethogs"
                ;;
            centos|rhel|almalinux|rocky)
                echo "安装命令: yum install -y epel-release && yum install -y nethogs"
                echo "卸载命令: yum remove -y nethogs"
                ;;
            fedora)
                echo "安装命令: dnf install -y nethogs"
                echo "卸载命令: dnf remove -y nethogs"
                ;;
            alpine)
                echo "安装命令: apk add nethogs"
                echo "卸载命令: apk del nethogs"
                ;;
            arch|manjaro)
                echo "安装命令: pacman -S --noconfirm nethogs"
                echo "卸载命令: pacman -R --noconfirm nethogs"
                ;;
            *)
                echo "安装命令: 请根据系统包管理器手动安装 nethogs (如 apt/yum/dnf/apk)"
                echo "卸载命令: 请根据系统包管理器手动卸载 nethogs"
                ;;
        esac
    else
        echo "安装命令: 请根据系统包管理器手动安装 nethogs"
        echo "卸载命令: 请根据系统包管理器手动卸载 nethogs"
    fi
}

# 初始化 CPU 状态
read -r prev_total prev_idle < <(get_cpu_stat)

# 退出机制
cleanup() {
    tput cnorm 2>/dev/null || printf '\033[?25h'
    clear
    echo -e "${GREEN}实时监控已退出。${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

clear
tput civis 2>/dev/null || printf '\033[?25l'

while true; do
    tput cup 0 0 2>/dev/null || printf '\033[H'

    # 1. 基础信息
    hostname=$(hostname)
    kernel=$(uname -r)
    debian_ver=$(cat /etc/debian_version 2>/dev/null || echo "非 Debian/未知")
    
    uptime_str=$(awk '{
        total_sec = int($1);
        days = int(total_sec / 86400);
        hours = int((total_sec % 86400) / 3600);
        mins = int((total_sec % 3600) / 60);
        
        if (days > 0) {
            printf "%d天, %d小时, %d分钟", days, hours, mins;
        } else if (hours > 0) {
            printf "%d小时, %d分钟", hours, mins;
        } else {
            printf "%d分钟", mins;
        }
    }' /proc/uptime)
    
    echo -e "${YELLOW}${BOLD}【 基础信息 】${NC}\033[K"
    echo -e "  主机名称   : $hostname\033[K"
    echo -e "  系统版本   : Debian $debian_ver\033[K"
    echo -e "  内核版本   : $kernel\033[K"
    echo -e "  运行时间   : $uptime_str\033[K"
    
    first=1
    while read -r ip; do
        if [[ -n "$ip" ]]; then
            if [[ $first -eq 1 ]]; then
                echo -e "  IPv4 地址  : ${WHITE}${ip}${NC}\033[K"
                first=0
            else
                echo -e "               ${WHITE}${ip}${NC}\033[K"
            fi
        fi
    done <<< "$(get_ipv4)"

    first=1
    while read -r ip; do
        if [[ -n "$ip" ]]; then
            if [[ $first -eq 1 ]]; then
                echo -e "  IPv6 地址  : ${WHITE}${ip}${NC}\033[K"
                first=0
            else
                echo -e "               ${WHITE}${ip}${NC}\033[K"
            fi
        fi
    done <<< "$(get_ipv6)"

    # 2. CPU 状态
    cpu_model=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | sed 's/^[ \t]*//')
    cpu_cores=$(nproc)

    read -r curr_total curr_idle < <(get_cpu_stat)
    diff_total=$((curr_total - prev_total))
    diff_idle=$((curr_idle - prev_idle))

    if [ "$diff_total" -gt 0 ]; then
        cpu_usage=$(awk -v dt="$diff_total" -v di="$diff_idle" 'BEGIN { printf "%.1f", (1 - di/dt)*100 }')
    else
        cpu_usage="0.0"
    fi

    prev_total=$curr_total
    prev_idle=$curr_idle

    echo -e "\n${YELLOW}${BOLD}【 CPU 状态 】${NC}\033[K"
    echo -e "  CPU 型号   : $cpu_model ($cpu_cores 核心)\033[K"
    echo -e "  当前使用率 : ${cpu_usage}%\033[K"

    # 3. 内存状态
    read mem_total mem_used mem_free mem_buff_cache mem_avail < <(free -m | awk 'NR==2{print $2, $3, $4, $6, $7}')
    read swap_total swap_used swap_free < <(free -m | awk 'NR==3{print $2, $3, $4}')

    mem_usage_pct=$(awk "BEGIN {printf \"%.1f\", ($mem_used/$mem_total)*100}")

    echo -e "\n${YELLOW}${BOLD}【 内存状态 】${NC}\033[K"
    echo -e "  物理内存   : $mem_used MB / $mem_total MB ($mem_usage_pct%)\033[K"
    echo -e "  可用内存   : $mem_avail MB\033[K"

    if [ "$swap_total" -gt 0 ] 2>/dev/null; then
        swap_usage_pct=$(awk "BEGIN {printf \"%.1f\", ($swap_used/$swap_total)*100}")
        echo -e "  虚拟内存   : $swap_used MB / $swap_total MB ($swap_usage_pct%)\033[K"
    else
        echo -e "  虚拟内存   : 未开启 / 0 MB\033[K"
    fi

    # 4. 磁盘状态
    echo -e "\n${YELLOW}${BOLD}【 磁盘占用 (主要挂载点) 】${NC}\033[K"
    df -h -x tmpfs -x devtmpfs -x squashfs -x overlay | awk 'NR>1 {printf "  挂载点: %-30s 总容量: %-8s 已用: %-8s 剩余: %-8s 占用率: %s\033[K\n", $NF, $2, $3, $4, $5}'

    echo -e "\n${CYAN}================================================================${NC}\033[K"

    # 5. Top 5 CPU 进程
    echo -e "\n${GREEN}${BOLD}【 CPU 占用最高的前 5 个进程 】${NC}\033[K"
    echo -e "  ${BOLD}PID       用户        CPU(%)    进程指令${NC}\033[K"
    ps -eo pid,user,%cpu,comm --sort=-%cpu | head -n 6 | tail -n 5 | while read pid user cpu comm; do
        printf "  %-9s %-11s %-9s %-30s\033[K\n" "$pid" "$user" "$cpu" "$comm"
    done

    # 6. Top 5 内存进程
    echo -e "\n${GREEN}${BOLD}【 内存占用最高的前 5 个进程 】${NC}\033[K"
    echo -e "  ${BOLD}PID       用户        内存(%)   进程指令${NC}\033[K"
    ps -eo pid,user,%mem,comm --sort=-%mem | head -n 6 | tail -n 5 | while read pid user mem comm; do
        printf "  %-9s %-11s %-9s %-30s\033[K\n" "$pid" "$user" "$mem" "$comm"
    done

    # 7. Top 5 磁盘 I/O 进程
    echo -e "\n${GREEN}${BOLD}【 磁盘累积 I/O (读写总和) 最高的前 5 个进程 】${NC}\033[K"
    echo -e "  ${BOLD}PID       总读写量        进程指令${NC}\033[K"

    if [ -r "/proc/1/io" ]; then
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
                if (b >= 1073741824) printf "%.2f GB", b/1073741824;
                else if (b >= 1048576) printf "%.2f MB", b/1048576;
                else if (b >= 1024) printf "%.2f KB", b/1024;
                else printf "%d B", b;
            }')
            printf "  %-9s %-15s %-30s\033[K\n" "$pid" "$hr_size" "$comm"
        done
    else
        echo -e "  ${RED}(需要 root 权限才能查看各进程的磁盘 I/O 读写状态)${NC}\033[K"
    fi

    # 8. Top 5 网络带宽进程 (使用 nethogs 实时抓取)
    if command -v nethogs >/dev/null 2>&1; then
        if [ "$EUID" -ne 0 ]; then
            echo -e "  ${RED}(需要 root 权限运行 nethogs 才能捕获网络流量)${NC}\033[K"
        else
            echo -e "  ${BOLD}进程 / PID                      发送速率 (KB/s)    接收速率 (KB/s)${NC}\033[K"
            # 运行 nethogs 单次采集模式 (-t -c 2)，过滤多余文本
            nethogs_output=$(nethogs -t -c 2 2>/dev/null | grep -E '/[0-9]+' | tail -n +2)

            if [ -n "$nethogs_output" ]; then
                echo "$nethogs_output" | awk '
                {
                    prog=$1;
                    sent=$2;
                    recv=$3;
                    # 计算总流量进行排序
                    total = sent + recv;
                    print total, prog, sent, recv;
                }' | sort -nr | head -n 5 | while read total prog sent recv; do
                    printf "  %-30s %-18s %-18s\033[K\n" "$prog" "$sent" "$recv"
                done
            else
                echo -e "  ${YELLOW}暂无网络传输数据...${NC}\033[K"
            fi
        fi
    else
        echo -e "  ${RED}未检测到 nethogs 工具，无法按进程统计网速。${NC}\033[K"
        echo -e "  请在退出脚本后，运行以下对应命令进行安装/管理：\033[K"
        
        # 自动识别系统输出安装与卸载指令
        read pkg_install pkg_remove < <(get_pkg_management_info | tr '\n' '|')
        echo -e "    ${CYAN}$(get_pkg_management_info | sed -n '1p')${NC}\033[K"
        echo -e "    ${YELLOW}$(get_pkg_management_info | sed -n '2p')${NC}\033[K"
    fi

    echo -e "\n${CYAN}${BOLD}================================================================${NC}\033[K"
    echo -e "${YELLOW}按 Ctrl+C 即可退出监控${NC}\033[K"

    printf "\033[J"
    sleep "$INTERVAL"
done
