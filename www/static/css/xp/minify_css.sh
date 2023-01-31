#!/bin/bash
# remove old generated files
rm -f style.css style.min.css style.min.css.gz

# concatenate
cat ${@} > style.css
wc -c style.css

# minify
sed "/\/\*.*\*\//d;/\/\*/,/\*\// d" style.css | tr -d "\t" | tr -d "\n" > style.min.css
sed -i "s/: /:/g" style.min.css
sed -i "s/ {/{/g" style.min.css
sed -i "s/ > />/g" style.min.css
wc -c style.min.css

# gzip
gzip --best < style.min.css > style.min.css.gz
wc -c style.min.css.gz
