(() => {
  'use strict';

  const buttplugLoadingPromise = importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.8.0/dist/web/buttplug.min.js').then(() => importScripts('https://cdn.jsdelivr.net/npm/buttplug@0.8.0/dist/web/buttplug-devtools.min.js'));

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

  Macro.add("buttplugdevtoolsshowlog", {
    handler() {
      ButtplugDevTools.CreateLoggerPanel(Buttplug.ButtplugLogger.Logger);
    }
  });

  Macro.add("buttplugdevtoolsshowdevicepanel", {
    handler() {
      if (setup.bpClient === undefined) {
        return;
      }
      try {
        ButtplugDevTools.CreateDeviceManagerPanel(setup.bpClient.Connector.Server);
      } catch (e) {
        // We should do something more than catch and console here, but I'm not
        // quite sure what.
        console.log("Can't create device manager panel, as server doesn't have a test device manager");
      }
    }
  });

  Macro.add("buttplugdevtoolsclosedevicepanel", {
    handler() {
      const panelElement = document.getElementById("buttplug-test-device-manager-panel");
      if (panelElement !== null) {
        panelElement.remove();
      }
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
        await setup.bpClient.ConnectLocal();
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
        await setup.bpClient.ConnectWebsocket(this.args[0]);
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

  Macro.add("buttplugdeviceaddedhandler", {
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

  Macro.add("buttplugdeviceremovedhandler", {
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

  Macro.add("buttplugdisconnecthandler", {
		tags: null,
    handler() {
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
      await setup.bpClient.SendDeviceMessage(device, msg);
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
