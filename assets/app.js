/* -*- mode: js; js-indent-level: 8; tab-width: 8; indent-tabs-mode: t; -*- */
/*
 * Copyright (c) 2016 Tobias Kortkamp <t@tobik.me>
 *
 * With portions ported from midish's mididev.c
 * Copyright (c) 2003-2010 Alexandre Ratchov <alex@caoua.org>
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

// jshint esversion: 6, browser: true, undef: true, unused: vars
// jshint curly: true, eqeqeq: true, latedef: true, varstmt: true, loopfunc: true

// This byte stream contains 3 MIDI messages, one CTL and two SysEx
// messages.  Passing it to MIDIProcessor.process should trigger
// onMIDIEvent 3 times.
// const testmsg = new Uint8Array([182, 7, 127, 240, 125, 0, 35, 2, 247, 240, 125, 127, 35, 1, 1, 0, 112, 117, 108, 115, 101, 97, 117, 49, 0, 0, 247]);

/* Slot descriptions are composed of lower case letters and
 * numbers i.e. a-z0-9 */
const SLOT_DESCRIPTION_DICT = {"48": "0", "49": "1", "50": "2", "51": "3", "52": "4", "53": "5", "54": "6", "55": "7", "56": "8", "57": "9", "97": "a", "98": "b", "99": "c", "100": "d", "101": "e", "102": "f", "103": "g", "104": "h", "105": "i", "106": "j", "107": "k", "108": "l", "109": "m", "110": "n", "111": "o", "112": "p", "113": "q", "114": "r", "115": "s", "116": "t", "117": "u", "118": "v", "119": "w", "120": "x", "121": "y", "122": "z"};

