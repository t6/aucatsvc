/*
 * Copyright (c) 2016 Tobias Kortkamp <t@tobik.me>
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

#include <fcntl.h>
#include <kore/kore.h>
#include <kore/http.h>
#include <sys/ioctl.h>
#include <sys/soundcard.h>

#ifdef __FreeBSD__
#include <sys/capsicum.h>
#endif

#include "assets.h"
#include "aucatctl.h"

int init(int);
int serve_index(struct http_request *);
int serve_index_js(struct http_request *);
int serve_aucat(struct http_request *);

int v_chan(struct http_request *, char *);
int v_vol(struct http_request *, char *);

static int mixerfd = -1;
static struct mio_hdl *hdl = NULL;

int
init(int state)
{
#ifdef __FreeBSD__
	cap_rights_t rights;
	const unsigned long ioctls[] = {
		MIXER_READ(OSS_MIXER_CHANNEL),
		MIXER_WRITE(OSS_MIXER_CHANNEL),
	};
#endif

	switch (state) {
	case KORE_MODULE_LOAD:
		mixerfd = open("/dev/mixer", O_RDWR | O_CLOEXEC);
		if (mixerfd < 0) {
			kore_log(LOG_WARNING, "open: %s", strerror(errno));
			return (KORE_RESULT_ERROR);
		}
#ifdef __FreeBSD__
		cap_rights_init(&rights, CAP_IOCTL);
		if (cap_rights_limit(mixerfd, &rights) < 0) {
			kore_log(LOG_WARNING, "cap_rights_limit: %s", strerror(errno));
			return (KORE_RESULT_ERROR);
		}
		if (cap_ioctls_limit(mixerfd, ioctls, nitems(ioctls)) < 0) {
			kore_log(LOG_WARNING, "cap_ioctls_limit: %s", strerror(errno));
			return (KORE_RESULT_ERROR);
		}
#endif
		hdl = mio_open(AUDIODEVICE, MIO_OUT | MIO_IN, 1);
		if (hdl == NULL) {
			kore_log(LOG_WARNING, "unable to open %s", AUDIODEVICE);
			return (KORE_RESULT_ERROR);
		}
		break;
	case KORE_MODULE_UNLOAD:
		close(mixerfd);
		mio_close(hdl);
		break;
	}

	return (KORE_RESULT_OK);
}

int
serve_index(struct http_request *req)
{
	http_response_header(req, "content-type", "text/html");
	http_response(req, 200, asset_index_html, asset_len_index_html);
	return (KORE_RESULT_OK);
}

int
serve_index_js(struct http_request *req)
{
	http_response_header(req, "content-type", "application/javascript");
	http_response(req, 200, asset_index_js, asset_len_index_js);
	return (KORE_RESULT_OK);
}

int
serve_aucat(struct http_request *req)
{
	char *chan;
	int cn;
	int foundchan;
	int mastervol;
	int mixervol;
	size_t len;
	struct ctl ctls[MIDI_NCHAN] = {};
	struct kore_buf *buf = NULL;
	u_int8_t *d;
	uint32_t newvol;

	/*
	 * sndio searches for the .aucat_cookie at HOME.  kore chroots
	 * and the cookie should be copied to the chroot dir by the
	 * user.
	 */
	putenv("HOME=/");

	if (readvols(hdl, ctls, &mastervol)) {
		kore_log(LOG_WARNING, "unable to read volumes");
		http_response(req, 500, NULL, 0);
		goto cleanup;
	}

	if (req->method == HTTP_METHOD_POST) {
		http_populate_post(req);
		if (http_argument_get_uint32(req, "vol", &newvol) == KORE_RESULT_ERROR) {
			kore_log(LOG_WARNING, "'vol' is missing or not 0 < vol <= 127");
			http_response(req, 400, NULL, 0);
			goto cleanup;
		}
		if (http_argument_get_string(req, "chan", &chan) == KORE_RESULT_ERROR) {
			kore_log(LOG_WARNING, "'chan' is missing or malformed");
			http_response(req, 400, NULL, 0);
			goto cleanup;
		}

		kore_log(LOG_DEBUG, "%s=%d", chan, newvol);
		if (strcmp(chan, "master") == 0) {
			if (setmaster(hdl, newvol)) {
				kore_log(LOG_WARNING, "unable to set volume of channel");
				http_response(req, 500, NULL, 0);
				goto cleanup;
			}
			mastervol = newvol;
		} else if (strcmp(chan, "mixer") == 0) {
			mixervol = 100.0*newvol/127;
			mixervol = (mixervol) | (mixervol << 8);
			if (ioctl(mixerfd, MIXER_WRITE(OSS_MIXER_CHANNEL), &mixervol) < 0) {
				kore_log(LOG_WARNING, "MIXER_WRITE: %s", strerror(errno));
				http_response(req, 500, NULL, 0);
				goto cleanup;
			}
		} else {
			foundchan = 0;
			for (cn = 0; cn < MIDI_NCHAN; cn++) {
				if (strcmp(ctls[cn].name, chan) == 0) {
					if (setvol(hdl, cn, newvol)) {
						kore_log(LOG_WARNING, "unable to set volume of channel");
						http_response(req, 500, NULL, 0);
						goto cleanup;
					}
					ctls[cn].vol = newvol;
					foundchan = 1;
					break;
				}
			}
			if (!foundchan) {
				http_response(req, 400, NULL, 0);
				goto cleanup;
			}
		}
	}

	if (ioctl(mixerfd, MIXER_READ(OSS_MIXER_CHANNEL), &mixervol) < 0) {
		kore_log(LOG_WARNING, "MIXER_READ: %s", strerror(errno));
		http_response(req, 500, NULL, 0);
		goto cleanup;
	}
	/* Get left channel volume and scale to 0..127 */
	mixervol = 127.0*(mixervol & 0x7f)/100;
	
	buf = kore_buf_alloc(MIDI_NCHAN * SYSEX_NAMELEN);
	kore_buf_appendf(buf, "{\"chans\":[");
	kore_buf_appendf(buf, "{\"chan\":\"mixer\",\"vol\":%u}", mixervol);
	kore_buf_appendf(buf, ",{\"chan\":\"master\",\"vol\":%u}", mastervol);
	for (cn = 0; cn < MIDI_NCHAN; cn++) {
		if (*ctls[cn].name != '\0') {
			kore_buf_appendf(buf, ",{\"chan\":\"%s\",\"vol\":%u}",
					 ctls[cn].name, ctls[cn].vol);
		}
	}
	kore_buf_appendf(buf, "]}");
	d = kore_buf_release(buf, &len);
	buf = NULL;
	http_response_header(req, "content-type", "application/json");
	http_response(req, 200, d, len);
	kore_free(d);

cleanup:
	if (buf)
		kore_buf_cleanup(buf);
	return (KORE_RESULT_OK);
}

int
v_chan(struct http_request *req, char *data) {
	if (strlen(data) < SYSEX_NAMELEN)
		return (KORE_RESULT_OK);
	return (KORE_RESULT_ERROR);
}

int
v_vol(struct http_request *req, char *data) {
	int err;
	kore_strtonum(data, 10, 0, 127, &err);
	return err;
}
