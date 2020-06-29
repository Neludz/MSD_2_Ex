// Add your code here
"use strict";

let port;
let reader;
let writer;
var RETRY_REQUEST_MS = 100;
var MANAGER_MS = 20;
var TIMEOUT_MS = 50;

let RequestQueueSize = 10;

const filter = {
  usbVendorId: 0x0483
};

function Request_Data(Addr, Func, Reg, Len, Data) {
  this.MB_Addr = Addr;
  this.MB_Func = Func;
  this.MB_Start_Reg = Reg;
  this.MB_Reg_Count = Len;
  this.MB_Data_Reg = Data;
}





let MB_Data = {
  MBBuf: [],
  Main_Reg: [],
  Tx_Queue: [],
  Rx_Queue_03: [],
  Rx_03_Ind: 0,

  QueueManager() {
    let Len = this.Tx_Queue.length;
    if (Len > 0) {
      writeToStream(this.Message_Tx_Create());
      this.Tx_Queue.shift();
    }
    setTimeout(this.QueueManager.bind(this), MANAGER_MS);
  },

  Set_Request(Request) {
    if (
      this.Tx_Queue.find(function checkNumber(currentValue) {
        for (var key in Request) {
          if (Request[key] != currentValue[key]) {
            return false;
          }
        }
        return true;
      })
    ) {
      console.log("replay");
      return;
    }
    let Len_Queue = this.Tx_Queue.length;
    if (Len_Queue < RequestQueueSize) {
      this.Tx_Queue[Len_Queue] = Request;
    }
  },

  Message_Tx_Create() {
    let Len = this.Tx_Queue.length;
    if (Len > 0) {
      let Message = [];

      Message[0] = this.Tx_Queue[0].MB_Addr;
      Message[1] = this.Tx_Queue[0].MB_Func;
      Message[2] = (this.Tx_Queue[0].MB_Start_Reg & 0xff00) >> 8;
      Message[3] = this.Tx_Queue[0].MB_Start_Reg & 0xff;
      if (this.Tx_Queue[Len - 1].MB_Func == 3) {
        Message[4] = (this.Tx_Queue[0].MB_Reg_Count & 0xff00) >> 8;
        Message[5] = this.Tx_Queue[0].MB_Reg_Count & 0xff;
      }
      if (this.Tx_Queue[0].MB_Func == 6) {
        Message[4] = (this.Tx_Queue[0].MB_Data_Reg & 0xff00) >> 8;
        Message[5] = this.Tx_Queue[0].MB_Data_Reg & 0xff;
      }
      let CRC_Arr = this.CRC_Calc(Message);
      Message.push(CRC_Arr & 0xff);
      Message.push((CRC_Arr & 0xff00) >> 8);

      return Message;
    }
  },

  CRC_Calc(Buf) {
    let len = Buf.length;
    let res_CRC = 0xffff;
    let count = 0;
    let count_crc;
    let dt;
    while (count < len) {
      count_crc = 0;
      dt = Buf[count] & 0xff;
      res_CRC ^= dt & 0xff;
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
    return res_CRC;
  },

  async Data_Check(Data) {
    let Len_Byte;
    let ar_t = this.To_Array(Data, Data.length);
    this.MBBuf = this.MBBuf.concat(ar_t);
    if (this.MBBuf.length >= 3) {
      if (this.MBBuf.length >= 500) {
        this.Error();
        this.MBBuf.length = 0;
        console.log("this.MBBuf.length >= 500");
      }
      if (this.MBBuf[1] == 6) {
        Len_Byte = 8;
      } else if (this.MBBuf[1] == 3) {
        Len_Byte = this.MBBuf[2] + 5;
      } else {
        this.Error();
        this.MBBuf.length = 0;
        console.log("this.MBBuf[1]!=3 || this.MBBuf[1]!=6");
        return;
      }
      if (this.MBBuf.length >= Len_Byte) {
        let Arr_To_Send = this.To_Array(this.MBBuf, Len_Byte);
        let Parse_Result = this.Parse_MB(Arr_To_Send);
        if (Parse_Result == false) {
          this.Error();
          this.MBBuf.length = 0;
          console.log("Parse_Result == false");
          return;
        }
        this.MBBuf.splice(0, Len_Byte);
      }
    }
  },

  Parse_MB(Buf) {
    let Len_Buf = Buf.length;
    let CRC = this.CRC_Calc(Buf);
    let CRC_Buf = Buf[Len_Buf - 2] & (Buf[Len_Buf - 1] << 8);
    if (CRC != CRC_Buf) {
      console.log("error___CRC");
      return false;
    }
    if (this.MBBuf[1] == 3 && Len_Buf >= 7) {
      this.Parse_03_Func(Buf);
    }
    return true;
  },

  To_Array(Arr, Len) {
    let New_Arr = [];
    for (let i = 0; i < Len; i++) {
      New_Arr[i] = Arr[i];
    }
    return New_Arr;
  },

  Parse_03_Func(Buf) {
    let Len = this.Rx_Queue_03.length;
    let Count_Unique;
    for (let i = 0; i < Len; i++) {
      if (this.Rx_Queue_03[i].MB_Reg_Count == Buf[2] >> 1) {
        Count_Unique = i;
      }
    }

    for (let i = 0; i < this.Rx_Queue_03[Count_Unique].MB_Reg_Count; i++) {
      this.Main_Reg[this.Rx_Queue_03[Count_Unique].MB_Start_Reg + i] =
        (Buf[3 + i * 2] << 8) | Buf[4 + i * 2];
    }
    this.Rx_03_Ind++;
  },

  Period_03_Request() {
    let Len = this.Rx_Queue_03.length;
    if (Len > 0) {
      if (this.Rx_03_Ind >= Len) {
        this.Rx_03_Ind = 0;
      }
      this.Set_Request(this.Rx_Queue_03[this.Rx_03_Ind]);
    }
    setTimeout(this.Period_03_Request.bind(this), RETRY_REQUEST_MS);
  }
};

MB_Data.Error = function() {
  //alert('Ошибка обмена');
};

$(document).ready(function() {
  if ("serial" in navigator) {
    const notSupported = document.getElementById("notSupported");
    notSupported.classList.add("hidden");
  }
  port_init();
});

function port_init() {
  $("#Connect_But").on("click", async function() {
    if (port) {
      await disconnect();
      toggleUIConnected(false);
      return;
    }
    await connect();
    toggleUIConnected(true);
  });

  $("#Default_But").on("click", async function() {
    MB_Data.Set_Request(new Request_Data($("#MSD_Addr").val(), 6, 4, 1, 555));
    return;
  });
}

async function connect() {
  console.log("go");
  port = await navigator.serial.requestPort(); //({filters: [filter]});
  await port.open({ baudrate: 9600 });
  reader = port.readable.getReader();
  readLoop();
  //need unique LEN in request!!!
  MB_Data.Rx_Queue_03[0] = new Request_Data($("#MSD_Addr").val(), 3, 0, 20);
  MB_Data.Rx_Queue_03[1] = new Request_Data($("#MSD_Addr").val(), 3, 20, 21);
  MB_Data.Rx_Queue_03[2] = new Request_Data($("#MSD_Addr").val(), 3, 41, 12);
  MB_Data.Period_03_Request();
  MB_Data.QueueManager();
}

async function disconnect() {
  if (reader) {
    await reader.cancel();
    reader = null;
  }

  await port.close();
  port = null;
}

async function readLoop() {
  while (port.readable) {
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        MB_Data.Data_Check(value);
      }
      if (done) {
        break;
      }
    }
  }
  reader.releaseLock();
}

function writeToStream(Data) {
  let Mbuf = new Uint8Array(Data);
  writer = port.writable.getWriter();
  writer.write(Mbuf);
  writer.releaseLock();
}

function toggleUIConnected(connected) {
  let lbl = "Connect";
  let colo = "#074762";

  if (connected) {
    lbl = "Disconnect";
    colo = " #ed4600";
  }

  $("#Connect_But").text(lbl);
  $("#Connect_But").css("background-color", colo);
}

// log.textContent += Arr_To_Send.length + '\n';
