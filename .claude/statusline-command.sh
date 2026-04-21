#!/bin/bash
input=$(cat)

# Model display name
model=$(echo "$input" | jq -r '.model.display_name // empty')

# Current working directory (use workspace.current_dir)
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
# Shorten home directory to ~
home="$HOME"
if [ -n "$home" ] && [ -n "$cwd" ]; then
  cwd="${cwd/#$home/~}"
fi

# Context remaining
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Rate limits
five_h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

# Build output parts
parts=()

if [ -n "$cwd" ]; then
  parts+=("$(printf '\033[34m%s\033[0m' "$cwd")")
fi

if [ -n "$model" ]; then
  parts+=("$(printf '\033[36m%s\033[0m' "$model")")
fi

if [ -n "$remaining" ]; then
  parts+=("$(printf '\033[33mctx: %.0f%%\033[0m' "$remaining")")
fi

rate_str=""
if [ -n "$five_h" ]; then
  rate_str="5h:$(printf '%.0f' "$five_h")%"
fi
if [ -n "$week" ]; then
  [ -n "$rate_str" ] && rate_str="$rate_str "
  rate_str="${rate_str}7d:$(printf '%.0f' "$week")%"
fi
if [ -n "$rate_str" ]; then
  parts+=("$(printf '\033[35m%s\033[0m' "$rate_str")")
fi

# Join parts with separator
printf '%s' "$(IFS='  |  '; echo "${parts[*]}")"
