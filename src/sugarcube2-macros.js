(() => {
  'use strict';

  const buttplugLoadingPromise = importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.13.2/dist/web/buttplug.min.js');

  // Map multiple payloads from child tags to an es6 <string, object> map.
  function mapPayloads(payloads) {
    const payloadMap = new Map();
    for (const payload of payloads) {
      payloadMap.set(payload.name, payload);
    }
    return payloadMap;
  }

  const disconnectClient = () => {
    if (setup.bpClient === undefined) {
      return;
    }
    // We should do this in the buttplug library probably
    setup.bpClient.removeAllListeners("deviceadded");
    setup.bpClient.removeAllListeners("deviceremoved");
    setup.bpClient.removeAllListeners("scanningfinished");
    if (setup.bpClient.Connected) {
      setup.bpClient.Disconnect();
    }
    setup.bpClient = undefined;
  };

  Macro.add("buttplugloaded", {
    tags: null,
    async handler() {
      await buttplugLoadingPromise;
      Wikifier.wikifyEval(this.payload[0].contents.trim());
    }
  });

  const teardownClient = () => {
    if (setup.bpClient !== undefined) {
    }
  };

  Macro.add("buttplugconnectlocal", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      setup.bpClient = new Buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new Buttplug.ButtplugEmbeddedClientConnector();
        await setup.bpClient.Connect(connector);
        // TODO: Check to see if we actually have success/failure tags
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        console.log(e);
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugconnectwebsocket", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      if (this.args == undefined || this.args.length < 1) {
        return macro.error(`Expected ${expectedLength} arguments, got ${this.args.length}`);
      }
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      setup.bpClient = new Buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new Buttplug.ButtplugBrowserWebsocketClientConnector(this.args[0]);
        await setup.bpClient.Connect(connector);
        // TODO: Check to see if we actually have success/failure tags
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        console.log(e);
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugconnectdevtools", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);

      try {
        setup.bpClient = await ButtplugDevTools.CreateDevToolsClient(Buttplug.ButtplugLogger.Logger);

        // TODO: Check to see if we actually have success/failure tags
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugdisconnect", {
    handler() {
      disconnectClient();
      // TODO Detect disconnect event, store/run wikified block.
    }
  });

  Macro.add("buttplugstartscanning", {
    async handler() {
      if (setup.bpClient === undefined) {
        return this.error("Trying to run scan without a connection!");
      }
      await setup.bpClient.StartScanning();
    }
  });

  Macro.add("buttplugstopscanning", {
    async handler() {
      if (setup.bpClient === undefined) {
        return this.error("Trying to run scan without a connection!");
      }
      await setup.bpClient.StopScanning();
    }
  });

  Macro.add("buttplugscanningfinishedhandler", {
		tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener('scanningfinished', () => {
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  Macro.add("buttplugdeviceadded", {
		tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener('deviceadded', (device) => {
        State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  Macro.add("buttplugdeviceremoved", {
		tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener('deviceremoved', (device) => {
				State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
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

  Macro.add("buttplugvibrate", {
		tags: ["success", "failure"],
    async handler() {
      let err = CheckDeviceMessageMacro(this, this.args, 2, "VibrateCmd");
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const speed = this.args[1];
      if (typeof speed !== "number" || speed < 0 || speed > 1) {
        return this.error("Vibrate speed should be a number between 0.0 and 1.0");
      }

      return await device.SendVibrateCmd(speed);
    }
  });

  Macro.add("buttpluglinear", {
		tags: ["success", "failure"],
    async handler() {
      // Args: device, position, duration
      let err = CheckDeviceMessageMacro(this, this.args, 3, "LinearCmd");
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const position = this.args[1];
      const duration = this.args[2];
      if (typeof duration !== "number" || duration < 0) {
        return this.error("Linear speed should be a number greater than 0 (time in milliseconds)");
      }
      if (typeof position !== "number" || position < 0 || position > 1.0) {
        return this.error("Linear position should be a number between 0.0 and 1.0");
      }

      return await device.SendLinearCmd(position, duration);
    }
  });

  Macro.add("buttplugrotate", {
		tags: ["success", "failure"],
    async handler() {
      // Args: device, speed, clockwise
      let err = CheckDeviceMessageMacro(this, this.args, 3, "RotateCmd");
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const speed = this.args[1];
      const clockwise = this.args[2];
      if (typeof speed !== "number" || speed < 0 || speed > 1.0) {
        return this.error("Rotation speed should be a number between 0.0 and 1.0");
      }
      if (typeof clockwise !== "boolean") {
        return this.error("Rotation clockwise direction should be a boolean");
      }
      console.log("Sending command!");
      return await device.SendRotateCmd(speed, clockwise);
    }
  });
})();
