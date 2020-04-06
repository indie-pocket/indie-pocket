// The Version comes from the package.json!
export let Version = "0.4.1";
export let serverURL = "ws://indie.c4dt.org:5678";
export let debugPoints = false;
export let gameButtons = 60;

export const debug = false;
if (debug) {
    // serverURL = "ws://192.168.100.1:5678";
    Version += " DEBUG";
    gameButtons = 2;
    // debugPoints = true;
}
