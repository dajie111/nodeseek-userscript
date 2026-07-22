#!/usr/bin/env bash

# 设置输出颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # 清除颜色

clear
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}                    Debian 系统状态综合简报                     ${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"

# 1. 基本系统信息
hostname=$(hostname)
kernel=$(uname -r)
uptime_str=$(uptime -p | sed 's/up //;s/ hours\?/小时/;s/ minutes\?/分钟/;s/ days\?/天/')
debian_ver=$(cat /etc/debian_version 2>/dev/null || echo "未知")

echo -e "\n${YELLOW}${BOLD}【 基础信息 】${NC}"
printf "  %-12s : %s\n" "主机名称" "$hostname"
printf "  %-12s : Debian %s\n" "系统版本" "$debian_ver"
printf "  %-12s : %s\n" "内核版本" "$kernel"
printf "  %-12s : %s\n" "运行时间" "$uptime_str"

# 2. CPU 信息及占用率
cpu_model=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | sed 's/^[ \t]*//')
cpu_cores=$(nproc)
# 使用 top 获取单次 CPU 使用率计算
cpu_idle=$(top -bn1 | grep "%Cpu(s)" | sed -n 's/.*,\s*\([0-9.]*\)\s*id.*/\1/p')
if [ -n "$cpu_idle" ]; then
    cpu_usage=$(awk "BEGIN {printf \"%.1f\", 100 - $cpu_idle}")
else
    cpu_usage="未知"
fi

echo -e "\n${YELLOW}${BOLD}【 CPU 状态 】${NC}"
printf "  %-12s : %s (%s 核心)\n" "CPU 型号" "$cpu_model" "$cpu_cores"
printf "  %-12s : %s%%\n" "当前使用率" "$cpu_usage"

# 3. 内存使用情况
read mem_total mem_used mem_free mem_buff_cache mem_avail < <(free -m | awk 'NR==2{print $2, $3, $4, $6, $7}')
mem_usage_pct=$(awk "BEGIN {printf \"%.1f\", ($mem_used/$mem_total)*100}")

echo -e "\n${YELLOW}${BOLD}【 内存状态 】${NC}"
printf "  %-12s : %s MB / %s MB (%s%%)\n" "内存占用" "$mem_used" "$mem_total" "$mem_usage_pct"
printf "  %-12s : %s MB\n" "可用内存" "$mem_avail"

# 4. 磁盘使用情况（过滤虚拟文件系统与重复统计）
echo -e "\n${YELLOW}${BOLD}【 磁盘占用 (主要挂载点) 】${NC}"
df -h -x tmpfs -x devtmpfs -x squashfs -x overlay | awk 'NR>1 {printf "  %-20s 总容量: %-8s 已用: %-8s 剩余: %-8s 占用率: %s\n", $NF, $2, $3, $4, $5}'

echo -e "\n${CYAN}================================================================${NC}"

# 5. Top 5 CPU 占用进程
echo -e "\n${GREEN}${BOLD}【 CPU 占用最高的前 5 个进程 】${NC}"
printf "${BOLD}  %-8s %-8s %-8s %-30s${NC}\n" "PID" "用户" "CPU(%)" "进程指令"
ps -eo pid,user,%cpu,comm --sort=-%cpu | head -n 6 | tail -n 5 | while read pid user cpu comm; do
    printf "  %-8s %-8s %-8s %-30s\n" "$pid" "$user" "$cpu" "$comm"
done

# 6. Top 5 内存占用进程
echo -e "\n${GREEN}${BOLD}【 内存占用最高的前 5 个进程 】${NC}"
printf "${BOLD}  %-8s %-8s %-8s %-30s${NC}\n" "PID" "用户" "内存(%)" "进程指令"
ps -eo pid,user,%mem,comm --sort=-%mem | head -n 6 | tail -n 5 | while read pid user mem comm; do
    printf "  %-8s %-8s %-8s %-30s\n" "$pid" "$user" "$mem" "$comm"
done

# 7. Top 5 磁盘 Reads/Writes I/O 读写最高进程 (依赖 /proc 统计)
echo -e "\n${GREEN}${BOLD}【 磁盘累积 I/O (读写总和) 最高的前 5 个进程 】${NC}"
printf "${BOLD}  %-8s %-12s %-30s${NC}\n" "PID" "总读写量" "进程指令"

# 检查是否有权限读取 /proc/$pid/io
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
        # 转换为易读格式 (KB/MB/GB)
        hr_size=$(awk -v b="$bytes" 'BEGIN {
            if (b >= 1073741824) printf "%.2f GB", b/1073741824;
            else if (b >= 1048576) printf "%.2f MB", b/1048576;
            else if (b >= 1024) printf "%.2f KB", b/1024;
            else printf "%d B", b;
        }')
        printf "  %-8s %-12s %-30s\n" "$pid" "$hr_size" "$comm"
    done
else
    echo -e "  ${RED}(需要 root 权限才能查看各进程的磁盘 I/O 读写状态)${NC}"
fi

echo -e "\n${CYAN}${BOLD}================================================================${NC}"
