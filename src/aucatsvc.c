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
#include <kore/tasks.h>
#include <sys/ioctl.h>
#include <sys/soundcard.h>

#ifdef KORE_MODULE_ENTER_SANDBOX
#include <sys/capsicum.h>
#endif

#include <sndio.h>

#include "assets.h"

#define SYSEX_START 0xf0
#define SYSEX_END 0xf7
#define SYSEX_TYPE_EDU 0x7d

int init(int);
int serve_index(struct http_request *);
int serve_app_js(struct http_request *);
int serve_app_css(struct http_request *);
int serve_aucat(struct http_request *);
int serve_midi(struct http_request *);

void websocket_connect(struct connection *);
void websocket_disconnect(struct connection *);
void websocket_aucat_message(struct connection *, u_int8_t, void *, size_t);
void websocket_midi_message(struct connection *, u_int8_t, void *, size_t);

int aucat_writer(struct kore_task *);
int aucat_reader(struct kore_task *);
int midi_writer(struct kore_task *);
int midi_reader(struct kore_task *);
void data_available(struct kore_task *);

/* Websocket callbacks. */
struct kore_wscbs aucat_wscbs = {
	websocket_connect,
	websocket_aucat_message,
	websocket_disconnect
};

struct kore_wscbs midi_wscbs = {
	websocket_connect,
	websocket_midi_message,
	websocket_disconnect
};

static struct mio_hdl *aucat_hdl = NULL, *midi_hdl = NULL;
struct kore_task aucat_reader_task, aucat_writer_task;
struct kore_task midi_reader_task, midi_writer_task;

int
init(int state)
{
	switch (state) {
	case KORE_MODULE_LOAD:
		/* only do this in 1 worker */
		if (worker->id != 1)
			return (KORE_RESULT_OK);

		aucat_hdl = mio_open(AUDIODEVICE, MIO_OUT | MIO_IN, 0);
		if (aucat_hdl == NULL) {
			kore_log(LOG_WARNING, "unable to open %s", AUDIODEVICE);
			return (KORE_RESULT_ERROR);
		}

		midi_hdl = mio_open(MIDIDEVICE, MIO_OUT | MIO_IN, 0);
		if (midi_hdl == NULL) {
			kore_log(LOG_WARNING, "unable to open %s", MIDIDEVICE);
			return (KORE_RESULT_ERROR);
		}

		kore_task_create(&aucat_reader_task, aucat_reader);
		kore_task_bind_callback(&aucat_reader_task, data_available);
		kore_task_create(&aucat_writer_task, aucat_writer);

		kore_task_create(&midi_reader_task, midi_reader);
		kore_task_bind_callback(&midi_reader_task, data_available);
		kore_task_create(&midi_writer_task, midi_writer);
#ifdef KORE_MODULE_ENTER_SANDBOX
		break;
	case KORE_MODULE_ENTER_SANDBOX:
#endif
		if (worker->id == 1) {
			kore_task_run(&aucat_reader_task);
			kore_task_run(&aucat_writer_task);
			kore_task_run(&midi_reader_task);
			kore_task_run(&midi_writer_task);
		}
		break;
	case KORE_MODULE_UNLOAD:
		if (worker->id == 1) {
			mio_close(aucat_hdl);
			mio_close(midi_hdl);
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
websocket_aucat_message(struct connection *c, u_int8_t op, void *data, size_t len)
{
	kore_task_channel_write(&aucat_writer_task, data, len);
}

void
websocket_midi_message(struct connection *c, u_int8_t op, void *data, size_t len)
{
	kore_task_channel_write(&midi_writer_task, data, len);
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
serve_midi(struct http_request *req)
{
	kore_websocket_handshake(req, &midi_wscbs);
	return (KORE_RESULT_OK);
}

int
aucat_writer(struct kore_task *t)
{
	u_int8_t buf[188];
	u_int32_t sz;
	ssize_t ret;

	for (;;) {
		sz = kore_task_channel_read(t, &buf, sizeof(buf));
		if (sz > sizeof(buf)) {
			kore_log(LOG_WARNING, "aucat_writer: msg was too large, ignored");
			continue;
		}

		kore_log(LOG_DEBUG, "aucat_writer: read %d bytes", sz);
		ret = mio_write(aucat_hdl, buf, sz);
		if (ret <= 0 || ret < sz) {
			/* that's it */
			return (KORE_RESULT_ERROR);
		}
		kore_log(LOG_DEBUG, "aucat_writer: wrote %d bytes", ret);
	}

	return (KORE_RESULT_OK);
}

int
aucat_reader(struct kore_task *t)
{
	u_int8_t buf[188];
	ssize_t ret;

	for (;;) {
		ret = mio_read(aucat_hdl, buf, sizeof(buf));
		if (ret <= 0) {
			/* that's it */
			return (KORE_RESULT_ERROR);
		}

		//kore_log(LOG_DEBUG, "aucat_reader: got %ld bytes from pipe", ret);
		kore_task_channel_write(t, buf, ret);
	}

	return (KORE_RESULT_OK);
}

int
midi_writer(struct kore_task *t)
{
	u_int8_t buf[188];
	u_int32_t sz;
	ssize_t ret;

	for (;;) {
		sz = kore_task_channel_read(t, &buf, sizeof(buf));
		if (sz > sizeof(buf)) {
			kore_log(LOG_WARNING, "midi_writer: msg was too large, ignored");
			continue;
		}

		kore_log(LOG_DEBUG, "midi_writer: read %d bytes", sz);
		ret = mio_write(midi_hdl, buf, sz);
		if (ret <= 0 || ret < sz) {
			/* that's it */
			return (KORE_RESULT_ERROR);
		}
		kore_log(LOG_DEBUG, "midi_writer: wrote %d bytes", ret);
	}

	return (KORE_RESULT_OK);
}

int
midi_reader(struct kore_task *t)
{
	u_int8_t buf[188];
	ssize_t ret;

	for (;;) {
		ret = mio_read(midi_hdl, buf, sizeof(buf));
		if (ret <= 0) {
			/* that's it */
			return (KORE_RESULT_ERROR);
		}

		//kore_log(LOG_DEBUG, "aucat_reader: got %ld bytes from pipe", ret);
		kore_task_channel_write(t, buf, ret);
	}

	return (KORE_RESULT_OK);
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

	/* Broadcast it to all connected websocket clients. */
	//kore_log(LOG_DEBUG, "midi_data_available: got %d bytes from task", len);
	kore_websocket_broadcast(NULL, WEBSOCKET_OP_BINARY,
	    buf, len, WEBSOCKET_BROADCAST_GLOBAL);
}
