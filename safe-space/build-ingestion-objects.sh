#!/bin/zsh

function build_ingestion_objects {
    local file_path=$1
    local trial_type=$2
    local source=$3

    if [[ ! -f $file_path ]]; then
        echo "File not found: $file_path"
        exit 1
    fi

    local numbers_array=($(grep -Eo '[0-9]+' $file_path))

    local sets=()
    for set_id in $numbers_array; do
        sets+=("{\"setId\": $set_id, \"trialType\": \"$trial_type\", \"source\": \"$source\"}")
    done

    local result="{\"sets\": [$(IFS=,; echo "${sets[*]}")]}"
    echo $result > ./output.json
    echo $result
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
# ./build-ingestion-objects.sh path/to/input.txt "field trial" "fts"
