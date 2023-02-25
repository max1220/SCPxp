# Devember 2022

[Forum Post with Videos](https://forum.level1techs.com/t/192160)

This is my Devember 2022 entry.

It's a XP-themed server control panel.
The front-end is written in plain Javascript.
It's back-end is entirely written in Bash.
No external dependencies, no package managers, no layers of cruft.

This project is not intended to be hosted publicly.
Please assume that everyone who has access to an instance already has root access ;)
You should add external authentication(e.g. via an authenticating reverse proxy) if
you wan to make this externall accesible(this provides no authentication itself).



## Installation

The installation is fairly straigh-forward.
The only requirements for the web interface are web server with CGI support,
and bash plus some basic shell utillites.

```
# install dependencies
sudo apt install busybox tmux tree xvfb ffmpeg jq sed xwininfo xdotool matchbox-window-manager

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
       - Size automatically determined based on iframe content
     * Titlebar text from iframe
     * Close, Minimize
     * Resizeable
     * Create a window via hyperlink with target="make_new_win"
   - Taskbar
     * Start button
     * Window list
       - minimize/unminimize a window
     * Clock
   - Start menu
     * Submenus
   - Themeable
     * You can live-edit the CSS via the settings
     * Most theme colors etc. are changeable via variables

 * Terminal
   - Persistent sessions
     * create session or attach to session via link
     * kill current session
   - Windows
     * create window via menu
     * switch current window via menu
     * kill current window
   - Resizeable
     * Resize to window size
     * Resize specified rows/cols
   - Send key
     * Send keys via keyboard
     * Special keys(F1 etc.) via menu
   - Themeable
     * You can live-edit the CSS via the settings

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
     * Download as tar
       - Download selected files as .tar file
     * New File
     * New Directory

 * Text editor
   - Open file via menu, hash-location, or file manager
   - Save(to current filename or save as)
   - Toggleable line-wrap
   - Toggleable HTML preview

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

 * Terminal manager
   - List terminal sessions
   - Connect to a terminal session
   - Connect to custom terminal session

 * Video player
   - Displays a video file provided via hash-location
   - Can be opened via file manager

 * Picture Viewer
   - Displays a picture file provided via hash-location
   - Can be opened via file manager

 * Browser
   - Shows a website
   - Can't load most websites because of CORS
   - Can be opened via file manager

 * FreeDOS(DOS prompt)
   - Uses v86 to run an actual x86 emulator
   - (v86 not included in this repo)

 * L1T
   - Shows a greeting with a link to the L1T forums ;)

 * Run dialog
   - User can enter a command, and see the result in a terminal



## Hints

 * You can open most application links in anoter tab by right-clicking on them.
   - e.g. open a browser tab with only the file manager content, no taskbar etc.
 * iframes sometimes behave strangely with focusing
   - If you type and don't see any respone, try clicking into the window to set the focus(The titlebar color is unreliable)



## TODO

Some features didn't make it in time. Here is my TODO list:

 * Help system
   - Should provide basic information on most application
   - Should contain all documentation in this project
 * Desktop
   - Maximize: auto resize maximized windows
   - creatable/editable/moveable desktop icons
   - Fix Startmenu sub-menus
   - Add boot screen with some animations and stuff
 * File manager
   - Implement upload file
   - Implement view-menu
 * LXC
   - Fix info layout
   - Connect in terminal
   - Creation wizard
 * Terminal
   - Copy screen content to clipboard
   - Mouse support
   - Scrollback buffer?
 * Run dialog styling
