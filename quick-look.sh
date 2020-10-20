#!/bin/bash

# find directories two below github.com directory and summarize their modifications. directory
# structure is github.com/user/repo, so two directories below covers the repos (there are some
# non-repo directories too).
#

# all directories
dirs=$(find . -mindepth 2 -maxdepth 2 -type d)

#echo "$dirs"
echo "$dirs" | wc -l

# exclude appoptics and bmacnaughton
dirs=$(find . -mindepth 2 -maxdepth 2 -type d -not -path "./appoptics/*" -not -path "./bmacnaughton/*" -print)
#echo "$dirs"
echo "$dirs" | wc -l

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd > /dev/null
}

if [ -t 1 ]; then
    NC='\033[0m'
    RED='\033[1;31m'
    GREEN='\033[0;32m'
else
    NC=''
    RED=''
    GREEN=''
fi

for dir in $dirs
do
    pushd "$dir" || echo "pushd $dir failed" || return 1
        error=""
        status=$(git status --porcelain 2>/dev/null) || error=$?
        if [ "$error" != "" ]; then
            if [ "$error" = "128" ]; then
                error_msg="? not a git repository: $dir"
            else
                error_msg="? Error on $dir: $error"
            fi
            printf "${RED}%s${NC}\n" "$error_msg"
        else
            modified=0
            deleted=0
            untracked=0
            other=0
            line_count=0
            output_lines=""
            ifs=$IFS
            IFS=$'\n'

            for line in $status
            do
                something="~"
                [[ "$line" = " M"* ]] && modified=$((modified + 1)) && something="M"
                [[ "$line" = " D"* ]] && deleted=$((deleted + 1)) && something="D"
                [[ "$line" = '??'* ]] && untracked=$((untracked + 1)) && something="?"
                [[ "$something" = "~" ]] && other=$((other + 1)) && something="X"
                line_count=$((line_count + 1))
                output_lines="$output_lines$line\n"
            done
            #lineCount=$(echo "$status" | wc -l)
            if [ $line_count -ne 0 ]; then
                printf "%s differences\n" "$dir"
                output_lines=$(echo -e "$output_lines")
                printf "%s\n" "$output_lines"
                output=""
                [ $modified -ne 0 ] && output="modified: $modified "
                [ $deleted -ne 0 ] && output="${output}deleted: $deleted "
                [ $untracked -ne 0 ] && output="${output}untracked: $untracked "
                [ $other -ne 0 ] && output="${output}other: $other "
                if [ "$output" != "" ]; then
                    printf "%s\n\n" "$output"
                fi
            else
                printf "${GREEN}%s no differences${NC}\n\n" "$dir"
            fi

            IFS=$ifs
        fi
    popd || return 1
done