const INSTRUMENTS = [
	[0, 0, "Piano", "Acoustic Grand Piano"],
	[0, 1, "Piano", "Bright Acoustic Piano"],
	[0, 2, "Piano", "Electric Grand Piano"],
	[0, 3, "Piano", "Honky-tonk Piano"],
	[0, 4, "Piano", "Electric Piano 1"],
	[0, 5, "Piano", "Electric Piano 2"],
	[0, 6, "Piano", "Harpsichord"],
	[0, 7, "Piano", "Clavinet"],
	[0, 8, "Chromatic Percussion", "Celesta"],
	[0, 9, "Chromatic Percussion", "Glockenspiel"],
	[0, 10, "Chromatic Percussion", "Music Box"],
	[0, 11, "Chromatic Percussion", "Vibraphone"],
	[0, 12, "Chromatic Percussion", "Marimba"],
	[0, 13, "Chromatic Percussion", "Xylophone"],
	[0, 14, "Chromatic Percussion", "Tubular Bells"],
	[0, 15, "Chromatic Percussion", "Dulcimer"],
	[0, 16, "Organ", "Drawbar Organ"],
	[0, 17, "Organ", "Percussive Organ"],
	[0, 18, "Organ", "Rock Organ"],
	[0, 19, "Organ", "Church Organ"],
	[0, 20, "Organ", "Reed Organ"],
	[0, 21, "Organ", "Accordion"],
	[0, 22, "Organ", "Harmonica"],
	[0, 23, "Organ", "Tango Accordion"],
	[0, 24, "Guitar", "Acoustic Guitar (nylon)"],
	[0, 25, "Guitar", "Acoustic Guitar (steel)"],
	[0, 26, "Guitar", "Electric Guitar (jazz)"],
	[0, 27, "Guitar", "Electric Guitar (clean)"],
	[0, 28, "Guitar", "Electric Guitar (muted)"],
	[0, 29, "Guitar", "Overdriven Guitar"],
	[0, 30, "Guitar", "Distortion Guitar"],
	[0, 31, "Guitar", "Guitar Harmonics"],
	[0, 32, "Bass", "Acoustic Bass"],
	[0, 33, "Bass", "Electric Bass (finger)"],
	[0, 34, "Bass", "Electric Bass (pick)"],
	[0, 35, "Bass", "Fretless Bass"],
	[0, 36, "Bass", "Slap Bass 1"],
	[0, 37, "Bass", "Slap Bass 2"],
	[0, 38, "Bass", "Synth Bass 1"],
	[0, 39, "Bass", "Synth Bass 2"],
	[0, 40, "Strings", "Violin"],
	[0, 41, "Strings", "Viola"],
	[0, 42, "Strings", "Cello"],
	[0, 43, "Strings", "Contrabass"],
	[0, 44, "Strings", "Tremolo Strings"],
	[0, 45, "Strings", "Pizzicato Strings"],
	[0, 46, "Strings", "Orchestral Harp"],
	[0, 47, "Strings", "Timpani"],
	[0, 48, "Ensemble", "String Ensemble 1"],
	[0, 49, "Ensemble", "String Ensemble 2"],
	[0, 50, "Ensemble", "Synth Strings 1"],
	[0, 51, "Ensemble", "Synth Strings 2"],
	[0, 52, "Ensemble", "Choir Aahs"],
	[0, 53, "Ensemble", "Voice Oohs"],
	[0, 54, "Ensemble", "Synth Choir"],
	[0, 55, "Ensemble", "Orchestra Hit"],
	[0, 56, "Brass", "Trumpet"],
	[0, 57, "Brass", "Trombone"],
	[0, 58, "Brass", "Tuba"],
	[0, 59, "Brass", "Muted Trumpet"],
	[0, 60, "Brass", "French Horn"],
	[0, 61, "Brass", "Brass Section"],
	[0, 62, "Brass", "Synth Brass 1"],
	[0, 63, "Brass", "Synth Brass 2"],
	[0, 64, "Reed", "Soprano Sax"],
	[0, 65, "Reed", "Alto Sax"],
	[0, 66, "Reed", "Tenor Sax"],
	[0, 67, "Reed", "Baritone Sax"],
	[0, 68, "Reed", "Oboe"],
	[0, 69, "Reed", "English Horn"],
	[0, 70, "Reed", "Bassoon"],
	[0, 71, "Reed", "Clarinet"],
	[0, 72, "Pipe", "Piccolo"],
	[0, 73, "Pipe", "Flute"],
	[0, 74, "Pipe", "Recorder"],
	[0, 75, "Pipe", "Pan Flute"],
	[0, 76, "Pipe", "Blown Bottle"],
	[0, 77, "Pipe", "Shakuhachi"],
	[0, 78, "Pipe", "Whistle"],
	[0, 79, "Pipe", "Ocarina"],
	[0, 80, "Synth Lead", "Lead 1 (square)"],
	[0, 81, "Synth Lead", "Lead 2 (sawtooth)"],
	[0, 82, "Synth Lead", "Lead 3 (calliope)"],
	[0, 83, "Synth Lead", "Lead 4 (chiff)"],
	[0, 84, "Synth Lead", "Lead 5 (charang)"],
	[0, 85, "Synth Lead", "Lead 6 (voice)"],
	[0, 86, "Synth Lead", "Lead 7 (fifths)"],
	[0, 87, "Synth Lead", "Lead 8 (bass + lead)"],
	[0, 88, "Synth Pad", "Pad 1 (new age)"],
	[0, 89, "Synth Pad", "Pad 2 (warm)"],
	[0, 90, "Synth Pad", "Pad 3 (polysynth)"],
	[0, 91, "Synth Pad", "Pad 4 (choir)"],
	[0, 92, "Synth Pad", "Pad 5 (bowed)"],
	[0, 93, "Synth Pad", "Pad 6 (metallic)"],
	[0, 94, "Synth Pad", "Pad 7 (halo)"],
	[0, 95, "Synth Pad", "Pad 8 (sweep)"],
	[0, 96, "Synth Effects", "FX 1 (rain)"],
	[0, 97, "Synth Effects", "FX 2 (soundtrack)"],
	[0, 98, "Synth Effects", "FX 3 (crystal)"],
	[0, 99, "Synth Effects", "FX 4 (atmosphere)"],
	[0, 100, "Synth Effects", "FX 5 (brightness)"],
	[0, 101, "Synth Effects", "FX 6 (goblins)"],
	[0, 102, "Synth Effects", "FX 7 (echoes)"],
	[0, 103, "Synth Effects", "FX 8 (sci-fi)"],
	[0, 104, "Ethnic", "Sitar"],
	[0, 105, "Ethnic", "Banjo"],
	[0, 106, "Ethnic", "Shamisen"],
	[0, 107, "Ethnic", "Koto"],
	[0, 108, "Ethnic", "Kalimba"],
	[0, 109, "Ethnic", "Bagpipe"],
	[0, 110, "Ethnic", "Fiddle"],
	[0, 111, "Ethnic", "Shanai"],
	[0, 112, "Percussive", "Tinkle Bell"],
	[0, 113, "Percussive", "Agogo"],
	[0, 114, "Percussive", "Steel Drums"],
	[0, 115, "Percussive", "Woodblock"],
	[0, 116, "Percussive", "Taiko Drum"],
	[0, 117, "Percussive", "Melodic Tom"],
	[0, 118, "Percussive", "Synth Drum"],
	[0, 119, "Sound effects", "Reverse Cymbal"],
	[0, 120, "Sound effects", "Guitar Fret Noise"],
	[0, 121, "Sound effects", "Breath Noise"],
	[0, 122, "Sound effects", "Seashore"],
	[0, 123, "Sound effects", "Bird Tweet"],
	[0, 124, "Sound effects", "Telephone Ring"],
	[0, 125, "Sound effects", "Helicopter"],
	[0, 126, "Sound effects", "Applause"],
	[0, 127, "Sound effects", "Gunshot"],
	[8, 4, "", "Detuned EP 1"],
	[8, 5, "", "Detuned EP 2"],
	[8, 6, "", "Coupled Harpsichord"],
	[8, 14, "", "Church Bell"],
	[8, 16, "", "Detuned Organ 1"],
	[8, 17, "", "Detuned Organ 2"],
	[8, 19, "", "Church Organ 2"],
	[8, 21, "", "Italian Accordion"],
	[8, 24, "", "Ukulele"],
	[8, 25, "", "12 String Guitar"],
	[8, 26, "", "Hawaiian Guitar"],
	[8, 28, "", "Funk Guitar"],
	[8, 30, "", "Feedback Guitar"],
	[8, 31, "", "Guitar Feedback"],
	[8, 38, "", "Synth Bass 3"],
	[8, 39, "", "Synth Bass 4"],
	[8, 40, "", "Slow Violin"],
	[8, 48, "", "Orchestral Pad"],
	[8, 50, "", "Synth Strings 3"],
	[8, 61, "", "Brass 2"],
	[8, 62, "", "Synth Brass 3"],
	[8, 63, "", "Synth Brass 4"],
	[8, 80, "", "Sine Wave"],
	[8, 107, "", "Taisho Koto"],
	[8, 115, "", "Castanets"],
	[8, 116, "", "Concert Bass Drum"],
	[8, 117, "", "Melo Tom 2"],
	[8, 118, "", "808 Tom"],
	[9, 125, "", "Burst noise"],
	[16, 25, "", "Mandolin"],
	[128, 0, "Drum Kits", "Standard"],
	[128, 1, "Drum Kits", "Standard 1"],
	[128, 2, "Drum Kits", "Standard 2"],
	[128, 3, "Drum Kits", "Standard 3"],
	[128, 4, "Drum Kits", "Standard 4"],
	[128, 5, "Drum Kits", "Standard 5"],
	[128, 6, "Drum Kits", "Standard 6"],
	[128, 7, "Drum Kits", "Standard 7"],
	[128, 8, "Drum Kits", "Room"],
	[128, 9, "Drum Kits", "Room 1"],
	[128, 10, "Drum Kits", "Room 2"],
	[128, 11, "Drum Kits", "Room 3"],
	[128, 12, "Drum Kits", "Room 4"],
	[128, 13, "Drum Kits", "Room 5"],
	[128, 14, "Drum Kits", "Room 6"],
	[128, 15, "Drum Kits", "Room 7"],
	[128, 16, "Drum Kits", "Power"],
	[128, 17, "Drum Kits", "Power 1"],
	[128, 18, "Drum Kits", "Power 2"],
	[128, 19, "Drum Kits", "Power 3"],
	[128, 24, "Drum Kits", "Electronic"],
	[128, 25, "Drum Kits", "TR-808"],
	[128, 32, "Drum Kits", "Jazz"],
	[128, 33, "Drum Kits", "Jazz 1"],
	[128, 34, "Drum Kits", "Jazz 2"],
	[128, 35, "Drum Kits", "Jazz 3"],
	[128, 36, "Drum Kits", "Jazz 4"],
	[128, 40, "Drum Kits", "Brush"],
	[128, 41, "Drum Kits", "Brush 1"],
	[128, 42, "Drum Kits", "Brush 2"],
	[128, 48, "Drum Kits", "Orchestra Kit"]
];

