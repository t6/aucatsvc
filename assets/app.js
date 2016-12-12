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

// This byte stream contains 3 MIDI messages, one CTL and two SysEx
// messages.  Passing it to MIDIProcessor.process should trigger
// onMIDIEvent 3 times.
let testmsg = new Uint8Array([182, 7, 127, 240, 125, 0, 35, 2, 247, 240, 125, 127, 35, 1, 1, 0, 112, 117, 108, 115, 101, 97, 117, 49, 0, 0, 247]);

const INSTRUMENTS = [
    ['Piano', [
	[0, 'Acoustic Grand Piano'],
	[1, 'Bright Acoustic Piano'],
	[2, 'Electric Grand Piano'],
	[3, 'Honky-tonk Piano'],
	[4, 'Electric Piano 1'],
	[5, 'Electric Piano 2'],
	[6, 'Harpsichord'],
	[7, 'Clavinet']
    ]],
    ['Chromatic Percussion', [
	[8, 'Celesta'],
	[9, 'Glockenspiel'],
	[10, 'Music Box'],
	[11, 'Vibraphone'],
	[12, 'Marimba'],
	[13, 'Xylophone'],
	[14, 'Tubular Bells'],
	[15, 'Dulcimer']
    ]],
    ['Organ', [
	[16, 'Drawbar Organ'],
	[17, 'Percussive Organ'],
	[18, 'Rock Organ'],
	[19, 'Church Organ'],
	[20, 'Reed Organ'],
	[21, 'Accordion'],
	[22, 'Harmonica'],
	[23, 'Tango Accordion']
    ]],
    ['Guitar', [
	[24, 'Acoustic Guitar (nylon)'],
	[25, 'Acoustic Guitar (steel)'],
	[26, 'Electric Guitar (jazz)'],
	[27, 'Electric Guitar (clean)'],
	[28, 'Electric Guitar (muted)'],
	[29, 'Overdriven Guitar'],
	[30, 'Distortion Guitar'],
	[31, 'Guitar Harmonics']
    ]],
    ['Bass', [
	[32, 'Acoustic Bass'],
	[33, 'Electric Bass (finger)'],
	[34, 'Electric Bass (pick)'],
	[35, 'Fretless Bass'],
	[36, 'Slap Bass 1'],
	[37, 'Slap Bass 2'],
	[38, 'Synth Bass 1'],
	[39, 'Synth Bass 2']
    ]],
    ['Strings', [
	[40, 'Violin'],
	[41, 'Viola'],
	[42, 'Cello'],
	[43, 'Contrabass'],
	[44, 'Tremolo Strings'],
	[45, 'Pizzicato Strings'],
	[46, 'Orchestral Harp'],
	[47, 'Timpani']
    ]],
    ['Ensemble', [
	[48, 'String Ensemble 1'],
	[49, 'String Ensemble 2'],
	[50, 'Synth Strings 1'],
	[51, 'Synth Strings 2'],
	[52, 'Choir Aahs'],
	[53, 'Voice Oohs'],
	[54, 'Synth Choir'],
	[55, 'Orchestra Hit']
    ]],
    ['Brass', [
	[56, 'Trumpet'],
	[57, 'Trombone'],
	[58, 'Tuba'],
	[59, 'Muted Trumpet'],
	[60, 'French Horn'],
	[61, 'Brass Section'],
	[62, 'Synth Brass 1'],
	[63, 'Synth Brass 2'],
    ]],
    ['Reed', [
	[64, 'Soprano Sax'],
	[65, 'Alto Sax'],
	[66, 'Tenor Sax'],
	[67, 'Baritone Sax'],
	[68, 'Oboe'],
	[69, 'English Horn'],
	[70, 'Bassoon'],
	[71, 'Clarinet']
    ]],
    ['Pipe', [
	[72, 'Piccolo'],
	[73, 'Flute'],
	[74, 'Recorder'],
	[75, 'Pan Flute'],
	[76, 'Blown Bottle'],
	[77, 'Shakuhachi'],
	[78, 'Whistle'],
	[79, 'Ocarina']
    ]],
    ['Synth Lead', [
	[80, 'Lead 1 (square)'],
	[81, 'Lead 2 (sawtooth)'],
	[82, 'Lead 3 (calliope)'],
	[83, 'Lead 4 (chiff)'],
	[84, 'Lead 5 (charang)'],
	[85, 'Lead 6 (voice)'],
	[86, 'Lead 7 (fifths)'],
	[87, 'Lead 8 (bass + lead)']
    ]],
    ['Synth Pad', [
	[88, 'Pad 1 (new age)'],
	[89, 'Pad 2 (warm)'],
	[90, 'Pad 3 (polysynth)'],
	[91, 'Pad 4 (choir)'],
	[92, 'Pad 5 (bowed)'],
	[93, 'Pad 6 (metallic)'],
	[94, 'Pad 7 (halo)'],
	[95, 'Pad 8 (sweep)']
    ]],
    ['Synth Effects', [
	[96, 'FX 1 (rain)'],
	[97, 'FX 2 (soundtrack)'],
	[98, 'FX 3 (crystal)'],
	[99, 'FX 4 (atmosphere)'],
	[100, 'FX 5 (brightness)'],
	[101, 'FX 6 (goblins)'],
	[102, 'FX 7 (echoes)'],
	[103, 'FX 8 (sci-fi)']
    ]],
    ['Ethnic', [
	[104, 'Sitar'],
	[105, 'Banjo'],
	[106, 'Shamisen'],
	[107, 'Koto'],
	[108, 'Kalimba'],
	[109, 'Bagpipe'],
	[110, 'Fiddle'],
	[111, 'Shanai']
    ]],
    ['Percussive', [
	[112, 'Tinkle Bell'],
	[113, 'Agogo'],
	[114, 'Steel Drums'],
	[115, 'Woodblock'],
	[116, 'Taiko Drum'],
	[117, 'Melodic Tom'],
	[118, 'Synth Drum']
    ]],
    ['Sound effects', [
	[119, 'Reverse Cymbal'],
	[120, 'Guitar Fret Noise'],
	[121, 'Breath Noise'],
	[122, 'Seashore'],
	[123, 'Bird Tweet'],
	[124, 'Telephone Ring'],
	[125, 'Helicopter'],
	[126, 'Applause'],
	[127, 'Gunshot']
    ]]
]

