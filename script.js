/*
 * @license
 * Getting Started with Web Serial Codelab (https://todo)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
"use strict";

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;
let writer;
let i = 5;

let buffer = new ArrayBuffer(i);
let view = new Uint8Array(buffer);
view[0] = 1;
view[1] = 2;
view[2] = 3;
view[3] = 10;

const log = document.getElementById("log");
const ledCBs = document.querySelectorAll("input.led");
const divLeftBut = document.getElementById("leftBut");
const divRightBut = document.getElementById("rightBut");
const butConnect = document.getElementById("butConnect");
const But_Test = document.getElementById("But_Test");
const GRID_HAPPY = [
  1,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  0,
  1,
  1,
  1,
  0
];
const GRID_SAD = [
  1,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  1,
  1,
  0,
  1,
  0,
  0,
  0,
  1
];
const GRID_OFF = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
];
const GRID_HEART = [
  0,
  1,
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  0,
  0
];

document.addEventListener("DOMContentLoaded", () => {
  butConnect.addEventListener("click", clickConnect);
  But_Test.addEventListener("click", testt);

  // CODELAB: Add feature detection here.
  if ("serial" in navigator) {
    const notSupported = document.getElementById("notSupported");
    notSupported.classList.add("hidden");
  }
});

const filter = {
  usbVendorId: 0x0483 // 0
};
/**
 * @name connect
 * Opens a Web Serial connection to a micro:bit and sets up the input and
 * output stream.
 */
async function connect() {
  // CODELAB: Add code to request & open port here.
  // - Request a port and open a connection.
  //let ports = await navigator.serial.getPorts();

  port = await navigator.serial.requestPort();
  // - Wait for the port to open.
  // alert(ports[0]);
  // for (var prop in ports[0]) {
  //   alert(prop); // name, surname, age
  // }

  // port=ports[0];

  //let  info = new  await navigator.serial.SerialPortInfo() ;

  //  for (var prop in port) {
  //  alert("OK"); // name, surname, age
  //}
  //  alert(navigator.serial);
  await port.open({ baudrate: 9600 });
  // CODELAB: Add code setup the output stream here.

  // CODELAB: Send CTRL-C and turn off echo on REPL

  // CODELAB: Add code to read the stream here.
  //let decoder = new TextDecoderStream();
  //inputDone = port.readable.pipeTo(decoder.writable);
  //inputStream = decoder.readable;

  //reader = inputStream.getReader();
  //readLoop();
  reader = port.readable.getReader();

  // const { value, done } = await reader.read();

  //  alert("value");
  // writer.write(buffer);
  readLoop();
  // port.write("c");
  //    writer.write("aa");
}

/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  drawGrid(GRID_OFF);
  sendGrid();

  // CODELAB: Close the input stream (reader).
  if (reader) {
    await reader.cancel();
    //await writer.cancel();
    // await inputDone.catch(() => {});
    reader = null;
    writer = null;
    inputDone = null;
  }
  // CODELAB: Close the output stream.
  //if (outputStream) {
  //await outputStream.getWriter().close();
  // await outputDone;
  // outputStream = null;
  //  outputDone = null;
  //}
  // CODELAB: Close the port.
  await port.close();
  port = null;
}

async function testt() {
  let arr = [0x100001, 3, 0, 0, 0, 1];

  writeToStream(CRC_Add(arr));
}

/**
 * @name clickConnect
 * Click handler for the connect/disconnect button.
 */
async function clickConnect() {
  // CODELAB: Add disconnect code here.
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }
  // CODELAB: Add connect code here.
  await connect();
  // CODELAB: Reset the grid on connect here.

  // CODELAB: Initialize micro:bit buttons.

  toggleUIConnected(true);
}

/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
async function readLoop() {
  // CODELAB: Add read loop here.
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      log.textContent += value + "\n";
    }
    if (done) {
      console.log("[readLoop] DONE", done);
      reader.releaseLock();
      break;
    }
  }
}

/**
 * @name sendGrid
 * Iterates over the checkboxes and generates the command to set the LEDs.
 */
function sendGrid() {
  // CODELAB: Generate the grid
}

/**
 * @name writeToStream
 * Gets a writer from the output stream and send the lines to the micro:bit.
 * @param  {...string} lines lines to send to the micro:bit
 */
function writeToStream(Buf) {
  let Mbuf = new Uint8Array(Buf);

  // CODELAB: Write to output stream

  writer = port.writable.getWriter();
  writer.write(Mbuf);
  writer.releaseLock();
}

/**
 * @name watchButton
 * Tells the micro:bit to print a string on the console on button press.
 * @param {String} btnId Button ID (either BTN1 or BTN2)
 */
function watchButton(btnId) {
  // CODELAB: Hook up the micro:bit buttons to print a string.
}

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = "";
  }

  transform(chunk, controller) {
    // CODELAB: Handle incoming chunk
  }

  flush(controller) {
    // CODELAB: Flush the stream.
  }
}

/**
 * @name JSONTransformer
 * TransformStream to parse the stream into a JSON object.
 */
class JSONTransformer {
  transform(chunk, controller) {
    // CODELAB: Attempt to parse JSON content
  }
}

/**
 * @name buttonPushed
 * Event handler called when one of the micro:bit buttons is pushed.
 * @param {Object} butEvt
 */
function buttonPushed(butEvt) {
  // CODELAB: micro:bit button press handler
}

/**
 * The code below is mostly UI code and is provided to simplify the codelab.
 */

function initCheckboxes() {
  ledCBs.forEach(cb => {
    cb.addEventListener("change", () => {
      sendGrid();
    });
  });
}

function drawGrid(grid) {
  if (grid) {
    grid.forEach((v, i) => {
      ledCBs[i].checked = !!v;
    });
  }
}

function toggleUIConnected(connected) {
  alert("a");
  let lbl = "Connect";
  if (connected) {
    lbl = "Disconnect";
  }
  butConnect.textContent = lbl;
  ledCBs.forEach(cb => {
    if (connected) {
      cb.removeAttribute("disabled");
      return;
    }
    cb.setAttribute("disabled", true);
  });
}

function CRC_Add(Buf) {
  let len = Buf.length;
  //alert(len);
  let res_CRC = 0xffff;
  let count = 0;
  let count_crc;
  let dt;
  //let Data = Uint8Array(Buf);
  while (count < len) {
    count_crc = 0;
    dt = Buf[count] & 0xff;
    res_CRC ^= dt & 0xff;
    //
    while (count_crc < 8) {
      if ((res_CRC & 0x0001) < 1) {
        res_CRC = (res_CRC >> 1) & 0x7fff;
      } else {
        res_CRC = (res_CRC >> 1) & 0x7fff;
        res_CRC ^= 0xa001;
      }
      count_crc++;
    }
    count++;
  }
  Buf.push(res_CRC & 0xff);
  Buf.push((res_CRC & 0xff00) >> 8);

  return Buf;
}
