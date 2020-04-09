// this import should be first in order to load some required settings (like globals and reflect-metadata)
import {platformNativeScriptDynamic} from "nativescript-angular/platform";
import {ios} from "tns-core-modules/application";
import {isIOS} from "tns-core-modules/platform";

import {AppModule} from "./app/app.module";
import {Log} from "~/lib/log";

if (isIOS) {
    class CustomAppDelegate extends UIResponder implements UIApplicationDelegate {
        public static ObjCProtocols = [UIApplicationDelegate];
        public static ObjCExposedMethods = {
            "runOnBackground": {returns: interop.types.void}
        };

        private bgTask;
        private timer;

        public applicationDidEnterBackground(application: UIApplication) {
            Log.print("Enter background");
            this.bgTask = application.beginBackgroundTaskWithNameExpirationHandler("MyTask", () => {
                this.endBackgroundTask();
            });

        }

        private endBackgroundTask(): void {
            Log.print("endBackgroundTask");
            if (this.timer) {
                this.timer.invalidate();
                this.timer = null;
            }
            UIApplication.sharedApplication.endBackgroundTask(this.bgTask);
            this.bgTask = UIBackgroundTaskInvalid;
            Log.print("End of background task.");
        }
    }

    ios.delegate = CustomAppDelegate;
}

// A traditional NativeScript application starts by initializing global objects,
// setting up global CSS rules, creating, and navigating to the main page.
// Angular applications need to take care of their own initialization:
// modules, components, directives, routes, DI providers.
// A NativeScript Angular app needs to make both paradigms work together,
// so we provide a wrapper platform object, platformNativeScriptDynamic,
// that sets up a NativeScript application and can bootstrap the Angular framework.
platformNativeScriptDynamic().bootstrapModule(AppModule);
