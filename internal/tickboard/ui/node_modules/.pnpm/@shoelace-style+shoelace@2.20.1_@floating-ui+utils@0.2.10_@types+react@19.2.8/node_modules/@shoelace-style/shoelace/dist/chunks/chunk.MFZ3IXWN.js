import {
  menu_label_styles_default
} from "./chunk.ORTZCIID.js";
import {
  component_styles_default
} from "./chunk.TUVJKY7S.js";
import {
  ShoelaceElement
} from "./chunk.4TUIT776.js";

// src/components/menu-label/menu-label.component.ts
import { html } from "lit";
var SlMenuLabel = class extends ShoelaceElement {
  render() {
    return html` <slot part="base" class="menu-label"></slot> `;
  }
};
SlMenuLabel.styles = [component_styles_default, menu_label_styles_default];

export {
  SlMenuLabel
};
