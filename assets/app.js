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

const INSTRUMENTS = {
    'Piano': ['1 Acoustic Grand Piano', '2 Bright Acoustic Piano',
	      '3 Electric Grand Piano', '4 Honky-tonk Piano',
	      '5 Electric Piano 1', '6 Electric Piano 2',
	      '7 Harpsichord', '8 Clavinet'],
    'Chromatic Percussion': ['9 Celesta', '10 Glockenspiel', '11 Music Box',
			     '12 Vibraphone', '13 Marimba', '14 Xylophone',
			     '15 Tubular Bells', '16 Dulcimer'],
    'Organ': ['17 Drawbar Organ', '18 Percussive Organ', '19 Rock Organ',
	      '20 Church Organ', '21 Reed Organ', '22 Accordion',
	      '23 Harmonica', '24 Tango Accordion'],
    'Guitar': ['25 Acoustic Guitar (nylon)', '26 Acoustic Guitar (steel)',
	       '27 Electric Guitar (jazz)', '28 Electric Guitar (clean)',
	       '29 Electric Guitar (muted)', '30 Overdriven Guitar',
	       '31 Distortion Guitar', '32 Guitar Harmonics'],
    'Bass': ['33 Acoustic Bass', '34 Electric Bass (finger)',
	     '35 Electric Bass (pick)', '36 Fretless Bass', '37 Slap Bass 1',
	     '38 Slap Bass 2', '39 Synth Bass 1', '40 Synth Bass 2'],
    'Strings': ['41 Violin', '42 Viola', '43 Cello', '44 Contrabass',
		'45 Tremolo Strings', '46 Pizzicato Strings',
		'47 Orchestral Harp', '48 Timpani'],
    'Ensemble': ['49 String Ensemble 1', '50 String Ensemble 2',
		 '51 Synth Strings 1', '52 Synth Strings 2', '53 Choir Aahs',
		 '54 Voice Oohs', '55 Synth Choir', '56 Orchestra Hit'],
    'Brass': ['57 Trumpet', '58 Trombone', '59 Tuba', '60 Muted Trumpet',
	      '61 French Horn', '62 Brass Section', '63 Synth Brass 1',
	      '64 Synth Brass 2'],
    'Reed': ['65 Soprano Sax', '66 Alto Sax', '67 Tenor Sax', '68 Baritone Sax',
	     '69 Oboe', '70 English Horn', '71 Bassoon', '72 Clarinet'],
    'Pipe': ['73 Piccolo', '74 Flute', '75 Recorder', '76 Pan Flute',
	     '77 Blown Bottle', '78 Shakuhachi', '79 Whistle', '80 Ocarina'],
    'Synth Lead': ['81 Lead 1 (square)', '82 Lead 2 (sawtooth)',
		   '83 Lead 3 (calliope)', '84 Lead 4 (chiff)',
		   '85 Lead 5 (charang)', '86 Lead 6 (voice)',
		   '87 Lead 7 (fifths)', '88 Lead 8 (bass + lead)'],
    'Synth Pad': ['89 Pad 1 (new age)', '90 Pad 2 (warm)',
		  '91 Pad 3 (polysynth)', '92 Pad 4 (choir)',
		  '93 Pad 5 (bowed)', '94 Pad 6 (metallic)',
		  '95 Pad 7 (halo)', '96 Pad 8 (sweep)'],
    'Synth Effects': ['97 FX 1 (rain)', '98 FX 2 (soundtrack)',
		      '99 FX 3 (crystal)', '100 FX 4 (atmosphere)',
		      '101 FX 5 (brightness)', '102 FX 6 (goblins)',
		      '103 FX 7 (echoes)', '104 FX 8 (sci-fi)'],
    'Ethnic': ['105 Sitar', '106 Banjo', '107 Shamisen', '108 Koto',
	       '109 Kalimba', '110 Bagpipe', '111 Fiddle', '112 Shanai'],
    'Percussive': ['113 Tinkle Bell', '114 Agogo', '115 Steel Drums',
		   '116 Woodblock', '117 Taiko Drum',
		   '118 Melodic Tom', '119 Synth Drum'],
    'Sound effects': ['120 Reverse Cymbal', '121 Guitar Fret Noise',
		      '122 Breath Noise', '123 Seashore', '124 Bird Tweet',
		      '125 Telephone Ring', '126 Helicopter', '127 Applause',
		      '128 Gunshot']
}

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

