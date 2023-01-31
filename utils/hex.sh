# generate the lookup-table.
# The index is a number, and the value is the character value.
# (Can't store null byte in bash!)
function generate_lut() {
	unset CHAR_TO_HEX
	unset HEX_TO_CHAR
	declare -g -A CHAR_TO_HEX
	declare -g -A HEX_TO_CHAR
	for ((char_code=1; char_code<256; char_code++)); do
		local hex="$(printf "%.2x" "${char_code}")"
		local char="$(printf "\\x${hex}")"
		[ "${char_code}" = "10" ] && char=$'\n' # fix newline
		CHAR_TO_HEX["${char}"]="${hex}"
		HEX_TO_CHAR["${hex}"]="${char}"
	done
}

# translate a single regular character into two hex digits
function char_to_hex() {
	local char="${1}"
	echo -n "${CHAR_TO_HEX["${char}"]}"
}

# translate a string into a hex-encoded string
function str_to_hex() {
	local str="${1}"
	for ((char_i=0; char_i<${#str}; char_i++)); do
		char_to_hex "${str:$char_i:1}"
	done
}

# translate two hex digits to the regular character
function hex_to_char() {
	local hex="${1}"
	echo -n "${HEX_TO_CHAR["${hex}"]}"
}

# translate a hex-encoded string to a regular string
function hex_to_str() {
	local hex="${1}"
	for ((char_i=0; char_i<${#hex}; char_i+=2)); do
		local hex_digits="${hex:$char_i:2}"
		hex_to_char "${hex_digits}"
	done
}

# always generate the LUT
generate_lut
