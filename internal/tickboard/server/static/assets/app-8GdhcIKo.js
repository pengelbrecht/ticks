var xr=Object.defineProperty;var _r=(e,t,i)=>t in e?xr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var M=(e,t,i)=>_r(e,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(o){if(o.ep)return;o.ep=!0;const r=i(o);fetch(o.href,r)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ci=globalThis,ps=ci.ShadowRoot&&(ci.ShadyCSS===void 0||ci.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,ms=Symbol(),Hs=new WeakMap;let Io=class{constructor(t,i,s){if(this._$cssResult$=!0,s!==ms)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=i}get styleSheet(){let t=this.o;const i=this.t;if(ps&&t===void 0){const s=i!==void 0&&i.length===1;s&&(t=Hs.get(i)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Hs.set(i,t))}return t}toString(){return this.cssText}};const $r=e=>new Io(typeof e=="string"?e:e+"",void 0,ms),C=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((s,o,r)=>s+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+e[r+1],e[0]);return new Io(i,e,ms)},Cr=(e,t)=>{if(ps)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const s=document.createElement("style"),o=ci.litNonce;o!==void 0&&s.setAttribute("nonce",o),s.textContent=i.cssText,e.appendChild(s)}},js=ps?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const s of t.cssRules)i+=s.cssText;return $r(i)})(e):e;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Sr,defineProperty:Tr,getOwnPropertyDescriptor:Er,getOwnPropertyNames:Ar,getOwnPropertySymbols:zr,getPrototypeOf:Rr}=Object,Ye=globalThis,Us=Ye.trustedTypes,Ir=Us?Us.emptyScript:"",Fi=Ye.reactiveElementPolyfillSupport,jt=(e,t)=>e,kt={toAttribute(e,t){switch(t){case Boolean:e=e?Ir:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},fs=(e,t)=>!Sr(e,t),Vs={attribute:!0,type:String,converter:kt,reflect:!1,useDefault:!1,hasChanged:fs};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),Ye.litPropertyMetadata??(Ye.litPropertyMetadata=new WeakMap);let vt=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,i=Vs){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(t,i),!i.noAccessor){const s=Symbol(),o=this.getPropertyDescriptor(t,s,i);o!==void 0&&Tr(this.prototype,t,o)}}static getPropertyDescriptor(t,i,s){const{get:o,set:r}=Er(this.prototype,t)??{get(){return this[i]},set(a){this[i]=a}};return{get:o,set(a){const n=o==null?void 0:o.call(this);r==null||r.call(this,a),this.requestUpdate(t,n,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Vs}static _$Ei(){if(this.hasOwnProperty(jt("elementProperties")))return;const t=Rr(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(jt("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(jt("properties"))){const i=this.properties,s=[...Ar(i),...zr(i)];for(const o of s)this.createProperty(o,i[o])}const t=this[Symbol.metadata];if(t!==null){const i=litPropertyMetadata.get(t);if(i!==void 0)for(const[s,o]of i)this.elementProperties.set(s,o)}this._$Eh=new Map;for(const[i,s]of this.elementProperties){const o=this._$Eu(i,s);o!==void 0&&this._$Eh.set(o,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const i=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const o of s)i.unshift(js(o))}else t!==void 0&&i.push(js(t));return i}static _$Eu(t,i){const s=i.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(i=>i(this))}addController(t){var i;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((i=t.hostConnected)==null||i.call(t))}removeController(t){var i;(i=this._$EO)==null||i.delete(t)}_$E_(){const t=new Map,i=this.constructor.elementProperties;for(const s of i.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Cr(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(i=>{var s;return(s=i.hostConnected)==null?void 0:s.call(i)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(i=>{var s;return(s=i.hostDisconnected)==null?void 0:s.call(i)})}attributeChangedCallback(t,i,s){this._$AK(t,s)}_$ET(t,i){var r;const s=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,s);if(o!==void 0&&s.reflect===!0){const a=(((r=s.converter)==null?void 0:r.toAttribute)!==void 0?s.converter:kt).toAttribute(i,s.type);this._$Em=t,a==null?this.removeAttribute(o):this.setAttribute(o,a),this._$Em=null}}_$AK(t,i){var r,a;const s=this.constructor,o=s._$Eh.get(t);if(o!==void 0&&this._$Em!==o){const n=s.getPropertyOptions(o),c=typeof n.converter=="function"?{fromAttribute:n.converter}:((r=n.converter)==null?void 0:r.fromAttribute)!==void 0?n.converter:kt;this._$Em=o;const u=c.fromAttribute(i,n.type);this[o]=u??((a=this._$Ej)==null?void 0:a.get(o))??u,this._$Em=null}}requestUpdate(t,i,s,o=!1,r){var a;if(t!==void 0){const n=this.constructor;if(o===!1&&(r=this[t]),s??(s=n.getPropertyOptions(t)),!((s.hasChanged??fs)(r,i)||s.useDefault&&s.reflect&&r===((a=this._$Ej)==null?void 0:a.get(t))&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,i,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,i,{useDefault:s,reflect:o,wrapped:r},a){s&&!(this._$Ej??(this._$Ej=new Map)).has(t)&&(this._$Ej.set(t,a??i??this[t]),r!==!0||a!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(i=void 0),this._$AL.set(t,i)),o===!0&&this._$Em!==t&&(this._$Eq??(this._$Eq=new Set)).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,a]of this._$Ep)this[r]=a;this._$Ep=void 0}const o=this.constructor.elementProperties;if(o.size>0)for(const[r,a]of o){const{wrapped:n}=a,c=this[r];n!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,a,c)}}let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),(s=this._$EO)==null||s.forEach(o=>{var r;return(r=o.hostUpdate)==null?void 0:r.call(o)}),this.update(i)):this._$EM()}catch(o){throw t=!1,this._$EM(),o}t&&this._$AE(i)}willUpdate(t){}_$AE(t){var i;(i=this._$EO)==null||i.forEach(s=>{var o;return(o=s.hostUpdated)==null?void 0:o.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(t){}firstUpdated(t){}};vt.elementStyles=[],vt.shadowRootOptions={mode:"open"},vt[jt("elementProperties")]=new Map,vt[jt("finalized")]=new Map,Fi==null||Fi({ReactiveElement:vt}),(Ye.reactiveElementVersions??(Ye.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ut=globalThis,qs=e=>e,pi=Ut.trustedTypes,Ws=pi?pi.createPolicy("lit-html",{createHTML:e=>e}):void 0,Oo="$lit$",Xe=`lit$${Math.random().toFixed(9).slice(2)}$`,Po="?"+Xe,Or=`<${Po}>`,ht=document,Gt=()=>ht.createComment(""),Zt=e=>e===null||typeof e!="object"&&typeof e!="function",bs=Array.isArray,Pr=e=>bs(e)||typeof(e==null?void 0:e[Symbol.iterator])=="function",Hi=`[ 	
\f\r]`,Ot=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ks=/-->/g,Gs=/>/g,nt=RegExp(`>|${Hi}(?:([^\\s"'>=/]+)(${Hi}*=${Hi}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Zs=/'/g,Xs=/"/g,Lo=/^(?:script|style|textarea|title)$/i,Lr=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),h=Lr(1),ye=Symbol.for("lit-noChange"),g=Symbol.for("lit-nothing"),Ys=new WeakMap,dt=ht.createTreeWalker(ht,129);function Do(e,t){if(!bs(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ws!==void 0?Ws.createHTML(t):t}const Dr=(e,t)=>{const i=e.length-1,s=[];let o,r=t===2?"<svg>":t===3?"<math>":"",a=Ot;for(let n=0;n<i;n++){const c=e[n];let u,p,f=-1,b=0;for(;b<c.length&&(a.lastIndex=b,p=a.exec(c),p!==null);)b=a.lastIndex,a===Ot?p[1]==="!--"?a=Ks:p[1]!==void 0?a=Gs:p[2]!==void 0?(Lo.test(p[2])&&(o=RegExp("</"+p[2],"g")),a=nt):p[3]!==void 0&&(a=nt):a===nt?p[0]===">"?(a=o??Ot,f=-1):p[1]===void 0?f=-2:(f=a.lastIndex-p[2].length,u=p[1],a=p[3]===void 0?nt:p[3]==='"'?Xs:Zs):a===Xs||a===Zs?a=nt:a===Ks||a===Gs?a=Ot:(a=nt,o=void 0);const m=a===nt&&e[n+1].startsWith("/>")?" ":"";r+=a===Ot?c+Or:f>=0?(s.push(u),c.slice(0,f)+Oo+c.slice(f)+Xe+m):c+Xe+(f===-2?n:m)}return[Do(e,r+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]};let Ji=class Mo{constructor({strings:t,_$litType$:i},s){let o;this.parts=[];let r=0,a=0;const n=t.length-1,c=this.parts,[u,p]=Dr(t,i);if(this.el=Mo.createElement(u,s),dt.currentNode=this.el.content,i===2||i===3){const f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(o=dt.nextNode())!==null&&c.length<n;){if(o.nodeType===1){if(o.hasAttributes())for(const f of o.getAttributeNames())if(f.endsWith(Oo)){const b=p[a++],m=o.getAttribute(f).split(Xe),y=/([.?@])?(.*)/.exec(b);c.push({type:1,index:r,name:y[2],strings:m,ctor:y[1]==="."?Br:y[1]==="?"?Nr:y[1]==="@"?Fr:$i}),o.removeAttribute(f)}else f.startsWith(Xe)&&(c.push({type:6,index:r}),o.removeAttribute(f));if(Lo.test(o.tagName)){const f=o.textContent.split(Xe),b=f.length-1;if(b>0){o.textContent=pi?pi.emptyScript:"";for(let m=0;m<b;m++)o.append(f[m],Gt()),dt.nextNode(),c.push({type:2,index:++r});o.append(f[b],Gt())}}}else if(o.nodeType===8)if(o.data===Po)c.push({type:2,index:r});else{let f=-1;for(;(f=o.data.indexOf(Xe,f+1))!==-1;)c.push({type:7,index:r}),f+=Xe.length-1}r++}}static createElement(t,i){const s=ht.createElement("template");return s.innerHTML=t,s}};function xt(e,t,i=e,s){var a,n;if(t===ye)return t;let o=s!==void 0?(a=i._$Co)==null?void 0:a[s]:i._$Cl;const r=Zt(t)?void 0:t._$litDirective$;return(o==null?void 0:o.constructor)!==r&&((n=o==null?void 0:o._$AO)==null||n.call(o,!1),r===void 0?o=void 0:(o=new r(e),o._$AT(e,i,s)),s!==void 0?(i._$Co??(i._$Co=[]))[s]=o:i._$Cl=o),o!==void 0&&(t=xt(e,o._$AS(e,t.values),o,s)),t}class Mr{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,o=((t==null?void 0:t.creationScope)??ht).importNode(i,!0);dt.currentNode=o;let r=dt.nextNode(),a=0,n=0,c=s[0];for(;c!==void 0;){if(a===c.index){let u;c.type===2?u=new gs(r,r.nextSibling,this,t):c.type===1?u=new c.ctor(r,c.name,c.strings,this,t):c.type===6&&(u=new Hr(r,this,t)),this._$AV.push(u),c=s[++n]}a!==(c==null?void 0:c.index)&&(r=dt.nextNode(),a++)}return dt.currentNode=ht,o}p(t){let i=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++}}let gs=class Bo{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,i,s,o){this.type=2,this._$AH=g,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=o,this._$Cv=(o==null?void 0:o.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=xt(this,t,i),Zt(t)?t===g||t==null||t===""?(this._$AH!==g&&this._$AR(),this._$AH=g):t!==this._$AH&&t!==ye&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Pr(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==g&&Zt(this._$AH)?this._$AA.nextSibling.data=t:this.T(ht.createTextNode(t)),this._$AH=t}$(t){var r;const{values:i,_$litType$:s}=t,o=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=Ji.createElement(Do(s.h,s.h[0]),this.options)),s);if(((r=this._$AH)==null?void 0:r._$AD)===o)this._$AH.p(i);else{const a=new Mr(o,this),n=a.u(this.options);a.p(i),this.T(n),this._$AH=a}}_$AC(t){let i=Ys.get(t.strings);return i===void 0&&Ys.set(t.strings,i=new Ji(t)),i}k(t){bs(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,o=0;for(const r of t)o===i.length?i.push(s=new Bo(this.O(Gt()),this.O(Gt()),this,this.options)):s=i[o],s._$AI(r),o++;o<i.length&&(this._$AR(s&&s._$AB.nextSibling,o),i.length=o)}_$AR(t=this._$AA.nextSibling,i){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,i);t!==this._$AB;){const o=qs(t).nextSibling;qs(t).remove(),t=o}}setConnected(t){var i;this._$AM===void 0&&(this._$Cv=t,(i=this._$AP)==null||i.call(this,t))}};class $i{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,o,r){this.type=1,this._$AH=g,this._$AN=void 0,this.element=t,this.name=i,this._$AM=o,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=g}_$AI(t,i=this,s,o){const r=this.strings;let a=!1;if(r===void 0)t=xt(this,t,i,0),a=!Zt(t)||t!==this._$AH&&t!==ye,a&&(this._$AH=t);else{const n=t;let c,u;for(t=r[0],c=0;c<r.length-1;c++)u=xt(this,n[s+c],i,c),u===ye&&(u=this._$AH[c]),a||(a=!Zt(u)||u!==this._$AH[c]),u===g?t=g:t!==g&&(t+=(u??"")+r[c+1]),this._$AH[c]=u}a&&!o&&this.j(t)}j(t){t===g?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}let Br=class extends $i{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===g?void 0:t}},Nr=class extends $i{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==g)}},Fr=class extends $i{constructor(t,i,s,o,r){super(t,i,s,o,r),this.type=5}_$AI(t,i=this){if((t=xt(this,t,i,0)??g)===ye)return;const s=this._$AH,o=t===g&&s!==g||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==g&&(s===g||o);o&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,t):this._$AH.handleEvent(t)}},Hr=class{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){xt(this,t)}};const ji=Ut.litHtmlPolyfillSupport;ji==null||ji(Ji,gs),(Ut.litHtmlVersions??(Ut.litHtmlVersions=[])).push("3.3.2");const jr=(e,t,i)=>{const s=(i==null?void 0:i.renderBefore)??t;let o=s._$litPart$;if(o===void 0){const r=(i==null?void 0:i.renderBefore)??null;s._$litPart$=o=new gs(t.insertBefore(Gt(),r),r,void 0,i??{})}return o._$AI(e),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ut=globalThis;let J=class extends vt{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const t=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=t.firstChild),t}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=jr(i,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return ye}};var Ro;J._$litElement$=!0,J.finalized=!0,(Ro=ut.litElementHydrateSupport)==null||Ro.call(ut,{LitElement:J});const Ui=ut.litElementPolyfillSupport;Ui==null||Ui({LitElement:J});(ut.litElementVersions??(ut.litElementVersions=[])).push("4.2.2");var Ur=C`
  :host {
    --track-width: 2px;
    --track-color: rgb(128 128 128 / 25%);
    --indicator-color: var(--sl-color-primary-600);
    --speed: 2s;

    display: inline-flex;
    width: 1em;
    height: 1em;
    flex: none;
  }

  .spinner {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
  }

  .spinner__track,
  .spinner__indicator {
    fill: none;
    stroke-width: var(--track-width);
    r: calc(0.5em - var(--track-width) / 2);
    cx: 0.5em;
    cy: 0.5em;
    transform-origin: 50% 50%;
  }

  .spinner__track {
    stroke: var(--track-color);
    transform-origin: 0% 0%;
  }

  .spinner__indicator {
    stroke: var(--indicator-color);
    stroke-linecap: round;
    stroke-dasharray: 150% 75%;
    animation: spin var(--speed) linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
      stroke-dasharray: 0.05em, 3em;
    }

    50% {
      transform: rotate(450deg);
      stroke-dasharray: 1.375em, 1.375em;
    }

    100% {
      transform: rotate(1080deg);
      stroke-dasharray: 0.05em, 3em;
    }
  }
`;const Qi=new Set,yt=new Map;let ct,vs="ltr",ys="en";const No=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(No){const e=new MutationObserver(Ho);vs=document.documentElement.dir||"ltr",ys=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function Fo(...e){e.map(t=>{const i=t.$code.toLowerCase();yt.has(i)?yt.set(i,Object.assign(Object.assign({},yt.get(i)),t)):yt.set(i,t),ct||(ct=t)}),Ho()}function Ho(){No&&(vs=document.documentElement.dir||"ltr",ys=document.documentElement.lang||navigator.language),[...Qi.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let Vr=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){Qi.add(this.host)}hostDisconnected(){Qi.delete(this.host)}dir(){return`${this.host.dir||vs}`.toLowerCase()}lang(){return`${this.host.lang||ys}`.toLowerCase()}getTranslationData(t){var i,s;const o=new Intl.Locale(t.replace(/_/g,"-")),r=o==null?void 0:o.language.toLowerCase(),a=(s=(i=o==null?void 0:o.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&s!==void 0?s:"",n=yt.get(`${r}-${a}`),c=yt.get(r);return{locale:o,language:r,region:a,primary:n,secondary:c}}exists(t,i){var s;const{primary:o,secondary:r}=this.getTranslationData((s=i.lang)!==null&&s!==void 0?s:this.lang());return i=Object.assign({includeFallback:!1},i),!!(o&&o[t]||r&&r[t]||i.includeFallback&&ct&&ct[t])}term(t,...i){const{primary:s,secondary:o}=this.getTranslationData(this.lang());let r;if(s&&s[t])r=s[t];else if(o&&o[t])r=o[t];else if(ct&&ct[t])r=ct[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof r=="function"?r(...i):r}date(t,i){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),i).format(t)}number(t,i){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),i).format(t)}relativeTime(t,i,s){return new Intl.RelativeTimeFormat(this.lang(),s).format(t,i)}};var jo={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};Fo(jo);var qr=jo,se=class extends Vr{};Fo(qr);var j=C`
  :host {
    box-sizing: border-box;
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: inherit;
  }

  [hidden] {
    display: none !important;
  }
`,Uo=Object.defineProperty,Wr=Object.defineProperties,Kr=Object.getOwnPropertyDescriptor,Gr=Object.getOwnPropertyDescriptors,Js=Object.getOwnPropertySymbols,Zr=Object.prototype.hasOwnProperty,Xr=Object.prototype.propertyIsEnumerable,Vi=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),ws=e=>{throw TypeError(e)},Qs=(e,t,i)=>t in e?Uo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,qe=(e,t)=>{for(var i in t||(t={}))Zr.call(t,i)&&Qs(e,i,t[i]);if(Js)for(var i of Js(t))Xr.call(t,i)&&Qs(e,i,t[i]);return e},Yt=(e,t)=>Wr(e,Gr(t)),l=(e,t,i,s)=>{for(var o=s>1?void 0:s?Kr(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Uo(t,i,o),o},Vo=(e,t,i)=>t.has(e)||ws("Cannot "+i),Yr=(e,t,i)=>(Vo(e,t,"read from private field"),t.get(e)),Jr=(e,t,i)=>t.has(e)?ws("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),Qr=(e,t,i,s)=>(Vo(e,t,"write to private field"),t.set(e,i),i),ea=function(e,t){this[0]=e,this[1]=t},ta=e=>{var t=e[Vi("asyncIterator")],i=!1,s,o={};return t==null?(t=e[Vi("iterator")](),s=r=>o[r]=a=>t[r](a)):(t=t.call(e),s=r=>o[r]=a=>{if(i){if(i=!1,r==="throw")throw a;return a}return i=!0,{done:!1,value:new ea(new Promise(n=>{var c=t[r](a);c instanceof Object||ws("Object expected"),n(c)}),1)}}),o[Vi("iterator")]=()=>o,s("next"),"throw"in t?s("throw"):o.throw=r=>{throw r},"return"in t&&s("return"),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pe=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ia={attribute:!0,type:String,converter:kt,reflect:!1,hasChanged:fs},sa=(e=ia,t,i)=>{const{kind:s,metadata:o}=i;let r=globalThis.litPropertyMetadata.get(o);if(r===void 0&&globalThis.litPropertyMetadata.set(o,r=new Map),s==="setter"&&((e=Object.create(e)).wrapped=!0),r.set(i.name,e),s==="accessor"){const{name:a}=i;return{set(n){const c=t.get.call(this);t.set.call(this,n),this.requestUpdate(a,c,e,!0,n)},init(n){return n!==void 0&&this.C(a,void 0,e,n),n}}}if(s==="setter"){const{name:a}=i;return function(n){const c=this[a];t.call(this,n),this.requestUpdate(a,c,e,!0,n)}}throw Error("Unsupported decorator location: "+s)};function d(e){return(t,i)=>typeof i=="object"?sa(e,t,i):((s,o,r)=>{const a=o.hasOwnProperty(r);return o.constructor.createProperty(r,s),a?Object.getOwnPropertyDescriptor(o,r):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function v(e){return d({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function oa(e){return(t,i)=>{const s=typeof t=="function"?t:t[i];Object.assign(s,e)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ra=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function $(e,t){return(i,s,o)=>{const r=a=>{var n;return((n=a.renderRoot)==null?void 0:n.querySelector(e))??null};return ra(i,s,{get(){return r(this)}})}}var di,P=class extends J{constructor(){super(),Jr(this,di,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const i=new CustomEvent(e,qe({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(i),i}static define(e,t=this,i={}){const s=customElements.get(e);if(!s){try{customElements.define(e,t,i)}catch{customElements.define(e,class extends t{},i)}return}let o=" (unknown version)",r=o;"version"in t&&t.version&&(o=" v"+t.version),"version"in s&&s.version&&(r=" v"+s.version),!(o&&r&&o===r)&&console.warn(`Attempted to register <${e}>${o}, but <${e}>${r} has already been registered.`)}attributeChangedCallback(e,t,i){Yr(this,di)||(this.constructor.elementProperties.forEach((s,o)=>{s.reflect&&this[o]!=null&&this.initialReflectedProperties.set(o,this[o])}),Qr(this,di,!0)),super.attributeChangedCallback(e,t,i)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,i)=>{e.has(i)&&this[i]==null&&(this[i]=t)})}};di=new WeakMap;P.version="2.20.1";P.dependencies={};l([d()],P.prototype,"dir",2);l([d()],P.prototype,"lang",2);var Ci=class extends P{constructor(){super(...arguments),this.localize=new se(this)}render(){return h`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Ci.styles=[j,Ur];var Pt=new WeakMap,Lt=new WeakMap,Dt=new WeakMap,qi=new WeakSet,oi=new WeakMap,Jt=class{constructor(e,t){this.handleFormData=i=>{const s=this.options.disabled(this.host),o=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!s&&!a&&typeof o=="string"&&o.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(n=>{i.formData.append(o,n.toString())}):i.formData.append(o,r.toString()))},this.handleFormSubmit=i=>{var s;const o=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((s=Pt.get(this.form))==null||s.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!o&&!r(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),oi.set(this.host,[])},this.handleInteraction=i=>{const s=oi.get(this.host);s.includes(i.type)||s.push(i.type),s.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.checkValidity=="function"&&!s.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.reportValidity=="function"&&!s.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=qe({form:i=>{const s=i.form;if(s){const r=i.getRootNode().querySelector(`#${s}`);if(r)return r}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var s;return(s=i.disabled)!=null?s:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,s)=>i.value=s,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),oi.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),oi.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,Pt.has(this.form)?Pt.get(this.form).add(this.host):Pt.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Lt.has(this.form)||(Lt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Dt.has(this.form)||(Dt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=Pt.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Lt.has(this.form)&&(this.form.reportValidity=Lt.get(this.form),Lt.delete(this.form)),Dt.has(this.form)&&(this.form.checkValidity=Dt.get(this.form),Dt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?qi.add(e):qi.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const i=document.createElement("button");i.type=e,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",t&&(i.name=t.name,i.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(s=>{t.hasAttribute(s)&&i.setAttribute(s,t.getAttribute(s))})),this.form.append(i),i.click(),i.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,i=!!qi.has(t),s=!!t.required;t.toggleAttribute("data-required",s),t.toggleAttribute("data-optional",!s),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&i),t.toggleAttribute("data-user-valid",e&&i)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},ks=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(Yt(qe({},ks),{valid:!1,valueMissing:!0}));Object.freeze(Yt(qe({},ks),{valid:!1,customError:!0}));var aa=C`
  :host {
    display: inline-block;
    position: relative;
    width: auto;
    cursor: pointer;
  }

  .button {
    display: inline-flex;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    border-style: solid;
    border-width: var(--sl-input-border-width);
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-font-weight-semibold);
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    vertical-align: middle;
    padding: 0;
    transition:
      var(--sl-transition-x-fast) background-color,
      var(--sl-transition-x-fast) color,
      var(--sl-transition-x-fast) border,
      var(--sl-transition-x-fast) box-shadow;
    cursor: inherit;
  }

  .button::-moz-focus-inner {
    border: 0;
  }

  .button:focus {
    outline: none;
  }

  .button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* When disabled, prevent mouse events from bubbling up from children */
  .button--disabled * {
    pointer-events: none;
  }

  .button__prefix,
  .button__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .button__label {
    display: inline-block;
  }

  .button__label::slotted(sl-icon) {
    vertical-align: -2px;
  }

  /*
   * Standard buttons
   */

  /* Default */
  .button--standard.button--default {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--standard.button--default:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-300);
    color: var(--sl-color-primary-700);
  }

  .button--standard.button--default:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-100);
    border-color: var(--sl-color-primary-400);
    color: var(--sl-color-primary-700);
  }

  /* Primary */
  .button--standard.button--primary {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-500);
    border-color: var(--sl-color-primary-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--standard.button--success {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:hover:not(.button--disabled) {
    background-color: var(--sl-color-success-500);
    border-color: var(--sl-color-success-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:active:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--standard.button--neutral {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:hover:not(.button--disabled) {
    background-color: var(--sl-color-neutral-500);
    border-color: var(--sl-color-neutral-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:active:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--standard.button--warning {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }
  .button--standard.button--warning:hover:not(.button--disabled) {
    background-color: var(--sl-color-warning-500);
    border-color: var(--sl-color-warning-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--warning:active:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--standard.button--danger {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:hover:not(.button--disabled) {
    background-color: var(--sl-color-danger-500);
    border-color: var(--sl-color-danger-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:active:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /*
   * Outline buttons
   */

  .button--outline {
    background: none;
    border: solid 1px;
  }

  /* Default */
  .button--outline.button--default {
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--outline.button--default:hover:not(.button--disabled),
  .button--outline.button--default.button--checked:not(.button--disabled) {
    border-color: var(--sl-color-primary-600);
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--default:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Primary */
  .button--outline.button--primary {
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-primary-600);
  }

  .button--outline.button--primary:hover:not(.button--disabled),
  .button--outline.button--primary.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--primary:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--outline.button--success {
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-success-600);
  }

  .button--outline.button--success:hover:not(.button--disabled),
  .button--outline.button--success.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--success:active:not(.button--disabled) {
    border-color: var(--sl-color-success-700);
    background-color: var(--sl-color-success-700);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--outline.button--neutral {
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-600);
  }

  .button--outline.button--neutral:hover:not(.button--disabled),
  .button--outline.button--neutral.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--neutral:active:not(.button--disabled) {
    border-color: var(--sl-color-neutral-700);
    background-color: var(--sl-color-neutral-700);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--outline.button--warning {
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-warning-600);
  }

  .button--outline.button--warning:hover:not(.button--disabled),
  .button--outline.button--warning.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--warning:active:not(.button--disabled) {
    border-color: var(--sl-color-warning-700);
    background-color: var(--sl-color-warning-700);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--outline.button--danger {
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-danger-600);
  }

  .button--outline.button--danger:hover:not(.button--disabled),
  .button--outline.button--danger.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--danger:active:not(.button--disabled) {
    border-color: var(--sl-color-danger-700);
    background-color: var(--sl-color-danger-700);
    color: var(--sl-color-neutral-0);
  }

  @media (forced-colors: active) {
    .button.button--outline.button--checked:not(.button--disabled) {
      outline: solid 2px transparent;
    }
  }

  /*
   * Text buttons
   */

  .button--text {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-600);
  }

  .button--text:hover:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:focus-visible:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:active:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-700);
  }

  /*
   * Size modifiers
   */

  .button--small {
    height: auto;
    min-height: var(--sl-input-height-small);
    font-size: var(--sl-button-font-size-small);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
  }

  .button--medium {
    height: auto;
    min-height: var(--sl-input-height-medium);
    font-size: var(--sl-button-font-size-medium);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
  }

  .button--large {
    height: auto;
    min-height: var(--sl-input-height-large);
    font-size: var(--sl-button-font-size-large);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
  }

  /*
   * Pill modifier
   */

  .button--pill.button--small {
    border-radius: var(--sl-input-height-small);
  }

  .button--pill.button--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .button--pill.button--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Circle modifier
   */

  .button--circle {
    padding-left: 0;
    padding-right: 0;
  }

  .button--circle.button--small {
    width: var(--sl-input-height-small);
    border-radius: 50%;
  }

  .button--circle.button--medium {
    width: var(--sl-input-height-medium);
    border-radius: 50%;
  }

  .button--circle.button--large {
    width: var(--sl-input-height-large);
    border-radius: 50%;
  }

  .button--circle .button__prefix,
  .button--circle .button__suffix,
  .button--circle .button__caret {
    display: none;
  }

  /*
   * Caret modifier
   */

  .button--caret .button__suffix {
    display: none;
  }

  .button--caret .button__caret {
    height: auto;
  }

  /*
   * Loading modifier
   */

  .button--loading {
    position: relative;
    cursor: wait;
  }

  .button--loading .button__prefix,
  .button--loading .button__label,
  .button--loading .button__suffix,
  .button--loading .button__caret {
    visibility: hidden;
  }

  .button--loading sl-spinner {
    --indicator-color: currentColor;
    position: absolute;
    font-size: 1em;
    height: 1em;
    width: 1em;
    top: calc(50% - 0.5em);
    left: calc(50% - 0.5em);
  }

  /*
   * Badges
   */

  .button ::slotted(sl-badge) {
    position: absolute;
    top: 0;
    right: 0;
    translate: 50% -50%;
    pointer-events: none;
  }

  .button--rtl ::slotted(sl-badge) {
    right: auto;
    left: 0;
    translate: -50% -50%;
  }

  /*
   * Button spacing
   */

  .button--has-label.button--small .button__label {
    padding: 0 var(--sl-spacing-small);
  }

  .button--has-label.button--medium .button__label {
    padding: 0 var(--sl-spacing-medium);
  }

  .button--has-label.button--large .button__label {
    padding: 0 var(--sl-spacing-large);
  }

  .button--has-prefix.button--small {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--small .button__label {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--medium {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--medium .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-suffix.button--small,
  .button--caret.button--small {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--small .button__label,
  .button--caret.button--small .button__label {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--medium,
  .button--caret.button--medium {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--medium .button__label,
  .button--caret.button--medium .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large,
  .button--caret.button--large {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large .button__label,
  .button--caret.button--large .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  /*
   * Button groups support a variety of button types (e.g. buttons with tooltips, buttons as dropdown triggers, etc.).
   * This means buttons aren't always direct descendants of the button group, thus we can't target them with the
   * ::slotted selector. To work around this, the button group component does some magic to add these special classes to
   * buttons and we style them here instead.
   */

  :host([data-sl-button-group__button--first]:not([data-sl-button-group__button--last])) .button {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  :host([data-sl-button-group__button--inner]) .button {
    border-radius: 0;
  }

  :host([data-sl-button-group__button--last]:not([data-sl-button-group__button--first])) .button {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  /* All except the first */
  :host([data-sl-button-group__button]:not([data-sl-button-group__button--first])) {
    margin-inline-start: calc(-1 * var(--sl-input-border-width));
  }

  /* Add a visual separator between solid buttons */
  :host(
      [data-sl-button-group__button]:not(
          [data-sl-button-group__button--first],
          [data-sl-button-group__button--radio],
          [variant='default']
        ):not(:hover)
    )
    .button:after {
    content: '';
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    bottom: 0;
    border-left: solid 1px rgb(128 128 128 / 33%);
    mix-blend-mode: multiply;
  }

  /* Bump hovered, focused, and checked buttons up so their focus ring isn't clipped */
  :host([data-sl-button-group__button--hover]) {
    z-index: 1;
  }

  /* Focus and checked are always on top */
  :host([data-sl-button-group__button--focus]),
  :host([data-sl-button-group__button][checked]) {
    z-index: 2;
  }
`,We=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=i=>{const s=i.target;(this.slotNames.includes("[default]")&&!s.name||s.name&&this.slotNames.includes(s.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function na(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let i="";return[...t].forEach(s=>{s.nodeType===Node.TEXT_NODE&&(i+=s.textContent)}),i}var es="";function ts(e){es=e}function la(e=""){if(!es){const t=[...document.getElementsByTagName("script")],i=t.find(s=>s.hasAttribute("data-shoelace"));if(i)ts(i.getAttribute("data-shoelace"));else{const s=t.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let o="";s&&(o=s.getAttribute("src")),ts(o.split("/").slice(0,-1).join("/"))}}return es.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var ca={name:"default",resolver:e=>la(`assets/icons/${e}.svg`)},da=ca,eo={caret:`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `,check:`
    <svg part="checked-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor">
          <g transform="translate(3.428571, 3.428571)">
            <path d="M0,5.71428571 L3.42857143,9.14285714"></path>
            <path d="M9.14285714,0 L3.42857143,9.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"chevron-down":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,"chevron-left":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-left" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
    </svg>
  `,"chevron-right":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,copy:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"/>
    </svg>
  `,eye:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  `,"eye-slash":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
    </svg>
  `,eyedropper:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eyedropper" viewBox="0 0 16 16">
      <path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708l-2-2zM2 12.707l7-7L10.293 7l-7 7H2v-1.293z"></path>
    </svg>
  `,"grip-vertical":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-grip-vertical" viewBox="0 0 16 16">
      <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>
    </svg>
  `,indeterminate:`
    <svg part="indeterminate-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor" stroke-width="2">
          <g transform="translate(2.285714, 6.857143)">
            <path d="M10.2857143,1.14285714 L1.14285714,1.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"person-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    </svg>
  `,"play-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"></path>
    </svg>
  `,"pause-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"></path>
    </svg>
  `,radio:`
    <svg part="checked-icon" class="radio__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="currentColor">
          <circle cx="8" cy="8" r="3.42857143"></circle>
        </g>
      </g>
    </svg>
  `,"star-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
    </svg>
  `,"x-lg":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
  `,"x-circle-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
    </svg>
  `},ua={name:"system",resolver:e=>e in eo?`data:image/svg+xml,${encodeURIComponent(eo[e])}`:""},ha=ua,pa=[da,ha],is=[];function ma(e){is.push(e)}function fa(e){is=is.filter(t=>t!==e)}function to(e){return pa.find(t=>t.name===e)}var ba=C`
  :host {
    display: inline-block;
    width: 1em;
    height: 1em;
    box-sizing: content-box !important;
  }

  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`;function T(e,t){const i=qe({waitUntilFirstUpdate:!1},t);return(s,o)=>{const{update:r}=s,a=Array.isArray(e)?e:[e];s.update=function(n){a.forEach(c=>{const u=c;if(n.has(u)){const p=n.get(u),f=this[u];p!==f&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[o](p,f)}}),r.call(this,n)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ga=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,qo=e=>e.strings===void 0,va={},ya=(e,t=va)=>e._$AH=t;var Mt=Symbol(),ri=Symbol(),Wi,Ki=new Map,ee=class extends P{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var i;let s;if(t!=null&&t.spriteSheet)return this.svg=h`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(s=await fetch(e,{mode:"cors"}),!s.ok)return s.status===410?Mt:ri}catch{return ri}try{const o=document.createElement("div");o.innerHTML=await s.text();const r=o.firstElementChild;if(((i=r==null?void 0:r.tagName)==null?void 0:i.toLowerCase())!=="svg")return Mt;Wi||(Wi=new DOMParser);const n=Wi.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return n?(n.part.add("svg"),document.adoptNode(n)):Mt}catch{return Mt}}connectedCallback(){super.connectedCallback(),ma(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),fa(this)}getIconSource(){const e=to(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:i}=this.getIconSource(),s=i?to(this.library):void 0;if(!t){this.svg=null;return}let o=Ki.get(t);if(o||(o=this.resolveIcon(t,s),Ki.set(t,o)),!this.initialRender)return;const r=await o;if(r===ri&&Ki.delete(t),t===this.getIconSource().url){if(ga(r)){if(this.svg=r,s){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof s.mutator=="function"&&a&&s.mutator(a)}return}switch(r){case ri:case Mt:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(e=s==null?void 0:s.mutator)==null||e.call(s,this.svg),this.emit("sl-load")}}}render(){return this.svg}};ee.styles=[j,ba];l([v()],ee.prototype,"svg",2);l([d({reflect:!0})],ee.prototype,"name",2);l([d()],ee.prototype,"src",2);l([d()],ee.prototype,"label",2);l([d({reflect:!0})],ee.prototype,"library",2);l([T("label")],ee.prototype,"handleLabelChange",1);l([T(["name","src","library"])],ee.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ue={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Si=e=>(...t)=>({_$litDirective$:e,values:t});let Ti=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,s){this._$Ct=t,this._$AM=i,this._$Ci=s}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const B=Si(class extends Ti{constructor(e){var t;if(super(e),e.type!==Ue.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var s,o;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in t)t[r]&&!((s=this.nt)!=null&&s.has(r))&&this.st.add(r);return this.render(t)}const i=e.element.classList;for(const r of this.st)r in t||(i.remove(r),this.st.delete(r));for(const r in t){const a=!!t[r];a===this.st.has(r)||(o=this.nt)!=null&&o.has(r)||(a?(i.add(r),this.st.add(r)):(i.remove(r),this.st.delete(r)))}return ye}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Wo=Symbol.for(""),wa=e=>{if((e==null?void 0:e.r)===Wo)return e==null?void 0:e._$litStatic$},mi=(e,...t)=>({_$litStatic$:t.reduce((i,s,o)=>i+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(s)+e[o+1],e[0]),r:Wo}),io=new Map,ka=e=>(t,...i)=>{const s=i.length;let o,r;const a=[],n=[];let c,u=0,p=!1;for(;u<s;){for(c=t[u];u<s&&(r=i[u],(o=wa(r))!==void 0);)c+=o+t[++u],p=!0;u!==s&&n.push(r),a.push(c),u++}if(u===s&&a.push(t[s]),p){const f=a.join("$$lit$$");(t=io.get(f))===void 0&&(a.raw=a,io.set(f,t=a)),i=n}return e(t,...i)},ui=ka(h);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>e??g;var L=class extends P{constructor(){super(...arguments),this.formControlController=new Jt(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new We(this,"[default]","prefix","suffix"),this.localize=new se(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:ks}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?mi`a`:mi`button`;return ui`
      <${t}
        part="base"
        class=${B({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${x(e?void 0:this.disabled)}
        type=${x(e?void 0:this.type)}
        title=${this.title}
        name=${x(e?void 0:this.name)}
        value=${x(e?void 0:this.value)}
        href=${x(e&&!this.disabled?this.href:void 0)}
        target=${x(e?this.target:void 0)}
        download=${x(e?this.download:void 0)}
        rel=${x(e?this.rel:void 0)}
        role=${x(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @invalid=${this.isButton()?this.handleInvalid:null}
        @click=${this.handleClick}
      >
        <slot name="prefix" part="prefix" class="button__prefix"></slot>
        <slot part="label" class="button__label"></slot>
        <slot name="suffix" part="suffix" class="button__suffix"></slot>
        ${this.caret?ui` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?ui`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};L.styles=[j,aa];L.dependencies={"sl-icon":ee,"sl-spinner":Ci};l([$(".button")],L.prototype,"button",2);l([v()],L.prototype,"hasFocus",2);l([v()],L.prototype,"invalid",2);l([d()],L.prototype,"title",2);l([d({reflect:!0})],L.prototype,"variant",2);l([d({reflect:!0})],L.prototype,"size",2);l([d({type:Boolean,reflect:!0})],L.prototype,"caret",2);l([d({type:Boolean,reflect:!0})],L.prototype,"disabled",2);l([d({type:Boolean,reflect:!0})],L.prototype,"loading",2);l([d({type:Boolean,reflect:!0})],L.prototype,"outline",2);l([d({type:Boolean,reflect:!0})],L.prototype,"pill",2);l([d({type:Boolean,reflect:!0})],L.prototype,"circle",2);l([d()],L.prototype,"type",2);l([d()],L.prototype,"name",2);l([d()],L.prototype,"value",2);l([d()],L.prototype,"href",2);l([d()],L.prototype,"target",2);l([d()],L.prototype,"rel",2);l([d()],L.prototype,"download",2);l([d()],L.prototype,"form",2);l([d({attribute:"formaction"})],L.prototype,"formAction",2);l([d({attribute:"formenctype"})],L.prototype,"formEnctype",2);l([d({attribute:"formmethod"})],L.prototype,"formMethod",2);l([d({attribute:"formnovalidate",type:Boolean})],L.prototype,"formNoValidate",2);l([d({attribute:"formtarget"})],L.prototype,"formTarget",2);l([T("disabled",{waitUntilFirstUpdate:!0})],L.prototype,"handleDisabledChange",1);L.define("sl-button");var xa=C`
  :host {
    display: block;
  }

  .input {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: stretch;
    justify-content: start;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: text;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  /* Standard inputs */
  .input--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .input--standard:hover:not(.input--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }

  .input--standard.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .input--standard.input--focused:not(.input--disabled) .input__control {
    color: var(--sl-input-color-focus);
  }

  .input--standard.input--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input--standard.input--disabled .input__control {
    color: var(--sl-input-color-disabled);
  }

  .input--standard.input--disabled .input__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled inputs */
  .input--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .input--filled:hover:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .input--filled.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .input--filled.input--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input__control {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    min-width: 0;
    height: 100%;
    color: var(--sl-input-color);
    border: none;
    background: inherit;
    box-shadow: none;
    padding: 0;
    margin: 0;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .input__control::-webkit-search-decoration,
  .input__control::-webkit-search-cancel-button,
  .input__control::-webkit-search-results-button,
  .input__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .input__control:-webkit-autofill,
  .input__control:-webkit-autofill:hover,
  .input__control:-webkit-autofill:focus,
  .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-background-color-hover) inset !important;
    -webkit-text-fill-color: var(--sl-color-primary-500);
    caret-color: var(--sl-input-color);
  }

  .input--filled .input__control:-webkit-autofill,
  .input--filled .input__control:-webkit-autofill:hover,
  .input--filled .input__control:-webkit-autofill:focus,
  .input--filled .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-filled-background-color) inset !important;
  }

  .input__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .input:hover:not(.input--disabled) .input__control {
    color: var(--sl-input-color-hover);
  }

  .input__control:focus {
    outline: none;
  }

  .input__prefix,
  .input__suffix {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    cursor: default;
  }

  .input__prefix ::slotted(sl-icon),
  .input__suffix ::slotted(sl-icon) {
    color: var(--sl-input-icon-color);
  }

  /*
   * Size modifiers
   */

  .input--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    height: var(--sl-input-height-small);
  }

  .input--small .input__control {
    height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-small);
  }

  .input--small .input__clear,
  .input--small .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-small) * 2);
  }

  .input--small .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .input--small .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .input--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    height: var(--sl-input-height-medium);
  }

  .input--medium .input__control {
    height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-medium);
  }

  .input--medium .input__clear,
  .input--medium .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-medium) * 2);
  }

  .input--medium .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .input--medium .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .input--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    height: var(--sl-input-height-large);
  }

  .input--large .input__control {
    height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-large);
  }

  .input--large .input__clear,
  .input--large .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-large) * 2);
  }

  .input--large .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .input--large .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  /*
   * Pill modifier
   */

  .input--pill.input--small {
    border-radius: var(--sl-input-height-small);
  }

  .input--pill.input--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .input--pill.input--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Clearable + Password Toggle
   */

  .input__clear,
  .input__password-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .input__clear:hover,
  .input__password-toggle:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .input__clear:focus,
  .input__password-toggle:focus {
    outline: none;
  }

  /* Don't show the browser's password toggle in Edge */
  ::-ms-reveal {
    display: none;
  }

  /* Hide the built-in number spinner */
  .input--no-spin-buttons input[type='number']::-webkit-outer-spin-button,
  .input--no-spin-buttons input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    display: none;
  }

  .input--no-spin-buttons input[type='number'] {
    -moz-appearance: textfield;
  }
`,xs=(e="value")=>(t,i)=>{const s=t.constructor,o=s.prototype.attributeChangedCallback;s.prototype.attributeChangedCallback=function(r,a,n){var c;const u=s.getPropertyOptions(e),p=typeof u.attribute=="string"?u.attribute:e;if(r===p){const f=u.converter||kt,m=(typeof f=="function"?f:(c=f==null?void 0:f.fromAttribute)!=null?c:kt.fromAttribute)(n,u.type);this[e]!==m&&(this[i]=m)}o.call(this,r,a,n)}},Ei=C`
  .form-control .form-control__label {
    display: none;
  }

  .form-control .form-control__help-text {
    display: none;
  }

  /* Label */
  .form-control--has-label .form-control__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    margin-bottom: var(--sl-spacing-3x-small);
  }

  .form-control--has-label.form-control--small .form-control__label {
    font-size: var(--sl-input-label-font-size-small);
  }

  .form-control--has-label.form-control--medium .form-control__label {
    font-size: var(--sl-input-label-font-size-medium);
  }

  .form-control--has-label.form-control--large .form-control__label {
    font-size: var(--sl-input-label-font-size-large);
  }

  :host([required]) .form-control--has-label .form-control__label::after {
    content: var(--sl-input-required-content);
    margin-inline-start: var(--sl-input-required-content-offset);
    color: var(--sl-input-required-content-color);
  }

  /* Help text */
  .form-control--has-help-text .form-control__help-text {
    display: block;
    color: var(--sl-input-help-text-color);
    margin-top: var(--sl-spacing-3x-small);
  }

  .form-control--has-help-text.form-control--small .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-small);
  }

  .form-control--has-help-text.form-control--medium .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-medium);
  }

  .form-control--has-help-text.form-control--large .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-large);
  }

  .form-control--has-help-text.form-control--radio-group .form-control__help-text {
    margin-top: var(--sl-spacing-2x-small);
  }
`;/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const fi=Si(class extends Ti{constructor(e){if(super(e),e.type!==Ue.PROPERTY&&e.type!==Ue.ATTRIBUTE&&e.type!==Ue.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!qo(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===ye||t===g)return t;const i=e.element,s=e.name;if(e.type===Ue.PROPERTY){if(t===i[s])return ye}else if(e.type===Ue.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(s))return ye}else if(e.type===Ue.ATTRIBUTE&&i.getAttribute(s)===t+"")return ye;return ya(e),t}});var S=class extends P{constructor(){super(...arguments),this.formControlController=new Jt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new We(this,"help-text","label"),this.localize=new se(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,s="preserve"){const o=t??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(e,o,r,s),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return h`
      <div
        part="form-control"
        class=${B({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${i?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${B({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
          >
            <span part="prefix" class="input__prefix">
              <slot name="prefix"></slot>
            </span>

            <input
              part="input"
              id="input"
              class="input__control"
              type=${this.type==="password"&&this.passwordVisible?"text":this.type}
              title=${this.title}
              name=${x(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${x(this.placeholder)}
              minlength=${x(this.minlength)}
              maxlength=${x(this.maxlength)}
              min=${x(this.min)}
              max=${x(this.max)}
              step=${x(this.step)}
              .value=${fi(this.value)}
              autocapitalize=${x(this.autocapitalize)}
              autocomplete=${x(this.autocomplete)}
              autocorrect=${x(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${x(this.pattern)}
              enterkeyhint=${x(this.enterkeyhint)}
              inputmode=${x(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${r?h`
                  <button
                    part="clear-button"
                    class="input__clear"
                    type="button"
                    aria-label=${this.localize.term("clearEntry")}
                    @click=${this.handleClearClick}
                    tabindex="-1"
                  >
                    <slot name="clear-icon">
                      <sl-icon name="x-circle-fill" library="system"></sl-icon>
                    </slot>
                  </button>
                `:""}
            ${this.passwordToggle&&!this.disabled?h`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?h`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:h`
                          <slot name="hide-password-icon">
                            <sl-icon name="eye" library="system"></sl-icon>
                          </slot>
                        `}
                  </button>
                `:""}

            <span part="suffix" class="input__suffix">
              <slot name="suffix"></slot>
            </span>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};S.styles=[j,Ei,xa];S.dependencies={"sl-icon":ee};l([$(".input__control")],S.prototype,"input",2);l([v()],S.prototype,"hasFocus",2);l([d()],S.prototype,"title",2);l([d({reflect:!0})],S.prototype,"type",2);l([d()],S.prototype,"name",2);l([d()],S.prototype,"value",2);l([xs()],S.prototype,"defaultValue",2);l([d({reflect:!0})],S.prototype,"size",2);l([d({type:Boolean,reflect:!0})],S.prototype,"filled",2);l([d({type:Boolean,reflect:!0})],S.prototype,"pill",2);l([d()],S.prototype,"label",2);l([d({attribute:"help-text"})],S.prototype,"helpText",2);l([d({type:Boolean})],S.prototype,"clearable",2);l([d({type:Boolean,reflect:!0})],S.prototype,"disabled",2);l([d()],S.prototype,"placeholder",2);l([d({type:Boolean,reflect:!0})],S.prototype,"readonly",2);l([d({attribute:"password-toggle",type:Boolean})],S.prototype,"passwordToggle",2);l([d({attribute:"password-visible",type:Boolean})],S.prototype,"passwordVisible",2);l([d({attribute:"no-spin-buttons",type:Boolean})],S.prototype,"noSpinButtons",2);l([d({reflect:!0})],S.prototype,"form",2);l([d({type:Boolean,reflect:!0})],S.prototype,"required",2);l([d()],S.prototype,"pattern",2);l([d({type:Number})],S.prototype,"minlength",2);l([d({type:Number})],S.prototype,"maxlength",2);l([d()],S.prototype,"min",2);l([d()],S.prototype,"max",2);l([d()],S.prototype,"step",2);l([d()],S.prototype,"autocapitalize",2);l([d()],S.prototype,"autocorrect",2);l([d()],S.prototype,"autocomplete",2);l([d({type:Boolean})],S.prototype,"autofocus",2);l([d()],S.prototype,"enterkeyhint",2);l([d({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],S.prototype,"spellcheck",2);l([d()],S.prototype,"inputmode",2);l([T("disabled",{waitUntilFirstUpdate:!0})],S.prototype,"handleDisabledChange",1);l([T("step",{waitUntilFirstUpdate:!0})],S.prototype,"handleStepChange",1);l([T("value",{waitUntilFirstUpdate:!0})],S.prototype,"handleValueChange",1);S.define("sl-input");var _a=C`
  :host {
    display: inline-block;
  }

  .tag {
    display: flex;
    align-items: center;
    border: solid 1px;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }

  .tag__remove::part(base) {
    color: inherit;
    padding: 0;
  }

  /*
   * Variant modifiers
   */

  .tag--primary {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-200);
    color: var(--sl-color-primary-800);
  }

  .tag--primary:active > sl-icon-button {
    color: var(--sl-color-primary-600);
  }

  .tag--success {
    background-color: var(--sl-color-success-50);
    border-color: var(--sl-color-success-200);
    color: var(--sl-color-success-800);
  }

  .tag--success:active > sl-icon-button {
    color: var(--sl-color-success-600);
  }

  .tag--neutral {
    background-color: var(--sl-color-neutral-50);
    border-color: var(--sl-color-neutral-200);
    color: var(--sl-color-neutral-800);
  }

  .tag--neutral:active > sl-icon-button {
    color: var(--sl-color-neutral-600);
  }

  .tag--warning {
    background-color: var(--sl-color-warning-50);
    border-color: var(--sl-color-warning-200);
    color: var(--sl-color-warning-800);
  }

  .tag--warning:active > sl-icon-button {
    color: var(--sl-color-warning-600);
  }

  .tag--danger {
    background-color: var(--sl-color-danger-50);
    border-color: var(--sl-color-danger-200);
    color: var(--sl-color-danger-800);
  }

  .tag--danger:active > sl-icon-button {
    color: var(--sl-color-danger-600);
  }

  /*
   * Size modifiers
   */

  .tag--small {
    font-size: var(--sl-button-font-size-small);
    height: calc(var(--sl-input-height-small) * 0.8);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
    padding: 0 var(--sl-spacing-x-small);
  }

  .tag--medium {
    font-size: var(--sl-button-font-size-medium);
    height: calc(var(--sl-input-height-medium) * 0.8);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
    padding: 0 var(--sl-spacing-small);
  }

  .tag--large {
    font-size: var(--sl-button-font-size-large);
    height: calc(var(--sl-input-height-large) * 0.8);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
    padding: 0 var(--sl-spacing-medium);
  }

  .tag__remove {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  /*
   * Pill modifier
   */

  .tag--pill {
    border-radius: var(--sl-border-radius-pill);
  }
`,$a=C`
  :host {
    display: inline-block;
    color: var(--sl-color-neutral-600);
  }

  .icon-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    border-radius: var(--sl-border-radius-medium);
    font-size: inherit;
    color: inherit;
    padding: var(--sl-spacing-x-small);
    cursor: pointer;
    transition: var(--sl-transition-x-fast) color;
    -webkit-appearance: none;
  }

  .icon-button:hover:not(.icon-button--disabled),
  .icon-button:focus-visible:not(.icon-button--disabled) {
    color: var(--sl-color-primary-600);
  }

  .icon-button:active:not(.icon-button--disabled) {
    color: var(--sl-color-primary-700);
  }

  .icon-button:focus {
    outline: none;
  }

  .icon-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .icon-button__icon {
    pointer-events: none;
  }
`,X=class extends P{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?mi`a`:mi`button`;return ui`
      <${t}
        part="base"
        class=${B({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${x(e?void 0:this.disabled)}
        type=${x(e?void 0:"button")}
        href=${x(e?this.href:void 0)}
        target=${x(e?this.target:void 0)}
        download=${x(e?this.download:void 0)}
        rel=${x(e&&this.target?"noreferrer noopener":void 0)}
        role=${x(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${x(this.name)}
          library=${x(this.library)}
          src=${x(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${t}>
    `}};X.styles=[j,$a];X.dependencies={"sl-icon":ee};l([$(".icon-button")],X.prototype,"button",2);l([v()],X.prototype,"hasFocus",2);l([d()],X.prototype,"name",2);l([d()],X.prototype,"library",2);l([d()],X.prototype,"src",2);l([d()],X.prototype,"href",2);l([d()],X.prototype,"target",2);l([d()],X.prototype,"download",2);l([d()],X.prototype,"label",2);l([d({type:Boolean,reflect:!0})],X.prototype,"disabled",2);var bt=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return h`
      <span
        part="base"
        class=${B({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?h`
              <sl-icon-button
                part="remove-button"
                exportparts="base:remove-button__base"
                name="x-lg"
                library="system"
                label=${this.localize.term("remove")}
                class="tag__remove"
                @click=${this.handleRemoveClick}
                tabindex="-1"
              ></sl-icon-button>
            `:""}
      </span>
    `}};bt.styles=[j,_a];bt.dependencies={"sl-icon-button":X};l([d({reflect:!0})],bt.prototype,"variant",2);l([d({reflect:!0})],bt.prototype,"size",2);l([d({type:Boolean,reflect:!0})],bt.prototype,"pill",2);l([d({type:Boolean})],bt.prototype,"removable",2);var Ca=C`
  :host {
    display: block;
  }

  /** The popup */
  .select {
    flex: 1 1 auto;
    display: inline-flex;
    width: 100%;
    position: relative;
    vertical-align: middle;
  }

  .select::part(popup) {
    z-index: var(--sl-z-index-dropdown);
  }

  .select[data-current-placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .select[data-current-placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  /* Combobox */
  .select__combobox {
    flex: 1;
    display: flex;
    width: 100%;
    min-width: 0;
    position: relative;
    align-items: center;
    justify-content: start;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: pointer;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  .select__display-input {
    position: relative;
    width: 100%;
    font: inherit;
    border: none;
    background: none;
    color: var(--sl-input-color);
    cursor: inherit;
    overflow: hidden;
    padding: 0;
    margin: 0;
    -webkit-appearance: none;
  }

  .select__display-input::placeholder {
    color: var(--sl-input-placeholder-color);
  }

  .select:not(.select--disabled):hover .select__display-input {
    color: var(--sl-input-color-hover);
  }

  .select__display-input:focus {
    outline: none;
  }

  /* Visually hide the display input when multiple is enabled */
  .select--multiple:not(.select--placeholder-visible) .select__display-input {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .select__value-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    z-index: -1;
  }

  .select__tags {
    display: flex;
    flex: 1;
    align-items: center;
    flex-wrap: wrap;
    margin-inline-start: var(--sl-spacing-2x-small);
  }

  .select__tags::slotted(sl-tag) {
    cursor: pointer !important;
  }

  .select--disabled .select__tags,
  .select--disabled .select__tags::slotted(sl-tag) {
    cursor: not-allowed !important;
  }

  /* Standard selects */
  .select--standard .select__combobox {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .select--standard.select--disabled .select__combobox {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    color: var(--sl-input-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
    outline: none;
  }

  .select--standard:not(.select--disabled).select--open .select__combobox,
  .select--standard:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  /* Filled selects */
  .select--filled .select__combobox {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .select--filled:hover:not(.select--disabled) .select__combobox {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .select--filled.select--disabled .select__combobox {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .select--filled:not(.select--disabled).select--open .select__combobox,
  .select--filled:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
  }

  /* Sizes */
  .select--small .select__combobox {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    min-height: var(--sl-input-height-small);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-small);
  }

  .select--small .select__clear {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-block: 2px;
    padding-inline-start: 0;
  }

  .select--small .select__tags {
    gap: 2px;
  }

  .select--medium .select__combobox {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    min-height: var(--sl-input-height-medium);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-medium);
  }

  .select--medium .select__clear {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 3px;
  }

  .select--medium .select__tags {
    gap: 3px;
  }

  .select--large .select__combobox {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    min-height: var(--sl-input-height-large);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-large);
  }

  .select--large .select__clear {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 4px;
  }

  .select--large .select__tags {
    gap: 4px;
  }

  /* Pills */
  .select--pill.select--small .select__combobox {
    border-radius: var(--sl-input-height-small);
  }

  .select--pill.select--medium .select__combobox {
    border-radius: var(--sl-input-height-medium);
  }

  .select--pill.select--large .select__combobox {
    border-radius: var(--sl-input-height-large);
  }

  /* Prefix and Suffix */
  .select__prefix,
  .select__suffix {
    flex: 0;
    display: inline-flex;
    align-items: center;
    color: var(--sl-input-placeholder-color);
  }

  .select__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-small);
  }

  /* Clear button */
  .select__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .select__clear:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .select__clear:focus {
    outline: none;
  }

  /* Expand icon */
  .select__expand-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
    rotate: 0;
    margin-inline-start: var(--sl-spacing-small);
  }

  .select--open .select__expand-icon {
    rotate: -180deg;
  }

  /* Listbox */
  .select__listbox {
    display: block;
    position: relative;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    box-shadow: var(--sl-shadow-large);
    background: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-radius: var(--sl-border-radius-medium);
    padding-block: var(--sl-spacing-x-small);
    padding-inline: 0;
    overflow: auto;
    overscroll-behavior: none;

    /* Make sure it adheres to the popup's auto size */
    max-width: var(--auto-size-available-width);
    max-height: var(--auto-size-available-height);
  }

  .select__listbox ::slotted(sl-divider) {
    --spacing: var(--sl-spacing-x-small);
  }

  .select__listbox ::slotted(small) {
    display: block;
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-semibold);
    color: var(--sl-color-neutral-500);
    padding-block: var(--sl-spacing-2x-small);
    padding-inline: var(--sl-spacing-x-large);
  }
`;function Sa(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var ss=new Set;function Ta(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function Ea(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Vt(e){if(ss.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=Ta()+Ea();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),t<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function qt(e){ss.delete(e),ss.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function os(e,t,i="vertical",s="smooth"){const o=Sa(e,t),r=o.top+t.scrollTop,a=o.left+t.scrollLeft,n=t.scrollLeft,c=t.scrollLeft+t.offsetWidth,u=t.scrollTop,p=t.scrollTop+t.offsetHeight;(i==="horizontal"||i==="both")&&(a<n?t.scrollTo({left:a,behavior:s}):a+e.clientWidth>c&&t.scrollTo({left:a-t.offsetWidth+e.clientWidth,behavior:s})),(i==="vertical"||i==="both")&&(r<u?t.scrollTo({top:r,behavior:s}):r+e.clientHeight>p&&t.scrollTo({top:r-t.offsetHeight+e.clientHeight,behavior:s}))}var Aa=C`
  :host {
    --arrow-color: var(--sl-color-neutral-1000);
    --arrow-size: 6px;

    /*
     * These properties are computed to account for the arrow's dimensions after being rotated 45º. The constant
     * 0.7071 is derived from sin(45), which is the diagonal size of the arrow's container after rotating.
     */
    --arrow-size-diagonal: calc(var(--arrow-size) * 0.7071);
    --arrow-padding-offset: calc(var(--arrow-size-diagonal) - var(--arrow-size));

    display: contents;
  }

  .popup {
    position: absolute;
    isolation: isolate;
    max-width: var(--auto-size-available-width, none);
    max-height: var(--auto-size-available-height, none);
  }

  .popup--fixed {
    position: fixed;
  }

  .popup:not(.popup--active) {
    display: none;
  }

  .popup__arrow {
    position: absolute;
    width: calc(var(--arrow-size-diagonal) * 2);
    height: calc(var(--arrow-size-diagonal) * 2);
    rotate: 45deg;
    background: var(--arrow-color);
    z-index: -1;
  }

  /* Hover bridge */
  .popup-hover-bridge:not(.popup-hover-bridge--visible) {
    display: none;
  }

  .popup-hover-bridge {
    position: fixed;
    z-index: calc(var(--sl-z-index-dropdown) - 1);
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    clip-path: polygon(
      var(--hover-bridge-top-left-x, 0) var(--hover-bridge-top-left-y, 0),
      var(--hover-bridge-top-right-x, 0) var(--hover-bridge-top-right-y, 0),
      var(--hover-bridge-bottom-right-x, 0) var(--hover-bridge-bottom-right-y, 0),
      var(--hover-bridge-bottom-left-x, 0) var(--hover-bridge-bottom-left-y, 0)
    );
  }
`;const Je=Math.min,de=Math.max,bi=Math.round,ai=Math.floor,Le=e=>({x:e,y:e}),za={left:"right",right:"left",bottom:"top",top:"bottom"},Ra={start:"end",end:"start"};function rs(e,t,i){return de(e,Je(t,i))}function St(e,t){return typeof e=="function"?e(t):e}function Qe(e){return e.split("-")[0]}function Tt(e){return e.split("-")[1]}function Ko(e){return e==="x"?"y":"x"}function _s(e){return e==="y"?"height":"width"}const Ia=new Set(["top","bottom"]);function Ve(e){return Ia.has(Qe(e))?"y":"x"}function $s(e){return Ko(Ve(e))}function Oa(e,t,i){i===void 0&&(i=!1);const s=Tt(e),o=$s(e),r=_s(o);let a=o==="x"?s===(i?"end":"start")?"right":"left":s==="start"?"bottom":"top";return t.reference[r]>t.floating[r]&&(a=gi(a)),[a,gi(a)]}function Pa(e){const t=gi(e);return[as(e),t,as(t)]}function as(e){return e.replace(/start|end/g,t=>Ra[t])}const so=["left","right"],oo=["right","left"],La=["top","bottom"],Da=["bottom","top"];function Ma(e,t,i){switch(e){case"top":case"bottom":return i?t?oo:so:t?so:oo;case"left":case"right":return t?La:Da;default:return[]}}function Ba(e,t,i,s){const o=Tt(e);let r=Ma(Qe(e),i==="start",s);return o&&(r=r.map(a=>a+"-"+o),t&&(r=r.concat(r.map(as)))),r}function gi(e){return e.replace(/left|right|bottom|top/g,t=>za[t])}function Na(e){return{top:0,right:0,bottom:0,left:0,...e}}function Go(e){return typeof e!="number"?Na(e):{top:e,right:e,bottom:e,left:e}}function vi(e){const{x:t,y:i,width:s,height:o}=e;return{width:s,height:o,top:i,left:t,right:t+s,bottom:i+o,x:t,y:i}}function ro(e,t,i){let{reference:s,floating:o}=e;const r=Ve(t),a=$s(t),n=_s(a),c=Qe(t),u=r==="y",p=s.x+s.width/2-o.width/2,f=s.y+s.height/2-o.height/2,b=s[n]/2-o[n]/2;let m;switch(c){case"top":m={x:p,y:s.y-o.height};break;case"bottom":m={x:p,y:s.y+s.height};break;case"right":m={x:s.x+s.width,y:f};break;case"left":m={x:s.x-o.width,y:f};break;default:m={x:s.x,y:s.y}}switch(Tt(t)){case"start":m[a]-=b*(i&&u?-1:1);break;case"end":m[a]+=b*(i&&u?-1:1);break}return m}const Fa=async(e,t,i)=>{const{placement:s="bottom",strategy:o="absolute",middleware:r=[],platform:a}=i,n=r.filter(Boolean),c=await(a.isRTL==null?void 0:a.isRTL(t));let u=await a.getElementRects({reference:e,floating:t,strategy:o}),{x:p,y:f}=ro(u,s,c),b=s,m={},y=0;for(let w=0;w<n.length;w++){const{name:k,fn:_}=n[w],{x:E,y:I,data:W,reset:U}=await _({x:p,y:f,initialPlacement:s,placement:b,strategy:o,middlewareData:m,rects:u,platform:a,elements:{reference:e,floating:t}});p=E??p,f=I??f,m={...m,[k]:{...m[k],...W}},U&&y<=50&&(y++,typeof U=="object"&&(U.placement&&(b=U.placement),U.rects&&(u=U.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:o}):U.rects),{x:p,y:f}=ro(u,b,c)),w=-1)}return{x:p,y:f,placement:b,strategy:o,middlewareData:m}};async function Cs(e,t){var i;t===void 0&&(t={});const{x:s,y:o,platform:r,rects:a,elements:n,strategy:c}=e,{boundary:u="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:b=!1,padding:m=0}=St(t,e),y=Go(m),k=n[b?f==="floating"?"reference":"floating":f],_=vi(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement(k)))==null||i?k:k.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(n.floating)),boundary:u,rootBoundary:p,strategy:c})),E=f==="floating"?{x:s,y:o,width:a.floating.width,height:a.floating.height}:a.reference,I=await(r.getOffsetParent==null?void 0:r.getOffsetParent(n.floating)),W=await(r.isElement==null?void 0:r.isElement(I))?await(r.getScale==null?void 0:r.getScale(I))||{x:1,y:1}:{x:1,y:1},U=vi(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:n,rect:E,offsetParent:I,strategy:c}):E);return{top:(_.top-U.top+y.top)/W.y,bottom:(U.bottom-_.bottom+y.bottom)/W.y,left:(_.left-U.left+y.left)/W.x,right:(U.right-_.right+y.right)/W.x}}const Ha=e=>({name:"arrow",options:e,async fn(t){const{x:i,y:s,placement:o,rects:r,platform:a,elements:n,middlewareData:c}=t,{element:u,padding:p=0}=St(e,t)||{};if(u==null)return{};const f=Go(p),b={x:i,y:s},m=$s(o),y=_s(m),w=await a.getDimensions(u),k=m==="y",_=k?"top":"left",E=k?"bottom":"right",I=k?"clientHeight":"clientWidth",W=r.reference[y]+r.reference[m]-b[m]-r.floating[y],U=b[m]-r.reference[m],re=await(a.getOffsetParent==null?void 0:a.getOffsetParent(u));let q=re?re[I]:0;(!q||!await(a.isElement==null?void 0:a.isElement(re)))&&(q=n.floating[I]||r.floating[y]);const Fe=W/2-U/2,Ie=q/2-w[y]/2-1,ve=Je(f[_],Ie),Ke=Je(f[E],Ie),Oe=ve,Ge=q-w[y]-Ke,ae=q/2-w[y]/2+Fe,at=rs(Oe,ae,Ge),He=!c.arrow&&Tt(o)!=null&&ae!==at&&r.reference[y]/2-(ae<Oe?ve:Ke)-w[y]/2<0,xe=He?ae<Oe?ae-Oe:ae-Ge:0;return{[m]:b[m]+xe,data:{[m]:at,centerOffset:ae-at-xe,...He&&{alignmentOffset:xe}},reset:He}}}),ja=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,s;const{placement:o,middlewareData:r,rects:a,initialPlacement:n,platform:c,elements:u}=t,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:y="none",flipAlignment:w=!0,...k}=St(e,t);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const _=Qe(o),E=Ve(n),I=Qe(n)===n,W=await(c.isRTL==null?void 0:c.isRTL(u.floating)),U=b||(I||!w?[gi(n)]:Pa(n)),re=y!=="none";!b&&re&&U.push(...Ba(n,w,y,W));const q=[n,...U],Fe=await Cs(t,k),Ie=[];let ve=((s=r.flip)==null?void 0:s.overflows)||[];if(p&&Ie.push(Fe[_]),f){const ae=Oa(o,a,W);Ie.push(Fe[ae[0]],Fe[ae[1]])}if(ve=[...ve,{placement:o,overflows:Ie}],!Ie.every(ae=>ae<=0)){var Ke,Oe;const ae=(((Ke=r.flip)==null?void 0:Ke.index)||0)+1,at=q[ae];if(at&&(!(f==="alignment"?E!==Ve(at):!1)||ve.every(_e=>Ve(_e.placement)===E?_e.overflows[0]>0:!0)))return{data:{index:ae,overflows:ve},reset:{placement:at}};let He=(Oe=ve.filter(xe=>xe.overflows[0]<=0).sort((xe,_e)=>xe.overflows[1]-_e.overflows[1])[0])==null?void 0:Oe.placement;if(!He)switch(m){case"bestFit":{var Ge;const xe=(Ge=ve.filter(_e=>{if(re){const Ze=Ve(_e.placement);return Ze===E||Ze==="y"}return!0}).map(_e=>[_e.placement,_e.overflows.filter(Ze=>Ze>0).reduce((Ze,kr)=>Ze+kr,0)]).sort((_e,Ze)=>_e[1]-Ze[1])[0])==null?void 0:Ge[0];xe&&(He=xe);break}case"initialPlacement":He=n;break}if(o!==He)return{reset:{placement:He}}}return{}}}},Ua=new Set(["left","top"]);async function Va(e,t){const{placement:i,platform:s,elements:o}=e,r=await(s.isRTL==null?void 0:s.isRTL(o.floating)),a=Qe(i),n=Tt(i),c=Ve(i)==="y",u=Ua.has(a)?-1:1,p=r&&c?-1:1,f=St(t,e);let{mainAxis:b,crossAxis:m,alignmentAxis:y}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return n&&typeof y=="number"&&(m=n==="end"?y*-1:y),c?{x:m*p,y:b*u}:{x:b*u,y:m*p}}const qa=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var i,s;const{x:o,y:r,placement:a,middlewareData:n}=t,c=await Va(t,e);return a===((i=n.offset)==null?void 0:i.placement)&&(s=n.arrow)!=null&&s.alignmentOffset?{}:{x:o+c.x,y:r+c.y,data:{...c,placement:a}}}}},Wa=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:s,placement:o}=t,{mainAxis:r=!0,crossAxis:a=!1,limiter:n={fn:k=>{let{x:_,y:E}=k;return{x:_,y:E}}},...c}=St(e,t),u={x:i,y:s},p=await Cs(t,c),f=Ve(Qe(o)),b=Ko(f);let m=u[b],y=u[f];if(r){const k=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=m+p[k],I=m-p[_];m=rs(E,m,I)}if(a){const k=f==="y"?"top":"left",_=f==="y"?"bottom":"right",E=y+p[k],I=y-p[_];y=rs(E,y,I)}const w=n.fn({...t,[b]:m,[f]:y});return{...w,data:{x:w.x-i,y:w.y-s,enabled:{[b]:r,[f]:a}}}}}},Ka=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var i,s;const{placement:o,rects:r,platform:a,elements:n}=t,{apply:c=()=>{},...u}=St(e,t),p=await Cs(t,u),f=Qe(o),b=Tt(o),m=Ve(o)==="y",{width:y,height:w}=r.floating;let k,_;f==="top"||f==="bottom"?(k=f,_=b===(await(a.isRTL==null?void 0:a.isRTL(n.floating))?"start":"end")?"left":"right"):(_=f,k=b==="end"?"top":"bottom");const E=w-p.top-p.bottom,I=y-p.left-p.right,W=Je(w-p[k],E),U=Je(y-p[_],I),re=!t.middlewareData.shift;let q=W,Fe=U;if((i=t.middlewareData.shift)!=null&&i.enabled.x&&(Fe=I),(s=t.middlewareData.shift)!=null&&s.enabled.y&&(q=E),re&&!b){const ve=de(p.left,0),Ke=de(p.right,0),Oe=de(p.top,0),Ge=de(p.bottom,0);m?Fe=y-2*(ve!==0||Ke!==0?ve+Ke:de(p.left,p.right)):q=w-2*(Oe!==0||Ge!==0?Oe+Ge:de(p.top,p.bottom))}await c({...t,availableWidth:Fe,availableHeight:q});const Ie=await a.getDimensions(n.floating);return y!==Ie.width||w!==Ie.height?{reset:{rects:!0}}:{}}}};function Ai(){return typeof window<"u"}function Et(e){return Zo(e)?(e.nodeName||"").toLowerCase():"#document"}function ue(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Be(e){var t;return(t=(Zo(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Zo(e){return Ai()?e instanceof Node||e instanceof ue(e).Node:!1}function Te(e){return Ai()?e instanceof Element||e instanceof ue(e).Element:!1}function De(e){return Ai()?e instanceof HTMLElement||e instanceof ue(e).HTMLElement:!1}function ao(e){return!Ai()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof ue(e).ShadowRoot}const Ga=new Set(["inline","contents"]);function Qt(e){const{overflow:t,overflowX:i,overflowY:s,display:o}=Ee(e);return/auto|scroll|overlay|hidden|clip/.test(t+s+i)&&!Ga.has(o)}const Za=new Set(["table","td","th"]);function Xa(e){return Za.has(Et(e))}const Ya=[":popover-open",":modal"];function zi(e){return Ya.some(t=>{try{return e.matches(t)}catch{return!1}})}const Ja=["transform","translate","scale","rotate","perspective"],Qa=["transform","translate","scale","rotate","perspective","filter"],en=["paint","layout","strict","content"];function Ri(e){const t=Ss(),i=Te(e)?Ee(e):e;return Ja.some(s=>i[s]?i[s]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!t&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!t&&(i.filter?i.filter!=="none":!1)||Qa.some(s=>(i.willChange||"").includes(s))||en.some(s=>(i.contain||"").includes(s))}function tn(e){let t=et(e);for(;De(t)&&!_t(t);){if(Ri(t))return t;if(zi(t))return null;t=et(t)}return null}function Ss(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const sn=new Set(["html","body","#document"]);function _t(e){return sn.has(Et(e))}function Ee(e){return ue(e).getComputedStyle(e)}function Ii(e){return Te(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function et(e){if(Et(e)==="html")return e;const t=e.assignedSlot||e.parentNode||ao(e)&&e.host||Be(e);return ao(t)?t.host:t}function Xo(e){const t=et(e);return _t(t)?e.ownerDocument?e.ownerDocument.body:e.body:De(t)&&Qt(t)?t:Xo(t)}function Xt(e,t,i){var s;t===void 0&&(t=[]),i===void 0&&(i=!0);const o=Xo(e),r=o===((s=e.ownerDocument)==null?void 0:s.body),a=ue(o);if(r){const n=ns(a);return t.concat(a,a.visualViewport||[],Qt(o)?o:[],n&&i?Xt(n):[])}return t.concat(o,Xt(o,[],i))}function ns(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Yo(e){const t=Ee(e);let i=parseFloat(t.width)||0,s=parseFloat(t.height)||0;const o=De(e),r=o?e.offsetWidth:i,a=o?e.offsetHeight:s,n=bi(i)!==r||bi(s)!==a;return n&&(i=r,s=a),{width:i,height:s,$:n}}function Ts(e){return Te(e)?e:e.contextElement}function wt(e){const t=Ts(e);if(!De(t))return Le(1);const i=t.getBoundingClientRect(),{width:s,height:o,$:r}=Yo(t);let a=(r?bi(i.width):i.width)/s,n=(r?bi(i.height):i.height)/o;return(!a||!Number.isFinite(a))&&(a=1),(!n||!Number.isFinite(n))&&(n=1),{x:a,y:n}}const on=Le(0);function Jo(e){const t=ue(e);return!Ss()||!t.visualViewport?on:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function rn(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==ue(e)?!1:t}function pt(e,t,i,s){t===void 0&&(t=!1),i===void 0&&(i=!1);const o=e.getBoundingClientRect(),r=Ts(e);let a=Le(1);t&&(s?Te(s)&&(a=wt(s)):a=wt(e));const n=rn(r,i,s)?Jo(r):Le(0);let c=(o.left+n.x)/a.x,u=(o.top+n.y)/a.y,p=o.width/a.x,f=o.height/a.y;if(r){const b=ue(r),m=s&&Te(s)?ue(s):s;let y=b,w=ns(y);for(;w&&s&&m!==y;){const k=wt(w),_=w.getBoundingClientRect(),E=Ee(w),I=_.left+(w.clientLeft+parseFloat(E.paddingLeft))*k.x,W=_.top+(w.clientTop+parseFloat(E.paddingTop))*k.y;c*=k.x,u*=k.y,p*=k.x,f*=k.y,c+=I,u+=W,y=ue(w),w=ns(y)}}return vi({width:p,height:f,x:c,y:u})}function Oi(e,t){const i=Ii(e).scrollLeft;return t?t.left+i:pt(Be(e)).left+i}function Qo(e,t){const i=e.getBoundingClientRect(),s=i.left+t.scrollLeft-Oi(e,i),o=i.top+t.scrollTop;return{x:s,y:o}}function an(e){let{elements:t,rect:i,offsetParent:s,strategy:o}=e;const r=o==="fixed",a=Be(s),n=t?zi(t.floating):!1;if(s===a||n&&r)return i;let c={scrollLeft:0,scrollTop:0},u=Le(1);const p=Le(0),f=De(s);if((f||!f&&!r)&&((Et(s)!=="body"||Qt(a))&&(c=Ii(s)),De(s))){const m=pt(s);u=wt(s),p.x=m.x+s.clientLeft,p.y=m.y+s.clientTop}const b=a&&!f&&!r?Qo(a,c):Le(0);return{width:i.width*u.x,height:i.height*u.y,x:i.x*u.x-c.scrollLeft*u.x+p.x+b.x,y:i.y*u.y-c.scrollTop*u.y+p.y+b.y}}function nn(e){return Array.from(e.getClientRects())}function ln(e){const t=Be(e),i=Ii(e),s=e.ownerDocument.body,o=de(t.scrollWidth,t.clientWidth,s.scrollWidth,s.clientWidth),r=de(t.scrollHeight,t.clientHeight,s.scrollHeight,s.clientHeight);let a=-i.scrollLeft+Oi(e);const n=-i.scrollTop;return Ee(s).direction==="rtl"&&(a+=de(t.clientWidth,s.clientWidth)-o),{width:o,height:r,x:a,y:n}}const no=25;function cn(e,t){const i=ue(e),s=Be(e),o=i.visualViewport;let r=s.clientWidth,a=s.clientHeight,n=0,c=0;if(o){r=o.width,a=o.height;const p=Ss();(!p||p&&t==="fixed")&&(n=o.offsetLeft,c=o.offsetTop)}const u=Oi(s);if(u<=0){const p=s.ownerDocument,f=p.body,b=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,y=Math.abs(s.clientWidth-f.clientWidth-m);y<=no&&(r-=y)}else u<=no&&(r+=u);return{width:r,height:a,x:n,y:c}}const dn=new Set(["absolute","fixed"]);function un(e,t){const i=pt(e,!0,t==="fixed"),s=i.top+e.clientTop,o=i.left+e.clientLeft,r=De(e)?wt(e):Le(1),a=e.clientWidth*r.x,n=e.clientHeight*r.y,c=o*r.x,u=s*r.y;return{width:a,height:n,x:c,y:u}}function lo(e,t,i){let s;if(t==="viewport")s=cn(e,i);else if(t==="document")s=ln(Be(e));else if(Te(t))s=un(t,i);else{const o=Jo(e);s={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return vi(s)}function er(e,t){const i=et(e);return i===t||!Te(i)||_t(i)?!1:Ee(i).position==="fixed"||er(i,t)}function hn(e,t){const i=t.get(e);if(i)return i;let s=Xt(e,[],!1).filter(n=>Te(n)&&Et(n)!=="body"),o=null;const r=Ee(e).position==="fixed";let a=r?et(e):e;for(;Te(a)&&!_t(a);){const n=Ee(a),c=Ri(a);!c&&n.position==="fixed"&&(o=null),(r?!c&&!o:!c&&n.position==="static"&&!!o&&dn.has(o.position)||Qt(a)&&!c&&er(e,a))?s=s.filter(p=>p!==a):o=n,a=et(a)}return t.set(e,s),s}function pn(e){let{element:t,boundary:i,rootBoundary:s,strategy:o}=e;const a=[...i==="clippingAncestors"?zi(t)?[]:hn(t,this._c):[].concat(i),s],n=a[0],c=a.reduce((u,p)=>{const f=lo(t,p,o);return u.top=de(f.top,u.top),u.right=Je(f.right,u.right),u.bottom=Je(f.bottom,u.bottom),u.left=de(f.left,u.left),u},lo(t,n,o));return{width:c.right-c.left,height:c.bottom-c.top,x:c.left,y:c.top}}function mn(e){const{width:t,height:i}=Yo(e);return{width:t,height:i}}function fn(e,t,i){const s=De(t),o=Be(t),r=i==="fixed",a=pt(e,!0,r,t);let n={scrollLeft:0,scrollTop:0};const c=Le(0);function u(){c.x=Oi(o)}if(s||!s&&!r)if((Et(t)!=="body"||Qt(o))&&(n=Ii(t)),s){const m=pt(t,!0,r,t);c.x=m.x+t.clientLeft,c.y=m.y+t.clientTop}else o&&u();r&&!s&&o&&u();const p=o&&!s&&!r?Qo(o,n):Le(0),f=a.left+n.scrollLeft-c.x-p.x,b=a.top+n.scrollTop-c.y-p.y;return{x:f,y:b,width:a.width,height:a.height}}function Gi(e){return Ee(e).position==="static"}function co(e,t){if(!De(e)||Ee(e).position==="fixed")return null;if(t)return t(e);let i=e.offsetParent;return Be(e)===i&&(i=i.ownerDocument.body),i}function tr(e,t){const i=ue(e);if(zi(e))return i;if(!De(e)){let o=et(e);for(;o&&!_t(o);){if(Te(o)&&!Gi(o))return o;o=et(o)}return i}let s=co(e,t);for(;s&&Xa(s)&&Gi(s);)s=co(s,t);return s&&_t(s)&&Gi(s)&&!Ri(s)?i:s||tn(e)||i}const bn=async function(e){const t=this.getOffsetParent||tr,i=this.getDimensions,s=await i(e.floating);return{reference:fn(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:s.width,height:s.height}}};function gn(e){return Ee(e).direction==="rtl"}const hi={convertOffsetParentRelativeRectToViewportRelativeRect:an,getDocumentElement:Be,getClippingRect:pn,getOffsetParent:tr,getElementRects:bn,getClientRects:nn,getDimensions:mn,getScale:wt,isElement:Te,isRTL:gn};function ir(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function vn(e,t){let i=null,s;const o=Be(e);function r(){var n;clearTimeout(s),(n=i)==null||n.disconnect(),i=null}function a(n,c){n===void 0&&(n=!1),c===void 0&&(c=1),r();const u=e.getBoundingClientRect(),{left:p,top:f,width:b,height:m}=u;if(n||t(),!b||!m)return;const y=ai(f),w=ai(o.clientWidth-(p+b)),k=ai(o.clientHeight-(f+m)),_=ai(p),I={rootMargin:-y+"px "+-w+"px "+-k+"px "+-_+"px",threshold:de(0,Je(1,c))||1};let W=!0;function U(re){const q=re[0].intersectionRatio;if(q!==c){if(!W)return a();q?a(!1,q):s=setTimeout(()=>{a(!1,1e-7)},1e3)}q===1&&!ir(u,e.getBoundingClientRect())&&a(),W=!1}try{i=new IntersectionObserver(U,{...I,root:o.ownerDocument})}catch{i=new IntersectionObserver(U,I)}i.observe(e)}return a(!0),r}function yn(e,t,i,s){s===void 0&&(s={});const{ancestorScroll:o=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:n=typeof IntersectionObserver=="function",animationFrame:c=!1}=s,u=Ts(e),p=o||r?[...u?Xt(u):[],...Xt(t)]:[];p.forEach(_=>{o&&_.addEventListener("scroll",i,{passive:!0}),r&&_.addEventListener("resize",i)});const f=u&&n?vn(u,i):null;let b=-1,m=null;a&&(m=new ResizeObserver(_=>{let[E]=_;E&&E.target===u&&m&&(m.unobserve(t),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var I;(I=m)==null||I.observe(t)})),i()}),u&&!c&&m.observe(u),m.observe(t));let y,w=c?pt(e):null;c&&k();function k(){const _=pt(e);w&&!ir(w,_)&&i(),w=_,y=requestAnimationFrame(k)}return i(),()=>{var _;p.forEach(E=>{o&&E.removeEventListener("scroll",i),r&&E.removeEventListener("resize",i)}),f==null||f(),(_=m)==null||_.disconnect(),m=null,c&&cancelAnimationFrame(y)}}const wn=qa,kn=Wa,xn=ja,uo=Ka,_n=Ha,$n=(e,t,i)=>{const s=new Map,o={platform:hi,...i},r={...o.platform,_c:s};return Fa(e,t,{...o,platform:r})};function Cn(e){return Sn(e)}function Zi(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Sn(e){for(let t=e;t;t=Zi(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=Zi(e);t;t=Zi(t)){if(!(t instanceof Element))continue;const i=getComputedStyle(t);if(i.display!=="contents"&&(i.position!=="static"||Ri(i)||t.tagName==="BODY"))return t}return null}function Tn(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var D=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let s=0,o=0,r=0,a=0,n=0,c=0,u=0,p=0;i?e.top<t.top?(s=e.left,o=e.bottom,r=e.right,a=e.bottom,n=t.left,c=t.top,u=t.right,p=t.top):(s=t.left,o=t.bottom,r=t.right,a=t.bottom,n=e.left,c=e.top,u=e.right,p=e.top):e.left<t.left?(s=e.right,o=e.top,r=t.left,a=t.top,n=e.right,c=e.bottom,u=t.left,p=t.bottom):(s=t.right,o=t.top,r=e.left,a=e.top,n=t.right,c=t.bottom,u=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${s}px`),this.style.setProperty("--hover-bridge-top-left-y",`${o}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${c}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||Tn(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=yn(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[wn({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(uo({apply:({rects:i})=>{const s=this.sync==="width"||this.sync==="both",o=this.sync==="height"||this.sync==="both";this.popup.style.width=s?`${i.reference.width}px`:"",this.popup.style.height=o?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(xn({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(kn({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(uo({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:s})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${s}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(_n({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?i=>hi.getOffsetParent(i,Cn):hi.getOffsetParent;$n(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:Yt(qe({},hi),{getOffsetParent:t})}).then(({x:i,y:s,middlewareData:o,placement:r})=>{const a=this.localize.dir()==="rtl",n={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${i}px`,top:`${s}px`}),this.arrow){const c=o.arrow.x,u=o.arrow.y;let p="",f="",b="",m="";if(this.arrowPlacement==="start"){const y=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=a?y:"",m=a?"":y}else if(this.arrowPlacement==="end"){const y=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=a?"":y,m=a?y:"",b=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof c=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof c=="number"?`${c}px`:"",p=typeof u=="number"?`${u}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:b,left:m,[n]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return h`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${B({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${B({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?h`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};D.styles=[j,Aa];l([$(".popup")],D.prototype,"popup",2);l([$(".popup__arrow")],D.prototype,"arrowEl",2);l([d()],D.prototype,"anchor",2);l([d({type:Boolean,reflect:!0})],D.prototype,"active",2);l([d({reflect:!0})],D.prototype,"placement",2);l([d({reflect:!0})],D.prototype,"strategy",2);l([d({type:Number})],D.prototype,"distance",2);l([d({type:Number})],D.prototype,"skidding",2);l([d({type:Boolean})],D.prototype,"arrow",2);l([d({attribute:"arrow-placement"})],D.prototype,"arrowPlacement",2);l([d({attribute:"arrow-padding",type:Number})],D.prototype,"arrowPadding",2);l([d({type:Boolean})],D.prototype,"flip",2);l([d({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],D.prototype,"flipFallbackPlacements",2);l([d({attribute:"flip-fallback-strategy"})],D.prototype,"flipFallbackStrategy",2);l([d({type:Object})],D.prototype,"flipBoundary",2);l([d({attribute:"flip-padding",type:Number})],D.prototype,"flipPadding",2);l([d({type:Boolean})],D.prototype,"shift",2);l([d({type:Object})],D.prototype,"shiftBoundary",2);l([d({attribute:"shift-padding",type:Number})],D.prototype,"shiftPadding",2);l([d({attribute:"auto-size"})],D.prototype,"autoSize",2);l([d()],D.prototype,"sync",2);l([d({type:Object})],D.prototype,"autoSizeBoundary",2);l([d({attribute:"auto-size-padding",type:Number})],D.prototype,"autoSizePadding",2);l([d({attribute:"hover-bridge",type:Boolean})],D.prototype,"hoverBridge",2);var sr=new Map,En=new WeakMap;function An(e){return e??{keyframes:[],options:{duration:0}}}function ho(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function F(e,t){sr.set(e,An(t))}function G(e,t,i){const s=En.get(e);if(s!=null&&s[t])return ho(s[t],i.dir);const o=sr.get(t);return o?ho(o,i.dir):{keyframes:[],options:{duration:0}}}function ce(e,t){return new Promise(i=>{function s(o){o.target===e&&(e.removeEventListener(t,s),i())}e.addEventListener(t,s)})}function Z(e,t,i){return new Promise(s=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const o=e.animate(t,Yt(qe({},i),{duration:zn()?0:i.duration}));o.addEventListener("cancel",s,{once:!0}),o.addEventListener("finish",s,{once:!0})})}function po(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function zn(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function Y(e){return Promise.all(e.getAnimations().map(t=>new Promise(i=>{t.cancel(),requestAnimationFrame(i)})))}function mo(e,t){return e.map(i=>Yt(qe({},i),{height:i.height==="auto"?`${t}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ls=class extends Ti{constructor(t){if(super(t),this.it=g,t.type!==Ue.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===g||t==null)return this._t=void 0,this.it=t;if(t===ye)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};ls.directiveName="unsafeHTML",ls.resultType=1;const Es=Si(ls);var A=class extends P{constructor(){super(...arguments),this.formControlController=new Jt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new We(this,"help-text","label"),this.localize=new se(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>h`
      <sl-tag
        part="tag"
        exportparts="
              base:tag__base,
              content:tag__content,
              remove-button:tag__remove-button,
              remove-button__base:tag__remove-button__base
            "
        ?pill=${this.pill}
        size=${this.size}
        removable
        @sl-remove=${t=>this.handleTagRemove(t,e)}
      >
        ${e.getTextLabel()}
      </sl-tag>
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,i=t.closest(".select__clear")!==null,s=t.closest("sl-icon-button")!==null;if(!(i||s)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const o=this.getAllOptions(),r=o.indexOf(this.currentOption);let a=Math.max(0,r);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(a=r+1,a>o.length-1&&(a=0)):e.key==="ArrowUp"?(a=r-1,a<0&&(a=o.length-1)):e.key==="Home"?a=0:e.key==="End"&&(a=o.length-1),this.setCurrentOption(o[a])}if(e.key&&e.key.length===1||e.key==="Backspace"){const o=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const r of o)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const i=e.composedPath().some(s=>s instanceof Element&&s.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const i=e.target.closest("sl-option"),s=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==s&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(t)?t:[t],s=[];e.forEach(o=>s.push(o.value)),this.setSelectedOptions(e.filter(o=>i.includes(o.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),i=Array.isArray(e)?e:[e];t.forEach(s=>s.selected=!1),i.length&&i.forEach(s=>s.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,i;const s=this.getAllOptions();this.selectedOptions=s.filter(r=>r.selected);const o=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(e=r==null?void 0:r.value)!=null?e:"",this.displayLabel=(i=(t=r==null?void 0:r.getTextLabel)==null?void 0:t.call(r))!=null?i:""}this.valueHasChanged=o,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(e,t);return h`<div @sl-remove=${s=>this.handleTagRemove(s,e)}>
          ${typeof i=="string"?Es(i):i}
        </div>`}else if(t===this.maxOptionsVisible)return h`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return h``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,i){if(super.attributeChangedCallback(e,t,i),e==="value"){const s=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=s}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(i=>t.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await Y(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=G(this,"select.show",{dir:this.localize.dir()});await Z(this.popup.popup,e,t),this.currentOption&&os(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Y(this);const{keyframes:e,options:t}=G(this,"select.hide",{dir:this.localize.dir()});await Z(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ce(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ce(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t,o=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return h`
      <div
        part="form-control"
        class=${B({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
      >
        <label
          id="label"
          part="form-control-label"
          class="form-control__label"
          aria-hidden=${i?"false":"true"}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <sl-popup
            class=${B({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":r,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
            placement=${this.placement}
            strategy=${this.hoist?"fixed":"absolute"}
            flip
            shift
            sync="width"
            auto-size="vertical"
            auto-size-padding="10"
          >
            <div
              part="combobox"
              class="select__combobox"
              slot="anchor"
              @keydown=${this.handleComboboxKeyDown}
              @mousedown=${this.handleComboboxMouseDown}
            >
              <slot part="prefix" name="prefix" class="select__prefix"></slot>

              <input
                part="display-input"
                class="select__display-input"
                type="text"
                placeholder=${this.placeholder}
                .disabled=${this.disabled}
                .value=${this.displayLabel}
                autocomplete="off"
                spellcheck="false"
                autocapitalize="off"
                readonly
                aria-controls="listbox"
                aria-expanded=${this.open?"true":"false"}
                aria-haspopup="listbox"
                aria-labelledby="label"
                aria-disabled=${this.disabled?"true":"false"}
                aria-describedby="help-text"
                role="combobox"
                tabindex="0"
                @focus=${this.handleFocus}
                @blur=${this.handleBlur}
              />

              ${this.multiple?h`<div part="tags" class="select__tags">${this.tags}</div>`:""}

              <input
                class="select__value-input"
                type="text"
                ?disabled=${this.disabled}
                ?required=${this.required}
                .value=${Array.isArray(this.value)?this.value.join(", "):this.value}
                tabindex="-1"
                aria-hidden="true"
                @focus=${()=>this.focus()}
                @invalid=${this.handleInvalid}
              />

              ${o?h`
                    <button
                      part="clear-button"
                      class="select__clear"
                      type="button"
                      aria-label=${this.localize.term("clearEntry")}
                      @mousedown=${this.handleClearMouseDown}
                      @click=${this.handleClearClick}
                      tabindex="-1"
                    >
                      <slot name="clear-icon">
                        <sl-icon name="x-circle-fill" library="system"></sl-icon>
                      </slot>
                    </button>
                  `:""}

              <slot name="suffix" part="suffix" class="select__suffix"></slot>

              <slot name="expand-icon" part="expand-icon" class="select__expand-icon">
                <sl-icon library="system" name="chevron-down"></sl-icon>
              </slot>
            </div>

            <div
              id="listbox"
              role="listbox"
              aria-expanded=${this.open?"true":"false"}
              aria-multiselectable=${this.multiple?"true":"false"}
              aria-labelledby="label"
              part="listbox"
              class="select__listbox"
              tabindex="-1"
              @mouseup=${this.handleOptionClick}
              @slotchange=${this.handleDefaultSlotChange}
            >
              <slot></slot>
            </div>
          </sl-popup>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};A.styles=[j,Ei,Ca];A.dependencies={"sl-icon":ee,"sl-popup":D,"sl-tag":bt};l([$(".select")],A.prototype,"popup",2);l([$(".select__combobox")],A.prototype,"combobox",2);l([$(".select__display-input")],A.prototype,"displayInput",2);l([$(".select__value-input")],A.prototype,"valueInput",2);l([$(".select__listbox")],A.prototype,"listbox",2);l([v()],A.prototype,"hasFocus",2);l([v()],A.prototype,"displayLabel",2);l([v()],A.prototype,"currentOption",2);l([v()],A.prototype,"selectedOptions",2);l([v()],A.prototype,"valueHasChanged",2);l([d()],A.prototype,"name",2);l([v()],A.prototype,"value",1);l([d({attribute:"value"})],A.prototype,"defaultValue",2);l([d({reflect:!0})],A.prototype,"size",2);l([d()],A.prototype,"placeholder",2);l([d({type:Boolean,reflect:!0})],A.prototype,"multiple",2);l([d({attribute:"max-options-visible",type:Number})],A.prototype,"maxOptionsVisible",2);l([d({type:Boolean,reflect:!0})],A.prototype,"disabled",2);l([d({type:Boolean})],A.prototype,"clearable",2);l([d({type:Boolean,reflect:!0})],A.prototype,"open",2);l([d({type:Boolean})],A.prototype,"hoist",2);l([d({type:Boolean,reflect:!0})],A.prototype,"filled",2);l([d({type:Boolean,reflect:!0})],A.prototype,"pill",2);l([d()],A.prototype,"label",2);l([d({reflect:!0})],A.prototype,"placement",2);l([d({attribute:"help-text"})],A.prototype,"helpText",2);l([d({reflect:!0})],A.prototype,"form",2);l([d({type:Boolean,reflect:!0})],A.prototype,"required",2);l([d()],A.prototype,"getTag",2);l([T("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);l([T(["defaultValue","value"],{waitUntilFirstUpdate:!0})],A.prototype,"handleValueChange",1);l([T("open",{waitUntilFirstUpdate:!0})],A.prototype,"handleOpenChange",1);F("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});F("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});A.define("sl-select");var Rn=C`
  :host {
    display: block;
    user-select: none;
    -webkit-user-select: none;
  }

  :host(:focus) {
    outline: none;
  }

  .option {
    position: relative;
    display: flex;
    align-items: center;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-letter-spacing-normal);
    color: var(--sl-color-neutral-700);
    padding: var(--sl-spacing-x-small) var(--sl-spacing-medium) var(--sl-spacing-x-small) var(--sl-spacing-x-small);
    transition: var(--sl-transition-fast) fill;
    cursor: pointer;
  }

  .option--hover:not(.option--current):not(.option--disabled) {
    background-color: var(--sl-color-neutral-100);
    color: var(--sl-color-neutral-1000);
  }

  .option--current,
  .option--current.option--disabled {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
    opacity: 1;
  }

  .option--disabled {
    outline: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option__label {
    flex: 1 1 auto;
    display: inline-block;
    line-height: var(--sl-line-height-dense);
  }

  .option .option__check {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    padding-inline-end: var(--sl-spacing-2x-small);
  }

  .option--selected .option__check {
    visibility: visible;
  }

  .option__prefix,
  .option__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .option__prefix::slotted(*) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .option__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  @media (forced-colors: active) {
    :host(:hover:not([aria-disabled='true'])) .option {
      outline: dashed 1px SelectedItem;
      outline-offset: -1px;
    }
  }
`,we=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(t+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(t+=i.textContent)}),t.trim()}render(){return h`
      <div
        part="base"
        class=${B({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};we.styles=[j,Rn];we.dependencies={"sl-icon":ee};l([$(".option__label")],we.prototype,"defaultSlot",2);l([v()],we.prototype,"current",2);l([v()],we.prototype,"selected",2);l([v()],we.prototype,"hasHover",2);l([d({reflect:!0})],we.prototype,"value",2);l([d({type:Boolean,reflect:!0})],we.prototype,"disabled",2);l([T("disabled")],we.prototype,"handleDisabledChange",1);l([T("selected")],we.prototype,"handleSelectedChange",1);l([T("value")],we.prototype,"handleValueChange",1);we.define("sl-option");var In=C`
  :host {
    --size: 25rem;
    --header-spacing: var(--sl-spacing-large);
    --body-spacing: var(--sl-spacing-large);
    --footer-spacing: var(--sl-spacing-large);

    display: contents;
  }

  .drawer {
    top: 0;
    inset-inline-start: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }

  .drawer--contained {
    position: absolute;
    z-index: initial;
  }

  .drawer--fixed {
    position: fixed;
    z-index: var(--sl-z-index-drawer);
  }

  .drawer__panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    z-index: 2;
    max-width: 100%;
    max-height: 100%;
    background-color: var(--sl-panel-background-color);
    box-shadow: var(--sl-shadow-x-large);
    overflow: auto;
    pointer-events: all;
  }

  .drawer__panel:focus {
    outline: none;
  }

  .drawer--top .drawer__panel {
    top: 0;
    inset-inline-end: auto;
    bottom: auto;
    inset-inline-start: 0;
    width: 100%;
    height: var(--size);
  }

  .drawer--end .drawer__panel {
    top: 0;
    inset-inline-end: 0;
    bottom: auto;
    inset-inline-start: auto;
    width: var(--size);
    height: 100%;
  }

  .drawer--bottom .drawer__panel {
    top: auto;
    inset-inline-end: auto;
    bottom: 0;
    inset-inline-start: 0;
    width: 100%;
    height: var(--size);
  }

  .drawer--start .drawer__panel {
    top: 0;
    inset-inline-end: auto;
    bottom: auto;
    inset-inline-start: 0;
    width: var(--size);
    height: 100%;
  }

  .drawer__header {
    display: flex;
  }

  .drawer__title {
    flex: 1 1 auto;
    font: inherit;
    font-size: var(--sl-font-size-large);
    line-height: var(--sl-line-height-dense);
    padding: var(--header-spacing);
    margin: 0;
  }

  .drawer__header-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--sl-spacing-2x-small);
    padding: 0 var(--header-spacing);
  }

  .drawer__header-actions sl-icon-button,
  .drawer__header-actions ::slotted(sl-icon-button) {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
  }

  .drawer__body {
    flex: 1 1 auto;
    display: block;
    padding: var(--body-spacing);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .drawer__footer {
    text-align: right;
    padding: var(--footer-spacing);
  }

  .drawer__footer ::slotted(sl-button:not(:last-of-type)) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .drawer:not(.drawer--has-footer) .drawer__footer {
    display: none;
  }

  .drawer__overlay {
    display: block;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--sl-overlay-background-color);
    pointer-events: all;
  }

  .drawer--contained .drawer__overlay {
    display: none;
  }

  @media (forced-colors: active) {
    .drawer__panel {
      border: solid 1px var(--sl-color-neutral-0);
    }
  }
`;function*As(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*ta(As(e.shadowRoot.activeElement))))}function or(){return[...As()].pop()}var fo=new WeakMap;function rr(e){let t=fo.get(e);return t||(t=window.getComputedStyle(e,null),fo.set(e,t)),t}function On(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=rr(e);return t.visibility!=="hidden"&&t.display!=="none"}function Pn(e){const t=rr(e),{overflowY:i,overflowX:s}=t;return i==="scroll"||s==="scroll"?!0:i!=="auto"||s!=="auto"?!1:e.scrollHeight>e.clientHeight&&i==="auto"||e.scrollWidth>e.clientWidth&&s==="auto"}function Ln(e){const t=e.tagName.toLowerCase(),i=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const r=e.getRootNode(),a=`input[type='radio'][name="${e.getAttribute("name")}"]`,n=r.querySelector(`${a}:checked`);return n?n===e:r.querySelector(a)===e}return On(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:Pn(e):!1}function Dn(e){var t,i;const s=cs(e),o=(t=s[0])!=null?t:null,r=(i=s[s.length-1])!=null?i:null;return{start:o,end:r}}function Mn(e,t){var i;return((i=e.getRootNode({composed:!0}))==null?void 0:i.host)!==t}function cs(e){const t=new WeakMap,i=[];function s(o){if(o instanceof Element){if(o.hasAttribute("inert")||o.closest("[inert]")||t.has(o))return;t.set(o,!0),!i.includes(o)&&Ln(o)&&i.push(o),o instanceof HTMLSlotElement&&Mn(o,e)&&o.assignedElements({flatten:!0}).forEach(r=>{s(r)}),o.shadowRoot!==null&&o.shadowRoot.mode==="open"&&s(o.shadowRoot)}for(const r of o.children)s(r)}return s(e),i.sort((o,r)=>{const a=Number(o.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var Bt=[],ar=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var i;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const s=or();if(this.previousFocus=s,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const o=cs(this.element);let r=o.findIndex(n=>n===s);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=o.length?r=0:r+a<0?r=o.length-1:r+=a,this.previousFocus=this.currentFocus;const n=o[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||n&&this.possiblyHasTabbableChildren(n))return;t.preventDefault(),this.currentFocus=n,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const c=[...As()];if(c.includes(this.currentFocus)||!c.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Bt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Bt=Bt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Bt[Bt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=cs(this.element);if(!this.element.matches(":focus-within")){const t=e[0],i=e[e.length-1],s=this.tabDirection==="forward"?t:i;typeof(s==null?void 0:s.focus)=="function"&&(this.currentFocus=s,s.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},zs=e=>{var t;const{activeElement:i}=document;i&&e.contains(i)&&((t=document.activeElement)==null||t.blur())};function bo(e){return e.charAt(0).toUpperCase()+e.slice(1)}var me=class extends P{constructor(){super(...arguments),this.hasSlotController=new We(this,"footer"),this.localize=new se(this),this.modal=new ar(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Vt(this)))}disconnectedCallback(){super.disconnectedCallback(),qt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=G(this,"drawer.denyClose",{dir:this.localize.dir()});Z(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Vt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Y(this.drawer),Y(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=G(this,`drawer.show${bo(this.placement)}`,{dir:this.localize.dir()}),i=G(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([Z(this.panel,t.keyframes,t.options),Z(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{zs(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),qt(this)),await Promise.all([Y(this.drawer),Y(this.overlay)]);const e=G(this,`drawer.hide${bo(this.placement)}`,{dir:this.localize.dir()}),t=G(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([Z(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),Z(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Vt(this)),this.open&&this.contained&&(this.modal.deactivate(),qt(this))}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${B({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="drawer__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${x(this.noHeader?this.label:void 0)}
          aria-labelledby=${x(this.noHeader?void 0:"title")}
          tabindex="0"
        >
          ${this.noHeader?"":h`
                <header part="header" class="drawer__header">
                  <h2 part="title" class="drawer__title" id="title">
                    <!-- If there's no label, use an invisible character to prevent the header from collapsing -->
                    <slot name="label"> ${this.label.length>0?this.label:"\uFEFF"} </slot>
                  </h2>
                  <div part="header-actions" class="drawer__header-actions">
                    <slot name="header-actions"></slot>
                    <sl-icon-button
                      part="close-button"
                      exportparts="base:close-button__base"
                      class="drawer__close"
                      name="x-lg"
                      label=${this.localize.term("close")}
                      library="system"
                      @click=${()=>this.requestClose("close-button")}
                    ></sl-icon-button>
                  </div>
                </header>
              `}

          <slot part="body" class="drawer__body"></slot>

          <footer part="footer" class="drawer__footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `}};me.styles=[j,In];me.dependencies={"sl-icon-button":X};l([$(".drawer")],me.prototype,"drawer",2);l([$(".drawer__panel")],me.prototype,"panel",2);l([$(".drawer__overlay")],me.prototype,"overlay",2);l([d({type:Boolean,reflect:!0})],me.prototype,"open",2);l([d({reflect:!0})],me.prototype,"label",2);l([d({reflect:!0})],me.prototype,"placement",2);l([d({type:Boolean,reflect:!0})],me.prototype,"contained",2);l([d({attribute:"no-header",type:Boolean,reflect:!0})],me.prototype,"noHeader",2);l([T("open",{waitUntilFirstUpdate:!0})],me.prototype,"handleOpenChange",1);l([T("contained",{waitUntilFirstUpdate:!0})],me.prototype,"handleNoModalChange",1);F("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});F("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});F("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});F("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});F("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});F("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});F("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});F("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});F("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});F("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});F("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});me.define("sl-drawer");var Bn=C`
  :host {
    --width: 31rem;
    --header-spacing: var(--sl-spacing-large);
    --body-spacing: var(--sl-spacing-large);
    --footer-spacing: var(--sl-spacing-large);

    display: contents;
  }

  .dialog {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: var(--sl-z-index-dialog);
  }

  .dialog__panel {
    display: flex;
    flex-direction: column;
    z-index: 2;
    width: var(--width);
    max-width: calc(100% - var(--sl-spacing-2x-large));
    max-height: calc(100% - var(--sl-spacing-2x-large));
    background-color: var(--sl-panel-background-color);
    border-radius: var(--sl-border-radius-medium);
    box-shadow: var(--sl-shadow-x-large);
  }

  .dialog__panel:focus {
    outline: none;
  }

  /* Ensure there's enough vertical padding for phones that don't update vh when chrome appears (e.g. iPhone) */
  @media screen and (max-width: 420px) {
    .dialog__panel {
      max-height: 80vh;
    }
  }

  .dialog--open .dialog__panel {
    display: flex;
    opacity: 1;
  }

  .dialog__header {
    flex: 0 0 auto;
    display: flex;
  }

  .dialog__title {
    flex: 1 1 auto;
    font: inherit;
    font-size: var(--sl-font-size-large);
    line-height: var(--sl-line-height-dense);
    padding: var(--header-spacing);
    margin: 0;
  }

  .dialog__header-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--sl-spacing-2x-small);
    padding: 0 var(--header-spacing);
  }

  .dialog__header-actions sl-icon-button,
  .dialog__header-actions ::slotted(sl-icon-button) {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
  }

  .dialog__body {
    flex: 1 1 auto;
    display: block;
    padding: var(--body-spacing);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dialog__footer {
    flex: 0 0 auto;
    text-align: right;
    padding: var(--footer-spacing);
  }

  .dialog__footer ::slotted(sl-button:not(:first-of-type)) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  .dialog:not(.dialog--has-footer) .dialog__footer {
    display: none;
  }

  .dialog__overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--sl-overlay-background-color);
  }

  @media (forced-colors: active) {
    .dialog__panel {
      border: solid 1px var(--sl-color-neutral-0);
    }
  }
`,Ne=class extends P{constructor(){super(...arguments),this.hasSlotController=new We(this,"footer"),this.localize=new se(this),this.modal=new ar(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Vt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),qt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=G(this,"dialog.denyClose",{dir:this.localize.dir()});Z(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Vt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Y(this.dialog),Y(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=G(this,"dialog.show",{dir:this.localize.dir()}),i=G(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([Z(this.panel,t.keyframes,t.options),Z(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{zs(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([Y(this.dialog),Y(this.overlay)]);const e=G(this,"dialog.hide",{dir:this.localize.dir()}),t=G(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([Z(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),Z(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,qt(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${B({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="dialog__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${x(this.noHeader?this.label:void 0)}
          aria-labelledby=${x(this.noHeader?void 0:"title")}
          tabindex="-1"
        >
          ${this.noHeader?"":h`
                <header part="header" class="dialog__header">
                  <h2 part="title" class="dialog__title" id="title">
                    <slot name="label"> ${this.label.length>0?this.label:"\uFEFF"} </slot>
                  </h2>
                  <div part="header-actions" class="dialog__header-actions">
                    <slot name="header-actions"></slot>
                    <sl-icon-button
                      part="close-button"
                      exportparts="base:close-button__base"
                      class="dialog__close"
                      name="x-lg"
                      label=${this.localize.term("close")}
                      library="system"
                      @click="${()=>this.requestClose("close-button")}"
                    ></sl-icon-button>
                  </div>
                </header>
              `}
          ${""}
          <div part="body" class="dialog__body" tabindex="-1"><slot></slot></div>

          <footer part="footer" class="dialog__footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `}};Ne.styles=[j,Bn];Ne.dependencies={"sl-icon-button":X};l([$(".dialog")],Ne.prototype,"dialog",2);l([$(".dialog__panel")],Ne.prototype,"panel",2);l([$(".dialog__overlay")],Ne.prototype,"overlay",2);l([d({type:Boolean,reflect:!0})],Ne.prototype,"open",2);l([d({reflect:!0})],Ne.prototype,"label",2);l([d({attribute:"no-header",type:Boolean,reflect:!0})],Ne.prototype,"noHeader",2);l([T("open",{waitUntilFirstUpdate:!0})],Ne.prototype,"handleOpenChange",1);F("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});F("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});F("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});F("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});F("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Ne.define("sl-dialog");var Nn=C`
  :host {
    display: inline-flex;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: max(12px, 0.75em);
    font-weight: var(--sl-font-weight-semibold);
    letter-spacing: var(--sl-letter-spacing-normal);
    line-height: 1;
    border-radius: var(--sl-border-radius-small);
    border: solid 1px var(--sl-color-neutral-0);
    white-space: nowrap;
    padding: 0.35em 0.6em;
    user-select: none;
    -webkit-user-select: none;
    cursor: inherit;
  }

  /* Variant modifiers */
  .badge--primary {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--success {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--neutral {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--warning {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--danger {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /* Pill modifier */
  .badge--pill {
    border-radius: var(--sl-border-radius-pill);
  }

  /* Pulse modifier */
  .badge--pulse {
    animation: pulse 1.5s infinite;
  }

  .badge--pulse.badge--primary {
    --pulse-color: var(--sl-color-primary-600);
  }

  .badge--pulse.badge--success {
    --pulse-color: var(--sl-color-success-600);
  }

  .badge--pulse.badge--neutral {
    --pulse-color: var(--sl-color-neutral-600);
  }

  .badge--pulse.badge--warning {
    --pulse-color: var(--sl-color-warning-600);
  }

  .badge--pulse.badge--danger {
    --pulse-color: var(--sl-color-danger-600);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 var(--pulse-color);
    }
    70% {
      box-shadow: 0 0 0 0.5rem transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
`,ei=class extends P{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return h`
      <span
        part="base"
        class=${B({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};ei.styles=[j,Nn];l([d({reflect:!0})],ei.prototype,"variant",2);l([d({type:Boolean,reflect:!0})],ei.prototype,"pill",2);l([d({type:Boolean,reflect:!0})],ei.prototype,"pulse",2);ei.define("sl-badge");var Fn=C`
  :host {
    display: contents;

    /* For better DX, we'll reset the margin here so the base part can inherit it */
    margin: 0;
  }

  .alert {
    position: relative;
    display: flex;
    align-items: stretch;
    background-color: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-top-width: calc(var(--sl-panel-border-width) * 3);
    border-radius: var(--sl-border-radius-medium);
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-normal);
    line-height: 1.6;
    color: var(--sl-color-neutral-700);
    margin: inherit;
    overflow: hidden;
  }

  .alert:not(.alert--has-icon) .alert__icon,
  .alert:not(.alert--closable) .alert__close-button {
    display: none;
  }

  .alert__icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-large);
    padding-inline-start: var(--sl-spacing-large);
  }

  .alert--has-countdown {
    border-bottom: none;
  }

  .alert--primary {
    border-top-color: var(--sl-color-primary-600);
  }

  .alert--primary .alert__icon {
    color: var(--sl-color-primary-600);
  }

  .alert--success {
    border-top-color: var(--sl-color-success-600);
  }

  .alert--success .alert__icon {
    color: var(--sl-color-success-600);
  }

  .alert--neutral {
    border-top-color: var(--sl-color-neutral-600);
  }

  .alert--neutral .alert__icon {
    color: var(--sl-color-neutral-600);
  }

  .alert--warning {
    border-top-color: var(--sl-color-warning-600);
  }

  .alert--warning .alert__icon {
    color: var(--sl-color-warning-600);
  }

  .alert--danger {
    border-top-color: var(--sl-color-danger-600);
  }

  .alert--danger .alert__icon {
    color: var(--sl-color-danger-600);
  }

  .alert__message {
    flex: 1 1 auto;
    display: block;
    padding: var(--sl-spacing-large);
    overflow: hidden;
  }

  .alert__close-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
    margin-inline-end: var(--sl-spacing-medium);
    align-self: center;
  }

  .alert__countdown {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(var(--sl-panel-border-width) * 3);
    background-color: var(--sl-panel-border-color);
    display: flex;
  }

  .alert__countdown--ltr {
    justify-content: flex-end;
  }

  .alert__countdown .alert__countdown-elapsed {
    height: 100%;
    width: 0;
  }

  .alert--primary .alert__countdown-elapsed {
    background-color: var(--sl-color-primary-600);
  }

  .alert--success .alert__countdown-elapsed {
    background-color: var(--sl-color-success-600);
  }

  .alert--neutral .alert__countdown-elapsed {
    background-color: var(--sl-color-neutral-600);
  }

  .alert--warning .alert__countdown-elapsed {
    background-color: var(--sl-color-warning-600);
  }

  .alert--danger .alert__countdown-elapsed {
    background-color: var(--sl-color-danger-600);
  }

  .alert__timer {
    display: none;
  }
`,fe=class lt extends P{constructor(){super(...arguments),this.hasSlotController=new We(this,"icon","suffix"),this.localize=new se(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,i="100%",s="0";this.countdownAnimation=t.animate([{width:i},{width:s}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await Y(this.base),this.base.hidden=!1;const{keyframes:t,options:i}=G(this,"alert.show",{dir:this.localize.dir()});await Z(this.base,t,i),this.emit("sl-after-show")}else{zs(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await Y(this.base);const{keyframes:t,options:i}=G(this,"alert.hide",{dir:this.localize.dir()});await Z(this.base,t,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),lt.toastStack.parentElement===null&&document.body.append(lt.toastStack),lt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{lt.toastStack.removeChild(this),t(),lt.toastStack.querySelector("sl-alert")===null&&lt.toastStack.remove()},{once:!0})})}render(){return h`
      <div
        part="base"
        class=${B({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
        role="alert"
        aria-hidden=${this.open?"false":"true"}
        @mouseenter=${this.pauseAutoHide}
        @mouseleave=${this.resumeAutoHide}
      >
        <div part="icon" class="alert__icon">
          <slot name="icon"></slot>
        </div>

        <div part="message" class="alert__message" aria-live="polite">
          <slot></slot>
        </div>

        ${this.closable?h`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                class="alert__close-button"
                name="x-lg"
                library="system"
                label=${this.localize.term("close")}
                @click=${this.handleCloseClick}
              ></sl-icon-button>
            `:""}

        <div role="timer" class="alert__timer">${this.remainingTime}</div>

        ${this.countdown?h`
              <div
                class=${B({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};fe.styles=[j,Fn];fe.dependencies={"sl-icon-button":X};l([$('[part~="base"]')],fe.prototype,"base",2);l([$(".alert__countdown-elapsed")],fe.prototype,"countdownElement",2);l([d({type:Boolean,reflect:!0})],fe.prototype,"open",2);l([d({type:Boolean,reflect:!0})],fe.prototype,"closable",2);l([d({reflect:!0})],fe.prototype,"variant",2);l([d({type:Number})],fe.prototype,"duration",2);l([d({type:String,reflect:!0})],fe.prototype,"countdown",2);l([v()],fe.prototype,"remainingTime",2);l([T("open",{waitUntilFirstUpdate:!0})],fe.prototype,"handleOpenChange",1);l([T("duration")],fe.prototype,"handleDurationChange",1);var Hn=fe;F("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});F("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});Hn.define("sl-alert");var jn=C`
  :host {
    display: block;
  }

  .textarea {
    display: grid;
    align-items: center;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
    cursor: text;
  }

  /* Standard textareas */
  .textarea--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .textarea--standard:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }
  .textarea--standard:hover:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-hover);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    color: var(--sl-input-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-focus);
  }

  .textarea--standard.textarea--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control,
  .textarea__size-adjuster {
    grid-area: 1 / 1 / 2 / 2;
  }

  .textarea__size-adjuster {
    visibility: hidden;
    pointer-events: none;
    opacity: 0;
  }

  .textarea--standard.textarea--disabled .textarea__control {
    color: var(--sl-input-color-disabled);
  }

  .textarea--standard.textarea--disabled .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled textareas */
  .textarea--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .textarea--filled:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .textarea--filled.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .textarea--filled.textarea--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.4;
    color: var(--sl-input-color);
    border: none;
    background: none;
    box-shadow: none;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .textarea__control::-webkit-search-decoration,
  .textarea__control::-webkit-search-cancel-button,
  .textarea__control::-webkit-search-results-button,
  .textarea__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .textarea__control:focus {
    outline: none;
  }

  /*
   * Size modifiers
   */

  .textarea--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
  }

  .textarea--small .textarea__control {
    padding: 0.5em var(--sl-input-spacing-small);
  }

  .textarea--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .textarea--medium .textarea__control {
    padding: 0.5em var(--sl-input-spacing-medium);
  }

  .textarea--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
  }

  .textarea--large .textarea__control {
    padding: 0.5em var(--sl-input-spacing-large);
  }

  /*
   * Resize types
   */

  .textarea--resize-none .textarea__control {
    resize: none;
  }

  .textarea--resize-vertical .textarea__control {
    resize: vertical;
  }

  .textarea--resize-auto .textarea__control {
    height: auto;
    resize: none;
    overflow-y: hidden;
  }
`,R=class extends P{constructor(){super(...arguments),this.formControlController=new Jt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new We(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,s="preserve"){const o=t??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(e,o,r,s),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t;return h`
      <div
        part="form-control"
        class=${B({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${i?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${B({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${fi(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${x(this.placeholder)}
              rows=${x(this.rows)}
              minlength=${x(this.minlength)}
              maxlength=${x(this.maxlength)}
              autocapitalize=${x(this.autocapitalize)}
              autocorrect=${x(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${x(this.spellcheck)}
              enterkeyhint=${x(this.enterkeyhint)}
              inputmode=${x(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            ></textarea>
            <!-- This "adjuster" exists to prevent layout shifting. https://github.com/shoelace-style/shoelace/issues/2180 -->
            <div part="textarea-adjuster" class="textarea__size-adjuster" ?hidden=${this.resize!=="auto"}></div>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};R.styles=[j,Ei,jn];l([$(".textarea__control")],R.prototype,"input",2);l([$(".textarea__size-adjuster")],R.prototype,"sizeAdjuster",2);l([v()],R.prototype,"hasFocus",2);l([d()],R.prototype,"title",2);l([d()],R.prototype,"name",2);l([d()],R.prototype,"value",2);l([d({reflect:!0})],R.prototype,"size",2);l([d({type:Boolean,reflect:!0})],R.prototype,"filled",2);l([d()],R.prototype,"label",2);l([d({attribute:"help-text"})],R.prototype,"helpText",2);l([d()],R.prototype,"placeholder",2);l([d({type:Number})],R.prototype,"rows",2);l([d()],R.prototype,"resize",2);l([d({type:Boolean,reflect:!0})],R.prototype,"disabled",2);l([d({type:Boolean,reflect:!0})],R.prototype,"readonly",2);l([d({reflect:!0})],R.prototype,"form",2);l([d({type:Boolean,reflect:!0})],R.prototype,"required",2);l([d({type:Number})],R.prototype,"minlength",2);l([d({type:Number})],R.prototype,"maxlength",2);l([d()],R.prototype,"autocapitalize",2);l([d()],R.prototype,"autocorrect",2);l([d()],R.prototype,"autocomplete",2);l([d({type:Boolean})],R.prototype,"autofocus",2);l([d()],R.prototype,"enterkeyhint",2);l([d({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],R.prototype,"spellcheck",2);l([d()],R.prototype,"inputmode",2);l([xs()],R.prototype,"defaultValue",2);l([T("disabled",{waitUntilFirstUpdate:!0})],R.prototype,"handleDisabledChange",1);l([T("rows",{waitUntilFirstUpdate:!0})],R.prototype,"handleRowsChange",1);l([T("value",{waitUntilFirstUpdate:!0})],R.prototype,"handleValueChange",1);R.define("sl-textarea");var Un=C`
  :host {
    display: inline-block;
  }

  .dropdown::part(popup) {
    z-index: var(--sl-z-index-dropdown);
  }

  .dropdown[data-current-placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .dropdown[data-current-placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  .dropdown[data-current-placement^='left']::part(popup) {
    transform-origin: right;
  }

  .dropdown[data-current-placement^='right']::part(popup) {
    transform-origin: left;
  }

  .dropdown__trigger {
    display: block;
  }

  .dropdown__panel {
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    box-shadow: var(--sl-shadow-large);
    border-radius: var(--sl-border-radius-medium);
    pointer-events: none;
  }

  .dropdown--open .dropdown__panel {
    display: block;
    pointer-events: all;
  }

  /* When users slot a menu, make sure it conforms to the popup's auto-size */
  ::slotted(sl-menu) {
    max-width: var(--auto-size-available-width) !important;
    max-height: var(--auto-size-available-height) !important;
  }
`,oe=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(s,o)=>{if(!s)return null;const r=s.closest(o);if(r)return r;const a=s.getRootNode();return a instanceof ShadowRoot?i(a.host,o):null};setTimeout(()=>{var s;const o=((s=this.containingElement)==null?void 0:s.getRootNode())instanceof ShadowRoot?or():document.activeElement;(!this.containingElement||i(o,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const i=t.getAllItems(),s=i[0],o=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(s),s.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(o),o.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(s=>Dn(s).start);let i;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=t.button;break;default:i=t}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await Y(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=G(this,"dropdown.show",{dir:this.localize.dir()});await Z(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Y(this);const{keyframes:e,options:t}=G(this,"dropdown.hide",{dir:this.localize.dir()});await Z(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return h`
      <sl-popup
        part="base"
        exportparts="popup:base__popup"
        id="dropdown"
        placement=${this.placement}
        distance=${this.distance}
        skidding=${this.skidding}
        strategy=${this.hoist?"fixed":"absolute"}
        flip
        shift
        auto-size="vertical"
        auto-size-padding="10"
        sync=${x(this.sync?this.sync:void 0)}
        class=${B({dropdown:!0,"dropdown--open":this.open})}
      >
        <slot
          name="trigger"
          slot="anchor"
          part="trigger"
          class="dropdown__trigger"
          @click=${this.handleTriggerClick}
          @keydown=${this.handleTriggerKeyDown}
          @keyup=${this.handleTriggerKeyUp}
          @slotchange=${this.handleTriggerSlotChange}
        ></slot>

        <div aria-hidden=${this.open?"false":"true"} aria-labelledby="dropdown">
          <slot part="panel" class="dropdown__panel"></slot>
        </div>
      </sl-popup>
    `}};oe.styles=[j,Un];oe.dependencies={"sl-popup":D};l([$(".dropdown")],oe.prototype,"popup",2);l([$(".dropdown__trigger")],oe.prototype,"trigger",2);l([$(".dropdown__panel")],oe.prototype,"panel",2);l([d({type:Boolean,reflect:!0})],oe.prototype,"open",2);l([d({reflect:!0})],oe.prototype,"placement",2);l([d({type:Boolean,reflect:!0})],oe.prototype,"disabled",2);l([d({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],oe.prototype,"stayOpenOnSelect",2);l([d({attribute:!1})],oe.prototype,"containingElement",2);l([d({type:Number})],oe.prototype,"distance",2);l([d({type:Number})],oe.prototype,"skidding",2);l([d({type:Boolean})],oe.prototype,"hoist",2);l([d({reflect:!0})],oe.prototype,"sync",2);l([T("open",{waitUntilFirstUpdate:!0})],oe.prototype,"handleOpenChange",1);F("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});F("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});oe.define("sl-dropdown");var Vn=C`
  :host {
    display: block;
    position: relative;
    background: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-radius: var(--sl-border-radius-medium);
    padding: var(--sl-spacing-x-small) 0;
    overflow: auto;
    overscroll-behavior: none;
  }

  ::slotted(sl-divider) {
    --spacing: var(--sl-spacing-x-small);
  }
`,Rs=class extends P{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],i=e.composedPath(),s=i.find(n=>{var c;return t.includes(((c=n==null?void 0:n.getAttribute)==null?void 0:c.call(n,"role"))||"")});if(!s||i.find(n=>{var c;return((c=n==null?void 0:n.getAttribute)==null?void 0:c.call(n,"role"))==="menu"})!==this)return;const a=s;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),i=this.getCurrentItem();let s=i?t.indexOf(i):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?s++:e.key==="ArrowUp"?s--:e.key==="Home"?s=0:e.key==="End"&&(s=t.length-1),s<0&&(s=t.length-1),s>t.length-1&&(s=0),this.setCurrentItem(t[s]),t[s].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===e?"0":"-1")})}render(){return h`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Rs.styles=[j,Vn];l([$("slot")],Rs.prototype,"defaultSlot",2);Rs.define("sl-menu");var qn=C`
  :host {
    --submenu-offset: -2px;

    display: block;
  }

  :host([inert]) {
    display: none;
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: stretch;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-letter-spacing-normal);
    color: var(--sl-color-neutral-700);
    padding: var(--sl-spacing-2x-small) var(--sl-spacing-2x-small);
    transition: var(--sl-transition-fast) fill;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    cursor: pointer;
  }

  .menu-item.menu-item--disabled {
    outline: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item.menu-item--loading {
    outline: none;
    cursor: wait;
  }

  .menu-item.menu-item--loading *:not(sl-spinner) {
    opacity: 0.5;
  }

  .menu-item--loading sl-spinner {
    --indicator-color: currentColor;
    --track-width: 1px;
    position: absolute;
    font-size: 0.75em;
    top: calc(50% - 0.5em);
    left: 0.65rem;
    opacity: 1;
  }

  .menu-item .menu-item__label {
    flex: 1 1 auto;
    display: inline-block;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .menu-item .menu-item__prefix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .menu-item .menu-item__prefix::slotted(*) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .menu-item .menu-item__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .menu-item .menu-item__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  /* Safe triangle */
  .menu-item--submenu-expanded::after {
    content: '';
    position: fixed;
    z-index: calc(var(--sl-z-index-dropdown) - 1);
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    clip-path: polygon(
      var(--safe-triangle-cursor-x, 0) var(--safe-triangle-cursor-y, 0),
      var(--safe-triangle-submenu-start-x, 0) var(--safe-triangle-submenu-start-y, 0),
      var(--safe-triangle-submenu-end-x, 0) var(--safe-triangle-submenu-end-y, 0)
    );
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:hover:not([aria-disabled='true'], :focus-visible)) .menu-item,
  .menu-item--submenu-expanded {
    background-color: var(--sl-color-neutral-100);
    color: var(--sl-color-neutral-1000);
  }

  :host(:focus-visible) .menu-item {
    outline: none;
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
    opacity: 1;
  }

  .menu-item .menu-item__check,
  .menu-item .menu-item__chevron {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    visibility: hidden;
  }

  .menu-item--checked .menu-item__check,
  .menu-item--has-submenu .menu-item__chevron {
    visibility: visible;
  }

  /* Add elevation and z-index to submenus */
  sl-popup::part(popup) {
    box-shadow: var(--sl-shadow-large);
    z-index: var(--sl-z-index-dropdown);
    margin-left: var(--submenu-offset);
  }

  .menu-item--rtl sl-popup::part(popup) {
    margin-left: calc(-1 * var(--submenu-offset));
  }

  @media (forced-colors: active) {
    :host(:hover:not([aria-disabled='true'])) .menu-item,
    :host(:focus-visible) .menu-item {
      outline: dashed 1px SelectedItem;
      outline-offset: -1px;
    }
  }

  ::slotted(sl-menu) {
    max-width: var(--auto-size-available-width) !important;
    max-height: var(--auto-size-available-height) !important;
  }
`;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Wt=(e,t)=>{var s;const i=e._$AN;if(i===void 0)return!1;for(const o of i)(s=o._$AO)==null||s.call(o,t,!1),Wt(o,t);return!0},yi=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while((i==null?void 0:i.size)===0)},nr=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),Gn(t)}};function Wn(e){this._$AN!==void 0?(yi(this),this._$AM=e,nr(this)):this._$AM=e}function Kn(e,t=!1,i=0){const s=this._$AH,o=this._$AN;if(o!==void 0&&o.size!==0)if(t)if(Array.isArray(s))for(let r=i;r<s.length;r++)Wt(s[r],!1),yi(s[r]);else s!=null&&(Wt(s,!1),yi(s));else Wt(this,e)}const Gn=e=>{e.type==Ue.CHILD&&(e._$AP??(e._$AP=Kn),e._$AQ??(e._$AQ=Wn))};class Zn extends Ti{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,s){super._$AT(t,i,s),nr(this),this.isConnected=t._$AU}_$AO(t,i=!0){var s,o;t!==this.isConnected&&(this.isConnected=t,t?(s=this.reconnected)==null||s.call(this):(o=this.disconnected)==null||o.call(this)),i&&(Wt(this,t),yi(this))}setValue(t){if(qo(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Xn=()=>new Yn;class Yn{}const Xi=new WeakMap,Jn=Si(class extends Zn{render(e){return g}update(e,[t]){var s;const i=t!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=(s=e.options)==null?void 0:s.host,this.rt(this.ct=e.element)),g}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=Xi.get(t);i===void 0&&(i=new WeakMap,Xi.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=Xi.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var Qn=class{constructor(e,t){this.popupRef=Xn(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var s;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(s=i.target.role)!=null&&s.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),s=i==null?void 0:i.assignedElements({flatten:!0}).filter(u=>u.localName==="sl-menu")[0],o=getComputedStyle(this.host).direction==="rtl";if(!s)return;const{left:r,top:a,width:n,height:c}=s.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${o?r+n:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${o?r+n:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+c}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const s of t.assignedElements())if(i=s.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let s=1;s!==i.length;++s)i[s].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),s=["padding-top","border-top-width","margin-top"].reduce((o,r)=>{var a;const n=(a=t.get(r))!=null?a:new CSSUnitValue(0,"px"),u=(n instanceof CSSUnitValue?n:new CSSUnitValue(0,"px")).to("px");return o-u.value},0);this.skidding=s}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?h`
      <sl-popup
        ${Jn(this.popupRef)}
        placement=${e?"left-start":"right-start"}
        anchor="anchor"
        flip
        flip-fallback-strategy="best-fit"
        skidding="${this.skidding}"
        strategy="fixed"
        auto-size="vertical"
        auto-size-padding="10"
      >
        <slot name="submenu"></slot>
      </sl-popup>
    `:h` <slot name="submenu" hidden></slot> `}},be=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new We(this,"submenu"),this.submenuController=new Qn(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return na(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return h`
      <div
        id="anchor"
        part="base"
        class=${B({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
        ?aria-haspopup="${this.isSubmenu()}"
        ?aria-expanded="${!!t}"
      >
        <span part="checked-icon" class="menu-item__check">
          <sl-icon name="check" library="system" aria-hidden="true"></sl-icon>
        </span>

        <slot name="prefix" part="prefix" class="menu-item__prefix"></slot>

        <slot part="label" class="menu-item__label" @slotchange=${this.handleDefaultSlotChange}></slot>

        <slot name="suffix" part="suffix" class="menu-item__suffix"></slot>

        <span part="submenu-icon" class="menu-item__chevron">
          <sl-icon name=${e?"chevron-left":"chevron-right"} library="system" aria-hidden="true"></sl-icon>
        </span>

        ${this.submenuController.renderSubmenu()}
        ${this.loading?h` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};be.styles=[j,qn];be.dependencies={"sl-icon":ee,"sl-popup":D,"sl-spinner":Ci};l([$("slot:not([name])")],be.prototype,"defaultSlot",2);l([$(".menu-item")],be.prototype,"menuItem",2);l([d()],be.prototype,"type",2);l([d({type:Boolean,reflect:!0})],be.prototype,"checked",2);l([d()],be.prototype,"value",2);l([d({type:Boolean,reflect:!0})],be.prototype,"loading",2);l([d({type:Boolean,reflect:!0})],be.prototype,"disabled",2);l([T("checked")],be.prototype,"handleCheckedChange",1);l([T("disabled")],be.prototype,"handleDisabledChange",1);l([T("type")],be.prototype,"handleTypeChange",1);be.define("sl-menu-item");ee.define("sl-icon");var el=C`
  :host {
    --color: var(--sl-panel-border-color);
    --width: var(--sl-panel-border-width);
    --spacing: var(--sl-spacing-medium);
  }

  :host(:not([vertical])) {
    display: block;
    border-top: solid var(--width) var(--color);
    margin: var(--spacing) 0;
  }

  :host([vertical]) {
    display: inline-block;
    height: 100%;
    border-left: solid var(--width) var(--color);
    margin: 0 var(--spacing);
  }
`,Pi=class extends P{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Pi.styles=[j,el];l([d({type:Boolean,reflect:!0})],Pi.prototype,"vertical",2);l([T("vertical")],Pi.prototype,"handleVerticalChange",1);Pi.define("sl-divider");var tl=C`
  :host {
    --max-width: 20rem;
    --hide-delay: 0ms;
    --show-delay: 150ms;

    display: contents;
  }

  .tooltip {
    --arrow-size: var(--sl-tooltip-arrow-size);
    --arrow-color: var(--sl-tooltip-background-color);
  }

  .tooltip::part(popup) {
    z-index: var(--sl-z-index-tooltip);
  }

  .tooltip[placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .tooltip[placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  .tooltip[placement^='left']::part(popup) {
    transform-origin: right;
  }

  .tooltip[placement^='right']::part(popup) {
    transform-origin: left;
  }

  .tooltip__body {
    display: block;
    width: max-content;
    max-width: var(--max-width);
    border-radius: var(--sl-tooltip-border-radius);
    background-color: var(--sl-tooltip-background-color);
    font-family: var(--sl-tooltip-font-family);
    font-size: var(--sl-tooltip-font-size);
    font-weight: var(--sl-tooltip-font-weight);
    line-height: var(--sl-tooltip-line-height);
    text-align: start;
    white-space: normal;
    color: var(--sl-tooltip-color);
    padding: var(--sl-tooltip-padding);
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  }
`,te=class extends P{constructor(){super(),this.localize=new se(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=po(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=po(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await Y(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:s}=G(this,"tooltip.show",{dir:this.localize.dir()});await Z(this.popup.popup,i,s),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await Y(this.body);const{keyframes:i,options:s}=G(this,"tooltip.hide",{dir:this.localize.dir()});await Z(this.popup.popup,i,s),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${B({tooltip:!0,"tooltip--open":this.open})}
        placement=${this.placement}
        distance=${this.distance}
        skidding=${this.skidding}
        strategy=${this.hoist?"fixed":"absolute"}
        flip
        shift
        arrow
        hover-bridge
      >
        ${""}
        <slot slot="anchor" aria-describedby="tooltip"></slot>

        ${""}
        <div part="body" id="tooltip" class="tooltip__body" role="tooltip" aria-live=${this.open?"polite":"off"}>
          <slot name="content">${this.content}</slot>
        </div>
      </sl-popup>
    `}};te.styles=[j,tl];te.dependencies={"sl-popup":D};l([$("slot:not([name])")],te.prototype,"defaultSlot",2);l([$(".tooltip__body")],te.prototype,"body",2);l([$("sl-popup")],te.prototype,"popup",2);l([d()],te.prototype,"content",2);l([d()],te.prototype,"placement",2);l([d({type:Boolean,reflect:!0})],te.prototype,"disabled",2);l([d({type:Number})],te.prototype,"distance",2);l([d({type:Boolean,reflect:!0})],te.prototype,"open",2);l([d({type:Number})],te.prototype,"skidding",2);l([d()],te.prototype,"trigger",2);l([d({type:Boolean})],te.prototype,"hoist",2);l([T("open",{waitUntilFirstUpdate:!0})],te.prototype,"handleOpenChange",1);l([T(["content","distance","hoist","placement","skidding"])],te.prototype,"handleOptionsChange",1);l([T("disabled")],te.prototype,"handleDisabledChange",1);F("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});F("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});te.define("sl-tooltip");var il=C`
  :host {
    display: inline-block;
  }

  .checkbox {
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    color: var(--sl-input-label-color);
    vertical-align: middle;
    cursor: pointer;
  }

  .checkbox--small {
    --toggle-size: var(--sl-toggle-size-small);
    font-size: var(--sl-input-font-size-small);
  }

  .checkbox--medium {
    --toggle-size: var(--sl-toggle-size-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .checkbox--large {
    --toggle-size: var(--sl-toggle-size-large);
    font-size: var(--sl-input-font-size-large);
  }

  .checkbox__control {
    flex: 0 0 auto;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--toggle-size);
    height: var(--toggle-size);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
    border-radius: 2px;
    background-color: var(--sl-input-background-color);
    color: var(--sl-color-neutral-0);
    transition:
      var(--sl-transition-fast) border-color,
      var(--sl-transition-fast) background-color,
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) box-shadow;
  }

  .checkbox__input {
    position: absolute;
    opacity: 0;
    padding: 0;
    margin: 0;
    pointer-events: none;
  }

  .checkbox__checked-icon,
  .checkbox__indeterminate-icon {
    display: inline-flex;
    width: var(--toggle-size);
    height: var(--toggle-size);
  }

  /* Hover */
  .checkbox:not(.checkbox--checked):not(.checkbox--disabled) .checkbox__control:hover {
    border-color: var(--sl-input-border-color-hover);
    background-color: var(--sl-input-background-color-hover);
  }

  /* Focus */
  .checkbox:not(.checkbox--checked):not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Checked/indeterminate */
  .checkbox--checked .checkbox__control,
  .checkbox--indeterminate .checkbox__control {
    border-color: var(--sl-color-primary-600);
    background-color: var(--sl-color-primary-600);
  }

  /* Checked/indeterminate + hover */
  .checkbox.checkbox--checked:not(.checkbox--disabled) .checkbox__control:hover,
  .checkbox.checkbox--indeterminate:not(.checkbox--disabled) .checkbox__control:hover {
    border-color: var(--sl-color-primary-500);
    background-color: var(--sl-color-primary-500);
  }

  /* Checked/indeterminate + focus */
  .checkbox.checkbox--checked:not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control,
  .checkbox.checkbox--indeterminate:not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Disabled */
  .checkbox--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    line-height: var(--toggle-size);
    margin-inline-start: 0.5em;
    user-select: none;
    -webkit-user-select: none;
  }

  :host([required]) .checkbox__label::after {
    content: var(--sl-input-required-content);
    color: var(--sl-input-required-content-color);
    margin-inline-start: var(--sl-input-required-content-offset);
  }
`,Q=class extends P{constructor(){super(...arguments),this.formControlController=new Jt(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new We(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return h`
      <div
        class=${B({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${B({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${fi(this.indeterminate)}
            .checked=${fi(this.checked)}
            .disabled=${this.disabled}
            .required=${this.required}
            aria-checked=${this.checked?"true":"false"}
            aria-describedby="help-text"
            @click=${this.handleClick}
            @input=${this.handleInput}
            @invalid=${this.handleInvalid}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
          />

          <span
            part="control${this.checked?" control--checked":""}${this.indeterminate?" control--indeterminate":""}"
            class="checkbox__control"
          >
            ${this.checked?h`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?h`
                  <sl-icon
                    part="indeterminate-icon"
                    class="checkbox__indeterminate-icon"
                    library="system"
                    name="indeterminate"
                  ></sl-icon>
                `:""}
          </span>

          <div part="label" class="checkbox__label">
            <slot></slot>
          </div>
        </label>

        <div
          aria-hidden=${t?"false":"true"}
          class="form-control__help-text"
          id="help-text"
          part="form-control-help-text"
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};Q.styles=[j,Ei,il];Q.dependencies={"sl-icon":ee};l([$('input[type="checkbox"]')],Q.prototype,"input",2);l([v()],Q.prototype,"hasFocus",2);l([d()],Q.prototype,"title",2);l([d()],Q.prototype,"name",2);l([d()],Q.prototype,"value",2);l([d({reflect:!0})],Q.prototype,"size",2);l([d({type:Boolean,reflect:!0})],Q.prototype,"disabled",2);l([d({type:Boolean,reflect:!0})],Q.prototype,"checked",2);l([d({type:Boolean,reflect:!0})],Q.prototype,"indeterminate",2);l([xs("checked")],Q.prototype,"defaultChecked",2);l([d({reflect:!0})],Q.prototype,"form",2);l([d({type:Boolean,reflect:!0})],Q.prototype,"required",2);l([d({attribute:"help-text"})],Q.prototype,"helpText",2);l([T("disabled",{waitUntilFirstUpdate:!0})],Q.prototype,"handleDisabledChange",1);l([T(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],Q.prototype,"handleStateChange",1);Q.define("sl-checkbox");var sl=C`
  :host {
    --indicator-color: var(--sl-color-primary-600);
    --track-color: var(--sl-color-neutral-200);
    --track-width: 2px;

    display: block;
  }

  .tab-group {
    display: flex;
    border-radius: 0;
  }

  .tab-group__tabs {
    display: flex;
    position: relative;
  }

  .tab-group__indicator {
    position: absolute;
    transition:
      var(--sl-transition-fast) translate ease,
      var(--sl-transition-fast) width ease;
  }

  .tab-group--has-scroll-controls .tab-group__nav-container {
    position: relative;
    padding: 0 var(--sl-spacing-x-large);
  }

  .tab-group--has-scroll-controls .tab-group__scroll-button--start--hidden,
  .tab-group--has-scroll-controls .tab-group__scroll-button--end--hidden {
    visibility: hidden;
  }

  .tab-group__body {
    display: block;
    overflow: auto;
  }

  .tab-group__scroll-button {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--sl-spacing-x-large);
  }

  .tab-group__scroll-button--start {
    left: 0;
  }

  .tab-group__scroll-button--end {
    right: 0;
  }

  .tab-group--rtl .tab-group__scroll-button--start {
    left: auto;
    right: 0;
  }

  .tab-group--rtl .tab-group__scroll-button--end {
    left: 0;
    right: auto;
  }

  /*
   * Top
   */

  .tab-group--top {
    flex-direction: column;
  }

  .tab-group--top .tab-group__nav-container {
    order: 1;
  }

  .tab-group--top .tab-group__nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group--top .tab-group__nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group--top .tab-group__tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-bottom: solid var(--track-width) var(--track-color);
  }

  .tab-group--top .tab-group__indicator {
    bottom: calc(-1 * var(--track-width));
    border-bottom: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--top .tab-group__body {
    order: 2;
  }

  .tab-group--top ::slotted(sl-tab-panel) {
    --padding: var(--sl-spacing-medium) 0;
  }

  /*
   * Bottom
   */

  .tab-group--bottom {
    flex-direction: column;
  }

  .tab-group--bottom .tab-group__nav-container {
    order: 2;
  }

  .tab-group--bottom .tab-group__nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group--bottom .tab-group__nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group--bottom .tab-group__tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-top: solid var(--track-width) var(--track-color);
  }

  .tab-group--bottom .tab-group__indicator {
    top: calc(-1 * var(--track-width));
    border-top: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--bottom .tab-group__body {
    order: 1;
  }

  .tab-group--bottom ::slotted(sl-tab-panel) {
    --padding: var(--sl-spacing-medium) 0;
  }

  /*
   * Start
   */

  .tab-group--start {
    flex-direction: row;
  }

  .tab-group--start .tab-group__nav-container {
    order: 1;
  }

  .tab-group--start .tab-group__tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-inline-end: solid var(--track-width) var(--track-color);
  }

  .tab-group--start .tab-group__indicator {
    right: calc(-1 * var(--track-width));
    border-right: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--start.tab-group--rtl .tab-group__indicator {
    right: auto;
    left: calc(-1 * var(--track-width));
  }

  .tab-group--start .tab-group__body {
    flex: 1 1 auto;
    order: 2;
  }

  .tab-group--start ::slotted(sl-tab-panel) {
    --padding: 0 var(--sl-spacing-medium);
  }

  /*
   * End
   */

  .tab-group--end {
    flex-direction: row;
  }

  .tab-group--end .tab-group__nav-container {
    order: 2;
  }

  .tab-group--end .tab-group__tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-left: solid var(--track-width) var(--track-color);
  }

  .tab-group--end .tab-group__indicator {
    left: calc(-1 * var(--track-width));
    border-inline-start: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--end.tab-group--rtl .tab-group__indicator {
    right: calc(-1 * var(--track-width));
    left: auto;
  }

  .tab-group--end .tab-group__body {
    flex: 1 1 auto;
    order: 1;
  }

  .tab-group--end ::slotted(sl-tab-panel) {
    --padding: 0 var(--sl-spacing-medium);
  }
`,ol=C`
  :host {
    display: contents;
  }
`,Li=class extends P{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],t.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return h` <slot @slotchange=${this.handleSlotChange}></slot> `}};Li.styles=[j,ol];l([d({type:Boolean,reflect:!0})],Li.prototype,"disabled",2);l([T("disabled",{waitUntilFirstUpdate:!0})],Li.prototype,"handleDisabledChange",1);var ie=class extends P{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new se(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const i=t.filter(({target:s})=>{if(s===this)return!0;if(s.closest("sl-tab-group")!==this)return!1;const o=s.tagName.toLowerCase();return o==="sl-tab"||o==="sl-tab-panel"});if(i.length!==0){if(i.some(s=>!["aria-labelledby","aria-controls"].includes(s.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(s=>s.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(s=>s.attributeName==="active")){const o=i.filter(r=>r.attributeName==="active"&&r.target.tagName.toLowerCase()==="sl-tab").map(r=>r.target).find(r=>r.active);o&&this.setActiveTab(o)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((i,s)=>{var o;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((o=this.getActiveTab())!=null?o:this.tabs[0],{emitEvents:!1}),s.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const i=e.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(e){const i=e.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const o=this.tabs.find(n=>n.matches(":focus")),r=this.localize.dir()==="rtl";let a=null;if((o==null?void 0:o.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")a=this.focusableTabs[0];else if(e.key==="End")a=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const n=this.tabs.findIndex(c=>c===o);a=this.findNextFocusableTab(n,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const n=this.tabs.findIndex(c=>c===o);a=this.findNextFocusableTab(n,"forward")}if(!a)return;a.tabIndex=0,a.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(a,{scrollBehavior:"smooth"}):this.tabs.forEach(n=>{n.tabIndex=n===a?0:-1}),["top","bottom"].includes(this.placement)&&os(a,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=qe({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const i=this.activeTab;this.activeTab=e,this.tabs.forEach(s=>{s.active=s===this.activeTab,s.tabIndex=s===this.activeTab?0:-1}),this.panels.forEach(s=>{var o;return s.active=s.name===((o=this.activeTab)==null?void 0:o.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&os(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(i=>i.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,i=e.clientHeight,s=this.localize.dir()==="rtl",o=this.getAllTabs(),a=o.slice(0,o.indexOf(e)).reduce((n,c)=>({left:n.left+c.clientWidth,top:n.top+c.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=s?`${-1*a.left}px`:`${a.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${a.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let i=null;const s=t==="forward"?1:-1;let o=e+s;for(;e<this.tabs.length;){if(i=this.tabs[o]||null,i===null){t==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;o+=s}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(i=>i.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return h`
      <div
        part="base"
        class=${B({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${B({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
                  name=${e?"chevron-right":"chevron-left"}
                  library="system"
                  tabindex="-1"
                  aria-hidden="true"
                  label=${this.localize.term("scrollToStart")}
                  @click=${this.handleScrollToStart}
                ></sl-icon-button>
              `:""}

          <div class="tab-group__nav" @scrollend=${this.updateScrollButtons}>
            <div part="tabs" class="tab-group__tabs" role="tablist">
              <div part="active-tab-indicator" class="tab-group__indicator"></div>
              <sl-resize-observer @sl-resize=${this.syncIndicator}>
                <slot name="nav" @slotchange=${this.syncTabsAndPanels}></slot>
              </sl-resize-observer>
            </div>
          </div>

          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--end"
                  exportparts="base:scroll-button__base"
                  class=${B({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
                  name=${e?"chevron-left":"chevron-right"}
                  library="system"
                  tabindex="-1"
                  aria-hidden="true"
                  label=${this.localize.term("scrollToEnd")}
                  @click=${this.handleScrollToEnd}
                ></sl-icon-button>
              `:""}
        </div>

        <slot part="body" class="tab-group__body" @slotchange=${this.syncTabsAndPanels}></slot>
      </div>
    `}};ie.styles=[j,sl];ie.dependencies={"sl-icon-button":X,"sl-resize-observer":Li};l([$(".tab-group")],ie.prototype,"tabGroup",2);l([$(".tab-group__body")],ie.prototype,"body",2);l([$(".tab-group__nav")],ie.prototype,"nav",2);l([$(".tab-group__indicator")],ie.prototype,"indicator",2);l([v()],ie.prototype,"hasScrollControls",2);l([v()],ie.prototype,"shouldHideScrollStartButton",2);l([v()],ie.prototype,"shouldHideScrollEndButton",2);l([d()],ie.prototype,"placement",2);l([d()],ie.prototype,"activation",2);l([d({attribute:"no-scroll-controls",type:Boolean})],ie.prototype,"noScrollControls",2);l([d({attribute:"fixed-scroll-controls",type:Boolean})],ie.prototype,"fixedScrollControls",2);l([oa({passive:!0})],ie.prototype,"updateScrollButtons",1);l([T("noScrollControls",{waitUntilFirstUpdate:!0})],ie.prototype,"updateScrollControls",1);l([T("placement",{waitUntilFirstUpdate:!0})],ie.prototype,"syncIndicator",1);ie.define("sl-tab-group");var rl=(e,t)=>{let i=0;return function(...s){window.clearTimeout(i),i=window.setTimeout(()=>{e.call(this,...s)},t)}},go=(e,t,i)=>{const s=e[t];e[t]=function(...o){s.call(this,...o),i.call(this,s,...o)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,i=new WeakMap,s=r=>{for(const a of r.changedTouches)t.add(a.identifier)},o=r=>{for(const a of r.changedTouches)t.delete(a.identifier)};document.addEventListener("touchstart",s,!0),document.addEventListener("touchend",o,!0),document.addEventListener("touchcancel",o,!0),go(EventTarget.prototype,"addEventListener",function(r,a){if(a!=="scrollend")return;const n=rl(()=>{t.size?n():this.dispatchEvent(new Event("scrollend"))},100);r.call(this,"scroll",n,{passive:!0}),i.set(this,n)}),go(EventTarget.prototype,"removeEventListener",function(r,a){if(a!=="scrollend")return;const n=i.get(this);n&&r.call(this,"scroll",n,{passive:!0})})}})();var al=C`
  :host {
    display: inline-block;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-semibold);
    border-radius: var(--sl-border-radius-medium);
    color: var(--sl-color-neutral-600);
    padding: var(--sl-spacing-medium) var(--sl-spacing-large);
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    transition:
      var(--transition-speed) box-shadow,
      var(--transition-speed) color;
  }

  .tab:hover:not(.tab--disabled) {
    color: var(--sl-color-primary-600);
  }

  :host(:focus) {
    outline: transparent;
  }

  :host(:focus-visible) {
    color: var(--sl-color-primary-600);
    outline: var(--sl-focus-ring);
    outline-offset: calc(-1 * var(--sl-focus-ring-width) - var(--sl-focus-ring-offset));
  }

  .tab.tab--active:not(.tab--disabled) {
    color: var(--sl-color-primary-600);
  }

  .tab.tab--closable {
    padding-inline-end: var(--sl-spacing-small);
  }

  .tab.tab--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tab__close-button {
    font-size: var(--sl-font-size-small);
    margin-inline-start: var(--sl-spacing-small);
  }

  .tab__close-button::part(base) {
    padding: var(--sl-spacing-3x-small);
  }

  @media (forced-colors: active) {
    .tab.tab--active:not(.tab--disabled) {
      outline: solid 1px transparent;
      outline-offset: -3px;
    }
  }
`,nl=0,Ae=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.attrId=++nl,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,h`
      <div
        part="base"
        class=${B({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
      >
        <slot></slot>
        ${this.closable?h`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                name="x-lg"
                library="system"
                label=${this.localize.term("close")}
                class="tab__close-button"
                @click=${this.handleCloseClick}
                tabindex="-1"
              ></sl-icon-button>
            `:""}
      </div>
    `}};Ae.styles=[j,al];Ae.dependencies={"sl-icon-button":X};l([$(".tab")],Ae.prototype,"tab",2);l([d({reflect:!0})],Ae.prototype,"panel",2);l([d({type:Boolean,reflect:!0})],Ae.prototype,"active",2);l([d({type:Boolean,reflect:!0})],Ae.prototype,"closable",2);l([d({type:Boolean,reflect:!0})],Ae.prototype,"disabled",2);l([d({type:Number,reflect:!0})],Ae.prototype,"tabIndex",2);l([T("active")],Ae.prototype,"handleActiveChange",1);l([T("disabled")],Ae.prototype,"handleDisabledChange",1);Ae.define("sl-tab");var ll=C`
  :host {
    --padding: 0;

    display: none;
  }

  :host([active]) {
    display: block;
  }

  .tab-panel {
    display: block;
    padding: var(--padding);
  }
`,cl=0,ti=class extends P{constructor(){super(...arguments),this.attrId=++cl,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return h`
      <slot
        part="base"
        class=${B({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};ti.styles=[j,ll];l([d({reflect:!0})],ti.prototype,"name",2);l([d({type:Boolean,reflect:!0})],ti.prototype,"active",2);l([T("active")],ti.prototype,"handleActiveChange",1);ti.define("sl-tab-panel");Ci.define("sl-spinner");X.define("sl-icon-button");var dl=C`
  :host {
    display: block;
  }

  .details {
    border: solid 1px var(--sl-color-neutral-200);
    border-radius: var(--sl-border-radius-medium);
    background-color: var(--sl-color-neutral-0);
    overflow-anchor: none;
  }

  .details--disabled {
    opacity: 0.5;
  }

  .details__header {
    display: flex;
    align-items: center;
    border-radius: inherit;
    padding: var(--sl-spacing-medium);
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
  }

  .details__header::-webkit-details-marker {
    display: none;
  }

  .details__header:focus {
    outline: none;
  }

  .details__header:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: calc(1px + var(--sl-focus-ring-offset));
  }

  .details--disabled .details__header {
    cursor: not-allowed;
  }

  .details--disabled .details__header:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .details__summary {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }

  .details__summary-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
  }

  .details--open .details__summary-icon {
    rotate: 90deg;
  }

  .details--open.details--rtl .details__summary-icon {
    rotate: -90deg;
  }

  .details--open slot[name='expand-icon'],
  .details:not(.details--open) slot[name='collapse-icon'] {
    display: none;
  }

  .details__body {
    overflow: hidden;
  }

  .details__content {
    display: block;
    padding: var(--sl-spacing-medium);
  }
`,ze=class extends P{constructor(){super(...arguments),this.localize=new se(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await Y(this.body);const{keyframes:t,options:i}=G(this,"details.show",{dir:this.localize.dir()});await Z(this.body,mo(t,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await Y(this.body);const{keyframes:t,options:i}=G(this,"details.hide",{dir:this.localize.dir()});await Z(this.body,mo(t,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,ce(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,ce(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return h`
      <details
        part="base"
        class=${B({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
      >
        <summary
          part="header"
          id="header"
          class="details__header"
          role="button"
          aria-expanded=${this.open?"true":"false"}
          aria-controls="content"
          aria-disabled=${this.disabled?"true":"false"}
          tabindex=${this.disabled?"-1":"0"}
          @click=${this.handleSummaryClick}
          @keydown=${this.handleSummaryKeyDown}
        >
          <slot name="summary" part="summary" class="details__summary">${this.summary}</slot>

          <span part="summary-icon" class="details__summary-icon">
            <slot name="expand-icon">
              <sl-icon library="system" name=${e?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
            <slot name="collapse-icon">
              <sl-icon library="system" name=${e?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
          </span>
        </summary>

        <div class="details__body" role="region" aria-labelledby="header">
          <slot part="content" id="content" class="details__content"></slot>
        </div>
      </details>
    `}};ze.styles=[j,dl];ze.dependencies={"sl-icon":ee};l([$(".details")],ze.prototype,"details",2);l([$(".details__header")],ze.prototype,"header",2);l([$(".details__body")],ze.prototype,"body",2);l([$(".details__expand-icon-slot")],ze.prototype,"expandIconSlot",2);l([d({type:Boolean,reflect:!0})],ze.prototype,"open",2);l([d()],ze.prototype,"summary",2);l([d({type:Boolean,reflect:!0})],ze.prototype,"disabled",2);l([T("open",{waitUntilFirstUpdate:!0})],ze.prototype,"handleOpenChange",1);F("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});F("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});ze.define("sl-details");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ul=class extends Event{constructor(t,i,s,o){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i,this.callback=s,this.subscribe=o??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class hl{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,i=!1){const s=i||!Object.is(t,this.o);this.o=t,s&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:s}]of this.subscriptions)i(this.o,s)},t!==void 0&&(this.value=t)}addCallback(t,i,s){if(!s)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:i});const{disposer:o}=this.subscriptions.get(t);t(this.value,o)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let pl=class extends Event{constructor(t,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i}};class vo extends hl{constructor(t,i,s){var o,r;super(i.context!==void 0?i.initialValue:s),this.onContextRequest=a=>{if(a.context!==this.context)return;const n=a.contextTarget??a.composedPath()[0];n!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,n,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const n=new Set;for(const[c,{consumerHost:u}]of this.subscriptions)n.has(c)||(n.add(c),u.dispatchEvent(new ul(this.context,u,c,!0)));a.stopPropagation()},this.host=t,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(r=(o=this.host).addController)==null||r.call(o,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new pl(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ml({context:e}){return(t,i)=>{const s=new WeakMap;if(typeof i=="object")return{get(){return t.get.call(this)},set(o){return s.get(this).setValue(o),t.set.call(this,o)},init(o){return s.set(this,new vo(this,{context:e,initialValue:o})),o}};{t.constructor.addInitializer(a=>{s.set(a,new vo(a,{context:e}))});const o=Object.getOwnPropertyDescriptor(t,i);let r;if(o===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(n){s.get(this).setValue(n),a.set(this,n)},configurable:!0,enumerable:!0}}else{const a=o.set;r={...o,set(n){s.get(this).setValue(n),a==null||a.call(this,n)}}}return void Object.defineProperty(t,i,r)}}}const fl=Symbol("board"),bl={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};class $e extends Error{constructor(t,i,s){super(t),this.status=i,this.body=s,this.name="ApiError"}}async function ke(e,t){const i=e.startsWith("/")?"./"+e.slice(1):e,s=await fetch(i,t);if(!s.ok){const o=await s.text();throw new $e(`API request failed: ${s.status} ${s.statusText}`,s.status,o)}return s.json()}function lr(e,t){if(!t)return e;const i=new URLSearchParams;for(const[o,r]of Object.entries(t))r!==void 0&&i.set(o,r);const s=i.toString();return s?`${e}?${s}`:e}async function gl(e){const t=lr("/api/ticks",e);return(await ke(t)).ticks.map(s=>({...s,is_blocked:s.isBlocked,verification_status:s.verificationStatus}))}async function yo(e){return ke(`/api/ticks/${encodeURIComponent(e)}`)}async function vl(e){return ke("/api/ticks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})}async function yl(e,t){return ke(`/api/ticks/${encodeURIComponent(e)}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:t})})}async function wl(e,t){return ke(`/api/ticks/${encodeURIComponent(e)}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})})}async function kl(e){return ke(`/api/ticks/${encodeURIComponent(e)}/approve`,{method:"POST"})}async function xl(e,t){return ke(`/api/ticks/${encodeURIComponent(e)}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({feedback:t})})}async function _l(e){return ke(`/api/ticks/${encodeURIComponent(e)}/reopen`,{method:"POST"})}async function $l(){return ke("/api/info")}async function Cl(e=20){const t=lr("/api/activity",{limit:String(e)});return(await ke(t)).activities}async function Sl(e){try{return await ke(`/api/records/${encodeURIComponent(e)}`)}catch(t){if(t instanceof $e&&t.status===404)return null;throw t}}async function Tl(e){return ke(`/api/run-status/${encodeURIComponent(e)}`)}async function El(e){try{const t=`./api/context/${encodeURIComponent(e)}`,i=await fetch(t);if(!i.ok){if(i.status===404)return null;throw new $e(`API request failed: ${i.status} ${i.statusText}`,i.status,await i.text())}return i.text()}catch(t){if(t instanceof $e&&t.status===404)return null;throw t}}class Al{constructor(t,i){this.ws=null,this.reconnectAttempts=0,this.maxReconnectAttempts=10,this.reconnectTimer=null,this.connected=!1,this.projectId=t,this.callbacks=i}connect(){var r;if(((r=this.ws)==null?void 0:r.readyState)===WebSocket.OPEN)return;const t=window.location.protocol==="https:"?"wss:":"ws:",i=window.location.host,s=localStorage.getItem("ticks_token")||"",o=`${t}//${i}/api/projects/${encodeURIComponent(this.projectId)}/sync?token=${encodeURIComponent(s)}&type=cloud`;console.log("[SyncClient] Connecting to",o.replace(/token=[^&]+/,"token=***")),this.ws=new WebSocket(o),this.ws.onopen=()=>{var a,n;console.log("[SyncClient] Connected"),this.connected=!0,this.reconnectAttempts=0,(n=(a=this.callbacks).onConnected)==null||n.call(a)},this.ws.onmessage=a=>{try{const n=JSON.parse(a.data);this.handleMessage(n)}catch(n){console.error("[SyncClient] Failed to parse message:",n)}},this.ws.onclose=a=>{var n,c;console.log("[SyncClient] Disconnected:",a.code,a.reason),this.connected=!1,this.ws=null,(c=(n=this.callbacks).onDisconnected)==null||c.call(n),this.scheduleReconnect()},this.ws.onerror=a=>{var n,c;console.error("[SyncClient] WebSocket error:",a),(c=(n=this.callbacks).onError)==null||c.call(n,"WebSocket connection error")}}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.ws&&(this.ws.close(),this.ws=null),this.connected=!1}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}updateTick(t){this.send({type:"tick_update",tick:t})}deleteTick(t){this.send({type:"tick_delete",id:t})}handleMessage(t){var i,s;switch(t.type){case"state_full":console.log("[SyncClient] Received full state:",Object.keys(t.ticks).length,"ticks"),this.callbacks.onStateUpdate(new Map(Object.entries(t.ticks)));break;case"tick_updated":case"tick_created":console.log("[SyncClient] Tick updated:",t.tick.id),this.callbacks.onTickUpdate(t.tick);break;case"tick_deleted":console.log("[SyncClient] Tick deleted:",t.id),this.callbacks.onTickDelete(t.id);break;case"connected":console.log("[SyncClient] Connection confirmed:",t.connectionId);break;case"error":console.error("[SyncClient] Server error:",t.message),(s=(i=this.callbacks).onError)==null||s.call(i,t.message);break;default:console.warn("[SyncClient] Unknown message type:",t.type)}}send(t){var i;if(((i=this.ws)==null?void 0:i.readyState)!==WebSocket.OPEN){console.warn("[SyncClient] Cannot send - not connected");return}this.ws.send(JSON.stringify(t))}scheduleReconnect(){var i,s;if(this.reconnectAttempts>=this.maxReconnectAttempts){console.error("[SyncClient] Max reconnect attempts reached"),(s=(i=this.callbacks).onError)==null||s.call(i,"Connection lost - max reconnect attempts reached");return}const t=Math.min(1e3*Math.pow(2,this.reconnectAttempts),3e4);this.reconnectAttempts++,console.log(`[SyncClient] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=window.setTimeout(()=>{this.reconnectTimer=null,this.connect()},t)}}var zl=Object.defineProperty,Rl=Object.getOwnPropertyDescriptor,H=(e,t,i,s)=>{for(var o=s>1?void 0:s?Rl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&zl(t,i,o),o};const Yi=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Pe=["blocked","ready","agent","human","done"];let N=class extends J{constructor(){super(...arguments),this.boardState={...bl},this.ticks=[],this.epics=[],this.repoName="",this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.selectedTick=null,this.selectedTickNotes=[],this.selectedTickBlockers=[],this.selectedTickParentTitle="",this.loading=!0,this.error=null,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showRunPanel=!1,this.runStatus=null,this.runPanelEpicId=null,this.runStreamConnected=!1,this.activeToolInfo=null,this.runMetrics=null,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.eventSource=null,this.reconnectDelay=1e3,this.maxReconnectDelay=3e4,this.reconnectTimeout=null,this.runEventSource=null,this.runReconnectTimeout=null,this.runPollInterval=null,this.isCloudMode=!1,this.syncClient=null,this.projectId=null,this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused()))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"r":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRunPanel());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.loadData(),this.isCloudMode&&this.projectId?this.connectSyncClient():this.connectSSE(),this.startRunStatusPolling()}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/([^/]+\/[^/]+)/);if(e){this.isCloudMode=!0,this.projectId=e[1],console.log("[TickBoard] Cloud mode detected, project:",this.projectId);return}const t=localStorage.getItem("ticks_project");if(t){this.isCloudMode=!0,this.projectId=t,console.log("[TickBoard] Cloud mode from localStorage, project:",this.projectId);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const i=new URLSearchParams(window.location.search).get("project");if(i){this.isCloudMode=!0,this.projectId=i,console.log("[TickBoard] Cloud mode from query param, project:",this.projectId);return}}console.log("[TickBoard] Local mode")}connectSyncClient(){this.projectId&&(this.syncClient=new Al(this.projectId,{onStateUpdate:e=>{this.ticks=Array.from(e.values()).map(t=>this.tickToBoardTick(t)),this.updateBoardState(),console.log("[SyncClient] State updated:",this.ticks.length,"ticks")},onTickUpdate:e=>{var s;const t=this.tickToBoardTick(e),i=this.ticks.findIndex(o=>o.id===e.id);i>=0?this.ticks=[...this.ticks.slice(0,i),t,...this.ticks.slice(i+1)]:this.ticks=[...this.ticks,t],((s=this.selectedTick)==null?void 0:s.id)===e.id&&(this.selectedTick=t),this.updateBoardState()},onTickDelete:e=>{var i;const t=this.ticks.findIndex(s=>s.id===e);t>=0&&(this.ticks=[...this.ticks.slice(0,t),...this.ticks.slice(t+1)],this.updateBoardState()),((i=this.selectedTick)==null?void 0:i.id)===e&&(this.selectedTick=null)},onConnected:()=>{console.log("[TickBoard] Sync client connected")},onDisconnected:()=>{console.log("[TickBoard] Sync client disconnected")},onError:e=>{console.error("[TickBoard] Sync client error:",e)}}),this.syncClient.connect())}disconnectSyncClient(){this.syncClient&&(this.syncClient.disconnect(),this.syncClient=null)}tickToBoardTick(e){const t=e.blocked_by&&e.blocked_by.length>0||!1;let i;return e.status==="closed"?i="done":t?i="blocked":e.awaiting?i="human":e.status==="in_progress"?i="agent":i="ready",{...e,is_blocked:t,column:i}}async loadData(){this.loading=!0,this.error=null;try{const[e,t]=await Promise.all([gl(),$l()]);this.ticks=e,this.epics=t.epics,this.repoName=t.repoName,this.updateBoardState()}catch(e){this.error=e instanceof Error?e.message:"Failed to load data",console.error("Failed to load board data:",e)}finally{this.loading=!1}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown),this.disconnectSSE(),this.disconnectSyncClient(),this.disconnectRunStream(),this.stopRunStatusPolling()}connectSSE(){this.eventSource&&this.eventSource.close(),this.eventSource=new EventSource("/api/events"),this.eventSource.addEventListener("connected",()=>{this.reconnectDelay=1e3,console.log("[SSE] Connected to server")}),this.eventSource.addEventListener("update",e=>{try{const t=JSON.parse(e.data);this.handleRealtimeUpdate(t)}catch(t){console.error("[SSE] Failed to parse update:",t)}}),this.eventSource.onerror=()=>{var e;console.log("[SSE] Connection error, will reconnect..."),(e=this.eventSource)==null||e.close(),this.eventSource=null,this.scheduleReconnect()}}disconnectSSE(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[SSE] Reconnecting after ${this.reconnectDelay}ms...`),this.connectSSE()},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,this.maxReconnectDelay)}startRunStatusPolling(){this.runPollInterval=setInterval(()=>{this.checkForActiveRuns()},5e3),this.checkForActiveRuns()}stopRunStatusPolling(){this.runPollInterval&&(clearInterval(this.runPollInterval),this.runPollInterval=null)}async checkForActiveRuns(){var e,t,i;if(this.epics.length!==0){for(const s of this.epics)try{const o=await Tl(s.id);if(o.isRunning){this.runStatus=o,this.runPanelEpicId!==s.id&&(this.runPanelEpicId=s.id,this.connectRunStream(s.id)),(e=o.activeTask)!=null&&e.metrics&&(this.runMetrics=this.convertApiMetrics(o.activeTask.metrics)),(t=o.activeTask)!=null&&t.activeTool&&(this.activeToolInfo={name:o.activeTask.activeTool.name,input:o.activeTask.activeTool.input,output:o.activeTask.activeTool.output,durationMs:o.activeTask.activeTool.duration_ms,isError:o.activeTask.activeTool.is_error,isComplete:!1});return}}catch{}(i=this.runStatus)!=null&&i.isRunning&&(this.runStatus={...this.runStatus,isRunning:!1})}}convertApiMetrics(e){return{inputTokens:e.input_tokens,outputTokens:e.output_tokens,cacheReadTokens:e.cache_read_tokens,cacheCreationTokens:e.cache_creation_tokens,costUsd:e.cost_usd,durationMs:e.duration_ms}}connectRunStream(e){this.disconnectRunStream(),this.runEventSource=new EventSource(`./api/run-stream/${e}`),this.runEventSource.addEventListener("connected",()=>{this.runStreamConnected=!0,console.log("[RunStream] Connected to epic:",e)}),this.runEventSource.addEventListener("task-started",t=>{try{const i=JSON.parse(t.data);this.runStatus={epicId:e,isRunning:!0,activeTask:{tickId:i.taskId,title:i.title||"",status:"running",numTurns:i.numTurns||0,metrics:i.metrics||{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:new Date().toISOString()}},this.activeToolInfo=null}catch(i){console.error("[RunStream] Failed to parse task-started:",i)}}),this.runEventSource.addEventListener("task-update",t=>{var i;try{const s=JSON.parse(t.data);s.metrics&&(this.runMetrics=this.convertApiMetrics(s.metrics)),s.activeTool&&(this.activeToolInfo={name:s.activeTool.name,input:s.activeTool.input,output:s.activeTool.output,durationMs:s.activeTool.duration,isComplete:!1}),(i=this.runStatus)!=null&&i.activeTask&&(this.runStatus={...this.runStatus,activeTask:{...this.runStatus.activeTask,numTurns:s.numTurns??this.runStatus.activeTask.numTurns,lastUpdated:new Date().toISOString()}})}catch(s){console.error("[RunStream] Failed to parse task-update:",s)}}),this.runEventSource.addEventListener("tool-activity",t=>{try{const i=JSON.parse(t.data),s=i.tool||i.activeTool;s&&(this.activeToolInfo={name:s.name,input:s.input,output:s.output,durationMs:s.duration,isComplete:!1})}catch(i){console.error("[RunStream] Failed to parse tool-activity:",i)}}),this.runEventSource.addEventListener("task-completed",t=>{try{const i=JSON.parse(t.data);console.log("[RunStream] Task completed:",i.taskId),this.activeToolInfo=null,this.runStatus&&(this.runStatus={...this.runStatus,isRunning:!1,activeTask:void 0})}catch(i){console.error("[RunStream] Failed to parse task-completed:",i)}}),this.runEventSource.addEventListener("epic-completed",()=>{console.log("[RunStream] Epic completed:",e),this.runStatus={epicId:e,isRunning:!1},this.activeToolInfo=null}),this.runEventSource.onerror=()=>{var t;console.log("[RunStream] Connection error"),this.runStreamConnected=!1,(t=this.runEventSource)==null||t.close(),this.runEventSource=null}}disconnectRunStream(){this.runReconnectTimeout&&(clearTimeout(this.runReconnectTimeout),this.runReconnectTimeout=null),this.runEventSource&&(this.runEventSource.close(),this.runEventSource=null),this.runStreamConnected=!1}toggleRunPanel(){var e;this.showRunPanel=!this.showRunPanel,this.showRunPanel&&((e=this.runStatus)!=null&&e.isRunning)&&this.runStatus.epicId&&this.runPanelEpicId!==this.runStatus.epicId&&(this.runPanelEpicId=this.runStatus.epicId,this.connectRunStream(this.runStatus.epicId))}closeRunPanel(){this.showRunPanel=!1}async handleRealtimeUpdate(e){var s;const{type:t,tickId:i}=e;if(t==="activity"){window.dispatchEvent(new CustomEvent("activity-update"));return}if(!i){console.warn("[SSE] Received update without tickId:",e);return}switch(t){case"create":case"update":{try{const o=await yo(i),r={...o,is_blocked:o.isBlocked},a=this.ticks.findIndex(n=>n.id===i);if(a>=0?this.ticks=[...this.ticks.slice(0,a),r,...this.ticks.slice(a+1)]:r.type!=="epic"?this.ticks=[...this.ticks,r]:this.epics.find(n=>n.id===r.id)||(this.epics=[...this.epics,{id:r.id,title:r.title}]),r.type==="epic"){const n=this.epics.findIndex(c=>c.id===r.id);n>=0&&(this.epics=[...this.epics.slice(0,n),{id:r.id,title:r.title},...this.epics.slice(n+1)])}((s=this.selectedTick)==null?void 0:s.id)===i&&(this.selectedTick=r,this.selectedTickNotes=o.notesList||[],this.selectedTickBlockers=o.blockerDetails||[]),this.updateBoardState()}catch(o){console.error(`[SSE] Failed to fetch tick ${i}:`,o)}break}case"delete":{const o=this.ticks.findIndex(a=>a.id===i);o>=0&&(this.ticks=[...this.ticks.slice(0,o),...this.ticks.slice(o+1)],this.updateBoardState());const r=this.epics.findIndex(a=>a.id===i);r>=0&&(this.epics=[...this.epics.slice(0,r),...this.epics.slice(r+1)]);break}default:console.warn("[SSE] Unknown update type:",t)}}isInputFocused(){var s;let e=document.activeElement;for(;(s=e==null?void 0:e.shadowRoot)!=null&&s.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let i=e;for(;i;){const o=i.tagName.toLowerCase();if(o.startsWith("sl-")&&(o.includes("input")||o.includes("textarea")||o.includes("select")))return!0;const r=i.getRootNode();i=r instanceof ShadowRoot?r.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Pe.length?[]:this.getColumnTicks(Pe[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Pe.length;e++)if(this.getColumnTicks(Pe[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let i=this.focusedTickIndex+e;i<0?i=t.length-1:i>=t.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Pe.length-1:t>=Pe.length&&(t=0),this.focusedColumnIndex=t;const i=this.getColumnTicks(Pe[t]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Pe[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&(this.selectedTick=e[this.focusedTickIndex])}handleEscape(){this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?this.selectedTick=null:this.showRunPanel?this.showRunPanel=!1:this.clearFocus()}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const i=e.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var i;const{tick:t}=e.detail;this.ticks=[...this.ticks,t],this.showCreateDialog=!1,(i=window.showToast)==null||i.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const i=e.target.querySelector("sl-tab[active]");if(i){const s=i.getAttribute("panel");s&&Pe.includes(s)&&(this.activeColumn=s,this.focusedColumnIndex=Pe.indexOf(s),this.focusedTickIndex=this.getColumnTicks(s).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,i=this.ticks.find(s=>s.id===t);i?this.selectedTick=i:window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;this.selectedTick=t,this.selectedTickNotes=[],this.selectedTickBlockers=[],this.selectedTickParentTitle="";try{const i=await yo(t.id);if(this.selectedTickNotes=i.notesList||[],this.selectedTickBlockers=i.blockerDetails||[],t.parent){const s=this.epics.find(o=>o.id===t.parent);this.selectedTickParentTitle=(s==null?void 0:s.title)||""}}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){this.selectedTick=null,this.selectedTickNotes=[],this.selectedTickBlockers=[],this.selectedTickParentTitle=""}handleTickUpdated(e){var s;const{tick:t}=e.detail;t.notesList&&(this.selectedTickNotes=t.notesList),t.blockerDetails&&(this.selectedTickBlockers=t.blockerDetails);const i=this.ticks.findIndex(o=>o.id===t.id);i>=0&&(this.ticks=[...this.ticks.slice(0,i),t,...this.ticks.slice(i+1)]),((s=this.selectedTick)==null?void 0:s.id)===t.id&&(this.selectedTick=t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(i=>i.id.toLowerCase().includes(t)||i.title.toLowerCase().includes(t)||i.description&&i.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}renderRunPanel(){var i,s;const e=((i=this.runStatus)==null?void 0:i.isRunning)&&this.runStatus.activeTask,t=((s=this.epics.find(o=>o.id===this.runPanelEpicId))==null?void 0:s.title)||this.runPanelEpicId||"Unknown Epic";return h`
      <div class="run-panel">
        <div class="run-panel-header">
          <div class="run-panel-header-left">
            <div class="run-panel-title">
              <sl-icon name="terminal"></sl-icon>
              <span>Live Run</span>
            </div>
            ${this.runPanelEpicId?h`
                  <div class="run-panel-epic">
                    <span class="epic-id">${this.runPanelEpicId}</span>
                    <span>· ${t}</span>
                  </div>
                `:g}
          </div>
          <div class="run-panel-header-right">
            <sl-icon-button
              name="x-lg"
              label="Close run panel"
              @click=${this.closeRunPanel}
            ></sl-icon-button>
          </div>
        </div>

        <div class="run-panel-body">
          ${e?this.renderActiveRun():this.renderNoRunState()}
        </div>
      </div>
    `}renderActiveRun(){var t;const e=(t=this.runStatus)==null?void 0:t.activeTask;return e?h`
      <!-- Task info bar -->
      <div class="run-info-bar">
        <div class="run-task-info">
          <span class="run-task-id">${e.tickId}</span>
          <span class="run-task-title">${e.title}</span>
        </div>
        ${this.runMetrics?h`<run-metrics .metrics=${this.runMetrics} ?live=${!0}></run-metrics>`:g}
      </div>

      <!-- Tool activity indicator -->
      ${this.activeToolInfo?h`
            <tool-activity
              .tool=${this.activeToolInfo}
              ?expanded=${!0}
            ></tool-activity>
          `:g}

      <!-- Output pane -->
      <div class="run-output-section">
        <run-output-pane
          epic-id=${this.runPanelEpicId||""}
        ></run-output-pane>
      </div>
    `:g}renderNoRunState(){return h`
      <div class="no-run-state">
        <sl-icon name="hourglass-split"></sl-icon>
        <p>No active run</p>
        <p class="hint">When a ticker run starts, output will appear here</p>
      </div>
    `}render(){var t;if(this.loading)return h`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return h`
        <div class="error-state">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Failed to load board</strong><br>
            ${this.error}
          </sl-alert>
          <sl-button variant="primary" @click=${this.loadData}>Retry</sl-button>
        </div>
      `;const e=this.getEpicNames();return h`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        ?run-panel-open=${this.showRunPanel}
        ?run-active=${(t=this.runStatus)==null?void 0:t.isRunning}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @run-panel-toggle=${this.toggleRunPanel}
      ></tick-header>

      <!-- Toast notification stack -->
      <tick-toast-stack></tick-toast-stack>

      <!-- Detail drawer -->
      <tick-detail-drawer
        .tick=${this.selectedTick}
        .open=${this.selectedTick!==null}
        .notesList=${this.selectedTickNotes}
        .blockerDetails=${this.selectedTickBlockers}
        parent-title=${this.selectedTickParentTitle}
        @drawer-close=${this.handleDrawerClose}
        @tick-updated=${this.handleTickUpdated}
      ></tick-detail-drawer>

      <!-- Create tick dialog -->
      <tick-create-dialog
        .open=${this.showCreateDialog}
        .epics=${this.epics}
        @dialog-close=${this.handleCreateDialogClose}
        @tick-created=${this.handleTickCreated}
      ></tick-create-dialog>

      <!-- Desktop/Tablet kanban board with optional run panel -->
      <div class="board-layout ${this.showRunPanel?"split":""}">
        <main>
          <div class="kanban-board">
            ${Yi.map((i,s)=>h`
              <tick-column
                name=${i.id}
                .ticks=${this.getColumnTicks(i.id)}
                .epicNames=${e}
                focused-tick-id=${this.focusedColumnIndex===s?this.getFocusedTickId()??"":""}
                @tick-selected=${this.handleTickSelected}
              ></tick-column>
            `)}
          </div>
        </main>

        <!-- Run monitoring panel -->
        ${this.showRunPanel?this.renderRunPanel():g}
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${Yi.map(i=>h`
            <sl-tab
              slot="nav"
              panel=${i.id}
              ?active=${this.activeColumn===i.id}
            >
              ${i.icon}
              <span class="tab-badge">${this.getColumnTicks(i.id).length}</span>
            </sl-tab>
          `)}
          ${Yi.map((i,s)=>h`
            <sl-tab-panel name=${i.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(i.id).length===0?h`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${i.icon}</div>
                        <div>No ticks in ${i.name}</div>
                      </div>
                    `:this.getColumnTicks(i.id).map(o=>h`
                      <tick-card
                        .tick=${o}
                        epic-name=${e[o.parent||""]||""}
                        ?focused=${this.focusedColumnIndex===s&&this.getFocusedTickId()===o.id}
                        @tick-selected=${this.handleTickSelected}
                      ></tick-card>
                    `)}
              </div>
            </sl-tab-panel>
          `)}
        </sl-tab-group>
      </div>

      <!-- Mobile filter drawer -->
      <sl-drawer
        label="Filters"
        placement="start"
        ?open=${this.showMobileFilterDrawer}
        @sl-after-hide=${()=>{this.showMobileFilterDrawer=!1}}
      >
        <div class="filter-drawer-content">
          <div>
            <label>Search</label>
            <sl-input
              placeholder="Search by ID or title..."
              clearable
              .value=${this.searchTerm}
              @sl-input=${this.handleMobileSearchInput}
            >
              <sl-icon name="search" slot="prefix"></sl-icon>
            </sl-input>
          </div>
          <div>
            <label>Filter by Epic</label>
            <sl-select
              placeholder="All Ticks"
              clearable
              .value=${this.selectedEpic}
              @sl-change=${this.handleMobileEpicFilterChange}
            >
              ${this.epics.map(i=>h`
                <sl-option value=${i.id}>
                  <span class="epic-id">${i.id}</span> - ${i.title}
                </sl-option>
              `)}
            </sl-select>
          </div>
        </div>
        <sl-button
          slot="footer"
          variant="primary"
          @click=${()=>{this.showMobileFilterDrawer=!1}}
        >
          Apply
        </sl-button>
      </sl-drawer>

      <!-- Keyboard shortcuts help dialog -->
      <sl-dialog
        label="Keyboard Shortcuts"
        ?open=${this.showKeyboardHelp}
        @sl-after-hide=${()=>{this.showKeyboardHelp=!1}}
        class="keyboard-help-dialog"
      >
        <div class="shortcuts-grid">
          <div class="shortcut-group">
            <h4>Navigation</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>↓</kbd>
              <span>Move down</span>
            </div>
            <div class="shortcut-row">
              <kbd>k</kbd> <kbd>↑</kbd>
              <span>Move up</span>
            </div>
            <div class="shortcut-row">
              <kbd>h</kbd> <kbd>←</kbd>
              <span>Previous column</span>
            </div>
            <div class="shortcut-row">
              <kbd>l</kbd> <kbd>→</kbd>
              <span>Next column</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Actions</h4>
            <div class="shortcut-row">
              <kbd>Enter</kbd>
              <span>Open selected tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>Esc</kbd>
              <span>Close drawer / clear focus</span>
            </div>
            <div class="shortcut-row">
              <kbd>n</kbd>
              <span>Create new tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>/</kbd>
              <span>Focus search</span>
            </div>
            <div class="shortcut-row">
              <kbd>r</kbd>
              <span>Toggle run panel</span>
            </div>
            <div class="shortcut-row">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `}};N.styles=C`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Loading and error states */
    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      color: var(--text);
    }

    .loading-spinner {
      font-size: 2rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .error-state sl-alert {
      max-width: 400px;
      margin-bottom: 1rem;
    }

    /* Kanban board - Desktop */
    main {
      flex: 1;
      padding: 1rem;
      overflow: hidden;
    }

    .kanban-board {
      display: flex;
      gap: 1rem;
      height: calc(100vh - 80px);
      overflow-x: auto;
    }

    /* Mobile tab layout - hidden on desktop */
    .mobile-tab-layout {
      display: none;
    }

    /* Mobile filter drawer */
    .filter-drawer-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .filter-drawer-content label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.25rem;
      display: block;
    }

    .filter-drawer-content sl-input,
    .filter-drawer-content sl-select {
      width: 100%;
    }

    .epic-id {
      font-family: monospace;
      color: var(--subtext0);
      font-size: 0.85em;
    }

    /* Tablet - Horizontal scroll with snap (481-768px) */
    @media (max-width: 768px) and (min-width: 481px) {
      main {
        padding: 0.75rem;
      }

      .kanban-board {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0.5rem;
      }

      .kanban-board tick-column {
        scroll-snap-align: start;
        flex: 0 0 280px;
        min-width: 280px;
      }
    }

    /* Mobile - Tab layout (≤480px) */
    @media (max-width: 480px) {
      main {
        display: none;
      }

      .mobile-tab-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      /* Tab group styling */
      .mobile-tab-layout sl-tab-group {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .mobile-tab-layout sl-tab-group::part(base) {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .mobile-tab-layout sl-tab-group::part(nav) {
        background: var(--surface0);
        border-bottom: 1px solid var(--surface1);
        overflow-x: auto;
        padding: 0 0.5rem;
      }

      .mobile-tab-layout sl-tab-group::part(tabs) {
        gap: 0;
      }

      .mobile-tab-layout sl-tab-group::part(body) {
        flex: 1;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab {
        font-size: 0.75rem;
        padding: 0.5rem 0.75rem;
      }

      .mobile-tab-layout sl-tab::part(base) {
        padding: 0.5rem 0.75rem;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active]::part(base) {
        color: var(--text);
      }

      /* Tab badge for count */
      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.375rem;
        margin-left: 0.375rem;
        font-size: 0.625rem;
        font-weight: 600;
        background: var(--surface1);
        border-radius: 999px;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active] .tab-badge {
        background: var(--blue);
        color: var(--base);
      }

      /* Tab panel content */
      .mobile-tab-layout sl-tab-panel {
        height: 100%;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab-panel::part(base) {
        height: 100%;
        padding: 0;
        overflow: hidden;
      }

      .mobile-column-content {
        height: calc(100vh - 140px);
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .mobile-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--subtext0);
        padding: 2rem 1rem;
        text-align: center;
      }

      .mobile-empty-state .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    }

    /* Keyboard shortcuts help dialog */
    .shortcuts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .shortcut-group h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--surface1);
      padding-bottom: 0.5rem;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--subtext1);
    }

    .shortcut-row span {
      margin-left: auto;
      color: var(--text);
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.75rem;
      background: var(--surface1);
      border: 1px solid var(--surface2, var(--overlay0));
      border-radius: 4px;
      color: var(--text);
    }

    @media (max-width: 480px) {
      .shortcuts-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Split layout when run panel is active */
    .board-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .board-layout.split main {
      flex: 0 0 50%;
      min-width: 400px;
    }

    .board-layout.split .kanban-board {
      height: calc(100vh - 80px);
    }

    /* Run panel container */
    .run-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--surface1, #45475a);
      background: var(--base, #1e1e2e);
      min-width: 400px;
      max-width: 60%;
      overflow: hidden;
    }

    .run-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
      flex-shrink: 0;
    }

    .run-panel-header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-panel-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .run-panel-title sl-icon {
      color: var(--green, #a6e3a1);
    }

    .run-panel-epic {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-epic .epic-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .run-panel-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-panel-header-right sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-header-right sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .run-panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0.75rem;
      gap: 0.75rem;
    }

    /* Run info bar */
    .run-info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .run-task-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .run-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .run-task-title {
      color: var(--text, #cdd6f4);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Run output section */
    .run-output-section {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* No run state */
    .no-run-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--subtext0, #a6adc8);
      text-align: center;
      padding: 2rem;
    }

    .no-run-state sl-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-run-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    .no-run-state .hint {
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--overlay0, #6c7086);
    }

    /* Run toggle button in header area */
    .run-toggle-btn {
      position: relative;
    }

    .run-toggle-btn .live-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    /* Hide run panel on mobile */
    @media (max-width: 768px) {
      .run-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        min-width: unset;
        max-width: unset;
        border-left: none;
        z-index: 100;
      }

      .board-layout.split main {
        flex: 1;
        min-width: unset;
      }
    }
  `;H([ml({context:fl}),v()],N.prototype,"boardState",2);H([v()],N.prototype,"ticks",2);H([v()],N.prototype,"epics",2);H([v()],N.prototype,"repoName",2);H([v()],N.prototype,"selectedEpic",2);H([v()],N.prototype,"searchTerm",2);H([v()],N.prototype,"activeColumn",2);H([v()],N.prototype,"isMobile",2);H([v()],N.prototype,"selectedTick",2);H([v()],N.prototype,"selectedTickNotes",2);H([v()],N.prototype,"selectedTickBlockers",2);H([v()],N.prototype,"selectedTickParentTitle",2);H([v()],N.prototype,"loading",2);H([v()],N.prototype,"error",2);H([v()],N.prototype,"focusedColumnIndex",2);H([v()],N.prototype,"focusedTickIndex",2);H([v()],N.prototype,"showKeyboardHelp",2);H([v()],N.prototype,"showCreateDialog",2);H([v()],N.prototype,"showMobileFilterDrawer",2);H([v()],N.prototype,"showRunPanel",2);H([v()],N.prototype,"runStatus",2);H([v()],N.prototype,"runPanelEpicId",2);H([v()],N.prototype,"runStreamConnected",2);H([v()],N.prototype,"activeToolInfo",2);H([v()],N.prototype,"runMetrics",2);N=H([pe("tick-board")],N);var Il=Object.defineProperty,Ol=Object.getOwnPropertyDescriptor,At=(e,t,i,s)=>{for(var o=s>1?void 0:s?Ol(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Il(t,i,o),o};const wo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Pl={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let tt=class extends J{constructor(){super(...arguments),this.selected=!1,this.focused=!1}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"})}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return wo[this.tick.priority]??wo[2]}getPriorityLabel(){return Pl[this.tick.priority]??"Unknown"}renderVerificationBadge(){const e=this.tick.verification_status;if(!e)return null;switch(e){case"verified":return h`<span class="meta-badge verified">✓ verified</span>`;case"failed":return h`<span class="meta-badge verification-failed">✗ failed</span>`;case"pending":return h`<span class="meta-badge verification-pending">⋯ pending</span>`;default:return null}}render(){const{tick:e,selected:t,focused:i,epicName:s}=this;return h`
      <div
        class="card ${t?"selected":""} ${i?"focused":""}"
        @click=${this.handleClick}
        role="button"
        tabindex=${i?"0":"-1"}
        aria-label="Tick ${e.id}: ${e.title}"
      >
        <div class="card-header">
          <sl-tooltip content="Priority: ${this.getPriorityLabel()}" placement="left">
            <div
              class="priority-indicator"
              style="background-color: ${this.getPriorityColor()}"
            ></div>
          </sl-tooltip>
          <div class="header-content">
            <div class="tick-id">${e.id}</div>
            <h4 class="tick-title">${e.title}</h4>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-badge type-badge type-${e.type}">${e.type}</span>
          <span class="meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
          ${e.is_blocked?h`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${e.manual?h`<span class="meta-badge manual">👤 manual</span>`:null}
          ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:null}
          ${this.renderVerificationBadge()}
        </div>

        ${s?h`<div class="epic-name">${s}</div>`:null}
      </div>
    `}};tt.styles=C`
    :host {
      display: block;
    }

    .card {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .card:hover {
      border-color: var(--overlay0);
    }

    .card.selected {
      border-color: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
    }

    .card.focused {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px var(--blue);
      outline: none;
    }

    .card.focused.selected {
      box-shadow: 0 0 0 2px var(--sapphire);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .priority-indicator {
      width: 4px;
      min-height: 100%;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
    }

    .header-content {
      flex: 1;
      min-width: 0;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      margin: 0;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .epic-name {
      font-size: 0.625rem;
      color: var(--subtext0);
      margin-top: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .epic-name::before {
      content: '↳';
      opacity: 0.7;
    }

    .priority-tooltip {
      font-size: 0.625rem;
    }

    /* Verification badge styles */
    .meta-badge.verified {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.verification-failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.verification-pending {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow);
    }

    .verification-icon {
      font-size: 0.625rem;
    }
  `;At([d({attribute:!1})],tt.prototype,"tick",2);At([d({type:Boolean})],tt.prototype,"selected",2);At([d({type:Boolean})],tt.prototype,"focused",2);At([d({type:String,attribute:"epic-name"})],tt.prototype,"epicName",2);At([$(".card")],tt.prototype,"cardElement",2);tt=At([pe("tick-card")],tt);var Ll=Object.defineProperty,Dl=Object.getOwnPropertyDescriptor,zt=(e,t,i,s)=>{for(var o=s>1?void 0:s?Dl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Ll(t,i,o),o};const Ml={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},Bl={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},Nl={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let it=class extends J{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||Ml[this.name]||"var(--blue)"}getColumnDisplayName(){return Bl[this.name]||this.name}getColumnIcon(){return Nl[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),i=this.getColumnIcon(),s=this.ticks.length;return h`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${e}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${e}">${i}</span>
            ${t}
          </span>
          <span class="column-count">${s}</span>
        </div>
      </div>

      <div class="column-content">
        ${s===0?h`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(o=>h`
                <tick-card
                  .tick=${o}
                  epic-name=${this.epicNames[o.parent||""]||""}
                  ?focused=${this.focusedTickId===o.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};it.styles=C`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 220px;
      max-width: 320px;
      background: var(--surface0);
      border-radius: 8px;
      overflow: hidden;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
    }

    .header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .column-header-wrapper {
      position: relative;
    }

    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text);
    }

    .column-icon {
      font-size: 0.75rem;
    }

    .column-count {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--surface1);
      border-radius: 999px;
      color: var(--subtext0);
      min-width: 1.5rem;
      text-align: center;
    }

    .column-content {
      flex: 1;
      padding: 0.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--subtext0);
      font-size: 0.875rem;
      padding: 2rem 1rem;
      text-align: center;
    }

    .empty-state-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    /* Responsive styles */
    @media (max-width: 768px) {
      :host {
        min-width: 260px;
        flex: 0 0 260px;
      }
    }

    @media (max-width: 480px) {
      :host {
        width: 100%;
        max-width: none;
        height: 100%;
      }
    }
  `;zt([d({type:String})],it.prototype,"name",2);zt([d({type:String})],it.prototype,"color",2);zt([d({attribute:!1})],it.prototype,"ticks",2);zt([d({type:Object,attribute:!1})],it.prototype,"epicNames",2);zt([d({type:String,attribute:"focused-tick-id"})],it.prototype,"focusedTickId",2);it=zt([pe("tick-column")],it);var Fl=Object.defineProperty,Hl=Object.getOwnPropertyDescriptor,rt=(e,t,i,s)=>{for(var o=s>1?void 0:s?Hl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Fl(t,i,o),o};let Me=class extends J{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.runPanelOpen=!1,this.runActive=!1,this.debounceTimeout=null}handleSearchInput(e){const i=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleRunPanelToggle(){this.dispatchEvent(new CustomEvent("run-panel-toggle",{bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return h`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          <h1>Tick Board</h1>
          ${this.repoName?h`<span class="repo-badge">${this.repoName}</span>`:null}
        </div>

        <div class="header-center">
          <sl-input
            placeholder="Search by ID or title..."
            size="small"
            clearable
            .value=${this.searchTerm}
            @sl-input=${this.handleSearchInput}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          <sl-select
            placeholder="All Ticks"
            size="small"
            clearable
            .value=${this.selectedEpic}
            @sl-change=${this.handleEpicFilterChange}
          >
            ${this.epics.map(e=>h`
                <sl-option value=${e.id}>
                  <span class="epic-id">${e.id}</span> - ${e.title}
                </sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Live run panel (r)">
            <sl-button
              class=${this.runActive?"run-button-active":""}
              variant=${this.runPanelOpen?"primary":"default"}
              size="small"
              @click=${this.handleRunPanelToggle}
            >
              <sl-icon name="terminal"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Activity feed">
            <tick-activity-feed
              @activity-click=${this.handleActivityClick}
            ></tick-activity-feed>
          </sl-tooltip>

          <sl-tooltip content="Create new tick">
            <sl-button
              variant="primary"
              size="small"
              @click=${this.handleCreateClick}
            >
              <sl-icon name="plus-lg"></sl-icon>
            </sl-button>
          </sl-tooltip>
        </div>
      </header>
    `}};Me.styles=C`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background-color: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--rosewater);
      margin: 0;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      max-width: 600px;
    }

    .header-center sl-input {
      flex: 1;
      max-width: 250px;
    }

    .header-center sl-select {
      min-width: 220px;
    }

    .epic-id {
      font-family: monospace;
      font-size: 0.85em;
      opacity: 0.7;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile menu button */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .menu-toggle:hover {
      background: var(--surface1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-center {
        display: none;
      }

      .menu-toggle {
        display: block;
      }
    }

    @media (max-width: 480px) {
      header {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .repo-badge {
        display: none;
      }

      .header-left h1 {
        font-size: 1rem;
      }

      /* Make buttons larger for touch */
      .header-right sl-button::part(base) {
        min-width: 44px;
        min-height: 44px;
      }

      .menu-toggle {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    /* Pulsing animation for active run indicator */
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 4px var(--green, #a6e3a1);
      }
      50% {
        box-shadow: 0 0 12px var(--green, #a6e3a1), 0 0 20px var(--green, #a6e3a1);
      }
    }

    .run-button-active::part(base) {
      background: var(--green, #a6e3a1) !important;
      color: var(--crust, #11111b) !important;
      animation: pulse-glow 1.5s ease-in-out infinite;
    }
  `;rt([d({type:String,attribute:"repo-name"})],Me.prototype,"repoName",2);rt([d({attribute:!1})],Me.prototype,"epics",2);rt([d({type:String,attribute:"selected-epic"})],Me.prototype,"selectedEpic",2);rt([d({type:String,attribute:"search-term"})],Me.prototype,"searchTerm",2);rt([d({type:Boolean,attribute:"run-panel-open"})],Me.prototype,"runPanelOpen",2);rt([d({type:Boolean,attribute:"run-active"})],Me.prototype,"runActive",2);rt([v()],Me.prototype,"debounceTimeout",2);Me=rt([pe("tick-header")],Me);var jl=Object.defineProperty,Ul=Object.getOwnPropertyDescriptor,Di=(e,t,i,s)=>{for(var o=s>1?void 0:s?Ul(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&jl(t,i,o),o};let $t=class extends J{constructor(){super(...arguments),this.record=null,this.loading=!1,this.error=""}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}truncateText(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}renderSummary(e){const t=e.metrics.input_tokens+e.metrics.output_tokens,i=e.success?"success":"error";return h`
      <div class="summary-section">
        <div class="summary-header">
          <div class="summary-left">
            <span class="status-icon ${i}">
              <sl-icon name="${e.success?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            </span>
            <span class="model-badge">${e.model}</span>
          </div>
          <div class="summary-right">
            <span class="session-id">${e.session_id}</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Status</span>
            <span class="summary-value ${i}">${e.success?"Success":"Failed"}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Duration</span>
            <span class="summary-value">${this.formatDuration(e.metrics.duration_ms)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tokens</span>
            <span class="summary-value">${this.formatTokenCount(t)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cost</span>
            <span class="summary-value cost">${this.formatCost(e.metrics.cost_usd)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Started</span>
            <span class="summary-value">${this.formatTimestamp(e.started_at)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Ended</span>
            <span class="summary-value">${this.formatTimestamp(e.ended_at)}</span>
          </div>
        </div>

        ${!e.success&&e.error_msg?h`<div class="error-box"><strong>Error:</strong> ${e.error_msg}</div>`:g}
      </div>
    `}renderMetrics(e){const t=e.metrics;return h`
      <sl-details summary="Metrics">
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Input Tokens</span>
            <span class="metric-value">${this.formatTokenCount(t.input_tokens)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Output Tokens</span>
            <span class="metric-value">${this.formatTokenCount(t.output_tokens)}</span>
          </div>
          ${t.cache_read_tokens>0?h`
                <div class="metric-item">
                  <span class="metric-label">Cache Read</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_read_tokens)}</span>
                </div>
              `:g}
          ${t.cache_creation_tokens>0?h`
                <div class="metric-item">
                  <span class="metric-label">Cache Creation</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_creation_tokens)}</span>
                </div>
              `:g}
          <div class="metric-item">
            <span class="metric-label">Duration</span>
            <span class="metric-value">${this.formatDuration(t.duration_ms)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Cost</span>
            <span class="metric-value">${this.formatCost(t.cost_usd)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Turns</span>
            <span class="metric-value">${e.num_turns}</span>
          </div>
        </div>
      </sl-details>
    `}renderOutput(e){return e.output?h`
      <sl-details summary="Output">
        <div class="content-block">${e.output}</div>
      </sl-details>
    `:g}renderThinking(e){return e.thinking?h`
      <sl-details summary="Thinking">
        <div class="content-block">${e.thinking}</div>
      </sl-details>
    `:g}renderToolItem(e){return h`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:g}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`:g}
      </li>
    `}renderTools(e){return!e.tools||e.tools.length===0?g:h`
      <sl-details summary="Tools (${e.tools.length})">
        <ul class="tools-list">
          ${e.tools.map(t=>this.renderToolItem(t))}
        </ul>
      </sl-details>
    `}renderVerifierResult(e){const t=e.passed?"passed":"failed";return h`
      <div class="verifier-item ${t}">
        <span class="verifier-icon ${t}">
          <sl-icon name="${e.passed?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:g}
          ${e.output?h`<div class="verifier-output">${e.output}</div>`:g}
        </div>
      </div>
    `}renderVerification(e){if(!e.verification)return g;const t=e.verification,i=t.all_passed?"passed":"failed",s=t.results||[];return h`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${i}">
            <sl-icon name="${t.all_passed?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            <span>${t.all_passed?"Verified":"Failed"}</span>
          </div>
        </div>
        ${s.length>0?h`
              <div class="verifier-results">
                ${s.map(o=>this.renderVerifierResult(o))}
              </div>
            `:g}
      </sl-details>
    `}render(){if(this.loading)return h`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading run record...</span>
        </div>
      `;if(this.error)return h`<div class="error">${this.error}</div>`;if(!this.record)return h`<div class="empty">No run record available</div>`;const e=this.record,t=e.success?"success":"error";return h`
      <div class="run-record-container ${t}">
        ${this.renderSummary(e)}
        <div class="sections-container">
          ${this.renderMetrics(e)}
          ${this.renderOutput(e)}
          ${this.renderThinking(e)}
          ${this.renderTools(e)}
          ${this.renderVerification(e)}
        </div>
      </div>
    `}};$t.styles=C`
    :host {
      display: block;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    /* Error state */
    .error {
      color: var(--red);
      font-size: 0.875rem;
      padding: 0.5rem;
    }

    /* Empty state */
    .empty {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Main container */
    .run-record-container {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record-container.success {
      border-left: 3px solid var(--green);
    }

    .run-record-container.error {
      border-left: 3px solid var(--red);
    }

    /* Summary section (always visible) */
    .summary-section {
      padding: 0.75rem;
      background: var(--mantle);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-icon {
      display: flex;
      align-items: center;
    }

    .status-icon.success sl-icon {
      color: var(--green);
    }

    .status-icon.error sl-icon {
      color: var(--red);
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .session-id {
      font-family: monospace;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
    }

    .summary-label {
      color: var(--subtext0);
    }

    .summary-value {
      color: var(--text);
      font-family: monospace;
    }

    .summary-value.success {
      color: var(--green);
    }

    .summary-value.error {
      color: var(--red);
    }

    .summary-value.cost {
      color: var(--green);
      font-weight: 500;
    }

    /* Error message box */
    .error-box {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    /* Collapsible sections using sl-details */
    .sections-container {
      border-top: 1px solid var(--surface1);
    }

    sl-details {
      border-bottom: 1px solid var(--surface1);
    }

    sl-details:last-child {
      border-bottom: none;
    }

    sl-details::part(base) {
      background: transparent;
      border: none;
      border-radius: 0;
    }

    sl-details::part(header) {
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    sl-details::part(summary-icon) {
      color: var(--subtext0);
    }

    sl-details::part(content) {
      padding: 0 0.75rem 0.75rem 0.75rem;
    }

    /* Content blocks */
    .content-block {
      background: var(--crust);
      border-radius: 4px;
      padding: 0.5rem;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 250px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .content-block::-webkit-scrollbar {
      width: 6px;
    }

    .content-block::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .content-block::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    /* Metrics section */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .metric-label {
      color: var(--subtext0);
    }

    .metric-value {
      color: var(--text);
      font-family: monospace;
    }

    /* Tools list */
    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      margin-bottom: 0;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 80px;
    }

    .tool-name.error {
      color: var(--red);
    }

    .tool-input-preview {
      flex: 1;
      color: var(--subtext0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      color: var(--subtext0);
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-error-icon {
      color: var(--red);
      font-size: 0.75rem;
    }

    /* Verification section */
    .verification-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .verifier-results {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .verifier-item.passed {
      border-left: 2px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 2px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 0.875rem;
    }

    .verifier-icon.passed {
      color: var(--green);
    }

    .verifier-icon.failed {
      color: var(--red);
    }

    .verifier-content {
      flex: 1;
      min-width: 0;
    }

    .verifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .verifier-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.6875rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--surface0);
      padding: 0.375rem;
      border-radius: 4px;
      max-height: 100px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.6875rem;
      color: var(--red);
      margin-top: 0.25rem;
    }
  `;Di([d({attribute:!1})],$t.prototype,"record",2);Di([d({type:Boolean})],$t.prototype,"loading",2);Di([d({type:String})],$t.prototype,"error",2);$t=Di([pe("run-record")],$t);var Vl=Object.defineProperty,ql=Object.getOwnPropertyDescriptor,K=(e,t,i,s)=>{for(var o=s>1?void 0:s?ql(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Vl(t,i,o),o};const Wl={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},ko={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let V=class extends J{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&(this.resetActionState(),this.tick&&this.tick.type==="task"&&this.loadRunRecord())}async loadRunRecord(){if(this.tick){this.loadingRunRecord=!0,this.runRecordError="",this.runRecord=null;try{this.runRecord=await Sl(this.tick.id)}catch(e){e instanceof $e?this.runRecordError=e.body||e.message:this.runRecordError="Failed to load run history"}finally{this.loadingRunRecord=!1}}}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await kl(this.tick.id),t={...e,is_blocked:e.isBlocked};this.emitTickUpdated(t),this.resetActionState()}catch(e){e instanceof $e?this.errorMessage=e.body||e.message:this.errorMessage="Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const e=await xl(this.tick.id,this.rejectReason.trim()),t={...e,is_blocked:e.isBlocked};this.emitTickUpdated(t),this.resetActionState()}catch(e){e instanceof $e?this.errorMessage=e.body||e.message:this.errorMessage="Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await yl(this.tick.id,this.closeReason.trim()||void 0),t={...e,is_blocked:e.isBlocked};this.emitTickUpdated(t),this.resetActionState()}catch(e){e instanceof $e?this.errorMessage=e.body||e.message:this.errorMessage="Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await _l(this.tick.id),t={...e,is_blocked:e.isBlocked};this.emitTickUpdated(t),this.resetActionState()}catch(e){e instanceof $e?this.errorMessage=e.body||e.message:this.errorMessage="Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const t=await wl(this.tick.id,e);this.optimisticNote=null;const i={...t,is_blocked:t.isBlocked,notesList:t.notesList};this.emitTickUpdated(i)}catch(t){this.optimisticNote=null,this.newNoteText=e,t instanceof $e?this.addNoteError=t.body||t.message:this.addNoteError="Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return Wl[e]??"Unknown"}getPriorityColor(e){return ko[e]??ko[2]}renderActions(){const e=this.tick;if(!e)return g;const t=e.status==="open",i=e.status==="closed",s=!!e.awaiting,o=!!e.requires,r=t&&s,a=t&&!o,n=i;return!r&&!a&&!n?g:h`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?h`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:g}

        <div class="actions-section">
          ${r?h`
                <sl-button
                  variant="success"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  Approve
                </sl-button>
                <sl-button
                  variant="danger"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </sl-button>
              `:g}
          ${a?h`
                <sl-button
                  variant="neutral"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </sl-button>
              `:g}
          ${n?h`
                <sl-button
                  variant="primary"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  Reopen
                </sl-button>
              `:g}
        </div>

        ${this.showRejectInput?h`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${c=>{this.rejectReason=c.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <sl-button
                    variant="danger"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading||!this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    Confirm Reject
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </sl-button>
                </div>
              </div>
            `:g}

        ${this.showCloseInput?h`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${c=>{this.closeReason=c.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    Confirm Close
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    outline
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </sl-button>
                </div>
              </div>
            `:g}
      </div>

      <sl-divider></sl-divider>
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?h`<span class="empty-text">None</span>`:h`
      <ul class="link-list">
        ${this.blockerDetails.map(e=>h`
            <li>
              <a
                class="tick-link status-${e.status}"
                @click=${()=>this.handleTickLinkClick(e.id)}
              >
                <span class="link-id">${e.id}</span>
                <span class="link-title">${e.title}</span>
              </a>
            </li>
          `)}
      </ul>
    `}renderParent(){var e;return(e=this.tick)!=null&&e.parent?h`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?h`<span class="link-title">${this.parentTitle}</span>`:g}
      </a>
    `:h`<span class="empty-text">None</span>`}renderLabels(){var e;return!((e=this.tick)!=null&&e.labels)||this.tick.labels.length===0?h`<span class="empty-text">None</span>`:h`
      <div class="labels-container">
        ${this.tick.labels.map(t=>h`<span class="label-badge">${t}</span>`)}
      </div>
    `}renderNoteItem(e,t=!1){return h`
      <li class="note-item ${t?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${e.author??"Unknown"}</span>
          ${e.timestamp?h`<span class="note-timestamp"
                >${this.formatTimestamp(e.timestamp)}</span
              >`:g}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?h`<div class="note-sending">Sending...</div>`:g}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return h`
      ${e?h`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):g}
              </ul>
            </div>
          `:h`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?h`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `:g}

      <!-- Add note form -->
      <div class="add-note-form">
        <sl-textarea
          placeholder="Add a note..."
          rows="2"
          resize="none"
          .value=${this.newNoteText}
          ?disabled=${this.addingNote}
          @sl-input=${t=>{this.newNoteText=t.target.value}}
          @keydown=${t=>{t.key==="Enter"&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.handleAddNote())}}
        ></sl-textarea>
        <div class="add-note-actions">
          <span class="add-note-hint">Ctrl+Enter to send</span>
          <sl-button
            variant="primary"
            size="small"
            ?loading=${this.addingNote}
            ?disabled=${this.addingNote||!this.newNoteText.trim()}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            Add Note
          </sl-button>
        </div>
      </div>
    `}toggleSection(e){const t=new Set(this.expandedSections);t.has(e)?t.delete(e):t.add(e),this.expandedSections=t}formatRunTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}truncateText(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}renderVerification(){var s;if(((s=this.tick)==null?void 0:s.type)!=="task"||!this.runRecord)return g;const e=this.runRecord.verification;if(!e)return this.tick.status==="closed"?h`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `:g;const t=e.all_passed,i=e.results||[];return h`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-circle-fill":"x-circle-fill"}"></sl-icon>
          <span>${t?"Verified":"Failed"}</span>
        </div>

        ${i.length>0?h`
              <div class="verifier-results">
                ${i.map(o=>this.renderVerifierResult(o))}
              </div>
            `:g}
      </div>
      <sl-divider></sl-divider>
    `}renderVerifierResult(e){const t=e.passed,i=this.expandedSections.has(`verifier-${e.verifier}`);return h`
      <div class="verifier-item ${t?"passed":"failed"}">
        <span class="verifier-icon ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:g}
          ${e.output?h`
                <div
                  class="run-collapsible-header"
                  style="margin-top: 0.5rem;"
                  @click=${()=>this.toggleSection(`verifier-${e.verifier}`)}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${i?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${i?h`<div class="verifier-output">${e.output}</div>`:g}
              `:g}
        </div>
      </div>
    `}renderRunHistory(){var s;if(((s=this.tick)==null?void 0:s.type)!=="task")return g;if(this.loadingRunRecord)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <div class="run-loading">
            <sl-spinner></sl-spinner>
            <span>Loading run history...</span>
          </div>
        </div>
        <sl-divider></sl-divider>
      `;if(this.runRecordError)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.runRecordError}
          </sl-alert>
        </div>
        <sl-divider></sl-divider>
      `;if(!this.runRecord)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <span class="no-run-history">No run history available</span>
        </div>
        <sl-divider></sl-divider>
      `;const e=this.runRecord,t=this.expandedSections.has("run-main"),i=e.metrics.input_tokens+e.metrics.output_tokens;return h`
      <div class="section">
        <div class="section-title">Run History</div>
        <div class="run-history-container">
          <div class="run-record ${e.success?"success":"error"}">
            <!-- Header (always visible, clickable to expand) -->
            <div
              class="run-record-header"
              @click=${()=>this.toggleSection("run-main")}
            >
              <div class="run-header-left">
                <span class="run-status-icon ${e.success?"success":"error"}">
                  <sl-icon name="${e.success?"check-circle-fill":"x-circle-fill"}"></sl-icon>
                </span>
                <span class="run-timestamp">${this.formatRunTimestamp(e.started_at)}</span>
              </div>
              <div class="run-header-right">
                <div class="run-metrics-summary">
                  <span class="run-metric">
                    <span class="run-metric-value">${this.formatTokenCount(i)}</span>
                    <span>tokens</span>
                  </span>
                  <span class="run-cost">${this.formatCost(e.metrics.cost_usd)}</span>
                </div>
                <span class="run-model-badge">${e.model}</span>
                <sl-icon
                  class="expand-icon ${t?"expanded":""}"
                  name="chevron-down"
                ></sl-icon>
              </div>
            </div>

            <!-- Expanded content -->
            ${t?this.renderRunRecordBody(e):g}
          </div>
        </div>
      </div>
      <sl-divider></sl-divider>
    `}renderRunRecordBody(e){return h`
      <div class="run-record-body">
        <!-- Basic details -->
        <div class="run-detail-row">
          <span class="run-detail-label">Session ID</span>
          <span class="run-detail-value">${e.session_id}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Duration</span>
          <span class="run-detail-value">${this.formatDuration(e.metrics.duration_ms)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Turns</span>
          <span class="run-detail-value">${e.num_turns}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Started</span>
          <span class="run-detail-value">${this.formatTimestamp(e.started_at)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Ended</span>
          <span class="run-detail-value">${this.formatTimestamp(e.ended_at)}</span>
        </div>

        <!-- Token breakdown -->
        <div class="run-detail-row">
          <span class="run-detail-label">Input Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(e.metrics.input_tokens)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Output Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(e.metrics.output_tokens)}</span>
        </div>
        ${e.metrics.cache_read_tokens>0?h`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Read</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_read_tokens)}</span>
              </div>
            `:g}
        ${e.metrics.cache_creation_tokens>0?h`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_creation_tokens)}</span>
              </div>
            `:g}

        <!-- Error message if failed -->
        ${!e.success&&e.error_msg?h`
              <div class="run-error-msg">
                <strong>Error:</strong> ${e.error_msg}
              </div>
            `:g}

        <!-- Collapsible: Output -->
        ${e.output?h`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-output")}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-output")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-output")?h`
                      <div class="run-collapsible-content">
                        ${e.output}
                      </div>
                    `:g}
              </div>
            `:g}

        <!-- Collapsible: Thinking -->
        ${e.thinking?h`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-thinking")}
                >
                  <span>Thinking</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-thinking")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-thinking")?h`
                      <div class="run-collapsible-content">
                        ${e.thinking}
                      </div>
                    `:g}
              </div>
            `:g}

        <!-- Collapsible: Tools Log -->
        ${e.tools&&e.tools.length>0?h`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-tools")}
                >
                  <span>Tools (${e.tools.length})</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-tools")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-tools")?h`
                      <ul class="tools-list">
                        ${e.tools.map(t=>this.renderToolItem(t))}
                      </ul>
                    `:g}
              </div>
            `:g}

        <!-- Link to log file -->
        <a
          class="run-log-link"
          href="javascript:void(0)"
          @click=${()=>{var i;const t=`.tick/logs/records/${(i=this.tick)==null?void 0:i.id}.json`;navigator.clipboard.writeText(t),window.showToast&&window.showToast({message:`Log path copied: ${t}`,variant:"primary",duration:3e3})}}
        >
          <sl-icon name="file-earmark-text"></sl-icon>
          Copy log file path
        </a>
      </div>
    `}renderToolItem(e){return h`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:g}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`:g}
      </li>
    `}renderRunTab(){var e;return((e=this.tick)==null?void 0:e.type)!=="task"?h`
        <div class="run-tab-empty">
          <sl-icon name="info-circle"></sl-icon>
          <div class="empty-message">Run data is only available for tasks.</div>
        </div>
      `:h`
      <div class="run-tab-content">
        <run-record
          .record=${this.runRecord}
          .loading=${this.loadingRunRecord}
          .error=${this.runRecordError}
        ></run-record>
      </div>
    `}shouldShowRunTab(){var e,t;return((e=this.tick)==null?void 0:e.type)==="task"&&((t=this.tick)==null?void 0:t.status)==="closed"}renderDetailsContent(){const e=this.tick;return e?h`
      <div class="drawer-content">
        <!-- Header: ID and Title -->
        <div class="section">
          <div class="tick-id">${e.id}</div>
          <h2 class="tick-title">${e.title}</h2>

          <!-- Status badges row -->
          <div class="meta-row">
            <span class="meta-badge type-badge type-${e.type}"
              >${e.type}</span
            >
            <span class="meta-badge status-${e.status}"
              >${e.status.replace("_"," ")}</span
            >
            <span
              class="meta-badge priority"
              style="--priority-color: ${this.getPriorityColor(e.priority)}"
            >
              ${this.getPriorityLabel(e.priority)}
            </span>
            ${e.manual?h`<span class="meta-badge manual">👤 Manual</span>`:g}
            ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:g}
            ${e.verdict?h`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:g}
            ${this.blockerDetails&&this.blockerDetails.length>0?h`<span class="meta-badge blocked">⊘ Blocked</span>`:g}
          </div>
        </div>

        <!-- Actions (approve/reject/close/reopen) -->
        ${this.renderActions()}

        <!-- Description -->
        <div class="section">
          <div class="section-title">Description</div>
          ${e.description?h`<div class="description">${e.description}</div>`:h`<span class="empty-text">No description</span>`}
        </div>

        <!-- Parent Epic -->
        <div class="section">
          <div class="section-title">Parent Epic</div>
          ${this.renderParent()}
        </div>

        <!-- Blocked By -->
        <div class="section">
          <div class="section-title">Blocked By</div>
          ${this.renderBlockers()}
        </div>

        <!-- Labels -->
        <div class="section">
          <div class="section-title">Labels</div>
          ${this.renderLabels()}
        </div>

        <sl-divider></sl-divider>

        <!-- Notes -->
        <div class="section">
          <div class="section-title">Notes</div>
          ${this.renderNotes()}
        </div>

        <sl-divider></sl-divider>

        <!-- Timestamps -->
        <div class="section">
          <div class="timestamp-row">
            <span class="timestamp-label">Created</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(e.created_at)}</span
            >
          </div>
          <div class="timestamp-row" style="margin-top: 0.375rem">
            <span class="timestamp-label">Updated</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(e.updated_at)}</span
            >
          </div>
          ${e.closed_at?h`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(e.closed_at)}</span
                  >
                </div>
              `:g}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?h`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:g}
      </div>
    `:g}render(){const e=this.tick,t=this.shouldShowRunTab();return h`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?t?h`
                <div class="tab-container">
                  <sl-tab-group>
                    <sl-tab slot="nav" panel="overview" active>Overview</sl-tab>
                    <sl-tab slot="nav" panel="run">Run</sl-tab>

                    <sl-tab-panel name="overview" active>
                      ${this.renderDetailsContent()}
                    </sl-tab-panel>

                    <sl-tab-panel name="run">
                      ${this.renderRunTab()}
                    </sl-tab-panel>
                  </sl-tab-group>
                </div>
              `:this.renderDetailsContent():h`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};V.styles=C`
    :host {
      display: block;
    }

    sl-drawer::part(panel) {
      width: 420px;
      background: var(--base);
    }

    sl-drawer::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-drawer::part(title) {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-drawer::part(close-button) {
      color: var(--subtext0);
    }

    sl-drawer::part(close-button):hover {
      color: var(--text);
    }

    sl-drawer::part(body) {
      padding: 0;
    }

    .drawer-content {
      padding: 1rem;
    }

    .section {
      margin-bottom: 1.25rem;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--blue);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.priority {
      border-left: 3px solid var(--priority-color);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.verdict-approved {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.verdict-rejected {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .description {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--surface0);
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface1);
    }

    .empty-text {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    .link-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .link-list li {
      margin-bottom: 0.375rem;
    }

    .link-list li:last-child {
      margin-bottom: 0;
    }

    .tick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .tick-link:hover {
      color: var(--sapphire);
      text-decoration: underline;
    }

    .tick-link .link-id {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .tick-link .link-title {
      color: var(--subtext1);
    }

    .tick-link.status-closed .link-title {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .label-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .timestamp-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .timestamp-label {
      color: var(--subtext0);
    }

    .timestamp-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .note-item {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      padding: 0.625rem;
      margin-bottom: 0.5rem;
    }

    .note-item:last-child {
      margin-bottom: 0;
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .note-author {
      font-weight: 500;
      color: var(--blue);
    }

    .note-timestamp {
      font-family: monospace;
      color: var(--subtext0);
    }

    .note-text {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 480px) {
      sl-drawer::part(panel) {
        width: 100vw;
        max-width: 100vw;
      }

      /* Larger touch targets for mobile */
      .actions-section sl-button::part(base) {
        min-height: 44px;
        font-size: 1rem;
      }

      .add-note-actions sl-button::part(base) {
        min-height: 44px;
      }

      .tick-link {
        padding: 0.5rem;
        margin: -0.5rem;
      }

      .reason-buttons sl-button::part(base) {
        min-height: 44px;
      }
    }

    /* Action buttons section */
    .actions-section {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .actions-section sl-button::part(base) {
      font-size: 0.875rem;
    }

    /* Reason input container */
    .reason-container {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
    }

    .reason-container .reason-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
      display: block;
    }

    .reason-container .reason-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Error alert */
    .error-alert {
      margin-bottom: 1rem;
    }

    /* Notes scroll container */
    .notes-scroll {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 0.75rem;
    }

    /* Optimistic note styling */
    .note-optimistic {
      opacity: 0.7;
      border-style: dashed;
    }

    .note-sending {
      font-size: 0.75rem;
      color: var(--subtext0);
      font-style: italic;
      margin-top: 0.25rem;
    }

    /* Add note form */
    .add-note-form {
      margin-top: 0.75rem;
    }

    .add-note-form sl-textarea::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    .add-note-form sl-textarea::part(textarea) {
      color: var(--text);
      font-size: 0.875rem;
    }

    .add-note-form sl-textarea::part(textarea)::placeholder {
      color: var(--subtext0);
    }

    .add-note-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .add-note-hint {
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .add-note-error {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    /* Run History styles */
    .run-history-container {
      margin-top: 0.5rem;
    }

    .run-record {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record.success {
      border-left: 3px solid var(--green);
    }

    .run-record.error {
      border-left: 3px solid var(--red);
    }

    .run-record-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--mantle);
      border-bottom: 1px solid var(--surface1);
      cursor: pointer;
      user-select: none;
    }

    .run-record-header:hover {
      background: var(--surface0);
    }

    .run-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-status-icon {
      display: flex;
      align-items: center;
    }

    .run-status-icon.success sl-icon {
      color: var(--green);
    }

    .run-status-icon.error sl-icon {
      color: var(--red);
    }

    .run-timestamp {
      font-size: 0.75rem;
      color: var(--subtext1);
      font-family: monospace;
    }

    .run-header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-metrics-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .run-metric {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .run-metric-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .run-cost {
      color: var(--green);
      font-weight: 500;
    }

    .run-model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .expand-icon {
      color: var(--subtext0);
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .run-record-body {
      padding: 0.75rem;
    }

    .run-detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .run-detail-row:last-child {
      margin-bottom: 0;
    }

    .run-detail-label {
      color: var(--subtext0);
    }

    .run-detail-value {
      color: var(--text);
      font-family: monospace;
    }

    .run-collapsible {
      margin-top: 0.75rem;
    }

    .run-collapsible-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    .run-collapsible-header:hover {
      background: var(--surface0);
    }

    .run-collapsible-content {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .run-collapsible-content::-webkit-scrollbar {
      width: 6px;
    }

    .run-collapsible-content::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .run-collapsible-content::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--surface0);
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      border-bottom: none;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 60px;
    }

    .tool-name.error {
      color: var(--red);
    }

    .tool-input-preview {
      flex: 1;
      color: var(--subtext0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      color: var(--subtext0);
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .run-error-msg {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    .run-log-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
    }

    .run-log-link:hover {
      text-decoration: underline;
    }

    .run-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    .no-run-history {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Verification styles */
    .verification-section {
      margin-top: 0.75rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .verification-badge.pending {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .verification-badge sl-icon {
      font-size: 1rem;
    }

    .verifier-results {
      margin-top: 0.75rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .verifier-item:last-child {
      margin-bottom: 0;
    }

    .verifier-item.passed {
      border-left: 3px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 3px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 1rem;
    }

    .verifier-icon.passed {
      color: var(--green);
    }

    .verifier-icon.failed {
      color: var(--red);
    }

    .verifier-content {
      flex: 1;
      min-width: 0;
    }

    .verifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .verifier-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.75rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--crust);
      padding: 0.5rem;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.75rem;
      color: var(--red);
      margin-top: 0.25rem;
    }

    /* Tab group styles */
    .tab-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.75rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.625rem 0.875rem;
      color: var(--subtext0);
    }

    sl-tab::part(base):hover {
      color: var(--text);
    }

    sl-tab[active]::part(base) {
      color: var(--blue);
    }

    sl-tab-panel {
      height: 100%;
      overflow-y: auto;
    }

    sl-tab-panel::part(base) {
      padding: 0;
      height: 100%;
    }

    .run-tab-content {
      padding: 1rem;
    }

    .run-tab-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--subtext0);
    }

    .run-tab-empty sl-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .run-tab-empty .empty-message {
      font-size: 0.875rem;
      font-style: italic;
    }
  `;K([d({attribute:!1})],V.prototype,"tick",2);K([d({type:Boolean})],V.prototype,"open",2);K([d({attribute:!1})],V.prototype,"notesList",2);K([d({attribute:!1})],V.prototype,"blockerDetails",2);K([d({type:String,attribute:"parent-title"})],V.prototype,"parentTitle",2);K([v()],V.prototype,"loading",2);K([v()],V.prototype,"errorMessage",2);K([v()],V.prototype,"showRejectInput",2);K([v()],V.prototype,"showCloseInput",2);K([v()],V.prototype,"rejectReason",2);K([v()],V.prototype,"closeReason",2);K([v()],V.prototype,"newNoteText",2);K([v()],V.prototype,"addingNote",2);K([v()],V.prototype,"addNoteError",2);K([v()],V.prototype,"optimisticNote",2);K([v()],V.prototype,"runRecord",2);K([v()],V.prototype,"loadingRunRecord",2);K([v()],V.prototype,"runRecordError",2);K([v()],V.prototype,"expandedSections",2);K([v()],V.prototype,"activeTab",2);V=K([pe("tick-detail-drawer")],V);var Kl=Object.defineProperty,Gl=Object.getOwnPropertyDescriptor,ge=(e,t,i,s)=>{for(var o=s>1?void 0:s?Gl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Kl(t,i,o),o};const Zl=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],Xl=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let le=class extends J{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1,this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleManualChange(e){const t=e.target;this.manual=t.checked}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent);try{const i=await vl(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(s=>s.trim()).filter(Boolean):[],manual:this.manual},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof $e?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return h`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?h`<div class="error-message">${this.error}</div>`:g}

        <div class="form-field">
          <label>
            Title <span class="required">*</span>
          </label>
          <sl-input
            name="title"
            placeholder="Enter tick title"
            .value=${this.tickTitle}
            @sl-input=${this.handleTitleInput}
            ?disabled=${this.loading}
            autofocus
          ></sl-input>
        </div>

        <div class="form-field">
          <label>Description</label>
          <sl-textarea
            placeholder="Enter description (optional)"
            rows="3"
            resize="auto"
            .value=${this.tickDescription}
            @sl-input=${this.handleDescriptionInput}
            ?disabled=${this.loading}
          ></sl-textarea>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Type</label>
            <sl-select
              .value=${this.type}
              @sl-change=${this.handleTypeChange}
              ?disabled=${this.loading}
            >
              ${Zl.map(e=>h`
                  <sl-option value=${e.value}>${e.label}</sl-option>
                `)}
            </sl-select>
          </div>

          <div class="form-field">
            <label>Priority</label>
            <sl-select
              .value=${String(this.priority)}
              @sl-change=${this.handlePriorityChange}
              ?disabled=${this.loading}
            >
              ${Xl.map(e=>h`
                  <sl-option value=${String(e.value)}>${e.label}</sl-option>
                `)}
            </sl-select>
          </div>
        </div>

        <div class="form-field">
          <label>Parent Epic</label>
          <sl-select
            placeholder="None"
            clearable
            .value=${this.parent}
            @sl-change=${this.handleParentChange}
            ?disabled=${this.loading}
          >
            ${this.epics.map(e=>h`
                <sl-option value=${e.id}>${e.title}</sl-option>
              `)}
          </sl-select>
        </div>

        <div class="form-field">
          <label>Labels</label>
          <sl-input
            placeholder="bug, urgent, frontend (comma-separated)"
            .value=${this.labels}
            @sl-input=${this.handleLabelsInput}
            ?disabled=${this.loading}
          ></sl-input>
        </div>

        <div class="form-field">
          <div class="checkbox-field">
            <sl-checkbox
              ?checked=${this.manual}
              @sl-change=${this.handleManualChange}
              ?disabled=${this.loading}
            >
              Manual task
            </sl-checkbox>
          </div>
          <div class="checkbox-help">
            Manual tasks require human intervention and are skipped by automated agents.
          </div>
        </div>

        <div slot="footer" class="footer-buttons">
          <sl-button
            variant="neutral"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </sl-button>
          <sl-button
            variant="primary"
            @click=${this.handleSubmit}
            ?loading=${this.loading}
          >
            Create
          </sl-button>
        </div>
      </sl-dialog>
    `}};le.styles=C`
    :host {
      display: block;
    }

    sl-dialog::part(panel) {
      width: 480px;
      max-width: 95vw;
      background: var(--base);
    }

    sl-dialog::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-dialog::part(title) {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-dialog::part(close-button) {
      color: var(--subtext0);
    }

    sl-dialog::part(close-button):hover {
      color: var(--text);
    }

    sl-dialog::part(body) {
      padding: 1.25rem;
    }

    sl-dialog::part(footer) {
      background: var(--surface0);
      border-top: 1px solid var(--surface1);
      padding: 1rem 1.25rem;
    }

    .form-field {
      margin-bottom: 1rem;
    }

    .form-field:last-child {
      margin-bottom: 0;
    }

    .form-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.375rem;
    }

    .form-field .required {
      color: var(--red);
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-row .form-field {
      flex: 1;
    }

    sl-input,
    sl-textarea,
    sl-select {
      width: 100%;
    }

    sl-checkbox {
      margin-top: 0.5rem;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text);
    }

    .checkbox-help {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-left: 1.75rem;
      margin-top: 0.25rem;
    }

    .error-message {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid var(--red);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      color: var(--red);
      font-size: 0.875rem;
    }

    .footer-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `;ge([d({type:Boolean})],le.prototype,"open",2);ge([d({type:Array,attribute:!1})],le.prototype,"epics",2);ge([v()],le.prototype,"loading",2);ge([v()],le.prototype,"error",2);ge([v()],le.prototype,"tickTitle",2);ge([v()],le.prototype,"tickDescription",2);ge([v()],le.prototype,"type",2);ge([v()],le.prototype,"priority",2);ge([v()],le.prototype,"parent",2);ge([v()],le.prototype,"labels",2);ge([v()],le.prototype,"manual",2);ge([$('sl-input[name="title"]')],le.prototype,"titleInput",2);le=ge([pe("tick-create-dialog")],le);var Yl=Object.defineProperty,Jl=Object.getOwnPropertyDescriptor,cr=(e,t,i,s)=>{for(var o=s>1?void 0:s?Jl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Yl(t,i,o),o};const Ql=5e3;let ec=0;function tc(){return`toast-${++ec}-${Date.now()}`}let wi=class extends J{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:tc(),message:e.message,variant:e.variant??"primary",duration:e.duration??Ql};if(this.toasts=[...this.toasts,t],t.duration>0){const i=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,i)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(i=>i.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return h`
      ${this.toasts.map(e=>h`
        <div class="toast-container ${this.exitingToasts.has(e.id)?"exiting":""}">
          <sl-alert
            variant=${e.variant}
            open
            closable
            @sl-after-hide=${()=>this.handleCloseRequest(e.id)}
          >
            <sl-icon slot="icon" name=${this.getIconForVariant(e.variant)}></sl-icon>
            ${e.message}
          </sl-alert>
        </div>
      `)}
    `}};wi.styles=C`
    :host {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.5rem;
      pointer-events: none;
      max-width: calc(100vw - 2rem);
    }

    .toast-container {
      pointer-events: auto;
      animation: toast-enter 0.3s ease-out forwards;
    }

    .toast-container.exiting {
      animation: toast-exit 0.3s ease-in forwards;
    }

    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-exit {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    sl-alert {
      min-width: 280px;
      max-width: 400px;
    }

    sl-alert::part(base) {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    sl-alert::part(message) {
      color: var(--text);
      font-size: 0.875rem;
    }

    /* Variant-specific styling */
    sl-alert[variant="success"]::part(base) {
      border-left: 4px solid var(--green);
    }

    sl-alert[variant="warning"]::part(base) {
      border-left: 4px solid var(--yellow);
    }

    sl-alert[variant="danger"]::part(base) {
      border-left: 4px solid var(--red);
    }

    sl-alert[variant="primary"]::part(base) {
      border-left: 4px solid var(--blue);
    }

    /* Icon colors by variant */
    sl-alert[variant="success"]::part(icon) {
      color: var(--green);
    }

    sl-alert[variant="warning"]::part(icon) {
      color: var(--yellow);
    }

    sl-alert[variant="danger"]::part(icon) {
      color: var(--red);
    }

    sl-alert[variant="primary"]::part(icon) {
      color: var(--blue);
    }

    /* Close button styling for visibility in dark theme */
    sl-alert::part(close-button) {
      color: var(--subtext0);
    }

    sl-alert::part(close-button):hover {
      color: var(--text);
    }

    /* Countdown animation for auto-dismiss */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: var(--overlay1);
      border-radius: 0 0 0 4px;
    }

    @media (max-width: 480px) {
      :host {
        bottom: 0.5rem;
        right: 0.5rem;
        left: 0.5rem;
        max-width: none;
      }

      sl-alert {
        min-width: unset;
        max-width: none;
        width: 100%;
      }
    }
  `;cr([v()],wi.prototype,"toasts",2);wi=cr([pe("tick-toast-stack")],wi);var ic=Object.defineProperty,sc=Object.getOwnPropertyDescriptor,Rt=(e,t,i,s)=>{for(var o=s>1?void 0:s?sc(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&ic(t,i,o),o};let st=class extends J{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){try{this.activities=await Cl(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,i=e.actor,s=e.data||{};switch(t){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return s.reason?`${i} closed: ${s.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${s.to||"someone"}`;case"awaiting":return`Waiting for ${s.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),s=new Date().getTime()-t.getTime(),o=Math.floor(s/1e3),r=Math.floor(o/60),a=Math.floor(r/60),n=Math.floor(a/24);return o<60?"just now":r<60?`${r}m ago`:a<24?`${a}h ago`:n<7?`${n}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return h`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?h`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:g}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?h`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:g}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading?h`<div class="loading-state">Loading...</div>`:this.activities.length===0?h`<div class="empty-state">No recent activity</div>`:this.activities.map(e=>h`
                    <sl-menu-item @click=${()=>this.handleActivityClick(e)}>
                      <div class="activity-item ${this.isUnread(e)?"unread":""}">
                        <div class="activity-icon ${e.action}">
                          ${this.getActionIcon(e.action)}
                        </div>
                        <div class="activity-content">
                          <div class="activity-title">
                            <span class="tick-id">${e.tick}</span>
                          </div>
                          <div class="activity-description">
                            ${this.getActionDescription(e)}
                          </div>
                          <div class="activity-time">
                            ${this.formatRelativeTime(e.ts)}
                          </div>
                        </div>
                      </div>
                    </sl-menu-item>
                  `)}
        </sl-menu>
      </sl-dropdown>
    `}};st.styles=C`
    :host {
      display: inline-block;
    }

    /* Constrain the dropdown panel width - full width on mobile */
    sl-dropdown::part(panel) {
      width: 360px;
      max-width: calc(100vw - 1rem);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid var(--surface1);
      background: var(--mantle);
    }

    @media (max-width: 480px) {
      sl-dropdown::part(panel) {
        width: calc(100vw - 1rem);
        max-width: none;
        left: 0.5rem !important;
        right: 0.5rem;
      }
    }

    .trigger-button {
      position: relative;
    }

    .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      background: var(--red);
      color: var(--base);
      font-size: 0.625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    sl-menu {
      width: 100%;
      max-height: 400px;
      overflow-y: auto;
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
      font-weight: 600;
      color: var(--text);
    }

    .menu-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .menu-header sl-button::part(base) {
      font-size: 0.75rem;
    }

    .close-button::part(base) {
      padding: 0.25rem;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .loading-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .activity-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid var(--surface0);
    }

    .activity-item:hover {
      background: var(--surface0);
    }

    .activity-item.unread {
      background: color-mix(in srgb, var(--blue) 10%, transparent);
    }

    .activity-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }

    .activity-icon.create { background: var(--green); color: var(--base); }
    .activity-icon.update { background: var(--blue); color: var(--base); }
    .activity-icon.close { background: var(--overlay1); color: var(--text); }
    .activity-icon.reopen { background: var(--yellow); color: var(--base); }
    .activity-icon.note { background: var(--lavender); color: var(--base); }
    .activity-icon.approve { background: var(--green); color: var(--base); }
    .activity-icon.reject { background: var(--red); color: var(--base); }
    .activity-icon.assign { background: var(--mauve); color: var(--base); }
    .activity-icon.awaiting { background: var(--yellow); color: var(--base); }
    .activity-icon.block { background: var(--red); color: var(--base); }
    .activity-icon.unblock { background: var(--green); color: var(--base); }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      font-size: 0.875rem;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-title .tick-id {
      color: var(--blue);
      font-family: monospace;
      font-weight: 500;
    }

    .activity-description {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-top: 0.125rem;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay1);
      margin-top: 0.25rem;
    }

    sl-menu-item::part(base) {
      padding: 0;
    }

    sl-menu-item::part(checked-icon),
    sl-menu-item::part(prefix),
    sl-menu-item::part(suffix) {
      display: none;
    }

    sl-menu-item::part(label) {
      width: 100%;
    }
  `;Rt([$("sl-dropdown")],st.prototype,"dropdown",2);Rt([v()],st.prototype,"activities",2);Rt([v()],st.prototype,"loading",2);Rt([v()],st.prototype,"unreadCount",2);Rt([v()],st.prototype,"lastSeenTimestamp",2);st=Rt([pe("tick-activity-feed")],st);var oc=Object.defineProperty,rc=Object.getOwnPropertyDescriptor,Re=(e,t,i,s)=>{for(var o=s>1?void 0:s?rc(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&oc(t,i,o),o};const xo="run-output-pane-active-tab",_o={30:"ansi-black",31:"ansi-red",32:"ansi-green",33:"ansi-yellow",34:"ansi-blue",35:"ansi-magenta",36:"ansi-cyan",37:"ansi-white",90:"ansi-bright-black",91:"ansi-bright-red",92:"ansi-bright-green",93:"ansi-bright-yellow",94:"ansi-bright-blue",95:"ansi-bright-magenta",96:"ansi-bright-cyan",97:"ansi-bright-white",40:"ansi-bg-black",41:"ansi-bg-red",42:"ansi-bg-green",43:"ansi-bg-yellow",44:"ansi-bg-blue",45:"ansi-bg-magenta",46:"ansi-bg-cyan",47:"ansi-bg-white"},$o={1:"ansi-bold",2:"ansi-dim",3:"ansi-italic",4:"ansi-underline"};let he=class extends J{constructor(){super(...arguments),this.epicId="",this.autoScroll=!0,this.lines=[],this.connectionStatus="disconnected",this.activeTaskId=null,this.activeTool=null,this.lastOutput="",this.activeTab="output",this.eventSource=null,this.reconnectTimeout=null,this.reconnectDelay=1e3,this.maxReconnectDelay=3e4,this.userScrolled=!1}connectedCallback(){super.connectedCallback();const e=localStorage.getItem(xo);(e==="output"||e==="context")&&(this.activeTab=e),this.epicId&&this.connect()}disconnectedCallback(){super.disconnectedCallback(),this.disconnect()}updated(e){e.has("epicId")&&(this.disconnect(),this.epicId&&this.connect())}connect(){this.eventSource&&this.eventSource.close(),this.connectionStatus="connecting",this.eventSource=new EventSource(`/api/run-stream/${this.epicId}`),this.eventSource.addEventListener("connected",e=>{this.connectionStatus="connected",this.reconnectDelay=1e3;try{const t=JSON.parse(e.data);this.addStatusLine(`Connected to run stream for epic ${t.epicId}`)}catch{this.addStatusLine("Connected to run stream")}}),this.eventSource.addEventListener("task-started",e=>{try{const t=JSON.parse(e.data);this.activeTaskId=t.taskId||null,this.lastOutput="",this.addStatusLine(`Task ${t.taskId} started (iteration ${t.iteration??1})`)}catch(t){console.error("[RunOutputPane] Failed to parse task-started:",t)}}),this.eventSource.addEventListener("task-update",e=>{var t;try{const i=JSON.parse(e.data);if(i.taskId&&i.taskId!==this.activeTaskId&&(this.activeTaskId=i.taskId),this.activeTool=((t=i.activeTool)==null?void 0:t.name)||null,i.output&&i.output!==this.lastOutput){const s=i.output.slice(this.lastOutput.length);s&&this.addOutputLines(s),this.lastOutput=i.output}}catch(i){console.error("[RunOutputPane] Failed to parse task-update:",i)}}),this.eventSource.addEventListener("tool-activity",e=>{try{const t=JSON.parse(e.data),i=t.tool||t.activeTool;i&&(this.activeTool=i.name,this.addToolLine(`⚙ ${i.name}`))}catch(t){console.error("[RunOutputPane] Failed to parse tool-activity:",t)}}),this.eventSource.addEventListener("task-completed",e=>{try{const t=JSON.parse(e.data),i=t.success?"✓ completed":"✗ failed";this.addStatusLine(`Task ${t.taskId} ${i}`),this.activeTaskId===t.taskId&&(this.activeTaskId=null,this.activeTool=null,this.lastOutput="")}catch(t){console.error("[RunOutputPane] Failed to parse task-completed:",t)}}),this.eventSource.addEventListener("context-generating",e=>{try{const i=JSON.parse(e.data).taskCount??0;this.addStatusLine(`📚 Generating epic context (${i} tasks)...`)}catch(t){console.error("[RunOutputPane] Failed to parse context-generating:",t)}}),this.eventSource.addEventListener("context-generated",e=>{try{const i=JSON.parse(e.data).tokenCount??0;this.addStatusLine(`✓ Context generated (~${i} tokens)`)}catch(t){console.error("[RunOutputPane] Failed to parse context-generated:",t)}}),this.eventSource.addEventListener("context-loaded",e=>{try{const i=JSON.parse(e.data).tokenCount??0;this.addStatusLine(`📖 Using existing context (~${i} tokens)`)}catch(t){console.error("[RunOutputPane] Failed to parse context-loaded:",t)}}),this.eventSource.addEventListener("context-failed",e=>{try{const t=JSON.parse(e.data);this.addStatusLine(`⚠ Context generation failed: ${t.message??"unknown error"}`)}catch(t){console.error("[RunOutputPane] Failed to parse context-failed:",t)}}),this.eventSource.addEventListener("context-skipped",e=>{try{const t=JSON.parse(e.data);this.addStatusLine(`⏭ Context skipped: ${t.message??"single-task epic"}`)}catch(t){console.error("[RunOutputPane] Failed to parse context-skipped:",t)}}),this.eventSource.addEventListener("epic-completed",e=>{try{const t=JSON.parse(e.data);this.addStatusLine(`Epic completed: ${t.success?"success":"failed"}`),this.activeTaskId=null,this.activeTool=null}catch(t){console.error("[RunOutputPane] Failed to parse epic-completed:",t)}}),this.eventSource.onerror=()=>{var e;this.connectionStatus="disconnected",(e=this.eventSource)==null||e.close(),this.eventSource=null,this.scheduleReconnect()}}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.eventSource&&(this.eventSource.close(),this.eventSource=null),this.connectionStatus="disconnected"}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{this.epicId&&this.connect()},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,this.maxReconnectDelay)}addStatusLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"status"}],this.scrollToBottom()}addToolLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"tool"}],this.scrollToBottom()}addOutputLines(e){const t=new Date,i=e.split(`
`).filter(s=>s.length>0).map(s=>({timestamp:t,content:s,type:"output"}));i.length>0&&(this.lines=[...this.lines,...i],this.scrollToBottom())}scrollToBottom(){!this.autoScroll||this.userScrolled||requestAnimationFrame(()=>{this.outputContainer&&(this.outputContainer.scrollTop=this.outputContainer.scrollHeight)})}handleScroll(){if(!this.outputContainer)return;const{scrollTop:e,scrollHeight:t,clientHeight:i}=this.outputContainer,s=t-e-i<20;this.userScrolled=!s}toggleAutoScroll(){this.autoScroll=!this.autoScroll,this.autoScroll&&(this.userScrolled=!1,this.scrollToBottom())}handleTabShow(e){const t=e.detail.name;this.activeTab=t,localStorage.setItem(xo,t)}clearOutput(){this.lines=[],this.lastOutput="",this.userScrolled=!1}async copyOutput(){const e=this.lines.map(t=>`[${this.formatTimestamp(t.timestamp)}] ${t.content}`).join(`
`);try{await navigator.clipboard.writeText(e),window.showToast&&window.showToast({message:"Output copied to clipboard",variant:"success"})}catch(t){console.error("Failed to copy output:",t)}}formatTimestamp(e){return e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}ansiToHtml(e){let t=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const i=[],s=/\x1b\[([0-9;]*)m/g;return t=t.replace(s,(o,r)=>{let a=i.length>0?"</span>":"";i.length=0;const n=r?r.split(";").map(Number):[0];for(const c of n)c===0?i.length=0:_o[c]?i.push(_o[c]):$o[c]&&i.push($o[c]);return i.length>0&&(a+=`<span class="${i.join(" ")}">`),a}),i.length>0&&(t+="</span>"),t}getStatusText(){switch(this.connectionStatus){case"connected":return"Connected";case"connecting":return"Connecting...";case"disconnected":return"Disconnected"}}renderOutputContent(){return h`
      <div
        class="output-container"
        @scroll=${this.handleScroll}
      >
        ${this.lines.length===0?h`
              <div class="empty-state">
                <sl-icon name="terminal"></sl-icon>
                <p>No output yet. Connect to an epic to see agent output.</p>
              </div>
            `:this.lines.map(e=>h`
              <div class="output-line">
                <span class="line-timestamp">${this.formatTimestamp(e.timestamp)}</span>
                <span class="line-content ${e.type}">
                  ${e.type==="output"?Es(this.ansiToHtml(e.content)):e.content}
                </span>
              </div>
            `)}
      </div>
    `}render(){return h`
      <div class="output-pane">
        <div class="pane-header">
          <div class="header-left">
            <div class="connection-status">
              <span class="status-indicator ${this.connectionStatus}"></span>
              <span>${this.getStatusText()}</span>
            </div>
          </div>
          <div class="header-actions">
            ${this.activeTab==="output"?h`
              <div
                class="auto-scroll-toggle ${this.autoScroll?"active":""}"
                @click=${this.toggleAutoScroll}
                title="Auto-scroll to bottom"
              >
                <sl-icon name="arrow-down-circle${this.autoScroll?"-fill":""}"></sl-icon>
                Auto
              </div>
              <sl-icon-button
                name="clipboard"
                label="Copy output"
                @click=${this.copyOutput}
              ></sl-icon-button>
              <sl-icon-button
                name="trash"
                label="Clear output"
                @click=${this.clearOutput}
              ></sl-icon-button>
            `:g}
          </div>
        </div>

        <div class="tab-container">
          <sl-tab-group @sl-tab-show=${this.handleTabShow}>
            <sl-tab slot="nav" panel="output" ?active=${this.activeTab==="output"}>Output</sl-tab>
            <sl-tab slot="nav" panel="context" ?active=${this.activeTab==="context"}>Context</sl-tab>

            <sl-tab-panel name="output">
              ${this.renderOutputContent()}
            </sl-tab-panel>

            <sl-tab-panel name="context">
              <context-pane .epicId=${this.epicId}></context-pane>
            </sl-tab-panel>
          </sl-tab-group>
        </div>

        ${this.activeTab==="output"&&(this.activeTaskId||this.activeTool)?h`
              <div class="pane-footer">
                <div class="active-task">
                  ${this.activeTaskId?h`
                        <span class="active-task-label">Task:</span>
                        <span class="active-task-id">${this.activeTaskId}</span>
                      `:g}
                  ${this.activeTool?h`
                        <span class="active-tool">
                          <sl-icon name="gear"></sl-icon>
                          ${this.activeTool}
                        </span>
                      `:g}
                </div>
                <span class="line-count">${this.lines.length} lines</span>
              </div>
            `:g}
      </div>
    `}};he.styles=C`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .output-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--crust, #11111b);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header */
    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--overlay0, #6c7086);
    }

    .status-indicator.connected {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
    }

    .status-indicator.connecting {
      background: var(--yellow, #f9e2af);
      animation: pulse 1s ease-in-out infinite;
    }

    .status-indicator.disconnected {
      background: var(--red, #f38ba8);
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .header-actions sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
      font-size: 1rem;
    }

    .header-actions sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .auto-scroll-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .auto-scroll-toggle:hover {
      background: var(--surface0, #313244);
    }

    .auto-scroll-toggle.active {
      color: var(--blue, #89b4fa);
    }

    /* Output content */
    .output-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      padding: 0.5rem;
    }

    .output-container::-webkit-scrollbar {
      width: 8px;
    }

    .output-container::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .output-container::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 4px;
    }

    .output-container::-webkit-scrollbar-thumb:hover {
      background: var(--surface2, #585b70);
    }

    .output-line {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.125rem 0;
    }

    .line-timestamp {
      flex-shrink: 0;
      min-width: 5.5rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      font-variant-numeric: tabular-nums;
      user-select: none;
    }

    .line-content {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text, #cdd6f4);
      text-align: left;
      min-width: 0;
    }

    .line-content.status {
      color: var(--blue, #89b4fa);
      font-style: italic;
    }

    .line-content.tool {
      color: var(--mauve, #cba6f7);
    }

    .line-content.error {
      color: var(--red, #f38ba8);
    }

    /* ANSI color classes - Catppuccin Mocha palette */
    .ansi-black { color: var(--surface1, #45475a); }
    .ansi-red { color: var(--red, #f38ba8); }
    .ansi-green { color: var(--green, #a6e3a1); }
    .ansi-yellow { color: var(--yellow, #f9e2af); }
    .ansi-blue { color: var(--blue, #89b4fa); }
    .ansi-magenta { color: var(--pink, #f5c2e7); }
    .ansi-cyan { color: var(--teal, #94e2d5); }
    .ansi-white { color: var(--text, #cdd6f4); }

    .ansi-bright-black { color: var(--overlay0, #6c7086); }
    .ansi-bright-red { color: var(--maroon, #eba0ac); }
    .ansi-bright-green { color: var(--green, #a6e3a1); }
    .ansi-bright-yellow { color: var(--yellow, #f9e2af); }
    .ansi-bright-blue { color: var(--sapphire, #74c7ec); }
    .ansi-bright-magenta { color: var(--mauve, #cba6f7); }
    .ansi-bright-cyan { color: var(--sky, #89dceb); }
    .ansi-bright-white { color: var(--text, #cdd6f4); }

    .ansi-bg-black { background: var(--surface1, #45475a); }
    .ansi-bg-red { background: var(--red, #f38ba8); }
    .ansi-bg-green { background: var(--green, #a6e3a1); }
    .ansi-bg-yellow { background: var(--yellow, #f9e2af); }
    .ansi-bg-blue { background: var(--blue, #89b4fa); }
    .ansi-bg-magenta { background: var(--pink, #f5c2e7); }
    .ansi-bg-cyan { background: var(--teal, #94e2d5); }
    .ansi-bg-white { background: var(--text, #cdd6f4); }

    .ansi-bold { font-weight: 700; }
    .ansi-dim { opacity: 0.7; }
    .ansi-italic { font-style: italic; }
    .ansi-underline { text-decoration: underline; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      text-align: center;
    }

    .empty-state sl-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Collapsed view */
    :host([collapsed]) {
      flex: none;
    }

    :host([collapsed]) .output-pane {
      flex: none;
    }

    :host([collapsed]) .output-container {
      max-height: 120px;
    }

    /* Footer with active task info */
    .pane-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: var(--mantle, #181825);
      border-top: 1px solid var(--surface0, #313244);
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .active-task {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-task-label {
      color: var(--subtext1, #bac2de);
    }

    .active-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .active-tool {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem 0.375rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      color: var(--mauve, #cba6f7);
    }

    .line-count {
      font-variant-numeric: tabular-nums;
    }

    /* Tab container and styling */
    .tab-container {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    sl-tab-group {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.5rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    sl-tab::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    sl-tab[active]::part(base) {
      color: var(--blue, #89b4fa);
    }

    sl-tab-panel {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    sl-tab-panel::part(base) {
      height: 100%;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
  `;Re([d({type:String,attribute:"epic-id"})],he.prototype,"epicId",2);Re([d({type:Boolean,attribute:"auto-scroll"})],he.prototype,"autoScroll",2);Re([v()],he.prototype,"lines",2);Re([v()],he.prototype,"connectionStatus",2);Re([v()],he.prototype,"activeTaskId",2);Re([v()],he.prototype,"activeTool",2);Re([v()],he.prototype,"lastOutput",2);Re([v()],he.prototype,"activeTab",2);Re([$(".output-container")],he.prototype,"outputContainer",2);Re([$("context-pane")],he.prototype,"contextPane",2);he=Re([pe("run-output-pane")],he);var ac=Object.defineProperty,nc=Object.getOwnPropertyDescriptor,Mi=(e,t,i,s)=>{for(var o=s>1?void 0:s?nc(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&ac(t,i,o),o};const lc={Read:"file-earmark-text",Write:"file-earmark-plus",Edit:"pencil-square",Bash:"terminal",Glob:"search",Grep:"file-earmark-code",Task:"list-task",WebFetch:"globe",WebSearch:"search",TodoWrite:"check2-square",AskUserQuestion:"chat-left-dots",NotebookEdit:"journal-code",KillShell:"x-circle",TaskOutput:"box-arrow-right",Skill:"lightning",EnterPlanMode:"map",ExitPlanMode:"check2-circle"},cc={Read:"var(--blue, #89b4fa)",Write:"var(--green, #a6e3a1)",Edit:"var(--yellow, #f9e2af)",Bash:"var(--peach, #fab387)",Glob:"var(--teal, #94e2d5)",Grep:"var(--sapphire, #74c7ec)",Task:"var(--mauve, #cba6f7)",WebFetch:"var(--sky, #89dceb)",WebSearch:"var(--sky, #89dceb)",TodoWrite:"var(--lavender, #b4befe)",AskUserQuestion:"var(--pink, #f5c2e7)",NotebookEdit:"var(--flamingo, #f2cdcd)",KillShell:"var(--red, #f38ba8)",TaskOutput:"var(--rosewater, #f5e0dc)",Skill:"var(--maroon, #eba0ac)",EnterPlanMode:"var(--lavender, #b4befe)",ExitPlanMode:"var(--green, #a6e3a1)"};let Ct=class extends J{constructor(){super(...arguments),this.activity=null,this.expanded=!1,this.elapsedMs=0,this.timerInterval=null}connectedCallback(){super.connectedCallback(),this.startTimer()}disconnectedCallback(){super.disconnectedCallback(),this.stopTimer()}updated(e){e.has("activity")&&this.updateTimer()}startTimer(){this.timerInterval||(this.timerInterval=setInterval(()=>{if(this.activity&&!this.activity.isComplete&&this.activity.startedAt){const e=this.activity.startedAt instanceof Date?this.activity.startedAt.getTime():new Date(this.activity.startedAt).getTime();this.elapsedMs=Date.now()-e}},100))}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}updateTimer(){var e;(e=this.activity)!=null&&e.isComplete?(this.stopTimer(),this.activity.durationMs!==void 0&&(this.elapsedMs=this.activity.durationMs)):this.activity&&!this.timerInterval&&this.startTimer()}getToolIcon(e){return lc[e]??"gear"}getToolColor(e){return cc[e]??"var(--mauve, #cba6f7)"}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3),i=e%1e3;if(t<60)return`${t}.${Math.floor(i/100)}s`;const s=Math.floor(t/60),o=t%60;return`${s}m ${o}s`}truncateInput(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}getStatusClass(){return this.activity?this.activity.isError?"error":this.activity.isComplete?"complete":"running":""}renderCompact(){const{activity:e}=this;if(!e)return h`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),i=this.getStatusClass(),s=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return h`
      <div class="tool-compact ${i}" style="--tool-color: ${t}">
        <span class="tool-icon">
          <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
        </span>
        <span class="tool-name">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateInput(e.input)}</span>`:g}
        ${s>0?h`<span class="tool-duration">${this.formatDuration(s)}</span>`:g}
        ${e.isComplete?h`
              <span class="tool-status-icon ${e.isError?"error":"success"}">
                <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
              </span>
            `:h`
              <span class="tool-spinner">
                <sl-spinner></sl-spinner>
              </span>
            `}
      </div>
    `}renderExpanded(){const{activity:e}=this;if(!e)return h`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),i=this.getStatusClass(),s=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return h`
      <div class="tool-expanded ${i}" style="--tool-color: ${t}">
        <div class="tool-header">
          <span class="tool-icon">
            <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
          </span>
          <span class="tool-name">${e.name}</span>
          ${e.isComplete?h`
                <span class="tool-status-icon ${e.isError?"error":"success"}">
                  <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
                </span>
              `:h`
                <span class="tool-spinner">
                  <sl-spinner></sl-spinner>
                </span>
              `}
          ${s>0?h`<span class="tool-duration">${this.formatDuration(s)}</span>`:g}
        </div>
        <div class="tool-body">
          ${e.input?h`
                <div class="tool-section">
                  <div class="tool-section-label">Input</div>
                  <div class="tool-section-content">${e.input}</div>
                </div>
              `:g}
          ${e.output?h`
                <div class="tool-section">
                  <div class="tool-section-label">Output</div>
                  <div class="tool-section-content ${e.isError?"error-content":""}">${e.output}</div>
                </div>
              `:g}
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};Ct.styles=C`
    :host {
      display: block;
    }

    /* Compact inline view */
    .tool-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      max-width: 100%;
      overflow: hidden;
    }

    .tool-compact.running {
      border: 1px solid var(--surface1, #45475a);
    }

    .tool-compact.complete {
      background: rgba(166, 227, 161, 0.15);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .tool-compact.error {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .tool-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .tool-icon sl-icon {
      font-size: 0.875rem;
    }

    .tool-name {
      font-weight: 500;
      color: var(--tool-color, var(--mauve, #cba6f7));
      flex-shrink: 0;
    }

    .tool-input-preview {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--subtext0, #a6adc8);
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      flex-shrink: 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
    }

    .tool-spinner {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
    }

    .tool-spinner sl-spinner {
      font-size: 12px;
      --track-width: 2px;
      --indicator-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-status-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .tool-status-icon.success sl-icon {
      color: var(--green, #a6e3a1);
    }

    .tool-status-icon.error sl-icon {
      color: var(--red, #f38ba8);
    }

    /* Expanded view */
    .tool-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .tool-expanded.running {
      border-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-expanded.complete {
      border-color: var(--green, #a6e3a1);
    }

    .tool-expanded.error {
      border-color: var(--red, #f38ba8);
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .tool-header .tool-name {
      font-size: 0.875rem;
    }

    .tool-header .tool-duration {
      margin-left: auto;
      font-size: 0.75rem;
    }

    .tool-body {
      padding: 0.75rem;
    }

    .tool-section {
      margin-bottom: 0.75rem;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.375rem;
    }

    .tool-section-content {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text, #cdd6f4);
      background: var(--crust, #11111b);
      padding: 0.5rem;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }

    .tool-section-content::-webkit-scrollbar {
      width: 6px;
    }

    .tool-section-content::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .tool-section-content::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 3px;
    }

    .tool-section-content.error-content {
      color: var(--red, #f38ba8);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .empty-state sl-icon {
      font-size: 1rem;
      opacity: 0.5;
    }
  `;Mi([d({attribute:!1})],Ct.prototype,"activity",2);Mi([d({type:Boolean})],Ct.prototype,"expanded",2);Mi([v()],Ct.prototype,"elapsedMs",2);Ct=Mi([pe("tool-activity")],Ct);var dc=Object.defineProperty,uc=Object.getOwnPropertyDescriptor,ii=(e,t,i,s)=>{for(var o=s>1?void 0:s?uc(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&dc(t,i,o),o};let mt=class extends J{constructor(){super(...arguments),this.metrics=null,this.model="",this.live=!1,this.expanded=!1}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}getTotalTokens(){return this.metrics?this.metrics.inputTokens+this.metrics.outputTokens+this.metrics.cacheReadTokens+this.metrics.cacheCreationTokens:0}getTokenPercentage(e){const t=this.getTotalTokens();return t===0?0:e/t*100}renderCompact(){if(!this.metrics)return h`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics</span>
        </div>
      `;const e=this.getTotalTokens();return h`
      <div class="metrics-compact ${this.live?"live":""}">
        <span class="metric-item">
          <sl-icon name="cpu"></sl-icon>
          <span class="metric-value">${this.formatTokenCount(e)}</span>
          <span>tokens</span>
        </span>
        <span class="metric-separator">•</span>
        <span class="metric-item">
          <span class="metric-value cost-value">${this.formatCost(this.metrics.costUsd)}</span>
        </span>
        ${this.model?h`
              <span class="metric-separator">•</span>
              <span class="model-badge">${this.model}</span>
            `:g}
      </div>
    `}renderExpanded(){if(!this.metrics)return h`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics available</span>
        </div>
      `;const{inputTokens:e,outputTokens:t,cacheReadTokens:i,cacheCreationTokens:s,costUsd:o,durationMs:r}=this.metrics,a=this.getTotalTokens();return h`
      <div class="metrics-expanded ${this.live?"live":""}">
        <div class="metrics-header">
          <div class="metrics-title">
            <sl-icon name="bar-chart"></sl-icon>
            <span>Token Usage</span>
          </div>
          ${this.live?h`
                <div class="live-indicator">
                  <span class="pulse"></span>
                  <span>Live</span>
                </div>
              `:g}
        </div>
        <div class="metrics-body">
          <!-- Token distribution bar -->
          <div class="token-bar-container">
            <div class="token-bar-label">
              <span>Token Distribution</span>
              <span>${this.formatTokenCount(a)} total</span>
            </div>
            <div class="token-bar">
              <div
                class="token-bar-segment input"
                style="width: ${this.getTokenPercentage(e)}%"
                title="Input: ${this.formatTokenCount(e)}"
              ></div>
              <div
                class="token-bar-segment output"
                style="width: ${this.getTokenPercentage(t)}%"
                title="Output: ${this.formatTokenCount(t)}"
              ></div>
              <div
                class="token-bar-segment cache-read"
                style="width: ${this.getTokenPercentage(i)}%"
                title="Cache Read: ${this.formatTokenCount(i)}"
              ></div>
              <div
                class="token-bar-segment cache-creation"
                style="width: ${this.getTokenPercentage(s)}%"
                title="Cache Creation: ${this.formatTokenCount(s)}"
              ></div>
            </div>
          </div>

          <!-- Token breakdown grid -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot input"></span>
                Input
              </div>
              <div class="metric-card-value">${this.formatTokenCount(e)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot output"></span>
                Output
              </div>
              <div class="metric-card-value">${this.formatTokenCount(t)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-read"></span>
                Cache Read
              </div>
              <div class="metric-card-value">${this.formatTokenCount(i)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-creation"></span>
                Cache Create
              </div>
              <div class="metric-card-value">${this.formatTokenCount(s)}</div>
            </div>
          </div>

          <!-- Summary row -->
          <div class="metrics-summary">
            <div class="summary-item">
              <div class="summary-label">Cost</div>
              <div class="summary-value cost">${this.formatCost(o)}</div>
            </div>
            ${r!==void 0?h`
                  <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value duration">${this.formatDuration(r)}</div>
                  </div>
                `:g}
            ${this.model?h`
                  <div class="summary-item">
                    <div class="summary-label">Model</div>
                    <div class="summary-value model">${this.model}</div>
                  </div>
                `:g}
          </div>
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};mt.styles=C`
    :host {
      display: block;
    }

    /* Compact view */
    .metrics-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .metrics-compact.live {
      border: 1px solid var(--blue, #89b4fa);
      background: rgba(137, 180, 250, 0.1);
    }

    .metric-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .metric-item sl-icon {
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .metric-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
    }

    .metric-separator {
      color: var(--overlay0, #6c7086);
    }

    .cost-value {
      color: var(--green, #a6e3a1);
      font-weight: 500;
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1, #45475a);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    /* Expanded view */
    .metrics-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .metrics-expanded.live {
      border-color: var(--blue, #89b4fa);
    }

    .metrics-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .metrics-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .metrics-title sl-icon {
      font-size: 1rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: rgba(137, 180, 250, 0.2);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator .pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--blue, #89b4fa);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .metrics-body {
      padding: 0.75rem;
    }

    /* Token bar visualization */
    .token-bar-container {
      margin-bottom: 0.75rem;
    }

    .token-bar-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    .token-bar {
      height: 8px;
      background: var(--crust, #11111b);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }

    .token-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .token-bar-segment.input {
      background: var(--blue, #89b4fa);
    }

    .token-bar-segment.output {
      background: var(--green, #a6e3a1);
    }

    .token-bar-segment.cache-read {
      background: var(--teal, #94e2d5);
    }

    .token-bar-segment.cache-creation {
      background: var(--mauve, #cba6f7);
    }

    /* Metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .metric-card {
      padding: 0.5rem;
      background: var(--mantle, #181825);
      border-radius: 4px;
    }

    .metric-card-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .metric-card-label .dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }

    .metric-card-label .dot.input { background: var(--blue, #89b4fa); }
    .metric-card-label .dot.output { background: var(--green, #a6e3a1); }
    .metric-card-label .dot.cache-read { background: var(--teal, #94e2d5); }
    .metric-card-label .dot.cache-creation { background: var(--mauve, #cba6f7); }

    .metric-card-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
    }

    /* Summary row */
    .metrics-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.125rem;
    }

    .summary-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.9375rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .summary-value.cost {
      color: var(--green, #a6e3a1);
    }

    .summary-value.model {
      color: var(--mauve, #cba6f7);
      font-size: 0.75rem;
    }

    .summary-value.duration {
      color: var(--yellow, #f9e2af);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .empty-state sl-icon {
      font-size: 1rem;
      opacity: 0.5;
    }
  `;ii([d({attribute:!1})],mt.prototype,"metrics",2);ii([d({type:String})],mt.prototype,"model",2);ii([d({type:Boolean})],mt.prototype,"live",2);ii([d({type:Boolean})],mt.prototype,"expanded",2);mt=ii([pe("run-metrics")],mt);function Is(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var gt=Is();function dr(e){gt=e}var Kt={exec:()=>null};function z(e,t=""){let i=typeof e=="string"?e:e.source,s={replace:(o,r)=>{let a=typeof r=="string"?r:r.source;return a=a.replace(ne.caret,"$1"),i=i.replace(o,a),s},getRegex:()=>new RegExp(i,t)};return s}var hc=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),ne={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,"i")},pc=/^(?:[ \t]*(?:\n|$))+/,mc=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,fc=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,si=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,bc=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,Os=/(?:[*+-]|\d{1,9}[.)])/,ur=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,hr=z(ur).replace(/bull/g,Os).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),gc=z(ur).replace(/bull/g,Os).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),Ps=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,vc=/^[^\n]+/,Ls=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,yc=z(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Ls).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),wc=z(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,Os).getRegex(),Bi="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Ds=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,kc=z("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Ds).replace("tag",Bi).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),pr=z(Ps).replace("hr",si).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Bi).getRegex(),xc=z(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",pr).getRegex(),Ms={blockquote:xc,code:mc,def:yc,fences:fc,heading:bc,hr:si,html:kc,lheading:hr,list:wc,newline:pc,paragraph:pr,table:Kt,text:vc},Co=z("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",si).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Bi).getRegex(),_c={...Ms,lheading:gc,table:Co,paragraph:z(Ps).replace("hr",si).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Co).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Bi).getRegex()},$c={...Ms,html:z(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Ds).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:Kt,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:z(Ps).replace("hr",si).replace("heading",` *#{1,6} *[^
]`).replace("lheading",hr).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Cc=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Sc=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,mr=/^( {2,}|\\)\n(?!\s*$)/,Tc=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,Ni=/[\p{P}\p{S}]/u,Bs=/[\s\p{P}\p{S}]/u,fr=/[^\s\p{P}\p{S}]/u,Ec=z(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Bs).getRegex(),br=/(?!~)[\p{P}\p{S}]/u,Ac=/(?!~)[\s\p{P}\p{S}]/u,zc=/(?:[^\s\p{P}\p{S}]|~)/u,Rc=z(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",hc?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),gr=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Ic=z(gr,"u").replace(/punct/g,Ni).getRegex(),Oc=z(gr,"u").replace(/punct/g,br).getRegex(),vr="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Pc=z(vr,"gu").replace(/notPunctSpace/g,fr).replace(/punctSpace/g,Bs).replace(/punct/g,Ni).getRegex(),Lc=z(vr,"gu").replace(/notPunctSpace/g,zc).replace(/punctSpace/g,Ac).replace(/punct/g,br).getRegex(),Dc=z("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,fr).replace(/punctSpace/g,Bs).replace(/punct/g,Ni).getRegex(),Mc=z(/\\(punct)/,"gu").replace(/punct/g,Ni).getRegex(),Bc=z(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Nc=z(Ds).replace("(?:-->|$)","-->").getRegex(),Fc=z("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Nc).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),ki=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Hc=z(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",ki).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),yr=z(/^!?\[(label)\]\[(ref)\]/).replace("label",ki).replace("ref",Ls).getRegex(),wr=z(/^!?\[(ref)\](?:\[\])?/).replace("ref",Ls).getRegex(),jc=z("reflink|nolink(?!\\()","g").replace("reflink",yr).replace("nolink",wr).getRegex(),So=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Ns={_backpedal:Kt,anyPunctuation:Mc,autolink:Bc,blockSkip:Rc,br:mr,code:Sc,del:Kt,emStrongLDelim:Ic,emStrongRDelimAst:Pc,emStrongRDelimUnd:Dc,escape:Cc,link:Hc,nolink:wr,punctuation:Ec,reflink:yr,reflinkSearch:jc,tag:Fc,text:Tc,url:Kt},Uc={...Ns,link:z(/^!?\[(label)\]\((.*?)\)/).replace("label",ki).getRegex(),reflink:z(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",ki).getRegex()},ds={...Ns,emStrongRDelimAst:Lc,emStrongLDelim:Oc,url:z(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",So).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:z(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",So).getRegex()},Vc={...ds,br:z(mr).replace("{2,}","*").getRegex(),text:z(ds.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},ni={normal:Ms,gfm:_c,pedantic:$c},Nt={normal:Ns,gfm:ds,breaks:Vc,pedantic:Uc},qc={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},To=e=>qc[e];function je(e,t){if(t){if(ne.escapeTest.test(e))return e.replace(ne.escapeReplace,To)}else if(ne.escapeTestNoEncode.test(e))return e.replace(ne.escapeReplaceNoEncode,To);return e}function Eo(e){try{e=encodeURI(e).replace(ne.percentDecode,"%")}catch{return null}return e}function Ao(e,t){var r;let i=e.replace(ne.findPipe,(a,n,c)=>{let u=!1,p=n;for(;--p>=0&&c[p]==="\\";)u=!u;return u?"|":" |"}),s=i.split(ne.splitPipe),o=0;if(s[0].trim()||s.shift(),s.length>0&&!((r=s.at(-1))!=null&&r.trim())&&s.pop(),t)if(s.length>t)s.splice(t);else for(;s.length<t;)s.push("");for(;o<s.length;o++)s[o]=s[o].trim().replace(ne.slashPipe,"|");return s}function Ft(e,t,i){let s=e.length;if(s===0)return"";let o=0;for(;o<s&&e.charAt(s-o-1)===t;)o++;return e.slice(0,s-o)}function Wc(e,t){if(e.indexOf(t[1])===-1)return-1;let i=0;for(let s=0;s<e.length;s++)if(e[s]==="\\")s++;else if(e[s]===t[0])i++;else if(e[s]===t[1]&&(i--,i<0))return s;return i>0?-2:-1}function zo(e,t,i,s,o){let r=t.href,a=t.title||null,n=e[1].replace(o.other.outputLinkReplace,"$1");s.state.inLink=!0;let c={type:e[0].charAt(0)==="!"?"image":"link",raw:i,href:r,title:a,text:n,tokens:s.inlineTokens(n)};return s.state.inLink=!1,c}function Kc(e,t,i){let s=e.match(i.other.indentCodeCompensation);if(s===null)return t;let o=s[1];return t.split(`
`).map(r=>{let a=r.match(i.other.beginningSpace);if(a===null)return r;let[n]=a;return n.length>=o.length?r.slice(o.length):r}).join(`
`)}var xi=class{constructor(e){M(this,"options");M(this,"rules");M(this,"lexer");this.options=e||gt}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let i=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?i:Ft(i,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let i=t[0],s=Kc(i,t[3]||"",this.rules);return{type:"code",raw:i,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:s}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let i=t[2].trim();if(this.rules.other.endingHash.test(i)){let s=Ft(i,"#");(this.options.pedantic||!s||this.rules.other.endingSpaceChar.test(s))&&(i=s.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:i,tokens:this.lexer.inline(i)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:Ft(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let i=Ft(t[0],`
`).split(`
`),s="",o="",r=[];for(;i.length>0;){let a=!1,n=[],c;for(c=0;c<i.length;c++)if(this.rules.other.blockquoteStart.test(i[c]))n.push(i[c]),a=!0;else if(!a)n.push(i[c]);else break;i=i.slice(c);let u=n.join(`
`),p=u.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");s=s?`${s}
${u}`:u,o=o?`${o}
${p}`:p;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,r,!0),this.lexer.state.top=f,i.length===0)break;let b=r.at(-1);if((b==null?void 0:b.type)==="code")break;if((b==null?void 0:b.type)==="blockquote"){let m=b,y=m.raw+`
`+i.join(`
`),w=this.blockquote(y);r[r.length-1]=w,s=s.substring(0,s.length-m.raw.length)+w.raw,o=o.substring(0,o.length-m.text.length)+w.text;break}else if((b==null?void 0:b.type)==="list"){let m=b,y=m.raw+`
`+i.join(`
`),w=this.list(y);r[r.length-1]=w,s=s.substring(0,s.length-b.raw.length)+w.raw,o=o.substring(0,o.length-m.raw.length)+w.raw,i=y.substring(r.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:s,tokens:r,text:o}}}list(e){var i,s;let t=this.rules.block.list.exec(e);if(t){let o=t[1].trim(),r=o.length>1,a={type:"list",raw:"",ordered:r,start:r?+o.slice(0,-1):"",loose:!1,items:[]};o=r?`\\d{1,9}\\${o.slice(-1)}`:`\\${o}`,this.options.pedantic&&(o=r?o:"[*+-]");let n=this.rules.other.listItemRegex(o),c=!1;for(;e;){let p=!1,f="",b="";if(!(t=n.exec(e))||this.rules.block.hr.test(e))break;f=t[0],e=e.substring(f.length);let m=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,_=>" ".repeat(3*_.length)),y=e.split(`
`,1)[0],w=!m.trim(),k=0;if(this.options.pedantic?(k=2,b=m.trimStart()):w?k=t[1].length+1:(k=t[2].search(this.rules.other.nonSpaceChar),k=k>4?1:k,b=m.slice(k),k+=t[1].length),w&&this.rules.other.blankLine.test(y)&&(f+=y+`
`,e=e.substring(y.length+1),p=!0),!p){let _=this.rules.other.nextBulletRegex(k),E=this.rules.other.hrRegex(k),I=this.rules.other.fencesBeginRegex(k),W=this.rules.other.headingBeginRegex(k),U=this.rules.other.htmlBeginRegex(k);for(;e;){let re=e.split(`
`,1)[0],q;if(y=re,this.options.pedantic?(y=y.replace(this.rules.other.listReplaceNesting,"  "),q=y):q=y.replace(this.rules.other.tabCharGlobal,"    "),I.test(y)||W.test(y)||U.test(y)||_.test(y)||E.test(y))break;if(q.search(this.rules.other.nonSpaceChar)>=k||!y.trim())b+=`
`+q.slice(k);else{if(w||m.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||I.test(m)||W.test(m)||E.test(m))break;b+=`
`+y}!w&&!y.trim()&&(w=!0),f+=re+`
`,e=e.substring(re.length+1),m=q.slice(k)}}a.loose||(c?a.loose=!0:this.rules.other.doubleBlankLine.test(f)&&(c=!0)),a.items.push({type:"list_item",raw:f,task:!!this.options.gfm&&this.rules.other.listIsTask.test(b),loose:!1,text:b,tokens:[]}),a.raw+=f}let u=a.items.at(-1);if(u)u.raw=u.raw.trimEnd(),u.text=u.text.trimEnd();else return;a.raw=a.raw.trimEnd();for(let p of a.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((i=p.tokens[0])==null?void 0:i.type)==="text"||((s=p.tokens[0])==null?void 0:s.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let b=this.lexer.inlineQueue.length-1;b>=0;b--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[b].src)){this.lexer.inlineQueue[b].src=this.lexer.inlineQueue[b].src.replace(this.rules.other.listReplaceTask,"");break}}let f=this.rules.other.listTaskCheckbox.exec(p.raw);if(f){let b={type:"checkbox",raw:f[0]+" ",checked:f[0]!=="[ ]"};p.checked=b.checked,a.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=b.raw+p.tokens[0].raw,p.tokens[0].text=b.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(b)):p.tokens.unshift({type:"paragraph",raw:b.raw,text:b.raw,tokens:[b]}):p.tokens.unshift(b)}}if(!a.loose){let f=p.tokens.filter(m=>m.type==="space"),b=f.length>0&&f.some(m=>this.rules.other.anyLine.test(m.raw));a.loose=b}}if(a.loose)for(let p of a.items){p.loose=!0;for(let f of p.tokens)f.type==="text"&&(f.type="paragraph")}return a}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let i=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),s=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",o=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:i,raw:t[0],href:s,title:o}}}table(e){var a;let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let i=Ao(t[1]),s=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),o=(a=t[3])!=null&&a.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],r={type:"table",raw:t[0],header:[],align:[],rows:[]};if(i.length===s.length){for(let n of s)this.rules.other.tableAlignRight.test(n)?r.align.push("right"):this.rules.other.tableAlignCenter.test(n)?r.align.push("center"):this.rules.other.tableAlignLeft.test(n)?r.align.push("left"):r.align.push(null);for(let n=0;n<i.length;n++)r.header.push({text:i[n],tokens:this.lexer.inline(i[n]),header:!0,align:r.align[n]});for(let n of o)r.rows.push(Ao(n,r.header.length).map((c,u)=>({text:c,tokens:this.lexer.inline(c),header:!1,align:r.align[u]})));return r}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let i=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:i,tokens:this.lexer.inline(i)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let i=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(i)){if(!this.rules.other.endAngleBracket.test(i))return;let r=Ft(i.slice(0,-1),"\\");if((i.length-r.length)%2===0)return}else{let r=Wc(t[2],"()");if(r===-2)return;if(r>-1){let a=(t[0].indexOf("!")===0?5:4)+t[1].length+r;t[2]=t[2].substring(0,r),t[0]=t[0].substring(0,a).trim(),t[3]=""}}let s=t[2],o="";if(this.options.pedantic){let r=this.rules.other.pedanticHrefTitle.exec(s);r&&(s=r[1],o=r[3])}else o=t[3]?t[3].slice(1,-1):"";return s=s.trim(),this.rules.other.startAngleBracket.test(s)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(i)?s=s.slice(1):s=s.slice(1,-1)),zo(t,{href:s&&s.replace(this.rules.inline.anyPunctuation,"$1"),title:o&&o.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let i;if((i=this.rules.inline.reflink.exec(e))||(i=this.rules.inline.nolink.exec(e))){let s=(i[2]||i[1]).replace(this.rules.other.multipleSpaceGlobal," "),o=t[s.toLowerCase()];if(!o){let r=i[0].charAt(0);return{type:"text",raw:r,text:r}}return zo(i,o,i[0],this.lexer,this.rules)}}emStrong(e,t,i=""){let s=this.rules.inline.emStrongLDelim.exec(e);if(!(!s||s[3]&&i.match(this.rules.other.unicodeAlphaNumeric))&&(!(s[1]||s[2])||!i||this.rules.inline.punctuation.exec(i))){let o=[...s[0]].length-1,r,a,n=o,c=0,u=s[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(u.lastIndex=0,t=t.slice(-1*e.length+o);(s=u.exec(t))!=null;){if(r=s[1]||s[2]||s[3]||s[4]||s[5]||s[6],!r)continue;if(a=[...r].length,s[3]||s[4]){n+=a;continue}else if((s[5]||s[6])&&o%3&&!((o+a)%3)){c+=a;continue}if(n-=a,n>0)continue;a=Math.min(a,a+n+c);let p=[...s[0]][0].length,f=e.slice(0,o+s.index+p+a);if(Math.min(o,a)%2){let m=f.slice(1,-1);return{type:"em",raw:f,text:m,tokens:this.lexer.inlineTokens(m)}}let b=f.slice(2,-2);return{type:"strong",raw:f,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let i=t[2].replace(this.rules.other.newLineCharGlobal," "),s=this.rules.other.nonSpaceChar.test(i),o=this.rules.other.startingSpaceChar.test(i)&&this.rules.other.endingSpaceChar.test(i);return s&&o&&(i=i.substring(1,i.length-1)),{type:"codespan",raw:t[0],text:i}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){let t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let i,s;return t[2]==="@"?(i=t[1],s="mailto:"+i):(i=t[1],s=i),{type:"link",raw:t[0],text:i,href:s,tokens:[{type:"text",raw:i,text:i}]}}}url(e){var i;let t;if(t=this.rules.inline.url.exec(e)){let s,o;if(t[2]==="@")s=t[0],o="mailto:"+s;else{let r;do r=t[0],t[0]=((i=this.rules.inline._backpedal.exec(t[0]))==null?void 0:i[0])??"";while(r!==t[0]);s=t[0],t[1]==="www."?o="http://"+t[0]:o=t[0]}return{type:"link",raw:t[0],text:s,href:o,tokens:[{type:"text",raw:s,text:s}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let i=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:i}}}},Ce=class us{constructor(t){M(this,"tokens");M(this,"options");M(this,"state");M(this,"inlineQueue");M(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||gt,this.options.tokenizer=this.options.tokenizer||new xi,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let i={other:ne,block:ni.normal,inline:Nt.normal};this.options.pedantic?(i.block=ni.pedantic,i.inline=Nt.pedantic):this.options.gfm&&(i.block=ni.gfm,this.options.breaks?i.inline=Nt.breaks:i.inline=Nt.gfm),this.tokenizer.rules=i}static get rules(){return{block:ni,inline:Nt}}static lex(t,i){return new us(i).lex(t)}static lexInline(t,i){return new us(i).inlineTokens(t)}lex(t){t=t.replace(ne.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let i=0;i<this.inlineQueue.length;i++){let s=this.inlineQueue[i];this.inlineTokens(s.src,s.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,i=[],s=!1){var o,r,a;for(this.options.pedantic&&(t=t.replace(ne.tabCharGlobal,"    ").replace(ne.spaceLine,""));t;){let n;if((r=(o=this.options.extensions)==null?void 0:o.block)!=null&&r.some(u=>(n=u.call({lexer:this},t,i))?(t=t.substring(n.raw.length),i.push(n),!0):!1))continue;if(n=this.tokenizer.space(t)){t=t.substring(n.raw.length);let u=i.at(-1);n.raw.length===1&&u!==void 0?u.raw+=`
`:i.push(n);continue}if(n=this.tokenizer.code(t)){t=t.substring(n.raw.length);let u=i.at(-1);(u==null?void 0:u.type)==="paragraph"||(u==null?void 0:u.type)==="text"?(u.raw+=(u.raw.endsWith(`
`)?"":`
`)+n.raw,u.text+=`
`+n.text,this.inlineQueue.at(-1).src=u.text):i.push(n);continue}if(n=this.tokenizer.fences(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.heading(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.hr(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.blockquote(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.list(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.html(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.def(t)){t=t.substring(n.raw.length);let u=i.at(-1);(u==null?void 0:u.type)==="paragraph"||(u==null?void 0:u.type)==="text"?(u.raw+=(u.raw.endsWith(`
`)?"":`
`)+n.raw,u.text+=`
`+n.raw,this.inlineQueue.at(-1).src=u.text):this.tokens.links[n.tag]||(this.tokens.links[n.tag]={href:n.href,title:n.title},i.push(n));continue}if(n=this.tokenizer.table(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.lheading(t)){t=t.substring(n.raw.length),i.push(n);continue}let c=t;if((a=this.options.extensions)!=null&&a.startBlock){let u=1/0,p=t.slice(1),f;this.options.extensions.startBlock.forEach(b=>{f=b.call({lexer:this},p),typeof f=="number"&&f>=0&&(u=Math.min(u,f))}),u<1/0&&u>=0&&(c=t.substring(0,u+1))}if(this.state.top&&(n=this.tokenizer.paragraph(c))){let u=i.at(-1);s&&(u==null?void 0:u.type)==="paragraph"?(u.raw+=(u.raw.endsWith(`
`)?"":`
`)+n.raw,u.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=u.text):i.push(n),s=c.length!==t.length,t=t.substring(n.raw.length);continue}if(n=this.tokenizer.text(t)){t=t.substring(n.raw.length);let u=i.at(-1);(u==null?void 0:u.type)==="text"?(u.raw+=(u.raw.endsWith(`
`)?"":`
`)+n.raw,u.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=u.text):i.push(n);continue}if(t){let u="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(u);break}else throw new Error(u)}}return this.state.top=!0,i}inline(t,i=[]){return this.inlineQueue.push({src:t,tokens:i}),i}inlineTokens(t,i=[]){var c,u,p,f,b;let s=t,o=null;if(this.tokens.links){let m=Object.keys(this.tokens.links);if(m.length>0)for(;(o=this.tokenizer.rules.inline.reflinkSearch.exec(s))!=null;)m.includes(o[0].slice(o[0].lastIndexOf("[")+1,-1))&&(s=s.slice(0,o.index)+"["+"a".repeat(o[0].length-2)+"]"+s.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(o=this.tokenizer.rules.inline.anyPunctuation.exec(s))!=null;)s=s.slice(0,o.index)+"++"+s.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let r;for(;(o=this.tokenizer.rules.inline.blockSkip.exec(s))!=null;)r=o[2]?o[2].length:0,s=s.slice(0,o.index+r)+"["+"a".repeat(o[0].length-r-2)+"]"+s.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);s=((u=(c=this.options.hooks)==null?void 0:c.emStrongMask)==null?void 0:u.call({lexer:this},s))??s;let a=!1,n="";for(;t;){a||(n=""),a=!1;let m;if((f=(p=this.options.extensions)==null?void 0:p.inline)!=null&&f.some(w=>(m=w.call({lexer:this},t,i))?(t=t.substring(m.raw.length),i.push(m),!0):!1))continue;if(m=this.tokenizer.escape(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.tag(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.link(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(m.raw.length);let w=i.at(-1);m.type==="text"&&(w==null?void 0:w.type)==="text"?(w.raw+=m.raw,w.text+=m.text):i.push(m);continue}if(m=this.tokenizer.emStrong(t,s,n)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.codespan(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.br(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.del(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.autolink(t)){t=t.substring(m.raw.length),i.push(m);continue}if(!this.state.inLink&&(m=this.tokenizer.url(t))){t=t.substring(m.raw.length),i.push(m);continue}let y=t;if((b=this.options.extensions)!=null&&b.startInline){let w=1/0,k=t.slice(1),_;this.options.extensions.startInline.forEach(E=>{_=E.call({lexer:this},k),typeof _=="number"&&_>=0&&(w=Math.min(w,_))}),w<1/0&&w>=0&&(y=t.substring(0,w+1))}if(m=this.tokenizer.inlineText(y)){t=t.substring(m.raw.length),m.raw.slice(-1)!=="_"&&(n=m.raw.slice(-1)),a=!0;let w=i.at(-1);(w==null?void 0:w.type)==="text"?(w.raw+=m.raw,w.text+=m.text):i.push(m);continue}if(t){let w="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(w);break}else throw new Error(w)}}return i}},_i=class{constructor(e){M(this,"options");M(this,"parser");this.options=e||gt}space(e){return""}code({text:e,lang:t,escaped:i}){var r;let s=(r=(t||"").match(ne.notSpaceStart))==null?void 0:r[0],o=e.replace(ne.endingNewline,"")+`
`;return s?'<pre><code class="language-'+je(s)+'">'+(i?o:je(o,!0))+`</code></pre>
`:"<pre><code>"+(i?o:je(o,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,i=e.start,s="";for(let a=0;a<e.items.length;a++){let n=e.items[a];s+=this.listitem(n)}let o=t?"ol":"ul",r=t&&i!==1?' start="'+i+'"':"";return"<"+o+r+`>
`+s+"</"+o+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",i="";for(let o=0;o<e.header.length;o++)i+=this.tablecell(e.header[o]);t+=this.tablerow({text:i});let s="";for(let o=0;o<e.rows.length;o++){let r=e.rows[o];i="";for(let a=0;a<r.length;a++)i+=this.tablecell(r[a]);s+=this.tablerow({text:i})}return s&&(s=`<tbody>${s}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+s+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),i=e.header?"th":"td";return(e.align?`<${i} align="${e.align}">`:`<${i}>`)+t+`</${i}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${je(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:i}){let s=this.parser.parseInline(i),o=Eo(e);if(o===null)return s;e=o;let r='<a href="'+e+'"';return t&&(r+=' title="'+je(t)+'"'),r+=">"+s+"</a>",r}image({href:e,title:t,text:i,tokens:s}){s&&(i=this.parser.parseInline(s,this.parser.textRenderer));let o=Eo(e);if(o===null)return je(i);e=o;let r=`<img src="${e}" alt="${i}"`;return t&&(r+=` title="${je(t)}"`),r+=">",r}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:je(e.text)}},Fs=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Se=class hs{constructor(t){M(this,"options");M(this,"renderer");M(this,"textRenderer");this.options=t||gt,this.options.renderer=this.options.renderer||new _i,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new Fs}static parse(t,i){return new hs(i).parse(t)}static parseInline(t,i){return new hs(i).parseInline(t)}parse(t){var s,o;let i="";for(let r=0;r<t.length;r++){let a=t[r];if((o=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&o[a.type]){let c=a,u=this.options.extensions.renderers[c.type].call({parser:this},c);if(u!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(c.type)){i+=u||"";continue}}let n=a;switch(n.type){case"space":{i+=this.renderer.space(n);break}case"hr":{i+=this.renderer.hr(n);break}case"heading":{i+=this.renderer.heading(n);break}case"code":{i+=this.renderer.code(n);break}case"table":{i+=this.renderer.table(n);break}case"blockquote":{i+=this.renderer.blockquote(n);break}case"list":{i+=this.renderer.list(n);break}case"checkbox":{i+=this.renderer.checkbox(n);break}case"html":{i+=this.renderer.html(n);break}case"def":{i+=this.renderer.def(n);break}case"paragraph":{i+=this.renderer.paragraph(n);break}case"text":{i+=this.renderer.text(n);break}default:{let c='Token with "'+n.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return i}parseInline(t,i=this.renderer){var o,r;let s="";for(let a=0;a<t.length;a++){let n=t[a];if((r=(o=this.options.extensions)==null?void 0:o.renderers)!=null&&r[n.type]){let u=this.options.extensions.renderers[n.type].call({parser:this},n);if(u!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(n.type)){s+=u||"";continue}}let c=n;switch(c.type){case"escape":{s+=i.text(c);break}case"html":{s+=i.html(c);break}case"link":{s+=i.link(c);break}case"image":{s+=i.image(c);break}case"checkbox":{s+=i.checkbox(c);break}case"strong":{s+=i.strong(c);break}case"em":{s+=i.em(c);break}case"codespan":{s+=i.codespan(c);break}case"br":{s+=i.br(c);break}case"del":{s+=i.del(c);break}case"text":{s+=i.text(c);break}default:{let u='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(u),"";throw new Error(u)}}}return s}},li,Ht=(li=class{constructor(e){M(this,"options");M(this,"block");this.options=e||gt}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?Ce.lex:Ce.lexInline}provideParser(){return this.block?Se.parse:Se.parseInline}},M(li,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),M(li,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),li),Gc=class{constructor(...e){M(this,"defaults",Is());M(this,"options",this.setOptions);M(this,"parse",this.parseMarkdown(!0));M(this,"parseInline",this.parseMarkdown(!1));M(this,"Parser",Se);M(this,"Renderer",_i);M(this,"TextRenderer",Fs);M(this,"Lexer",Ce);M(this,"Tokenizer",xi);M(this,"Hooks",Ht);this.use(...e)}walkTokens(e,t){var s,o;let i=[];for(let r of e)switch(i=i.concat(t.call(this,r)),r.type){case"table":{let a=r;for(let n of a.header)i=i.concat(this.walkTokens(n.tokens,t));for(let n of a.rows)for(let c of n)i=i.concat(this.walkTokens(c.tokens,t));break}case"list":{let a=r;i=i.concat(this.walkTokens(a.items,t));break}default:{let a=r;(o=(s=this.defaults.extensions)==null?void 0:s.childTokens)!=null&&o[a.type]?this.defaults.extensions.childTokens[a.type].forEach(n=>{let c=a[n].flat(1/0);i=i.concat(this.walkTokens(c,t))}):a.tokens&&(i=i.concat(this.walkTokens(a.tokens,t)))}}return i}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(i=>{let s={...i};if(s.async=this.defaults.async||s.async||!1,i.extensions&&(i.extensions.forEach(o=>{if(!o.name)throw new Error("extension name required");if("renderer"in o){let r=t.renderers[o.name];r?t.renderers[o.name]=function(...a){let n=o.renderer.apply(this,a);return n===!1&&(n=r.apply(this,a)),n}:t.renderers[o.name]=o.renderer}if("tokenizer"in o){if(!o.level||o.level!=="block"&&o.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let r=t[o.level];r?r.unshift(o.tokenizer):t[o.level]=[o.tokenizer],o.start&&(o.level==="block"?t.startBlock?t.startBlock.push(o.start):t.startBlock=[o.start]:o.level==="inline"&&(t.startInline?t.startInline.push(o.start):t.startInline=[o.start]))}"childTokens"in o&&o.childTokens&&(t.childTokens[o.name]=o.childTokens)}),s.extensions=t),i.renderer){let o=this.defaults.renderer||new _i(this.defaults);for(let r in i.renderer){if(!(r in o))throw new Error(`renderer '${r}' does not exist`);if(["options","parser"].includes(r))continue;let a=r,n=i.renderer[a],c=o[a];o[a]=(...u)=>{let p=n.apply(o,u);return p===!1&&(p=c.apply(o,u)),p||""}}s.renderer=o}if(i.tokenizer){let o=this.defaults.tokenizer||new xi(this.defaults);for(let r in i.tokenizer){if(!(r in o))throw new Error(`tokenizer '${r}' does not exist`);if(["options","rules","lexer"].includes(r))continue;let a=r,n=i.tokenizer[a],c=o[a];o[a]=(...u)=>{let p=n.apply(o,u);return p===!1&&(p=c.apply(o,u)),p}}s.tokenizer=o}if(i.hooks){let o=this.defaults.hooks||new Ht;for(let r in i.hooks){if(!(r in o))throw new Error(`hook '${r}' does not exist`);if(["options","block"].includes(r))continue;let a=r,n=i.hooks[a],c=o[a];Ht.passThroughHooks.has(r)?o[a]=u=>{if(this.defaults.async&&Ht.passThroughHooksRespectAsync.has(r))return(async()=>{let f=await n.call(o,u);return c.call(o,f)})();let p=n.call(o,u);return c.call(o,p)}:o[a]=(...u)=>{if(this.defaults.async)return(async()=>{let f=await n.apply(o,u);return f===!1&&(f=await c.apply(o,u)),f})();let p=n.apply(o,u);return p===!1&&(p=c.apply(o,u)),p}}s.hooks=o}if(i.walkTokens){let o=this.defaults.walkTokens,r=i.walkTokens;s.walkTokens=function(a){let n=[];return n.push(r.call(this,a)),o&&(n=n.concat(o.call(this,a))),n}}this.defaults={...this.defaults,...s}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return Ce.lex(e,t??this.defaults)}parser(e,t){return Se.parse(e,t??this.defaults)}parseMarkdown(e){return(t,i)=>{let s={...i},o={...this.defaults,...s},r=this.onError(!!o.silent,!!o.async);if(this.defaults.async===!0&&s.async===!1)return r(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return r(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return r(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));if(o.hooks&&(o.hooks.options=o,o.hooks.block=e),o.async)return(async()=>{let a=o.hooks?await o.hooks.preprocess(t):t,n=await(o.hooks?await o.hooks.provideLexer():e?Ce.lex:Ce.lexInline)(a,o),c=o.hooks?await o.hooks.processAllTokens(n):n;o.walkTokens&&await Promise.all(this.walkTokens(c,o.walkTokens));let u=await(o.hooks?await o.hooks.provideParser():e?Se.parse:Se.parseInline)(c,o);return o.hooks?await o.hooks.postprocess(u):u})().catch(r);try{o.hooks&&(t=o.hooks.preprocess(t));let a=(o.hooks?o.hooks.provideLexer():e?Ce.lex:Ce.lexInline)(t,o);o.hooks&&(a=o.hooks.processAllTokens(a)),o.walkTokens&&this.walkTokens(a,o.walkTokens);let n=(o.hooks?o.hooks.provideParser():e?Se.parse:Se.parseInline)(a,o);return o.hooks&&(n=o.hooks.postprocess(n)),n}catch(a){return r(a)}}}onError(e,t){return i=>{if(i.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let s="<p>An error occurred:</p><pre>"+je(i.message+"",!0)+"</pre>";return t?Promise.resolve(s):s}if(t)return Promise.reject(i);throw i}}},ft=new Gc;function O(e,t){return ft.parse(e,t)}O.options=O.setOptions=function(e){return ft.setOptions(e),O.defaults=ft.defaults,dr(O.defaults),O};O.getDefaults=Is;O.defaults=gt;O.use=function(...e){return ft.use(...e),O.defaults=ft.defaults,dr(O.defaults),O};O.walkTokens=function(e,t){return ft.walkTokens(e,t)};O.parseInline=ft.parseInline;O.Parser=Se;O.parser=Se.parse;O.Renderer=_i;O.TextRenderer=Fs;O.Lexer=Ce;O.lexer=Ce.lex;O.Tokenizer=xi;O.Hooks=Ht;O.parse=O;O.options;O.setOptions;O.use;O.walkTokens;O.parseInline;Se.parse;Ce.lex;var Zc=Object.defineProperty,Xc=Object.getOwnPropertyDescriptor,It=(e,t,i,s)=>{for(var o=s>1?void 0:s?Xc(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(s?a(t,i,o):a(o))||o);return s&&o&&Zc(t,i,o),o};let ot=class extends J{constructor(){super(...arguments),this.epicId="",this.loading=!1,this.error="",this.content=null,this.renderedHtml="",this.previousEpicId=""}connectedCallback(){super.connectedCallback(),this.epicId&&this.loadContext()}updated(e){e.has("epicId")&&this.epicId!==this.previousEpicId&&(this.previousEpicId=this.epicId,this.loadContext())}async loadContext(){if(!this.epicId){this.content=null,this.renderedHtml="";return}this.loading=!0,this.error="";try{this.content=await El(this.epicId),this.content?this.renderedHtml=await O.parse(this.content):this.renderedHtml=""}catch(e){console.error("Failed to load context:",e),this.error=e instanceof Error?e.message:"Failed to load context",this.content=null,this.renderedHtml=""}finally{this.loading=!1}}refresh(){this.loadContext()}render(){return this.loading?h`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading context...</span>
        </div>
      `:this.error?h`<div class="error">${this.error}</div>`:this.epicId?this.content===null?h`<div class="empty">No context available</div>`:h`
      <div class="markdown-container">
        <div class="markdown-content">
          ${Es(this.renderedHtml)}
        </div>
      </div>
    `:h`<div class="empty">No epic selected</div>`}};ot.styles=C`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      font-size: 0.875rem;
      color: var(--subtext0);
      height: 100%;
    }

    /* Error state */
    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--red);
      font-size: 0.875rem;
      padding: 1rem;
      height: 100%;
    }

    /* Empty state */
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
      height: 100%;
    }

    /* Markdown container */
    .markdown-container {
      height: 100%;
      overflow-y: auto;
      padding: 1rem;
      background: var(--crust);
    }

    .markdown-container::-webkit-scrollbar {
      width: 8px;
    }

    .markdown-container::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .markdown-container::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 4px;
    }

    .markdown-container::-webkit-scrollbar-thumb:hover {
      background: var(--surface2);
    }

    /* Markdown content styling with Catppuccin colors */
    .markdown-content {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text);
    }

    /* Headers */
    .markdown-content h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--mauve);
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface1);
    }

    .markdown-content h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--lavender);
      margin: 1.5rem 0 0.75rem 0;
    }

    .markdown-content h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--blue);
      margin: 1.25rem 0 0.5rem 0;
    }

    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--sapphire);
      margin: 1rem 0 0.5rem 0;
    }

    /* Paragraphs */
    .markdown-content p {
      margin: 0 0 1rem 0;
    }

    /* Links */
    .markdown-content a {
      color: var(--blue);
      text-decoration: none;
    }

    .markdown-content a:hover {
      text-decoration: underline;
      color: var(--sapphire);
    }

    /* Emphasis */
    .markdown-content strong {
      font-weight: 600;
      color: var(--text);
    }

    .markdown-content em {
      font-style: italic;
      color: var(--subtext1);
    }

    /* Lists */
    .markdown-content ul,
    .markdown-content ol {
      margin: 0 0 1rem 0;
      padding-left: 1.5rem;
    }

    .markdown-content li {
      margin-bottom: 0.25rem;
    }

    .markdown-content li::marker {
      color: var(--overlay1);
    }

    /* Blockquotes */
    .markdown-content blockquote {
      margin: 0 0 1rem 0;
      padding: 0.5rem 1rem;
      border-left: 3px solid var(--mauve);
      background: var(--surface0);
      border-radius: 0 4px 4px 0;
    }

    .markdown-content blockquote p {
      margin: 0;
      color: var(--subtext1);
    }

    /* Code blocks */
    .markdown-content pre {
      margin: 0 0 1rem 0;
      padding: 0.75rem 1rem;
      background: var(--mantle);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow-x: auto;
    }

    .markdown-content pre code {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--text);
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* Inline code */
    .markdown-content code {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      background: var(--surface0);
      color: var(--peach);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    /* Horizontal rule */
    .markdown-content hr {
      margin: 1.5rem 0;
      border: none;
      border-top: 1px solid var(--surface1);
    }

    /* Tables */
    .markdown-content table {
      width: 100%;
      margin: 0 0 1rem 0;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .markdown-content th,
    .markdown-content td {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--surface1);
      text-align: left;
    }

    .markdown-content th {
      background: var(--surface0);
      font-weight: 600;
      color: var(--subtext1);
    }

    .markdown-content tr:nth-child(even) {
      background: var(--surface0);
    }

    /* Images */
    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 0.5rem 0;
    }

    /* Task lists */
    .markdown-content input[type="checkbox"] {
      margin-right: 0.5rem;
    }
  `;It([d({type:String})],ot.prototype,"epicId",2);It([v()],ot.prototype,"loading",2);It([v()],ot.prototype,"error",2);It([v()],ot.prototype,"content",2);It([v()],ot.prototype,"renderedHtml",2);ot=It([pe("context-pane")],ot);ts("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var i;((i=t.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
