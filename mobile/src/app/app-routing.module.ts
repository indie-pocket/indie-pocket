import {NgModule} from "@angular/core";
import {NativeScriptRouterModule} from "nativescript-angular/router";
import {Routes} from "@angular/router";

import {MainComponent} from "~/app/main/main.component";
import {MeasureComponent} from "~/app/measure/measure.component";
import {DebugComponent} from "~/app/debug/debug.component";
import {ItemsComponent} from "~/app/item/items.component";

const routes: Routes = [
    {path: "", redirectTo: "/main", pathMatch: "full"},
    {path: "item", component: ItemsComponent},
    {path: "debug", component: DebugComponent},
    {path: "main", component: MainComponent},
    {path: "measure", component: MeasureComponent}
];

@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes)],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {
}