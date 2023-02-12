let LIBXCVT_MODE_FLAG_HSYNC_POSITIVE = (1 << 0);
let LIBXCVT_MODE_FLAG_HSYNC_NEGATIVE = (1 << 1);
let LIBXCVT_MODE_FLAG_VSYNC_POSITIVE = (1 << 2);
let LIBXCVT_MODE_FLAG_VSYNC_NEGATIVE = (1 << 3);
let LIBXCVT_MODE_FLAG_INTERLACE      = (1 << 4);


// This is a straightup port of libxcvt/lib/libxcvt.c
function get_mode_info(hdisplay, vdisplay, vrefresh, reduced, interlaced)
{
    let margins = false;
    let vfield_rate, hperiod;
    let hdisplay_rnd;
    let hmargin;
    let vdisplay_rnd;
    let vmargin;
    let vsync;
    let interlace;
    let mode_info = {};

    mode_info.hdisplay = hdisplay;
    mode_info.vdisplay = vdisplay;
    mode_info.refresh = vrefresh;

	/* 1) top/bottom margin size (% of height) - default: 1.8 */
	let CVT_MARGIN_PERCENTAGE = 1.8;

	/* 2) character cell horizontal granularity (pixels) - default 8 */
	let CVT_H_GRANULARITY = 8;

	/* 4) Minimum vertical porch (lines) - default 3 */
	let CVT_MIN_V_PORCH = 3;

	/* 4) Minimum number of vertical back porch lines - default 6 */
	let CVT_MIN_V_BPORCH = 6;

	/* Pixel Clock step (kHz) */
	let CVT_CLOCK_STEP = 250

	/* CVT default is 60.0Hz */
    if (!mode_info.vrefresh)
        mode_info.vrefresh = 60.0;

	/* 1. Required field rate */
    if (interlaced)
        vfield_rate = mode_info.vrefresh * 2;
    else
        vfield_rate = mode_info.vrefresh;

    /* 2. Horizontal pixels */
    hdisplay_rnd = mode_info.hdisplay - (mode_info.hdisplay % CVT_H_GRANULARITY);

    /* 3. Determine left and right borders */
    if (margins) {
        /* right margin is actually exactly the same as left */
        hmargin = (hdisplay_rnd * CVT_MARGIN_PERCENTAGE / 100.0);
        hmargin -= hmargin % CVT_H_GRANULARITY;
    }
    else {
        hmargin = 0;
    }

    /* 4. Find total active pixels */
    mode_info.hdisplay = hdisplay_rnd + 2 * hmargin;

    /* 5. Find number of lines per field */
    if (interlaced)
        vdisplay_rnd = mode_info.vdisplay / 2;
    else
        vdisplay_rnd = mode_info.vdisplay;

    /* 6. Find top and bottom margins */
    /* nope. */
    if (margins)
        /* top and bottom margins are equal again. */
        vmargin = (vdisplay_rnd * CVT_MARGIN_PERCENTAGE / 100.0);
    else
        vmargin = 0;

    mode_info.vdisplay = mode_info.vdisplay + 2 * vmargin;

    /* 7. interlace */
    if (interlaced)
        interlace = 0.5;
    else
        interlace = 0.0;

    /* Determine vsync Width from aspect ratio */
    if (!(mode_info.vdisplay % 3) && ((mode_info.vdisplay * 4 / 3) == mode_info.hdisplay))
        vsync = 4;
    else if (!(mode_info.vdisplay % 9) && ((mode_info.vdisplay * 16 / 9) == mode_info.hdisplay))
        vsync = 5;
    else if (!(mode_info.vdisplay % 10) && ((mode_info.vdisplay * 16 / 10) == mode_info.hdisplay))
        vsync = 6;
    else if (!(mode_info.vdisplay % 4) && ((mode_info.vdisplay * 5 / 4) == mode_info.hdisplay))
        vsync = 7;
    else if (!(mode_info.vdisplay % 9) && ((mode_info.vdisplay * 15 / 9) == mode_info.hdisplay))
        vsync = 7;
    else                        /* Custom */
        vsync = 10;

    if (!reduced) {             /* simplified GTF calculation */

        /* 4) Minimum time of vertical sync + back porch interval (µs)
         * default 550.0 */
		let CVT_MIN_VSYNC_BP = 550.0;

        /* 3) Nominal HSync width (% of line period) - default 8 */
		let CVT_HSYNC_PERCENTAGE = 8;

        let hblank_percentage;
        let vsync_and_back_porch;
        let vback_porch;
        let hblank;

        /* 8. Estimated Horizontal period */
        hperiod = ((1000000.0 / vfield_rate - CVT_MIN_VSYNC_BP)) /
            (vdisplay_rnd + 2 * vmargin + CVT_MIN_V_PORCH + interlace);

        /* 9. Find number of lines in sync + backporch */
        if (((CVT_MIN_VSYNC_BP / hperiod) + 1) <
            (vsync + CVT_MIN_V_PORCH))
            vsync_and_back_porch = vsync + CVT_MIN_V_PORCH;
        else
            vsync_and_back_porch = (CVT_MIN_VSYNC_BP / hperiod) + 1;

        /* 10. Find number of lines in back porch */
        vback_porch = vsync_and_back_porch - vsync;

        /* 11. Find total number of lines in vertical field */
        mode_info.vtotal =
            vdisplay_rnd + 2 * vmargin + vsync_and_back_porch + interlace +
            CVT_MIN_V_PORCH;

        /* 5) Definition of Horizontal blanking time limitation */
        /* Gradient (%/kHz) - default 600 */
		let CVT_M_FACTOR = 600

        /* Offset (%) - default 40 */
		let CVT_C_FACTOR = 40

        /* Blanking time scaling factor - default 128 */
		let CVT_K_FACTOR = 128

        /* Scaling factor weighting - default 20 */
		let CVT_J_FACTOR = 20

		let CVT_M_PRIME = CVT_M_FACTOR * CVT_K_FACTOR / 256
		let CVT_C_PRIME = (CVT_C_FACTOR - CVT_J_FACTOR) * CVT_K_FACTOR / 256 + CVT_J_FACTOR;

        /* 12. Find ideal blanking duty cycle from formula */
        hblank_percentage = CVT_C_PRIME - CVT_M_PRIME * hperiod / 1000.0;

        /* 13. Blanking time */
        if (hblank_percentage < 20)
            hblank_percentage = 20;

        hblank = mode_info.hdisplay * hblank_percentage / (100.0 - hblank_percentage);
        hblank -= hblank % (2 * CVT_H_GRANULARITY);

        /* 14. Find total number of pixels in a line. */
        mode_info.htotal = mode_info.hdisplay + hblank;

        /* Fill in HSync values */
        mode_info.hsync_end = mode_info.hdisplay + hblank / 2;

        mode_info.hsync_start = mode_info.hsync_end -
            (mode_info.htotal * CVT_HSYNC_PERCENTAGE) / 100;
        mode_info.hsync_start += CVT_H_GRANULARITY -
            mode_info.hsync_start % CVT_H_GRANULARITY;

        /* Fill in vsync values */
        mode_info.vsync_start = mode_info.vdisplay + CVT_MIN_V_PORCH;
        mode_info.vsync_end = mode_info.vsync_start + vsync;

    }
    else {                      /* reduced blanking */
        /* Minimum vertical blanking interval time (µs) - default 460 */
		let CVT_RB_MIN_VBLANK = 460.0

        /* Fixed number of clocks for horizontal sync */
		let CVT_RB_H_SYNC = 32.0

        /* Fixed number of clocks for horizontal blanking */
		let CVT_RB_H_BLANK = 160.0

        /* Fixed number of lines for vertical front porch - default 3 */
		let CVT_RB_VFPORCH = 3

        let vblank_interval_lines;

        /* 8. Estimate Horizontal period. */
        hperiod = ((1000000.0 / vfield_rate - CVT_RB_MIN_VBLANK)) /
            (vdisplay_rnd + 2 * vmargin);

        /* 9. Find number of lines in vertical blanking */
        vblank_interval_lines = CVT_RB_MIN_VBLANK / hperiod + 1;

        /* 10. Check if vertical blanking is sufficient */
        if (vblank_interval_lines < (CVT_RB_VFPORCH + vsync + CVT_MIN_V_BPORCH))
            vblank_interval_lines = CVT_RB_VFPORCH + vsync + CVT_MIN_V_BPORCH;

        /* 11. Find total number of lines in vertical field */
        mode_info.vtotal = vdisplay_rnd + 2 * vmargin + interlace + vblank_interval_lines;

        /* 12. Find total number of pixels in a line */
        mode_info.htotal = mode_info.hdisplay + CVT_RB_H_BLANK;

        /* Fill in HSync values */
        mode_info.hsync_end = mode_info.hdisplay + CVT_RB_H_BLANK / 2;
        mode_info.hsync_start = mode_info.hsync_end - CVT_RB_H_SYNC;

        /* Fill in vsync values */
        mode_info.vsync_start = mode_info.vdisplay + CVT_RB_VFPORCH;
        mode_info.vsync_end = mode_info.vsync_start + vsync;
    }

    /* 15/13. Find pixel clock frequency (kHz for xf86) */
    mode_info.dot_clock = mode_info.htotal * 1000.0 / hperiod;
    mode_info.dot_clock -= mode_info.dot_clock % CVT_CLOCK_STEP;

    /* 16/14. Find actual Horizontal Frequency (kHz) */
    mode_info.hsync = mode_info.dot_clock / mode_info.htotal;

    /* 17/15. Find actual Field rate */
    mode_info.vrefresh = (1000.0 * mode_info.dot_clock) /
        (mode_info.htotal * mode_info.vtotal);

    /* 18/16. Find actual vertical frame frequency */
    /* ignore - just set the mode flag for interlaced */
    if (interlaced)
        mode_info.vtotal *= 2;

    if (reduced)
        mode_info.mode_flags |= LIBXCVT_MODE_FLAG_HSYNC_POSITIVE | LIBXCVT_MODE_FLAG_VSYNC_NEGATIVE;
    else
        mode_info.mode_flags |= LIBXCVT_MODE_FLAG_HSYNC_NEGATIVE | LIBXCVT_MODE_FLAG_VSYNC_POSITIVE;

    if (interlaced)
        mode_info.mode_flags |= LIBXCVT_MODE_FLAG_INTERLACE;

    /* FWXGA hack adapted from hw/xfree86/modes/xf86EdidModes.c, because you can't say 1366 */
    if (mode_info.hdisplay == 1360 && mode_info.vdisplay == 768) {
         mode_info.hdisplay = 1366;
         mode_info.hsync_start--;
         mode_info.hsync_end--;
    }

    return mode_info;
}

