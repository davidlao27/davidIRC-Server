//////////////////////////////////////////////////
import { WebSocket, WebSocketServer } from 'ws';
import { createRequire } from "module";
import { exit } from 'process';
const require = createRequire(import.meta.url);
const fs = require("fs");
const HttpsServer = require('https').createServer;
var config = require('./config.json');
//////////////////////////////////////////////////

let caddresses = []; // IP addresses to link name to
let cwsockets = []; // Client socket objects
let cnames = []; // Client usernames

// CONFIGURATION //
let extraSecurity = false; // Enable if you wish to block multiaccounts on the same IP

//If you want a WebSocketSecure server, specify SSL://
let server = HttpsServer({
  cert: fs.readFileSync(config.ssl_cert_path),
  key: fs.readFileSync(config.ssl_key_path)
})
//////////////////////////////////////////////////////

let wss = new WebSocketServer({ server: server }); // for WS with SSL
//const wss = new WebSocketServer({ port: 4131 }); // for WS without SSL

//FUNCTIONS//
function distributeMessage(ws, data, req) {
  if (data.toString().startsWith("::NCONN->") && data.toString().split("->")[1] != undefined) {
    let input = data.toString().split("->")[1].split(",");

    // Checks
    cnames.push(input[0]);

    let procentmpa;

    // We don't know the name
    // But we have its index!

    // We loop over names.
    for (let i = 0; i < cnames.length; i++) {

      // When looping over a name we loop over each address to find a match. 
      for (let ii = 0; ii < caddresses.length; ii++) {

        // Found!
        if (caddresses[ii] == req.socket.remoteAddress) {
          procentmpa = ii;
        }
      }
    }

    if (extraSecurity) {
      if (caddresses.includes(req.socket.remoteAddress) && cnames[procentmpa] != input[0]) {
        ws.send("300");
        setTimeout(() => {
          ws.close();
        }, 2000);
      }
    }

    //to identify
    caddresses.push(req.socket.remoteAddress);

    console.log("User " + input[0] + " just connected!");

    cwsockets.push(ws);
    ws.send("100");

    cwsockets.forEach(user => {
      user.send("::ANN->User " + input[0] + " just connected!");
      user.send("::ANN->Current Server Time: " + new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" }))
    });
  } else {
    let procentmp;

    // We don't know the name
    // But we have its index!

    // We loop over names.
    for (let i = 0; i < cnames.length; i++) {

      // When looping over a name we loop over each address to find a match. 
      for (let ii = 0; ii < caddresses.length; ii++) {

        // Found!
        if (caddresses[ii] == req.socket.remoteAddress) {
          procentmp = ii;
        }
      }
    }

    cwsockets.forEach(user => {
      // davidIRC has not got any type of filtering.
      // Therefore, browsers are vulnerable to malicious scripts.
      // If you really want protection serverside, do you own research.
      // If you're OK with clientside protection, the official site does not have it, but just filter the word "/script" or "script".
      user.send("::MSG/" + cnames[procentmp] + "::" + data);
    });
    ws.send("101");
  }
}

function sendAccepted(ws, req) {
  console.log("[CONN] Accepted client connection: " + req.socket.remoteAddress + ".\nWaiting for auth packet next.");
  ws.send("200");
}

function initializeServer(server) {
  server.listen(config.port);
  console.log("--- Server started! ---")
}
//FUNCTIONS//


//MAIN CODE//
wss.on('connection', function connection(ws, req) {

  //Init message distribution for new client
  ws.on('message', function message(data) {
    distributeMessage(ws, data, req);
  });

  ws.on('close', function closeclient() {
    console.log("[CLOS] Client " + req.socket.remoteAddress + " left.");

    // That's not all, we have to notify our folks:
    let procentmpc;

    // We don't know the name
    // But we have its index!

    // We loop over names.
    for (let i = 0; i < cnames.length; i++) {

      // When looping over a name we loop over each address to find a match. 
      for (let ii = 0; ii < caddresses.length; ii++) {

        // Found!
        if (caddresses[ii] == req.socket.remoteAddress) {
          procentmpc = ii;
        }
      }
    }

    cwsockets.forEach(user => {
      user.send("::ANN->User " + cnames[procentmpc] + " just disconnected...");
      user.send("::ANN->Current Server Time: " + new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" }))
    });

    // I just like to clean the name and address, since that's all that
    // the server needs to NOT break, since it uses .includes()
    //
    // I've also made a (or tried to) solution that doesn't straight up make memory fully occupied
    caddresses.splice(procentmpc, 1);
    cnames.splice(procentmpc, 1);
  });

  sendAccepted(ws, req); // Send back that it's connection has been accepted and recieved
  // Also 200 (Waiting for 1st Packet)
});

initializeServer(server); // Start server