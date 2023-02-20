var votesform = null;
var votesIncoming = null;
var submit = null;
var content = null;
var message = null;
var choices_helper = null;
var countdown = null;
var countdownTarget = null;
var waitText = null;
var waitTextClass = null;
var successText = null;
var successTextClass = null;

var bulletin_ended = false;

/* polling start/end countdown */

function setCountDown(wt, wtclass, st, stclass, target) {
  countdownTarget = new Date(target);
  waitText = wt;
  waitTextClass = wtclass;
  successText = st;
  successTextClass = stclass;
  
  setTimeout(countDownTimer);
}

function pad(n) {
  return (n < 10 ? "0" + n : n);
}
    
function countDownTimer() {
  let now = new Date();
  if (countdownTarget > now) {

    var distance = countdownTarget - now;

    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    var text = "";
          
    if (days >= 1) {
      text = days + " " + '{{ _("days") }}';
    } else if (days > 0) {
      text = hours + " " + '{{ _("hours") }}';
    } else if (hours > 0) {
      text = hours + ":" + pad(minutes) + ":" + pad(seconds);
    } else if (minutes > 0) {
      text = minutes + ":" + pad(seconds);
    } else {
      text = seconds + " " + '{{ _("seconds") }}';
    }

    countdown.innerHTML = `<span class="${dark_mode ? 'dark-mode ': ''}${waitTextClass}">${waitText}${text}</span>`;
    setTimeout(countDownTimer, 1000);
  } else {
    
    countdown.innerHTML = `<span class="${dark_mode ? 'dark-mode ': ''}${successTextClass}">${successText}</span>`;
    
  }
}

/* ballot prefill options */

let choices_are_valid = false;
let valid_choices = null;

function fillBallot () {
  let v = document.getElementsByClassName("choice");
  
  let ballot="";
  
  if (valid_choices == null) {
    valid_choices = Array(v.length);
  }
  
  for (let i = 0; i < v.length; i++) {
    
    if (v.length > 1) {
      if (ballot.length != 0) ballot +="; ";
    }
    
    let c = v[i].getElementsByTagName("INPUT");
    
    ordered = v[i].dataset.ordered;
    min = v[i].dataset.min;
    max = v[i].dataset.max;
    
    var line = "";
    
    let check_count = 0;
    for (var j = 0; j < c.length; j++) {      
      let input = c[j];
      
      if (input.checked == true) {
        if (line.length != 0) line +=", ";
        if (ordered == "true") line += (j+1) + ") ";
        line += input.value;
        check_count++;
      } else {
        if (ordered == true) break;
      }
    }
    
    valid_choices[i] = check_count >= min && check_count <= max;
    
    if (v.length > 1) {
      if (line.length == 0) line = (i+1) + ".";
      else line = (i+1) + ". " + line;
    }
                    
    ballot += line;
  }
  
  choices_are_valid = !valid_choices.includes(false);
  
  document.vote_form.content.value = ballot;
  enableSubmit();
}

function enumerateCheckBoxes(rad, list) {
  document.vote_form.content.value="";

  for (var i = 0; i < rad.length; i++) {
    if (rad[i].checked){
      list.children[i].value = i+1;
      if (document.vote_form.content.value.length > 0) document.vote_form.content.value += ", ";
      document.vote_form.content.value += list.children[i].value + ") " + rad[i].value;
    }
  }
}

/* drag and drop for ballot prefill */

var dragging = null;

document.addEventListener('drag', function(e) {
  e.target.style.opacity = '0.0';
});

document.addEventListener('dragstart', function(e) {
    dragging = getLI(e.target);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData('text/plain', null);

});

function isBefore(el1, el2) {
  var cur;
  if (el2.parentNode === el1.parentNode) {
    for (cur = el1.previousSibling; cur; cur = cur.previousSibling) {
      if (cur === el2) return true;
    }
  }
  return false;
}

