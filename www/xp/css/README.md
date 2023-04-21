# CSS utillities

This directorie contains the CSS sources for the webpage,
and an optional minimal CSS minifier written in bash.

The CSS is just concatenated and not modified in any way,
so you can always just use the source CSS files directly.




Typically usage of the CSS minifier is like this:
```
$ ./minify_css.sh framework
CSS Source files:
	'framework/001_base.css'
	'framework/002_windows.css'
	'framework/003_taskbar.css'
	'framework/004_startmenu.css'
	'framework/005_buttons.css'
	'framework/006_tabs.css'
	'framework/007_input.css'
	'framework/008_statusbar.css'
	'framework/009_menubar.css'
	'framework/010_scrollbar.css'
	'framework/011_progressbar.css'
	'framework/012_toolbar.css'
	'framework/099_utils.css'
Concatenated size:
	18216 framework.css
Minified size:
	13449 framework.min.css
gzip'ed size:
	3231 framework.min.css.gz
```



During development it can be useful to automatically re-minify the CSS
on changes to CSS source files.

```
while true; do
	inotifywait -q -e modify -r . && ./minify_css.sh framework
done
```
