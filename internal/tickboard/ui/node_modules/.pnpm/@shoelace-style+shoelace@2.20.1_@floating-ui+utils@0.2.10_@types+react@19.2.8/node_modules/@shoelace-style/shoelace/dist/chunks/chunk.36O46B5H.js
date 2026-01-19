import {
  spinner_styles_default
} from "./chunk.7DUCI5S4.js";
import {
  LocalizeController
} from "./chunk.6CTB5ZDJ.js";
import {
  component_styles_default
} from "./chunk.TUVJKY7S.js";
import {
  ShoelaceElement
} from "./chunk.4TUIT776.js";

// src/components/spinner/spinner.component.ts
import { html } from "lit";
var SlSpinner = class extends ShoelaceElement {
  constructor() {
    super(...arguments);
    this.localize = new LocalizeController(this);
  }
  render() {
    return html`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `;
  }
};
SlSpinner.styles = [component_styles_default, spinner_styles_default];

export {
  SlSpinner
};