document.addEventListener('dragover', function(e) {
    e.preventDefault();
    
    if (e.target.draggable && dragging.parentNode === e.target.parentNode){
      if (isBefore(dragging, e.target)) {
        e.target.parentNode.insertBefore(dragging, e.target);
      } else {
        e.target.parentNode.insertBefore(dragging, e.target.nextSibling);
      }
    }
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
    
    dragging.style.opacity = '1.0';
    var list = dragging.parentNode;
    var rad = list.getElementsByTagName('input');
    
    enumerateCheckBoxes(rad, list);
    fillBallot();
});

function getLI(t) {
  while( t.nodeName.toLowerCase() != 'li' && t.nodeName.toLowerCase() != 'body' ) {
    t = t.parentNode;
  }
  if (t.nodeName.toLowerCase() == 'body') {
    return false;
  }
  return t;
}


/* generic */

function enableSubmit() {
  let submit = document.getElementById("submit");
  let pseudonym = document.getElementById("pseudonym");
  
  if (pseudonym.value.length == 0) {
    submit.disabled = true;
  } else {
    if (limit_choices) {
      submit.disabled = !choices_are_valid;
    } else {
      submit.disabled = false;
    }
  }
}

function scrollVotesToEnd() {
  if (!votesIncoming.contains(document.activeElement)) {
    votesIncoming.scrollTop = votesIncoming.scrollHeight;
  }
}


function status_message(text, css_class, title, force_title) {
  if (title == null) {
    title = `{{ _("Server response") }}`;
  }
  status_message_common(text, css_class, title, force_title);
}

/* main logic in init function */