const SYSEX_AUCATSVC = 0x24;
const SYSEX_AUCATSVC_MIXERVOL = 0x01;

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

const MIXER = -2;
const MASTER = -1;

function logError(msg) {
    console.log(msg);
    let e = document.getElementById("error");
    if (e) {
	e.innerText = msg;
    }
}

class VolumeControls {
    constructor(connection) {
	this.connection = connection;
	let ctls = document.createElement("div");
	this.element = ctls;
	ctls.classList = "volume-controls";

	for (let slot = -2; slot < 8; slot++) {
	    let ctl = this.makeVolumeControl(slot);
	    ctls.appendChild(ctl);
	}

	let buttonGroup = document.createElement("div");
	buttonGroup.classList = "button-group";

	let muteButton = document.createElement("button");
	muteButton.innerText = "Mute all";

	let maxButton = document.createElement("button");
	maxButton.innerText = "Max all";

	let noteOnButton = document.createElement("button");
	noteOnButton.innerText = "ON";
	let noteOffButton = document.createElement("button");
	noteOffButton.innerText = "OFF";

	buttonGroup.appendChild(muteButton);
	buttonGroup.appendChild(maxButton);
	buttonGroup.appendChild(noteOnButton);
	buttonGroup.appendChild(noteOffButton);

	ctls.appendChild(buttonGroup);

	muteButton.addEventListener("click", e => {
	    // Exclude virtual mixer slot
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
	    // Exclude virtual mixer slot
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

	noteOnButton.addEventListener("click", e => {
	    let event = new CustomEvent("NoteOnRequest", {
		detail: {
		    channel: 4,
		    note: 50,
		    velocity: 100
		}
	    });
	    document.dispatchEvent(event);
	});
	noteOffButton.addEventListener("click", e => {
	    let event = new CustomEvent("NoteOffRequest", {
		detail: {
		    channel: 4,
		    note: 50,
		    velocity: 100
		}
	    });
	    document.dispatchEvent(event);
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
	if (slot == MIXER) {
	    name = "mixer";
	} else if (slot == MASTER) {
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

    getSlotElement(slot, child) {
	if (slot == MIXER) {
	    name = "mixer";
	} else if (slot == MASTER) {
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

class MIDIProcessor {
    constructor(eventChannel) {
	this.istatus = 0;
	this.idata = [0, 0, 0];
	this.icount = 0;
	this.isysex = [];
	this.decoder = new TextDecoder("ascii");

	document.addEventListener(eventChannel, (e) => {
	    this.process(e.detail)
	});
    }

    eventLength(status) {
	const evlen = [2, 2, 2, 2, 1, 1, 2, 0];
	return evlen[(status >> 4) & 7];
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

		    let cmd = this.istatus >> 4;
		    let dev = 0; // unit
		    let ch = this.istatus & 0x0f;
		    if (cmd == EV_NON && this.idata[1] != 0) {
			this.onMIDIEvent({
			    cmd: EV_NOFF,
			    ch: ch,
			    note_num: this.idata[0],
			    note_vel: EV_NOFF_DEFAULTVEL
			});
		    } else if (cmd == EV_BEND) {
			this.onMIDIEvent({
			    cmd: EV_NOFF,
			    ch: ch,
			    bend_val: (this.idata[1] << 7) + this.idata[0],
			    note_vel: EV_NOFF_DEFAULTVEL
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
	    return new Uint8Array([SYSEX_START, SYSEX_TYPE_RT, 0,
				   SYSEX_CONTROL, SYSEX_MASTER, 0, vol, SYSEX_STOP]);
	} else if (slot == MIXER) {
	    return new Uint8Array([SYSEX_START, SYSEX_TYPE_EDU, 0,
				   SYSEX_AUCATSVC, SYSEX_AUCATSVC_MIXERVOL,
				   vol, SYSEX_STOP]);
	} else {
	    return new Uint8Array([MIDI_CTL | slot, MIDI_CTLVOL, vol]);
	}
    }

    static dumprequest() {
	return new Uint8Array([SYSEX_START, SYSEX_TYPE_EDU, 0, SYSEX_AUCAT,
			       SYSEX_AUCAT_DUMPREQ, SYSEX_STOP]);
    }
    
    static setControllerMsg(channel, type, value) {
	return new Uint8Array([channel, type, value]);
    }

    static programChangeMsg(channel, program) {
        return new Uint8Array([0xC0 + channel, program]);
    }

    static pitchBendMsg(channel, program) {
        return new Uint8Array([0xE0 + channel, program]);
    }

    static noteOnMsg(channel, note, velocity) {
        return new Uint8Array([0x90 + channel, note, velocity]);
    }

    static noteOffMsg(channel, note, delay) {
        return new Uint8Array([0x80 + channel, note, 0]);
    }

    // static chordOn(channel, chord, velocity) {
    //     for (var n = 0; n < chord.length; n ++) {
    //         var note = chord[n];
    //         output.send([0x90 + channel, note, velocity], delay * 1000);
    //     }
    // }

    // static chordOff = function(channel, chord, delay) {
    //     for (var n = 0; n < chord.length; n ++) {
    //         var note = chord[n];
    //         output.send([0x80 + channel, note, 0], delay * 1000);
    //     }
    // }
}

class MIDIControlProcessor extends MIDIProcessor {
    constructor(conn) {
	super("MIDIControlMessage");
    }

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
	} else if (data.length == 7 &&
		   data[0] == SYSEX_START &&
		   data[1] == SYSEX_TYPE_EDU &&
		   data[2] == 0 &&
		   data[3] == SYSEX_AUCATSVC &&
		   data[4] == SYSEX_AUCATSVC_MIXERVOL &&
		   data[6] == SYSEX_STOP) {
	    slot = MIXER;
	    volume = data[5];
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

class Connection {
    constructor(eventChannel, url) {
	this.socket = null;
	this.url = url;
	this.eventChannel = eventChannel;
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
		let event = new CustomEvent(this.eventChannel, {
		    detail: data
		});
		document.dispatchEvent(event);
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


var conn;

document.addEventListener("DOMContentLoaded", function() {
    let ctlconn = new Connection("MIDIControlMessage", "wss://thor:8888/aucat");
    conn = new Connection("MIDIMessage", "wss://thor:8888/midi");
    let midi = new MIDIControlProcessor();
    let ctls = new VolumeControls();
    let app = document.getElementById("app");
    app.appendChild(ctls.element);

    document.addEventListener("VolumeChangeRequest", e => {
	let msg = MIDIProcessor.volumeChangeMsg(
	    e.detail.slot, e.detail.volume);
	if (!ctlconn.send(msg)) {
	    logError("unable to send message");
	}
    });
    document.addEventListener("NoteOnRequest", e => {
	let msg = MIDIProcessor.noteOnMsg(
	    e.detail.channel, e.detail.note, e.detail.velocity);
	if (!conn.send(msg)) {
	    logError("unable to send message");
	}
    });
    document.addEventListener("NoteOffRequest", e => {
	let msg = MIDIProcessor.noteOffMsg(
	    e.detail.channel, e.detail.note, e.detail.velocity);
	if (!conn.send(msg)) {
	    logError("unable to send message");
	}
    });
    ctlconn.open();
    conn.open();
});