/* internationalisation aka i18n */

function _(text) {
	return text;
}

/* light/dark switching */

let dark_mode = false;

function toggle_dark() {
	document.body.classList.toggle("dark-mode");
	dark_mode = document.body.classList.contains("dark-mode");
	document.documentElement.style.colorScheme = dark_mode ? "dark" : "light";
	toggleChildren(document.body.children);
}

function toggleChildren(elements) {
	for (const e of elements) {
		if (dark_mode && !e.classList.contains("dark-mode"))
			e.classList.toggle("dark-mode");
		if (!dark_mode && e.classList.contains("dark-mode"))
			e.classList.toggle("dark-mode");

		toggleChildren(e.children);
	}
}

function init_darkmode() {
	if (document.documentElement.style.colorScheme == null) {
		document.styleSheets[0].insertRule('.dark-mode { color: white; background-color: #121212; }', 0);
	}

	if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
		// console.log("dark-by-default");
		toggle_dark();
	}

	let toggle = document.getElementById("toggle");
	toggle.innerHTML = "◑";
	toggle.style.display = "block";
}

/* status message composition */

let response_area = null;
let response_status = null;
let response_title = null;
let done_area = null;

function status_message_common(text, css_class, title, force_title, loading, nobr) {
  if (force_title || response_title.innerHTML.trim().length == 0 ) {
    response_title.innerHTML = (title == null ? "" : title);
  }
  if (loading && !response_status.classList.contains("loading")) response_status.classList.toggle("loading");
  if (!loading && response_status.classList.contains("loading")) response_status.classList.toggle("loading");
  if (response_area.style.display != "block") {
    response_area.style.display = "block";
    done_area.scrollIntoView();
  }
  if (css_class == null) {
    response_status.innerHTML += `<span>${text}</span>`;
  } else {
    response_status.innerHTML += `<span class="${css_class}">${text}</span>`;
  }
  if (nobr == null || nobr == false) {
    response_status.innerHTML += `<br/>`;

  }
}

/* disable after submit */

function disableElements(elements, disabled = true, ignore = []) {
	for (const e of elements) {
		if (ignore.includes(e)) continue;
		if (!disabled && e.disabled)
			e.removeAttribute("disabled");
		else if (!e.disabled)
			e.disabled = disabled;

		disableElements(e.children, disabled, ignore);
	}
}

/* textarea draggable by bottom edge */

let mouseup_listener = null;
let mousemove_listener = null;
let onresize_listener = null;

let initial_y_ergo_resizing = null;
let initial_height = null;
let adjust_bar = null;
let adjust_edges = null;

function use_bottom_edge(target_ta) {
	let resize = document.createElement("SPAN");
	resize.classList.add("resize");
	target_ta.parentNode.insertBefore(resize, target_ta.nextSibling);
	target_ta.classList.add("resizeTarget");
	target_ta.style.resize = "vertical";
	resize.addEventListener('mousedown', resize_onmousedown);
	resize.addEventListener('pointerdown', resize_onpointerdown);

	if (mouseup_listener == null)
		document.addEventListener('mouseup', mouseup_listener = resize_onmouseup);
	if (mousemove_listener == null)
		document.addEventListener('mousemove', mousemove_listener = resize_onmousemove);
	if (onresize_listener == null)
		window.addEventListener('resize', onresize_listener = position_all_resizers);

	if (adjust_bar == null) {
		adjust_bar = resize.getBoundingClientRect().height / 2;
		let cs = getComputedStyle(target_ta);
		adjust_edges = (parseFloat(cs.getPropertyValue('margin-bottom')) || 1) + (parseFloat(cs.getPropertyValue('border-bottom')) || 1); // + (parseFloat(cs.getPropertyValue('padding-bottom')) || 1);
	}

	if (resize.offsetParent != null) {
		resize.style.top = target_ta.offsetTop + target_ta.getBoundingClientRect().height - adjust_bar + 'px';
	} else {
		resize.style.display = "none";
	}
}

function resize_onmousedown(e) {
	e.preventDefault();
	let target_ta = e.target.previousSibling;
	initial_y_ergo_resizing = e.pageY;
	initial_height = target_ta.getBoundingClientRect().height;
}

function resize_onpointerdown(e) {
	e.target.setPointerCapture(e.pointerId);
}

function resize_onmousemove(e) {
	if (initial_y_ergo_resizing != null) {
		e.preventDefault();
		let resize = e.target;
		target_ta = resize.previousSibling;
		let current_height = initial_height + e.pageY - initial_y_ergo_resizing - 2 * adjust_edges;
		if (current_height > 20) {
			target_ta.style.height = current_height + "px";
			resize.style.top = target_ta.offsetTop + target_ta.getBoundingClientRect().height - adjust_bar + 'px';
		}
	}
}

function resize_onmouseup(e) {
	if (e.target.classList.contains("resize")) {
		e.preventDefault();
		initial_y_ergo_resizing = null;
	} else if (e.target.classList.contains("resizeTarget")) {
		position_all_resizers();
	}
}

function position_all_resizers() {
	let resize_lmn = document.getElementsByClassName("resize");
	for (const resize of resize_lmn) {
		let target_ta = resize.previousSibling;
		if (target_ta.offsetParent != null) {
			resize.style.top = target_ta.offsetTop + target_ta.getBoundingClientRect().height - adjust_bar + 'px';
			resize.style.display = "block";
		} else {
			resize.style.display = "none";
		}
	}
}