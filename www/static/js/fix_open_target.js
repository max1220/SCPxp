// fix the link target problem by overriding the onclick behaviour of <a> elements with a target= attribute set.
let orig_open = open
function fixed_open(url, target, specs, replace) {
	let iframe_elem
	if (target) {
		iframe_elem = document.getElementsByName(target)[0] || parent.document.getElementsByName(target)[0]
	}
	if (iframe_elem) {
		console.log("fixed_open", url)
		iframe_elem.src = url
		return
	} else {
		return orig_open(url, target, specs, replace)
	}
}

// apply fix only for chrome browser
if (window.chrome) {
	// replace open function
	open = fixed_open
}
