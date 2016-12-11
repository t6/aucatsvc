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
#include <poll.h>
#include <kore/kore.h>
#include <kore/http.h>
#include <kore/tasks.h>

#ifdef KORE_MODULE_ENTER_SANDBOX
#include <sys/capsicum.h>
#endif

#include <sndio.h>

#include "assets.h"

#define AUCATSVC_CONTROL 1
#define AUCATSVC_MIDI 2

int init(int);
int serve_index(struct http_request *);
int serve_app_js(struct http_request *);
int serve_app_css(struct http_request *);
int serve_aucat(struct http_request *);

void websocket_connect(struct connection *);
void websocket_disconnect(struct connection *);
void websocket_message(struct connection *, u_int8_t, void *, size_t);

int aucat_reader(struct kore_task *);
void data_available(struct kore_task *);

/* Websocket callbacks. */
struct kore_wscbs aucat_wscbs = {
	websocket_connect,
	websocket_message,
	websocket_disconnect
};

static struct mio_hdl *aucat_hdl = NULL, *midi_hdl = NULL;
struct kore_task aucat_reader_task;

int
init(int state)
{
	switch (state) {
	case KORE_MODULE_LOAD:
		if (worker->id == 1) {
			aucat_hdl = mio_open(AUDIODEVICE, MIO_OUT | MIO_IN, 0);
			if (aucat_hdl == NULL) {
				kore_log(LOG_WARNING, "unable to open %s", AUDIODEVICE);
				return (KORE_RESULT_ERROR);
			}

			kore_task_create(&aucat_reader_task, aucat_reader);
			kore_task_bind_callback(&aucat_reader_task, data_available);
			midi_hdl = mio_open(MIDIDEVICE, MIO_OUT | MIO_IN, 0);
			if (midi_hdl == NULL) {
				kore_log(LOG_WARNING, "unable to open %s", MIDIDEVICE);
				return (KORE_RESULT_ERROR);
			}
		}
#ifdef KORE_MODULE_ENTER_SANDBOX
		break;
	case KORE_MODULE_ENTER_SANDBOX:
#endif
		if (worker->id == 1) {
			kore_task_run(&aucat_reader_task);
		}
		break;
	case KORE_MODULE_UNLOAD:
		if (worker->id == 1) {
			mio_close(aucat_hdl);
			mio_close(midi_hdl);
			kore_task_destroy(&aucat_reader_task);
		}
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
serve_app_js(struct http_request *req)
{
	http_response_header(req, "content-type", "application/javascript");
	http_response(req, 200, asset_app_js, asset_len_app_js);
	return (KORE_RESULT_OK);
}

int
serve_app_css(struct http_request *req)
{
	http_response_header(req, "content-type", "text/css");
	http_response(req, 200, asset_app_css, asset_len_app_css);
	return (KORE_RESULT_OK);
}

void
websocket_connect(struct connection *c)
{
	kore_log(LOG_NOTICE, "%p: connected", c);
}

void
websocket_message(struct connection *c, u_int8_t op, void *buf, size_t len)
{
	unsigned char *data = buf;

	if (len > 0) {
		switch (data[0]) {
		case AUCATSVC_CONTROL:
			mio_write(aucat_hdl, data + 1, len - 1);
			break;
		case AUCATSVC_MIDI:
			mio_write(midi_hdl, data + 1, len - 1);
			break;
		default:
			kore_log(LOG_NOTICE, "Ignored message type: %d", data[0]);
		}
	}
}

void
websocket_disconnect(struct connection *c)
{
	kore_log(LOG_NOTICE, "%p: disconnecting", c);
}

int
serve_aucat(struct http_request *req)
{
	kore_websocket_handshake(req, &aucat_wscbs);
	return (KORE_RESULT_OK);
}

int
aucat_reader(struct kore_task *t)
{
	u_int8_t buf[BUFSIZ];
	ssize_t ret;
	struct pollfd *pfds;
	int aucat_nfds, midi_nfds, nfds, ev;

	aucat_nfds = mio_nfds(aucat_hdl);
	midi_nfds = mio_nfds(midi_hdl);
	nfds = aucat_nfds + midi_nfds;

	pfds = kore_calloc(nfds, sizeof(struct pollfd));
	if (pfds == NULL)
		return (KORE_RESULT_ERROR);

	for (;;) {
		if (mio_pollfd(aucat_hdl, pfds, POLLIN) < 0)
			goto error;
		if (mio_pollfd(midi_hdl, pfds + aucat_nfds, POLLIN) < 0)
			goto error;

		if (poll(pfds, nfds, -1) < 0) {
			kore_log(LOG_NOTICE, "poll: %s", errno_s);
			goto error;
		}

		ev = mio_revents(aucat_hdl, pfds);
		if (ev & POLLIN) {
			buf[0] = AUCATSVC_CONTROL;
			ret = mio_read(aucat_hdl, buf + 1, sizeof(buf) - 1);
			if (ret > 0) {
				kore_task_channel_write(t, buf, ret + 1);

			}
		} else if (ev & POLLHUP)
			goto error;

		ev = mio_revents(midi_hdl, pfds + aucat_nfds);
		if (ev & POLLIN) {
			buf[0] = AUCATSVC_MIDI;
			ret = mio_read(midi_hdl, buf + 1, sizeof(buf) - 1);
			if (ret > 0) {
				kore_task_channel_write(t, buf, ret + 1);
			}
		} else if (ev & POLLHUP) {
			goto error;
		}
	}

	return (KORE_RESULT_OK);
error:
	free(pfds);
	return (KORE_RESULT_ERROR);
}

void
data_available(struct kore_task *t)
{
	size_t len;
	u_int8_t buf[BUFSIZ];

	if (kore_task_finished(t)) {
		kore_log(LOG_WARNING, "task finished");
		return;
	}

	len = kore_task_channel_read(t, buf, sizeof(buf));
	if (len > sizeof(buf))
		kore_log(LOG_WARNING, "truncated data from task");

	kore_websocket_broadcast(NULL, WEBSOCKET_OP_BINARY, buf, len,
				 WEBSOCKET_BROADCAST_GLOBAL);
}
