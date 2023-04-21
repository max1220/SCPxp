#!/bin/bash
set -euo pipefail

# first argument is a path to a directory to minify CSS source files from
dir_path="${1}"
[ -d "${dir_path}" ]

css_files=("${dir_path%/}"/*.css)
concat_path="${dir_path%/}.css"
minified_path="${dir_path%/}.min.css"
gz_path="${dir_path%/}.min.css.gz"

echo "CSS Source files:"
printf "\t'%q'\n" "${css_files[@]}"

# concatenate
cat "${css_files[@]}" > "${concat_path}"
echo -ne "Concatenated size:\n\t"
wc -c "${concat_path}"

# minify
sed "/\/\*.*\*\//d;/\/\*/,/\*\// d" "${concat_path}" | tr -d "\t" | tr -d "\n" > "${minified_path}"
sed -i "s/: /:/g" "${minified_path}"
sed -i "s/ {/{/g" "${minified_path}"
sed -i "s/ > />/g" "${minified_path}"
echo -ne "Minified size:\n\t"
wc -c "${minified_path}"

# gzip
gzip --best < "${minified_path}" > "${gz_path}"
echo -ne "gzip'ed size:\n\t"
wc -c "${gz_path}"