const AUCATSVC_CONTROL = 1;
const AUCATSVC_MIDI = 2;

// const SYSEX_MTC = 0x01;
// const SYSEX_MTC_FULL = 0x01;
const SYSEX_CONTROL = 0x04;
const SYSEX_MASTER = 0x01;
// const SYSEX_MMC = 0x06;
// const SYSEX_MMC_STOP = 0x01;
// const SYSEX_MMC_START = 0x02;
// const SYSEX_MMC_LOC = 0x44;
// const SYSEX_MMC_LOC_LEN = 0x06;
// const SYSEX_MMC_LOC_CMD = 0x01;
const SYSEX_DEV_ANY = 0x7f;
const SYSEX_RESET = 0xff;
const SYSEX_TYPE_RT = 0x7f;
const SYSEX_TYPE_EDU = 0x7d;
const SYSEX_AUCAT = 0x23;
const SYSEX_AUCAT_SLOTDESC = 0x01;
const SYSEX_AUCAT_DUMPREQ = 0x02;
// const SYSEX_AUCAT_DUMPEND = 0x03;

const SYSEX_START = 0xf0;
const MIDI_QFRAME = 0xf1;
const SYSEX_STOP = 0xf7;
// const MIDI_TIC = 0xf8;
// const MIDI_START = 0xfa;
// const MIDI_STOP = 0xfc;
// const MIDI_ACK = 0xfe;
const MIDI_CTL = 0xb0;
const MIDI_CTLVOL = 0x07;

// const MTC_FPS_24 = 0;
// const MTC_FPS_25 = 1;
// const MTC_FPS_30 = 3;
// const MTC_FULL_LEN = 10; // size of MTC ``full frame'' sysex

// const EV_NPAT = 16;
// const EV_NULL = 0; // "null" or end-of-track
// const EV_TEMPO = 0x2; // tempo change
// const EV_TIMESIG = 0x3; // time signature change
// const EV_NRPN = 0x4; // NRPN + data entry
// const EV_RPN = 0x5; // RPN + data entry
// const EV_XCTL = 0x6; // 14bit controller
const EV_XPC = 0x7; // prog change + bank select
const EV_NOFF = 0x8; // MIDI note off
const EV_NON = 0x9; // MIDI note on
// const EV_KAT = 0xa; // MIDI key after-toutch
const EV_CTL = 0xb; // MIDI controller
const EV_PC = 0xc; // MIDI prog. change
// const EV_CAT = 0xd; // MIDI channel aftertouch
const EV_BEND = 0xe; // MIDI pitch bend
// const EV_PAT0 = 0x10; // user sysex pattern
// const EV_NUMCMD = EV_PAT0 + EV_NPAT;

const MASTER = -1;

function logError(msg) {
	document.querySelectorAll(".error-message").forEach(e => {
		e.innerText = msg;
	});
}

class Widget {
	constructor(element, toolbar) {
		this._element = element;
		this._toolbar = toolbar;
	}

	get element() {
		return this._element;
	}

	get toolbar() {
		return this._toolbar;
	}

	hide() {
		this.element.style.display = "none";
		this.toolbar.style.display = "none";
	}