function init(){
  // console.log("init-start");
  
  init_darkmode();
  
  choices_helper = document.getElementById("choices_helper");
  disableElements(choices_helper.children, false);
  
  votesIncoming = document.getElementById("votes");
  use_bottom_edge(votesIncoming);
  content = document.getElementById("content");
  use_bottom_edge(content);
  
  noscript_client = document.getElementById("noscript_client");
  if (noscript_client) {
    noscript_client.value=false;
    noscript_client.disabled=true;
  }
  
  response_area = document.getElementById("response_fs");
  response_status = document.getElementById("response");
  response_title = document.getElementById("response_title");
  done_area = document.getElementById("done_area");

  let bulletin_token = document.getElementById("bulletin_token").value;
  
  message = document.getElementById("message");

  source = new SSE('/api/bulletin/' + bulletin_token);

  countdown = document.getElementById("countdown");

  votesform = document.getElementById("vote_form");
  submit = document.getElementById("submit");

  let pseudonym = document.getElementById("pseudonym");
  enableSubmit(submit, pseudonym);
  
  pseudonym.oninput = function(e) {
    enableSubmit(submit, pseudonym);
  };

  content.onchange = function(e) {
    enableSubmit(submit, pseudonym);
  };


  votesform.onsubmit = function(e) {
    e.preventDefault();

    let pseudonym = document.getElementById('pseudonym').value;
    let votes = document.getElementById('content').value;
      
    const XHR = new XMLHttpRequest();
    const FD = new FormData(votesform);

    XHR.onload = function () {

      var sedel = document.getElementById("content");
      var freeze = document.getElementById("freeze");

      if(XHR.status != 200) {
        status_message(`ERROR ${XHR.status}: ${XHR.statusText}<br/>`, "cautious");
        status_message('{{ _("You may want to try again after checking connection status and/or server limits!") }}<br/>');
        
      } else {
        
        const json = JSON.parse(XHR.responseText);
        if (!("state" in json)) {
          status_message(`ERROR ${XHR.status}: ${XHR.statusText}<br/>`, "cautious");
          status_message('{{ _("You may want to try again after checking connection status and/or server limits!") }}<br/>');
          console.log(`REFUSED: ${JSON.stringify(json)}`);
          return;
        }
        
        const state = json.state;
        const STATE = state.toUpperCase();
        
        console.log(`${STATE}: ${JSON.stringify(json)}`);

        if (state == "recorded") {
        
          status_message(JSON.stringify(JSON.parse(XHR.responseText), undefined, "\u200B"), null, `{{ _("Receipt of your submitted vote") }}`, true);
          submit.disabled=true;
          sedel.readOnly=true;
          sedel.classList.add("lucky-bg");
          submit.value='{{ _("Ballot submitted!") }}';
          disableElements(freeze.children, true, [document.vote_form.content]);

          //status_message("<br/>" + `{{ _("Thank you for taking digital democracy seriously!") }}`);
          
        } else {
          
          status_message(JSON.stringify(JSON.parse(XHR.responseText), undefined, "\u200B"), null, `{{ _("Receipt of your submitted vote") }}`, true);
          submit.disabled=true;
          sedel.readOnly=true;
          sedel.classList.add("cautious-bg");
          submit.value='{{ _("Ballot submitted!") }}';
          disableElements(freeze.children, true, [document.vote_form.content]);

        }
      }
      
    }; // onload


    XHR.onerror = function() {
      console.log("Request failed with " + XHR.status +": " + XHR.statusText);
    };

    XHR.open( "POST", "/api/vote" );
    
    XHR.send(FD);

  };

  function closeBulletinStream() {
    source.close();
    votesIncoming.value += "=== DISCONNECTED: " + new Date().toLocaleString() + " ===\n";
    votesIncoming.value += '\n{{ _("Thank you for taking digital democracy seriously!") }}\n\n';
    scrollVotesToEnd();
  }
  
  source.onmessage = function(evt) {
    const raw = evt.data;
    
    if(!raw.startsWith("{")) {
      
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
      
      console.log(`${STATE} ${JSON.stringify(json.data)}`);

      if (state == "end") {
        if (!bulletin_timing.ended) {
          let ended_time = new Date(data.timestamp);
          votesIncoming.value += `=== FINISHED: ${ended_time.toLocaleString()} ===\n`;
        }

        let grace = 5*60;
        console.log(`CLOSING ${source.url} in ${grace} seconds.`);
        bulletin_ended = true;
        setTimeout(closeBulletinStream, grace * 1000);
        
      } else if (state == "wait-start") {
        setCountDown( '{{ _("Starting in") }} ', "cautious", '{{ _("Voting started!") }}', "lucky", data.timestamp);

      } else if (state == "wait-end") {
        if (!bulletin_timing.started) {
          let start_time = new Date(data.started);
          votesIncoming.value += `=== STARTED: ${start_time.toLocaleString()} ===\n`;
        }
        
        setCountDown('{{ _("Ending in") }} ', "lucky", '{{ _("Voting finished!") }}', "trapped", data.timestamp);
        
      } else if (state == "incoming-vote") {
        votesIncoming.value += `${data.number}) ${data.pseudonym}: ${data.content}\n`;
        scrollVotesToEnd();
        
      } else if ("state" in data) {
        votesIncoming.value += `${STATE}: ${JSON.stringify(data)}\n`;
        
      } else {
        votesIncoming.value += `${JSON.stringify(data)}\n`;
      }
    }
       
  }; // onmessage

  source.onerror = function(e) {
    
    if (e.readyState == EventSource.CONNECTING) {
      if (!!e.prevReadyState) {
        votesIncoming.value += "=== RECONNECTING: " + new Date().toLocaleString() + " ===\n";
        scrollVotesToEnd();
      }
      
    } else if (e.readyState == EventSource.OPEN) {
      votesIncoming.value += "=== CONNECTED: " + new Date().toLocaleString() + " ===\n";
      scrollVotesToEnd();
    
    } else if (!bulletin_ended && e.readyState == EventSource.CLOSED) {
      votesIncoming.value += "=== DISCONNECTED: " + new Date().toLocaleString() + " ===\n";
      scrollVotesToEnd();
    }
    
  }; // onError

  source.stream();

  scrollVotesToEnd();
  
  // console.log("init-done");
}
