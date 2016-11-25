#pragma once

#include <sndio.h>
#include "sysex.h"

#define MIDI_NCHAN	16		/* max channels */

struct ctl {
	char name[SYSEX_NAMELEN];	/* stream name */
	unsigned vol;			/* current volume */
};

int setvol(struct mio_hdl *, unsigned, unsigned);
int setmaster(struct mio_hdl *, unsigned);
int readvols(struct mio_hdl *, struct ctl *, int *);
