var bulletin_name = null;
var bulletin_token = null;
var bulletin_key = null;

var name_changed = false;

var bulletin_base = "{{ url_for('root') }}";

/* ui options */

function customWords() {
	//console.log("custom-list");
	a = document.getElementById("custom_words");
	a.checked = true;
}

function presetWords() {
	//console.log("preset-list");
	a = document.getElementById("custom_words");
	a.value = "";
}

function testState() {
	a = document.getElementById("dry_run");
	b = document.getElementById("delivery_options");
	u = document.getElementById("bulletin_url").value;
	b.disabled = a.checked;
	if (a.checked) b.style.display = "none";
	else {
		b.style.display = "block";
		if (u == "") initName();
		messageChange();
	}
	position_all_resizers();
}

function pseudoState() {
	a = document.getElementById("default_pseudonyms");
	b = document.getElementById("custom_pseudonyms");
	b.disabled = a.checked;
	if (a.checked) b.style.display = "none";
	else b.style.display = "block";
	
	position_all_resizers();
}

function restrictState() {
	a = document.getElementById("trust_voters");
	b = document.getElementById("restrict");
	b.disabled = a.checked;
	if (a.checked) b.style.display = "none";
	else b.style.display = "block";
	position_all_resizers();
	
	/*if (pgp_worker == null) {
		pgp_worker = new Worker('/static/pgp-worker.js');
		
		pgp_worker.onmessage = function(e) {
			document.forms.create_form.use_public_key.value = e.data;
			console.log(e.data);
			console.log('OPENPGP worker finished');
		}
		
		pgp_worker.postMessage("ECC");
	}*/

}

function votingState() {
	a = document.getElementById("generic_bulletin");
	b = document.getElementById("voting");
	b.disabled = a.checked;
	if (a.checked) {
		b.style.display = "none";
	} else {
		b.style.display = "block";
		initName();
		offsetFromCurrentDateTime("start_time", 3);
		offsetFromCurrentDateTime("end_time", 8);
	}
	if (!t_changed)
		update_t = true;

	messageChange();
	position_all_resizers();
}

function linkChange() {
	//console.log("link-change");  
	name_changed = false;
	x = document.forms.create_form.elements["bulletin_link"];
	b = document.getElementById("bulletin_url");
	if (b.value == "") {
		initName();
	} else if (x.value == "name") {
		titleChange();
	}
	urlChange();
}

function urlChange() {
	//console.log("url-change");  
	b = document.getElementById("bulletin_url");
	x = document.forms.create_form.elements["bulletin_link"];
	if (x.value == "token") {
		b.value = bulletin_base + bulletin_token;
		b.disabled = true;
	} else {
		b.value = bulletin_base + bulletin_name;
		b.disabled = false;
	}
	messageChange();
}

function periodChange() {
	messageChange();
}

function titleChange() {
	//console.log("title-change");
	if (name_changed) return;

	a = document.getElementById("bulletin_title");
	e_name = document.getElementById("bulletin_name");
	const FD = new FormData();
	FD.set("name", a.value);
	fetch('/api/name', {
			method: 'POST',
			body: FD,
		})
		.then(response => response.json())
		.then(data => {
			e_name = bulletin_name = data.name;
			urlChange();
		});
}

function nameChange() {
	//console.log("name-change");
	a = document.getElementById("bulletin_title");
	b = document.getElementById("bulletin_url");
	e_name = document.getElementById("bulletin_name");
	name_changed = true;
	const FD = new FormData();
	FD.set("name", b.value.replace(bulletin_base, ""));
	fetch('/api/name', {
			method: 'POST',
			body: FD,
		})
		.then(response => response.json())
		.then(data => {
			e_name = bulletin_name = data.name;
			urlChange();
		});
}

async function initName() {
	//console.log("init-name");
	a = document.getElementById("bulletin_title");
	b = document.getElementById("bulletin_url");
	e_name = document.getElementById("bulletin_name");
	e_token = document.getElementById("bulletin_token");
	var FD = new FormData();
	FD.set("name", a.value);
	fetch('/api/token', {
			method: 'POST',
			body: FD,
		})
		.then(response => response.json())
		.then(data => {
			e_token = bulletin_token = data.token;
			e_name = bulletin_name = data.name;
			urlChange();
		});
}

