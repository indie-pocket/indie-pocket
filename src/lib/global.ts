// The Version comes from the package.json!
export let Version = "0.4.3";
export let serverURL = "wss://indie.c4dt.org";
export let debugPoints = false;
export let gameButtons = 60;

export const debug = false;
if (debug) {
    // serverURL = "ws://192.168.100.1:5678";
    Version += " DEBUG";
    gameButtons = 2;
    // debugPoints = true;
}
