#!/bin/bash
# Define the source and destination directories
# Leave SRC_DIR as "" to default to the current working directory

SRC_DIR=""
PLUGIN_NAME="folder-follow"
DEST_DIRS=(
    "/Users/josh/VaultDEV/.obsidian/plugins"
    "/Users/josh/VaultSchar/.obsidian/plugins"
)
# Define the list of filenames (just the names, no paths)
FILENAMES=(
    "main.js"
    "manifest.json"
    "styles.css"
)
# 1. Fallback to current directory if SRC_DIR is blank or unset
SRC_DIR="${SRC_DIR:-.}"
# 2. Fail-fast: Ensure the source directory actually exists
if [[ ! -d "$SRC_DIR" ]]; then
    echo "Error: Source directory '$SRC_DIR' does not exist." >&2
    exit 1
fi
# Array to hold full paths of files that actually exist
VALID_FILES=()
# 3. Combine source directory with filenames and verify existence
for file in "${FILENAMES[@]}"; do
    FULL_PATH="$SRC_DIR/$file"
    if [[ -f "$FULL_PATH" ]]; then
        VALID_FILES+=("$FULL_PATH")
    fi
done
# 4. Exit early if no valid files found
if (( ${#VALID_FILES[@]} == 0 )); then
    echo "Notice: No valid files found to copy."
    exit 0
fi

# 5. Display destinations and prompt user
N=${#DEST_DIRS[@]}
TOTAL_OPTIONS=$((N + 1))

SELECTED_DIRS=()
SELECTED_ENTRIES=()

if [[ $TOTAL_OPTIONS -le 2 ]]; then
    # Simple prompt when there are 2 or fewer options
    echo "Available deployment destinations:"
    for ((i=0; i<N; i++)); do
        echo "$((i+1)). ${DEST_DIRS[i]}"
    done
    echo "$TOTAL_OPTIONS. ALL"
    echo
    read -p "Select destination (1-$TOTAL_OPTIONS): " choice
    
    if [[ "$choice" -eq "$TOTAL_OPTIONS" ]]; then
        SELECTED_DIRS=("${DEST_DIRS[@]}")
        for ((i=0; i<N; i++)); do
            SELECTED_ENTRIES+=("$((i+1)). ${DEST_DIRS[i]}")
        done
    elif [[ "$choice" -ge 1 && "$choice" -le "$N" ]]; then
        SELECTED_DIRS+=("${DEST_DIRS[choice-1]}")
        SELECTED_ENTRIES+=("${choice}. ${DEST_DIRS[choice-1]}")
    else
        echo "No valid destinations selected."
        exit 0
    fi
else
    # Interactive checkbox menu when there are more than 2 options
    selected=()
    for ((i=0; i<N; i++)); do
        selected+=(0)
    done

    while true; do
        clear
        echo "Available deployment destinations:"
        for ((i=0; i<N; i++)); do
            box="[ ]"
            if [[ ${selected[i]} -eq 1 ]]; then
                box="[x]"
            fi
            echo "$((i+1)). $box ${DEST_DIRS[i]}"
        done
        
        all_selected=1
        for s in "${selected[@]}"; do
            if [[ $s -eq 0 ]]; then
                all_selected=0
                break
            fi
        done
        
        all_box="[ ]"
        if [[ $all_selected -eq 1 ]]; then
            all_box="[x]"
        fi
        echo "$TOTAL_OPTIONS. $all_box ALL"
        echo
        echo "Press a number (1-$TOTAL_OPTIONS) to toggle checkbox, or press ENTER to confirm."
        
        # Read a single key quietly
        read -s -n1 char
        
        # Enter key confirms selection (char is empty)
        if [[ -z "$char" ]]; then
            break
        fi
        
        # Toggle checkbox logic
        if [[ "$char" -ge 1 && "$char" -le "$N" ]]; then
            idx=$((char - 1))
            if [[ ${selected[idx]} -eq 1 ]]; then
                selected[idx]=0
            else
                selected[idx]=1
            fi
        elif [[ "$char" -eq "$TOTAL_OPTIONS" ]]; then
            if [[ $all_selected -eq 1 ]]; then
                for ((i=0; i<N; i++)); do
                    selected[i]=0
                done
            else
                for ((i=0; i<N; i++)); do
                    selected[i]=1
                done
            fi
        fi
    done

    # Collate selected directories
    for ((i=0; i<N; i++)); do
        if [[ ${selected[i]} -eq 1 ]]; then
            SELECTED_DIRS+=("${DEST_DIRS[i]}")
            SELECTED_ENTRIES+=("$((i+1)). ${DEST_DIRS[i]}")
        fi
    done
fi

if (( ${#SELECTED_DIRS[@]} == 0 )); then
    echo "No destinations selected. Exiting."
    exit 0
fi

# Print final selections for clarity and ask for confirmation
clear
echo "Selected destinations for deployment:"
for entry in "${SELECTED_ENTRIES[@]}"; do
    echo "  $entry"
done
echo

read -p "Proceed with deployment? (y/n): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi
echo

# 6. Fail-fast: Ensure all selected destination directories exist
for DEST_DIR in "${SELECTED_DIRS[@]}"; do
    if [[ ! -d "$DEST_DIR" ]]; then
        echo "Error: Destination directory '$DEST_DIR' does not exist." >&2
        exit 1
    fi
done

# 7. Copy to each selected destination
for DEST_DIR in "${SELECTED_DIRS[@]}"; do
    FULL_DEST="$DEST_DIR/$PLUGIN_NAME"
    mkdir -p "$FULL_DEST" || { echo "Error: Failed to create '$FULL_DEST'." >&2; continue; }
    cp -fv "${VALID_FILES[@]}" "$FULL_DEST/"
done

echo "Deployment complete"
for dir in "${SELECTED_DIRS[@]}"; do
    echo "$dir"
done