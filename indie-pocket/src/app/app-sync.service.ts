import {Injectable} from '@angular/core';
import {appKey, debug, staging} from "~/lib/global";
import * as application from "tns-core-modules/application";
import {AppSync, InstallMode} from "nativescript-app-sync";
import * as pkg from "../../package.json";
import {Log} from "~/lib/log";

/**
 * AppsyncService connects to the nativescript-appsync service and adds a 'block' variable
 * that can be used to avoid the app to restart during a measurement.
 * It also proposes a fuller 'Version' including the label of the update.
 */
@Injectable({
    providedIn: 'root'
})
export class AppSyncService {
    public block = false;
    public label: string | undefined;

    constructor() {
    }

    getVersion(): string {
        const ver = pkg.nativescript.version;
        let verStr = (this.label === undefined || this.label.length === 0) ? ver : ver + `-${this.label}`;
        verStr += (staging ? "-s7" : "");
        verStr += (debug ? " DEBUG" : "");
        return verStr;
    }

    public init() {
        application.on(application.resumeEvent, () => {
            if (!this.block) {
                AppSync.sync({
                    deploymentKey: appKey,
                    updateDialog: {
                        optionalUpdateMessage: "An updated version of the app is available",
                        updateTitle: "Automatic update",
                        optionalInstallButtonLabel: "Install",
                        optionalIgnoreButtonLabel: "Not Now",
                        mandatoryContinueButtonLabel: "Continue",
                        appendReleaseDescription: true,
                    },
                    installMode: InstallMode.IMMEDIATE,
                }, (_, label) => {
                    this.label = label;
                });
            }
        });
    }
}