// This is a port of libxcvt/cvt/cvt.c
function get_mode_line(hdisplay, vdisplay, vrefresh, reduced, interlaced)
{
	let mode_info = get_mode_info(hdisplay, vdisplay, vrefresh, reduced, interlaced)
	let modeline = []
	modeline.push("Modeline")
    if (reduced)
        modeline.push("\"" + Math.floor(hdisplay) + "x" + Math.floor(vdisplay) + "R\" ");
    else
		modeline.push("\"" + Math.floor(hdisplay) + "x" + Math.floor(vdisplay) + "_" + mode_info.vrefresh.toFixed(2) + "\" ");

	modeline.push((mode_info.dot_clock / 1000).toFixed(2) + " ")
	modeline.push(Math.floor(mode_info.hdisplay))
	modeline.push(Math.floor(mode_info.hsync_start))
	modeline.push(Math.floor(mode_info.hsync_end))
	modeline.push(Math.floor(mode_info.htotal) + " ")
	modeline.push(Math.floor(mode_info.vdisplay))
	modeline.push(Math.floor(mode_info.vsync_start))
	modeline.push(Math.floor(mode_info.vsync_end))
	modeline.push(Math.floor(mode_info.vtotal))

    if (mode_info.mode_flags & LIBXCVT_MODE_FLAG_INTERLACE)
        modeline.push("interlace");
    if (mode_info.mode_flags & LIBXCVT_MODE_FLAG_HSYNC_POSITIVE)
        modeline.push("+hsync");
    if (mode_info.mode_flags & LIBXCVT_MODE_FLAG_HSYNC_NEGATIVE)
        modeline.push("-hsync");
    if (mode_info.mode_flags & LIBXCVT_MODE_FLAG_VSYNC_POSITIVE)
        modeline.push("+vsync");
    if (mode_info.mode_flags & LIBXCVT_MODE_FLAG_VSYNC_NEGATIVE)
        modeline.push("-vsync");

    return modeline
}