/* message template manipulation */

var update_t = true;
var m_state = null;
var t_state = null;
var m_changed = false;
var t_changed = false;
var t_text = null;
var m_firstrun = true;

var t_headers = null;
var t_main = null;
var t_timeframe = null;
var t_outro = null;

function messageState() {
	s = document.forms.create_form.elements["message_source"];
	m = document.getElementById("message");
	if (s.value == "filled") {
		if (s.value == m_state) {
			messageChange();
		} else {
			if (!t_changed) {
				update_t = true;
			} else {
				t_text = m.value;
			}
			m_changed = false;
			messageChange();
		}
		m_state = s.value;
	} else { // template
		if (s.value != m_state) {
			m.value = t_text;
		}
		m_state = s.value;
	}
}

function messageTouch() {
	s = document.forms.create_form.elements["message_source"];
	if (s.value == "filled") {
		m_changed = true;
	} else {
		t_changed = true;
		console.log("template locked");
	}
}

function messageChange() {
	m = document.getElementById("message");
	s = document.forms.create_form.elements["message_source"];

	title = "${title}";
	start = "${start}";
	finish = "${finish}";
	pseudonym = "${pseudonym}";
	url = "${url}";
	voters = "${voters}";

	if (m_firstrun) {
		t_headers = `{{ _("From: Pseudovote <pseudo@infoaed.ee>
To: ${voters}
Subject: ${title}")|safe }}
`;
		t_main = `
{{ _("Your pseudonym for voting is:

* ${pseudonym}

Submit your vote at the public bulletin board:

* ${url}")|safe }}
`;
		t_timeframe = `
{{ _("Voting starts at ${start} and closes at ${finish}.")|safe }}
`;
		t_outro = `
{{ _("Guidelines in nutshell:

* To cast your vote, please write your pseudonym and your choice into designated fields and submit ballot to server.
* You can fill the ballot manually or use predefined choices in user interface to prefill and then review.
* To preserve privacy of your vote do not publicly relate your pseudonym with your person nor disclose it to anyone.

Happy voting!

Sincereley \"etc\"
Pseudovote")|safe }}`;
	}

	if (update_t && !t_changed) {
		t_text = t_headers + t_main + (!document.getElementById("generic_bulletin").checked ? t_timeframe : "") + t_outro;
		update_t = false;
	}

	if (s.value == "filled") {
		if (!m_changed) {
			title = document.getElementById("bulletin_title").value;
			start = new Date(document.getElementById("start_time").value).toLocaleString();
			finish = new Date(document.getElementById("end_time").value).toLocaleString();
			start = start.slice(0, start.length - 3);
			finish = finish.slice(0, finish.length - 3);
			if (document.forms.create_form.personal_ballot.checked) {
				url = document.getElementById("bulletin_url").value + "/" + "${pseudonym}";
			} else {
				url = document.getElementById("bulletin_url").value;
			}
			//pseudonym = '{{ _("pseudonym567") }}';
			v = document.getElementById("voters").value;
			at_count = (v.match(/@/g) || '').length;
			nl_count = (v.match(/\n/g) || '').length;
			if (nl_count > 1 && nl_count > 1) {
				sv = v.split('\n', 1);
				count = at_count - 1;
				voters = '/' + sv[0] + ` {{ _("and ${count} more voters") }}/`;
			} else voters = '/{{ _("add list of e-mails above!") }}/';
			m.value = eval("`" + t_text + "`");
		}

	} else {
		if (!t_changed) {
			m.value = t_text;
		}
	}

	if (m_firstrun) {
		m.rows = (m.value.match(/\n/g) || '').length + 1;
		m_firstrun = false;
	}

	return true;
}

/* generic plus some time calculations */

function currentTimeStamp() {
	var m = new Date();

	return m.toLocaleString();
}