const AUCATSVC_CONTROL = 1;
const AUCATSVC_MIDI = 2;

const SYSEX_MTC = 0x01;
const SYSEX_MTC_FULL = 0x01;
const SYSEX_CONTROL = 0x04;
const SYSEX_MASTER = 0x01;
const SYSEX_MMC = 0x06;
const SYSEX_MMC_STOP = 0x01;
const SYSEX_MMC_START = 0x02;
const SYSEX_MMC_LOC = 0x44;
const SYSEX_MMC_LOC_LEN = 0x06;
const SYSEX_MMC_LOC_CMD = 0x01;

const SYSEX_DEV_ANY = 0x7f;

const SYSEX_TYPE_RT = 0x7f;
const SYSEX_TYPE_EDU = 0x7d;
const SYSEX_AUCAT = 0x23;
const SYSEX_AUCAT_SLOTDESC = 0x01;
const SYSEX_AUCAT_DUMPREQ = 0x02;
const SYSEX_AUCAT_DUMPEND = 0x03;

const SYSEX_START = 0xf0;
const MIDI_QFRAME = 0xf1;
const SYSEX_STOP = 0xf7;
const MIDI_TIC = 0xf8;
const MIDI_START = 0xfa;
const MIDI_STOP = 0xfc;
const MIDI_ACK = 0xfe;
const MIDI_CTL = 0xb0;
const MIDI_CTLVOL = 0x07;

const MTC_FPS_24 = 0;
const MTC_FPS_25 = 1;
const MTC_FPS_30 = 3;
const MTC_FULL_LEN = 10; // size of MTC ``full frame'' sysex

const EV_NOFF_DEFAULTVEL = 100; // default note-off velocity

