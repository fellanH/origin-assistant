#!/bin/bash

# Ralph Loop - Iterative Agent Task Runner
# Runs Claude Code agents sequentially through tasks until all complete

set -e

# Configuration
TASK_DIR="."
MAX_RETRIES=3
LOG_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Box drawing characters
BOX_TL="╭"
BOX_TR="╮"
BOX_BL="╰"
BOX_BR="╯"
BOX_H="─"
BOX_V="│"

# Create log directory
mkdir -p "$LOG_DIR"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Draw a horizontal line
draw_line() {
    local width=${1:-60}
    local char=${2:-$BOX_H}
    printf '%*s' "$width" | tr ' ' "$char"
}

# Print centered text
print_centered() {
    local text="$1"
    local width=${2:-60}
    local text_len=${#text}
    local padding=$(( (width - text_len) / 2 ))
    printf "%*s%s%*s" $padding "" "$text" $padding ""
}

# Display task completion summary
display_task_summary() {
    local task_file=$1
    local task_name=$(basename "$task_file" .md)
    local task_num=$(echo "$task_name" | grep -o '[0-9]*')
    local total_tasks=$(get_task_files | wc -l | tr -d ' ')

    # Calculate progress
    local completed=0
    for tf in $(get_task_files); do
        if [[ "$(check_task_status "$tf")" == "COMPLETE" ]]; then
            ((completed++))
        fi
    done
    local progress_pct=$((completed * 100 / total_tasks))

    # Extract summary from HANDOFF.md
    local summary=""
    local key_files=""
    local how_to_run=""

    if [[ -f "HANDOFF.md" ]]; then
        # Extract the section for this task
        local in_section=false
        local current_field=""
        while IFS= read -r line; do
            if [[ "$line" =~ "### Task $task_num:" ]]; then
                in_section=true
                continue
            fi
            if [[ "$in_section" == true && "$line" =~ "### Task" && ! "$line" =~ "Task $task_num:" ]]; then
                break
            fi
            if [[ "$in_section" == true ]]; then
                if [[ "$line" =~ "**Summary:**" ]]; then
                    summary="${line#*Summary:** }"
                fi
                if [[ "$line" =~ "**Key Files:**" ]]; then
                    current_field="files"
                    continue
                fi
                if [[ "$line" =~ "**How to Run:**" ]]; then
                    current_field="run"
                    continue
                fi
                if [[ "$line" =~ "**Decisions" || "$line" =~ "**Known" || "$line" == "---" ]]; then
                    current_field=""
                fi
                if [[ "$current_field" == "files" && "$line" =~ ^-\  ]]; then
                    key_files+="    ${line}\n"
                fi
                if [[ "$current_field" == "run" && "$line" =~ ^-\  ]]; then
                    how_to_run+="    ${line}\n"
                fi
            fi
        done < HANDOFF.md
    fi

    echo ""
    echo -e "${GREEN}${BOX_TL}$(draw_line 58)${BOX_TR}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${WHITE}${BOLD}✓ TASK COMPLETE${NC}$(printf '%42s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Task name
    echo -e "${GREEN}${BOX_V}${NC}  ${CYAN}${BOLD}Task $task_num${NC} completed successfully$(printf '%26s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Progress bar
    local bar_width=40
    local filled=$((progress_pct * bar_width / 100))
    local empty=$((bar_width - filled))
    local progress_bar=""
    for ((i=0; i<filled; i++)); do progress_bar+="█"; done
    for ((i=0; i<empty; i++)); do progress_bar+="░"; done

    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Progress:${NC} [${GREEN}${progress_bar}${NC}] ${WHITE}${progress_pct}%${NC}   ${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Tasks:${NC}   ${completed}/${total_tasks} complete$(printf '%33s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Summary
    if [[ -n "$summary" && "$summary" != "(To be filled by agent)" ]]; then
        echo -e "${GREEN}${BOX_V}${NC}  ${MAGENTA}Summary:${NC}$(printf '%48s')${GREEN}${BOX_V}${NC}"
        # Word wrap summary
        echo "$summary" | fold -s -w 54 | while IFS= read -r line; do
            printf "${GREEN}${BOX_V}${NC}  ${DIM}%s${NC}%*s${GREEN}${BOX_V}${NC}\n" "$line" $((56 - ${#line})) ""
        done
        echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    fi

    # Key files
    if [[ -n "$key_files" ]]; then
        echo -e "${GREEN}${BOX_V}${NC}  ${MAGENTA}Key Files:${NC}$(printf '%46s')${GREEN}${BOX_V}${NC}"
        echo -e "$key_files" | head -4 | while IFS= read -r line; do
            if [[ -n "$line" ]]; then
                local display_line=$(echo "$line" | sed 's/^    - //' | cut -c1-52)
                printf "${GREEN}${BOX_V}${NC}    ${DIM}•${NC} %-52s${GREEN}${BOX_V}${NC}\n" "$display_line"
            fi
        done
        echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    fi

    echo -e "${GREEN}${BOX_BL}$(draw_line 58)${BOX_BR}${NC}"
    echo ""
}

# Display final completion summary
display_final_summary() {
    local total_tasks=$(get_task_files | wc -l | tr -d ' ')

    echo ""
    echo -e "${GREEN}${BOX_TL}$(draw_line 58)${BOX_TR}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${WHITE}${BOLD}🎉 ALL TASKS COMPLETE!${NC}$(printf '%34s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Full progress bar
    local bar_width=40
    local progress_bar=""
    for ((i=0; i<bar_width; i++)); do progress_bar+="█"; done
    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Progress:${NC} [${GREEN}${progress_bar}${NC}] ${WHITE}100%${NC}  ${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}├$(draw_line 58)┤${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${CYAN}${BOLD}Summary of Completed Work${NC}$(printf '%31s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # List each task
    local task_num=1
    for task_file in $(get_task_files); do
        local summary=""
        if [[ -f "HANDOFF.md" ]]; then
            summary=$(grep -A2 "### Task $task_num:" HANDOFF.md | grep "Summary:" | sed 's/.*\*\*Summary:\*\* //' | cut -c1-45)
        fi
        if [[ -z "$summary" || "$summary" == "(To be filled by agent)" ]]; then
            summary="Completed"
        fi
        printf "${GREEN}${BOX_V}${NC}  ${GREEN}✓${NC} ${WHITE}Task %d:${NC} %-44s${GREEN}${BOX_V}${NC}\n" "$task_num" "$summary"
        ((task_num++))
    done

    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}├$(draw_line 58)┤${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Total tasks:${NC} ${WHITE}$total_tasks${NC}$(printf '%42s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Log files:${NC}   ${WHITE}./logs/${NC}$(printf '%39s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}${NC}  ${DIM}Handoff:${NC}     ${WHITE}HANDOFF.md${NC}$(printf '%36s')${GREEN}${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${GREEN}${BOX_BL}$(draw_line 58)${BOX_BR}${NC}"
    echo ""
}

# Display startup banner
display_startup() {
    local total_tasks=$(get_task_files | wc -l | tr -d ' ')
    local completed=0
    for tf in $(get_task_files); do
        if [[ "$(check_task_status "$tf")" == "COMPLETE" ]]; then
            ((completed++))
        fi
    done
    local remaining=$((total_tasks - completed))

    echo ""
    echo -e "${CYAN}${BOX_TL}$(draw_line 58)${BOX_TR}${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_V}${NC}  ${WHITE}${BOLD}🔄 RALPH LOOP${NC} - Agent Task Runner$(printf '%19s')${CYAN}${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}├$(draw_line 58)┤${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Task status list
    for task_file in $(get_task_files); do
        local status=$(check_task_status "$task_file")
        local task_name=$(basename "$task_file" .md)
        local icon status_color status_text

        case $status in
            COMPLETE)
                icon="✓"; status_color="${GREEN}"; status_text="Complete"
                ;;
            IN_PROGRESS)
                icon="→"; status_color="${YELLOW}"; status_text="In Progress"
                ;;
            *)
                icon="○"; status_color="${DIM}"; status_text="Pending"
                ;;
        esac

        printf "${CYAN}${BOX_V}${NC}  %s%-1s${NC} %-12s ${DIM}%s${NC}%*s${CYAN}${BOX_V}${NC}\n" \
            "$status_color" "$icon" "$task_name" "$status_text" $((32 - ${#status_text})) ""
    done

    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}├$(draw_line 58)┤${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    if [[ $remaining -gt 0 ]]; then
        echo -e "${CYAN}${BOX_V}${NC}  ${DIM}Starting with${NC} ${WHITE}$remaining${NC} ${DIM}task(s) remaining...${NC}$(printf '%22s')${CYAN}${BOX_V}${NC}"
    else
        echo -e "${CYAN}${BOX_V}${NC}  ${GREEN}All tasks already complete!${NC}$(printf '%29s')${CYAN}${BOX_V}${NC}"
    fi

    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_BL}$(draw_line 58)${BOX_BR}${NC}"
    echo ""
}

# Check if a task is complete by reading its status
check_task_status() {
    local task_file=$1
    if [[ -f "$task_file" ]]; then
        # Look for "Status: COMPLETE" in the file
        if grep -q "Status: COMPLETE" "$task_file"; then
            echo "COMPLETE"
        elif grep -q "Status: IN_PROGRESS" "$task_file"; then
            echo "IN_PROGRESS"
        else
            echo "PENDING"
        fi
    else
        echo "NOT_FOUND"
    fi
}

# Get list of task files sorted numerically
get_task_files() {
    ls -1 "$TASK_DIR"/task-*.md 2>/dev/null | sort -V
}

# Find the next incomplete task
find_next_task() {
    for task_file in $(get_task_files); do
        status=$(check_task_status "$task_file")
        if [[ "$status" != "COMPLETE" ]]; then
            echo "$task_file"
            return 0
        fi
    done
    echo ""
}

# Run Claude Code agent on a specific task
run_agent() {
    local task_file=$1
    local task_name=$(basename "$task_file" .md)
    local log_file="$LOG_DIR/${task_name}-$(date '+%Y%m%d-%H%M%S').log"

    log "Starting agent for: $task_name"
    log "Log file: $log_file"

    # Build the prompt for the agent
    local prompt="You are working on a multi-session software project.

IMPORTANT: Read these files first to understand context:
1. Read HANDOFF.md for project state and previous work
2. Read $task_file for your specific task

Your job:
1. Complete all requirements in $task_file
2. Update the task status to COMPLETE when done
3. Update HANDOFF.md with what you built
4. Commit your changes

Stay focused and efficient. Target completion within token budget.

Start by reading HANDOFF.md and $task_file, then begin work."

    # Run Claude Code with the task
    # Using --print for non-interactive mode, piping output to log
    # --dangerously-skip-permissions allows npm/build commands without prompts
    if claude --print --dangerously-skip-permissions "$prompt" 2>&1 | tee "$log_file"; then
        success "Agent session completed for $task_name"
        return 0
    else
        error "Agent session failed for $task_name"
        return 1
    fi
}

# Main loop
main() {
    # Check for task files
    task_count=$(get_task_files | wc -l | tr -d ' ')
    if [[ "$task_count" -eq 0 ]]; then
        error "No task files found (task-*.md)"
        exit 1
    fi

    # Show startup banner
    display_startup

    # Main task loop
    retry_count=0
    while true; do
        # Find next incomplete task
        next_task=$(find_next_task)

        if [[ -z "$next_task" ]]; then
            display_final_summary
            exit 0
        fi

        log "Next task: $(basename $next_task)"

        # Run the agent
        if run_agent "$next_task"; then
            # Check if task was actually completed
            status=$(check_task_status "$next_task")
            if [[ "$status" == "COMPLETE" ]]; then
                display_task_summary "$next_task"
                retry_count=0
            else
                warn "Agent finished but task not marked complete"
                ((retry_count++))
            fi
        else
            warn "Agent session ended with error"
            ((retry_count++))
        fi

        # Check retry limit
        if [[ $retry_count -ge $MAX_RETRIES ]]; then
            error "Max retries ($MAX_RETRIES) reached for $(basename $next_task)"
            error "Manual intervention required"
            exit 1
        fi

        # Brief pause between sessions
        if [[ -n "$(find_next_task)" ]]; then
            log "Pausing 5 seconds before next task..."
            sleep 5
        fi
    done
}

# Help text
show_help() {
    cat << EOF
Ralph Loop - Iterative Agent Task Runner

Usage: ./ralph-loop.sh [OPTIONS]

Options:
  -h, --help     Show this help message
  -s, --status   Show task status only (don't run agents)
  -r, --reset    Reset all tasks to PENDING status

Description:
  Runs Claude Code agents sequentially through task-*.md files.
  Each agent reads HANDOFF.md for context and updates it when done.
  Loop continues until all tasks are marked COMPLETE.

Task File Format:
  Tasks should have a status line: "## Status: PENDING|IN_PROGRESS|COMPLETE"

EOF
}

# Status only mode
show_status() {
    local total_tasks=$(get_task_files | wc -l | tr -d ' ')
    local completed=0
    for tf in $(get_task_files); do
        if [[ "$(check_task_status "$tf")" == "COMPLETE" ]]; then
            ((completed++))
        fi
    done
    local progress_pct=$((completed * 100 / total_tasks))

    echo ""
    echo -e "${CYAN}${BOX_TL}$(draw_line 58)${BOX_TR}${NC}"
    echo -e "${CYAN}${BOX_V}${NC}  ${WHITE}${BOLD}📊 TASK STATUS${NC}$(printf '%42s')${CYAN}${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    # Progress bar
    local bar_width=40
    local filled=$((progress_pct * bar_width / 100))
    local empty=$((bar_width - filled))
    local progress_bar=""
    for ((i=0; i<filled; i++)); do progress_bar+="█"; done
    for ((i=0; i<empty; i++)); do progress_bar+="░"; done

    echo -e "${CYAN}${BOX_V}${NC}  ${DIM}Progress:${NC} [${GREEN}${progress_bar}${NC}] ${WHITE}${progress_pct}%${NC}   ${CYAN}${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_V}${NC}  ${DIM}Complete:${NC} ${WHITE}${completed}/${total_tasks}${NC} tasks$(printf '%35s')${CYAN}${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}├$(draw_line 58)┤${NC}"
    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"

    for task_file in $(get_task_files); do
        local status=$(check_task_status "$task_file")
        local task_name=$(basename "$task_file" .md)
        local task_num=$(echo "$task_name" | grep -o '[0-9]*')
        local icon status_color

        case $status in
            COMPLETE)    icon="✓"; status_color="${GREEN}" ;;
            IN_PROGRESS) icon="→"; status_color="${YELLOW}" ;;
            *)           icon="○"; status_color="${DIM}" ;;
        esac

        # Get summary from HANDOFF.md if complete
        local summary=""
        if [[ "$status" == "COMPLETE" && -f "HANDOFF.md" ]]; then
            summary=$(grep -A2 "### Task $task_num:" HANDOFF.md 2>/dev/null | grep "Summary:" | sed 's/.*\*\*Summary:\*\* //' | cut -c1-35)
        fi

        printf "${CYAN}${BOX_V}${NC}  %s%-1s${NC} ${WHITE}%-10s${NC} %-11s" "$status_color" "$icon" "$task_name" "$status"
        if [[ -n "$summary" && "$summary" != "(To be filled" ]]; then
            printf " ${DIM}%s${NC}" "$summary"
        fi
        printf "%*s${CYAN}${BOX_V}${NC}\n" $((32 - ${#summary})) ""
    done

    echo -e "${CYAN}${BOX_V}$(draw_line 58 ' ')${BOX_V}${NC}"
    echo -e "${CYAN}${BOX_BL}$(draw_line 58)${BOX_BR}${NC}"
    echo ""
}

# Reset tasks
reset_tasks() {
    warn "Resetting all tasks to PENDING..."
    for task_file in $(get_task_files); do
        if [[ -f "$task_file" ]]; then
            # Replace status line
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' 's/Status: COMPLETE/Status: PENDING/g' "$task_file"
                sed -i '' 's/Status: IN_PROGRESS/Status: PENDING/g' "$task_file"
            else
                sed -i 's/Status: COMPLETE/Status: PENDING/g' "$task_file"
                sed -i 's/Status: IN_PROGRESS/Status: PENDING/g' "$task_file"
            fi
            log "Reset: $(basename $task_file)"
        fi
    done
    success "All tasks reset to PENDING"
}

# Parse arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -s|--status)
        show_status
        exit 0
        ;;
    -r|--reset)
        reset_tasks
        exit 0
        ;;
    *)
        main
        ;;
esac