function offsetFromCurrentDateTime(datetime_field_id, offset_minutes) {
	var now = new Date();
	now.setMinutes(now.getMinutes() + offset_minutes);
	// var utcString = now.toISOString().substring(0,19);
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var hour = now.getHours();
	var minute = now.getMinutes();
	// var second = now.getSeconds();
	var localDatetime = year + "-" +
		(month < 10 ? "0" + month.toString() : month) + "-" +
		(day < 10 ? "0" + day.toString() : day) + "T" +
		(hour < 10 ? "0" + hour.toString() : hour) + ":" +
		(minute < 10 ? "0" + minute.toString() : minute);
	// + utcString.substring(16,19);
	var datetimeField = document.getElementById(datetime_field_id);
	datetimeField.value = localDatetime;
}

function choices_to_dict(title, choices, min = 0, max = 1, ordered = false) {
	var oc = {};
	if (choices.length > 0)
		oc = {
			'title': title,
			'min': min,
			'max': max,
			'choices': choices,
			'ordered': ordered
		};

	return oc;
}

function status_message(text, css_class, title, loading, nobr) {
	if (title == null) {
		title = `{{ _("Server response") }}`;
	}
	if (loading == null) loading = true;
	status_message_common(text, css_class, title, false, loading, nobr);
}

/* main logic in init function */

var pgp_worker = null;

var create_form = null;
var json_button = null;
var update_button = null;
var add_button = null;

var footer = null;
var session_ended = false;

var source = null;

