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

#include <kore/kore.h>
#include <kore/http.h>

#include "assets.h"
#include "aucatctl.h"

int serve_index(struct http_request *);
int serve_index_js(struct http_request *);
int serve_aucat(struct http_request *);

int v_chan(struct http_request *, char *);
int v_vol(struct http_request *, char *);

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
	char *errmsg;
	int cn;
	int foundchan;
	int mastervol;
	size_t len;
	struct ctl ctls[MIDI_NCHAN] = {};
	struct kore_buf *buf = NULL;
	struct mio_hdl *hdl;
	u_int8_t *d;
	uint32_t newvol;

	/*
	 * sndio searches for the .aucat_cookie at HOME.  kore chroots
	 * and the cookie should be copied to the chroot dir by the
	 * user.
	 */
	putenv("HOME=/");

	hdl = mio_open(AUDIODEVICE, MIO_OUT | MIO_IN, 0);
	if (hdl == NULL) {
		kore_log(LOG_WARNING, "unable to open device: %s", AUDIODEVICE);
		errmsg = "{\"error\":\"Unable to open device\"}";
		http_response_header(req, "content-type", "application/json");
		http_response(req, 500, errmsg, strlen(errmsg));
		goto cleanup;
	}
	if (readvols(hdl, ctls, &mastervol)) {
		errmsg = "{\"error\":\"Unable to read volumes\"}";
		http_response_header(req, "content-type", "application/json");
		http_response(req, 500, errmsg, strlen(errmsg));
		goto cleanup;
	}

	if (req->method == HTTP_METHOD_POST) {
		http_populate_post(req);
		if (http_argument_get_uint32(req, "vol", &newvol) == KORE_RESULT_ERROR) {
			errmsg = "{\"error\":\"'vol' is missing or not 0 < vol <= 127\"}";
			http_response_header(req, "content-type", "application/json");
			http_response(req, 400, errmsg, strlen(errmsg));
			goto cleanup;
		}
		if (http_argument_get_string(req, "chan", &chan) == KORE_RESULT_ERROR) {
			errmsg = "{\"error\":\"'chan' is missing or malformed\"}";
			http_response_header(req, "content-type", "application/json");
			http_response(req, 400, errmsg, strlen(errmsg));
			goto cleanup;
		}

		if (strcmp(chan, "master") == 0) {
			kore_log(LOG_DEBUG, "master=%d", newvol);
			if (setmaster(hdl, newvol)) {
				errmsg = "{\"error\":\"Unable to set volume of channel\"}";
				http_response_header(req, "content-type", "application/json");
				http_response(req, 500, errmsg, strlen(errmsg));
				goto cleanup;
			}
			mastervol = newvol;
		} else {
			kore_log(LOG_DEBUG, "%s=%d", chan, newvol);
			foundchan = 0;
			for (cn = 0; cn < MIDI_NCHAN; cn++) {
				if (strcmp(ctls[cn].name, chan) == 0) {
					if (setvol(hdl, cn, newvol)) {
						errmsg = "{\"error\":\"Unable to set volume of channel\"}";
						http_response_header(req, "content-type", "application/json");
						http_response(req, 500, errmsg, strlen(errmsg));
						goto cleanup;
					}
					ctls[cn].vol = newvol;
					foundchan = 1;
					break;
				}
			}
			if (!foundchan) {
				errmsg = "{\"error\":\"Unknown channel\"}";
				http_response_header(req, "content-type", "application/json");
				http_response(req, 400, errmsg, strlen(errmsg));
				goto cleanup;
			}
		}
	}

	buf = kore_buf_alloc(MIDI_NCHAN * SYSEX_NAMELEN);
	kore_buf_appendf(buf, "{\"chans\":[");
	if (mastervol >= 0)
		kore_buf_appendf(buf, "{\"chan\":\"master\",\"vol\":%u}", mastervol);
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
	if (hdl)
		mio_close(hdl);
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
