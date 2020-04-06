import {isAndroid} from "tns-core-modules/platform"

// The Version comes from the package.json!
export let Version = "0.4.5";
export let serverURL = "wss://indie.c4dt.org";
export let debugPoints = false;
export let gameButtons = 60;
export let appKey = isAndroid ? "d7yGtIEZhJaUutyDNauWgz1TVhyb4qfwV0PFE" :
    "GXDYYaX3hnGXCZkKQm921Rh7D3wc4qfwV0PFE";

export const debug = false;
if (debug) {
    // serverURL = "ws://192.168.100.1:5678";
    Version += " DEBUG";
    gameButtons = 2;
    // debugPoints = true;
}
