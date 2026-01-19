import {
  blurActiveElement
} from "./chunk.LD4M4QGE.js";
import {
  SlIconButton
} from "./chunk.7E4JTYWU.js";
import {
  getAnimation,
  setDefaultAnimation
} from "./chunk.K7JGTRV7.js";
import {
  waitForEvent
} from "./chunk.B4BZKR24.js";
import {
  animateTo,
  stopAnimations
} from "./chunk.AJ3ENQ5C.js";
import {
  HasSlotController
} from "./chunk.NYIIDP5N.js";
import {
  LocalizeController
} from "./chunk.6CTB5ZDJ.js";
import {
  alert_styles_default
} from "./chunk.HPCLRZ2S.js";
import {
  watch
} from "./chunk.GMYPQTFK.js";
import {
  component_styles_default
} from "./chunk.TUVJKY7S.js";
import {
  ShoelaceElement
} from "./chunk.4TUIT776.js";
import {
  __decorateClass
} from "./chunk.KAW7D32O.js";

// src/components/alert/alert.component.ts
import { classMap } from "lit/directives/class-map.js";
import { html } from "lit";
import { property, query, state } from "lit/decorators.js";
var _SlAlert = class _SlAlert extends ShoelaceElement {
  constructor() {
    super(...arguments);
    this.hasSlotController = new HasSlotController(this, "icon", "suffix");
    this.localize = new LocalizeController(this);
    this.open = false;
    this.closable = false;
    this.variant = "primary";
    this.duration = Infinity;
    this.remainingTime = this.duration;
  }
  static get toastStack() {
    if (!this.currentToastStack) {
      this.currentToastStack = Object.assign(document.createElement("div"), {
        className: "sl-toast-stack"
      });
    }
    return this.currentToastStack;
  }
  firstUpdated() {
    this.base.hidden = !this.open;
  }
  restartAutoHide() {
    this.handleCountdownChange();
    clearTimeout(this.autoHideTimeout);
    clearInterval(this.remainingTimeInterval);
    if (this.open && this.duration < Infinity) {
      this.autoHideTimeout = window.setTimeout(() => this.hide(), this.duration);
      this.remainingTime = this.duration;
      this.remainingTimeInterval = window.setInterval(() => {
        this.remainingTime -= 100;
      }, 100);
    }
  }
  pauseAutoHide() {
    var _a;
    (_a = this.countdownAnimation) == null ? void 0 : _a.pause();
    clearTimeout(this.autoHideTimeout);
    clearInterval(this.remainingTimeInterval);
  }
  resumeAutoHide() {
    var _a;
    if (this.duration < Infinity) {
      this.autoHideTimeout = window.setTimeout(() => this.hide(), this.remainingTime);
      this.remainingTimeInterval = window.setInterval(() => {
        this.remainingTime -= 100;
      }, 100);
      (_a = this.countdownAnimation) == null ? void 0 : _a.play();
    }
  }
  handleCountdownChange() {
    if (this.open && this.duration < Infinity && this.countdown) {
      const { countdownElement } = this;
      const start = "100%";
      const end = "0";
      this.countdownAnimation = countdownElement.animate([{ width: start }, { width: end }], {
        duration: this.duration,
        easing: "linear"
      });
    }
  }
  handleCloseClick() {
    this.hide();
  }
  async handleOpenChange() {
    if (this.open) {
      this.emit("sl-show");
      if (this.duration < Infinity) {
        this.restartAutoHide();
      }
      await stopAnimations(this.base);
      this.base.hidden = false;
      const { keyframes, options } = getAnimation(this, "alert.show", { dir: this.localize.dir() });
      await animateTo(this.base, keyframes, options);
      this.emit("sl-after-show");
    } else {
      blurActiveElement(this);
      this.emit("sl-hide");
      clearTimeout(this.autoHideTimeout);
      clearInterval(this.remainingTimeInterval);
      await stopAnimations(this.base);
      const { keyframes, options } = getAnimation(this, "alert.hide", { dir: this.localize.dir() });
      await animateTo(this.base, keyframes, options);
      this.base.hidden = true;
      this.emit("sl-after-hide");
    }
  }
  handleDurationChange() {
    this.restartAutoHide();
  }
  /** Shows the alert. */
  async show() {
    if (this.open) {
      return void 0;
    }
    this.open = true;
    return waitForEvent(this, "sl-after-show");
  }
  /** Hides the alert */
  async hide() {
    if (!this.open) {
      return void 0;
    }
    this.open = false;
    return waitForEvent(this, "sl-after-hide");
  }
  /**
   * Displays the alert as a toast notification. This will move the alert out of its position in the DOM and, when
   * dismissed, it will be removed from the DOM completely. By storing a reference to the alert, you can reuse it by
   * calling this method again. The returned promise will resolve after the alert is hidden.
   */
  async toast() {
    return new Promise((resolve) => {
      this.handleCountdownChange();
      if (_SlAlert.toastStack.parentElement === null) {
        document.body.append(_SlAlert.toastStack);
      }
      _SlAlert.toastStack.appendChild(this);
      requestAnimationFrame(() => {
        this.clientWidth;
        this.show();
      });
      this.addEventListener(
        "sl-after-hide",
        () => {
          _SlAlert.toastStack.removeChild(this);
          resolve();
          if (_SlAlert.toastStack.querySelector("sl-alert") === null) {
            _SlAlert.toastStack.remove();
          }
        },
        { once: true }
      );
    });
  }
  render() {
    return html`
      <div
        part="base"
        class=${classMap({
      alert: true,
      "alert--open": this.open,
      "alert--closable": this.closable,
      "alert--has-countdown": !!this.countdown,
      "alert--has-icon": this.hasSlotController.test("icon"),
      "alert--primary": this.variant === "primary",
      "alert--success": this.variant === "success",
      "alert--neutral": this.variant === "neutral",
      "alert--warning": this.variant === "warning",
      "alert--danger": this.variant === "danger"
    })}
        role="alert"
        aria-hidden=${this.open ? "false" : "true"}
        @mouseenter=${this.pauseAutoHide}
        @mouseleave=${this.resumeAutoHide}
      >
        <div part="icon" class="alert__icon">
          <slot name="icon"></slot>
        </div>

        <div part="message" class="alert__message" aria-live="polite">
          <slot></slot>
        </div>

        ${this.closable ? html`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                class="alert__close-button"
                name="x-lg"
                library="system"
                label=${this.localize.term("close")}
                @click=${this.handleCloseClick}
              ></sl-icon-button>
            ` : ""}

        <div role="timer" class="alert__timer">${this.remainingTime}</div>

        ${this.countdown ? html`
              <div
                class=${classMap({
      alert__countdown: true,
      "alert__countdown--ltr": this.countdown === "ltr"
    })}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            ` : ""}
      </div>
    `;
  }
};
_SlAlert.styles = [component_styles_default, alert_styles_default];
_SlAlert.dependencies = { "sl-icon-button": SlIconButton };
__decorateClass([
  query('[part~="base"]')
], _SlAlert.prototype, "base", 2);
__decorateClass([
  query(".alert__countdown-elapsed")
], _SlAlert.prototype, "countdownElement", 2);
__decorateClass([
  property({ type: Boolean, reflect: true })
], _SlAlert.prototype, "open", 2);
__decorateClass([
  property({ type: Boolean, reflect: true })
], _SlAlert.prototype, "closable", 2);
__decorateClass([
  property({ reflect: true })
], _SlAlert.prototype, "variant", 2);
__decorateClass([
  property({ type: Number })
], _SlAlert.prototype, "duration", 2);
__decorateClass([
  property({ type: String, reflect: true })
], _SlAlert.prototype, "countdown", 2);
__decorateClass([
  state()
], _SlAlert.prototype, "remainingTime", 2);
__decorateClass([
  watch("open", { waitUntilFirstUpdate: true })
], _SlAlert.prototype, "handleOpenChange", 1);
__decorateClass([
  watch("duration")
], _SlAlert.prototype, "handleDurationChange", 1);
var SlAlert = _SlAlert;
setDefaultAnimation("alert.show", {
  keyframes: [
    { opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1 }
  ],
  options: { duration: 250, easing: "ease" }
});
setDefaultAnimation("alert.hide", {
  keyframes: [
    { opacity: 1, scale: 1 },
    { opacity: 0, scale: 0.8 }
  ],
  options: { duration: 250, easing: "ease" }
});

export {
  SlAlert
};