	show() {
		this.element.style.display = "block";
		this.toolbar.style.display = "inline-block";
	}
}

class ToolbarItem extends Widget {
	constructor(icon) {
		let e = document.getElementById("icon-" + icon).cloneNode(true);
		e.classList = "toolbar-icon";
		e.id = "";
		delete e.id;

		super(e);

		this._setupEventListeners();
	}

	_dispatchEvent(e) {
		let event = new CustomEvent("::click", {
			detail: {
				event: e
			}
		});
		this.element.dispatchEvent(event);
	}

	_setupEventListeners() {
		this.element.addEventListener("touchstart", e => {
			e.preventDefault();
			this.active = true;
		});
		this.element.addEventListener("touchend", e => {
			this._dispatchEvent(e);
			this.active = false;
		});
		this.element.addEventListener("click", e => this._dispatchEvent(e));
	}

	get active() {
		this.element.classList.contains("toolbar-icon-active");
	}

	set active(value) {
		if (value) {
			this.element.classList.add("toolbar-icon-active");
		} else {
			this.element.classList.remove("toolbar-icon-active");
		}
		this._onSetActive(value);
	}

	_onSetActive(value) {}
}

class ToolbarGroupItem extends ToolbarItem {
	constructor(icon, view) {
		super(icon);
		this._group = [];
		this._view = view;
		view.hide();
	}

	_setupEventListeners() {
		this.element.addEventListener("touchstart", e => {
			e.preventDefault();
			this._group.forEach(x => x.active = false);
			this.active = true;
		});
		this.element.addEventListener("touchend", e => {
			this._dispatchEvent(e);
		});
		this.element.addEventListener("click", e => {
			this._dispatchEvent(e);
			this._group.forEach(x => x.active = false);
			this.active = true;
		});
	}

	_onSetActive(val) {
		if (val) {
			this._group.forEach(x => x._view.hide());
			this._view.show();
		} else {
			this._view.hide();
		}
	}

	setGroup(group) {
		this._group = group;
	}
}

class InstrumentSelector extends Widget {
	constructor(channel) {
		let div = document.createElement("div");
		super(div);
		this.channel = channel;

		div.classList = "instrument-selector channel" + channel;

		let label = document.createElement("label");
		label.htmlFor = "channel" + channel;
		label.appendChild(document.createTextNode("Channel " + channel));
		let select = document.createElement("select");
		let option = document.createElement("option");
		option.value = -1;
		option.innerText = "--";
		select.appendChild(option);
		INSTRUMENTS.forEach((x, i) => {
			let [bank, prog, category, name] = x;
			if (bank > 0) {
				return;
			}
			let option = document.createElement("option");
			option.value = i;
			//option.innerText = "" + bank + " " + prog + " " + category + " - " + name;
			option.innerText = "" + prog + " " + category + " - " + name;
			select.appendChild(option);
		});

		select.addEventListener("change", e => {
			if (e.target.value < 0) {
				return;
			}
			let [bank, prog] = INSTRUMENTS[e.target.value];
			let event = new CustomEvent("ProgramChangeRequest", {
				detail: {
					channel: this.channel,
					bank: bank,
					program: prog
				}
			});
			document.dispatchEvent(event);
		});

		div.appendChild(label);
		div.appendChild(select);

		document.addEventListener("ProgramChange", e => {
			if (e.detail.channel === this.channel) {
				select.value = e.detail.instrument;
			}
		});

		document.addEventListener("ResetRequest", e => {
			select.value = 0;
		});
	}
}

class ChannelLight extends Widget {
	constructor(parent, channel) {
		let light = document.createElement("div");
		super(light);
		light.classList = "channel-light";
		light.innerText = "" + channel;
		light.addEventListener("click", e => {
			if (parent) {
				parent.querySelectorAll(".channel-light-current").forEach(x => {
					x.classList.remove("channel-light-current");
				});
			}
			light.classList.add("channel-light-current");
			let event = new CustomEvent("ChannelChange", {
				detail: {
					channel: channel
				}
			});
			parent.dispatchEvent(event);
		});
		document.addEventListener("NoteOn", e => {
			if (channel === e.detail.channel) {
				light.classList.add("channel-light-on");
			}
		});
		document.addEventListener("NoteOff", e => {
			if (channel === e.detail.channel) {
				light.classList.remove("channel-light-on");
			}
		});
	}
}

class Settings extends Widget {
	constructor() {
		let toolbar = document.createElement("div");
		let div = document.createElement("div");
		div.classList = "instrument-selectors";

		super(div, toolbar);

		let resetBtn = new ToolbarItem("exclamation-triangle");

		toolbar.appendChild(resetBtn.element);

		let instrumentSelectors = [];
		this._instrumentSelectors = instrumentSelectors;
		for (let i = 0; i < 16; i++) {
			let selector = new InstrumentSelector(i);
			div.appendChild(selector.element);
			instrumentSelectors.push(selector);
		}

		resetBtn.element.addEventListener("::click", e => {
			let event = new Event("ResetRequest");
			document.dispatchEvent(event);
		});
	}
}