const EV_NPAT = 16;
const EV_NULL = 0; // "null" or end-of-track
const EV_TEMPO = 0x2; // tempo change
const EV_TIMESIG = 0x3; // time signature change
const EV_NRPN = 0x4; // NRPN + data entry
const EV_RPN = 0x5; // RPN + data entry
const EV_XCTL = 0x6; // 14bit controller
const EV_XPC = 0x7; // prog change + bank select
const EV_NOFF = 0x8; // MIDI note off
const EV_NON = 0x9; // MIDI note on
const EV_KAT = 0xa; // MIDI key after-toutch
const EV_CTL = 0xb; // MIDI controller
const EV_PC = 0xc; // MIDI prog. change
const EV_CAT = 0xd; // MIDI channel aftertouch
const EV_BEND = 0xe; // MIDI pitch bend
const EV_PAT0 = 0x10; // user sysex pattern
const EV_NUMCMD = EV_PAT0 + EV_NPAT;

const MASTER = -1;

function logError(msg) {
    console.log(msg);
    document.querySelectorAll(".error-message").forEach(e => {
	e.innerText = msg;
    });
}

function icon(id) {
    let e = document.getElementById("icon-" + id).cloneNode(true);
    e.classList = "toolbar-icon";
    delete e.id;
    return e;
}

function onIconClick(btn, f) {
    btn.addEventListener("touchstart", e => {
	e.preventDefault();
	btn.classList.add("toolbar-icon-active");
    });
    btn.addEventListener("touchend", e => {
	f(e);
	btn.classList.remove("toolbar-icon-active");
    });
    btn.addEventListener("click", f);
}

class InstrumentSelector {
    constructor() {
	let element = document.createElement("div");
	this._element = element;
	let div = document.createElement("div");
	div.classList = "instrument-selector";
	this.channel = 0;

	let channels = document.createElement("select");
	for (let i = 0; i < 16; i++) {
	    let option = document.createElement("option");
	    option.value = i;
	    option.innerText = "channel " + i;
	    channels.appendChild(option);
	}

	let select = document.createElement("select");
	let option = document.createElement("option");
	option.value = -1;
	option.innerText = "--";
	select.appendChild(option);
	INSTRUMENTS.forEach(x => {
	    let [category, instruments] = x;
	    instruments.forEach(y => {
		let [prog, name] = y;
		let option = document.createElement("option");
		option.value = prog;
		option.innerText = "" + prog + " " + category + " - " + name;
		select.appendChild(option);
	    });
	});

	select.addEventListener("change", e => {
	    let prog = e.target.value;
	    if (prog < 0) return;
	    let event = new CustomEvent("ProgramChangeRequest", {
		detail: {
		    channel: this.channel,
		    program: prog
		}
	    });
	    document.dispatchEvent(event);
	});

	channels.addEventListener("change", e => {
	    let chan = parseInt(e.target.value, 10);
	    let event = new CustomEvent("ChannelChange", {
		detail: {
		    channel: chan
		}
	    });
	    document.dispatchEvent(event);
	    this.channel = chan;
	});

	div.appendChild(channels);
	div.appendChild(select);
	element.appendChild(div);

	document.addEventListener("ProgramChange", e => {
	});
    }

    get element() {
	return this._element;
    }
}

