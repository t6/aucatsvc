/*
 * Copyright (c) 2010-2011 Alexandre Ratchov <alex@caoua.org>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "sysex.h"

#include "aucatctl.h"

#define MIDI_CMDMASK	0xf0		/* command mask */
#define MIDI_CHANMASK	0x0f		/* channel mask */
#define MIDI_CTL	0xb0		/* controller command */
#define MIDI_CTLVOL	7		/* volume */
#define MSGMAX		0x100		/* buffer size */

struct midi_parser_state {
	struct mio_hdl *hdl;
	int mst, midx, mlen, mready;		/* midi parser state */
	unsigned char mmsg[MSGMAX];		/* resulting midi message */
	int master;
};

unsigned char dumpreq[] = {
	SYSEX_START,
	SYSEX_TYPE_EDU,
	0,
	SYSEX_AUCAT,
	SYSEX_AUCAT_DUMPREQ,
	SYSEX_END
};

int
setvol(struct mio_hdl *hdl, unsigned cn, unsigned vol)
{
#define VOLMSGLEN 3
	char msg[VOLMSGLEN];

	msg[0] = MIDI_CTL | cn;
	msg[1] = MIDI_CTLVOL;
	msg[2] = vol;
	if (mio_write(hdl, msg, VOLMSGLEN) != VOLMSGLEN) {
		return 1;
	}
	return 0;
}

int
setmaster(struct mio_hdl *hdl, unsigned vol)
{
	struct sysex msg;

	memset(&msg, 0, sizeof(struct sysex));
	msg.start = SYSEX_START;
	msg.type = SYSEX_TYPE_RT;
	msg.id0 = SYSEX_CONTROL;
	msg.id1 = SYSEX_MASTER;
	msg.u.master.fine = 0;
	msg.u.master.coarse = vol;
	msg.u.master.end = SYSEX_END;
	if (mio_write(hdl, &msg, SYSEX_SIZE(master)) != SYSEX_SIZE(master)) {
		return 1;
	}
	return 0;
}

static void
onsysex(struct midi_parser_state *p, struct ctl *ctls, unsigned char *buf, unsigned len)
{
	unsigned cn;
	struct sysex *x = (struct sysex *)buf;

#if 0 //DEBUG
	fprintf(stderr, "sysex: ");
	for (i = 0; i < len; i++)
		fprintf(stderr, " %02x", buf[i]);
	fprintf(stderr, ", len = %u/%u\n", len, SYSEX_SIZE(mixinfo));
#endif
	if (len < SYSEX_SIZE(empty))
		return;
	if (x->type == SYSEX_TYPE_RT &&
	    x->id0 == SYSEX_CONTROL && x->id1 == SYSEX_MASTER) {
		if (len == SYSEX_SIZE(master))
			p->master = x->u.master.coarse;
		return;
	}
	if (x->type != SYSEX_TYPE_EDU ||
	    x->id0 != SYSEX_AUCAT)
		return;
	switch(x->id1) {
	case SYSEX_AUCAT_MIXINFO:
		cn = x->u.mixinfo.chan;
		if (cn >= MIDI_NCHAN) {
			fprintf(stderr, "invalid channel\n");
			exit(1);
		}
		if (memchr(x->u.mixinfo.name, '\0', SYSEX_NAMELEN) == NULL) {
			fprintf(stderr, "invalid channel name\n");
			exit(1);
		}
		strlcpy(ctls[cn].name, (const char *)x->u.mixinfo.name, SYSEX_NAMELEN);
		ctls[cn].vol = 0;
		break;
	case SYSEX_AUCAT_DUMPEND:
		p->mready = 1;
		break;
	}
}

static void
oncommon(struct ctl *ctls, unsigned char *buf, unsigned len)
{
	unsigned cn, vol;

	if ((buf[0] & MIDI_CMDMASK) != MIDI_CTL)
		return;
	if (buf[1] != MIDI_CTLVOL)
		return;
	cn = buf[0] & MIDI_CHANMASK;
	vol = buf[2];
	ctls[cn].vol = vol;
}

static void
oninput(struct midi_parser_state *p, struct ctl *ctls, unsigned char *buf, unsigned len)
{
	static unsigned voice_len[] = { 3, 3, 3, 3, 2, 2, 3 };
	static unsigned common_len[] = { 0, 2, 3, 2, 0, 0, 1, 1 };
	unsigned c;

	for (; len > 0; len--) {
		c = *buf;
		buf++;

		if (c >= 0xf8) {
			/* clock events not used yet */
		} else if (c >= 0xf0) {
			if (p->mst == SYSEX_START &&
			    c == SYSEX_END &&
			    p->midx < MSGMAX) {
				p->mmsg[p->midx++] = c;

				onsysex(p, ctls, p->mmsg, p->midx);
				continue;
			}
			p->mmsg[0] = c;
			p->mlen = common_len[c & 7];
			p->mst = c;
			p->midx = 1;
		} else if (c >= 0x80) {
			p->mmsg[0] = c;
			p->mlen = voice_len[(c >> 4) & 7];
			p->mst = c;
			p->midx = 1;
		} else if (p->mst) {
			if (p->midx == MSGMAX)
				continue;
			if (p->midx == 0)
				p->mmsg[p->midx++] = p->mst;
			p->mmsg[p->midx++] = c;
			if (p->midx == p->mlen) {
				oncommon(ctls, p->mmsg, p->midx);
				p->midx = 0;
			}
		}
	}
}

int
readvols(struct mio_hdl *hdl, struct ctl *ctls, int *master) {
	unsigned char buf[MSGMAX];
	unsigned size;
	struct midi_parser_state p;

	memset(&p, 0, sizeof(struct midi_parser_state));
	p.master = -1;

	mio_write(hdl, dumpreq, sizeof(dumpreq));
	while (!p.mready) {
		size = mio_read(hdl, buf, MSGMAX);
		if (size == 0) {
			*master = -1;
			return 1;
		}
		oninput(&p, ctls, buf, size);
	}

	*master = p.master;

	return 0;
}
