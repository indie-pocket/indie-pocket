import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";
import { NativeScriptModule } from "nativescript-angular/nativescript.module";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { MainComponent } from './main/main.component';
import { DebugComponent } from './debug/debug.component';
import {NativeScriptUIChartModule} from "nativescript-ui-chart/angular";
import { FeedbackComponent } from './feedback/feedback.component';
import {InsomniaComponent} from "~/app/insomnia/insomnia.component";
import {ChooseComponent} from "~/app/choose/choose.component";
import {UploadComponent} from "~/app/upload/upload.component";

// Uncomment and add to NgModule imports if you need to use two-way binding
// import { NativeScriptFormsModule } from "nativescript-angular/forms";

// Uncomment and add to NgModule imports if you need to use the HttpClient wrapper
// import { NativeScriptHttpClientModule } from "nativescript-angular/http-client";

@NgModule({
    bootstrap: [
        AppComponent
    ],
    imports: [
        NativeScriptModule,
        NativeScriptUIChartModule,
        AppRoutingModule
    ],
    declarations: [
        AppComponent,
        MainComponent,
        DebugComponent,
        FeedbackComponent,
        InsomniaComponent,
        ChooseComponent,
        UploadComponent,
    ],
    providers: [],
    schemas: [
        NO_ERRORS_SCHEMA
    ]
})
/*
Pass your application module to the bootstrapModule function located in main.ts to start your app
*/
export class AppModule { }