class Piano extends Widget {
	constructor(initialChannel) {
		let toolbar = document.createElement("div");
		let div = document.createElement("div");
		super(div, toolbar);

		div.classList = "piano";

		let pianoKeys = document.createElement("div");
		pianoKeys.classList = "piano-keys";
		this._pianoKeys = pianoKeys;
		this.zoomLevel = 7;
		this.shift = 4 * 7;

		this._channel = initialChannel === undefined ? 0 : initialChannel;
		this.channel = this._channel;

		for (let i = 0; i < 128; i++) {
			let key = document.createElement("div");
			key.classList = this.keyClass(i);
			key.classList.add("note-" + i);
			pianoKeys.appendChild(key);
			if (i > 127 || i < 0) {
				key.classList.add("piano-key-disabled");
				continue;
			}
			key.note = i;
			let noteOn = e => { e.preventDefault(); this.noteOn(e.target); };
			let noteOff = e => { this.noteOff(e.target); };
			key.addEventListener("mousedown", noteOn);
			/*
			 * when the mouse button is released and the pointer leaves
			 * the element send a note off event
			 */
			key.addEventListener("mouseout", noteOff);
			key.addEventListener("mouseover", e => {
				if (e.buttons === 1) {
					e.preventDefault();
					this.noteOn(key);
				}
			});
			key.addEventListener("mouseup", noteOff);
			key.addEventListener("touchstart", noteOn);
			key.addEventListener("touchend", e => {
				this.noteOff(e.target);
				/* See below in "touchmove" */
				pianoKeys.querySelectorAll(".piano-key-touch-move").forEach(
					x => this.noteOff(x));
			});
		}

		pianoKeys.addEventListener("touchmove", e => {
			if (e.touches.length === 1) {
				let key = document.elementFromPoint(
					e.touches[0].clientX, e.touches[0].clientY);
				if (key && key.parentElement === pianoKeys &&
				    key.classList.contains("piano-key") &&
				    !key.classList.contains("piano-key-pressed")) {
					pianoKeys.querySelectorAll(".piano-key-pressed").forEach(
						x => this.noteOff(x));
					/*
					 * Hack to turn the last key off again when the
					 * touch movement over multiple keys ends.  Also
					 * see "touchend" above and Piano.noteOff() below.
					 */
					key.classList.add("piano-key-touch-move");
					this.noteOn(key);
				}
			}
		});

		let channelLights = document.createElement("div");
		channelLights.classList = "channel-lights";
		for (let chan = 0; chan < 16; chan++) {
			let light = new ChannelLight(this._element, chan);
			channelLights.appendChild(light.element);
			if (chan === this.channel) {
				light.element.classList.add("channel-light-current");
			}
		}

		let btnGroup = document.createElement("div");
		let shiftUpBtn = new ToolbarItem("caret-right");
		let shiftDownBtn = new ToolbarItem("caret-left");
		let zoomInBtn = new ToolbarItem("search-plus");
		let zoomOutBtn = new ToolbarItem("search-minus");

		btnGroup.appendChild(shiftDownBtn.element);
		btnGroup.appendChild(shiftUpBtn.element);
		btnGroup.appendChild(zoomOutBtn.element);
		btnGroup.appendChild(zoomInBtn.element);

		toolbar.appendChild(btnGroup);

		div.appendChild(channelLights);
		div.appendChild(pianoKeys);
		div.appendChild(toolbar);

		shiftUpBtn.element.addEventListener("::click", e => this.notesUp());
		shiftDownBtn.element.addEventListener("::click", e => this.notesDown());
		zoomInBtn.element.addEventListener("::click", e => this.zoomInKeys());
		zoomOutBtn.element.addEventListener("::click", e => this.zoomOutKeys());

		this.element.addEventListener("ChannelChange", e => {
			this.channel = e.detail.channel;
		});
		document.addEventListener("NoteOn", e => {
			if (this.channel === e.detail.channel) {
				let note = e.detail.note;
				let key = pianoKeys.querySelector(".note-" + note);
				if (key) {
					key.classList.add("piano-key-pressed");
					key.classList.add("piano-key-highlight");
				}
			}
		});
		document.addEventListener("NoteOff", e => {
			if (this.channel === e.detail.channel) {
				let note = e.detail.note;
				let key = pianoKeys.querySelector(".note-" + note);
				if (key) {
					key.classList.remove("piano-key-pressed");
					key.classList.remove("piano-key-highlight");
					key.classList.remove("piano-key-touch-move");
				}
			}
		});

		this.zoomAndShiftKeys(this.zoomLevel, this.shift);
	}

	set channel(val) {
		this._pianoKeys.querySelectorAll(".piano-key-pressed").forEach(x => {
			x.classList.remove("piano-key-pressed");
			x.classList.remove("piano-key-highlight");
		});
		this._channel = val;
	}

	get channel() {
		return this._channel;
	}

	noteOn(key) {
		if (key.note > 127) {
			return;
		}
		let event = new CustomEvent("NoteOnRequest", {
			detail: {
				channel: this.channel,
				note: key.note,
				velocity: 127
			}
		});
		document.dispatchEvent(event);
	}

	noteOff(key) {
		if (key.note > 127) {
			return;
		}
		let event = new CustomEvent("NoteOffRequest", {
			detail: {
				channel: this.channel,
				note: key.note,
				velocity: 0
			}
		});
		document.dispatchEvent(event);
	}

	zoomAndShiftKeys(level, shift) {
		let levels = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.33, 1.5, 1.67, 1.75, 2];
		if (shift < 0) {
			shift = 0;
		} else if (shift > 70) {
			shift = 70;
		}
		if (level >= levels.length) {
			level = levels.length - 1;
		} else if (level < 0) {
			level = 0;
		}

