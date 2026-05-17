(() => {
  "use strict";

  const buttplugLoadingPromise = importScripts(
    "https://cdn.jsdelivr.net/npm/buttplug@4.0.2/dist/web/buttplug.min.js");

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

  Macro.add("buttplugconnectlocal", {
    tags: ["connecting", "success", "failure"],
    async handler() {
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      setup.bpClient = new buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new buttplug.ButtplugEmbeddedClientConnector();
        await setup.bpClient.connect(connector);
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
      if (this.args === undefined || this.args.length < 1) {
        return this.error(
          `Expected at least 1 argument (websocket URL), got ${this.args ? this.args.length : 0}`
        );
      }
      disconnectClient();
      const payloadMap = mapPayloads(this.payload);
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);
      setup.bpClient = new buttplug.ButtplugClient("Twine Buttplug Client");

      try {
        const connector = new buttplug.ButtplugBrowserWebsocketClientConnector(
          this.args[0]);
        await setup.bpClient.connect(connector);
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
      Wikifier.wikifyEval(payloadMap.get("connecting").contents);

      try {
        setup.bpClient = await ButtplugDevTools.CreateDevToolsClient(
          buttplug.ButtplugLogger.Logger
        );
        Wikifier.wikifyEval(payloadMap.get("success").contents);
      } catch (e) {
        Wikifier.wikifyEval(payloadMap.get("failure").contents);
      }
    }
  });

  Macro.add("buttplugdisconnect", {
    handler() {
      disconnectClient();
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
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.requestDeviceList();
    }
  });

  Macro.add("buttplugdeviceadded", {
    tags: null,
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      setup.bpClient.addListener("deviceadded", (device) => {
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
        State.temporary.device = device;
        Wikifier.wikifyEval(this.payload[0].contents.trim());
      });
    }
  });

  function checkDeviceCapability(macro, args, expectedLength, cmdType, cmd) {
    if (args.length < expectedLength) {
      return macro.error(
        `Expected ${expectedLength} arguments, got ${args.length}`
      );
    }

    const target = args[0];
    if (target instanceof buttplug.ButtplugClientDevice) {
      const checkFn = cmdType === "Output" ? "hasOutput" : "hasInput";
      if (!target[checkFn](cmd)) {
        return macro.error(
          `Device is not capable of running command ${cmd}`
        );
      }
    } else {
      try {
        const checkFn = cmdType === "Output" ? "isOutputValid" : "isInputValid";
        target[checkFn](cmd);
      } catch (ex) {
        return macro.error(
          `Feature is not capable of running command ${cmd}`
        );
      }
    }
    return null;
  }

  const ACTION_MIN = {
    "Rotate": -1.0
  };
  const ACTION_MAX = {};

  async function buttplugaction(macro, op) {
    let err = checkDeviceCapability(macro, macro.args, 2, "Output", op);
    if (err !== null) {
      return err;
    }
    const target = macro.args[0];
    const arg = macro.args[1];
    const min = ACTION_MIN[op] ?? 0;
    const max = ACTION_MAX[op] ?? 1;
    if (typeof arg !== "number" || arg < min || arg > max) {
      return macro.error(
        `${op} arg should be a number between ${min} and ${max}, was ${arg}`
      );
    }
    return await target.runOutput(buttplug.DeviceOutput[op].percent(arg));
  }

  Macro.add("buttplugvibrate", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Vibrate);
    }
  });

  Macro.add("buttplugoscillate", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Oscillate);
    }
  });

  Macro.add("buttplugrotate", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Rotate);
    }
  });

  Macro.add("buttpluginflate", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Inflate);
    }
  });

  Macro.add("buttplugconstrict", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Constrict);
    }
  });

  Macro.add("buttplugled", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Led);
    }
  });

  Macro.add("buttplugspray", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Spray);
    }
  });

  Macro.add("buttplugtemperature", {
    tags: ["success", "failure"],
    async handler() {
      return buttplugaction(this, buttplug.OutputType.Temperature);
    }
  });

  Macro.add("buttplugposition", {
    tags: ["success", "failure"],
    async handler() {
      let err = checkDeviceCapability(
        this, this.args, 3, "Output", "HwPositionWithDuration"
      );
      if (err !== null) {
        return err;
      }
      const device = this.args[0];
      const position = this.args[1];
      const duration = this.args[2];
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
    }
  });

  async function readBattery(device) {
    try {
      return await device.battery();
    } catch (e) {
      console.log("Could not read battery level:", e);
      return null;
    }
  }

  Macro.add("buttplugbattery", {
    handler() {
      if (this.args.length < 2) {
        return this.error(`Expected 2 arguments, got ${this.args.length}`);
      }
      const device = this.args[0];
      const dest = this.args[1];
      new Wikifier(this.output, `<span id="${dest}"></span>% Battery`);
      readBattery(device).then((value) => {
        const el = document.getElementById(dest);
        if (el) {
          el.textContent = value !== null ? value : "?";
        }
      });
    }
  });

  Macro.add("buttplugrefreshbatteries", {
    handler() {
      if (setup.bpClient === undefined) {
        return this.error("We need a client object!");
      }
      const devices = this.args.length
        ? this.args
        : setup.bpClient.devices;
      devices.forEach(d => {
        readBattery(d).then((value) => {
          if (value !== null) {
            d.batteryLevel = value;
          }
        });
      });
    }
  });
})();
