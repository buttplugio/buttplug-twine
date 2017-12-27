/*
  External script loading module.
  Taken from https://twinery.org/forum/discussion/6628/sugarcube-2-9-0-including-external-javascript-libraries
*/
(() => {
  'use strict';
  window.requestScriptLoad = function (options) {
    if (options == null || typeof options !== 'object' || !options.src) {
      return;
    }

    var
    opts   = Object.assign({ parent : document.head }, options),
    script = document.createElement('script');

    function onLoadOnce(evt) {
      opts.onload.call(evt.target, evt);
      script.removeEventListener('load', onLoadOnce);
    }

    script.id   = opts.id;
    script.src  = opts.src;
    script.type = 'text/javascript';

    if (typeof opts.onload === 'function') {
      script.addEventListener('load', onLoadOnce, false);
    }

    opts.parent.appendChild(script);
  };

  let buttplugLoadingPromise = new Promise((resolve, reject) => {
    requestScriptLoad({
      id     : 'lib-buttplug-js',
      src    : 'https://cdn.jsdelivr.net/npm/buttplug@0.4.0/dist/web/buttplug.min.js',
      onload : function (evt) {
        resolve();
      }
    });
  });

  // Map multiple payloads from child tags to an es6 <string, object> map.
  function mapPayloads(payloads) {
    let payloadMap = new Map();
    for (let payload of payloads) {
      payloadMap.set(payload.name, payload);
    }
    return payloadMap;
  }

  // The Buttplug Client needs to live in macro definition scope (basically, as
  // a private scope variable), but not in Twine State scope. Adding it as part
  // of State.variables causes weird things to happen between passages and event
  // listeners to not register correctly, and the client object shouldn't be
  // serialized into history anyways. This does make management of the object
  // and devices a bit odd, but this is a sex toy library for an interactive
  // fiction engine. We started at odd and headed outward from there.
	let bpClient;

  Macro.add("buttplugloaded", {
    tags: null,
    handler() {
      buttplugLoadingPromise.then(() => Wikifier.wikifyEval(this.payload[0].contents.trim()));
    }
  });

  Macro.add("buttplugconnectlocal", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      let payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      State.variables.bpClient = new Buttplug.ButtplugClient("Twine Buttplug Client");
		  bpClient = State.variables.bpClient;

      try {
        await bpClient.ConnectLocal();
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugstartscanning", {
    async handler() {
      if (bpClient === undefined) {
        return this.error("Trying to run scan without a connection!");
      }
      await bpClient.StartScanning();
    }
  });

  Macro.add("buttplugstopscanning", {
    async handler() {
      if (bpClient === undefined) {
        return this.error("Trying to run scan without a connection!");
      }
      await bpClient.StopScanning();
    }
  });

  Macro.add("buttplugdeviceadded", {
		tags: null,
    handler() {
      if (bpClient === undefined) {
        return this.error("We need a client object!");
      }
      bpClient.addListener('deviceadded', (device) => {
				State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  Macro.add("buttplugdeviceremoved", {
		tags: null,
    handler() {
      if (bpClient === undefined) {
        return this.error("We need a client object!");
      }
      bpClient.addListener('deviceremoved', (device) => {
				State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  Macro.add("buttplugdisconnect", {
		tags: null,
    handler() {
      // We currently have no way to detect this. WTF is wrong with me.
      // https://github.com/metafetish/buttplug-js/issues/64
    }
  });
})();
