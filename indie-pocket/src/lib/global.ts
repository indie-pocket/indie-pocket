import {isAndroid} from "tns-core-modules/platform"
import {Log} from "~/lib/log";

// Everybody loves globals! It's mostly application-wide parameters that the user will
// not change but we're not sure yet what these parameters should be.
// The 'debug' variable helps to prevent debug-code hanging around in the code.

// The Version comes from the package.json!
export let serverURL = "wss://indie.c4dt.org";
export let debugPoints = false;
export let gameButtons = 60;
export let appKey = isAndroid ? "d7yGtIEZhJaUutyDNauWgz1TVhyb4qfwV0PFE" :
    "GXDYYaX3hnGXCZkKQm921Rh7D3wc4qfwV0PFE";
export let dropDB = false;

export const debug = false;
if (debug) {
    Log.lvl = 2;
    serverURL = "ws://192.168.100.1:5678";
    gameButtons = 2;
    // dropDB = true;
    // debugPoints = true;
}
