import {Component} from "@angular/core";
import * as application from "tns-core-modules/application";
import {AppSync, InstallMode} from "nativescript-app-sync";
import {appKey} from "~/lib/global";


@Component({
    selector: "ns-app",
    templateUrl: "./app.component.html"
})
export class AppComponent {
}

// add this in some central place that's executed once in a lifecycle
application.on(application.resumeEvent, () => {
    AppSync.sync({
        deploymentKey: appKey,
        installMode: InstallMode.ON_NEXT_RESUME,
    });
});
