function success(resp) {
    var res, content, div, range, label;
    try {
	res = JSON.parse(resp);
    } catch (error) {
	return;
    }
    content = document.getElementById('content');
    res["chans"].forEach(function (v) {
	range = document.getElementById(v['chan']);
	if (range === null) {
	    range = document.createElement('input');
	    range.id = v['chan'];
	    range.type = 'range';
	    range.min = 0;
	    range.max = 127;
	    range.step = 1;
	    range.onchange = refresh;
	    label = document.createElement('label');
	    label.htmlFor = range.id;
	    label.appendChild(document.createTextNode(v['chan']));
	    div = document.createElement('div');
	    div.appendChild(label);
	    div.appendChild(range);
	    content.appendChild(div);
	}
	range.value = v['vol'];
    });
}

function refresh() {
    var xmh = new XMLHttpRequest();
    xmh.onreadystatechange = function() {
	if (xmh.readyState == 4 && xmh.status == 200) {
	    success(xmh.responseText);
	}
    };
    if (this.id && this.value) {
	xmh.open('POST', '/aucat', true);
	xmh.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xmh.send("chan=" + this.id + "&vol=" + this.value);
    } else {
	xmh.open('GET', '/aucat', true);
	xmh.send(null);
    }
}

document.addEventListener('DOMContentLoaded', refresh);
