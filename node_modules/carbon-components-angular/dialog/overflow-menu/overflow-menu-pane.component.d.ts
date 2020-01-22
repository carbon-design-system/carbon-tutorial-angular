/*!
 *
 * carbon-angular v0.0.0 | overflow-menu-pane.component.d.ts
 *
 * Copyright 2014, 2019 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { ElementRef, AfterViewInit } from "@angular/core";
import { Dialog } from "../dialog.component";
import { I18n } from "./../../i18n/i18n.module";
import { ExperimentalService } from "./../../experimental.module";
/**
 * Extend the `Dialog` component to create an overflow menu.
 *
 * Not used directly. See overflow-menu.component and overflow-menu.directive for more
 */
export declare class OverflowMenuPane extends Dialog implements AfterViewInit {
    protected elementRef: ElementRef;
    protected i18n: I18n;
    protected experimental: ExperimentalService;
    constructor(elementRef: ElementRef, i18n: I18n, experimental: ExperimentalService);
    onDialogInit(): void;
    hostkeys(event: KeyboardEvent): void;
    afterDialogViewInit(): void;
    protected listItems(): HTMLElement[];
}