		this.shift = shift;
		this.zoomLevel = level;

		let d = 52 * this.shift;
		let scaleX = levels[level];
		this._pianoKeys.style.transform = "scale(" + scaleX + ", 1) translate(-" + d + "px)";
	}

	zoomInKeys() {
		this.zoomAndShiftKeys(this.zoomLevel + 1, this.shift);
	}

	zoomOutKeys() {
		this.zoomAndShiftKeys(this.zoomLevel - 1, this.shift);
	}

	notesDown() {
		this.zoomAndShiftKeys(this.zoomLevel, this.shift - 7);
	}

	notesUp() {
		// We move by one octave (7 white keys)
		this.zoomAndShiftKeys(this.zoomLevel, this.shift + 7);
	}

	keyClass(k) {
		let n = {
			1: 1, 3: 3, 6: 1, 8: 2, 10: 3
		}[(k % 12) + (k < 0 ? 12 : 0)];
		if (n !== undefined) {
			return "piano-key piano-key-black piano-key-black" + n;
		}
		return "piano-key";
	}
}

class VolumeControl extends Widget {
	constructor(slot) {
		let div = document.createElement("div");
		super(div);

		let label = document.createElement("label");
		let input = document.createElement("input");
		this._label = label;
		this._input = input;

		let name;
		if (slot === MASTER) {
			name = "master";
		} else {
			name = "slot" + slot;
		}

		label.htmlFor = name;
		label.appendChild(document.createTextNode(name));

		input.type = "range";
		input.value = 127 / 2;
		input.max = 127;
		input.min = 0;
		input.addEventListener("change", e => {
			let newvol = e.target.value;
			let event = new CustomEvent("VolumeChangeRequest", {
				detail: {
					slot: slot,
					volume: newvol
				}
			});
			document.dispatchEvent(event);
		});

		div.classList = "volume-control " + name;

		div.appendChild(label);
		div.appendChild(input);

		document.addEventListener("VolumeChanged", e => {
			if (e.detail.slot == slot) {
				input.value = e.detail.volume;
			}
		});
		document.addEventListener("SlotDescription", e => {
			if (e.detail.slot == slot) {
				label.innerText = e.detail.description;
			}
		});
	}
}

class VolumeControls extends Widget {
	constructor() {
		let ctls = document.createElement("div");
		let toolbar = document.createElement("div");
		super(ctls, toolbar);
		ctls.classList = "volume-controls";

		for (let slot = -1; slot < 8; slot++) {
			let ctl = new VolumeControl(slot);
			ctls.appendChild(ctl.element);
		}

		let muteButton = new ToolbarItem("volume-off");
		let maxButton = new ToolbarItem("volume-up");
		toolbar.appendChild(muteButton.element);
		toolbar.appendChild(maxButton.element);

		muteButton.element.addEventListener("::click", e => {
			for (let slot = -1; slot < 8; slot++) {
				let event = new CustomEvent("VolumeChangeRequest", {
					detail: {
						slot: slot,
						volume: 0
					}
				});
				document.dispatchEvent(event);
			}
		});
		maxButton.element.addEventListener("::click", e => {
			for (let slot = -1; slot < 8; slot++) {
				let event = new CustomEvent("VolumeChangeRequest", {
					detail: {
						slot: slot,
						volume: 127
					}
				});
				document.dispatchEvent(event);
			}
		});
	}
}

class App extends Widget {
	constructor() {
		let div = document.createElement("div");
		div.classList = "app";
		div.classList.add("sidebar-active");

		let content = document.createElement("div");
		content.classList = "content";
		div.appendChild(content);

		let toolbar = document.createElement("div");
		toolbar.classList = "toolbar";
		content.appendChild(toolbar);

		super(div, toolbar);

		let volumeCtls = new VolumeControls();
		let piano = new Piano(0);
		let settings = new Settings();

		let volumeBtn = new ToolbarGroupItem("bullhorn", volumeCtls);
		let pianoBtn = new ToolbarGroupItem("music", piano);
		let settingsBtn = new ToolbarGroupItem("cog", settings);
		let itemGroup = [volumeBtn, settingsBtn, pianoBtn];
		itemGroup.forEach(x => x.setGroup(itemGroup));

		toolbar.appendChild(volumeBtn.element);
		toolbar.appendChild(pianoBtn.element);
		toolbar.appendChild(settingsBtn.element);
		let separator = document.createElement("div");
		separator.classList = "toolbar-separator";
		toolbar.appendChild(separator);
		content.appendChild(volumeCtls.element);
		toolbar.appendChild(volumeCtls.toolbar);
		content.appendChild(settings.element);
		toolbar.appendChild(settings.toolbar);
		content.appendChild(piano.element);
		toolbar.appendChild(piano.toolbar);

		let err = document.createElement("div");
		err.classList = "error-message";
		toolbar.appendChild(err);

		volumeBtn.active = true;
	}
}

class MIDIProcessor {
	constructor() {
		this.istatus = 0;
		this.idata = [0, 0, 0];
		this.icount = 0;
		this.isysex = [];
	}

	eventLength(status) {
		const evlen = [2, 2, 2, 2, 1, 1, 2, 0];
		return evlen[(status >>> 4) & 7];
	}

