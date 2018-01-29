(() => {
  'use strict';

  const buttplugLoadingPromise = importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.5.2/dist/web/buttplug.min.js').then(() => importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.5.2/dist/web/buttplug-devtools.min.js'));

  // Map multiple payloads from child tags to an es6 <string, object> map.
  function mapPayloads(payloads) {
    const payloadMap = new Map();
    for (const payload of payloads) {
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
	let bpClient = null;
  setup.bpDevices = [];

  Macro.add("buttplugloaded", {
    tags: null,
    async handler() {
      await buttplugLoadingPromise;
      Wikifier.wikifyEval(this.payload[0].contents.trim());
    }
  });

  Macro.add("buttplugdevtoolsshowlog", {
    handler() {
      ButtplugDevTools.CreateLoggerPanel(Buttplug.ButtplugLogger.Logger);
    }
  });

  Macro.add("buttplugdevtoolsshowdevices", {
    handler() {
      ButtplugDevTools.CreateDeviceManagerPanel();
    }
  });

  const deviceAddedCallback = (device) => {
    setup.bpDevices.push(device);
  };

  Macro.add("buttplugconnectlocal", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      setup.bpClient = new Buttplug.ButtplugClient("Twine Buttplug Client");
		  bpClient = setup.bpClient;

      try {
        await bpClient.ConnectLocal();
        bpClient.addListener('deviceadded', deviceAddedCallback);
        // TODO: Check to see if we actually have success/failure tags
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugconnectwebsocket", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      setup.bpClient = new Buttplug.ButtplugClient("Twine Buttplug Client");
		  bpClient = setup.bpClient;

      try {
        bpClient.addListener('deviceadded', deviceAddedCallback);
        await bpClient.ConnectWebsocket("wss://localhost:12345/buttplug");
        // TODO: Check to see if we actually have success/failure tags
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugconnectdevtools", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);

      try {
        setup.bpClient = await ButtplugDevTools.CreateDevToolsClient(Buttplug.ButtplugLogger.Logger);
		    bpClient = setup.bpClient;
        // Devtools doesn't connect devices until either specific connection
        // functions or startscanning is called, so adding this after the client
        // bringup is fine.
        bpClient.addListener('deviceadded', deviceAddedCallback);
        // TODO: Check to see if we actually have success/failure tags
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

  Macro.add("buttplugscanningfinished", {
		tags: null,
    handler() {
      if (bpClient === undefined) {
        return this.error("We need a client object!");
      }
      bpClient.addListener('scanningfinished', () => {
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
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
      bpClient.disconnect();
      bpClient = undefined;
      setup.bpDevices = [];
      // TODO Detect disconnect event, store/run wikified block.
    }
  });

  const CheckDeviceMessageMacro = function (macro,
                                            args,
                                            expectedLength,
                                            expectedMsg) {
    if (args.length < expectedLength) {
      return macro.error(`Expected ${expectedLength} arguments, got ${args.length}`);
    }
    const device = args[0];
    if (device === undefined ||
        device.AllowedMessages === undefined) {
      return macro.error("Device object (first argument) is not valid!");
    }
    if (device.AllowedMessages === undefined ||
        device.AllowedMessages.indexOf(expectedMsg) === -1) {
      return macro.error("Device is not capable of running command " + expectedMsg);
    }
    return null;
  };

  const SendDeviceMessage = async function (macro, device, msg) {
    //const payloadMap = mapPayloads(this.payload);
    try {
      await bpClient.SendDeviceMessage(device, msg);
      // TODO: Fire success
    } catch (e) {
      // TODO: Fire failure
      console.log(e);
      return macro.error(e);
    }
    return null;
  };

  Macro.add("buttplugsinglemotorvibrate", {
		tags: ["success", "failure"],
    async handler() {
      let err = CheckDeviceMessageMacro(this, this.args, 2, "SingleMotorVibrateCmd");
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const speed = this.args[1];
      if (typeof speed !== "number" || speed < 0 || speed > 1) {
        return this.error("Vibrate speed should be a number between 0.0 and 1.0");
      }

      return await SendDeviceMessage(this, device, new Buttplug.SingleMotorVibrateCmd(speed));
    }
  });

  Macro.add("buttplugfleshlightlaunchfw12", {
		tags: ["success", "failure"],
    async handler() {
      // Args: device, position, time
      let err = CheckDeviceMessageMacro(this, this.args, 3, "FleshlightLaunchFW12Cmd");
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const speed = this.args[1];
      const position = this.args[2];
      if (typeof speed !== "number" || speed < 0 || speed > 99) {
        return this.error("Fleshlight speed should be a number between 0 and 99");
      }
      if (typeof position !== "number" || position < 0 || position > 99) {
        return this.error("Fleshlight speed should be a number between 0 and 99");
      }

      return await SendDeviceMessage(this, device, new Buttplug.FleshlightLaunchFW12Cmd(speed, position));
    }
  });

  Macro.add("buttplugvibrate", {
  });

  Macro.add("buttpluglinear", {
  });

  Macro.add("buttplugrotate", {
  });
})();
