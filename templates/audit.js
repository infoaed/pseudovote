var source = null;
var footer = null;
var session_ended = false;

function currentTimeStamp() {
	var m = new Date();

	return m.toLocaleString();
}

function status_message(text, css_class, title, loading, nobr) {
	if (title == null) {
		title = `{{ _("Server response") }}`;
	}
	if (loading == null) loading = true;
	status_message_common(text, css_class, title, false, loading, nobr);
}

function init() {
	//console.log("init-start");

	init_darkmode();

	//votingState();
	//pseudoState();
	//initName();

	response_area = document.getElementById("response_fs");
	response_status = document.getElementById("response");
	response_title = document.getElementById("response_title");
	footer = done_area = document.getElementById("footer");
    
    status_message('{{ _("Session started") }} ' + currentTimeStamp() + "<br/>");

        source = new SSE('/api/audit/' + bulletin_token);

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

	// console.log("init-done");
}