	/* This is an incomplete port of midish's mididev_inputcb() */
	process(buf) {
		let count = buf.length;
		let i = 0;

		while (count !== 0) {
			let data = buf[i];
			count--;
			i++;
			if (data >= 0xf8) {
				// MIDI_TIC
				// MIDI_START
				// MIDI_STOP
				// MIDI_ACK
			} else if (data >= 0x80) {
				this.istatus = data;
				this.icount = 0;

				if (data === SYSEX_START) {
					if (this.isysex.length > 0) {
						// abort sysex
					}
					this.isysex = [data];
				} else if (data === SYSEX_STOP) {
					if (this.isysex.length > 0) {
						this.isysex.push(data);
						this.onMIDIEvent(this.isysex);
						this.isysex = [];
					}
					this.istatus = 0;
				} else {
					// sysex message without stop byte is considered aborted
					if (this.isysex.length > 0) {
						this.isysex = [];
					}
				}
			} else if (this.istatus >= 0x80 && this.istatus < 0xf0) {
				this.idata[this.icount] = data;
				this.icount++;

				if (this.icount === this.eventLength(this.istatus)) {
					this.icount = 0;

					let cmd = (this.istatus >>> 4) >>> 0;
					let ch = this.istatus & 0x0f;
					if (cmd === EV_NON && this.idata[1] !== 0) {
						this.onMIDIEvent({
							cmd: cmd,
							ch: ch,
							note: this.idata[0],
							velocity: this.idata[1]
						});
					} else if (cmd === EV_NON && this.idata[1] === 0) {
						this.onMIDIEvent({
							cmd: EV_NOFF,
							ch: ch,
							note: this.idata[0],
							velocity: this.idata[1],
						});
					} else if (cmd === EV_NOFF) {
						this.onMIDIEvent({
							cmd: cmd,
							ch: ch,
							note: this.idata[0],
							velocity: 0,
						});
					} else if (cmd === EV_BEND) {
						this.onMIDIEvent({
							cmd: cmd,
							ch: ch,
							bend: (this.idata[1] << 7) + this.idata[0],
						});
					} else {
						this.onMIDIEvent({
							cmd: cmd,
							ch: ch,
							v0: this.idata[0],
							v1: this.idata[1]
						});
					}
				}
			} else if (this.istatus === SYSEX_START) {
				this.isysex.push(data);
			} else if (this.istatus === MIDI_QFRAME) {
				this.istatus = 0;
			}
		}
	}

	onMIDIEvent(data) {
	}

	static volumeChangeMsg(slot, vol) {
		if (slot === MASTER) {
			return new Uint8Array([AUCATSVC_CONTROL, SYSEX_START, SYSEX_TYPE_RT, 0, SYSEX_CONTROL, SYSEX_MASTER, 0, vol, SYSEX_STOP]);
		} else {
			return new Uint8Array([
				AUCATSVC_CONTROL, MIDI_CTL | slot, MIDI_CTLVOL, vol]);
		}
	}

	static dumpRequestMsg() {
		return new Uint8Array([AUCATSVC_CONTROL, SYSEX_START, SYSEX_TYPE_EDU, 0, SYSEX_AUCAT, SYSEX_AUCAT_DUMPREQ, SYSEX_STOP]);
	}

	static resetMsg() {
		return new Uint8Array([AUCATSVC_MIDI, SYSEX_START, SYSEX_TYPE_RT, SYSEX_DEV_ANY, SYSEX_RESET, SYSEX_STOP]);
	}

	static setControllerMsg(channel, type, value) {
		return new Uint8Array([AUCATSVC_MIDI, channel, type, value]);
	}

	static programChangeMsg(channel, bank, program) {
		//return new Uint8Array([AUCATSVC_MIDI, MIDI_CTL + channel, 0x00, 0x7f, MIDI_CTL + channel, 0x20, 0x00, 0xc0 + channel, program]);
		return new Uint8Array([AUCATSVC_MIDI, 0xc0 + channel, program]);
	}

	static pitchBendMsg(channel, program) {
		return new Uint8Array([AUCATSVC_MIDI, 0xe0 + channel, program]);
	}

	static noteOnMsg(channel, note, velocity) {
		return new Uint8Array([AUCATSVC_MIDI, 0x90 + channel, note, velocity]);
	}

	static noteOffMsg(channel, note, delay) {
		return new Uint8Array([AUCATSVC_MIDI, 0x80 + channel, note, delay]);
	}
}

class MIDIControlProcessor extends MIDIProcessor {
	onMIDIEvent(data) {
		let volume = 0;
		let slot = 0;

		if (data.cmd === EV_CTL) {
			slot = data.ch;
			volume = data.v1;
		} else if (data.length === 18 &&
			   data[0] === SYSEX_START &&
			   data[1] === SYSEX_TYPE_EDU &&
			   data[2] === SYSEX_DEV_ANY &&
			   data[3] === SYSEX_AUCAT &&
			   data[4] === SYSEX_AUCAT_SLOTDESC &&
			   data[6] === 0x00 &&
			   data[17] === SYSEX_STOP) {
			let slot = data[5];
			let desc = data.slice(7, 16);
			// Remove trailing zero bytes (if any)
			let zeros = desc.indexOf(0);
			if (zeros > -1) {
				desc = desc.slice(0, zeros);
			}
			let event = new CustomEvent("SlotDescription", {
				detail: {
					slot: slot,
					description: this.decodeSlotDescription(desc)
				}
			});
			document.dispatchEvent(event);
			return;
		} else if (data.length === 8 &&
			   data[0] === SYSEX_START &&
			   data[1] === SYSEX_TYPE_RT &&
			   (data[2] === 0 || data[2] === SYSEX_DEV_ANY) &&
			   data[3] === SYSEX_CONTROL &&
			   data[4] === SYSEX_MASTER &&
			   data[5] === 0 &&
			   data[7] === SYSEX_STOP) {
			slot = MASTER;
			volume = data[6];
		} else {
			return;
		}

		let event = new CustomEvent("VolumeChanged", {
			detail: {
				slot: slot,
				volume: volume
			}
		});
		document.dispatchEvent(event);
	}

