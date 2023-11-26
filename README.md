# SCPxp

This repository contains the code for my
server control panel "SCPxp"(Server Control Panel eXPerience).

It's a simple CGI-based backend(written as a Bash script),
with a Javascript front-end inspired by the look of Windows XP.

Keep in mind that this control panel itself
does not have any authentication mechanism:
You need to make sure that nobody except authorized users can access
the panel yourself(e.g. using an authenticating reverse proxy).

[![Demo video](https://img.youtube.com/vi/lBBFG3guG5w/hqdefault.jpg)](https://www.youtube.com/embed/lBBFG3guG5w)



## Installation

The installation is fairly straight-forward.
The only requirements for the web interface are web server with CGI support,
and bash plus some basic shell utillities.

```
# install dependencies
sudo apt install \
	busybox \ # for: http server
	tree \ # for: file manager
	jq \ # for: generic
	sed \ # for: generic
	tmux \ # for: terminal emulator
	xvfb \ # for: x11 streamer
	ffmpeg \ # for: x11 streamer
	xwininfo \# for: x11 streamer
	xdotool \# for: x11 streamer
	matchbox-window-manager \ # for: x11 streamer
	cmark # for: file manager, text editor

# clone the repo
git clone https://github.com/max1220/lxc-scripts -b devember
cd lxc-scripts

# run the CSS minification script
pushd www/static/css/xp/minify_css.sh
./minify_css.sh 0*.css
popd

# run a webserver
pushd www
busybox httpd -v -f -p 127.0.0.1:8080
```

You should now be able to point your browser to http://127.0.0.1:8080/` and enjoy ;)

You can also download and build v86. Just place your copy of v86 into `www/`.
This is only needed for the DOS prompt.
See [v86 build instructions](https://github.com/copy/v86#readme)


## Features:

The web interface currently has the following features(possibly incomplete):

 * Desktop
   - Desktop icons
   - Windows
     * Desktop windows contain an iframe with the content
     * Close, Minimize, Maximize, Restore
     * Resizeable
     * Create a window via hyperlink with target="make_new_win"
   - Taskbar
     * Start button
     * Window list
       - minimize/unminimize a window
     * Systray icons
     * Clock
   - Start menu
     * Shows list of applications

 * Terminal
   - Persistent sessions
     * create session or attach to session via link
     * kill current session
   - Windows
     * create window via menu
     * switch current window via menu
     * kill current window
   - Resizeable
     * Resize terminal to window size
     * Resize specified rows/cols
     * Resize window to terminal content
   - Send key
     * Send keys via keyboard
     * Special keys(F1 etc.) via menu
   - Session info

 * File manager
   - Dynamically loads content via XHR
   - Tree-view on the left
     * resizeable
     * navigates the content-view
   - Content-view on the right
     * Shows the files in the current directory
     * Select multiple files
     * Sort
       - Alphabetically
       - Modification time
       - Creation time
       - Size
       - Reverse
     * view
       - toggle byte/human-readable sizes
       - show/hide columns
       - show/hide dot files
     * Copy to clipboard
       - Mark selected files for copy
     * Cut to clipboard
       - Mark selected files for move
     * Paste from clipboard
       - Perform copy/cur
       - Shows progress in dialog
     * Rename
       - Supports multiple selected files
     * Delete
       - Asks before deleting
       - Supports multiple selected files
     * Set mode
       - Set permissions on file(chmod)
     * Upload file
       - Uploads file to server base64-encoded
     * Download as tar
       - Download selected files as .tar file
     * New File
     * New Directory

 * Text editor
   - Basic functions
     * Open file
     * New file
     * Save file
     * Save file as
     * Reload file
     * toggle line wrap
   - Preview pane
     * HTML
     * Markdown
     * Shellscript
   - Status bar
     * last action/filename
     * cursor position in characters/lines
     * document length in characters/lines

 * Picture Viewer
   - Shows an image(png/jpeg/svg)
   - Basic functions
     * Open file
     * Open URL
     * File info
     * Reload file
   - scale to 0.25x/0.5x/1x/2x/4x or fit to window(responsive)
   - toggle background color white/black
   - convert (imagemagick) an image
     * change file format
     * resize image
     * rotate image
   - Next/previous image in current directory

 * Run dialog
   - Display output of running a shell command
   - Options
     * merge stderr into output
     * enable HTML in output
     * close dialog window on command return(when streaming)
     * get complete result or stream lines/bytes as EventSource

 * FreeDOS(DOS prompt)
   - Runs FreeDOS from floppy
   - Uses v86 to run an actual x86 emulator
   - 32MB RAM, 2MB VRAM
   - (v86 not included in this repo)

 * L1T
   - Shows a greeting with a link to the L1T forums ;)

 * Info dialog
   - Shows some basic system information
     * Username, Hostname, Kernel, CPU, Memory, OS, Uptime, Load
     * ps aux
     * df -h
     * ip a
     * ss -lpt

 * LXC manager
   - Start/Stop/Force-stop/Restart/Rename/Backup
   - Show basic container info
   - Get a shell on a container in the terminal
   - Edit container configuration in text editor

 * Video player
   - Displays a video file provided via hash-location
   - Can be opened via file manager

 * Browser
   - Shows a website
   - Can't load most websites because of CORS
   - Can be opened via file manager



## Hints

 * You can open most application links in anoter tab by right-clicking on them.
   - e.g. open a browser tab with only the file manager content, no taskbar etc.
 * iframes sometimes behave strangely with focusing
   - If you type and don't see any respone, try clicking into the window to set the focus



## Devember

This project was part of the Level1Techs Forum's devember challenge 2022.
See also the [Forum post](https://forum.level1techs.com/t/192160),
which contains some development logs and small demo videos.



## TODO

Some features didn't make it in time. Here is my TODO list:

 * Wizard:
   - Javascript frontend to set environment variables and execute shell scripts
 * JavaScript REPL
 * All applications
   - Port over all applications to cgi_commands
     * DONE: file_manager, x11_manager, x11_streamer
   - Use new Layout and CSS in all applications
     * DONE: file_manager
 * X11 streamer
   - Proper menu system
   - Sound
     * Forward sound from server
     * Forward microphone to server
 * Help system
   - Should provide basic information on most application
   - Should contain all documentation in this project
 * Desktop
   - Maximize: auto resize maximized windows
   - creatable/editable/moveable desktop icons and start menu
   - Fix Startmenu sub-menus
   - Window system improvements
     * Make titlebar icons use icons.css
 * LXC
   - Fix info layout
   - Connect in terminal
   - Creation wizard
 * Terminal
   - Copy screen content to clipboard
   - Mouse support
   - Scrollback buffer?
 * Run dialog
   - port over from app_example
 * SSH connection manager
 * automatic install, configure, launch scripts
 * Settings menu
   - startmenu
   - desktop icons
   - desktop background(-color)
   - style select, CSS overrides
   - screensaver
 * nice-to-have
   - Sound streamer
   - Music player
   - Calculator
   - Icon browser
   - Clock/Stopwatch/Timer
   - Calender
   - Appstore
   - basshrun integration
   - Gallery
   - Email
   - Session restore
   - Tar viewer
   - Shadertoy screensavers
   - WYSIWYG HTML Editor
