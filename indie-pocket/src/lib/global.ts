import {isAndroid} from "tns-core-modules/platform"
import {Log} from "~/lib/log";
import * as pkg from "../../package.json"

// Everybody loves globals! It's mostly application-wide parameters that the user will
// not change but we're not sure yet what these parameters should be.
// The 'debug' variable helps to prevent debug-code hanging around in the code.

// The Version comes from the package.json!
export let serverURL = "wss://indie.c4dt.org";
export let gameButtons = 60;
export let appKey = isAndroid ? "d7yGtIEZhJaUutyDNauWgz1TVhyb4qfwV0PFE" :
    "GXDYYaX3hnGXCZkKQm921Rh7D3wc4qfwV0PFE";
if (pkg.nativescript.staging){
    appKey = isAndroid ? "h57DfAlbJFCAKpaJtOmo9lbPdvXB4qfwV0PFE" :
        "v0g7wIBIdKU7uDJoW86EJP9yJP1y4qfwV0PFE";
}

interface IDebugOpt {
    dropDB?: boolean;
    showDT?: boolean;
    startCheckSleep?: boolean;
    showRecordings?: boolean;
}
export const debugOpt: IDebugOpt = {};
export const staging = pkg.nativescript.staging;

export const debug = pkg.nativescript.debug;
if (debug) {
    // debugOpt.dropDB = true;
    // debugOpt.showDT = true;
    // debugOpt.startCheckSleep = true;
    // debugOpt.showRecordings = true;
    Log.lvl = 2;
    // serverURL = "ws://192.168.100.1:5678";
    gameButtons = 2;
}
