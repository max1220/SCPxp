 Usage
-------

Basic usage is as you would expect from any multiplexing terminal emulator.
If you are familiar with tmuxes concept of sessions, windows, and panes,
you will feel right at home, since that is what this terminal emulator
uses.

The terminal output is on a pane, and a pane is in a window.
Each window belongs to a session.

To get started, you'll need to create a session or
connect to an existing session via the `File` menu.

The list of panes is specific to your current session, and clicking on
a pane name in the `Pane` menu will connect you to that pane.

The terminal content doesn't automatically resize to the window dimensions,
but you can resize the terminal content to fit the window dimensions, or
resize the window dimension to contain the terminal via the `Size` menu.

Some keyboard keys and key combinations can't be captured in a browser
window, so the `Send` menu can be used to send these keys or
key combinations manually.



 Implementataion
-----------------

This terminal emulator uses tmux for persistent sessions and part of the
rendering process.

To listen for events the terminal emulator connects to the
`cgi_command.sh` backend script as an EventSource to start a
tmux control-mode session, which outputs terminal related
events on stdout, and the `cgi_commands.sh` script transforms
this output to an EventSource-compatible stream.

When the terminal emulator sees an output event, it tries to
parse it's escape sequences, but if it contains unknown escape sequences,
tmux is used to render the current terminal state instead:
`tmux capture-pane` uses only a limited set of escape sequences to
dump the current terminal state, and that limited set is completely
supported by the terminal emulator.

Other that these two hacks, this terminal emulator is basically just a
remote control for tmux sessions: Using the `cgi_commands.sh` script
to send various tmux commands, for example `new-session`, `send-keys`, etc.

The client side uses just plain vanilla javascript and CSS to rendering
the terminal state.