class Piano {
    constructor() {
	let toolbar = document.createElement("div");
	toolbar.style.display = "inline-block";
	this._toolbar = toolbar;
	let div = document.createElement("div");
	div.classList = "piano";
	this._element = div;

	let pianoKeys = document.createElement("div");
	pianoKeys.classList = "piano-keys";
	this.pianoKeys = pianoKeys;
	this.zoomLevel = 7;
	this.shift = 4 * 7;
	this.channel = 0;

	// Create more keys than we have.  These look better than
	// empty space when the keyboard was shifted too much.
	for (let i = 0; i < 1024; i++) {
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
	     * When the mouse button is released and the pointer leaves
	     * the element send a note off event
	     */
	    key.addEventListener("mouseout", noteOff);
	    key.addEventListener("mouseover", e => {
		if (e.buttons == 1) {
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
		if (key && key.parentElement == pianoKeys &&
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

	let selector = new InstrumentSelector();

	let btnGroup = document.createElement("div");
	let shiftUpBtn = icon("caret-right");
	let shiftDownBtn = icon("caret-left");
	let zoomInBtn = icon("search-plus");
	let zoomOutBtn = icon("search-minus");

	btnGroup.appendChild(shiftDownBtn);
	btnGroup.appendChild(shiftUpBtn);
	btnGroup.appendChild(zoomOutBtn);
	btnGroup.appendChild(zoomInBtn);

	toolbar.appendChild(btnGroup);

	div.appendChild(selector.element);
	div.appendChild(pianoKeys);
	div.appendChild(toolbar);

	onIconClick(shiftUpBtn, e => this.notesUp());
	onIconClick(shiftDownBtn, e => this.notesDown());
	onIconClick(zoomInBtn, e => this.zoomInKeys());
	onIconClick(zoomOutBtn, e => this.zoomOutKeys());

	document.addEventListener("NoteOn", e => {
	    let note = e.detail.note;
	    let key = pianoKeys.querySelector(".note-" + note);
	    if (key) {
		key.classList.add("piano-key-pressed");
		key.classList.add("piano-key-highlight");
	    }
	});
	document.addEventListener("NoteOff", e => {
	    let note = e.detail.note;
	    let key = pianoKeys.querySelector(".note-" + note);
	    if (key) {
		key.classList.remove("piano-key-pressed");
		key.classList.remove("piano-key-highlight");
	    }
	});

	document.addEventListener("ChannelChange", e => {
	    this.channel = e.detail.channel;
	});

	this.zoomAndShiftKeys(this.zoomLevel, this.shift);
    }

    noteOn(key) {
	key.classList.add("piano-key-pressed");
	if (key.note > 127) return;
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
	key.classList.remove("piano-key-pressed");
	key.classList.remove("piano-key-touch-move");
	if (key.note > 127) return;
	let event = new CustomEvent("NoteOffRequest", {
	    detail: {
		channel: this.channel,
		note: key.note,
		velocity: 127
	    }
	});
	document.dispatchEvent(event);
    }

    zoomAndShiftKeys(level, shift) {
	let levels = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75,
		      1, 1.33, 1.5, 1.67, 1.75, 2];
	if (shift < 0)
	    shift = 0;
	else if (shift > 70)
	    shift = 70;
	if (level >= levels.length) {
	    level = levels.length - 1;
	} else if (level < 0) {
	    level = 0;
	}

	this.shift = shift;
	this.zoomLevel = level;

	let d = 52 * this.shift;
	let scaleX = levels[level];
	this.pianoKeys.style.transform = "scale(" + scaleX + ", 1) translate(-" + d + "px)";
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
	var n = {
	    1: 1, 3: 3, 6: 1, 8: 2, 10: 3
	}[(k % 12) + (k < 0 ? 12 : 0)];
	if (n !== undefined)
	    return "piano-key piano-key-black piano-key-black" + n;
	return "piano-key";
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

class VolumeControls {
    constructor() {
	let toolbar = document.createElement("div");
	this._toolbar = toolbar;
	let ctls = document.createElement("div");
	this._element = ctls;
	ctls.classList = "volume-controls";

	for (let slot = -1; slot < 8; slot++) {
	    let ctl = this.makeVolumeControl(slot);
	    ctls.appendChild(ctl);
	}

	let muteButton = icon("volume-off");
	let maxButton = icon("volume-up");
	toolbar.appendChild(muteButton);
	toolbar.appendChild(maxButton);

	muteButton.addEventListener("click", e => {
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
	maxButton.addEventListener("click", e => {
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

	document.addEventListener("VolumeChanged", e => {
	    this.onVolumeChange(e.detail.slot, e.detail.volume)
	});
	document.addEventListener("SlotDescription", e => {
	    this.onSlotDescription(e.detail.slot, e.detail.description)
	});
    }

    makeVolumeControl(slot) {
	let div = document.createElement("div");
	let label = document.createElement("label");
	let input = document.createElement("input");
	let name;
	if (slot == MASTER) {
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

	return div;
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

    getSlotElement(slot, child) {
	if (slot == MASTER) {
	    name = "master";
	} else {
	    name = "slot" + slot;
	}
	return this.element.querySelector("." + name + " > " + child);
    }

    onVolumeChange(slot, volume) {
	this.getSlotElement(slot, "input").value = volume;
    }

    onSlotDescription(slot, desc) {
	this.getSlotElement(slot, "label").innerText = desc;
    }
}

class App {
    constructor() {
	let div = document.createElement("div");
	div.classList = "app";
	div.classList.add("sidebar-active");
	this.div = div;

	let content = document.createElement("div");
	content.classList = "content";
	div.appendChild(content);

	let toolbar = document.createElement("div");
	toolbar.classList = "toolbar";
	content.appendChild(toolbar);

	let volumeBtn = icon("bullhorn");
	let pianoBtn = icon("music");
	let volumeCtls = new VolumeControls();
	let piano = new Piano();

	toolbar.appendChild(volumeBtn);
	toolbar.appendChild(pianoBtn);
	// TODO: separator
	content.appendChild(volumeCtls.element);
	toolbar.appendChild(volumeCtls.toolbar);
	content.appendChild(piano.element);
	toolbar.appendChild(piano.toolbar);

	let err = document.createElement("div");
	err.classList = "error-message";
	toolbar.appendChild(err);

	volumeCtls.show();
	piano.hide();
	// volumeCtls.hide();
	volumeBtn.classList.add("toolbar-icon-active");

	let pianoBtnClicked = e => {
	    e.preventDefault();
	    volumeCtls.hide();
	    piano.show();
	    pianoBtn.classList.add("toolbar-icon-active");
	    volumeBtn.classList.remove("toolbar-icon-active");
	};
	pianoBtn.addEventListener("touchstart", e => {
	    e.preventDefault()
	    pianoBtn.classList.add("toolbar-icon-active");
	});
	pianoBtn.addEventListener("touchend", pianoBtnClicked);
	pianoBtn.addEventListener("click", pianoBtnClicked);
	let volumeBtnClicked = e => {
	    e.preventDefault();
	    volumeCtls.show();
	    piano.hide();
	    volumeBtn.classList.add("toolbar-icon-active");
	    pianoBtn.classList.remove("toolbar-icon-active");
	};
	volumeBtn.addEventListener("touchstart", e => {
	    e.preventDefault()
	    volumeBtn.classList.add("toolbar-icon-active");
	});
	volumeBtn.addEventListener("touchend", volumeBtnClicked);
	volumeBtn.addEventListener("click", volumeBtnClicked);
    }

    get element() {
	return this.div;
    }
}


class MIDIProcessor {
    constructor() {
	this.istatus = 0;
	this.idata = [0, 0, 0];
	this.icount = 0;
	this.isysex = [];
	this.decoder = new TextDecoder("ascii");
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

		if (data == SYSEX_START) {
		    if (this.isysex.length > 0) {
			// abort sysex
		    }
		    this.isysex = [data];
		} else if (data == SYSEX_STOP) {
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

		if (this.icount == this.eventLength(this.istatus)) {
		    this.icount = 0;

		    let cmd = (this.istatus >>> 4) >>> 0;
		    let dev = 0; // unit
		    let ch = this.istatus & 0x0f;
		    if (cmd == EV_NON && this.idata[1] != 0) {
			this.onMIDIEvent({
			    cmd: cmd,
			    ch: ch,
			    note: this.idata[0],
			    velocity: EV_NOFF_DEFAULTVEL
			});
		    } else if (cmd == EV_NOFF) {
			this.onMIDIEvent({
			    cmd: cmd,
			    ch: ch,
			    note: this.idata[0],
			    velocity: EV_NOFF_DEFAULTVEL
			});
		    } else if (cmd == EV_BEND) {
			this.onMIDIEvent({
			    cmd: cmd,
			    ch: ch,
			    bend: (this.idata[1] << 7) + this.idata[0],
			    velocity: EV_NOFF_DEFAULTVEL
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
	    } else if (this.istatus == SYSEX_START) {
		this.isysex.push(data);
	    } else if (this.istatus == MIDI_QFRAME) {
		this.istatus = 0;
	    }
	}
    };

    onMIDIEvent(data) {
    }

    static volumeChangeMsg(slot, vol) {
	if (slot == MASTER) {
	    return new Uint8Array([AUCATSVC_CONTROL, SYSEX_START, SYSEX_TYPE_RT,
				   0, SYSEX_CONTROL, SYSEX_MASTER, 0, vol,
				   SYSEX_STOP]);
	} else {
	    return new Uint8Array([
		AUCATSVC_CONTROL, MIDI_CTL | slot, MIDI_CTLVOL, vol]);
	}
    }

    static dumprequest() {
	return new Uint8Array([AUCATSVC_CONTROL, SYSEX_START, SYSEX_TYPE_EDU, 0,
			       SYSEX_AUCAT, SYSEX_AUCAT_DUMPREQ, SYSEX_STOP]);
    }

    static setControllerMsg(channel, type, value) {
	return new Uint8Array([AUCATSVC_MIDI, channel, type, value]);
    }

    static programChangeMsg(channel, program) {
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

	if (data.cmd == EV_CTL) {
	    slot = data.ch;
	    volume = data.v1;
	} else if (data.length == 18 &&
		   data[0] == SYSEX_START &&
		   data[1] == SYSEX_TYPE_EDU &&
		   data[2] == SYSEX_DEV_ANY &&
		   data[3] == SYSEX_AUCAT &&
		   data[4] == SYSEX_AUCAT_SLOTDESC &&
		   data[6] == 0x00 &&
		   data[17] == SYSEX_STOP) {
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
		    description: this.decoder.decode(new Uint8Array(desc))
		}
	    });
	    document.dispatchEvent(event);
	    return;
	} else if (data.length == 8 &&
		   data[0] == SYSEX_START &&
		   data[1] == SYSEX_TYPE_RT &&
		   (data[2] == 0 || data[2] == SYSEX_DEV_ANY) &&
		   data[3] == SYSEX_CONTROL &&
		   data[4] == SYSEX_MASTER &&
		   data[5] == 0 &&
		   data[7] == SYSEX_STOP) {
	    slot = MASTER;
	    volume = data[6];
	} else {
	    //console.log("Unhandled message type:", data);
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
}

class MIDIEventProcessor extends MIDIProcessor {
    onMIDIEvent(data) {
	// if (data.cmd == EV_CTL) {
	// slot = data.ch;
	// volume = data.v1;
	//}
	if (data.cmd == EV_NON) {
	    let event = new CustomEvent("NoteOn", {
		detail: {
		    note: data.note,
		    velocity: data.velocity
		}
	    });
	    document.dispatchEvent(event);
	} else if (data.cmd == EV_NOFF) {
	    let event = new CustomEvent("NoteOff", {
		detail: {
		    note: data.note,
		    velocity: data.velocity
		}
	    });
	    document.dispatchEvent(event);
	} else {
	    console.log("Unhandled message type:", data);
	    return;
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
	    this.socket.onopen = () => {
		logError("");
	    };
	    this.socket.onmessage = evt => {
		let data = new Uint8Array(evt.data);
		if (data[0] == AUCATSVC_CONTROL) {
		    let event = new CustomEvent("MIDIControlMessage", {
			detail: data.slice(1)
		    });
		    document.dispatchEvent(event);
		} else if (data[0] == AUCATSVC_MIDI) {
		    let event = new CustomEvent("MIDIMessage", {
			detail: data.slice(1)
		    });
		    document.dispatchEvent(event);
		}
	    };
	    this.socket.onclose = () => {
		this.socket = null;
		setTimeout(() => this.open(), 1000);
		logError("connection closed. trying to reconnect...");
	    };
	    this.socket.onerror = () => {
		this.socket = null;
		logError("an error occured");
	    };
	} catch (e) {
	    logError(e);
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
};

document.addEventListener("DOMContentLoaded", function() {
    let url = "wss://" + location.host + "/aucat";
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
	    e.detail.channel, e.detail.note, e.detail.delay);
	if (!conn.send(msg)) {
	    logError("unable to turn off note");
	}
    });
    document.addEventListener("ProgramChangeRequest", e => {
	let msg = MIDIProcessor.programChangeMsg(
	    e.detail.channel, e.detail.program);
	if (!conn.send(msg)) {
	    logError("unable to change program");
	}
    });
    conn.open();
});
