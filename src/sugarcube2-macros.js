/*
  External script loading module.
  Taken from https://twinery.org/forum/discussion/6628/sugarcube-2-9-0-including-external-javascript-libraries
*/
(() => {
  'use strict';

  const buttplugLoadingPromise = importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.5.2/dist/web/buttplug.min.js');

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
	let bpClient;
  setup.bpDevices = [];

  Macro.add("buttplugloaded", {
    tags: null,
    handler() {
      buttplugLoadingPromise.then(() => Wikifier.wikifyEval(this.payload[0].contents.trim()));
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
        await bpClient.ConnectWebsocket("wss://192.168.123.2:12345/buttplug");
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

  const CheckDeviceMessageMacro = function (args,
                                            expectedLength,
                                            expectedMsg) {
    if (args.length < expectedLength) {
      return this.error(`Expected ${expectedLength} arguments, got ${args.length}`);
    }
    const device = args[0];
    if (device === undefined ||
        device.AllowedMessages === undefined) {
      return this.error("Device object (first argument) is not valid!");
    }
    if (device.AllowedMessages === undefined ||
        device.AllowedMessages.indexOf(expectedMsg) === -1) {
      return this.error("Device is not capable of running command " + expectedMsg);
    }
    return null;
  };

  const SendDeviceMessage = async function(device, msg) {
    try {
      await bpClient.SendDeviceMessage(device, msg);
      // TODO: Fire success
    } catch (e) {
      // TODO: Fire failure
      return this.error(e);
    }
    return null;
  };

  Macro.add("buttplugvibrate", {
		tags: ["success", "failure"],
    async handler() {
      let err = CheckDeviceMessageMacro(this.args, 2, "SingleMotorVibrateCmd");
      if (err !== null) {
        return err;
      }
      const payloadMap = mapPayloads(this.payload);
      const device = this.args[0];
      const speed = this.args[1];
      if (typeof speed !== "number" || speed < 0 || speed > 1) {
        return this.error("Vibrate speed should be a number between 0.0 and 1.0");
      }

      return await SendDeviceMessage(device, new Buttplug.SingleMotorVibrateCmd(speed));
    }
  });

  Macro.add("buttpluglinear", {
		tags: ["success", "failure"],
    async handler() {
      // Args: device, position, time
      let err = CheckDeviceMessageMacro(this.args, 3, "FleshlightLaunchFW12Cmd");
      if (err !== null) {
        return err;
      }
      const payloadMap = mapPayloads(this.payload);
      const device = this.args[0];
      const speed = this.args[1];
      if (typeof speed !== "number" || speed < 0 || speed > 1) {
        return this.error("Vibrate speed should be a number between 0.0 and 1.0");
      }

      return await SendDeviceMessage(device, new Buttplug.SingleMotorVibrateCmd(speed));
    }
  });

  Macro.add("buttplugrotate", {
		tags: ["success", "failure"],
    async handler() {
      let err = CheckDeviceMessageMacro(this.args, 2, "SingleMotorVibrateCmd");
      if (err !== null) {
        return err;
      }
      const payloadMap = mapPayloads(this.payload);
      const device = this.args[0];
      const speed = this.args[1];
      if (typeof speed !== "number" || speed < 0 || speed > 1) {
        return this.error("Vibrate speed should be a number between 0.0 and 1.0");
      }

      return await SendDeviceMessage(device, new Buttplug.SingleMotorVibrateCmd(speed));
    }
  });
})();
