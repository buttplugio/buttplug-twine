(() => {
  "use strict";

  const buttplugLoadingPromise = importScripts(
    "https://cdn.jsdelivr.net/npm/buttplug@4.0.0/dist/web/buttplug.min.js");

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
    if (setup.bpClient.connected) {
      setup.bpClient.disconnect();
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
      setup.bpClient = new buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new buttplug.ButtplugEmbeddedClientConnector();
        await setup.bpClient.connect(connector);
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
        return macro.error(
          `Expected ${expectedLength} arguments, got ${this.args.length}`
        );
      }
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      // Run the connecting block before actually trying to connect
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      // TODO Let user name client as argument
      setup.bpClient = new buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new buttplug.ButtplugBrowserWebsocketClientConnector(
          this.args[0]);
        await setup.bpClient.connect(connector);
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
        setup.bpClient = await ButtplugDevTools.CreateDevToolsClient(
          buttplug.ButtplugLogger.Logger
        );

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
      await setup.bpClient.startScanning();
    }
  });

  Macro.add("buttplugstopscanning", {
    async handler() {
      if (setup.bpClient === undefined) {
        return this.error("Trying to run scan without a connection!");
      }
      await setup.bpClient.stopScanning();
    }
  });

  Macro.add("buttplugscanningfinishedhandler", {
    tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener("scanningfinished", () => {
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  Macro.add("buttpluglistdevices", {
    handler() {
      let p = setup.bpClient.requestDeviceList();
      setup.bpClient._devices.values().forEach(d => alert(d.name));
    }
  });

  Macro.add("buttplugdeviceadded", {
    tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        console.log("no client!")
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener("deviceadded", (device) => {
        alert("device added")
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
      setup.bpClient.addListener("deviceremoved", (device) => {
        alert("device removed");
        State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  // NOTE: these two would be better as functions on the device object
  // currently the only way to get a "throwing" checkvalid is
  // to also pass in the index of the feature
  const CheckDeviceOutputValid = function (device, cmd) {
    if (!device.hasOutput(cmd)) {
      throw new ButtplugDeviceError(
        `Output command ${cmd} not supported on device ${device.name}`
      );
    }
  };

  const CheckDeviceInputValid = function (device, cmd) {
    if (!device.hasInput(cmd)) {
      throw new ButtplugDeviceError(
        `Input command ${cmd} not supported on device ${device.name}`
      );
    }
  };

  const CheckDeviceOrFeatureMessageMacro = function (macro,
    args,
    expectedLength,
    expectedCmdType, // input or output
    expectedCmd) {
    if (args.length < expectedLength) {
      return macro.error(
        `Expected ${expectedLength} arguments, got ${args.length}`
      );
    }

    if (args[0] instanceof buttplug.ButtplugClientDevice) {
      const device = args[0];
      try {
        if (expectedCmdType == "Output") {
          CheckDeviceOutputValid(device, expectedCmd);
        } else {
          CheckDeviceInputValid(device, expectedCmd);
        }
      } catch (ex) {
        return macro.error(
          "Device is not capable of running command " + expectedCmd
        );
      }
    } else /* TODO: this SHOULD be a ButtplugClientDeviceFeature but ???if (args[0] instanceof buttplug.ButtplugClientDeviceFeature) */ {
      const feature = args[0];
      try {
        if (expectedCmdType == "Output") {
          feature.isOutputValid(expectedCmd)
        } else {
          feature.isInputValid(expectedCmd)
        }
      } catch (ex) {
        return macro.error(
          "Feature is not capable of running command " + expectedCmd
        );
      }
    } /* TODO fucking javascript types???
      else {
      return macro.error(
        "Unknown target, expecting device or feature: %o" + args[0]
      );
    }*/
    return null;
  };

  const ACTION_MIN = {
    "Rotate": -1.0
  };
  const ACTION_MAX = {
  };

  async function buttplugaction(macro, op) {
    let err = CheckDeviceOrFeatureMessageMacro(
      macro,
      macro.args,
      2,
      "Output",
      op
    );
    if (err !== null) {
      return err;
    }
    let device = macro.args[0];
    let arg = macro.args[1];
    if (typeof arg !== "number"
      || arg < (ACTION_MIN[op] ?? 0)
      || arg > (ACTION_MAX[op] ?? 1)
    ) {
      return macro.error(
        `${op} arg should be a number between ${(ACTION_MAX[op] ?? 1)} and ${(ACTION_MAX[op] ?? 1)}, was ${arg}`
      );
    }
    return await device.runOutput(buttplug.DeviceOutput[op].percent(arg));
  };

  Macro.add("buttplugvibrate", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, speed
      return buttplugaction(this, buttplug.OutputType.Vibrate);
    }
  });

  Macro.add("buttplugoscillate", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, speed
      return buttplugaction(this, buttplug.OutputType.Oscillate);
    }
  });

  Macro.add("buttplugrotate", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, speed (+/- determines direction)
      return buttplugaction(this, buttplug.OutputType.Rotate);
    }
  });

  Macro.add("buttpluginflate", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, size
      return buttplugaction(this, buttplug.OutputType.Inflate);
    }
  });

  Macro.add("buttplugconstrict", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, size
      return buttplugaction(this, buttplug.OutputType.Constrict);
    }
  });

  Macro.add("buttplugled", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, percent
      return buttplugaction(this, buttplug.OutputType.Led);
    }
  });

  Macro.add("buttplugspray", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, percent
      return buttplugaction(this, buttplug.OutputType.Spray);
    }
  });

  Macro.add("buttplugtemperature", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, percent
      return buttplugaction(this, buttplug.OutputType.Temperature);
    }
  });

  // TODO: position pending HwPositionWithDuration being actually implemented and
  // stuff
  async function buttplugposition(device, position, duration) {
    if (typeof duration !== "number" || duration < 0) {
      return this.error(
        "Position duration should be a number greater than 0 (time in milliseconds)"
      );
    }
    if (typeof position !== "number" || position < 0 || position > 1.0) {
      return this.error("Position should be a number between 0.0 and 1.0");
    }
    return await device.runOutput(
      buttplug.DeviceOutput.Position.percent(position)
    );
  };

  Macro.add("buttplugposition", {
    tags: ["success", "failure"],
    async handler() {
      // Args: device, position, duration
      let err = CheckDeviceOrFeatureMessageMacro(
        this,
        this.args,
        3,
        "Output",
        "HwPositionWithDuration"
      );
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const position = this.args[1];
      const duration = this.args[2];
      buttplugposition(device, position, duration);
    }
  });


  async function buttplugbattery(device) {
    try {
      const level = await device.battery();
      return level;
    } catch (e) {
      console.log("Could not read battery level:", e);
    }
  };

  Macro.add("buttplugbattery", {
    handler() {
      if (this.args.length < 2) {
        return macro.error(`Expected 2 arguments, got ${this.args.length}`);
      }
      let device = this.args[0];
      let dest = this.args[1];
      new Wikifier(this.output, `<span id="${dest}"></span>% Battery`);
      buttplugbattery(device).then((value) => {
        document.getElementById(dest).innerHTML = value;
      });
    }
  });

  Macro.add("buttplugrefreshbatteries", {
    handler() {
      let devices = this.args.length ?
        this.args : setup.bpClient._devices.values();
      devices.forEach(d => {
        buttplugbattery(d).then((value) => {
          d.batteryLevel = value;
        })
      }
      );
    }
  });
})();
