#!/bin/bash

read_best_plaintext_from_clipboard() {
    local types type output

    types=$(wl-paste --list-types | grep -i '^text/plain')

    # Sort preferred charsets
    preferred_charsets=(
        'utf-8'
        'unicode'
        'us-ascii'
        'iso-8859'
    )

    # Try preferred charsets first
    for charset in "${preferred_charsets[@]}"; do
        type=$(echo "$types" | grep -i "$charset" | head -n 1)
        if [[ -n "$type" ]]; then
            output=$(wl-paste --no-newline --type "$type" 2>/dev/null)
            if [[ $? -eq 0 && -n "$output" ]]; then
                echo "$output"
                return 0
            fi
        fi
    done

    # Fallback to any other text/plain type
    for type in $types; do
        output=$(wl-paste --no-newline --type "$type" 2>/dev/null)
        if [[ $? -eq 0 && -n "$output" ]]; then
            echo "$output"
            return 0
        fi
    done

    echo "[cliphist] No valid text/plain content found" >&2
    return 1
}

cliphist_filter() {
    data=$(read_best_plaintext_from_clipboard)

    # Skip empty or whitespace-only entries
    [[ -z "$data" || "$data" =~ ^[[:space:]]*$ ]] && return

    # Trim surrounding whitespace
    data="$(echo "$data" | xargs)"

    # Basic filters: known token formats, keys, JWTs, PEM, "password"
    if [[ "$data" =~ ^[A-Za-z0-9]{32,}$ ]] ||
       [[ "$data" =~ ^sk-[A-Za-z0-9]{20,}$ ]] ||
       [[ "$data" =~ ^gh[pousr]_[A-Za-z0-9]{30,}$ ]] ||
       [[ "$data" =~ ^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$ ]] ||
       [[ "$data" =~ "-----BEGIN PRIVATE KEY-----" ]] ||
       [[ "$data" =~ [Pp]assword ]] ||
       [[ ${#data} -gt 500 ]]; then
        echo "[cliphist] Skipped: known sensitive pattern" >&2
        return
    fi

    # Password-like content: 8–32 characters, no spaces, and mixed content
    if [[ ${#data} -ge 8 && ${#data} -le 32 ]] &&
       [[ "$data" =~ ^[[:graph:]]+$ ]] &&                       # All visible (non-space) characters
       [[ "$data" =~ [A-Za-z] ]] &&                            # Contains letters
       {
         [[ "$data" =~ [0-9] && "$data" =~ [^A-Za-z0-9./] ]] ||     # letters + digits + special (excluding . and /)
         [[ "$data" =~ [0-9] ]] ||                                  # letters + digits
         [[ "$data" =~ [^A-Za-z0-9./] ]]                            # letters + special (excluding . and /)
       }; then
        echo "[cliphist] Skipped: likely password (8–32 chars, no space, mixed content)" >&2
        return
    fi

    echo "$data" | cliphist store
}

# Export the function so it's available in the child shell
export -f cliphist_filter
export -f read_best_plaintext_from_clipboard

# Run the function every time clipboard changes
wl-paste --type text --watch bash -c cliphist_filter
