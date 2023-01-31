# Devember 2022

This branch contains the code developed for the L1T Devember event.
Specifically, I've cleaned and re-organized my scipts(still WIP),
and I've developed a Windows XP-style server control panel.


## Web Features:

These are some of the main features.

 * Draggable windows that are pretty close to Windows XP
 * Desktop Icons
 * DOS prompt(running FreeDOS! Using v86!)
 * Persistent terminals, thanks to tmux(*1)
 * LXC container management(*2)
 * Simple file explorer(*3)
 * Simple text editor(*4)

##TODO

These are problems mostly with this release, they are intended to be fixed(after the deadline)

(*1) Has some issues with color support
(*2) Currently only info/start/stop/restart
(*3) Currently only shows file lists, can't open or download
(*4) Slightly broken
