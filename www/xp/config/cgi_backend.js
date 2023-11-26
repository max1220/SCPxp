let default_cgi_backend = "/cgi-bin/cgi_command.sh"
CGI_BACKEND = default_cgi_backend

if (localStorage.getItem("XP_CGI_BACKEND")) {
	CGI_BACKEND = localStorage.getItem("XP_CGI_BACKEND")
}
