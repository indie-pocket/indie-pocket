import * as application from "tns-core-modules/application";
import {AppSync, InstallMode} from "nativescript-app-sync";

import {isAndroid} from "tns-core-modules/platform"

// The Version comes from the package.json!
export let Version = "0.4.9";
export let serverURL = "wss://indie.c4dt.org";
export let debugPoints = false;
export let gameButtons = 60;
export let appKey = isAndroid ? "d7yGtIEZhJaUutyDNauWgz1TVhyb4qfwV0PFE" :
    "GXDYYaX3hnGXCZkKQm921Rh7D3wc4qfwV0PFE";

export const debug = false;
if (debug) {
    serverURL = "ws://192.168.100.1:5678";
    Version += " DEBUG";
    gameButtons = 2;
    // debugPoints = true;
}

export class Update {
    public static block = false;

    public static init() {
        application.on(application.resumeEvent, () => {
            if (!this.block) {
                AppSync.sync({
                    deploymentKey: appKey,
                    installMode: InstallMode.ON_NEXT_RESUME,
                }, (_, label) => {
                    if (label !== undefined) {
                        Version = "0.4.9";
                    }
                });
            }
        });
    }
}

Update.init();
