import {Injectable} from '@angular/core';
import {appKey, debug} from "~/lib/global";
import * as application from "tns-core-modules/application";
import {AppSync, InstallMode} from "nativescript-app-sync";
import * as pkg from "../../package.json";

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
        const verStr = (!this.label || this.label.length === 0) ? ver : ver + `${-this.label}`;
        return verStr + (debug ? " DEBUG" : "");
    }

    public init() {
        application.on(application.resumeEvent, () => {
            if (!this.block) {
                AppSync.sync({
                    deploymentKey: appKey,
                    installMode: InstallMode.ON_NEXT_RESUME,
                }, (_, label) => {
                    this.label = label;
                });
            }
        });
    }
}