function init() {
	//console.log("init-start");

	init_darkmode();

	//votingState();
	//pseudoState();
	//initName();

	document.getElementById("generic_bulletin").checked = true;
	document.getElementById("default_pseudonyms").checked = true;
	document.getElementById("trust_voters").checked = true;
	document.getElementById("dry_run").checked = true;

	create_form = document.getElementById("create_form");

	response_area = document.getElementById("response_fs");
	response_status = document.getElementById("response");
	response_title = document.getElementById("response_title");
	footer = done_area = document.getElementById("footer");

	json_button = document.getElementById("json_editor");
	update_button = document.getElementById("uuenda");
	add_button = document.getElementById("append_to_json");

	json_choices = document.getElementById("json_choices");
	
	use_public_key = document.getElementById("use_public_key");

	var v = document.getElementById("voters");

	use_bottom_edge(v);
	use_bottom_edge(document.getElementById("choices"));
	use_bottom_edge(document.getElementById("custom_text"));
	use_bottom_edge(document.getElementById("message"));
	use_bottom_edge(json_choices);
	use_bottom_edge(use_public_key);

	v.ondrop = function(e) {
		e.preventDefault();

		var file = e.dataTransfer.files[0],
			reader = new FileReader();
		reader.onload = function(event) {
			console.log(event.target);
			v.value = event.target.result;
		};
		console.log(file);
		reader.readAsText(file);

		return false;
	};

	document.forms.create_form.provide_voterlist.onchange = function(e) {
		let udu = document.forms.create_form;
		udu.limit_unlisted.disabled = udu.reject_unlisted.disabled = !udu.provide_voterlist.checked;
		udu.mute_unlisted.disabled = udu.block_unlisted.disabled = !(udu.provide_voterlist.checked && udu.personal_ballot.checked);
	};

	document.forms.create_form.limit_choices.onchange = function(e) {
		let udu = document.forms.create_form;
		//udu.reject_malformed.disabled = !(udu.limit_choices.checked);
	};

	document.forms.create_form.personal_ballot.onchange = function(e) {
		let udu = document.forms.create_form;
		udu.mute_unlisted.disabled = udu.block_unlisted.disabled = !(udu.provide_voterlist.checked && udu.personal_ballot.checked);
	};

	document.forms.create_form.pseudonym_type[0].onchange = function(e) {
		document.forms.create_form.salt_amount.disabled = (document.forms.create_form.pseudonym_type.value == "pseudonyms");
	};

	document.forms.create_form.pseudonym_type[1].onchange = function(e) {
		document.forms.create_form.salt_amount.disabled = (document.forms.create_form.pseudonym_type.value == "pseudonyms");
	};
	
	document.forms.create_form.encrypt_voterlist.onchange = function(e) {
		let udu = document.forms.create_form;
		udu.use_public_key.style.display = udu.encrypt_voterlist.checked ? "block" : "none" ;
		position_all_resizers();
	};

	json_button.onclick = function(e) {
		if (json_choices.style.display == "none") {
			json_choices.style.display = "block";
			json_choices.disabled = false;
			json_button.value = "▲ JSON";
			if (json_choices.value.trim().length == 0) {
				var choices = create_form.choices.value.trim().split(/\r?\n/);
				var title = create_form.elements['bulletin_title'].value.trim();
				json_choices.value = JSON.stringify([choices_to_dict(title, choices)], undefined, 2);
			}
		} else {
			json_choices.disabled = true;
			json_choices.style.display = "none";
			json_button.value = "▼ JSON";
		}
		add_button.disabled = json_choices.disabled;
		update_button.disabled = json_choices.disabled;
		position_all_resizers();
	};

	update_button.onclick = function(e) {
		var choices = create_form.choices.value.trim().split(/\r?\n/);
		console.log(create_form.choices.value.trim());
		console.log(choices);
		var title = create_form.elements['bulletin_title'].value.trim();
		json_choices.value = JSON.stringify([choices_to_dict(title, choices)], undefined, 2);
	};

	add_button.onclick = function(e) {
		var choices = create_form.choices.value.trim().split(/\r?\n/);
		var title = create_form.elements['bulletin_title'].value.trim();
		if (json_choices.value.trim().length != 0) {
			json = JSON.parse(json_choices.value.trim());
			json.push(choices_to_dict(title, choices));
			json_choices.value = JSON.stringify(json, undefined, 2);
		} else {
			json_choices.value = JSON.stringify([choices_to_dict(title, choices)], undefined, 2);
		}
	};


	create_form.onsubmit = function(e) {
		e.preventDefault();

		bulletin_url = document.getElementById("bulletin_url").value;

		g = document.getElementById("generic_bulletin");
		s = document.getElementById("submit");
		m = document.getElementById("message");
		freeze = document.getElementById("freeze");

		var FD = new FormData(create_form);

		FD.set("bulletin_token", bulletin_token);
		FD.set("bulletin_url", bulletin_url);
		if (!g.checked) {
			FD.set("start_time", new Date(FD.get("start_time")).toISOString());
			FD.set("end_time", new Date(FD.get("end_time")).toISOString());
		}
		x = document.forms.create_form.elements["bulletin_link"];
		if (x.value == "name") {
			FD.set("bulletin_name", bulletin_name);
		}

		var choices_json = create_form.json_choices;
		var choices = create_form.choices.value.trim().split(/\r?\n/);
		var title = create_form.elements['bulletin_title'].value.trim();
		if (g.checked) {
			cjson = JSON.stringify([]);
			FD.set("choices", cjson);
		} else if (choices_json.disabled) {
			if (create_form.choices.value.trim().length == 0) {
				FD.set("choices", JSON.stringify([]));
			} else {
				cjson = JSON.stringify([choices_to_dict(title, choices)]);
				FD.set("choices", cjson);
			}
		} else {
			FD.delete("json_choices");
			FD.set("choices", JSON.stringify(JSON.parse(choices_json.value)));
		}
		FD.set("bulletin_title", title);
		FD.set("message", m.value);

		source = new SSE('/api/create' + (bulletin_token == null ? "" : "/" + bulletin_token), {
			payload: FD
		});

		s = document.getElementById("submit");
		m = document.getElementById("message");
		run_area = document.getElementById("run_area");
		freeze = document.getElementById("freeze");

		s.value = '{{ _("Bulletin board initialized...") }}';
		s.disabled = true;
		m.disabled = true;
		disableElements(freeze.children, true, ignore = [footer, response_area]);
		status_message('{{ _("Session started") }} ' + currentTimeStamp() + "<br/>");

		footer.scrollIntoView();

		source.onmessage = function(evt) {
			const raw = evt.data;
			
			//console.log(raw);

			if (!raw.startsWith("{")) {

				//console.log(raw);

			} else {

				const json = JSON.parse(raw);
				if (!("state" in json && "data" in json)) {
					status_message(JSON.stringify(json));
					return;
				}

				const data = json.data;

				const state = json.state;
				const STATE = state.toUpperCase();

				if (state == "init") {
					status_message(`${STATE}: ${data.token} ${new Date(data.timestamp).toLocaleString()}`);

				} else if (state == "create") {
					status_message(`${STATE}: <a class="lucky" target="_blank" href="${data.bulletin_url}">${data.bulletin_url}</a> (${data.voter_count}/${data.choices_count})`);
					
					source.updateURL('/api/audit/' + data.bulletin_token);

				} else if (state == "deliver") {
					if (data.dry_run) {
						status_message(`${STATE}: ${data.voter_count} voters in "dry run"`);
					} else {
						status_message(`${STATE}: ${data.voter_count} voters`);
					}

				} else if (state == "provide-voterlist") {
					status_message(`${STATE}: ${'public_key' in data ? 'gpg-pub ' + data.public_key: ''} ${'hash_type' in data ? 'hash ' + data.hash_type: ''}`);
					
				} else if (state == "audit") {
					status_message(`${STATE}: ${data.voter_count} voters, ${data.ballot_count} ballots${'pgp_id' in data ? ' (' + data.pgp_id + ')': ''}`);

				} else if (state == "deliver-pseudonym") {
					status_message(`* ${data.recipient}`);

				} else if (state == "audit-pseudonym") {
					status_message(`* ${data.pseudonym}`);

				} else if (state == "open") {
					status_message(`${STATE}: started at ${new Date(data.timestamp).toLocaleString()}`);

				} else if (state == "wait-start") {
					status_message(`${STATE}: ${Math.round(data.wait)}s to ${new Date(data.start).toLocaleString()}`);

				} else if (state == "wait-end") {
					status_message(`${STATE}: ${Math.round(data.wait)}s to ${new Date(data.finish).toLocaleString()}`);

				} else if (state == "join-feed") {
					status_message(`${STATE}: <a class="lucky" target="_blank" href="${data.bulletin_url}">${data.bulletin_url}</a> (${data.voter_count}/${data.choices_count})`);

				} else if (state == "end") {
					status_message(`${STATE}: finished at ${new Date(data.timestamp).toLocaleString()}`);

				} else if (state == "disconnect") {
					status_message(`${STATE}: at ${new Date(data.timestamp).toLocaleString()}`, null, null, false);

					session_ended = true;
					source.close();

					status_message("<br/>" + `{{ _("Thank you for taking digital democracy seriously!") }}`, null, null, false);

				} else if (state == "error") {
					status_message(`${STATE}: ${JSON.stringify(data)}`, null, null, false);

					session_ended = true;
					source.close();
					
					status_message("<br/>" + `{{ _("Better luck next time!") }}`, null, null, false);

				} else {
					status_message(`${STATE}: ${JSON.stringify(data)}`);

				}
			}
		}; // onMessage

		source.onerror = function(e) {
			
			if (e.readyState == EventSource.CONNECTING) {
				if (!!e.prevReadyState) status_message(`RECONNECTING: ${e.source.url}`);	
							
			} else if (e.readyState == EventSource.OPEN) {
				//status_message(`OPEN: ${e.source.url} after ${e.connectCount} retries`);
				
			} else if (!session_ended && e.readyState == EventSource.CLOSED) {
				status_message(`DISCONNECT: failed ${e.source.url} after ${e.connectCount} retries`, null, null, false);
				status_message("<br/>" + `{{ _("Better luck next time!") }}`, null, null, false);
				
			}
		}; // onError

		source.stream();

	}; // onSubmit


	// console.log("init-done");
}
