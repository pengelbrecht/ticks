import {
  visually_hidden_styles_default
} from "./chunk.YKKSQ2FG.js";
import {
  component_styles_default
} from "./chunk.TUVJKY7S.js";
import {
  ShoelaceElement
} from "./chunk.4TUIT776.js";

// src/components/visually-hidden/visually-hidden.component.ts
import { html } from "lit";
var SlVisuallyHidden = class extends ShoelaceElement {
  render() {
    return html` <slot></slot> `;
  }
};
SlVisuallyHidden.styles = [component_styles_default, visually_hidden_styles_default];

export {
  SlVisuallyHidden
};