	decodeSlotDescription(desc) {
		/* In browsers that support TextDecoder, this could be replaced with:
		 * new TextDecoder("ascii").decode(new Uint8Array(desc)) */
		return desc.map(x => {
			if (x in SLOT_DESCRIPTION_DICT) {
				return SLOT_DESCRIPTION_DICT[x];
			} else {
				return "?";
			}
		}).join("");
	}
}

class MIDIEventProcessor extends MIDIProcessor {
	onMIDIEvent(data) {
		// if (data.cmd == EV_CTL) {
		// slot = data.ch;
		// volume = data.v1;
		//}
		if (data.cmd === EV_NON) {
			let event = new CustomEvent("NoteOn", {
				detail: {
					channel: data.ch,
					note: data.note,
					velocity: data.velocity
				}
			});
			document.dispatchEvent(event);
		} else if (data.cmd === EV_NOFF) {
			let event = new CustomEvent("NoteOff", {
				detail: {
					channel: data.ch,
					note: data.note,
					velocity: data.velocity
				}
			});
			document.dispatchEvent(event);
		} else if (data.cmd === EV_PC) {
			let event = new CustomEvent("ProgramChange", {
				detail: {
					channel: data.ch,
					instrument: data.v0,
				}
			});
			document.dispatchEvent(event);
		} else {
			//console.log(data);
		}
	}
}

class Connection {
	constructor(url) {
		this.socket = null;
		this.url = url;
	}

	open() {
		if (this.socket) {
			this.socket.close();
		}
		this.socket = null;
		try {
			this.socket = new WebSocket(this.url);
			this.socket.binaryType = "arraybuffer";
			this.socket.onopen = e => this._onOpen(e);
			this.socket.onmessage = e => this._onMessage(e);
			this.socket.onclose = e => this._onClose(e);
			this.socket.onerror = e => this._onError(e);
		} catch (e) {
			logError(e);
		}
	}

	_onOpen(e) {
		logError("");
		let msg = MIDIProcessor.dumpRequestMsg();
		if (!this.send(msg)) {
			logError("unable to send dump request");
		}
	}

	_onError(e) {
		this.socket = null;
		logError("an error occured");
	}

	_onClose(e) {
		this.socket = null;
		setTimeout(() => this.open(), 1000);
		logError("connection closed. trying to reconnect...");
	}

	_onMessage(e) {
		let data = new Uint8Array(e.data);
		if (data[0] === AUCATSVC_CONTROL) {
			let event = new CustomEvent("MIDIControlMessage", {
				detail: data.slice(1)
			});
			document.dispatchEvent(event);
		} else if (data[0] === AUCATSVC_MIDI) {
			let event = new CustomEvent("MIDIMessage", {
				detail: data.slice(1)
			});
			document.dispatchEvent(event);
		}
	}

	send(data) {
		try {
			if (this.socket && this.socket.readyState === 1) { // OPEN
				this.socket.send(data);
				return true;
			}
		} catch (e) {
			logError(e);
		}
		return false;
	}
}

document.addEventListener("DOMContentLoaded", function() {
	let protocol = location.protocol === "http:" ? "ws:" : "wss:";
	let url = protocol + "//" + location.host + "/aucat";
	let conn = new Connection(url);
	let ctlmidi = new MIDIControlProcessor();
	let midi = new MIDIEventProcessor();
	let app = new App();
	document.body.appendChild(app.element);

	document.addEventListener("MIDIMessage", (e) => {
		midi.process(e.detail);
	});
	document.addEventListener("MIDIControlMessage", (e) => {
		ctlmidi.process(e.detail);
	});
	document.addEventListener("ResetRequest", (e) => {
		let msg = MIDIProcessor.resetMsg();
		if (!conn.send(msg)) {
			logError("unable to reset");
		}
	});
	document.addEventListener("VolumeChangeRequest", e => {
		let msg = MIDIProcessor.volumeChangeMsg(
			e.detail.slot, e.detail.volume);
		if (!conn.send(msg)) {
			logError("unable to change volume");
		}
	});
	document.addEventListener("NoteOnRequest", e => {
		let msg = MIDIProcessor.noteOnMsg(
			e.detail.channel, e.detail.note, e.detail.velocity);
		if (!conn.send(msg)) {
			logError("unable to turn on note");
		}
	});
	document.addEventListener("NoteOffRequest", e => {
		let msg = MIDIProcessor.noteOffMsg(
			e.detail.channel, e.detail.note, e.detail.velocity);
		if (!conn.send(msg)) {
			logError("unable to turn off note");
		}
	});
	document.addEventListener("ProgramChangeRequest", e => {
		let msg = MIDIProcessor.programChangeMsg(
			e.detail.channel, e.detail.bank, e.detail.program);
		if (!conn.send(msg)) {
			logError("unable to change program");
		}
	});
	conn.open();
});
