// fix the link target problem by overriding the onclick behaviour of <a> elements with a target= attribute set.
function fix_link_targets_iframe() {
	for (let elem of document.getElementsByTagName("a")) {
		if (elem.href && elem.target) {
			//console.log("Fixing:", elem)
			let original_onclick = elem.onclick
			elem.onclick = function(e) {
				// look in this document for iframe of this name
				let iframe_elem = document.getElementsByName(this.target)[0] || parent.document.getElementsByName(this.target)[0]
				if (original_onclick) {
					original_onclick(e)
				}
				if (iframe_elem) {
					iframe_elem.src = this.href
					return e.preventDefault()
				}
			}
		}
	}
}

// apply fix only for chrome browser
if (window.chrome) {
	fix_link_targets_iframe()
}
