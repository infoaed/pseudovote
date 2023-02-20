/**
 * Copyright (C) 2016 Maxime Petazzoni <maxime.petazzoni@bulix.org>.
 * All rights reserved.
 * 
 * Changed by Märt Põder <tramm@infoaed.ee> 
 * 
 * - Added reconnection mechanism
 * - Mimic Eventsource onerror, onmessage, onopen logic
 * - Switched to const from EventSource.* 
 * - Removed XHR error/abort listeners (readystatechange does it all)
 */

var SSE = function (url, options) {
  if (!(this instanceof SSE)) {
    return new SSE(url, options);
  }

  // Reconnect defaults
  this.RECONN_DELAY = 2600;
  this.RECONN_INVERVAL = 3000;
  this.RECONN_COUNT = 10;
  this.RECONN_MULTIPLY = true;
  this.RECONN_LIMIT = 26000;

  this.url = url;

  options = options || {};
  this.headers = options.headers || {};
  this.payload = options.payload !== undefined ? options.payload : null;
  this.method = options.method || (this.payload && 'POST' || 'GET');
  this.withCredentials = !!options.withCredentials;

  this.FIELD_SEPARATOR = ':';
  this.BASIC_PATTERN = new RegExp('\w*(id|retry|data|event|)'+this.FIELD_SEPARATOR+'{1}')
  
  this.listeners = {};

  this.xhr = null;
  this.readyState = null;
  this.progress = 0;
  this.chunk = '';
  
  // Count connect attempts
  this.connectCount = 0;
  
  // For status reporting
  this.realURL = null;
  this.connectedURL = null;

  this.addEventListener = function(type, listener) {
    if (this.listeners[type] === undefined) {
      this.listeners[type] = [];
    }

    if (this.listeners[type].indexOf(listener) === -1) {
      this.listeners[type].push(listener);
    }
  };

  this.removeEventListener = function(type, listener) {
    if (this.listeners[type] === undefined) {
      return;
    }

    var filtered = [];
    this.listeners[type].forEach(function(element) {
      if (element !== listener) {
        filtered.push(element);
      }
    });
    if (filtered.length === 0) {
      delete this.listeners[type];
    } else {
      this.listeners[type] = filtered;
    }
  };

  this.dispatchEvent = function(e) {
    if (!e) {
      return true;
    }

    e.source = this;

    var onHandler = 'on' + e.type;
    if (this.hasOwnProperty(onHandler)) {
      this[onHandler].call(this, e);
      if (e.defaultPrevented) {
        return false;
      }
    }

    if (this.listeners[e.type]) {
      return this.listeners[e.type].every(function(callback) {
        callback(e);
        return !e.defaultPrevented;
      });
    }

    return true;
  };

  /**
   * Correct HTTP/1.1 solution woud be '201 Created':
   * 
   * - https://httpwg.org/specs/rfc7231.html#status.201
   */
  this.updateURL = function(url, payload = null) {
    this.url = url;
    this.payload = payload;
    this.method = options.method || (this.payload && 'POST' || 'GET');
  };
  
  this.setReconnectParams = function(count, interval, delay, multiply) {
    this.RECONN_COUNT = count;
    this.RECONN_INVERVAL = interval;
    this.RECONN_DELAY = delay;
    this.RECONN_MULTIPLY = multiply;
  };

  this._setReadyState = function(state) {
    var event = new CustomEvent('error');
    event.connectCount = this.connectCount;
    event.realURL = this.realURL;
    event.url = this.url;
    event.connectedURL = this.connectedURL;
    event.readyState = state;
    event.prevReadyState = this.readyState;
    this.readyState = state;
    
    this.dispatchEvent(event);
  };

  this._onStreamProgress = function(e) {
    if (!this.xhr || this.xhr.status !== 200) {
      return;
    }
    
    // Successful connection (if passes basic sanity check)
    if (this.readyState == EventSource.CONNECTING &&
      this.xhr.readyState !== XMLHttpRequest.DONE &&
      this.xhr.responseText.length > 0 &&
      this.BASIC_PATTERN.test(this.xhr.responseText)
      ) {
        this.realURL = this.xhr.responseURL;
        this.connectedURL = this.url;
        this._setReadyState(EventSource.OPEN);
        
        this.dispatchEvent(new CustomEvent('open'));
    }
    
    var data = this.xhr.responseText.substring(this.progress);
    this.progress += data.length;
    data.split(/(\r\n|\n|\r){2}/g).forEach(function(part) {
      if (part.trim().length === 0) {
        this.dispatchEvent(this._parseEventChunk(this.chunk.trim()));
        this.chunk = '';
      } else {
        this.chunk += part;
      }
    }.bind(this));
  };

  this._onStreamLoaded = function(e) {
    this._onStreamProgress(e);

    // Parse the last chunk.
    if(this.chunk.length > 0) {
      console.log(`REAL LASTCHUNK ${this.chunk.length} ${e} ${this.chunk} ${this.xhr} ${this.readyState}`);
    } else {
      console.log(`NULL LASTCHUNK`);
    }
    this.dispatchEvent(this._parseEventChunk(this.chunk));
    this.chunk = '';
  };

  /**
   * Parse a received SSE event chunk into a constructed event object.
   */
  this._parseEventChunk = function(chunk) {
    if (!chunk || chunk.length === 0) {
      return null;
    }

    var e = {'id': null, 'retry': null, 'data': '', 'event': 'message'};
    chunk.split(/\r\n|\n|\r/).forEach(function(line) {
      line = line.trimRight();
      var index = line.indexOf(this.FIELD_SEPARATOR);
      if (index <= 0) {
        // Line was either empty, or started with a separator and is a comment.
        // Either way, ignore.
        return;
      }

      var field = line.substring(0, index);
      if (!(field in e)) {
        return;
      }

      var value = line.substring(index + 1).trimLeft();
      if (field === 'data') {
        e[field] += value;
      } else {
        e[field] = value;
      }
    }.bind(this));

    var event = new CustomEvent(e.event);
    event.data = e.data;
    event.id = e.id;
    return event;
  };

  this._checkStreamClosed = function() {
    if (!this.xhr) {
      return;
    }

    if (this.xhr.readyState === XMLHttpRequest.DONE) {
      
      if (this.readyState == EventSource.OPEN) {
        this.connectCount = 0;
        this.reconnect();
                
      } else if (this.readyState == EventSource.CONNECTING) {
        this.reconnect();
      }
      
    }
  };

  // Attempt connect
  this.stream = function() {
    if (this.readyState != EventSource.CONNECTING) {
      this._setReadyState(EventSource.CONNECTING);
    }

    this.connectCount += 1;

    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener('progress', this._onStreamProgress.bind(this));
    this.xhr.addEventListener('load', this._onStreamLoaded.bind(this));
    this.xhr.addEventListener('readystatechange', this._checkStreamClosed.bind(this));
        
    this.xhr.open(this.method, this.url);
    for (var header in this.headers) {
      this.xhr.setRequestHeader(header, this.headers[header]);
    }
    this.xhr.withCredentials = this.withCredentials;
    this.xhr.send(this.payload);
  };

  // Another chance
  this.reconnect = function() {
    if (this.connectCount >= this.RECONN_COUNT) {
      this.close();
      return;
    }

    if (this.readyState != EventSource.CONNECTING) {
      this._setReadyState(EventSource.CONNECTING);
    }
      
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
      this.progress = 0;
      this.chunk = '';      
    }

    let nextReconn = Math.min(
      !this.connectCount ? this.RECONN_DELAY : this.RECONN_INVERVAL *
        (this.RECONN_MULTIPLY ? this.connectCount : 1),
        this.RECONN_LIMIT
      );
      
    setTimeout(this.stream.bind(this), nextReconn);
  };

  // Finish it up
  this.close = function() {
    if (this.readyState == EventSource.CLOSED) {
      return;
    }
    this._setReadyState(EventSource.CLOSED);

    this.xhr.abort();
    this.xhr = null;
  };
};

// Export our SSE module for npm.js
if (typeof exports !== 'undefined') {
  exports.SSE = SSE;
}
