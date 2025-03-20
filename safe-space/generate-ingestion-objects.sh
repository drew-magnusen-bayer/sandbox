#!/bin/zsh

function build_ingestion_objects {
    local file_path=$1
    local trial_type=$2
    local source=$3

    if [[ ! -f $file_path ]]; then
        echo "File not found: $file_path"
        exit 1
    fi

    local file_content=$(cat $file_path)
    local set_ids=($(echo $file_content | jq -r '.data[].set_id'))

    local sets=()
    for set_id in $set_ids; do
        sets+=("{\"setId\": $((set_id + 0)), \"trialType\": \"$trial_type\", \"source\": \"$source\"}")
    done

    local chunk_size=5000
    local total_sets=${#sets[@]}
    local chunk_count=$(( (total_sets + chunk_size - 1) / chunk_size ))
    
    for ((i=0; i<chunk_count; i++)); do
        local start=$((i * chunk_size))
        echo "chunk size ${chunk_size} start ${start}"
        local chunk=("${sets[@]:$start:$chunk_size}")
        echo "chunk slice length: ${#chunk[@]}"
        local result="{\"sets\": [$(IFS=,; echo "${chunk[*]}")]}"
        local output_file="${file_path%.*}-output-$((i+1)).json"
        echo $result > ./$output_file
    done
}

file_path=$1
trial_type=$2
source=$3

if [[ -z $file_path || -z $trial_type || -z $source ]]; then
    echo "Usage: build-ingestion-objects <filePath> <trialType> <source>"
    exit 1
fi

if [[ $trial_type != "field trial" && $trial_type != "seed production" ]]; then
    echo "Invalid trialType. Must be \"field trial\" or \"seed production\"."
    exit 1
fi

if [[ $source != "fts" && $source != "velocity" ]]; then
    echo "Invalid source. Must be \"fts\" or \"velocity\"."
    exit 1
fi

build_ingestion_objects $file_path $trial_type $source

# Example usage:
# ./build-ingestion-objects.sh path/to/input.json "field trial" "fts"
