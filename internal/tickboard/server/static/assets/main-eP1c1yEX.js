(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(o){if(o.ep)return;o.ep=!0;const r=i(o);fetch(o.href,r)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const wi=globalThis,zs=wi.ShadowRoot&&(wi.ShadyCSS===void 0||wi.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Ps=Symbol(),to=new WeakMap;let Xo=class{constructor(e,i,s){if(this._$cssResult$=!0,s!==Ps)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=i}get styleSheet(){let e=this.o;const i=this.t;if(zs&&e===void 0){const s=i!==void 0&&i.length===1;s&&(e=to.get(i)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&to.set(i,e))}return e}toString(){return this.cssText}};const Kr=t=>new Xo(typeof t=="string"?t:t+"",void 0,Ps),_=(t,...e)=>{const i=t.length===1?t[0]:e.reduce((s,o,r)=>s+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+t[r+1],t[0]);return new Xo(i,t,Ps)},Gr=(t,e)=>{if(zs)t.adoptedStyleSheets=e.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of e){const s=document.createElement("style"),o=wi.litNonce;o!==void 0&&s.setAttribute("nonce",o),s.textContent=i.cssText,t.appendChild(s)}},eo=zs?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let i="";for(const s of e.cssRules)i+=s.cssText;return Kr(i)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Xr,defineProperty:Qr,getOwnPropertyDescriptor:Jr,getOwnPropertyNames:Zr,getOwnPropertySymbols:ta,getPrototypeOf:ea}=Object,Zt=globalThis,io=Zt.trustedTypes,ia=io?io.emptyScript:"",as=Zt.reactiveElementPolyfillSupport,We=(t,e)=>t,$e={toAttribute(t,e){switch(e){case Boolean:t=t?ia:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=t!==null;break;case Number:i=t===null?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch{i=null}}return i}},Ms=(t,e)=>!Xr(t,e),so={attribute:!0,type:String,converter:$e,reflect:!1,useDefault:!1,hasChanged:Ms};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),Zt.litPropertyMetadata??(Zt.litPropertyMetadata=new WeakMap);let we=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,i=so){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(e,i),!i.noAccessor){const s=Symbol(),o=this.getPropertyDescriptor(e,s,i);o!==void 0&&Qr(this.prototype,e,o)}}static getPropertyDescriptor(e,i,s){const{get:o,set:r}=Jr(this.prototype,e)??{get(){return this[i]},set(a){this[i]=a}};return{get:o,set(a){const l=o==null?void 0:o.call(this);r==null||r.call(this,a),this.requestUpdate(e,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??so}static _$Ei(){if(this.hasOwnProperty(We("elementProperties")))return;const e=ea(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(We("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(We("properties"))){const i=this.properties,s=[...Zr(i),...ta(i)];for(const o of s)this.createProperty(o,i[o])}const e=this[Symbol.metadata];if(e!==null){const i=litPropertyMetadata.get(e);if(i!==void 0)for(const[s,o]of i)this.elementProperties.set(s,o)}this._$Eh=new Map;for(const[i,s]of this.elementProperties){const o=this._$Eu(i,s);o!==void 0&&this._$Eh.set(o,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const i=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const o of s)i.unshift(eo(o))}else e!==void 0&&i.push(eo(e));return i}static _$Eu(e,i){const s=i.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(i=>i(this))}addController(e){var i;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((i=e.hostConnected)==null||i.call(e))}removeController(e){var i;(i=this._$EO)==null||i.delete(e)}_$E_(){const e=new Map,i=this.constructor.elementProperties;for(const s of i.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Gr(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(i=>{var s;return(s=i.hostConnected)==null?void 0:s.call(i)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(i=>{var s;return(s=i.hostDisconnected)==null?void 0:s.call(i)})}attributeChangedCallback(e,i,s){this._$AK(e,s)}_$ET(e,i){var r;const s=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,s);if(o!==void 0&&s.reflect===!0){const a=(((r=s.converter)==null?void 0:r.toAttribute)!==void 0?s.converter:$e).toAttribute(i,s.type);this._$Em=e,a==null?this.removeAttribute(o):this.setAttribute(o,a),this._$Em=null}}_$AK(e,i){var r,a;const s=this.constructor,o=s._$Eh.get(e);if(o!==void 0&&this._$Em!==o){const l=s.getPropertyOptions(o),d=typeof l.converter=="function"?{fromAttribute:l.converter}:((r=l.converter)==null?void 0:r.fromAttribute)!==void 0?l.converter:$e;this._$Em=o;const h=d.fromAttribute(i,l.type);this[o]=h??((a=this._$Ej)==null?void 0:a.get(o))??h,this._$Em=null}}requestUpdate(e,i,s,o=!1,r){var a;if(e!==void 0){const l=this.constructor;if(o===!1&&(r=this[e]),s??(s=l.getPropertyOptions(e)),!((s.hasChanged??Ms)(r,i)||s.useDefault&&s.reflect&&r===((a=this._$Ej)==null?void 0:a.get(e))&&!this.hasAttribute(l._$Eu(e,s))))return;this.C(e,i,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,i,{useDefault:s,reflect:o,wrapped:r},a){s&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,a??i??this[e]),r!==!0||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(i=void 0),this._$AL.set(e,i)),o===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,a]of this._$Ep)this[r]=a;this._$Ep=void 0}const o=this.constructor.elementProperties;if(o.size>0)for(const[r,a]of o){const{wrapped:l}=a,d=this[r];l!==!0||this._$AL.has(r)||d===void 0||this.C(r,void 0,a,d)}}let e=!1;const i=this._$AL;try{e=this.shouldUpdate(i),e?(this.willUpdate(i),(s=this._$EO)==null||s.forEach(o=>{var r;return(r=o.hostUpdate)==null?void 0:r.call(o)}),this.update(i)):this._$EM()}catch(o){throw e=!1,this._$EM(),o}e&&this._$AE(i)}willUpdate(e){}_$AE(e){var i;(i=this._$EO)==null||i.forEach(s=>{var o;return(o=s.hostUpdated)==null?void 0:o.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(e){}firstUpdated(e){}};we.elementStyles=[],we.shadowRootOptions={mode:"open"},we[We("elementProperties")]=new Map,we[We("finalized")]=new Map,as==null||as({ReactiveElement:we}),(Zt.reactiveElementVersions??(Zt.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const qe=globalThis,oo=t=>t,Si=qe.trustedTypes,ro=Si?Si.createPolicy("lit-html",{createHTML:t=>t}):void 0,Qo="$lit$",Jt=`lit$${Math.random().toFixed(9).slice(2)}$`,Jo="?"+Jt,sa=`<${Jo}>`,fe=document,Xe=()=>fe.createComment(""),Qe=t=>t===null||typeof t!="object"&&typeof t!="function",Ls=Array.isArray,oa=t=>Ls(t)||typeof(t==null?void 0:t[Symbol.iterator])=="function",ns=`[ 	
\f\r]`,Re=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ao=/-->/g,no=/>/g,ne=RegExp(`>|${ns}(?:([^\\s"'>=/]+)(${ns}*=${ns}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),lo=/'/g,co=/"/g,Zo=/^(?:script|style|textarea|title)$/i,ra=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),u=ra(1),vt=Symbol.for("lit-noChange"),v=Symbol.for("lit-nothing"),uo=new WeakMap,he=fe.createTreeWalker(fe,129);function tr(t,e){if(!Ls(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return ro!==void 0?ro.createHTML(e):e}const aa=(t,e)=>{const i=t.length-1,s=[];let o,r=e===2?"<svg>":e===3?"<math>":"",a=Re;for(let l=0;l<i;l++){const d=t[l];let h,p,f=-1,g=0;for(;g<d.length&&(a.lastIndex=g,p=a.exec(d),p!==null);)g=a.lastIndex,a===Re?p[1]==="!--"?a=ao:p[1]!==void 0?a=no:p[2]!==void 0?(Zo.test(p[2])&&(o=RegExp("</"+p[2],"g")),a=ne):p[3]!==void 0&&(a=ne):a===ne?p[0]===">"?(a=o??Re,f=-1):p[1]===void 0?f=-2:(f=a.lastIndex-p[2].length,h=p[1],a=p[3]===void 0?ne:p[3]==='"'?co:lo):a===co||a===lo?a=ne:a===ao||a===no?a=Re:(a=ne,o=void 0);const m=a===ne&&t[l+1].startsWith("/>")?" ":"";r+=a===Re?d+sa:f>=0?(s.push(h),d.slice(0,f)+Qo+d.slice(f)+Jt+m):d+Jt+(f===-2?l:m)}return[tr(t,r+(t[i]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]};class Je{constructor({strings:e,_$litType$:i},s){let o;this.parts=[];let r=0,a=0;const l=e.length-1,d=this.parts,[h,p]=aa(e,i);if(this.el=Je.createElement(h,s),he.currentNode=this.el.content,i===2||i===3){const f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(o=he.nextNode())!==null&&d.length<l;){if(o.nodeType===1){if(o.hasAttributes())for(const f of o.getAttributeNames())if(f.endsWith(Qo)){const g=p[a++],m=o.getAttribute(f).split(Jt),b=/([.?@])?(.*)/.exec(g);d.push({type:1,index:r,name:b[2],strings:m,ctor:b[1]==="."?la:b[1]==="?"?ca:b[1]==="@"?da:Hi}),o.removeAttribute(f)}else f.startsWith(Jt)&&(d.push({type:6,index:r}),o.removeAttribute(f));if(Zo.test(o.tagName)){const f=o.textContent.split(Jt),g=f.length-1;if(g>0){o.textContent=Si?Si.emptyScript:"";for(let m=0;m<g;m++)o.append(f[m],Xe()),he.nextNode(),d.push({type:2,index:++r});o.append(f[g],Xe())}}}else if(o.nodeType===8)if(o.data===Jo)d.push({type:2,index:r});else{let f=-1;for(;(f=o.data.indexOf(Jt,f+1))!==-1;)d.push({type:7,index:r}),f+=Jt.length-1}r++}}static createElement(e,i){const s=fe.createElement("template");return s.innerHTML=e,s}}function Ce(t,e,i=t,s){var a,l;if(e===vt)return e;let o=s!==void 0?(a=i._$Co)==null?void 0:a[s]:i._$Cl;const r=Qe(e)?void 0:e._$litDirective$;return(o==null?void 0:o.constructor)!==r&&((l=o==null?void 0:o._$AO)==null||l.call(o,!1),r===void 0?o=void 0:(o=new r(t),o._$AT(t,i,s)),s!==void 0?(i._$Co??(i._$Co=[]))[s]=o:i._$Cl=o),o!==void 0&&(e=Ce(t,o._$AS(t,e.values),o,s)),e}class na{constructor(e,i){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:i},parts:s}=this._$AD,o=((e==null?void 0:e.creationScope)??fe).importNode(i,!0);he.currentNode=o;let r=he.nextNode(),a=0,l=0,d=s[0];for(;d!==void 0;){if(a===d.index){let h;d.type===2?h=new si(r,r.nextSibling,this,e):d.type===1?h=new d.ctor(r,d.name,d.strings,this,e):d.type===6&&(h=new ua(r,this,e)),this._$AV.push(h),d=s[++l]}a!==(d==null?void 0:d.index)&&(r=he.nextNode(),a++)}return he.currentNode=fe,o}p(e){let i=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,i),i+=s.strings.length-2):s._$AI(e[i])),i++}}class si{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,i,s,o){this.type=2,this._$AH=v,this._$AN=void 0,this._$AA=e,this._$AB=i,this._$AM=s,this.options=o,this._$Cv=(o==null?void 0:o.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=i.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,i=this){e=Ce(this,e,i),Qe(e)?e===v||e==null||e===""?(this._$AH!==v&&this._$AR(),this._$AH=v):e!==this._$AH&&e!==vt&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):oa(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==v&&Qe(this._$AH)?this._$AA.nextSibling.data=e:this.T(fe.createTextNode(e)),this._$AH=e}$(e){var r;const{values:i,_$litType$:s}=e,o=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=Je.createElement(tr(s.h,s.h[0]),this.options)),s);if(((r=this._$AH)==null?void 0:r._$AD)===o)this._$AH.p(i);else{const a=new na(o,this),l=a.u(this.options);a.p(i),this.T(l),this._$AH=a}}_$AC(e){let i=uo.get(e.strings);return i===void 0&&uo.set(e.strings,i=new Je(e)),i}k(e){Ls(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,o=0;for(const r of e)o===i.length?i.push(s=new si(this.O(Xe()),this.O(Xe()),this,this.options)):s=i[o],s._$AI(r),o++;o<i.length&&(this._$AR(s&&s._$AB.nextSibling,o),i.length=o)}_$AR(e=this._$AA.nextSibling,i){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,i);e!==this._$AB;){const o=oo(e).nextSibling;oo(e).remove(),e=o}}setConnected(e){var i;this._$AM===void 0&&(this._$Cv=e,(i=this._$AP)==null||i.call(this,e))}}class Hi{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,i,s,o,r){this.type=1,this._$AH=v,this._$AN=void 0,this.element=e,this.name=i,this._$AM=o,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=v}_$AI(e,i=this,s,o){const r=this.strings;let a=!1;if(r===void 0)e=Ce(this,e,i,0),a=!Qe(e)||e!==this._$AH&&e!==vt,a&&(this._$AH=e);else{const l=e;let d,h;for(e=r[0],d=0;d<r.length-1;d++)h=Ce(this,l[s+d],i,d),h===vt&&(h=this._$AH[d]),a||(a=!Qe(h)||h!==this._$AH[d]),h===v?e=v:e!==v&&(e+=(h??"")+r[d+1]),this._$AH[d]=h}a&&!o&&this.j(e)}j(e){e===v?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class la extends Hi{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===v?void 0:e}}class ca extends Hi{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==v)}}class da extends Hi{constructor(e,i,s,o,r){super(e,i,s,o,r),this.type=5}_$AI(e,i=this){if((e=Ce(this,e,i,0)??v)===vt)return;const s=this._$AH,o=e===v&&s!==v||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,r=e!==v&&(s===v||o);o&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,e):this._$AH.handleEvent(e)}}class ua{constructor(e,i,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){Ce(this,e)}}const ls=qe.litHtmlPolyfillSupport;ls==null||ls(Je,si),(qe.litHtmlVersions??(qe.litHtmlVersions=[])).push("3.3.2");const ha=(t,e,i)=>{const s=(i==null?void 0:i.renderBefore)??e;let o=s._$litPart$;if(o===void 0){const r=(i==null?void 0:i.renderBefore)??null;s._$litPart$=o=new si(e.insertBefore(Xe(),r),r,void 0,i??{})}return o._$AI(t),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pe=globalThis;let Y=class extends we{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const e=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=e.firstChild),e}update(e){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ha(i,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return vt}};var Go;Y._$litElement$=!0,Y.finalized=!0,(Go=pe.litElementHydrateSupport)==null||Go.call(pe,{LitElement:Y});const cs=pe.litElementPolyfillSupport;cs==null||cs({LitElement:Y});(pe.litElementVersions??(pe.litElementVersions=[])).push("4.2.2");var pa=_`
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
`;const ys=new Set,ke=new Map;let ue,Is="ltr",Rs="en";const er=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(er){const t=new MutationObserver(sr);Is=document.documentElement.dir||"ltr",Rs=document.documentElement.lang||navigator.language,t.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function ir(...t){t.map(e=>{const i=e.$code.toLowerCase();ke.has(i)?ke.set(i,Object.assign(Object.assign({},ke.get(i)),e)):ke.set(i,e),ue||(ue=e)}),sr()}function sr(){er&&(Is=document.documentElement.dir||"ltr",Rs=document.documentElement.lang||navigator.language),[...ys.keys()].map(t=>{typeof t.requestUpdate=="function"&&t.requestUpdate()})}let fa=class{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){ys.add(this.host)}hostDisconnected(){ys.delete(this.host)}dir(){return`${this.host.dir||Is}`.toLowerCase()}lang(){return`${this.host.lang||Rs}`.toLowerCase()}getTranslationData(e){var i,s;const o=new Intl.Locale(e.replace(/_/g,"-")),r=o==null?void 0:o.language.toLowerCase(),a=(s=(i=o==null?void 0:o.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&s!==void 0?s:"",l=ke.get(`${r}-${a}`),d=ke.get(r);return{locale:o,language:r,region:a,primary:l,secondary:d}}exists(e,i){var s;const{primary:o,secondary:r}=this.getTranslationData((s=i.lang)!==null&&s!==void 0?s:this.lang());return i=Object.assign({includeFallback:!1},i),!!(o&&o[e]||r&&r[e]||i.includeFallback&&ue&&ue[e])}term(e,...i){const{primary:s,secondary:o}=this.getTranslationData(this.lang());let r;if(s&&s[e])r=s[e];else if(o&&o[e])r=o[e];else if(ue&&ue[e])r=ue[e];else return console.error(`No translation found for: ${String(e)}`),String(e);return typeof r=="function"?r(...i):r}date(e,i){return e=new Date(e),new Intl.DateTimeFormat(this.lang(),i).format(e)}number(e,i){return e=Number(e),isNaN(e)?"":new Intl.NumberFormat(this.lang(),i).format(e)}relativeTime(e,i,s){return new Intl.RelativeTimeFormat(this.lang(),s).format(e,i)}};var or={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(t,e)=>`Go to slide ${t} of ${e}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:t=>t===0?"No options selected":t===1?"1 option selected":`${t} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:t=>`Slide ${t}`,toggleColorFormat:"Toggle color format"};ir(or);var ma=or,st=class extends fa{};ir(ma);var N=_`
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
`,rr=Object.defineProperty,ba=Object.defineProperties,ga=Object.getOwnPropertyDescriptor,va=Object.getOwnPropertyDescriptors,ho=Object.getOwnPropertySymbols,ya=Object.prototype.hasOwnProperty,wa=Object.prototype.propertyIsEnumerable,ds=(t,e)=>(e=Symbol[t])?e:Symbol.for("Symbol."+t),Ns=t=>{throw TypeError(t)},po=(t,e,i)=>e in t?rr(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i,Wt=(t,e)=>{for(var i in e||(e={}))ya.call(e,i)&&po(t,i,e[i]);if(ho)for(var i of ho(e))wa.call(e,i)&&po(t,i,e[i]);return t},oi=(t,e)=>ba(t,va(e)),n=(t,e,i,s)=>{for(var o=s>1?void 0:s?ga(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&rr(e,i,o),o},ar=(t,e,i)=>e.has(t)||Ns("Cannot "+i),xa=(t,e,i)=>(ar(t,e,"read from private field"),e.get(t)),ka=(t,e,i)=>e.has(t)?Ns("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),_a=(t,e,i,s)=>(ar(t,e,"write to private field"),e.set(t,i),i),$a=function(t,e){this[0]=t,this[1]=e},Ca=t=>{var e=t[ds("asyncIterator")],i=!1,s,o={};return e==null?(e=t[ds("iterator")](),s=r=>o[r]=a=>e[r](a)):(e=e.call(t),s=r=>o[r]=a=>{if(i){if(i=!1,r==="throw")throw a;return a}return i=!0,{done:!1,value:new $a(new Promise(l=>{var d=e[r](a);d instanceof Object||Ns("Object expected"),l(d)}),1)}}),o[ds("iterator")]=()=>o,s("next"),"throw"in e?s("throw"):o.throw=r=>{throw r},"return"in e&&s("return"),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ht=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Sa={attribute:!0,type:String,converter:$e,reflect:!1,hasChanged:Ms},Ta=(t=Sa,e,i)=>{const{kind:s,metadata:o}=i;let r=globalThis.litPropertyMetadata.get(o);if(r===void 0&&globalThis.litPropertyMetadata.set(o,r=new Map),s==="setter"&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),s==="accessor"){const{name:a}=i;return{set(l){const d=e.get.call(this);e.set.call(this,l),this.requestUpdate(a,d,t,!0,l)},init(l){return l!==void 0&&this.C(a,void 0,t,l),l}}}if(s==="setter"){const{name:a}=i;return function(l){const d=this[a];e.call(this,l),this.requestUpdate(a,d,t,!0,l)}}throw Error("Unsupported decorator location: "+s)};function c(t){return(e,i)=>typeof i=="object"?Ta(t,e,i):((s,o,r)=>{const a=o.hasOwnProperty(r);return o.constructor.createProperty(r,s),a?Object.getOwnPropertyDescriptor(o,r):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function y(t){return c({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ea(t){return(e,i)=>{const s=typeof e=="function"?e:e[i];Object.assign(s,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Aa=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function k(t,e){return(i,s,o)=>{const r=a=>{var l;return((l=a.renderRoot)==null?void 0:l.querySelector(t))??null};return Aa(i,s,{get(){return r(this)}})}}var xi,P=class extends Y{constructor(){super(),ka(this,xi,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([t,e])=>{this.constructor.define(t,e)})}emit(t,e){const i=new CustomEvent(t,Wt({bubbles:!0,cancelable:!1,composed:!0,detail:{}},e));return this.dispatchEvent(i),i}static define(t,e=this,i={}){const s=customElements.get(t);if(!s){try{customElements.define(t,e,i)}catch{customElements.define(t,class extends e{},i)}return}let o=" (unknown version)",r=o;"version"in e&&e.version&&(o=" v"+e.version),"version"in s&&s.version&&(r=" v"+s.version),!(o&&r&&o===r)&&console.warn(`Attempted to register <${t}>${o}, but <${t}>${r} has already been registered.`)}attributeChangedCallback(t,e,i){xa(this,xi)||(this.constructor.elementProperties.forEach((s,o)=>{s.reflect&&this[o]!=null&&this.initialReflectedProperties.set(o,this[o])}),_a(this,xi,!0)),super.attributeChangedCallback(t,e,i)}willUpdate(t){super.willUpdate(t),this.initialReflectedProperties.forEach((e,i)=>{t.has(i)&&this[i]==null&&(this[i]=e)})}};xi=new WeakMap;P.version="2.20.1";P.dependencies={};n([c()],P.prototype,"dir",2);n([c()],P.prototype,"lang",2);var ji=class extends P{constructor(){super(...arguments),this.localize=new st(this)}render(){return u`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};ji.styles=[N,pa];var Ne=new WeakMap,Fe=new WeakMap,Be=new WeakMap,us=new WeakSet,pi=new WeakMap,ri=class{constructor(t,e){this.handleFormData=i=>{const s=this.options.disabled(this.host),o=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!s&&!a&&typeof o=="string"&&o.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(l=>{i.formData.append(o,l.toString())}):i.formData.append(o,r.toString()))},this.handleFormSubmit=i=>{var s;const o=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((s=Ne.get(this.form))==null||s.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!o&&!r(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),pi.set(this.host,[])},this.handleInteraction=i=>{const s=pi.get(this.host);s.includes(i.type)||s.push(i.type),s.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.checkValidity=="function"&&!s.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.reportValidity=="function"&&!s.reportValidity())return!1}return!0},(this.host=t).addController(this),this.options=Wt({form:i=>{const s=i.form;if(s){const r=i.getRootNode().querySelector(`#${s}`);if(r)return r}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var s;return(s=i.disabled)!=null?s:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,s)=>i.value=s,assumeInteractionOn:["sl-input"]},e)}hostConnected(){const t=this.options.form(this.host);t&&this.attachForm(t),pi.set(this.host,[]),this.options.assumeInteractionOn.forEach(e=>{this.host.addEventListener(e,this.handleInteraction)})}hostDisconnected(){this.detachForm(),pi.delete(this.host),this.options.assumeInteractionOn.forEach(t=>{this.host.removeEventListener(t,this.handleInteraction)})}hostUpdated(){const t=this.options.form(this.host);t||this.detachForm(),t&&this.form!==t&&(this.detachForm(),this.attachForm(t)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(t){t?(this.form=t,Ne.has(this.form)?Ne.get(this.form).add(this.host):Ne.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Fe.has(this.form)||(Fe.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Be.has(this.form)||(Be.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const t=Ne.get(this.form);t&&(t.delete(this.host),t.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Fe.has(this.form)&&(this.form.reportValidity=Fe.get(this.form),Fe.delete(this.form)),Be.has(this.form)&&(this.form.checkValidity=Be.get(this.form),Be.delete(this.form)),this.form=void 0))}setUserInteracted(t,e){e?us.add(t):us.delete(t),t.requestUpdate()}doAction(t,e){if(this.form){const i=document.createElement("button");i.type=t,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",e&&(i.name=e.name,i.value=e.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(s=>{e.hasAttribute(s)&&i.setAttribute(s,e.getAttribute(s))})),this.form.append(i),i.click(),i.remove()}}getForm(){var t;return(t=this.form)!=null?t:null}reset(t){this.doAction("reset",t)}submit(t){this.doAction("submit",t)}setValidity(t){const e=this.host,i=!!us.has(e),s=!!e.required;e.toggleAttribute("data-required",s),e.toggleAttribute("data-optional",!s),e.toggleAttribute("data-invalid",!t),e.toggleAttribute("data-valid",t),e.toggleAttribute("data-user-invalid",!t&&i),e.toggleAttribute("data-user-valid",t&&i)}updateValidity(){const t=this.host;this.setValidity(t.validity.valid)}emitInvalidEvent(t){const e=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});t||e.preventDefault(),this.host.dispatchEvent(e)||t==null||t.preventDefault()}},Fs=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(oi(Wt({},Fs),{valid:!1,valueMissing:!0}));Object.freeze(oi(Wt({},Fs),{valid:!1,customError:!0}));var Da=_`
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
`,qt=class{constructor(t,...e){this.slotNames=[],this.handleSlotChange=i=>{const s=i.target;(this.slotNames.includes("[default]")&&!s.name||s.name&&this.slotNames.includes(s.name))&&this.host.requestUpdate()},(this.host=t).addController(this),this.slotNames=e}hasDefaultSlot(){return[...this.host.childNodes].some(t=>{if(t.nodeType===t.TEXT_NODE&&t.textContent.trim()!=="")return!0;if(t.nodeType===t.ELEMENT_NODE){const e=t;if(e.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!e.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(t){return this.host.querySelector(`:scope > [slot="${t}"]`)!==null}test(t){return t==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(t)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Oa(t){if(!t)return"";const e=t.assignedNodes({flatten:!0});let i="";return[...e].forEach(s=>{s.nodeType===Node.TEXT_NODE&&(i+=s.textContent)}),i}var ws="";function xs(t){ws=t}function za(t=""){if(!ws){const e=[...document.getElementsByTagName("script")],i=e.find(s=>s.hasAttribute("data-shoelace"));if(i)xs(i.getAttribute("data-shoelace"));else{const s=e.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let o="";s&&(o=s.getAttribute("src")),xs(o.split("/").slice(0,-1).join("/"))}}return ws.replace(/\/$/,"")+(t?`/${t.replace(/^\//,"")}`:"")}var Pa={name:"default",resolver:t=>za(`assets/icons/${t}.svg`)},Ma=Pa,fo={caret:`
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
  `},La={name:"system",resolver:t=>t in fo?`data:image/svg+xml,${encodeURIComponent(fo[t])}`:""},Ia=La,Ra=[Ma,Ia],ks=[];function Na(t){ks.push(t)}function Fa(t){ks=ks.filter(e=>e!==t)}function mo(t){return Ra.find(e=>e.name===t)}var Ba=_`
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
`;function S(t,e){const i=Wt({waitUntilFirstUpdate:!1},e);return(s,o)=>{const{update:r}=s,a=Array.isArray(t)?t:[t];s.update=function(l){a.forEach(d=>{const h=d;if(l.has(h)){const p=l.get(h),f=this[h];p!==f&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[o](p,f)}}),r.call(this,l)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ha=(t,e)=>(t==null?void 0:t._$litType$)!==void 0,nr=t=>t.strings===void 0,ja={},Ua=(t,e=ja)=>t._$AH=e;var He=Symbol(),fi=Symbol(),hs,ps=new Map,X=class extends P{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(t,e){var i;let s;if(e!=null&&e.spriteSheet)return this.svg=u`<svg part="svg">
        <use part="use" href="${t}"></use>
      </svg>`,this.svg;try{if(s=await fetch(t,{mode:"cors"}),!s.ok)return s.status===410?He:fi}catch{return fi}try{const o=document.createElement("div");o.innerHTML=await s.text();const r=o.firstElementChild;if(((i=r==null?void 0:r.tagName)==null?void 0:i.toLowerCase())!=="svg")return He;hs||(hs=new DOMParser);const l=hs.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return l?(l.part.add("svg"),document.adoptNode(l)):He}catch{return He}}connectedCallback(){super.connectedCallback(),Na(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Fa(this)}getIconSource(){const t=mo(this.library);return this.name&&t?{url:t.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var t;const{url:e,fromLibrary:i}=this.getIconSource(),s=i?mo(this.library):void 0;if(!e){this.svg=null;return}let o=ps.get(e);if(o||(o=this.resolveIcon(e,s),ps.set(e,o)),!this.initialRender)return;const r=await o;if(r===fi&&ps.delete(e),e===this.getIconSource().url){if(Ha(r)){if(this.svg=r,s){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof s.mutator=="function"&&a&&s.mutator(a)}return}switch(r){case fi:case He:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(t=s==null?void 0:s.mutator)==null||t.call(s,this.svg),this.emit("sl-load")}}}render(){return this.svg}};X.styles=[N,Ba];n([y()],X.prototype,"svg",2);n([c({reflect:!0})],X.prototype,"name",2);n([c()],X.prototype,"src",2);n([c()],X.prototype,"label",2);n([c({reflect:!0})],X.prototype,"library",2);n([S("label")],X.prototype,"handleLabelChange",1);n([S(["name","src","library"])],X.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ht={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ui=t=>(...e)=>({_$litDirective$:t,values:e});let Vi=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,s){this._$Ct=e,this._$AM=i,this._$Ci=s}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const z=Ui(class extends Vi{constructor(t){var e;if(super(t),t.type!==Ht.ATTRIBUTE||t.name!=="class"||((e=t.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){var s,o;if(this.st===void 0){this.st=new Set,t.strings!==void 0&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in e)e[r]&&!((s=this.nt)!=null&&s.has(r))&&this.st.add(r);return this.render(e)}const i=t.element.classList;for(const r of this.st)r in e||(i.remove(r),this.st.delete(r));for(const r in e){const a=!!e[r];a===this.st.has(r)||(o=this.nt)!=null&&o.has(r)||(a?(i.add(r),this.st.add(r)):(i.remove(r),this.st.delete(r)))}return vt}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const lr=Symbol.for(""),Va=t=>{if((t==null?void 0:t.r)===lr)return t==null?void 0:t._$litStatic$},Ti=(t,...e)=>({_$litStatic$:e.reduce((i,s,o)=>i+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(s)+t[o+1],t[0]),r:lr}),bo=new Map,Wa=t=>(e,...i)=>{const s=i.length;let o,r;const a=[],l=[];let d,h=0,p=!1;for(;h<s;){for(d=e[h];h<s&&(r=i[h],(o=Va(r))!==void 0);)d+=o+e[++h],p=!0;h!==s&&l.push(r),a.push(d),h++}if(h===s&&a.push(e[s]),p){const f=a.join("$$lit$$");(e=bo.get(f))===void 0&&(a.raw=a,bo.set(f,e=a)),i=l}return t(e,...i)},ki=Wa(u);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=t=>t??v;var M=class extends P{constructor(){super(...arguments),this.formControlController=new ri(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new qt(this,"[default]","prefix","suffix"),this.localize=new st(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:Fs}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(t){this.isButton()&&(this.button.setCustomValidity(t),this.formControlController.updateValidity())}render(){const t=this.isLink(),e=t?Ti`a`:Ti`button`;return ki`
      <${e}
        part="base"
        class=${z({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${x(t?void 0:this.disabled)}
        type=${x(t?void 0:this.type)}
        title=${this.title}
        name=${x(t?void 0:this.name)}
        value=${x(t?void 0:this.value)}
        href=${x(t&&!this.disabled?this.href:void 0)}
        target=${x(t?this.target:void 0)}
        download=${x(t?this.download:void 0)}
        rel=${x(t?this.rel:void 0)}
        role=${x(t?void 0:"button")}
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
        ${this.caret?ki` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?ki`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${e}>
    `}};M.styles=[N,Da];M.dependencies={"sl-icon":X,"sl-spinner":ji};n([k(".button")],M.prototype,"button",2);n([y()],M.prototype,"hasFocus",2);n([y()],M.prototype,"invalid",2);n([c()],M.prototype,"title",2);n([c({reflect:!0})],M.prototype,"variant",2);n([c({reflect:!0})],M.prototype,"size",2);n([c({type:Boolean,reflect:!0})],M.prototype,"caret",2);n([c({type:Boolean,reflect:!0})],M.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],M.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],M.prototype,"outline",2);n([c({type:Boolean,reflect:!0})],M.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],M.prototype,"circle",2);n([c()],M.prototype,"type",2);n([c()],M.prototype,"name",2);n([c()],M.prototype,"value",2);n([c()],M.prototype,"href",2);n([c()],M.prototype,"target",2);n([c()],M.prototype,"rel",2);n([c()],M.prototype,"download",2);n([c()],M.prototype,"form",2);n([c({attribute:"formaction"})],M.prototype,"formAction",2);n([c({attribute:"formenctype"})],M.prototype,"formEnctype",2);n([c({attribute:"formmethod"})],M.prototype,"formMethod",2);n([c({attribute:"formnovalidate",type:Boolean})],M.prototype,"formNoValidate",2);n([c({attribute:"formtarget"})],M.prototype,"formTarget",2);n([S("disabled",{waitUntilFirstUpdate:!0})],M.prototype,"handleDisabledChange",1);M.define("sl-button");var qa=_`
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
`,Bs=(t="value")=>(e,i)=>{const s=e.constructor,o=s.prototype.attributeChangedCallback;s.prototype.attributeChangedCallback=function(r,a,l){var d;const h=s.getPropertyOptions(t),p=typeof h.attribute=="string"?h.attribute:t;if(r===p){const f=h.converter||$e,m=(typeof f=="function"?f:(d=f==null?void 0:f.fromAttribute)!=null?d:$e.fromAttribute)(l,h.type);this[t]!==m&&(this[i]=m)}o.call(this,r,a,l)}},Wi=_`
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
 */const Ei=Ui(class extends Vi{constructor(t){if(super(t),t.type!==Ht.PROPERTY&&t.type!==Ht.ATTRIBUTE&&t.type!==Ht.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!nr(t))throw Error("`live` bindings can only contain a single expression")}render(t){return t}update(t,[e]){if(e===vt||e===v)return e;const i=t.element,s=t.name;if(t.type===Ht.PROPERTY){if(e===i[s])return vt}else if(t.type===Ht.BOOLEAN_ATTRIBUTE){if(!!e===i.hasAttribute(s))return vt}else if(t.type===Ht.ATTRIBUTE&&i.getAttribute(s)===e+"")return vt;return Ua(t),e}});var $=class extends P{constructor(){super(...arguments),this.formControlController=new ri(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qt(this,"help-text","label"),this.localize=new st(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var t;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((t=this.input)==null?void 0:t.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(t){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=t,this.value=this.__dateInput.value}get valueAsNumber(){var t;return this.__numberInput.value=this.value,((t=this.input)==null?void 0:t.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(t){this.__numberInput.valueAsNumber=t,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(t){t.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleKeyDown(t){const e=t.metaKey||t.ctrlKey||t.shiftKey||t.altKey;t.key==="Enter"&&!e&&setTimeout(()=>{!t.defaultPrevented&&!t.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,s="preserve"){const o=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,o,r,s),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,s=this.helpText?!0:!!e,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return u`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${z({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              .value=${Ei(this.value)}
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

            ${r?u`
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
            ${this.passwordToggle&&!this.disabled?u`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?u`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:u`
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
    `}};$.styles=[N,Wi,qa];$.dependencies={"sl-icon":X};n([k(".input__control")],$.prototype,"input",2);n([y()],$.prototype,"hasFocus",2);n([c()],$.prototype,"title",2);n([c({reflect:!0})],$.prototype,"type",2);n([c()],$.prototype,"name",2);n([c()],$.prototype,"value",2);n([Bs()],$.prototype,"defaultValue",2);n([c({reflect:!0})],$.prototype,"size",2);n([c({type:Boolean,reflect:!0})],$.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],$.prototype,"pill",2);n([c()],$.prototype,"label",2);n([c({attribute:"help-text"})],$.prototype,"helpText",2);n([c({type:Boolean})],$.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],$.prototype,"disabled",2);n([c()],$.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],$.prototype,"readonly",2);n([c({attribute:"password-toggle",type:Boolean})],$.prototype,"passwordToggle",2);n([c({attribute:"password-visible",type:Boolean})],$.prototype,"passwordVisible",2);n([c({attribute:"no-spin-buttons",type:Boolean})],$.prototype,"noSpinButtons",2);n([c({reflect:!0})],$.prototype,"form",2);n([c({type:Boolean,reflect:!0})],$.prototype,"required",2);n([c()],$.prototype,"pattern",2);n([c({type:Number})],$.prototype,"minlength",2);n([c({type:Number})],$.prototype,"maxlength",2);n([c()],$.prototype,"min",2);n([c()],$.prototype,"max",2);n([c()],$.prototype,"step",2);n([c()],$.prototype,"autocapitalize",2);n([c()],$.prototype,"autocorrect",2);n([c()],$.prototype,"autocomplete",2);n([c({type:Boolean})],$.prototype,"autofocus",2);n([c()],$.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],$.prototype,"spellcheck",2);n([c()],$.prototype,"inputmode",2);n([S("disabled",{waitUntilFirstUpdate:!0})],$.prototype,"handleDisabledChange",1);n([S("step",{waitUntilFirstUpdate:!0})],$.prototype,"handleStepChange",1);n([S("value",{waitUntilFirstUpdate:!0})],$.prototype,"handleValueChange",1);$.define("sl-input");var Ya=_`
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
`,Ka=_`
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
`,V=class extends P{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(t){this.disabled&&(t.preventDefault(),t.stopPropagation())}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}render(){const t=!!this.href,e=t?Ti`a`:Ti`button`;return ki`
      <${e}
        part="base"
        class=${z({"icon-button":!0,"icon-button--disabled":!t&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${x(t?void 0:this.disabled)}
        type=${x(t?void 0:"button")}
        href=${x(t?this.href:void 0)}
        target=${x(t?this.target:void 0)}
        download=${x(t?this.download:void 0)}
        rel=${x(t&&this.target?"noreferrer noopener":void 0)}
        role=${x(t?void 0:"button")}
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
      </${e}>
    `}};V.styles=[N,Ka];V.dependencies={"sl-icon":X};n([k(".icon-button")],V.prototype,"button",2);n([y()],V.prototype,"hasFocus",2);n([c()],V.prototype,"name",2);n([c()],V.prototype,"library",2);n([c()],V.prototype,"src",2);n([c()],V.prototype,"href",2);n([c()],V.prototype,"target",2);n([c()],V.prototype,"download",2);n([c()],V.prototype,"label",2);n([c({type:Boolean,reflect:!0})],V.prototype,"disabled",2);var ge=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return u`
      <span
        part="base"
        class=${z({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?u`
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
    `}};ge.styles=[N,Ya];ge.dependencies={"sl-icon-button":V};n([c({reflect:!0})],ge.prototype,"variant",2);n([c({reflect:!0})],ge.prototype,"size",2);n([c({type:Boolean,reflect:!0})],ge.prototype,"pill",2);n([c({type:Boolean})],ge.prototype,"removable",2);var Ga=_`
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
`;function Xa(t,e){return{top:Math.round(t.getBoundingClientRect().top-e.getBoundingClientRect().top),left:Math.round(t.getBoundingClientRect().left-e.getBoundingClientRect().left)}}var _s=new Set;function Qa(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}function Ja(){const t=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(t)||!t?0:t}function Ye(t){if(_s.add(t),!document.documentElement.classList.contains("sl-scroll-lock")){const e=Qa()+Ja();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),e<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${e}px`)}}function Ke(t){_s.delete(t),_s.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function $s(t,e,i="vertical",s="smooth"){const o=Xa(t,e),r=o.top+e.scrollTop,a=o.left+e.scrollLeft,l=e.scrollLeft,d=e.scrollLeft+e.offsetWidth,h=e.scrollTop,p=e.scrollTop+e.offsetHeight;(i==="horizontal"||i==="both")&&(a<l?e.scrollTo({left:a,behavior:s}):a+t.clientWidth>d&&e.scrollTo({left:a-e.offsetWidth+t.clientWidth,behavior:s})),(i==="vertical"||i==="both")&&(r<h?e.scrollTo({top:r,behavior:s}):r+t.clientHeight>p&&e.scrollTo({top:r-e.offsetHeight+t.clientHeight,behavior:s}))}var Za=_`
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
`;const te=Math.min,dt=Math.max,Ai=Math.round,mi=Math.floor,Pt=t=>({x:t,y:t}),tn={left:"right",right:"left",bottom:"top",top:"bottom"},en={start:"end",end:"start"};function Cs(t,e,i){return dt(t,te(e,i))}function De(t,e){return typeof t=="function"?t(e):t}function ee(t){return t.split("-")[0]}function Oe(t){return t.split("-")[1]}function cr(t){return t==="x"?"y":"x"}function Hs(t){return t==="y"?"height":"width"}const sn=new Set(["top","bottom"]);function jt(t){return sn.has(ee(t))?"y":"x"}function js(t){return cr(jt(t))}function on(t,e,i){i===void 0&&(i=!1);const s=Oe(t),o=js(t),r=Hs(o);let a=o==="x"?s===(i?"end":"start")?"right":"left":s==="start"?"bottom":"top";return e.reference[r]>e.floating[r]&&(a=Di(a)),[a,Di(a)]}function rn(t){const e=Di(t);return[Ss(t),e,Ss(e)]}function Ss(t){return t.replace(/start|end/g,e=>en[e])}const go=["left","right"],vo=["right","left"],an=["top","bottom"],nn=["bottom","top"];function ln(t,e,i){switch(t){case"top":case"bottom":return i?e?vo:go:e?go:vo;case"left":case"right":return e?an:nn;default:return[]}}function cn(t,e,i,s){const o=Oe(t);let r=ln(ee(t),i==="start",s);return o&&(r=r.map(a=>a+"-"+o),e&&(r=r.concat(r.map(Ss)))),r}function Di(t){return t.replace(/left|right|bottom|top/g,e=>tn[e])}function dn(t){return{top:0,right:0,bottom:0,left:0,...t}}function dr(t){return typeof t!="number"?dn(t):{top:t,right:t,bottom:t,left:t}}function Oi(t){const{x:e,y:i,width:s,height:o}=t;return{width:s,height:o,top:i,left:e,right:e+s,bottom:i+o,x:e,y:i}}function yo(t,e,i){let{reference:s,floating:o}=t;const r=jt(e),a=js(e),l=Hs(a),d=ee(e),h=r==="y",p=s.x+s.width/2-o.width/2,f=s.y+s.height/2-o.height/2,g=s[l]/2-o[l]/2;let m;switch(d){case"top":m={x:p,y:s.y-o.height};break;case"bottom":m={x:p,y:s.y+s.height};break;case"right":m={x:s.x+s.width,y:f};break;case"left":m={x:s.x-o.width,y:f};break;default:m={x:s.x,y:s.y}}switch(Oe(e)){case"start":m[a]-=g*(i&&h?-1:1);break;case"end":m[a]+=g*(i&&h?-1:1);break}return m}const un=async(t,e,i)=>{const{placement:s="bottom",strategy:o="absolute",middleware:r=[],platform:a}=i,l=r.filter(Boolean),d=await(a.isRTL==null?void 0:a.isRTL(e));let h=await a.getElementRects({reference:t,floating:e,strategy:o}),{x:p,y:f}=yo(h,s,d),g=s,m={},b=0;for(let w=0;w<l.length;w++){const{name:C,fn:T}=l[w],{x:D,y:I,data:W,reset:F}=await T({x:p,y:f,initialPlacement:s,placement:g,strategy:o,middlewareData:m,rects:h,platform:a,elements:{reference:t,floating:e}});p=D??p,f=I??f,m={...m,[C]:{...m[C],...W}},F&&b<=50&&(b++,typeof F=="object"&&(F.placement&&(g=F.placement),F.rects&&(h=F.rects===!0?await a.getElementRects({reference:t,floating:e,strategy:o}):F.rects),{x:p,y:f}=yo(h,g,d)),w=-1)}return{x:p,y:f,placement:g,strategy:o,middlewareData:m}};async function Us(t,e){var i;e===void 0&&(e={});const{x:s,y:o,platform:r,rects:a,elements:l,strategy:d}=t,{boundary:h="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:g=!1,padding:m=0}=De(e,t),b=dr(m),C=l[g?f==="floating"?"reference":"floating":f],T=Oi(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement(C)))==null||i?C:C.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(l.floating)),boundary:h,rootBoundary:p,strategy:d})),D=f==="floating"?{x:s,y:o,width:a.floating.width,height:a.floating.height}:a.reference,I=await(r.getOffsetParent==null?void 0:r.getOffsetParent(l.floating)),W=await(r.isElement==null?void 0:r.isElement(I))?await(r.getScale==null?void 0:r.getScale(I))||{x:1,y:1}:{x:1,y:1},F=Oi(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:D,offsetParent:I,strategy:d}):D);return{top:(T.top-F.top+b.top)/W.y,bottom:(F.bottom-T.bottom+b.bottom)/W.y,left:(T.left-F.left+b.left)/W.x,right:(F.right-T.right+b.right)/W.x}}const hn=t=>({name:"arrow",options:t,async fn(e){const{x:i,y:s,placement:o,rects:r,platform:a,elements:l,middlewareData:d}=e,{element:h,padding:p=0}=De(t,e)||{};if(h==null)return{};const f=dr(p),g={x:i,y:s},m=js(o),b=Hs(m),w=await a.getDimensions(h),C=m==="y",T=C?"top":"left",D=C?"bottom":"right",I=C?"clientHeight":"clientWidth",W=r.reference[b]+r.reference[m]-g[m]-r.floating[b],F=g[m]-r.reference[m],xt=await(a.getOffsetParent==null?void 0:a.getOffsetParent(h));let Z=xt?xt[I]:0;(!Z||!await(a.isElement==null?void 0:a.isElement(xt)))&&(Z=l.floating[I]||r.floating[b]);const Ft=W/2-F/2,Dt=Z/2-w[b]/2-1,gt=te(f[T],Dt),Yt=te(f[D],Dt),Ot=gt,Kt=Z-w[b]-Yt,rt=Z/2-w[b]/2+Ft,ae=Cs(Ot,rt,Kt),Bt=!d.arrow&&Oe(o)!=null&&rt!==ae&&r.reference[b]/2-(rt<Ot?gt:Yt)-w[b]/2<0,kt=Bt?rt<Ot?rt-Ot:rt-Kt:0;return{[m]:g[m]+kt,data:{[m]:ae,centerOffset:rt-ae-kt,...Bt&&{alignmentOffset:kt}},reset:Bt}}}),pn=function(t){return t===void 0&&(t={}),{name:"flip",options:t,async fn(e){var i,s;const{placement:o,middlewareData:r,rects:a,initialPlacement:l,platform:d,elements:h}=e,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:g,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:b="none",flipAlignment:w=!0,...C}=De(t,e);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const T=ee(o),D=jt(l),I=ee(l)===l,W=await(d.isRTL==null?void 0:d.isRTL(h.floating)),F=g||(I||!w?[Di(l)]:rn(l)),xt=b!=="none";!g&&xt&&F.push(...cn(l,w,b,W));const Z=[l,...F],Ft=await Us(e,C),Dt=[];let gt=((s=r.flip)==null?void 0:s.overflows)||[];if(p&&Dt.push(Ft[T]),f){const rt=on(o,a,W);Dt.push(Ft[rt[0]],Ft[rt[1]])}if(gt=[...gt,{placement:o,overflows:Dt}],!Dt.every(rt=>rt<=0)){var Yt,Ot;const rt=(((Yt=r.flip)==null?void 0:Yt.index)||0)+1,ae=Z[rt];if(ae&&(!(f==="alignment"?D!==jt(ae):!1)||gt.every(_t=>jt(_t.placement)===D?_t.overflows[0]>0:!0)))return{data:{index:rt,overflows:gt},reset:{placement:ae}};let Bt=(Ot=gt.filter(kt=>kt.overflows[0]<=0).sort((kt,_t)=>kt.overflows[1]-_t.overflows[1])[0])==null?void 0:Ot.placement;if(!Bt)switch(m){case"bestFit":{var Kt;const kt=(Kt=gt.filter(_t=>{if(xt){const Gt=jt(_t.placement);return Gt===D||Gt==="y"}return!0}).map(_t=>[_t.placement,_t.overflows.filter(Gt=>Gt>0).reduce((Gt,Yr)=>Gt+Yr,0)]).sort((_t,Gt)=>_t[1]-Gt[1])[0])==null?void 0:Kt[0];kt&&(Bt=kt);break}case"initialPlacement":Bt=l;break}if(o!==Bt)return{reset:{placement:Bt}}}return{}}}},fn=new Set(["left","top"]);async function mn(t,e){const{placement:i,platform:s,elements:o}=t,r=await(s.isRTL==null?void 0:s.isRTL(o.floating)),a=ee(i),l=Oe(i),d=jt(i)==="y",h=fn.has(a)?-1:1,p=r&&d?-1:1,f=De(e,t);let{mainAxis:g,crossAxis:m,alignmentAxis:b}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return l&&typeof b=="number"&&(m=l==="end"?b*-1:b),d?{x:m*p,y:g*h}:{x:g*h,y:m*p}}const bn=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var i,s;const{x:o,y:r,placement:a,middlewareData:l}=e,d=await mn(e,t);return a===((i=l.offset)==null?void 0:i.placement)&&(s=l.arrow)!=null&&s.alignmentOffset?{}:{x:o+d.x,y:r+d.y,data:{...d,placement:a}}}}},gn=function(t){return t===void 0&&(t={}),{name:"shift",options:t,async fn(e){const{x:i,y:s,placement:o}=e,{mainAxis:r=!0,crossAxis:a=!1,limiter:l={fn:C=>{let{x:T,y:D}=C;return{x:T,y:D}}},...d}=De(t,e),h={x:i,y:s},p=await Us(e,d),f=jt(ee(o)),g=cr(f);let m=h[g],b=h[f];if(r){const C=g==="y"?"top":"left",T=g==="y"?"bottom":"right",D=m+p[C],I=m-p[T];m=Cs(D,m,I)}if(a){const C=f==="y"?"top":"left",T=f==="y"?"bottom":"right",D=b+p[C],I=b-p[T];b=Cs(D,b,I)}const w=l.fn({...e,[g]:m,[f]:b});return{...w,data:{x:w.x-i,y:w.y-s,enabled:{[g]:r,[f]:a}}}}}},vn=function(t){return t===void 0&&(t={}),{name:"size",options:t,async fn(e){var i,s;const{placement:o,rects:r,platform:a,elements:l}=e,{apply:d=()=>{},...h}=De(t,e),p=await Us(e,h),f=ee(o),g=Oe(o),m=jt(o)==="y",{width:b,height:w}=r.floating;let C,T;f==="top"||f==="bottom"?(C=f,T=g===(await(a.isRTL==null?void 0:a.isRTL(l.floating))?"start":"end")?"left":"right"):(T=f,C=g==="end"?"top":"bottom");const D=w-p.top-p.bottom,I=b-p.left-p.right,W=te(w-p[C],D),F=te(b-p[T],I),xt=!e.middlewareData.shift;let Z=W,Ft=F;if((i=e.middlewareData.shift)!=null&&i.enabled.x&&(Ft=I),(s=e.middlewareData.shift)!=null&&s.enabled.y&&(Z=D),xt&&!g){const gt=dt(p.left,0),Yt=dt(p.right,0),Ot=dt(p.top,0),Kt=dt(p.bottom,0);m?Ft=b-2*(gt!==0||Yt!==0?gt+Yt:dt(p.left,p.right)):Z=w-2*(Ot!==0||Kt!==0?Ot+Kt:dt(p.top,p.bottom))}await d({...e,availableWidth:Ft,availableHeight:Z});const Dt=await a.getDimensions(l.floating);return b!==Dt.width||w!==Dt.height?{reset:{rects:!0}}:{}}}};function qi(){return typeof window<"u"}function ze(t){return ur(t)?(t.nodeName||"").toLowerCase():"#document"}function ut(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function It(t){var e;return(e=(ur(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function ur(t){return qi()?t instanceof Node||t instanceof ut(t).Node:!1}function Ct(t){return qi()?t instanceof Element||t instanceof ut(t).Element:!1}function Mt(t){return qi()?t instanceof HTMLElement||t instanceof ut(t).HTMLElement:!1}function wo(t){return!qi()||typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof ut(t).ShadowRoot}const yn=new Set(["inline","contents"]);function ai(t){const{overflow:e,overflowX:i,overflowY:s,display:o}=St(t);return/auto|scroll|overlay|hidden|clip/.test(e+s+i)&&!yn.has(o)}const wn=new Set(["table","td","th"]);function xn(t){return wn.has(ze(t))}const kn=[":popover-open",":modal"];function Yi(t){return kn.some(e=>{try{return t.matches(e)}catch{return!1}})}const _n=["transform","translate","scale","rotate","perspective"],$n=["transform","translate","scale","rotate","perspective","filter"],Cn=["paint","layout","strict","content"];function Ki(t){const e=Vs(),i=Ct(t)?St(t):t;return _n.some(s=>i[s]?i[s]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!e&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!e&&(i.filter?i.filter!=="none":!1)||$n.some(s=>(i.willChange||"").includes(s))||Cn.some(s=>(i.contain||"").includes(s))}function Sn(t){let e=ie(t);for(;Mt(e)&&!Se(e);){if(Ki(e))return e;if(Yi(e))return null;e=ie(e)}return null}function Vs(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Tn=new Set(["html","body","#document"]);function Se(t){return Tn.has(ze(t))}function St(t){return ut(t).getComputedStyle(t)}function Gi(t){return Ct(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function ie(t){if(ze(t)==="html")return t;const e=t.assignedSlot||t.parentNode||wo(t)&&t.host||It(t);return wo(e)?e.host:e}function hr(t){const e=ie(t);return Se(e)?t.ownerDocument?t.ownerDocument.body:t.body:Mt(e)&&ai(e)?e:hr(e)}function Ze(t,e,i){var s;e===void 0&&(e=[]),i===void 0&&(i=!0);const o=hr(t),r=o===((s=t.ownerDocument)==null?void 0:s.body),a=ut(o);if(r){const l=Ts(a);return e.concat(a,a.visualViewport||[],ai(o)?o:[],l&&i?Ze(l):[])}return e.concat(o,Ze(o,[],i))}function Ts(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function pr(t){const e=St(t);let i=parseFloat(e.width)||0,s=parseFloat(e.height)||0;const o=Mt(t),r=o?t.offsetWidth:i,a=o?t.offsetHeight:s,l=Ai(i)!==r||Ai(s)!==a;return l&&(i=r,s=a),{width:i,height:s,$:l}}function Ws(t){return Ct(t)?t:t.contextElement}function _e(t){const e=Ws(t);if(!Mt(e))return Pt(1);const i=e.getBoundingClientRect(),{width:s,height:o,$:r}=pr(e);let a=(r?Ai(i.width):i.width)/s,l=(r?Ai(i.height):i.height)/o;return(!a||!Number.isFinite(a))&&(a=1),(!l||!Number.isFinite(l))&&(l=1),{x:a,y:l}}const En=Pt(0);function fr(t){const e=ut(t);return!Vs()||!e.visualViewport?En:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function An(t,e,i){return e===void 0&&(e=!1),!i||e&&i!==ut(t)?!1:e}function me(t,e,i,s){e===void 0&&(e=!1),i===void 0&&(i=!1);const o=t.getBoundingClientRect(),r=Ws(t);let a=Pt(1);e&&(s?Ct(s)&&(a=_e(s)):a=_e(t));const l=An(r,i,s)?fr(r):Pt(0);let d=(o.left+l.x)/a.x,h=(o.top+l.y)/a.y,p=o.width/a.x,f=o.height/a.y;if(r){const g=ut(r),m=s&&Ct(s)?ut(s):s;let b=g,w=Ts(b);for(;w&&s&&m!==b;){const C=_e(w),T=w.getBoundingClientRect(),D=St(w),I=T.left+(w.clientLeft+parseFloat(D.paddingLeft))*C.x,W=T.top+(w.clientTop+parseFloat(D.paddingTop))*C.y;d*=C.x,h*=C.y,p*=C.x,f*=C.y,d+=I,h+=W,b=ut(w),w=Ts(b)}}return Oi({width:p,height:f,x:d,y:h})}function Xi(t,e){const i=Gi(t).scrollLeft;return e?e.left+i:me(It(t)).left+i}function mr(t,e){const i=t.getBoundingClientRect(),s=i.left+e.scrollLeft-Xi(t,i),o=i.top+e.scrollTop;return{x:s,y:o}}function Dn(t){let{elements:e,rect:i,offsetParent:s,strategy:o}=t;const r=o==="fixed",a=It(s),l=e?Yi(e.floating):!1;if(s===a||l&&r)return i;let d={scrollLeft:0,scrollTop:0},h=Pt(1);const p=Pt(0),f=Mt(s);if((f||!f&&!r)&&((ze(s)!=="body"||ai(a))&&(d=Gi(s)),Mt(s))){const m=me(s);h=_e(s),p.x=m.x+s.clientLeft,p.y=m.y+s.clientTop}const g=a&&!f&&!r?mr(a,d):Pt(0);return{width:i.width*h.x,height:i.height*h.y,x:i.x*h.x-d.scrollLeft*h.x+p.x+g.x,y:i.y*h.y-d.scrollTop*h.y+p.y+g.y}}function On(t){return Array.from(t.getClientRects())}function zn(t){const e=It(t),i=Gi(t),s=t.ownerDocument.body,o=dt(e.scrollWidth,e.clientWidth,s.scrollWidth,s.clientWidth),r=dt(e.scrollHeight,e.clientHeight,s.scrollHeight,s.clientHeight);let a=-i.scrollLeft+Xi(t);const l=-i.scrollTop;return St(s).direction==="rtl"&&(a+=dt(e.clientWidth,s.clientWidth)-o),{width:o,height:r,x:a,y:l}}const xo=25;function Pn(t,e){const i=ut(t),s=It(t),o=i.visualViewport;let r=s.clientWidth,a=s.clientHeight,l=0,d=0;if(o){r=o.width,a=o.height;const p=Vs();(!p||p&&e==="fixed")&&(l=o.offsetLeft,d=o.offsetTop)}const h=Xi(s);if(h<=0){const p=s.ownerDocument,f=p.body,g=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(g.marginLeft)+parseFloat(g.marginRight)||0,b=Math.abs(s.clientWidth-f.clientWidth-m);b<=xo&&(r-=b)}else h<=xo&&(r+=h);return{width:r,height:a,x:l,y:d}}const Mn=new Set(["absolute","fixed"]);function Ln(t,e){const i=me(t,!0,e==="fixed"),s=i.top+t.clientTop,o=i.left+t.clientLeft,r=Mt(t)?_e(t):Pt(1),a=t.clientWidth*r.x,l=t.clientHeight*r.y,d=o*r.x,h=s*r.y;return{width:a,height:l,x:d,y:h}}function ko(t,e,i){let s;if(e==="viewport")s=Pn(t,i);else if(e==="document")s=zn(It(t));else if(Ct(e))s=Ln(e,i);else{const o=fr(t);s={x:e.x-o.x,y:e.y-o.y,width:e.width,height:e.height}}return Oi(s)}function br(t,e){const i=ie(t);return i===e||!Ct(i)||Se(i)?!1:St(i).position==="fixed"||br(i,e)}function In(t,e){const i=e.get(t);if(i)return i;let s=Ze(t,[],!1).filter(l=>Ct(l)&&ze(l)!=="body"),o=null;const r=St(t).position==="fixed";let a=r?ie(t):t;for(;Ct(a)&&!Se(a);){const l=St(a),d=Ki(a);!d&&l.position==="fixed"&&(o=null),(r?!d&&!o:!d&&l.position==="static"&&!!o&&Mn.has(o.position)||ai(a)&&!d&&br(t,a))?s=s.filter(p=>p!==a):o=l,a=ie(a)}return e.set(t,s),s}function Rn(t){let{element:e,boundary:i,rootBoundary:s,strategy:o}=t;const a=[...i==="clippingAncestors"?Yi(e)?[]:In(e,this._c):[].concat(i),s],l=a[0],d=a.reduce((h,p)=>{const f=ko(e,p,o);return h.top=dt(f.top,h.top),h.right=te(f.right,h.right),h.bottom=te(f.bottom,h.bottom),h.left=dt(f.left,h.left),h},ko(e,l,o));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Nn(t){const{width:e,height:i}=pr(t);return{width:e,height:i}}function Fn(t,e,i){const s=Mt(e),o=It(e),r=i==="fixed",a=me(t,!0,r,e);let l={scrollLeft:0,scrollTop:0};const d=Pt(0);function h(){d.x=Xi(o)}if(s||!s&&!r)if((ze(e)!=="body"||ai(o))&&(l=Gi(e)),s){const m=me(e,!0,r,e);d.x=m.x+e.clientLeft,d.y=m.y+e.clientTop}else o&&h();r&&!s&&o&&h();const p=o&&!s&&!r?mr(o,l):Pt(0),f=a.left+l.scrollLeft-d.x-p.x,g=a.top+l.scrollTop-d.y-p.y;return{x:f,y:g,width:a.width,height:a.height}}function fs(t){return St(t).position==="static"}function _o(t,e){if(!Mt(t)||St(t).position==="fixed")return null;if(e)return e(t);let i=t.offsetParent;return It(t)===i&&(i=i.ownerDocument.body),i}function gr(t,e){const i=ut(t);if(Yi(t))return i;if(!Mt(t)){let o=ie(t);for(;o&&!Se(o);){if(Ct(o)&&!fs(o))return o;o=ie(o)}return i}let s=_o(t,e);for(;s&&xn(s)&&fs(s);)s=_o(s,e);return s&&Se(s)&&fs(s)&&!Ki(s)?i:s||Sn(t)||i}const Bn=async function(t){const e=this.getOffsetParent||gr,i=this.getDimensions,s=await i(t.floating);return{reference:Fn(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:s.width,height:s.height}}};function Hn(t){return St(t).direction==="rtl"}const _i={convertOffsetParentRelativeRectToViewportRelativeRect:Dn,getDocumentElement:It,getClippingRect:Rn,getOffsetParent:gr,getElementRects:Bn,getClientRects:On,getDimensions:Nn,getScale:_e,isElement:Ct,isRTL:Hn};function vr(t,e){return t.x===e.x&&t.y===e.y&&t.width===e.width&&t.height===e.height}function jn(t,e){let i=null,s;const o=It(t);function r(){var l;clearTimeout(s),(l=i)==null||l.disconnect(),i=null}function a(l,d){l===void 0&&(l=!1),d===void 0&&(d=1),r();const h=t.getBoundingClientRect(),{left:p,top:f,width:g,height:m}=h;if(l||e(),!g||!m)return;const b=mi(f),w=mi(o.clientWidth-(p+g)),C=mi(o.clientHeight-(f+m)),T=mi(p),I={rootMargin:-b+"px "+-w+"px "+-C+"px "+-T+"px",threshold:dt(0,te(1,d))||1};let W=!0;function F(xt){const Z=xt[0].intersectionRatio;if(Z!==d){if(!W)return a();Z?a(!1,Z):s=setTimeout(()=>{a(!1,1e-7)},1e3)}Z===1&&!vr(h,t.getBoundingClientRect())&&a(),W=!1}try{i=new IntersectionObserver(F,{...I,root:o.ownerDocument})}catch{i=new IntersectionObserver(F,I)}i.observe(t)}return a(!0),r}function Un(t,e,i,s){s===void 0&&(s={});const{ancestorScroll:o=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:d=!1}=s,h=Ws(t),p=o||r?[...h?Ze(h):[],...Ze(e)]:[];p.forEach(T=>{o&&T.addEventListener("scroll",i,{passive:!0}),r&&T.addEventListener("resize",i)});const f=h&&l?jn(h,i):null;let g=-1,m=null;a&&(m=new ResizeObserver(T=>{let[D]=T;D&&D.target===h&&m&&(m.unobserve(e),cancelAnimationFrame(g),g=requestAnimationFrame(()=>{var I;(I=m)==null||I.observe(e)})),i()}),h&&!d&&m.observe(h),m.observe(e));let b,w=d?me(t):null;d&&C();function C(){const T=me(t);w&&!vr(w,T)&&i(),w=T,b=requestAnimationFrame(C)}return i(),()=>{var T;p.forEach(D=>{o&&D.removeEventListener("scroll",i),r&&D.removeEventListener("resize",i)}),f==null||f(),(T=m)==null||T.disconnect(),m=null,d&&cancelAnimationFrame(b)}}const Vn=bn,Wn=gn,qn=pn,$o=vn,Yn=hn,Kn=(t,e,i)=>{const s=new Map,o={platform:_i,...i},r={...o.platform,_c:s};return un(t,e,{...o,platform:r})};function Gn(t){return Xn(t)}function ms(t){return t.assignedSlot?t.assignedSlot:t.parentNode instanceof ShadowRoot?t.parentNode.host:t.parentNode}function Xn(t){for(let e=t;e;e=ms(e))if(e instanceof Element&&getComputedStyle(e).display==="none")return null;for(let e=ms(t);e;e=ms(e)){if(!(e instanceof Element))continue;const i=getComputedStyle(e);if(i.display!=="contents"&&(i.position!=="static"||Ki(i)||e.tagName==="BODY"))return e}return null}function Qn(t){return t!==null&&typeof t=="object"&&"getBoundingClientRect"in t&&("contextElement"in t?t.contextElement instanceof Element:!0)}var L=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const t=this.anchorEl.getBoundingClientRect(),e=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let s=0,o=0,r=0,a=0,l=0,d=0,h=0,p=0;i?t.top<e.top?(s=t.left,o=t.bottom,r=t.right,a=t.bottom,l=e.left,d=e.top,h=e.right,p=e.top):(s=e.left,o=e.bottom,r=e.right,a=e.bottom,l=t.left,d=t.top,h=t.right,p=t.top):t.left<e.left?(s=t.right,o=t.top,r=e.left,a=e.top,l=t.right,d=t.bottom,h=e.left,p=e.bottom):(s=e.right,o=e.top,r=t.left,a=t.top,l=e.right,d=e.bottom,h=t.left,p=t.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${s}px`),this.style.setProperty("--hover-bridge-top-left-y",`${o}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${l}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${h}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(t){super.updated(t),t.has("active")&&(this.active?this.start():this.stop()),t.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const t=this.getRootNode();this.anchorEl=t.getElementById(this.anchor)}else this.anchor instanceof Element||Qn(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Un(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(t=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>t())):t()})}reposition(){if(!this.active||!this.anchorEl)return;const t=[Vn({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?t.push($o({apply:({rects:i})=>{const s=this.sync==="width"||this.sync==="both",o=this.sync==="height"||this.sync==="both";this.popup.style.width=s?`${i.reference.width}px`:"",this.popup.style.height=o?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&t.push(qn({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&t.push(Wn({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?t.push($o({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:s})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${s}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&t.push(Yn({element:this.arrowEl,padding:this.arrowPadding}));const e=this.strategy==="absolute"?i=>_i.getOffsetParent(i,Gn):_i.getOffsetParent;Kn(this.anchorEl,this.popup,{placement:this.placement,middleware:t,strategy:this.strategy,platform:oi(Wt({},_i),{getOffsetParent:e})}).then(({x:i,y:s,middlewareData:o,placement:r})=>{const a=this.localize.dir()==="rtl",l={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${i}px`,top:`${s}px`}),this.arrow){const d=o.arrow.x,h=o.arrow.y;let p="",f="",g="",m="";if(this.arrowPlacement==="start"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=a?b:"",m=a?"":b}else if(this.arrowPlacement==="end"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=a?"":b,m=a?b:"",g=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof h=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof d=="number"?`${d}px`:"",p=typeof h=="number"?`${h}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:g,left:m,[l]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return u`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${z({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${z({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?u`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};L.styles=[N,Za];n([k(".popup")],L.prototype,"popup",2);n([k(".popup__arrow")],L.prototype,"arrowEl",2);n([c()],L.prototype,"anchor",2);n([c({type:Boolean,reflect:!0})],L.prototype,"active",2);n([c({reflect:!0})],L.prototype,"placement",2);n([c({reflect:!0})],L.prototype,"strategy",2);n([c({type:Number})],L.prototype,"distance",2);n([c({type:Number})],L.prototype,"skidding",2);n([c({type:Boolean})],L.prototype,"arrow",2);n([c({attribute:"arrow-placement"})],L.prototype,"arrowPlacement",2);n([c({attribute:"arrow-padding",type:Number})],L.prototype,"arrowPadding",2);n([c({type:Boolean})],L.prototype,"flip",2);n([c({attribute:"flip-fallback-placements",converter:{fromAttribute:t=>t.split(" ").map(e=>e.trim()).filter(e=>e!==""),toAttribute:t=>t.join(" ")}})],L.prototype,"flipFallbackPlacements",2);n([c({attribute:"flip-fallback-strategy"})],L.prototype,"flipFallbackStrategy",2);n([c({type:Object})],L.prototype,"flipBoundary",2);n([c({attribute:"flip-padding",type:Number})],L.prototype,"flipPadding",2);n([c({type:Boolean})],L.prototype,"shift",2);n([c({type:Object})],L.prototype,"shiftBoundary",2);n([c({attribute:"shift-padding",type:Number})],L.prototype,"shiftPadding",2);n([c({attribute:"auto-size"})],L.prototype,"autoSize",2);n([c()],L.prototype,"sync",2);n([c({type:Object})],L.prototype,"autoSizeBoundary",2);n([c({attribute:"auto-size-padding",type:Number})],L.prototype,"autoSizePadding",2);n([c({attribute:"hover-bridge",type:Boolean})],L.prototype,"hoverBridge",2);var yr=new Map,Jn=new WeakMap;function Zn(t){return t??{keyframes:[],options:{duration:0}}}function Co(t,e){return e.toLowerCase()==="rtl"?{keyframes:t.rtlKeyframes||t.keyframes,options:t.options}:t}function R(t,e){yr.set(t,Zn(e))}function H(t,e,i){const s=Jn.get(t);if(s!=null&&s[e])return Co(s[e],i.dir);const o=yr.get(e);return o?Co(o,i.dir):{keyframes:[],options:{duration:0}}}function nt(t,e){return new Promise(i=>{function s(o){o.target===t&&(t.removeEventListener(e,s),i())}t.addEventListener(e,s)})}function j(t,e,i){return new Promise(s=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const o=t.animate(e,oi(Wt({},i),{duration:tl()?0:i.duration}));o.addEventListener("cancel",s,{once:!0}),o.addEventListener("finish",s,{once:!0})})}function So(t){return t=t.toString().toLowerCase(),t.indexOf("ms")>-1?parseFloat(t):t.indexOf("s")>-1?parseFloat(t)*1e3:parseFloat(t)}function tl(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function q(t){return Promise.all(t.getAnimations().map(e=>new Promise(i=>{e.cancel(),requestAnimationFrame(i)})))}function To(t,e){return t.map(i=>oi(Wt({},i),{height:i.height==="auto"?`${e}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Es=class extends Vi{constructor(e){if(super(e),this.it=v,e.type!==Ht.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===v||e==null)return this._t=void 0,this.it=e;if(e===vt)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const i=[e];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};Es.directiveName="unsafeHTML",Es.resultType=1;const el=Ui(Es);var E=class extends P{constructor(){super(...arguments),this.formControlController=new ri(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qt(this,"help-text","label"),this.localize=new st(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=t=>u`
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
        @sl-remove=${e=>this.handleTagRemove(e,t)}
      >
        ${t.getTextLabel()}
      </sl-tag>
    `,this.handleDocumentFocusIn=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()},this.handleDocumentKeyDown=t=>{const e=t.target,i=e.closest(".select__clear")!==null,s=e.closest("sl-icon-button")!==null;if(!(i||s)){if(t.key==="Escape"&&this.open&&!this.closeWatcher&&(t.preventDefault(),t.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),t.key==="Enter"||t.key===" "&&this.typeToSelectString===""){if(t.preventDefault(),t.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(t.key)){const o=this.getAllOptions(),r=o.indexOf(this.currentOption);let a=Math.max(0,r);if(t.preventDefault(),!this.open&&(this.show(),this.currentOption))return;t.key==="ArrowDown"?(a=r+1,a>o.length-1&&(a=0)):t.key==="ArrowUp"?(a=r-1,a<0&&(a=o.length-1)):t.key==="Home"?a=0:t.key==="End"&&(a=o.length-1),this.setCurrentOption(o[a])}if(t.key&&t.key.length===1||t.key==="Backspace"){const o=this.getAllOptions();if(t.metaKey||t.ctrlKey||t.altKey)return;if(!this.open){if(t.key==="Backspace")return;this.show()}t.stopPropagation(),t.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),t.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=t.key.toLowerCase();for(const r of o)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()}}get value(){return this._value}set value(t){this.multiple?t=Array.isArray(t)?t:t.split(" "):t=Array.isArray(t)?t.join(" "):t,this._value!==t&&(this.valueHasChanged=!0,this._value=t)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var t;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var t;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(t=this.closeWatcher)==null||t.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(t){const i=t.composedPath().some(s=>s instanceof Element&&s.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(t.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(t){t.key!=="Tab"&&(t.stopPropagation(),this.handleDocumentKeyDown(t))}handleClearClick(t){t.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(t){t.stopPropagation(),t.preventDefault()}handleOptionClick(t){const i=t.target.closest("sl-option"),s=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==s&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const t=this.getAllOptions(),e=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(e)?e:[e],s=[];t.forEach(o=>s.push(o.value)),this.setSelectedOptions(t.filter(o=>i.includes(o.value)))}handleTagRemove(t,e){t.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(e,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(t){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),t&&(this.currentOption=t,t.current=!0,t.tabIndex=0,t.focus())}setSelectedOptions(t){const e=this.getAllOptions(),i=Array.isArray(t)?t:[t];e.forEach(s=>s.selected=!1),i.length&&i.forEach(s=>s.selected=!0),this.selectionChanged()}toggleOptionSelection(t,e){e===!0||e===!1?t.selected=e:t.selected=!t.selected,this.selectionChanged()}selectionChanged(){var t,e,i;const s=this.getAllOptions();this.selectedOptions=s.filter(r=>r.selected);const o=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(t=r==null?void 0:r.value)!=null?t:"",this.displayLabel=(i=(e=r==null?void 0:r.getTextLabel)==null?void 0:e.call(r))!=null?i:""}this.valueHasChanged=o,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((t,e)=>{if(e<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(t,e);return u`<div @sl-remove=${s=>this.handleTagRemove(s,t)}>
          ${typeof i=="string"?el(i):i}
        </div>`}else if(e===this.maxOptionsVisible)return u`<sl-tag size=${this.size}>+${this.selectedOptions.length-e}</sl-tag>`;return u``})}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(t,e,i){if(super.attributeChangedCallback(t,e,i),t==="value"){const s=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=s}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const t=this.getAllOptions(),e=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(t.filter(i=>e.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await q(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:t,options:e}=H(this,"select.show",{dir:this.localize.dir()});await j(this.popup.popup,t,e),this.currentOption&&$s(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await q(this);const{keyframes:t,options:e}=H(this,"select.hide",{dir:this.localize.dir()});await j(this.popup.popup,t,e),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,nt(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,nt(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(t){this.valueInput.setCustomValidity(t),this.formControlController.updateValidity()}focus(t){this.displayInput.focus(t)}blur(){this.displayInput.blur()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,s=this.helpText?!0:!!e,o=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return u`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${z({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":r,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${this.multiple?u`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${o?u`
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
    `}};E.styles=[N,Wi,Ga];E.dependencies={"sl-icon":X,"sl-popup":L,"sl-tag":ge};n([k(".select")],E.prototype,"popup",2);n([k(".select__combobox")],E.prototype,"combobox",2);n([k(".select__display-input")],E.prototype,"displayInput",2);n([k(".select__value-input")],E.prototype,"valueInput",2);n([k(".select__listbox")],E.prototype,"listbox",2);n([y()],E.prototype,"hasFocus",2);n([y()],E.prototype,"displayLabel",2);n([y()],E.prototype,"currentOption",2);n([y()],E.prototype,"selectedOptions",2);n([y()],E.prototype,"valueHasChanged",2);n([c()],E.prototype,"name",2);n([y()],E.prototype,"value",1);n([c({attribute:"value"})],E.prototype,"defaultValue",2);n([c({reflect:!0})],E.prototype,"size",2);n([c()],E.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],E.prototype,"multiple",2);n([c({attribute:"max-options-visible",type:Number})],E.prototype,"maxOptionsVisible",2);n([c({type:Boolean,reflect:!0})],E.prototype,"disabled",2);n([c({type:Boolean})],E.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],E.prototype,"open",2);n([c({type:Boolean})],E.prototype,"hoist",2);n([c({type:Boolean,reflect:!0})],E.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],E.prototype,"pill",2);n([c()],E.prototype,"label",2);n([c({reflect:!0})],E.prototype,"placement",2);n([c({attribute:"help-text"})],E.prototype,"helpText",2);n([c({reflect:!0})],E.prototype,"form",2);n([c({type:Boolean,reflect:!0})],E.prototype,"required",2);n([c()],E.prototype,"getTag",2);n([S("disabled",{waitUntilFirstUpdate:!0})],E.prototype,"handleDisabledChange",1);n([S(["defaultValue","value"],{waitUntilFirstUpdate:!0})],E.prototype,"handleValueChange",1);n([S("open",{waitUntilFirstUpdate:!0})],E.prototype,"handleOpenChange",1);R("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});E.define("sl-select");var il=_`
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
`,yt=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const t=this.closest("sl-select");t&&t.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const t=this.childNodes;let e="";return[...t].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(e+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(e+=i.textContent)}),e.trim()}render(){return u`
      <div
        part="base"
        class=${z({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};yt.styles=[N,il];yt.dependencies={"sl-icon":X};n([k(".option__label")],yt.prototype,"defaultSlot",2);n([y()],yt.prototype,"current",2);n([y()],yt.prototype,"selected",2);n([y()],yt.prototype,"hasHover",2);n([c({reflect:!0})],yt.prototype,"value",2);n([c({type:Boolean,reflect:!0})],yt.prototype,"disabled",2);n([S("disabled")],yt.prototype,"handleDisabledChange",1);n([S("selected")],yt.prototype,"handleSelectedChange",1);n([S("value")],yt.prototype,"handleValueChange",1);yt.define("sl-option");var sl=_`
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
`;function*qs(t=document.activeElement){t!=null&&(yield t,"shadowRoot"in t&&t.shadowRoot&&t.shadowRoot.mode!=="closed"&&(yield*Ca(qs(t.shadowRoot.activeElement))))}function wr(){return[...qs()].pop()}var Eo=new WeakMap;function xr(t){let e=Eo.get(t);return e||(e=window.getComputedStyle(t,null),Eo.set(t,e)),e}function ol(t){if(typeof t.checkVisibility=="function")return t.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const e=xr(t);return e.visibility!=="hidden"&&e.display!=="none"}function rl(t){const e=xr(t),{overflowY:i,overflowX:s}=e;return i==="scroll"||s==="scroll"?!0:i!=="auto"||s!=="auto"?!1:t.scrollHeight>t.clientHeight&&i==="auto"||t.scrollWidth>t.clientWidth&&s==="auto"}function al(t){const e=t.tagName.toLowerCase(),i=Number(t.getAttribute("tabindex"));if(t.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||t.hasAttribute("disabled")||t.closest("[inert]"))return!1;if(e==="input"&&t.getAttribute("type")==="radio"){const r=t.getRootNode(),a=`input[type='radio'][name="${t.getAttribute("name")}"]`,l=r.querySelector(`${a}:checked`);return l?l===t:r.querySelector(a)===t}return ol(t)?(e==="audio"||e==="video")&&t.hasAttribute("controls")||t.hasAttribute("tabindex")||t.hasAttribute("contenteditable")&&t.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(e)?!0:rl(t):!1}function nl(t){var e,i;const s=As(t),o=(e=s[0])!=null?e:null,r=(i=s[s.length-1])!=null?i:null;return{start:o,end:r}}function ll(t,e){var i;return((i=t.getRootNode({composed:!0}))==null?void 0:i.host)!==e}function As(t){const e=new WeakMap,i=[];function s(o){if(o instanceof Element){if(o.hasAttribute("inert")||o.closest("[inert]")||e.has(o))return;e.set(o,!0),!i.includes(o)&&al(o)&&i.push(o),o instanceof HTMLSlotElement&&ll(o,t)&&o.assignedElements({flatten:!0}).forEach(r=>{s(r)}),o.shadowRoot!==null&&o.shadowRoot.mode==="open"&&s(o.shadowRoot)}for(const r of o.children)s(r)}return s(t),i.sort((o,r)=>{const a=Number(o.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var je=[],kr=class{constructor(t){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=e=>{var i;if(e.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const s=wr();if(this.previousFocus=s,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;e.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const o=As(this.element);let r=o.findIndex(l=>l===s);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=o.length?r=0:r+a<0?r=o.length-1:r+=a,this.previousFocus=this.currentFocus;const l=o[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||l&&this.possiblyHasTabbableChildren(l))return;e.preventDefault(),this.currentFocus=l,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...qs()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=t,this.elementsWithTabbableControls=["iframe"]}activate(){je.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){je=je.filter(t=>t!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return je[je.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const t=As(this.element);if(!this.element.matches(":focus-within")){const e=t[0],i=t[t.length-1],s=this.tabDirection==="forward"?e:i;typeof(s==null?void 0:s.focus)=="function"&&(this.currentFocus=s,s.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(t){return this.elementsWithTabbableControls.includes(t.tagName.toLowerCase())||t.hasAttribute("controls")}},Ys=t=>{var e;const{activeElement:i}=document;i&&t.contains(i)&&((e=document.activeElement)==null||e.blur())};function Ao(t){return t.charAt(0).toUpperCase()+t.slice(1)}var pt=class extends P{constructor(){super(...arguments),this.hasSlotController=new qt(this,"footer"),this.localize=new st(this),this.modal=new kr(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=t=>{this.contained||t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Ye(this)))}disconnectedCallback(){super.disconnectedCallback(),Ke(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=H(this,"drawer.denyClose",{dir:this.localize.dir()});j(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;document.removeEventListener("keydown",this.handleDocumentKeyDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Ye(this));const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([q(this.drawer),q(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=H(this,`drawer.show${Ao(this.placement)}`,{dir:this.localize.dir()}),i=H(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([j(this.panel,e.keyframes,e.options),j(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Ys(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Ke(this)),await Promise.all([q(this.drawer),q(this.overlay)]);const t=H(this,`drawer.hide${Ao(this.placement)}`,{dir:this.localize.dir()}),e=H(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([j(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),j(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Ye(this)),this.open&&this.contained&&(this.modal.deactivate(),Ke(this))}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return u`
      <div
        part="base"
        class=${z({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":u`
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
    `}};pt.styles=[N,sl];pt.dependencies={"sl-icon-button":V};n([k(".drawer")],pt.prototype,"drawer",2);n([k(".drawer__panel")],pt.prototype,"panel",2);n([k(".drawer__overlay")],pt.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],pt.prototype,"open",2);n([c({reflect:!0})],pt.prototype,"label",2);n([c({reflect:!0})],pt.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],pt.prototype,"contained",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],pt.prototype,"noHeader",2);n([S("open",{waitUntilFirstUpdate:!0})],pt.prototype,"handleOpenChange",1);n([S("contained",{waitUntilFirstUpdate:!0})],pt.prototype,"handleNoModalChange",1);R("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});R("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});R("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});R("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});R("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});R("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});pt.define("sl-drawer");var cl=_`
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
`,Rt=class extends P{constructor(){super(...arguments),this.hasSlotController=new qt(this,"footer"),this.localize=new st(this),this.modal=new kr(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=t=>{t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Ye(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Ke(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=H(this,"dialog.denyClose",{dir:this.localize.dir()});j(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Ye(this);const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([q(this.dialog),q(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=H(this,"dialog.show",{dir:this.localize.dir()}),i=H(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([j(this.panel,e.keyframes,e.options),j(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Ys(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([q(this.dialog),q(this.overlay)]);const t=H(this,"dialog.hide",{dir:this.localize.dir()}),e=H(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([j(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),j(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Ke(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return u`
      <div
        part="base"
        class=${z({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":u`
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
    `}};Rt.styles=[N,cl];Rt.dependencies={"sl-icon-button":V};n([k(".dialog")],Rt.prototype,"dialog",2);n([k(".dialog__panel")],Rt.prototype,"panel",2);n([k(".dialog__overlay")],Rt.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],Rt.prototype,"open",2);n([c({reflect:!0})],Rt.prototype,"label",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],Rt.prototype,"noHeader",2);n([S("open",{waitUntilFirstUpdate:!0})],Rt.prototype,"handleOpenChange",1);R("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});R("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});R("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Rt.define("sl-dialog");var dl=_`
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
`,ni=class extends P{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return u`
      <span
        part="base"
        class=${z({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};ni.styles=[N,dl];n([c({reflect:!0})],ni.prototype,"variant",2);n([c({type:Boolean,reflect:!0})],ni.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],ni.prototype,"pulse",2);ni.define("sl-badge");var ul=_`
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
`,ft=class le extends P{constructor(){super(...arguments),this.hasSlotController=new qt(this,"icon","suffix"),this.localize=new st(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var e;(e=this.countdownAnimation)==null||e.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var e;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(e=this.countdownAnimation)==null||e.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:e}=this,i="100%",s="0";this.countdownAnimation=e.animate([{width:i},{width:s}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await q(this.base),this.base.hidden=!1;const{keyframes:e,options:i}=H(this,"alert.show",{dir:this.localize.dir()});await j(this.base,e,i),this.emit("sl-after-show")}else{Ys(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await q(this.base);const{keyframes:e,options:i}=H(this,"alert.hide",{dir:this.localize.dir()});await j(this.base,e,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}async toast(){return new Promise(e=>{this.handleCountdownChange(),le.toastStack.parentElement===null&&document.body.append(le.toastStack),le.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{le.toastStack.removeChild(this),e(),le.toastStack.querySelector("sl-alert")===null&&le.toastStack.remove()},{once:!0})})}render(){return u`
      <div
        part="base"
        class=${z({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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

        ${this.closable?u`
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

        ${this.countdown?u`
              <div
                class=${z({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};ft.styles=[N,ul];ft.dependencies={"sl-icon-button":V};n([k('[part~="base"]')],ft.prototype,"base",2);n([k(".alert__countdown-elapsed")],ft.prototype,"countdownElement",2);n([c({type:Boolean,reflect:!0})],ft.prototype,"open",2);n([c({type:Boolean,reflect:!0})],ft.prototype,"closable",2);n([c({reflect:!0})],ft.prototype,"variant",2);n([c({type:Number})],ft.prototype,"duration",2);n([c({type:String,reflect:!0})],ft.prototype,"countdown",2);n([y()],ft.prototype,"remainingTime",2);n([S("open",{waitUntilFirstUpdate:!0})],ft.prototype,"handleOpenChange",1);n([S("duration")],ft.prototype,"handleDurationChange",1);var hl=ft;R("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});hl.define("sl-alert");var pl=_`
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
`,A=class extends P{constructor(){super(...arguments),this.formControlController=new ri(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qt(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var t;super.disconnectedCallback(),this.input&&((t=this.resizeObserver)==null||t.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(t){if(t){typeof t.top=="number"&&(this.input.scrollTop=t.top),typeof t.left=="number"&&(this.input.scrollLeft=t.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,s="preserve"){const o=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,o,r,s),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,s=this.helpText?!0:!!e;return u`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${z({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${Ei(this.value)}
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
    `}};A.styles=[N,Wi,pl];n([k(".textarea__control")],A.prototype,"input",2);n([k(".textarea__size-adjuster")],A.prototype,"sizeAdjuster",2);n([y()],A.prototype,"hasFocus",2);n([c()],A.prototype,"title",2);n([c()],A.prototype,"name",2);n([c()],A.prototype,"value",2);n([c({reflect:!0})],A.prototype,"size",2);n([c({type:Boolean,reflect:!0})],A.prototype,"filled",2);n([c()],A.prototype,"label",2);n([c({attribute:"help-text"})],A.prototype,"helpText",2);n([c()],A.prototype,"placeholder",2);n([c({type:Number})],A.prototype,"rows",2);n([c()],A.prototype,"resize",2);n([c({type:Boolean,reflect:!0})],A.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],A.prototype,"readonly",2);n([c({reflect:!0})],A.prototype,"form",2);n([c({type:Boolean,reflect:!0})],A.prototype,"required",2);n([c({type:Number})],A.prototype,"minlength",2);n([c({type:Number})],A.prototype,"maxlength",2);n([c()],A.prototype,"autocapitalize",2);n([c()],A.prototype,"autocorrect",2);n([c()],A.prototype,"autocomplete",2);n([c({type:Boolean})],A.prototype,"autofocus",2);n([c()],A.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],A.prototype,"spellcheck",2);n([c()],A.prototype,"inputmode",2);n([Bs()],A.prototype,"defaultValue",2);n([S("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);n([S("rows",{waitUntilFirstUpdate:!0})],A.prototype,"handleRowsChange",1);n([S("value",{waitUntilFirstUpdate:!0})],A.prototype,"handleValueChange",1);A.define("sl-textarea");var fl=_`
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
`,ot=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=t=>{this.open&&t.key==="Escape"&&(t.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=t=>{var e;if(t.key==="Escape"&&this.open&&!this.closeWatcher){t.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(t.key==="Tab"){if(this.open&&((e=document.activeElement)==null?void 0:e.tagName.toLowerCase())==="sl-menu-item"){t.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(s,o)=>{if(!s)return null;const r=s.closest(o);if(r)return r;const a=s.getRootNode();return a instanceof ShadowRoot?i(a.host,o):null};setTimeout(()=>{var s;const o=((s=this.containingElement)==null?void 0:s.getRootNode())instanceof ShadowRoot?wr():document.activeElement;(!this.containingElement||i(o,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this.containingElement&&!e.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=t=>{const e=t.target;!this.stayOpenOnSelect&&e.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const t=this.trigger.assignedElements({flatten:!0})[0];typeof(t==null?void 0:t.focus)=="function"&&t.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(t=>t.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(t){if([" ","Enter"].includes(t.key)){t.preventDefault(),this.handleTriggerClick();return}const e=this.getMenu();if(e){const i=e.getAllItems(),s=i[0],o=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(t.key)&&(t.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(t.key==="ArrowDown"||t.key==="Home")&&(e.setCurrentItem(s),s.focus()),(t.key==="ArrowUp"||t.key==="End")&&(e.setCurrentItem(o),o.focus())}))}}handleTriggerKeyUp(t){t.key===" "&&t.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const e=this.trigger.assignedElements({flatten:!0}).find(s=>nl(s).start);let i;if(e){switch(e.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=e.button;break;default:i=e}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var t;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var t;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await q(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:t,options:e}=H(this,"dropdown.show",{dir:this.localize.dir()});await j(this.popup.popup,t,e),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await q(this);const{keyframes:t,options:e}=H(this,"dropdown.hide",{dir:this.localize.dir()});await j(this.popup.popup,t,e),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return u`
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
        class=${z({dropdown:!0,"dropdown--open":this.open})}
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
    `}};ot.styles=[N,fl];ot.dependencies={"sl-popup":L};n([k(".dropdown")],ot.prototype,"popup",2);n([k(".dropdown__trigger")],ot.prototype,"trigger",2);n([k(".dropdown__panel")],ot.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],ot.prototype,"open",2);n([c({reflect:!0})],ot.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],ot.prototype,"disabled",2);n([c({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],ot.prototype,"stayOpenOnSelect",2);n([c({attribute:!1})],ot.prototype,"containingElement",2);n([c({type:Number})],ot.prototype,"distance",2);n([c({type:Number})],ot.prototype,"skidding",2);n([c({type:Boolean})],ot.prototype,"hoist",2);n([c({reflect:!0})],ot.prototype,"sync",2);n([S("open",{waitUntilFirstUpdate:!0})],ot.prototype,"handleOpenChange",1);R("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});ot.define("sl-dropdown");var ml=_`
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
`,Ks=class extends P{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(t){const e=["menuitem","menuitemcheckbox"],i=t.composedPath(),s=i.find(l=>{var d;return e.includes(((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))||"")});if(!s||i.find(l=>{var d;return((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))==="menu"})!==this)return;const a=s;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(t){if(t.key==="Enter"||t.key===" "){const e=this.getCurrentItem();t.preventDefault(),t.stopPropagation(),e==null||e.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(t.key)){const e=this.getAllItems(),i=this.getCurrentItem();let s=i?e.indexOf(i):0;e.length>0&&(t.preventDefault(),t.stopPropagation(),t.key==="ArrowDown"?s++:t.key==="ArrowUp"?s--:t.key==="Home"?s=0:t.key==="End"&&(s=e.length-1),s<0&&(s=e.length-1),s>e.length-1&&(s=0),this.setCurrentItem(e[s]),e[s].focus())}}handleMouseDown(t){const e=t.target;this.isMenuItem(e)&&this.setCurrentItem(e)}handleSlotChange(){const t=this.getAllItems();t.length>0&&this.setCurrentItem(t[0])}isMenuItem(t){var e;return t.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((e=t.getAttribute("role"))!=null?e:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(t=>!(t.inert||!this.isMenuItem(t)))}getCurrentItem(){return this.getAllItems().find(t=>t.getAttribute("tabindex")==="0")}setCurrentItem(t){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===t?"0":"-1")})}render(){return u`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Ks.styles=[N,ml];n([k("slot")],Ks.prototype,"defaultSlot",2);Ks.define("sl-menu");var bl=_`
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
 */const Ge=(t,e)=>{var s;const i=t._$AN;if(i===void 0)return!1;for(const o of i)(s=o._$AO)==null||s.call(o,e,!1),Ge(o,e);return!0},zi=t=>{let e,i;do{if((e=t._$AM)===void 0)break;i=e._$AN,i.delete(t),t=e}while((i==null?void 0:i.size)===0)},_r=t=>{for(let e;e=t._$AM;t=e){let i=e._$AN;if(i===void 0)e._$AN=i=new Set;else if(i.has(t))break;i.add(t),yl(e)}};function gl(t){this._$AN!==void 0?(zi(this),this._$AM=t,_r(this)):this._$AM=t}function vl(t,e=!1,i=0){const s=this._$AH,o=this._$AN;if(o!==void 0&&o.size!==0)if(e)if(Array.isArray(s))for(let r=i;r<s.length;r++)Ge(s[r],!1),zi(s[r]);else s!=null&&(Ge(s,!1),zi(s));else Ge(this,t)}const yl=t=>{t.type==Ht.CHILD&&(t._$AP??(t._$AP=vl),t._$AQ??(t._$AQ=gl))};class wl extends Vi{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,i,s){super._$AT(e,i,s),_r(this),this.isConnected=e._$AU}_$AO(e,i=!0){var s,o;e!==this.isConnected&&(this.isConnected=e,e?(s=this.reconnected)==null||s.call(this):(o=this.disconnected)==null||o.call(this)),i&&(Ge(this,e),zi(this))}setValue(e){if(nr(this._$Ct))this._$Ct._$AI(e,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=e,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xl=()=>new kl;class kl{}const bs=new WeakMap,_l=Ui(class extends wl{render(t){return v}update(t,[e]){var s;const i=e!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=e,this.ht=(s=t.options)==null?void 0:s.host,this.rt(this.ct=t.element)),v}rt(t){if(this.isConnected||(t=void 0),typeof this.G=="function"){const e=this.ht??globalThis;let i=bs.get(e);i===void 0&&(i=new WeakMap,bs.set(e,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,t),t!==void 0&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){var t,e;return typeof this.G=="function"?(t=bs.get(this.ht??globalThis))==null?void 0:t.get(this.G):(e=this.G)==null?void 0:e.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var $l=class{constructor(t,e){this.popupRef=xl(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var s;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(s=i.target.role)!=null&&s.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),s=i==null?void 0:i.assignedElements({flatten:!0}).filter(h=>h.localName==="sl-menu")[0],o=getComputedStyle(this.host).direction==="rtl";if(!s)return;const{left:r,top:a,width:l,height:d}=s.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${o?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${o?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+d}px`)},(this.host=t).addController(this),this.hasSlotController=e}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(t){const e=this.host.renderRoot.querySelector("slot[name='submenu']");if(!e){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const s of e.assignedElements())if(i=s.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let s=1;s!==i.length;++s)i[s].setAttribute("tabindex","-1");this.popupRef.value&&(t.preventDefault(),t.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(t){this.popupRef.value&&this.popupRef.value.active!==t&&(this.popupRef.value.active=t,this.host.requestUpdate())}enableSubmenu(t=!0){t?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var t;if(!((t=this.host.parentElement)!=null&&t.computedStyleMap))return;const e=this.host.parentElement.computedStyleMap(),s=["padding-top","border-top-width","margin-top"].reduce((o,r)=>{var a;const l=(a=e.get(r))!=null?a:new CSSUnitValue(0,"px"),h=(l instanceof CSSUnitValue?l:new CSSUnitValue(0,"px")).to("px");return o-h.value},0);this.skidding=s}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const t=getComputedStyle(this.host).direction==="rtl";return this.isConnected?u`
      <sl-popup
        ${_l(this.popupRef)}
        placement=${t?"left-start":"right-start"}
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
    `:u` <slot name="submenu" hidden></slot> `}},mt=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new qt(this,"submenu"),this.submenuController=new $l(this,this.hasSlotController),this.handleHostClick=t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())},this.handleMouseOver=t=>{this.focus(),t.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const t=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=t;return}t!==this.cachedTextLabel&&(this.cachedTextLabel=t,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Oa(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const t=this.localize.dir()==="rtl",e=this.submenuController.isExpanded();return u`
      <div
        id="anchor"
        part="base"
        class=${z({"menu-item":!0,"menu-item--rtl":t,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":e})}
        ?aria-haspopup="${this.isSubmenu()}"
        ?aria-expanded="${!!e}"
      >
        <span part="checked-icon" class="menu-item__check">
          <sl-icon name="check" library="system" aria-hidden="true"></sl-icon>
        </span>

        <slot name="prefix" part="prefix" class="menu-item__prefix"></slot>

        <slot part="label" class="menu-item__label" @slotchange=${this.handleDefaultSlotChange}></slot>

        <slot name="suffix" part="suffix" class="menu-item__suffix"></slot>

        <span part="submenu-icon" class="menu-item__chevron">
          <sl-icon name=${t?"chevron-left":"chevron-right"} library="system" aria-hidden="true"></sl-icon>
        </span>

        ${this.submenuController.renderSubmenu()}
        ${this.loading?u` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};mt.styles=[N,bl];mt.dependencies={"sl-icon":X,"sl-popup":L,"sl-spinner":ji};n([k("slot:not([name])")],mt.prototype,"defaultSlot",2);n([k(".menu-item")],mt.prototype,"menuItem",2);n([c()],mt.prototype,"type",2);n([c({type:Boolean,reflect:!0})],mt.prototype,"checked",2);n([c()],mt.prototype,"value",2);n([c({type:Boolean,reflect:!0})],mt.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],mt.prototype,"disabled",2);n([S("checked")],mt.prototype,"handleCheckedChange",1);n([S("disabled")],mt.prototype,"handleDisabledChange",1);n([S("type")],mt.prototype,"handleTypeChange",1);mt.define("sl-menu-item");X.define("sl-icon");var Cl=_`
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
`,Qi=class extends P{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Qi.styles=[N,Cl];n([c({type:Boolean,reflect:!0})],Qi.prototype,"vertical",2);n([S("vertical")],Qi.prototype,"handleVerticalChange",1);Qi.define("sl-divider");var Sl=_`
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
`,Q=class extends P{constructor(){super(),this.localize=new st(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const t=So(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),t)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const t=So(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),t)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(t){return this.trigger.split(" ").includes(t)}async handleOpenChange(){var t,e;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await q(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:s}=H(this,"tooltip.show",{dir:this.localize.dir()});await j(this.popup.popup,i,s),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await q(this.body);const{keyframes:i,options:s}=H(this,"tooltip.hide",{dir:this.localize.dir()});await j(this.popup.popup,i,s),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return u`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${z({tooltip:!0,"tooltip--open":this.open})}
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
    `}};Q.styles=[N,Sl];Q.dependencies={"sl-popup":L};n([k("slot:not([name])")],Q.prototype,"defaultSlot",2);n([k(".tooltip__body")],Q.prototype,"body",2);n([k("sl-popup")],Q.prototype,"popup",2);n([c()],Q.prototype,"content",2);n([c()],Q.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],Q.prototype,"disabled",2);n([c({type:Number})],Q.prototype,"distance",2);n([c({type:Boolean,reflect:!0})],Q.prototype,"open",2);n([c({type:Number})],Q.prototype,"skidding",2);n([c()],Q.prototype,"trigger",2);n([c({type:Boolean})],Q.prototype,"hoist",2);n([S("open",{waitUntilFirstUpdate:!0})],Q.prototype,"handleOpenChange",1);n([S(["content","distance","hoist","placement","skidding"])],Q.prototype,"handleOptionsChange",1);n([S("disabled")],Q.prototype,"handleDisabledChange",1);R("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});R("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});Q.define("sl-tooltip");var Tl=_`
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
`,G=class extends P{constructor(){super(...arguments),this.formControlController=new ri(this,{value:t=>t.checked?t.value||"on":void 0,defaultValue:t=>t.defaultChecked,setValue:(t,e)=>t.checked=e}),this.hasSlotController=new qt(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(t){this.input.focus(t)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("help-text"),e=this.helpText?!0:!!t;return u`
      <div
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":e})}
      >
        <label
          part="base"
          class=${z({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${Ei(this.indeterminate)}
            .checked=${Ei(this.checked)}
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
            ${this.checked?u`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?u`
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
          aria-hidden=${e?"false":"true"}
          class="form-control__help-text"
          id="help-text"
          part="form-control-help-text"
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};G.styles=[N,Wi,Tl];G.dependencies={"sl-icon":X};n([k('input[type="checkbox"]')],G.prototype,"input",2);n([y()],G.prototype,"hasFocus",2);n([c()],G.prototype,"title",2);n([c()],G.prototype,"name",2);n([c()],G.prototype,"value",2);n([c({reflect:!0})],G.prototype,"size",2);n([c({type:Boolean,reflect:!0})],G.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],G.prototype,"checked",2);n([c({type:Boolean,reflect:!0})],G.prototype,"indeterminate",2);n([Bs("checked")],G.prototype,"defaultChecked",2);n([c({reflect:!0})],G.prototype,"form",2);n([c({type:Boolean,reflect:!0})],G.prototype,"required",2);n([c({attribute:"help-text"})],G.prototype,"helpText",2);n([S("disabled",{waitUntilFirstUpdate:!0})],G.prototype,"handleDisabledChange",1);n([S(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],G.prototype,"handleStateChange",1);G.define("sl-checkbox");var El=_`
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
`,Al=_`
  :host {
    display: contents;
  }
`,Ji=class extends P{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(t=>{this.emit("sl-resize",{detail:{entries:t}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const t=this.shadowRoot.querySelector("slot");if(t!==null){const e=t.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],e.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return u` <slot @slotchange=${this.handleSlotChange}></slot> `}};Ji.styles=[N,Al];n([c({type:Boolean,reflect:!0})],Ji.prototype,"disabled",2);n([S("disabled",{waitUntilFirstUpdate:!0})],Ji.prototype,"handleDisabledChange",1);var J=class extends P{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new st(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const t=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(e=>{const i=e.filter(({target:s})=>{if(s===this)return!0;if(s.closest("sl-tab-group")!==this)return!1;const o=s.tagName.toLowerCase();return o==="sl-tab"||o==="sl-tab-panel"});if(i.length!==0){if(i.some(s=>!["aria-labelledby","aria-controls"].includes(s.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(s=>s.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(s=>s.attributeName==="active")){const o=i.filter(r=>r.attributeName==="active"&&r.target.tagName.toLowerCase()==="sl-tab").map(r=>r.target).find(r=>r.active);o&&this.setActiveTab(o)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),t.then(()=>{new IntersectionObserver((i,s)=>{var o;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((o=this.getActiveTab())!=null?o:this.tabs[0],{emitEvents:!1}),s.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var t,e;super.disconnectedCallback(),(t=this.mutationObserver)==null||t.disconnect(),this.nav&&((e=this.resizeObserver)==null||e.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(t=>t.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(t=>t.active)}handleClick(t){const i=t.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(t){const i=t.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(t.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),t.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(t.key))){const o=this.tabs.find(l=>l.matches(":focus")),r=this.localize.dir()==="rtl";let a=null;if((o==null?void 0:o.tagName.toLowerCase())==="sl-tab"){if(t.key==="Home")a=this.focusableTabs[0];else if(t.key==="End")a=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&t.key===(r?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&t.key==="ArrowUp"){const l=this.tabs.findIndex(d=>d===o);a=this.findNextFocusableTab(l,"backward")}else if(["top","bottom"].includes(this.placement)&&t.key===(r?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&t.key==="ArrowDown"){const l=this.tabs.findIndex(d=>d===o);a=this.findNextFocusableTab(l,"forward")}if(!a)return;a.tabIndex=0,a.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(a,{scrollBehavior:"smooth"}):this.tabs.forEach(l=>{l.tabIndex=l===a?0:-1}),["top","bottom"].includes(this.placement)&&$s(a,this.nav,"horizontal"),t.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(t,e){if(e=Wt({emitEvents:!0,scrollBehavior:"auto"},e),t!==this.activeTab&&!t.disabled){const i=this.activeTab;this.activeTab=t,this.tabs.forEach(s=>{s.active=s===this.activeTab,s.tabIndex=s===this.activeTab?0:-1}),this.panels.forEach(s=>{var o;return s.active=s.name===((o=this.activeTab)==null?void 0:o.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&$s(this.activeTab,this.nav,"horizontal",e.scrollBehavior),e.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(t=>{const e=this.panels.find(i=>i.name===t.panel);e&&(t.setAttribute("aria-controls",e.getAttribute("id")),e.setAttribute("aria-labelledby",t.getAttribute("id")))})}repositionIndicator(){const t=this.getActiveTab();if(!t)return;const e=t.clientWidth,i=t.clientHeight,s=this.localize.dir()==="rtl",o=this.getAllTabs(),a=o.slice(0,o.indexOf(t)).reduce((l,d)=>({left:l.left+d.clientWidth,top:l.top+d.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${e}px`,this.indicator.style.height="auto",this.indicator.style.translate=s?`${-1*a.left}px`:`${a.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${a.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(t=>!t.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(t,e){let i=null;const s=e==="forward"?1:-1;let o=t+s;for(;t<this.tabs.length;){if(i=this.tabs[o]||null,i===null){e==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;o+=s}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(t){const e=this.tabs.find(i=>i.panel===t);e&&this.setActiveTab(e,{scrollBehavior:"smooth"})}render(){const t=this.localize.dir()==="rtl";return u`
      <div
        part="base"
        class=${z({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?u`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${z({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
                  name=${t?"chevron-right":"chevron-left"}
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

          ${this.hasScrollControls?u`
                <sl-icon-button
                  part="scroll-button scroll-button--end"
                  exportparts="base:scroll-button__base"
                  class=${z({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
                  name=${t?"chevron-left":"chevron-right"}
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
    `}};J.styles=[N,El];J.dependencies={"sl-icon-button":V,"sl-resize-observer":Ji};n([k(".tab-group")],J.prototype,"tabGroup",2);n([k(".tab-group__body")],J.prototype,"body",2);n([k(".tab-group__nav")],J.prototype,"nav",2);n([k(".tab-group__indicator")],J.prototype,"indicator",2);n([y()],J.prototype,"hasScrollControls",2);n([y()],J.prototype,"shouldHideScrollStartButton",2);n([y()],J.prototype,"shouldHideScrollEndButton",2);n([c()],J.prototype,"placement",2);n([c()],J.prototype,"activation",2);n([c({attribute:"no-scroll-controls",type:Boolean})],J.prototype,"noScrollControls",2);n([c({attribute:"fixed-scroll-controls",type:Boolean})],J.prototype,"fixedScrollControls",2);n([Ea({passive:!0})],J.prototype,"updateScrollButtons",1);n([S("noScrollControls",{waitUntilFirstUpdate:!0})],J.prototype,"updateScrollControls",1);n([S("placement",{waitUntilFirstUpdate:!0})],J.prototype,"syncIndicator",1);J.define("sl-tab-group");var Dl=(t,e)=>{let i=0;return function(...s){window.clearTimeout(i),i=window.setTimeout(()=>{t.call(this,...s)},e)}},Do=(t,e,i)=>{const s=t[e];t[e]=function(...o){s.call(this,...o),i.call(this,s,...o)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const e=new Set,i=new WeakMap,s=r=>{for(const a of r.changedTouches)e.add(a.identifier)},o=r=>{for(const a of r.changedTouches)e.delete(a.identifier)};document.addEventListener("touchstart",s,!0),document.addEventListener("touchend",o,!0),document.addEventListener("touchcancel",o,!0),Do(EventTarget.prototype,"addEventListener",function(r,a){if(a!=="scrollend")return;const l=Dl(()=>{e.size?l():this.dispatchEvent(new Event("scrollend"))},100);r.call(this,"scroll",l,{passive:!0}),i.set(this,l)}),Do(EventTarget.prototype,"removeEventListener",function(r,a){if(a!=="scrollend")return;const l=i.get(this);l&&r.call(this,"scroll",l,{passive:!0})})}})();var Ol=_`
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
`,zl=0,Et=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.attrId=++zl,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(t){t.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,u`
      <div
        part="base"
        class=${z({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
      >
        <slot></slot>
        ${this.closable?u`
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
    `}};Et.styles=[N,Ol];Et.dependencies={"sl-icon-button":V};n([k(".tab")],Et.prototype,"tab",2);n([c({reflect:!0})],Et.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],Et.prototype,"active",2);n([c({type:Boolean,reflect:!0})],Et.prototype,"closable",2);n([c({type:Boolean,reflect:!0})],Et.prototype,"disabled",2);n([c({type:Number,reflect:!0})],Et.prototype,"tabIndex",2);n([S("active")],Et.prototype,"handleActiveChange",1);n([S("disabled")],Et.prototype,"handleDisabledChange",1);Et.define("sl-tab");var Pl=_`
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
`,Ml=0,li=class extends P{constructor(){super(...arguments),this.attrId=++Ml,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return u`
      <slot
        part="base"
        class=${z({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};li.styles=[N,Pl];n([c({reflect:!0})],li.prototype,"name",2);n([c({type:Boolean,reflect:!0})],li.prototype,"active",2);n([S("active")],li.prototype,"handleActiveChange",1);li.define("sl-tab-panel");ji.define("sl-spinner");V.define("sl-icon-button");var Ll=_`
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
`,At=class extends P{constructor(){super(...arguments),this.localize=new st(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(t=>{for(const e of t)e.type==="attributes"&&e.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.detailsObserver)==null||t.disconnect()}handleSummaryClick(t){t.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(t){(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.open?this.hide():this.show()),(t.key==="ArrowUp"||t.key==="ArrowLeft")&&(t.preventDefault(),this.hide()),(t.key==="ArrowDown"||t.key==="ArrowRight")&&(t.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await q(this.body);const{keyframes:e,options:i}=H(this,"details.show",{dir:this.localize.dir()});await j(this.body,To(e,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await q(this.body);const{keyframes:e,options:i}=H(this,"details.hide",{dir:this.localize.dir()});await j(this.body,To(e,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,nt(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,nt(this,"sl-after-hide")}render(){const t=this.localize.dir()==="rtl";return u`
      <details
        part="base"
        class=${z({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":t})}
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
              <sl-icon library="system" name=${t?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
            <slot name="collapse-icon">
              <sl-icon library="system" name=${t?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
          </span>
        </summary>

        <div class="details__body" role="region" aria-labelledby="header">
          <slot part="content" id="content" class="details__content"></slot>
        </div>
      </details>
    `}};At.styles=[N,Ll];At.dependencies={"sl-icon":X};n([k(".details")],At.prototype,"details",2);n([k(".details__header")],At.prototype,"header",2);n([k(".details__body")],At.prototype,"body",2);n([k(".details__expand-icon-slot")],At.prototype,"expandIconSlot",2);n([c({type:Boolean,reflect:!0})],At.prototype,"open",2);n([c()],At.prototype,"summary",2);n([c({type:Boolean,reflect:!0})],At.prototype,"disabled",2);n([S("open",{waitUntilFirstUpdate:!0})],At.prototype,"handleOpenChange",1);R("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});R("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});At.define("sl-details");const Il="modulepreload",Rl=function(t,e){return new URL(t,e).href},Oo={},zo=function(e,i,s){let o=Promise.resolve();if(i&&i.length>0){const a=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),d=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));o=Promise.allSettled(i.map(h=>{if(h=Rl(h,s),h in Oo)return;Oo[h]=!0;const p=h.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(!!s)for(let b=a.length-1;b>=0;b--){const w=a[b];if(w.href===h&&(!p||w.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${f}`))return;const m=document.createElement("link");if(m.rel=p?"stylesheet":Il,p||(m.as="script"),m.crossOrigin="",m.href=h,d&&m.setAttribute("nonce",d),document.head.appendChild(m),p)return new Promise((b,w)=>{m.addEventListener("load",b),m.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${h}`)))})}))}function r(a){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=a,window.dispatchEvent(l),!l.defaultPrevented)throw a}return o.then(a=>{for(const l of a||[])l.status==="rejected"&&r(l.reason);return e().catch(r)})};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Nl=class extends Event{constructor(e,i,s,o){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i,this.callback=s,this.subscribe=o??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Fl{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,i=!1){const s=i||!Object.is(e,this.o);this.o=e,s&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:s}]of this.subscriptions)i(this.o,s)},e!==void 0&&(this.value=e)}addCallback(e,i,s){if(!s)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:i});const{disposer:o}=this.subscriptions.get(e);e(this.value,o)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Bl=class extends Event{constructor(e,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i}};class Po extends Fl{constructor(e,i,s){var o,r;super(i.context!==void 0?i.initialValue:s),this.onContextRequest=a=>{if(a.context!==this.context)return;const l=a.contextTarget??a.composedPath()[0];l!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,l,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const l=new Set;for(const[d,{consumerHost:h}]of this.subscriptions)l.has(d)||(l.add(d),h.dispatchEvent(new Nl(this.context,h,d,!0)));a.stopPropagation()},this.host=e,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(r=(o=this.host).addController)==null||r.call(o,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Bl(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Hl({context:t}){return(e,i)=>{const s=new WeakMap;if(typeof i=="object")return{get(){return e.get.call(this)},set(o){return s.get(this).setValue(o),e.set.call(this,o)},init(o){return s.set(this,new Po(this,{context:t,initialValue:o})),o}};{e.constructor.addInitializer(a=>{s.set(a,new Po(a,{context:t}))});const o=Object.getOwnPropertyDescriptor(e,i);let r;if(o===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(l){s.get(this).setValue(l),a.set(this,l)},configurable:!0,enumerable:!0}}else{const a=o.set;r={...o,set(l){s.get(this).setValue(l),a==null||a.call(this,l)}}}return void Object.defineProperty(e,i,r)}}}var at={},Zi={};Object.defineProperty(Zi,"__esModule",{value:!0});Zi.StoreController=void 0;class jl{constructor(e,i){this.host=e,this.atom=i,e.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var e;(e=this.unsubscribe)===null||e===void 0||e.call(this)}get value(){return this.atom.get()}}Zi.StoreController=jl;var Pe={};Object.defineProperty(Pe,"__esModule",{value:!0});Pe.MultiStoreController=void 0;class Ul{constructor(e,i){this.host=e,this.atoms=i,e.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(e=>e.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var e;(e=this.unsubscribes)===null||e===void 0||e.forEach(i=>i())}get values(){return this.atoms.map(e=>e.get())}}Pe.MultiStoreController=Ul;var ts={};Object.defineProperty(ts,"__esModule",{value:!0});ts.useStores=void 0;const Vl=Pe;function Wl(...t){return e=>class extends e{constructor(...i){super(...i),new Vl.MultiStoreController(this,t)}}}ts.useStores=Wl;var es={};Object.defineProperty(es,"__esModule",{value:!0});es.withStores=void 0;const ql=Pe,Yl=(t,e)=>class extends t{constructor(...s){super(...s),new ql.MultiStoreController(this,e)}};es.withStores=Yl;(function(t){Object.defineProperty(t,"__esModule",{value:!0}),t.withStores=t.useStores=t.MultiStoreController=t.StoreController=void 0;var e=Zi;Object.defineProperty(t,"StoreController",{enumerable:!0,get:function(){return e.StoreController}});var i=Pe;Object.defineProperty(t,"MultiStoreController",{enumerable:!0,get:function(){return i.MultiStoreController}});var s=ts;Object.defineProperty(t,"useStores",{enumerable:!0,get:function(){return s.useStores}});var o=es;Object.defineProperty(t,"withStores",{enumerable:!0,get:function(){return o.withStores}})})(at);const Kl=Symbol("board"),Gl={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let $t=[],Xt=0;const bi=4;let $i=0;const wt=t=>{let e=[],i={get(){return i.lc||i.listen(()=>{})(),i.value},lc:0,listen(s){return i.lc=e.push(s),()=>{for(let r=Xt+bi;r<$t.length;)$t[r]===s?$t.splice(r,bi):r+=bi;let o=e.indexOf(s);~o&&(e.splice(o,1),--i.lc||i.off())}},notify(s,o){$i++;let r=!$t.length;for(let a of e)$t.push(a,i.value,s,o);if(r){for(Xt=0;Xt<$t.length;Xt+=bi)$t[Xt]($t[Xt+1],$t[Xt+2],$t[Xt+3]);$t.length=0}},off(){},set(s){let o=i.value;o!==s&&(i.value=s,i.notify(o))},subscribe(s){let o=i.listen(s);return s(i.value),o},value:t};return i},Xl=5,gi=6,vi=10;let Ql=(t,e,i,s)=>(t.events=t.events||{},t.events[i+vi]||(t.events[i+vi]=s(o=>{t.events[i].reduceRight((r,a)=>(a(r),r),{shared:{},...o})})),t.events[i]=t.events[i]||[],t.events[i].push(e),()=>{let o=t.events[i],r=o.indexOf(e);o.splice(r,1),o.length||(delete t.events[i],t.events[i+vi](),delete t.events[i+vi])}),Jl=1e3,Zl=(t,e)=>Ql(t,s=>{let o=e(s);o&&t.events[gi].push(o)},Xl,s=>{let o=t.listen;t.listen=(...a)=>(!t.lc&&!t.active&&(t.active=!0,s()),o(...a));let r=t.off;return t.events[gi]=[],t.off=()=>{r(),setTimeout(()=>{if(t.active&&!t.lc){t.active=!1;for(let a of t.events[gi])a();t.events[gi]=[]}},Jl)},()=>{t.listen=o,t.off=r}}),tc=(t,e,i)=>{Array.isArray(t)||(t=[t]);let s,o,r=()=>{if(o===$i)return;o=$i;let h=t.map(p=>p.get());if(!s||h.some((p,f)=>p!==s[f])){s=h;let p=e(...h);p&&p.then&&p.t?p.then(f=>{s===h&&a.set(f)}):(a.set(p),o=$i)}},a=wt(void 0),l=a.get;a.get=()=>(r(),l());let d=r;return Zl(a,()=>{let h=t.map(p=>p.listen(d));return r(),()=>{for(let p of h)p()}}),a};const Me=(t,e)=>tc(t,e),ec=(t={})=>{let e=wt(t);return e.setKey=function(i,s){let o=e.value;typeof s>"u"&&i in e.value?(e.value={...e.value},delete e.value[i],e.notify(o,i)):e.value[i]!==s&&(e.value={...e.value,[i]:s},e.notify(o,i))},e},ic=wt(!1);function Mo(t){ic.set(t)}class $r extends Error{constructor(e,i,s){super(e),this.status=i,this.body=s,this.name="ApiError"}}function Pi(t){if(!t)return[];const e=[],i=t.split(`
`);for(const s of i){const o=s.trim();if(!o)continue;const r={text:o};if(o.length>=18&&o[4]==="-"&&o[7]==="-"&&o[10]===" "&&o[13]===":"){const a=o.indexOf(" - ",16);if(a!==-1){r.timestamp=o.slice(0,16);let l=o.slice(a+3);if(l.startsWith("(from: ")){const d=l.indexOf(") ");d!==-1?(r.author=l.slice(7,d),r.text=l.slice(d+2)):r.text=l}else r.text=l}}e.push(r)}return e}async function sc(t,e){const i=t.startsWith("/")?"./"+t.slice(1):t,s=await fetch(i,e);if(!s.ok){const o=await s.text();throw new $r(`API request failed: ${s.status} ${s.statusText}`,s.status,o)}return s.json()}async function oc(){return sc("/api/roadmap")}const Tt=ec({}),Mi=wt(null),Cr=wt(""),ci=wt(!0),is=wt(null),rc=Me(Tt,t=>Object.values(t)),ac=Me(Tt,t=>{const e=Date.now()-432e5;return Object.values(t).filter(i=>i.type!=="epic"?!1:i.status!=="closed"?!0:i.closed_at?new Date(i.closed_at).getTime()>e:!1).map(i=>({id:i.id,title:i.title}))}),ss=Me([Tt,Mi],(t,e)=>e&&t[e]||null),nc=Me(ss,t=>t?Pi(t.notes):[]),lc=Me([Tt,ss],(t,e)=>{var i;return(i=e==null?void 0:e.blocked_by)!=null&&i.length?e.blocked_by.map(s=>{const o=t[s];return o?{id:o.id,title:o.title,status:o.status}:null}).filter(s=>s!==null):[]}),cc=Me([Tt,ss],(t,e)=>{if(!(e!=null&&e.parent))return"";const i=t[e.parent];return(i==null?void 0:i.title)||""});function dc(t,e){return t.status==="closed"||!t.blocked_by||t.blocked_by.length===0?!1:t.blocked_by.some(i=>{const s=e[i];return s?s.status!=="closed":!1})}function Li(t,e={}){const i=dc(t,e);let s;return t.status==="closed"?s="done":i?s="blocked":t.awaiting?s="human":t.status==="in_progress"?s="agent":s="ready",{...t,is_blocked:i,column:s}}function uc(t){const e={};for(const s of t)e[s.id]=s;const i={};for(const s of t)i[s.id]=Li(s,e);Tt.set(i),ci.set(!1),is.set(null)}function hc(t){const e={};for(const[s,o]of t)e[s]=o;const i={};for(const[s,o]of t)i[s]=Li(o,e);Tt.set(i),ci.set(!1),is.set(null)}function xe(t){var a;const e=Tt.get(),i={};for(const[l,d]of Object.entries(e))i[l]=d;i[t.id]=t;const s=Li(t,i),o={...e};o[t.id]=s;const r=e[t.id];if((r==null?void 0:r.status)!==t.status)for(const[l,d]of Object.entries(e))l!==t.id&&(a=d.blocked_by)!=null&&a.includes(t.id)&&(o[l]=Li(d,i));Tt.set(o)}function pc(t){const e=Tt.get(),{[t]:i,...s}=e;Tt.set(s),Mi.get()===t&&Mi.set(null)}function ce(t){Mi.set(t)}function fc(t){Cr.set(t)}function Sr(t){ci.set(t)}function Ii(t){is.set(t),ci.set(!1)}const Tr=wt(null),Ds=wt(!1),Os=wt(null);async function Er(){Ds.set(!0),Os.set(null);try{const t=await oc();Tr.set(t)}catch(t){Os.set(t instanceof Error?t.message:String(t))}finally{Ds.set(!1)}}typeof window<"u"&&window.addEventListener("tick-update-for-roadmap",()=>{Er().catch(()=>{})});class Lo extends Error{constructor(e){super(e),this.name="ConnectionError"}}const mc="",Io=1e3,bc=3e4;class gc{constructor(e=mc){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.reconnectDelay=Io,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=e}async connect(){return this.disconnectMainSSE(),new Promise((e,i)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=Io,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),e()}),this.eventSource.addEventListener("update",s=>{this.handleUpdateEvent(s)}),this.eventSource.onerror=()=>{var o;console.log("[LocalComms] SSE connection error");const s=this.connected;this.connected=!1,s&&this.emitConnection({type:"connection:disconnected"}),(o=this.eventSource)==null||o.close(),this.eventSource=null,this.scheduleReconnect(),s||i(new Lo("Failed to connect to SSE endpoint"))}}catch(s){i(new Lo(`Failed to create EventSource: ${s}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(e=>{console.error("[LocalComms] Reconnect failed:",e)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,bc)}onTick(e){return this.tickHandlers.add(e),()=>this.tickHandlers.delete(e)}onConnection(e){return this.connectionHandlers.add(e),()=>this.connectionHandlers.delete(e)}async createTick(e){const i=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!i.ok)throw new Error(`Failed to create tick: ${i.statusText}`);return i.json()}async updateTick(e,i){const s=await fetch(`${this.baseUrl}/api/ticks/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!s.ok)throw new Error(`Failed to update tick: ${s.statusText}`);return s.json()}async deleteTick(e){const i=await fetch(`${this.baseUrl}/api/ticks/${e}`,{method:"DELETE"});if(!i.ok)throw new Error(`Failed to delete tick: ${i.statusText}`)}async addNote(e,i){const s=await fetch(`${this.baseUrl}/api/ticks/${e}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:i})});if(!s.ok)throw new Error(`Failed to add note: ${s.statusText}`);return s.json()}async approveTick(e){const i=await fetch(`${this.baseUrl}/api/ticks/${e}/approve`,{method:"POST"});if(!i.ok)throw new Error(`Failed to approve tick: ${i.statusText}`);return i.json()}async rejectTick(e,i){const s=await fetch(`${this.baseUrl}/api/ticks/${e}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!s.ok)throw new Error(`Failed to reject tick: ${s.statusText}`);return s.json()}async closeTick(e,i){const s=await fetch(`${this.baseUrl}/api/ticks/${e}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!s.ok)throw new Error(`Failed to close tick: ${s.statusText}`);return s.json()}async reopenTick(e){const i=await fetch(`${this.baseUrl}/api/ticks/${e}/reopen`,{method:"POST"});if(!i.ok)throw new Error(`Failed to reopen tick: ${i.statusText}`);return i.json()}async fetchTicks(){const e=await fetch(`${this.baseUrl}/api/ticks`);if(!e.ok)throw new Error(`Failed to fetch ticks: ${e.statusText}`);return(await e.json()).ticks.map(s=>({...s,is_blocked:s.isBlocked}))}async fetchInfo(){const e=await fetch(`${this.baseUrl}/api/info`);if(!e.ok)throw new Error(`Failed to fetch info: ${e.statusText}`);return e.json()}async fetchTick(e){const i=await fetch(`${this.baseUrl}/api/ticks/${e}`);if(!i.ok)throw new Error(`Failed to fetch tick: ${i.statusText}`);return i.json()}async fetchActivity(e){const i=e!==void 0?`${this.baseUrl}/api/activity?limit=${e}`:`${this.baseUrl}/api/activity`,s=await fetch(i);if(!s.ok)throw new Error(`Failed to fetch activity: ${s.statusText}`);return(await s.json()).activities}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(e){try{const i=JSON.parse(e.data);if(console.log("[LocalComms] Received update event:",i),i.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:s,tickId:o}=i;if(!o){console.warn("[LocalComms] Update event missing tickId:",i);return}s==="create"||s==="update"?this.fetchAndEmitTick(o):s==="delete"&&this.emitTick({type:"tick:deleted",tickId:o})}catch(i){console.error("[LocalComms] Failed to parse update event:",i)}}async fetchAndEmitTick(e){try{const i=await fetch(`${this.baseUrl}/api/ticks/${e}`);if(!i.ok)throw new Error(`HTTP ${i.status}`);const s=await i.json();this.emitTick({type:"tick:updated",tick:s})}catch(i){console.error(`[LocalComms] Failed to fetch tick ${e}:`,i),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${e}: ${i}`})}}emitTick(e){for(const i of this.tickHandlers)try{i(e)}catch(s){console.error("[LocalComms] Error in tick handler:",s)}}emitConnection(e){for(const i of this.connectionHandlers)try{i(e)}catch(s){console.error("[LocalComms] Error in connection handler:",s)}}}const ti=wt(null),Te=wt("disconnected");function vc(t){switch(t.type){case"tick:updated":console.log("[CommsStore] Tick updated:",t.tick.id),xe(t.tick),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",t.tickId),pc(t.tickId),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",t.ticks.size,"ticks"),hc(t.ticks),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function yc(t){switch(t.type){case"connection:connected":console.log("[CommsStore] Connected"),Te.set("connected"),Mo(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),Te.set("disconnected"),Mo(!1);break;case"connection:error":console.error("[CommsStore] Connection error:",t.message),Ii(t.message);break}}let Ro=!1,Ri=[];async function Gs(){Ar(),console.log("[CommsStore] Initializing local mode"),Te.set("connecting"),Sr(!0);const t=new gc;Ri.push(t.onTick(vc)),Ri.push(t.onConnection(yc)),ti.set(t);try{await t.connect(),console.log("[CommsStore] Local mode connected")}catch(e){console.error("[CommsStore] Failed to connect:",e),Ii(`Connection failed: ${e}`)}}async function wc(){await Gs()}function xc(){Ar(),Te.set("disconnected")}function Ar(){for(const e of Ri)e();Ri=[];const t=ti.get();t&&(t.disconnect(),ti.set(null))}function bt(){const t=ti.get();if(!t)throw new Error("CommsClient not initialized");return t}async function Dr(t){return bt().createTick(t)}async function Or(t,e){return bt().updateTick(t,e)}async function kc(t){return bt().deleteTick(t)}async function zr(t,e){return bt().addNote(t,e)}async function Pr(t){return bt().approveTick(t)}async function Mr(t,e){return bt().rejectTick(t,e)}async function Lr(t,e){return bt().closeTick(t,e)}async function Ir(t){return bt().reopenTick(t)}async function Rr(){return bt().fetchTicks()}async function Nr(){return bt().fetchInfo()}async function Xs(t){return bt().fetchTick(t)}async function Qs(t){return bt().fetchActivity(t)}function Fr(){if(Ro){console.log("[CommsStore] Already initialized, skipping");return}Ro=!0,Gs()}const No=Object.freeze(Object.defineProperty({__proto__:null,$commsClient:ti,$connectionStatus:Te,addNote:zr,approveTick:Pr,closeTick:Lr,createTick:Dr,deleteTick:kc,disconnectComms:xc,fetchActivity:Qs,fetchInfo:Nr,fetchTickDetails:Xs,fetchTicks:Rr,getCommsClient:bt,initComms:wc,initCommsAutoConnect:Fr,initLocalComms:Gs,rejectTick:Mr,reopenTick:Ir,updateTickViaComms:Or},Symbol.toStringTag,{value:"Module"}));var _c=Object.defineProperty,$c=Object.getOwnPropertyDescriptor,di=(t,e,i,s)=>{for(var o=s>1?void 0:s?$c(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&_c(e,i,o),o};let be=class extends Y{constructor(){super(...arguments),this.variant="primary",this.size="medium",this.disabled=!1,this.type="button"}handleClick(){if(this.type==="submit"){const t=this.closest("form");t&&t.requestSubmit()}}render(){return u`
      <button
        part="base"
        class="${this.variant} ${this.size}"
        ?disabled=${this.disabled}
        type="button"
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `}};be.styles=_`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      line-height: 1.4;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Primary - Ticks Green */
    button.primary {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    button.primary:hover:not(:disabled) {
      background: #b8e8b3;
    }

    button.primary:active:not(:disabled) {
      background: #96d991;
    }

    /* Secondary */
    button.secondary {
      background: var(--surface, #313244);
      color: var(--text, #cdd6f4);
    }

    button.secondary:hover:not(:disabled) {
      background: #3b3d50;
    }

    button.secondary:active:not(:disabled) {
      background: #2a2b3d;
    }

    /* Danger */
    button.danger {
      background: var(--red, #f38ba8);
      color: var(--crust, #11111b);
    }

    button.danger:hover:not(:disabled) {
      background: #f5a0b8;
    }

    button.danger:active:not(:disabled) {
      background: #f17898;
    }

    /* Ghost */
    button.ghost {
      background: transparent;
      color: var(--text, #cdd6f4);
    }

    button.ghost:hover:not(:disabled) {
      background: var(--surface, #313244);
    }

    /* Sizes */
    button.small {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    button.large {
      padding: 0.875rem 1.75rem;
      font-size: 1rem;
    }

    /* Full width */
    :host([full]) button {
      width: 100%;
    }
  `;di([c({type:String})],be.prototype,"variant",2);di([c({type:String})],be.prototype,"size",2);di([c({type:Boolean})],be.prototype,"disabled",2);di([c({type:String})],be.prototype,"type",2);be=di([ht("ticks-button")],be);var Cc=Object.defineProperty,Sc=Object.getOwnPropertyDescriptor,Js=(t,e,i,s)=>{for(var o=s>1?void 0:s?Sc(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&Cc(e,i,o),o};let ei=class extends Y{constructor(){super(...arguments),this.variant="info",this.closable=!1}handleClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}renderDefaultIcon(){switch(this.variant){case"success":return u`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;case"error":return u`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;case"warning":return u`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;case"info":return u`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`}}render(){return u`
      <div class="alert ${this.variant}" role="alert">
        <span class="icon">
          <slot name="icon">${this.renderDefaultIcon()}</slot>
        </span>
        <div class="content">
          <slot></slot>
        </div>
        ${this.closable?u`
          <button class="close-btn" @click=${this.handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `:""}
      </div>
    `}};ei.styles=_`
    :host {
      display: block;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .icon {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .close-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .close-btn svg {
      width: 1rem;
      height: 1rem;
    }

    /* Success variant */
    .alert.success {
      background: rgba(166, 227, 161, 0.15);
      color: var(--green, #a6e3a1);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .alert.success .close-btn {
      color: var(--green, #a6e3a1);
    }

    /* Error variant */
    .alert.error {
      background: rgba(243, 139, 168, 0.15);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .alert.error .close-btn {
      color: var(--red, #f38ba8);
    }

    /* Warning variant */
    .alert.warning {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .alert.warning .close-btn {
      color: var(--yellow, #f9e2af);
    }

    /* Info variant */
    .alert.info {
      background: rgba(137, 220, 235, 0.15);
      color: var(--blue, #89dceb);
      border: 1px solid rgba(137, 220, 235, 0.3);
    }

    .alert.info .close-btn {
      color: var(--blue, #89dceb);
    }
  `;Js([c({type:String})],ei.prototype,"variant",2);Js([c({type:Boolean})],ei.prototype,"closable",2);ei=Js([ht("ticks-alert")],ei);var Tc=Object.defineProperty,Ec=Object.getOwnPropertyDescriptor,os=(t,e,i,s)=>{for(var o=s>1?void 0:s?Ec(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&Tc(e,i,o),o};const Ac={done:"var(--green, #a6e3a1)",active:"var(--blue, #89b4fa)",ready:"var(--yellow, #f9e2af)",queued:"var(--surface2, #585b70)",gated:"var(--peach, #fab387)"},Dc={done:"Done",active:"Active",ready:"Needs planning",queued:"Queued",gated:"Gated"};let Ee=class extends Y{constructor(){super(...arguments),this.roadmap=null,this.loading=!1,this.error=null}_close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}_handleBackdropClick(t){t.target.classList.contains("overlay")&&this._close()}_handleEpicClick(t){ce(t),this._close()}_pct(t){return t.children_total===0?0:Math.round(t.children_closed/t.children_total*100)}_renderEpicCard(t){const e=Ac[t.status]??"var(--surface2)",i=this._pct(t);return u`
      <div
        class="epic-card"
        style="--accent-color: ${e}"
        @click=${()=>this._handleEpicClick(t.id)}
        role="button"
        tabindex="0"
        @keydown=${s=>{(s.key==="Enter"||s.key===" ")&&this._handleEpicClick(t.id)}}
        aria-label="Open epic ${t.id}: ${t.title}"
      >
        <div class="status-dot"></div>

        <div class="epic-info">
          <div class="epic-top">
            <span class="epic-id">${t.id}</span>
            <span class="epic-title">${t.title}</span>
          </div>

          <div class="badges">
            <span class="badge badge-status">${Dc[t.status]}</span>

            ${t.awaiting_type?u`<span class="badge badge-awaiting">⏳ ${t.awaiting_type}</span>`:v}

            ${t.blocked_by&&t.blocked_by.length>0?t.blocked_by.map(s=>u`
                  <span class="badge badge-blocked">⊘ ${s}</span>
                `):v}

            ${t.after&&t.after.length>0?t.after.map(s=>u`
                  <span class="badge badge-after">→ ${s}</span>
                `):v}
          </div>
        </div>

        <div class="progress-chip">
          <span class="progress-text">${t.children_closed}/${t.children_total}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${i}%"></div>
          </div>
        </div>
      </div>
    `}_renderWave(t,e){return u`
      <div class="wave-group">
        <div class="wave-label">Wave ${e+1}</div>
        ${t.map(i=>this._renderEpicCard(i))}
      </div>
    `}_renderBody(){var e;if(this.loading)return u`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;if(this.error)return u`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;const t=((e=this.roadmap)==null?void 0:e.waves)??null;return!t||t.length===0?u`<div class="state-box">No epics found — roadmap is empty.</div>`:u`
      <div class="body">
        ${t.map((i,s)=>this._renderWave(i,s))}
      </div>
    `}render(){return u`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="header-icon">🗺</div>
              <div>
                <div class="header-title">Roadmap</div>
                <div class="header-subtitle">Epic chains by dependency wave</div>
              </div>
            </div>
            <div class="header-right">
              <span class="kbd-hint">Press <kbd>m</kbd> or <kbd>Esc</kbd> to close</span>
              <button class="close-btn" @click=${this._close} aria-label="Close roadmap">✕</button>
            </div>
          </div>

          <!-- Body -->
          ${this._renderBody()}
        </div>
      </div>
    `}};Ee.styles=_`
    :host {
      display: block;
    }

    /* ── Overlay backdrop ───────────────────────────────────────────────── */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(17, 17, 27, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Container ──────────────────────────────────────────────────────── */
    .container {
      width: 100%;
      max-width: 860px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .header-subtitle {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .kbd-hint {
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .kbd-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    /* ── Body ───────────────────────────────────────────────────────────── */
    .body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── Loading / error / empty ────────────────────────────────────────── */
    .state-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.875rem;
      gap: 0.5rem;
    }

    .state-box.error {
      color: var(--red, #f38ba8);
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .spinner {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    /* ── Wave group ─────────────────────────────────────────────────────── */
    .wave-group {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .wave-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--subtext0, #a6adc8);
      padding-left: 0.25rem;
    }

    /* ── Epic card ──────────────────────────────────────────────────────── */
    .epic-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      position: relative;
    }

    .epic-card:hover {
      background: var(--surface1, #45475a);
      border-color: var(--overlay0, #6c7086);
    }

    /* Left accent bar (status colour) */
    .epic-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 8px 0 0 8px;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Status dot ─────────────────────────────────────────────────────── */
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Epic info ──────────────────────────────────────────────────────── */
    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      white-space: nowrap;
    }

    .epic-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    /* ── Badges row ─────────────────────────────────────────────────────── */
    .badges {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.375rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .badge-status {
      background: color-mix(in srgb, var(--accent-color, var(--surface2)) 20%, transparent);
      color: var(--accent-color, var(--subtext1, #bac2de));
      border: 1px solid color-mix(in srgb, var(--accent-color, var(--surface2)) 40%, transparent);
    }

    .badge-awaiting {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .badge-blocked {
      background: rgba(243, 139, 168, 0.12);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.25);
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    /* Soft-ordering (after) chip — deliberately muted vs the blocked chip:
       overlay/subtext tones, no alarm color. */
    .badge-after {
      background: color-mix(in srgb, var(--overlay0, #6c7086) 12%, transparent);
      color: var(--overlay2, #9399b2);
      border: 1px solid color-mix(in srgb, var(--overlay0, #6c7086) 30%, transparent);
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    /* ── Progress chip ──────────────────────────────────────────────────── */
    .progress-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .progress-text {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--accent-color, var(--surface2, #585b70));
      transition: width 0.3s ease;
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .body {
        padding: 1rem;
      }

      .progress-bar {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .container {
        border-radius: 0;
        min-height: 100vh;
      }
    }
  `;os([c({attribute:!1})],Ee.prototype,"roadmap",2);os([c({type:Boolean})],Ee.prototype,"loading",2);os([c({attribute:!1})],Ee.prototype,"error",2);Ee=os([ht("roadmap-view")],Ee);var Oc=Object.defineProperty,zc=Object.getOwnPropertyDescriptor,lt=(t,e,i,s)=>{for(var o=s>1?void 0:s?zc(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&Oc(e,i,o),o};console.log("[TickBoard] Initializing comms module");Fr();const gs=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],zt=["blocked","ready","agent","human","done"];let tt=class extends Y{constructor(){super(...arguments),this.boardState={...Gl},this.ticksController=new at.StoreController(this,rc),this.epicsController=new at.StoreController(this,ac),this.repoNameController=new at.StoreController(this,Cr),this.selectedTickController=new at.StoreController(this,ss),this.selectedTickNotesController=new at.StoreController(this,nc),this.selectedTickBlockersController=new at.StoreController(this,lc),this.selectedTickParentTitleController=new at.StoreController(this,cc),this.loadingController=new at.StoreController(this,ci),this.errorController=new at.StoreController(this,is),this.connectionStatusController=new at.StoreController(this,Te),this.roadmapController=new at.StoreController(this,Tr),this.roadmapLoadingController=new at.StoreController(this,Ds),this.roadmapErrorController=new at.StoreController(this,Os),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showDashboard=!1,this.dashboardActivities=[],this.showRoadmap=!1,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleKeyDown=t=>{if(!(this.loading||this.error||this.isInputFocused())&&!(this.showDashboard&&t.key!=="Escape"&&t.key!=="d"&&t.key!=="m"&&t.key!=="?")&&!(this.showRoadmap&&t.key!=="Escape"&&t.key!=="m"&&t.key!=="?"))switch(this.showKeyboardHelp&&t.key!=="?"&&(this.showKeyboardHelp=!1),t.key){case"?":t.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":t.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":t.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":t.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":t.preventDefault(),this.navigateHorizontal(1);break;case"Enter":t.preventDefault(),this.openFocusedTick();break;case"Escape":t.preventDefault(),this.handleEscape();break;case"n":t.preventDefault(),this.handleCreateClick();break;case"/":t.preventDefault(),this.focusSearchInput();break;case"d":!t.metaKey&&!t.ctrlKey&&!t.shiftKey&&!t.altKey&&(t.preventDefault(),this.toggleDashboard());break;case"m":!t.metaKey&&!t.ctrlKey&&!t.shiftKey&&!t.altKey&&(t.preventDefault(),this.toggleRoadmap());break}},this.handleMediaChange=t=>{this.isMobile=t.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get connectionStatus(){return this.connectionStatusController.value}get roadmapData(){return this.roadmapController.value}get roadmapLoading(){return this.roadmapLoadingController.value}get roadmapError(){return this.roadmapErrorController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.loadData()}async loadData(){Sr(!0),Ii(null);try{const[t,e]=await Promise.all([Rr(),Nr()]);uc(t),fc(e.repoName),this.updateBoardState()}catch(t){Ii(t instanceof Error?t.message:"Failed to load data"),console.error("Failed to load board data:",t)}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown)}isInputFocused(){var s;let t=document.activeElement;for(;(s=t==null?void 0:t.shadowRoot)!=null&&s.activeElement;)t=t.shadowRoot.activeElement;if(!t)return!1;const e=t.tagName.toLowerCase();if(e==="input"||e==="textarea"||e==="select"||t.getAttribute("contenteditable")==="true")return!0;let i=t;for(;i;){const o=i.tagName.toLowerCase();if(o.startsWith("sl-")&&(o.includes("input")||o.includes("textarea")||o.includes("select")))return!0;const r=i.getRootNode();i=r instanceof ShadowRoot?r.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=zt.length?[]:this.getColumnTicks(zt[this.focusedColumnIndex])}initializeFocus(){for(let t=0;t<zt.length;t++)if(this.getColumnTicks(zt[t]).length>0){this.focusedColumnIndex=t,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(t){if(this.focusedColumnIndex<0){this.initializeFocus();return}const e=this.getFocusedColumnTicks();if(e.length===0)return;let i=this.focusedTickIndex+t;i<0?i=e.length-1:i>=e.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(t){if(this.focusedColumnIndex<0){this.initializeFocus();return}let e=this.focusedColumnIndex+t;e<0?e=zt.length-1:e>=zt.length&&(e=0),this.focusedColumnIndex=e;const i=this.getColumnTicks(zt[e]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=zt[e],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const t=this.getFocusedColumnTicks();this.focusedTickIndex<t.length&&ce(t[this.focusedTickIndex].id)}handleEscape(){this.showRoadmap?this.showRoadmap=!1:this.showDashboard?this.showDashboard=!1:this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?ce(null):this.clearFocus()}async toggleDashboard(){if(this.showDashboard=!this.showDashboard,this.showDashboard)try{this.dashboardActivities=await Qs(20)}catch{this.dashboardActivities=[]}}async toggleRoadmap(){this.showRoadmap=!this.showRoadmap,this.showRoadmap&&await Er()}handleDashboardEpicSelect(t){this.selectedEpic=t.detail.epicId,this.showDashboard=!1,this.updateBoardState()}handleDashboardTickSelect(t){ce(t.detail.tickId),this.showDashboard=!1}async handleDashboardTickResume(t){var i,s;const{tickId:e}=t.detail;try{const o=await zo(()=>Promise.resolve().then(()=>No),void 0,import.meta.url).then(r=>r.approveTick(e));xe(o),(i=window.showToast)==null||i.call(window,{message:`Resumed tick ${e}`,variant:"success"})}catch(o){(s=window.showToast)==null||s.call(window,{message:`Failed to resume ${e}: ${o instanceof Error?o.message:o}`,variant:"danger"})}}async handleDashboardTickRetry(t){var i,s;const{tickId:e}=t.detail;try{const o=await zo(()=>Promise.resolve().then(()=>No),void 0,import.meta.url).then(r=>r.reopenTick(e));xe(o),(i=window.showToast)==null||i.call(window,{message:`Retrying tick ${e}`,variant:"success"})}catch(o){(s=window.showToast)==null||s.call(window,{message:`Failed to retry ${e}: ${o instanceof Error?o.message:o}`,variant:"danger"})}}focusSearchInput(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("tick-header");if(t!=null&&t.shadowRoot){const i=t.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const t=this.getFocusedColumnTicks();return this.focusedTickIndex<t.length?t[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(t){this.searchTerm=t.detail.value,this.updateBoardState()}handleEpicFilterChange(t){this.selectedEpic=t.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(t){var i;const{tick:e}=t.detail;xe(e),this.showCreateDialog=!1,this.updateBoardState(),(i=window.showToast)==null||i.call(window,{message:`Created tick ${e.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(t){const i=t.target.querySelector("sl-tab[active]");if(i){const s=i.getAttribute("panel");s&&zt.includes(s)&&(this.activeColumn=s,this.focusedColumnIndex=zt.indexOf(s),this.focusedTickIndex=this.getColumnTicks(s).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(t){const e=t.target;this.searchTerm=e.value,this.updateBoardState()}handleMobileEpicFilterChange(t){const e=t.target;this.selectedEpic=e.value,this.updateBoardState()}handleActivityClick(t){const e=t.detail.tickId,i=this.ticks.find(s=>s.id===e);i?ce(i.id):window.showToast&&window.showToast({message:`Tick ${e} not found in current view`,variant:"warning"})}async handleTickSelected(t){const e=t.detail.tick;ce(e.id);try{const i=await Xs(e.id);xe(i)}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){ce(null)}handleTickUpdated(t){const{tick:e}=t.detail;xe(e),this.updateBoardState()}getFilteredTicks(){let t=this.ticks;if(this.searchTerm){const e=this.searchTerm.toLowerCase();t=t.filter(i=>i.id.toLowerCase().includes(e)||i.title.toLowerCase().includes(e)||i.description&&i.description.toLowerCase().includes(e))}return this.selectedEpic&&(t=t.filter(e=>e.parent===this.selectedEpic)),t}getColumnTicks(t){return this.getFilteredTicks().filter(e=>e.column===t)}getEpicNames(){const t={};for(const e of this.epics)t[e.id]=e.title;return t}render(){if(this.loading)return u`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return u`
        <div class="error-state">
          <ticks-alert variant="error">
            <strong>Failed to load board</strong><br>
            ${this.error}
          </ticks-alert>
          <ticks-button variant="primary" @click=${this.loadData}>Retry</ticks-button>
        </div>
      `;const t=this.getEpicNames();return u`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        connection-status=${this.connectionStatus}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @dashboard-toggle=${this.toggleDashboard}
        @roadmap-toggle=${this.toggleRoadmap}
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

      <!-- Desktop/Tablet kanban board -->
      <div class="board-layout">
        <main>
          <div class="kanban-board">
            ${gs.map((e,i)=>u`
              <tick-column
                name=${e.id}
                .ticks=${this.getColumnTicks(e.id)}
                .epicNames=${t}
                focused-tick-id=${this.focusedColumnIndex===i?this.getFocusedTickId()??"":""}
                @tick-selected=${this.handleTickSelected}
              ></tick-column>
            `)}
          </div>
        </main>
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${gs.map(e=>u`
            <sl-tab
              slot="nav"
              panel=${e.id}
              ?active=${this.activeColumn===e.id}
            >
              ${e.icon}
              <span class="tab-badge">${this.getColumnTicks(e.id).length}</span>
            </sl-tab>
          `)}
          ${gs.map((e,i)=>u`
            <sl-tab-panel name=${e.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(e.id).length===0?u`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${e.icon}</div>
                        <div>No ticks in ${e.name}</div>
                      </div>
                    `:this.getColumnTicks(e.id).map(s=>u`
                      <tick-card
                        .tick=${s}
                        epic-name=${t[s.parent||""]||""}
                        ?focused=${this.focusedColumnIndex===i&&this.getFocusedTickId()===s.id}
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
              ${this.epics.map(e=>u`
                <sl-option value=${e.id}>
                  <span class="epic-id">${e.id}</span> - ${e.title}
                </sl-option>
              `)}
            </sl-select>
          </div>
        </div>
        <ticks-button
          slot="footer"
          variant="primary"
          @click=${()=>{this.showMobileFilterDrawer=!1}}
        >
          Apply
        </ticks-button>
      </sl-drawer>

      <!-- Tickflow Dashboard overlay -->
      <tickflow-dashboard
        ?open=${this.showDashboard}
        .ticks=${this.ticks}
        .epics=${this.epics}
        .activities=${this.dashboardActivities}
        repo-name=${this.repoName}
        @close=${()=>{this.showDashboard=!1}}
        @epic-select=${this.handleDashboardEpicSelect}
        @tick-select=${this.handleDashboardTickSelect}
        @tick-resume=${this.handleDashboardTickResume}
        @tick-retry=${this.handleDashboardTickRetry}
      ></tickflow-dashboard>

      <!-- Roadmap overlay -->
      ${this.showRoadmap?u`
        <roadmap-view
          .roadmap=${this.roadmapData??null}
          .loading=${this.roadmapLoading??!1}
          .error=${this.roadmapError??null}
          @close=${()=>{this.showRoadmap=!1}}
        ></roadmap-view>
      `:v}

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
              <kbd>d</kbd>
              <span>Toggle dashboard</span>
            </div>
            <div class="shortcut-row">
              <kbd>m</kbd>
              <span>Toggle roadmap</span>
            </div>
            <div class="shortcut-row">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Dashboard (when open)</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>k</kbd>
              <span>Navigate attention list</span>
            </div>
            <div class="shortcut-row">
              <kbd>Enter</kbd> <kbd>i</kbd>
              <span>Inspect tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>a</kbd>
              <span>Resume (approve) tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>t</kbd>
              <span>Retry (reopen) tick</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `}};tt.styles=_`
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
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
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
  `;lt([Hl({context:Kl}),y()],tt.prototype,"boardState",2);lt([y()],tt.prototype,"selectedEpic",2);lt([y()],tt.prototype,"searchTerm",2);lt([y()],tt.prototype,"activeColumn",2);lt([y()],tt.prototype,"isMobile",2);lt([y()],tt.prototype,"focusedColumnIndex",2);lt([y()],tt.prototype,"focusedTickIndex",2);lt([y()],tt.prototype,"showKeyboardHelp",2);lt([y()],tt.prototype,"showCreateDialog",2);lt([y()],tt.prototype,"showMobileFilterDrawer",2);lt([y()],tt.prototype,"showDashboard",2);lt([y()],tt.prototype,"dashboardActivities",2);lt([y()],tt.prototype,"showRoadmap",2);tt=lt([ht("tick-board")],tt);const Br=6048e5,Pc=864e5,Mc=6e4,Lc=36e5,yi=43200,Fo=1440,Bo=Symbol.for("constructDateFrom");function Ut(t,e){return typeof t=="function"?t(e):t&&typeof t=="object"&&Bo in t?t[Bo](e):t instanceof Date?new t.constructor(e):new Date(e)}function K(t,e){return Ut(e||t,t)}let Ic={};function ui(){return Ic}function ii(t,e){var l,d,h,p;const i=ui(),s=(e==null?void 0:e.weekStartsOn)??((d=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(h=i.locale)==null?void 0:h.options)==null?void 0:p.weekStartsOn)??0,o=K(t,e==null?void 0:e.in),r=o.getDay(),a=(r<s?7:0)+r-s;return o.setDate(o.getDate()-a),o.setHours(0,0,0,0),o}function Ni(t,e){return ii(t,{...e,weekStartsOn:1})}function Hr(t,e){const i=K(t,e==null?void 0:e.in),s=i.getFullYear(),o=Ut(i,0);o.setFullYear(s+1,0,4),o.setHours(0,0,0,0);const r=Ni(o),a=Ut(i,0);a.setFullYear(s,0,4),a.setHours(0,0,0,0);const l=Ni(a);return i.getTime()>=r.getTime()?s+1:i.getTime()>=l.getTime()?s:s-1}function Fi(t){const e=K(t),i=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));return i.setUTCFullYear(e.getFullYear()),+t-+i}function hi(t,...e){const i=Ut.bind(null,t||e.find(s=>typeof s=="object"));return e.map(i)}function Ho(t,e){const i=K(t,e==null?void 0:e.in);return i.setHours(0,0,0,0),i}function Rc(t,e,i){const[s,o]=hi(i==null?void 0:i.in,t,e),r=Ho(s),a=Ho(o),l=+r-Fi(r),d=+a-Fi(a);return Math.round((l-d)/Pc)}function Nc(t,e){const i=Hr(t,e),s=Ut(t,0);return s.setFullYear(i,0,4),s.setHours(0,0,0,0),Ni(s)}function Ci(t,e){const i=+K(t)-+K(e);return i<0?-1:i>0?1:i}function Fc(t){return Ut(t,Date.now())}function Bc(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function Hc(t){return!(!Bc(t)&&typeof t!="number"||isNaN(+K(t)))}function jc(t,e,i){const[s,o]=hi(i==null?void 0:i.in,t,e),r=s.getFullYear()-o.getFullYear(),a=s.getMonth()-o.getMonth();return r*12+a}function Zs(t){return e=>{const s=(t?Math[t]:Math.trunc)(e);return s===0?0:s}}function Uc(t,e,i){const[s,o]=hi(i==null?void 0:i.in,t,e),r=(+s-+o)/Lc;return Zs(i==null?void 0:i.roundingMethod)(r)}function jr(t,e){return+K(t)-+K(e)}function Vc(t,e,i){const s=jr(t,e)/Mc;return Zs(i==null?void 0:i.roundingMethod)(s)}function Wc(t,e){const i=K(t,e==null?void 0:e.in);return i.setHours(23,59,59,999),i}function qc(t,e){const i=K(t,e==null?void 0:e.in),s=i.getMonth();return i.setFullYear(i.getFullYear(),s+1,0),i.setHours(23,59,59,999),i}function Yc(t,e){const i=K(t,e==null?void 0:e.in);return+Wc(i,e)==+qc(i,e)}function Kc(t,e,i){const[s,o,r]=hi(i==null?void 0:i.in,t,t,e),a=Ci(o,r),l=Math.abs(jc(o,r));if(l<1)return 0;o.getMonth()===1&&o.getDate()>27&&o.setDate(30),o.setMonth(o.getMonth()-a*l);let d=Ci(o,r)===-a;Yc(s)&&l===1&&Ci(s,r)===1&&(d=!1);const h=a*(l-+d);return h===0?0:h}function Gc(t,e,i){const s=jr(t,e)/1e3;return Zs(i==null?void 0:i.roundingMethod)(s)}function Xc(t,e){const i=K(t,e==null?void 0:e.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}const Qc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Jc=(t,e,i)=>{let s;const o=Qc[t];return typeof o=="string"?s=o:e===1?s=o.one:s=o.other.replace("{{count}}",e.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+s:s+" ago":s};function vs(t){return(e={})=>{const i=e.width?String(e.width):t.defaultWidth;return t.formats[i]||t.formats[t.defaultWidth]}}const Zc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},td={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},ed={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},id={date:vs({formats:Zc,defaultWidth:"full"}),time:vs({formats:td,defaultWidth:"full"}),dateTime:vs({formats:ed,defaultWidth:"full"})},sd={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},od=(t,e,i,s)=>sd[t];function Ue(t){return(e,i)=>{const s=i!=null&&i.context?String(i.context):"standalone";let o;if(s==="formatting"&&t.formattingValues){const a=t.defaultFormattingWidth||t.defaultWidth,l=i!=null&&i.width?String(i.width):a;o=t.formattingValues[l]||t.formattingValues[a]}else{const a=t.defaultWidth,l=i!=null&&i.width?String(i.width):t.defaultWidth;o=t.values[l]||t.values[a]}const r=t.argumentCallback?t.argumentCallback(e):e;return o[r]}}const rd={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},ad={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},nd={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},ld={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},cd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},dd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},ud=(t,e)=>{const i=Number(t),s=i%100;if(s>20||s<10)switch(s%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},hd={ordinalNumber:ud,era:Ue({values:rd,defaultWidth:"wide"}),quarter:Ue({values:ad,defaultWidth:"wide",argumentCallback:t=>t-1}),month:Ue({values:nd,defaultWidth:"wide"}),day:Ue({values:ld,defaultWidth:"wide"}),dayPeriod:Ue({values:cd,defaultWidth:"wide",formattingValues:dd,defaultFormattingWidth:"wide"})};function Ve(t){return(e,i={})=>{const s=i.width,o=s&&t.matchPatterns[s]||t.matchPatterns[t.defaultMatchWidth],r=e.match(o);if(!r)return null;const a=r[0],l=s&&t.parsePatterns[s]||t.parsePatterns[t.defaultParseWidth],d=Array.isArray(l)?fd(l,f=>f.test(a)):pd(l,f=>f.test(a));let h;h=t.valueCallback?t.valueCallback(d):d,h=i.valueCallback?i.valueCallback(h):h;const p=e.slice(a.length);return{value:h,rest:p}}}function pd(t,e){for(const i in t)if(Object.prototype.hasOwnProperty.call(t,i)&&e(t[i]))return i}function fd(t,e){for(let i=0;i<t.length;i++)if(e(t[i]))return i}function md(t){return(e,i={})=>{const s=e.match(t.matchPattern);if(!s)return null;const o=s[0],r=e.match(t.parsePattern);if(!r)return null;let a=t.valueCallback?t.valueCallback(r[0]):r[0];a=i.valueCallback?i.valueCallback(a):a;const l=e.slice(o.length);return{value:a,rest:l}}}const bd=/^(\d+)(th|st|nd|rd)?/i,gd=/\d+/i,vd={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},yd={any:[/^b/i,/^(a|c)/i]},wd={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},xd={any:[/1/i,/2/i,/3/i,/4/i]},kd={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},_d={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},$d={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Cd={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Sd={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Td={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Ed={ordinalNumber:md({matchPattern:bd,parsePattern:gd,valueCallback:t=>parseInt(t,10)}),era:Ve({matchPatterns:vd,defaultMatchWidth:"wide",parsePatterns:yd,defaultParseWidth:"any"}),quarter:Ve({matchPatterns:wd,defaultMatchWidth:"wide",parsePatterns:xd,defaultParseWidth:"any",valueCallback:t=>t+1}),month:Ve({matchPatterns:kd,defaultMatchWidth:"wide",parsePatterns:_d,defaultParseWidth:"any"}),day:Ve({matchPatterns:$d,defaultMatchWidth:"wide",parsePatterns:Cd,defaultParseWidth:"any"}),dayPeriod:Ve({matchPatterns:Sd,defaultMatchWidth:"any",parsePatterns:Td,defaultParseWidth:"any"})},Ur={code:"en-US",formatDistance:Jc,formatLong:id,formatRelative:od,localize:hd,match:Ed,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Ad(t,e){const i=K(t,e==null?void 0:e.in);return Rc(i,Xc(i))+1}function Dd(t,e){const i=K(t,e==null?void 0:e.in),s=+Ni(i)-+Nc(i);return Math.round(s/Br)+1}function Vr(t,e){var p,f,g,m;const i=K(t,e==null?void 0:e.in),s=i.getFullYear(),o=ui(),r=(e==null?void 0:e.firstWeekContainsDate)??((f=(p=e==null?void 0:e.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??o.firstWeekContainsDate??((m=(g=o.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,a=Ut((e==null?void 0:e.in)||t,0);a.setFullYear(s+1,0,r),a.setHours(0,0,0,0);const l=ii(a,e),d=Ut((e==null?void 0:e.in)||t,0);d.setFullYear(s,0,r),d.setHours(0,0,0,0);const h=ii(d,e);return+i>=+l?s+1:+i>=+h?s:s-1}function Od(t,e){var l,d,h,p;const i=ui(),s=(e==null?void 0:e.firstWeekContainsDate)??((d=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(h=i.locale)==null?void 0:h.options)==null?void 0:p.firstWeekContainsDate)??1,o=Vr(t,e),r=Ut((e==null?void 0:e.in)||t,0);return r.setFullYear(o,0,s),r.setHours(0,0,0,0),ii(r,e)}function zd(t,e){const i=K(t,e==null?void 0:e.in),s=+ii(i,e)-+Od(i,e);return Math.round(s/Br)+1}function O(t,e){const i=t<0?"-":"",s=Math.abs(t).toString().padStart(e,"0");return i+s}const Qt={y(t,e){const i=t.getFullYear(),s=i>0?i:1-i;return O(e==="yy"?s%100:s,e.length)},M(t,e){const i=t.getMonth();return e==="M"?String(i+1):O(i+1,2)},d(t,e){return O(t.getDate(),e.length)},a(t,e){const i=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(t,e){return O(t.getHours()%12||12,e.length)},H(t,e){return O(t.getHours(),e.length)},m(t,e){return O(t.getMinutes(),e.length)},s(t,e){return O(t.getSeconds(),e.length)},S(t,e){const i=e.length,s=t.getMilliseconds(),o=Math.trunc(s*Math.pow(10,i-3));return O(o,e.length)}},ye={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},jo={G:function(t,e,i){const s=t.getFullYear()>0?1:0;switch(e){case"G":case"GG":case"GGG":return i.era(s,{width:"abbreviated"});case"GGGGG":return i.era(s,{width:"narrow"});case"GGGG":default:return i.era(s,{width:"wide"})}},y:function(t,e,i){if(e==="yo"){const s=t.getFullYear(),o=s>0?s:1-s;return i.ordinalNumber(o,{unit:"year"})}return Qt.y(t,e)},Y:function(t,e,i,s){const o=Vr(t,s),r=o>0?o:1-o;if(e==="YY"){const a=r%100;return O(a,2)}return e==="Yo"?i.ordinalNumber(r,{unit:"year"}):O(r,e.length)},R:function(t,e){const i=Hr(t);return O(i,e.length)},u:function(t,e){const i=t.getFullYear();return O(i,e.length)},Q:function(t,e,i){const s=Math.ceil((t.getMonth()+1)/3);switch(e){case"Q":return String(s);case"QQ":return O(s,2);case"Qo":return i.ordinalNumber(s,{unit:"quarter"});case"QQQ":return i.quarter(s,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(s,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(s,{width:"wide",context:"formatting"})}},q:function(t,e,i){const s=Math.ceil((t.getMonth()+1)/3);switch(e){case"q":return String(s);case"qq":return O(s,2);case"qo":return i.ordinalNumber(s,{unit:"quarter"});case"qqq":return i.quarter(s,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(s,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(s,{width:"wide",context:"standalone"})}},M:function(t,e,i){const s=t.getMonth();switch(e){case"M":case"MM":return Qt.M(t,e);case"Mo":return i.ordinalNumber(s+1,{unit:"month"});case"MMM":return i.month(s,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(s,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(s,{width:"wide",context:"formatting"})}},L:function(t,e,i){const s=t.getMonth();switch(e){case"L":return String(s+1);case"LL":return O(s+1,2);case"Lo":return i.ordinalNumber(s+1,{unit:"month"});case"LLL":return i.month(s,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(s,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(s,{width:"wide",context:"standalone"})}},w:function(t,e,i,s){const o=zd(t,s);return e==="wo"?i.ordinalNumber(o,{unit:"week"}):O(o,e.length)},I:function(t,e,i){const s=Dd(t);return e==="Io"?i.ordinalNumber(s,{unit:"week"}):O(s,e.length)},d:function(t,e,i){return e==="do"?i.ordinalNumber(t.getDate(),{unit:"date"}):Qt.d(t,e)},D:function(t,e,i){const s=Ad(t);return e==="Do"?i.ordinalNumber(s,{unit:"dayOfYear"}):O(s,e.length)},E:function(t,e,i){const s=t.getDay();switch(e){case"E":case"EE":case"EEE":return i.day(s,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(s,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(s,{width:"short",context:"formatting"});case"EEEE":default:return i.day(s,{width:"wide",context:"formatting"})}},e:function(t,e,i,s){const o=t.getDay(),r=(o-s.weekStartsOn+8)%7||7;switch(e){case"e":return String(r);case"ee":return O(r,2);case"eo":return i.ordinalNumber(r,{unit:"day"});case"eee":return i.day(o,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(o,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(o,{width:"short",context:"formatting"});case"eeee":default:return i.day(o,{width:"wide",context:"formatting"})}},c:function(t,e,i,s){const o=t.getDay(),r=(o-s.weekStartsOn+8)%7||7;switch(e){case"c":return String(r);case"cc":return O(r,e.length);case"co":return i.ordinalNumber(r,{unit:"day"});case"ccc":return i.day(o,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(o,{width:"narrow",context:"standalone"});case"cccccc":return i.day(o,{width:"short",context:"standalone"});case"cccc":default:return i.day(o,{width:"wide",context:"standalone"})}},i:function(t,e,i){const s=t.getDay(),o=s===0?7:s;switch(e){case"i":return String(o);case"ii":return O(o,e.length);case"io":return i.ordinalNumber(o,{unit:"day"});case"iii":return i.day(s,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(s,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(s,{width:"short",context:"formatting"});case"iiii":default:return i.day(s,{width:"wide",context:"formatting"})}},a:function(t,e,i){const o=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.dayPeriod(o,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(o,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(o,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(o,{width:"wide",context:"formatting"})}},b:function(t,e,i){const s=t.getHours();let o;switch(s===12?o=ye.noon:s===0?o=ye.midnight:o=s/12>=1?"pm":"am",e){case"b":case"bb":return i.dayPeriod(o,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(o,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(o,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(o,{width:"wide",context:"formatting"})}},B:function(t,e,i){const s=t.getHours();let o;switch(s>=17?o=ye.evening:s>=12?o=ye.afternoon:s>=4?o=ye.morning:o=ye.night,e){case"B":case"BB":case"BBB":return i.dayPeriod(o,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(o,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(o,{width:"wide",context:"formatting"})}},h:function(t,e,i){if(e==="ho"){let s=t.getHours()%12;return s===0&&(s=12),i.ordinalNumber(s,{unit:"hour"})}return Qt.h(t,e)},H:function(t,e,i){return e==="Ho"?i.ordinalNumber(t.getHours(),{unit:"hour"}):Qt.H(t,e)},K:function(t,e,i){const s=t.getHours()%12;return e==="Ko"?i.ordinalNumber(s,{unit:"hour"}):O(s,e.length)},k:function(t,e,i){let s=t.getHours();return s===0&&(s=24),e==="ko"?i.ordinalNumber(s,{unit:"hour"}):O(s,e.length)},m:function(t,e,i){return e==="mo"?i.ordinalNumber(t.getMinutes(),{unit:"minute"}):Qt.m(t,e)},s:function(t,e,i){return e==="so"?i.ordinalNumber(t.getSeconds(),{unit:"second"}):Qt.s(t,e)},S:function(t,e){return Qt.S(t,e)},X:function(t,e,i){const s=t.getTimezoneOffset();if(s===0)return"Z";switch(e){case"X":return Vo(s);case"XXXX":case"XX":return de(s);case"XXXXX":case"XXX":default:return de(s,":")}},x:function(t,e,i){const s=t.getTimezoneOffset();switch(e){case"x":return Vo(s);case"xxxx":case"xx":return de(s);case"xxxxx":case"xxx":default:return de(s,":")}},O:function(t,e,i){const s=t.getTimezoneOffset();switch(e){case"O":case"OO":case"OOO":return"GMT"+Uo(s,":");case"OOOO":default:return"GMT"+de(s,":")}},z:function(t,e,i){const s=t.getTimezoneOffset();switch(e){case"z":case"zz":case"zzz":return"GMT"+Uo(s,":");case"zzzz":default:return"GMT"+de(s,":")}},t:function(t,e,i){const s=Math.trunc(+t/1e3);return O(s,e.length)},T:function(t,e,i){return O(+t,e.length)}};function Uo(t,e=""){const i=t>0?"-":"+",s=Math.abs(t),o=Math.trunc(s/60),r=s%60;return r===0?i+String(o):i+String(o)+e+O(r,2)}function Vo(t,e){return t%60===0?(t>0?"-":"+")+O(Math.abs(t)/60,2):de(t,e)}function de(t,e=""){const i=t>0?"-":"+",s=Math.abs(t),o=O(Math.trunc(s/60),2),r=O(s%60,2);return i+o+e+r}const Wo=(t,e)=>{switch(t){case"P":return e.date({width:"short"});case"PP":return e.date({width:"medium"});case"PPP":return e.date({width:"long"});case"PPPP":default:return e.date({width:"full"})}},Wr=(t,e)=>{switch(t){case"p":return e.time({width:"short"});case"pp":return e.time({width:"medium"});case"ppp":return e.time({width:"long"});case"pppp":default:return e.time({width:"full"})}},Pd=(t,e)=>{const i=t.match(/(P+)(p+)?/)||[],s=i[1],o=i[2];if(!o)return Wo(t,e);let r;switch(s){case"P":r=e.dateTime({width:"short"});break;case"PP":r=e.dateTime({width:"medium"});break;case"PPP":r=e.dateTime({width:"long"});break;case"PPPP":default:r=e.dateTime({width:"full"});break}return r.replace("{{date}}",Wo(s,e)).replace("{{time}}",Wr(o,e))},Md={p:Wr,P:Pd},Ld=/^D+$/,Id=/^Y+$/,Rd=["D","DD","YY","YYYY"];function Nd(t){return Ld.test(t)}function Fd(t){return Id.test(t)}function Bd(t,e,i){const s=Hd(t,e,i);if(console.warn(s),Rd.includes(t))throw new RangeError(s)}function Hd(t,e,i){const s=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${e}\`) for formatting ${s} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const jd=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Ud=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Vd=/^'([^]*?)'?$/,Wd=/''/g,qd=/[a-zA-Z]/;function Yd(t,e,i){var p,f,g,m;const s=ui(),o=s.locale??Ur,r=s.firstWeekContainsDate??((f=(p=s.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??1,a=s.weekStartsOn??((m=(g=s.locale)==null?void 0:g.options)==null?void 0:m.weekStartsOn)??0,l=K(t,i==null?void 0:i.in);if(!Hc(l))throw new RangeError("Invalid time value");let d=e.match(Ud).map(b=>{const w=b[0];if(w==="p"||w==="P"){const C=Md[w];return C(b,o.formatLong)}return b}).join("").match(jd).map(b=>{if(b==="''")return{isToken:!1,value:"'"};const w=b[0];if(w==="'")return{isToken:!1,value:Kd(b)};if(jo[w])return{isToken:!0,value:b};if(w.match(qd))throw new RangeError("Format string contains an unescaped latin alphabet character `"+w+"`");return{isToken:!1,value:b}});o.localize.preprocessor&&(d=o.localize.preprocessor(l,d));const h={firstWeekContainsDate:r,weekStartsOn:a,locale:o};return d.map(b=>{if(!b.isToken)return b.value;const w=b.value;(Fd(w)||Nd(w))&&Bd(w,e,String(t));const C=jo[w[0]];return C(l,w,o.localize,h)}).join("")}function Kd(t){const e=t.match(Vd);return e?e[1].replace(Wd,"'"):t}function Gd(t,e,i){const s=ui(),o=(i==null?void 0:i.locale)??s.locale??Ur,r=2520,a=Ci(t,e);if(isNaN(a))throw new RangeError("Invalid time value");const l=Object.assign({},i,{addSuffix:i==null?void 0:i.addSuffix,comparison:a}),[d,h]=hi(i==null?void 0:i.in,...a>0?[e,t]:[t,e]),p=Gc(h,d),f=(Fi(h)-Fi(d))/1e3,g=Math.round((p-f)/60);let m;if(g<2)return i!=null&&i.includeSeconds?p<5?o.formatDistance("lessThanXSeconds",5,l):p<10?o.formatDistance("lessThanXSeconds",10,l):p<20?o.formatDistance("lessThanXSeconds",20,l):p<40?o.formatDistance("halfAMinute",0,l):p<60?o.formatDistance("lessThanXMinutes",1,l):o.formatDistance("xMinutes",1,l):g===0?o.formatDistance("lessThanXMinutes",1,l):o.formatDistance("xMinutes",g,l);if(g<45)return o.formatDistance("xMinutes",g,l);if(g<90)return o.formatDistance("aboutXHours",1,l);if(g<Fo){const b=Math.round(g/60);return o.formatDistance("aboutXHours",b,l)}else{if(g<r)return o.formatDistance("xDays",1,l);if(g<yi){const b=Math.round(g/Fo);return o.formatDistance("xDays",b,l)}else if(g<yi*2)return m=Math.round(g/yi),o.formatDistance("aboutXMonths",m,l)}if(m=Kc(h,d),m<12){const b=Math.round(g/yi);return o.formatDistance("xMonths",b,l)}else{const b=m%12,w=Math.trunc(m/12);return b<3?o.formatDistance("aboutXYears",w,l):b<9?o.formatDistance("overXYears",w,l):o.formatDistance("almostXYears",w+1,l)}}function Xd(t,e){return Gd(t,Fc(t),e)}var Qd=Object.defineProperty,Jd=Object.getOwnPropertyDescriptor,ve=(t,e,i,s)=>{for(var o=s>1?void 0:s?Jd(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&Qd(e,i,o),o};const qo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Zd={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let Vt=class extends Y{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(t){t.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),t.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var r;if(((r=this.tick)==null?void 0:r.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const t=new Date(this.tick.started_at),e=new Date,i=Vc(e,t),s=Uc(e,t),o=i%60;s>0?this.elapsedTime=`${s}h ${o}m`:this.elapsedTime=`${i}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return qo[this.tick.priority]??qo[2]}getPriorityLabel(){return Zd[this.tick.priority]??"Unknown"}renderElapsedBadge(){if(!this.elapsedTime||!this.tick.started_at)return null;const t=new Date(this.tick.started_at).toLocaleString();return u`
      <sl-tooltip content="Started: ${t}">
        <span class="meta-badge elapsed-time">⏱ ${this.elapsedTime}</span>
      </sl-tooltip>
    `}render(){const{tick:t,selected:e,focused:i,epicName:s}=this;return u`
      <div
        class="card ${e?"selected":""} ${i?"focused":""}"
        @click=${this.handleClick}
        role="button"
        tabindex=${i?"0":"-1"}
        aria-label="Tick ${t.id}: ${t.title}"
      >
        <div class="card-header">
          <sl-tooltip content="Priority: ${this.getPriorityLabel()}" placement="left">
            <div
              class="priority-indicator"
              style="background-color: ${this.getPriorityColor()}"
            ></div>
          </sl-tooltip>
          <div class="header-content">
            <div class="tick-id">${t.id}</div>
            <h4 class="tick-title">${t.title}</h4>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-badge type-badge type-${t.type}">${t.type}</span>
          <span class="meta-badge status-${t.status}">${t.status.replace("_"," ")}</span>
          ${t.is_blocked?u`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${t.manual?u`<span class="meta-badge manual">👤 manual</span>`:null}
          ${t.awaiting?u`<span class="meta-badge awaiting">⏳ ${t.awaiting}</span>`:null}
          ${this.renderElapsedBadge()}
        </div>

        ${s?u`<div class="epic-name">${s}</div>`:null}
      </div>
    `}};Vt.styles=_`
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

    .meta-badge.elapsed-time {
      background: rgba(250, 179, 135, 0.15);
      color: var(--peach);
    }
  `;ve([c({attribute:!1})],Vt.prototype,"tick",2);ve([c({type:Boolean})],Vt.prototype,"selected",2);ve([c({type:Boolean})],Vt.prototype,"focused",2);ve([c({type:String,attribute:"epic-name"})],Vt.prototype,"epicName",2);ve([k(".card")],Vt.prototype,"cardElement",2);ve([y()],Vt.prototype,"elapsedTime",2);Vt=ve([ht("tick-card")],Vt);var tu=Object.defineProperty,eu=Object.getOwnPropertyDescriptor,Le=(t,e,i,s)=>{for(var o=s>1?void 0:s?eu(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&tu(e,i,o),o};const iu={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},su={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},ou={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let se=class extends Y{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||iu[this.name]||"var(--blue)"}getColumnDisplayName(){return su[this.name]||this.name}getColumnIcon(){return ou[this.name]||"•"}handleTickSelected(t){this.dispatchEvent(new CustomEvent("tick-selected",{detail:t.detail,bubbles:!0,composed:!0}))}render(){const t=this.getColumnColor(),e=this.getColumnDisplayName(),i=this.getColumnIcon(),s=this.ticks.length;return u`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${t}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${t}">${i}</span>
            ${e}
          </span>
          <span class="column-count">${s}</span>
        </div>
      </div>

      <div class="column-content">
        ${s===0?u`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(o=>u`
                <tick-card
                  .tick=${o}
                  epic-name=${this.epicNames[o.parent||""]||""}
                  ?focused=${this.focusedTickId===o.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};se.styles=_`
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
  `;Le([c({type:String})],se.prototype,"name",2);Le([c({type:String})],se.prototype,"color",2);Le([c({attribute:!1})],se.prototype,"ticks",2);Le([c({type:Object,attribute:!1})],se.prototype,"epicNames",2);Le([c({type:String,attribute:"focused-tick-id"})],se.prototype,"focusedTickId",2);se=Le([ht("tick-column")],se);var ru=Object.defineProperty,au=Object.getOwnPropertyDescriptor,rs=(t,e,i,s)=>{for(var o=s>1?void 0:s?au(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&ru(e,i,o),o};let Ae=class extends Y{constructor(){super(...arguments),this.variant="logotype",this.href="",this.size=28}renderLogotype(){const t=`glow-logotype-${Math.random().toString(36).substr(2,9)}`;return u`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" role="img" aria-label="ticks"
           style="height: ${this.size}px; width: auto;">
        <defs>
          <filter id="${t}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <text x="60" y="20"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="28"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${t})">ticks</text>
      </svg>
    `}renderIcon(){const t=`glow-icon-${Math.random().toString(36).substr(2,9)}`;return u`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="tk_"
           style="height: ${this.size}px; width: ${this.size}px;">
        <defs>
          <filter id="${t}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="#1e1e2e"/>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#313244" stroke-width="2"/>
        <text x="32" y="32"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="22"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${t})">tk_</text>
      </svg>
    `}render(){const t=this.variant==="icon"?this.renderIcon():this.renderLogotype();return this.href?u`<a href=${this.href}>${t}</a>`:u`<span>${t}</span>`}};Ae.styles=_`
    :host {
      display: inline-flex;
      align-items: center;
    }

    a, span {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    a:hover {
      text-decoration: none;
    }

    svg {
      display: block;
    }
  `;rs([c({type:String})],Ae.prototype,"variant",2);rs([c({type:String})],Ae.prototype,"href",2);rs([c({type:Number})],Ae.prototype,"size",2);Ae=rs([ht("ticks-logo")],Ae);var nu=Object.defineProperty,lu=Object.getOwnPropertyDescriptor,re=(t,e,i,s)=>{for(var o=s>1?void 0:s?lu(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&nu(e,i,o),o};let Lt=class extends Y{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(t){const i=t.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(t){const e=t.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:e.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(t){this.dispatchEvent(new CustomEvent("activity-click",{detail:t.detail,bubbles:!0,composed:!0}))}handleDashboardToggle(){this.dispatchEvent(new CustomEvent("dashboard-toggle",{bubbles:!0,composed:!0}))}handleRoadmapToggle(){this.dispatchEvent(new CustomEvent("roadmap-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return u`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          ${this.readonlyMode?u`<a href="/app" style="text-decoration: none;"><ticks-logo variant="logotype" .size=${24}></ticks-logo></a>`:u`<ticks-logo variant="logotype" .size=${24}></ticks-logo>`}
          <sl-tooltip content=${this.getConnectionTooltip()}>
            <span class="connection-status ${this.connectionStatus}"></span>
          </sl-tooltip>
          ${this.repoName?u`<span class="repo-badge">${this.repoName}</span>`:null}
          ${this.readonlyMode?u`
              <sl-tooltip content="Local tk client is not connected. Actions will not sync back to tick files.">
                <span class="readonly-badge">
                  <sl-icon name="eye"></sl-icon>
                  Read-only
                </span>
              </sl-tooltip>
            `:null}
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
            ${this.epics.map(t=>u`
                <sl-option value=${t.id}>
                  <span class="epic-id">${t.id}</span> - ${t.title}
                </sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Roadmap (m)">
            <sl-button
              variant="default"
              size="small"
              @click=${this.handleRoadmapToggle}
            >
              <sl-icon name="map"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Dashboard (d)">
            <sl-button
              variant="default"
              size="small"
              @click=${this.handleDashboardToggle}
            >
              <sl-icon name="grid-1x2"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Activity feed">
            <tick-activity-feed
              @activity-click=${this.handleActivityClick}
            ></tick-activity-feed>
          </sl-tooltip>

          <sl-tooltip content="Create new tick (n)">
            <ticks-button
              variant="primary"
              size="small"
              @click=${this.handleCreateClick}
            >
              <sl-icon name="plus-lg"></sl-icon>
            </ticks-button>
          </sl-tooltip>
        </div>
      </header>
    `}};Lt.styles=_`
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

    .header-left ticks-logo {
      display: flex;
      align-items: center;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
    }

    .readonly-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      background: var(--yellow);
      color: var(--base);
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .readonly-badge sl-icon {
      font-size: 0.85rem;
    }

    /* Connection status dot */
    .connection-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .connection-status.connected {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 4px var(--green, #a6e3a1);
    }

    .connection-status.connecting {
      background: var(--yellow, #f9e2af);
      animation: pulse-status 1s ease-in-out infinite;
    }

    .connection-status.disconnected {
      background: var(--red, #f38ba8);
    }

    @keyframes pulse-status {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
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
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
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

      .header-left ticks-logo {
        --logo-size: 20px;
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

    /* Style header action buttons with green tones */
    .header-right sl-button::part(base) {
      color: var(--subtext0);
    }

    .header-right sl-button::part(base):hover {
      color: var(--green, #a6e3a1);
      background: var(--surface0);
    }

    .header-right sl-button[variant="primary"]::part(base) {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    .header-right sl-button[variant="primary"]::part(base):hover {
      background: #b8e8b3;
    }

  `;re([c({type:String,attribute:"repo-name"})],Lt.prototype,"repoName",2);re([c({attribute:!1})],Lt.prototype,"epics",2);re([c({type:String,attribute:"selected-epic"})],Lt.prototype,"selectedEpic",2);re([c({type:String,attribute:"search-term"})],Lt.prototype,"searchTerm",2);re([c({type:Boolean,attribute:"readonly-mode"})],Lt.prototype,"readonlyMode",2);re([c({type:String,attribute:"connection-status"})],Lt.prototype,"connectionStatus",2);re([y()],Lt.prototype,"debounceTimeout",2);Lt=re([ht("tick-header")],Lt);var cu=Object.defineProperty,du=Object.getOwnPropertyDescriptor,U=(t,e,i,s)=>{for(var o=s>1?void 0:s?du(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&cu(e,i,o),o};const uu={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},Yo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let B=class extends Y{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.afterDraft="",this.savingAfter=!1,this.afterError=""}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}willUpdate(t){var e,i;t.has("tick")&&(this.afterDraft=((i=(e=this.tick)==null?void 0:e.after)==null?void 0:i.join(", "))??"",this.savingAfter=!1,this.afterError="")}updated(t){t.has("tick")&&this.resetActionState()}handleTickLinkClick(t){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:t},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}emitTickUpdated(t){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:t},bubbles:!0,composed:!0}))}async handleApprove(){var t;if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await Pr(this.tick.id),i={...e,is_blocked:(((t=e.blocked_by)==null?void 0:t.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(e){this.errorMessage=e instanceof Error?e.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var t;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const e=await Mr(this.tick.id,this.rejectReason.trim()),i={...e,is_blocked:(((t=e.blocked_by)==null?void 0:t.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(e){this.errorMessage=e instanceof Error?e.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var t;if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await Lr(this.tick.id,this.closeReason.trim()||void 0),i={...e,is_blocked:(((t=e.blocked_by)==null?void 0:t.length)??0)>0,column:"done"};this.emitTickUpdated(i),this.resetActionState()}catch(e){this.errorMessage=e instanceof Error?e.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var t;if(this.tick){this.loading=!0,this.errorMessage="";try{const e=await Ir(this.tick.id),i={...e,is_blocked:(((t=e.blocked_by)==null?void 0:t.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(e){this.errorMessage=e instanceof Error?e.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var e;if(!this.tick||!this.newNoteText.trim())return;const t=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:t},this.newNoteText="";try{const i=await zr(this.tick.id,t);this.optimisticNote=null;const s={...i,is_blocked:(((e=i.blocked_by)==null?void 0:e.length)??0)>0,column:"ready",notesList:Pi(i.notes)};this.emitTickUpdated(s)}catch(i){this.optimisticNote=null,this.newNoteText=t,this.addNoteError=i instanceof Error?i.message:"Failed to add note"}finally{this.addingNote=!1}}async handleAfterSave(){var s;const t=this.tick;if(!t)return;const e=this.afterDraft.split(",").map(o=>o.trim()).filter(Boolean);this.savingAfter=!0,this.afterError="";const i={title:t.title,description:t.description,status:t.status,priority:t.priority,labels:t.labels,blocked_by:t.blocked_by,awaiting:t.awaiting,after:e};try{await Or(t.id,i);const o={...t,after:e.length>0?e:void 0,updated_at:new Date().toISOString(),is_blocked:(((s=t.blocked_by)==null?void 0:s.length)??0)>0,column:"ready"};this.emitTickUpdated(o)}catch(o){this.afterError=o instanceof Error?o.message:"Failed to update after"}finally{this.savingAfter=!1}}formatTimestamp(t){return new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(t){return uu[t]??"Unknown"}getPriorityColor(t){return Yo[t]??Yo[2]}formatStartedAt(t){const e=new Date(t),i=Xd(e,{addSuffix:!0}),s=Yd(e,"h:mm a");return`${i} (${s})`}renderActions(){const t=this.tick;if(!t)return v;const e=t.status==="open",i=t.status==="closed",s=!!t.awaiting,o=!!t.requires,r=e&&s,a=e&&!o,l=i;return!r&&!a&&!l?v:u`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?u`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:v}

        <div class="actions-section">
          ${r?u`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  ${this.loading?"Approving...":"Approve"}
                </ticks-button>
                <ticks-button
                  variant="danger"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </ticks-button>
              `:v}
          ${a?u`
                <ticks-button
                  variant="secondary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </ticks-button>
              `:v}
          ${l?u`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  ${this.loading?"Reopening...":"Reopen"}
                </ticks-button>
              `:v}
        </div>

        ${this.showRejectInput?u`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${d=>{this.rejectReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="danger"
                    size="small"
                    ?disabled=${this.loading||!this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    ${this.loading?"Rejecting...":"Confirm Reject"}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `:v}

        ${this.showCloseInput?u`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${d=>{this.closeReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="secondary"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    ${this.loading?"Closing...":"Confirm Close"}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `:v}
      </div>

      <sl-divider></sl-divider>
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?u`<span class="empty-text">None</span>`:u`
      <ul class="link-list">
        ${this.blockerDetails.map(t=>u`
            <li>
              <a
                class="tick-link status-${t.status}"
                @click=${()=>this.handleTickLinkClick(t.id)}
              >
                <span class="link-id">${t.id}</span>
                <span class="link-title">${t.title}</span>
              </a>
            </li>
          `)}
      </ul>
    `}renderAfterEdit(){return u`
      <div class="after-edit-row">
        <sl-input
          class="after-input"
          placeholder="tick IDs, e.g. a1, b2 (comma-separated)"
          .value=${this.afterDraft}
          ?disabled=${this.savingAfter||this.readonlyMode}
          @sl-input=${t=>{this.afterDraft=t.target.value}}
          @keydown=${t=>{t.key==="Enter"&&(t.preventDefault(),this.handleAfterSave())}}
        ></sl-input>
        <ticks-button
          variant="secondary"
          size="small"
          ?disabled=${this.savingAfter||this.readonlyMode}
          @click=${this.handleAfterSave}
        >
          ${this.savingAfter?"Saving...":"Save"}
        </ticks-button>
      </div>
      <div class="after-hint">
        Soft ordering preference — never blocks readiness. Clear the input and save to remove.
      </div>
      ${this.afterError?u`
            <sl-alert variant="danger" open class="after-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.afterError}
            </sl-alert>
          `:v}
    `}renderParent(){var t;return(t=this.tick)!=null&&t.parent?u`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?u`<span class="link-title">${this.parentTitle}</span>`:v}
      </a>
    `:u`<span class="empty-text">None</span>`}renderLabels(){var t;return!((t=this.tick)!=null&&t.labels)||this.tick.labels.length===0?u`<span class="empty-text">None</span>`:u`
      <div class="labels-container">
        ${this.tick.labels.map(e=>u`<span class="label-badge">${e}</span>`)}
      </div>
    `}renderNoteItem(t,e=!1){return u`
      <li class="note-item ${e?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${t.author??"Unknown"}</span>
          ${t.timestamp?u`<span class="note-timestamp"
                >${this.formatTimestamp(t.timestamp)}</span
              >`:v}
        </div>
        <div class="note-text">${t.text}</div>
        ${e?u`<div class="note-sending">Sending...</div>`:v}
      </li>
    `}renderNotes(){const t=this.notesList&&this.notesList.length>0||this.optimisticNote;return u`
      ${t?u`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(e=>this.renderNoteItem(e))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):v}
              </ul>
            </div>
          `:u`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?u`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `:v}

      <!-- Add note form -->
      <div class="add-note-form">
        <sl-textarea
          placeholder="Add a note..."
          rows="2"
          resize="none"
          .value=${this.newNoteText}
          ?disabled=${this.addingNote}
          @sl-input=${e=>{this.newNoteText=e.target.value}}
          @keydown=${e=>{e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&(e.preventDefault(),this.handleAddNote())}}
        ></sl-textarea>
        <div class="add-note-actions">
          <span class="add-note-hint">${this.readonlyMode?"Read-only mode":"Ctrl+Enter to send"}</span>
          <ticks-button
            variant="primary"
            size="small"
            ?disabled=${this.addingNote||!this.newNoteText.trim()||this.readonlyMode}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            ${this.addingNote?"Adding...":"Add Note"}
          </ticks-button>
        </div>
      </div>
    `}renderDetailsContent(){const t=this.tick;return t?u`
      <div class="drawer-content">
        <!-- Header: ID and Title -->
        <div class="section">
          <div class="tick-id">${t.id}</div>
          <h2 class="tick-title">${t.title}</h2>

          <!-- Status badges row -->
          <div class="meta-row">
            <span class="meta-badge type-badge type-${t.type}"
              >${t.type}</span
            >
            <span class="meta-badge status-${t.status}"
              >${t.status.replace("_"," ")}</span
            >
            <span
              class="meta-badge priority"
              style="--priority-color: ${this.getPriorityColor(t.priority)}"
            >
              ${this.getPriorityLabel(t.priority)}
            </span>
            ${t.manual?u`<span class="meta-badge manual">👤 Manual</span>`:v}
            ${t.awaiting?u`<span class="meta-badge awaiting">⏳ ${t.awaiting}</span>`:v}
            ${t.verdict?u`<span class="meta-badge verdict-${t.verdict}"
                  >${t.verdict}</span
                >`:v}
            ${this.blockerDetails&&this.blockerDetails.length>0?u`<span class="meta-badge blocked">⊘ Blocked</span>`:v}
          </div>

          <!-- Started time for in_progress ticks -->
          ${t.status==="in_progress"&&t.started_at?u`
                <div class="started-time">
                  Started: ${this.formatStartedAt(t.started_at)}
                </div>
              `:v}
        </div>

        <!-- Actions (approve/reject/close/reopen) -->
        ${this.renderActions()}

        <!-- Description -->
        <div class="section">
          <div class="section-title">Description</div>
          ${t.description?u`<div class="description">${t.description}</div>`:u`<span class="empty-text">No description</span>`}
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

        <!-- After (soft order) -->
        <div class="section">
          <div class="section-title">After (soft order)</div>
          ${this.renderAfterEdit()}
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
              >${this.formatTimestamp(t.created_at)}</span
            >
          </div>
          <div class="timestamp-row" style="margin-top: 0.375rem">
            <span class="timestamp-label">Updated</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(t.updated_at)}</span
            >
          </div>
          ${t.closed_at?u`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(t.closed_at)}</span
                  >
                </div>
              `:v}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${t.closed_reason?u`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${t.closed_reason}</div>
              </div>
            `:v}
      </div>
    `:v}render(){const t=this.tick;return u`
      <sl-drawer
        label=${t?`${t.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${t?this.renderDetailsContent():u`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};B.styles=_`
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

    .started-time {
      font-size: 0.8125rem;
      color: var(--peach);
      margin-top: 0.5rem;
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

    /* After (soft order) edit field */
    .after-edit-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .after-edit-row .after-input {
      flex: 1;
    }

    .after-input::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    .after-input::part(input) {
      color: var(--text);
      font-size: 0.875rem;
      font-family: var(--sl-font-mono, monospace);
    }

    .after-input::part(input)::placeholder {
      color: var(--subtext0);
    }

    .after-hint {
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .after-error {
      margin-top: 0.5rem;
    }

  `;U([c({attribute:!1})],B.prototype,"tick",2);U([c({type:Boolean})],B.prototype,"open",2);U([c({attribute:!1})],B.prototype,"notesList",2);U([c({attribute:!1})],B.prototype,"blockerDetails",2);U([c({type:String,attribute:"parent-title"})],B.prototype,"parentTitle",2);U([c({type:Boolean,attribute:"readonly-mode"})],B.prototype,"readonlyMode",2);U([y()],B.prototype,"loading",2);U([y()],B.prototype,"errorMessage",2);U([y()],B.prototype,"showRejectInput",2);U([y()],B.prototype,"showCloseInput",2);U([y()],B.prototype,"rejectReason",2);U([y()],B.prototype,"closeReason",2);U([y()],B.prototype,"newNoteText",2);U([y()],B.prototype,"addingNote",2);U([y()],B.prototype,"addNoteError",2);U([y()],B.prototype,"optimisticNote",2);U([y()],B.prototype,"afterDraft",2);U([y()],B.prototype,"savingAfter",2);U([y()],B.prototype,"afterError",2);B=U([ht("tick-detail-drawer")],B);var hu=Object.defineProperty,pu=Object.getOwnPropertyDescriptor,ct=(t,e,i,s)=>{for(var o=s>1?void 0:s?pu(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&hu(e,i,o),o};const fu=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],mu=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let et=class extends Y{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.tickAfter="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.tickAfter="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(t){if(this.loading){t.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(t){const e=t.target;this.tickTitle=e.value}handleDescriptionInput(t){const e=t.target;this.tickDescription=e.value}handleTypeChange(t){const e=t.target;this.type=e.value}handlePriorityChange(t){const e=t.target;this.priority=parseInt(e.value,10)}handleParentChange(t){const e=t.target;this.parent=e.value}handleLabelsInput(t){const e=t.target;this.labels=e.value}handleAfterInput(t){const e=t.target;this.tickAfter=e.value}handleAwaitingChange(t){const e=t.target;this.awaiting=e.value}async handleSubmit(){var i;if(!this.tickTitle.trim()){this.error="Title is required",(i=this.titleInput)==null||i.focus();return}this.loading=!0,this.error=null;const t={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(t.description=this.tickDescription.trim()),this.parent&&(t.parent=this.parent);const e=this.tickAfter.split(",").map(s=>s.trim()).filter(Boolean);e.length>0&&(t.after=e),this.awaiting&&(t.awaiting=this.awaiting);try{const s=await Dr(t);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:s,labels:this.labels?this.labels.split(",").map(o=>o.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(s){s instanceof $r?this.error=s.body||s.message:s instanceof Error?this.error=s.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return u`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?u`<div class="error-message">${this.error}</div>`:v}

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
              ${fu.map(t=>u`
                  <sl-option value=${t.value}>${t.label}</sl-option>
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
              ${mu.map(t=>u`
                  <sl-option value=${String(t.value)}>${t.label}</sl-option>
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
            ${this.epics.map(t=>u`
                <sl-option value=${t.id}>
                  <span class="epic-id">${t.id}</span> ${t.title}
                </sl-option>
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
          <label>After (soft order)</label>
          <sl-input
            name="after"
            placeholder="tick IDs, e.g. a1, b2 (comma-separated)"
            .value=${this.tickAfter}
            @sl-input=${this.handleAfterInput}
            ?disabled=${this.loading}
          ></sl-input>
          <div class="field-help">
            Soft ordering preference — work these ticks first if feasible. Never blocks readiness (use Blocked By for hard dependencies).
          </div>
        </div>

        <div class="form-field">
          <label>Workflow</label>
          <sl-select
            placeholder="Agent task (default)"
            .value=${this.awaiting}
            @sl-change=${this.handleAwaitingChange}
            ?disabled=${this.loading}
            clearable
          >
            <sl-option value="work">Human task (manual work)</sl-option>
            <sl-option value="approval">Awaiting approval</sl-option>
            <sl-option value="input">Awaiting input</sl-option>
            <sl-option value="review">Awaiting review</sl-option>
          </sl-select>
          <div class="checkbox-help">
            Leave empty for agent-automated tasks. Select a state if human action is required.
          </div>
        </div>

        <div slot="footer" class="footer-buttons">
          <ticks-button
            variant="secondary"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </ticks-button>
          <ticks-button
            variant="primary"
            @click=${this.handleSubmit}
            ?disabled=${this.loading}
          >
            ${this.loading?"Creating...":"Create"}
          </ticks-button>
        </div>
      </sl-dialog>
    `}};et.styles=_`
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

    .epic-id {
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
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

    .field-help {
      font-size: 0.75rem;
      color: var(--subtext0);
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
  `;ct([c({type:Boolean})],et.prototype,"open",2);ct([c({type:Array,attribute:!1})],et.prototype,"epics",2);ct([y()],et.prototype,"loading",2);ct([y()],et.prototype,"error",2);ct([y()],et.prototype,"tickTitle",2);ct([y()],et.prototype,"tickDescription",2);ct([y()],et.prototype,"type",2);ct([y()],et.prototype,"priority",2);ct([y()],et.prototype,"parent",2);ct([y()],et.prototype,"labels",2);ct([y()],et.prototype,"tickAfter",2);ct([y()],et.prototype,"awaiting",2);ct([k('sl-input[name="title"]')],et.prototype,"titleInput",2);et=ct([ht("tick-create-dialog")],et);var bu=Object.defineProperty,gu=Object.getOwnPropertyDescriptor,qr=(t,e,i,s)=>{for(var o=s>1?void 0:s?gu(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&bu(e,i,o),o};const vu=5e3;let yu=0;function wu(){return`toast-${++yu}-${Date.now()}`}let Bi=class extends Y{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=t=>{this.showToast(t.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const t of this.dismissTimeouts.values())clearTimeout(t);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=t=>{this.showToast(t)}}removeGlobalApi(){delete window.showToast}showToast(t){const e={id:wu(),message:t.message,variant:t.variant??"primary",duration:t.duration??vu};if(this.toasts=[...this.toasts,e],e.duration>0){const i=setTimeout(()=>{this.dismissToast(e.id)},e.duration);this.dismissTimeouts.set(e.id,i)}}dismissToast(t){const e=this.dismissTimeouts.get(t);e&&(clearTimeout(e),this.dismissTimeouts.delete(t)),this.exitingToasts.add(t),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(t),this.toasts=this.toasts.filter(i=>i.id!==t)},300)}handleCloseRequest(t){this.dismissToast(t)}getIconForVariant(t){switch(t){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return u`
      ${this.toasts.map(t=>u`
        <div class="toast-container ${this.exitingToasts.has(t.id)?"exiting":""}">
          <sl-alert
            variant=${t.variant}
            open
            closable
            @sl-after-hide=${()=>this.handleCloseRequest(t.id)}
          >
            <sl-icon slot="icon" name=${this.getIconForVariant(t.variant)}></sl-icon>
            ${t.message}
          </sl-alert>
        </div>
      `)}
    `}};Bi.styles=_`
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
  `;qr([y()],Bi.prototype,"toasts",2);Bi=qr([ht("tick-toast-stack")],Bi);var xu=Object.defineProperty,ku=Object.getOwnPropertyDescriptor,Ie=(t,e,i,s)=>{for(var o=s>1?void 0:s?ku(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&xu(e,i,o),o};let oe=class extends Y{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const t=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",t),this.lastSeenTimestamp=t}catch{}}}async loadActivities(){try{this.activities=await Qs(20),this.updateUnreadCount()}catch(t){console.error("Failed to load activities:",t)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(t=>t.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=t=>{t.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var t;(t=this.dropdown)==null||t.hide()}handleActivityClick(t){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:t.tick},bubbles:!0,composed:!0}))}getActionIcon(t){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[t]||"•"}getActionDescription(t){const e=t.action,i=t.actor,s=t.data||{};switch(e){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return s.reason?`${i} closed: ${s.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${s.to||"someone"}`;case"awaiting":return`Waiting for ${s.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${e}`}}formatRelativeTime(t){const e=new Date(t),s=new Date().getTime()-e.getTime(),o=Math.floor(s/1e3),r=Math.floor(o/60),a=Math.floor(r/60),l=Math.floor(a/24);return o<60?"just now":r<60?`${r}m ago`:a<24?`${a}h ago`:l<7?`${l}d ago`:e.toLocaleDateString()}isUnread(t){return this.lastSeenTimestamp?t.ts>this.lastSeenTimestamp:!0}render(){return u`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?u`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:v}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?u`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:v}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading?u`<div class="loading-state">Loading...</div>`:this.activities.length===0?u`<div class="empty-state">No recent activity</div>`:this.activities.map(t=>u`
                    <sl-menu-item @click=${()=>this.handleActivityClick(t)}>
                      <div class="activity-item ${this.isUnread(t)?"unread":""}">
                        <div class="activity-icon ${t.action}">
                          ${this.getActionIcon(t.action)}
                        </div>
                        <div class="activity-content">
                          <div class="activity-title">
                            <span class="tick-id">${t.tick}</span>
                          </div>
                          <div class="activity-description">
                            ${this.getActionDescription(t)}
                          </div>
                          <div class="activity-time">
                            ${this.formatRelativeTime(t.ts)}
                          </div>
                        </div>
                      </div>
                    </sl-menu-item>
                  `)}
        </sl-menu>
      </sl-dropdown>
    `}};oe.styles=_`
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

    /* Style trigger and header buttons with green instead of blue */
    .trigger-button sl-button::part(base),
    .menu-header-actions sl-button::part(base) {
      color: var(--subtext0);
    }

    .trigger-button sl-button::part(base):hover,
    .menu-header-actions sl-button::part(base):hover {
      color: var(--green, #a6e3a1);
      background: var(--surface0);
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
  `;Ie([k("sl-dropdown")],oe.prototype,"dropdown",2);Ie([y()],oe.prototype,"activities",2);Ie([y()],oe.prototype,"loading",2);Ie([y()],oe.prototype,"unreadCount",2);Ie([y()],oe.prototype,"lastSeenTimestamp",2);oe=Ie([ht("tick-activity-feed")],oe);var _u=Object.defineProperty,$u=Object.getOwnPropertyDescriptor,Nt=(t,e,i,s)=>{for(var o=s>1?void 0:s?$u(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&_u(e,i,o),o};const Ko=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let it=class extends Y{constructor(){super(...arguments),this.ticks=[],this.epics=[],this.open=!1,this.activities=[],this.repoName="",this._focusedAttentionIndex=-1,this._detailTick=null,this._detailNotes=[],this._detailLoading=!1,this._handleKeyDown=t=>{if(t.key==="Escape"){if(t.stopPropagation(),this._detailTick){this._closeDetailPane();return}this._close();return}const e=this._getHumanTicks(),i=Math.min(e.length,6)-1;switch(t.key){case"j":case"ArrowDown":t.preventDefault(),t.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.min(this._focusedAttentionIndex+1,i));break;case"k":case"ArrowUp":t.preventDefault(),t.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.max(this._focusedAttentionIndex-1,0));break;case"Enter":case"i":this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i&&(t.preventDefault(),t.stopPropagation(),this._handleTickClick(e[this._focusedAttentionIndex].id));break;case"a":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){t.preventDefault(),t.stopPropagation();const s=e[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-resume",{detail:{tickId:s.id}}))}break;case"t":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){t.preventDefault(),t.stopPropagation();const s=e[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-retry",{detail:{tickId:s.id}}))}break}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown)}updated(t){super.updated(t),t.has("open")&&this.open&&(this._focusedAttentionIndex=-1,this._closeDetailPane())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown)}_close(){this.dispatchEvent(new CustomEvent("close"))}_handleBackdropClick(t){t.target.classList.contains("overlay")&&this._close()}_handleEpicClick(t){this.dispatchEvent(new CustomEvent("epic-select",{detail:{epicId:t}})),this._close()}_handleTickClick(t){this._openDetailPane(t)}_handleOpenOnBoard(t){this.dispatchEvent(new CustomEvent("tick-select",{detail:{tickId:t}})),this._close()}async _openDetailPane(t){var i,s;const e=this.ticks.find(o=>o.id===t);if(e){this._detailTick=e,this._detailNotes=Pi(e.notes),this._detailLoading=!0;try{const o=await Xs(t).catch(()=>null);if(((i=this._detailTick)==null?void 0:i.id)!==t)return;o&&(this._detailTick={...e,...o,is_blocked:e.is_blocked,column:e.column},this._detailNotes=Pi(o.notes))}catch{}finally{((s=this._detailTick)==null?void 0:s.id)===t&&(this._detailLoading=!1)}}}_closeDetailPane(){this._detailTick=null,this._detailNotes=[],this._detailLoading=!1}_getColumnCounts(){const t={blocked:0,ready:0,agent:0,human:0,done:0};for(const e of this.ticks)e.type!=="epic"&&t[e.column]!==void 0&&t[e.column]++;return t}_getTotalNonEpicTicks(){return this.ticks.filter(t=>t.type!=="epic").length}_getEpicProgress(t){const e=this.ticks.filter(h=>h.parent===t&&h.type!=="epic"),i=e.length,s=e.filter(h=>h.column==="done").length,o=e.filter(h=>h.column==="agent").length,r=e.filter(h=>h.column==="human").length,a=e.filter(h=>h.column==="blocked").length,l=e.filter(h=>h.column==="ready").length,d=i>0?Math.round(s/i*100):0;return{total:i,done:s,inProgress:o,needsHuman:r,blocked:a,ready:l,pct:d}}_getHumanTicks(){return this.ticks.filter(t=>t.column==="human"&&t.type!=="epic")}_getActivityIcon(t){switch(t){case"create":return"➕";case"close":return"✅";case"update":return"✏️";case"approve":return"👍";case"reject":return"👎";case"note":return"💬";case"reopen":return"🔄";default:return"•"}}_formatRelativeTime(t){const e=new Date(t),s=new Date().getTime()-e.getTime(),o=Math.floor(s/6e4);if(o<1)return"now";if(o<60)return`${o}m ago`;const r=Math.floor(o/60);return r<24?`${r}h ago`:`${Math.floor(r/24)}d ago`}_getAwaitingLabel(t){if(t.awaiting)switch(t.awaiting){case"approval":return"Awaiting approval";case"review":return"Awaiting review";case"input":return"Awaiting input";case"content":return"Awaiting content";case"escalation":return"Escalated";case"checkpoint":return"Checkpoint";case"work":return"Manual work needed";default:return"Needs attention"}return"Needs attention"}_getPriorityLabel(t){return it.PRIORITY_LABELS[t]??"Unknown"}_getPriorityColor(t){return it.PRIORITY_COLORS[t]??"var(--subtext0)"}_formatTimestamp(t){return new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}_formatDuration(t){if(t<1e3)return`${t}ms`;const e=Math.floor(t/1e3);return e<60?`${e}s`:`${Math.floor(e/60)}m ${e%60}s`}_formatTokenCount(t){return t>=1e6?`${(t/1e6).toFixed(1)}M`:t>=1e3?`${(t/1e3).toFixed(1)}K`:t.toString()}_formatCost(t){return t===0?"$0.00":t<.01?`$${t.toFixed(4)}`:t<1?`$${t.toFixed(3)}`:`$${t.toFixed(2)}`}_truncate(t,e=60){return t.length<=e?t:t.slice(0,e)+"..."}render(){if(!this.open)return v;const t=this._getColumnCounts(),e=this._getTotalNonEpicTicks(),i=this._getHumanTicks();return u`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._detailTick?this._renderDetailPane():v}
            ${this._renderSummaryCards(t,e)}
            ${this._renderDistribution(t,e)}
            ${this._renderEpicProgress()}
            <div class="two-col">
              ${this._renderNeedsAttention(i)}
              ${this._renderRecentActivity()}
            </div>
          </div>
        </div>
      </div>
    `}_renderHeader(){return u`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName?u`<div class="header-subtitle">${this.repoName}</div>`:v}
          </div>
        </div>
        <div class="header-right">
          <span class="kbd-hint">
            Press <kbd>d</kbd> or <kbd>Esc</kbd> to close
          </span>
          <button class="close-btn" @click=${this._close} aria-label="Close dashboard">✕</button>
        </div>
      </div>
    `}_renderSummaryCards(t,e){const i=e>0?Math.round(t.done/e*100):0;return u`
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-card-label">Total Tasks</div>
          <div class="summary-card-value">${e}</div>
          <div class="summary-card-detail">${this.epics.length} epic${this.epics.length!==1?"s":""}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Completion</div>
          <div class="summary-card-value value-green">${i}%</div>
          <div class="summary-card-detail">${t.done} / ${e} done</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Needs Human</div>
          <div class="summary-card-value ${t.human>0?"value-yellow":""}">${t.human}</div>
          <div class="summary-card-detail">awaiting action</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">In Progress</div>
          <div class="summary-card-value ${t.agent>0?"value-peach":""}">${t.agent}</div>
          <div class="summary-card-detail">with agent</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Blocked</div>
          <div class="summary-card-value ${t.blocked>0?"value-red":""}">${t.blocked}</div>
          <div class="summary-card-detail">dependencies unmet</div>
        </div>
      </div>
    `}_renderDistribution(t,e){return e===0?v:u`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${Ko.map(i=>{const s=t[i.id]/e*100;return s===0?v:u`
                <div
                  class="distribution-segment segment-${i.id}"
                  style="width: ${s}%"
                  title="${i.name}: ${t[i.id]}"
                >
                  ${s>=8?u`<span>${t[i.id]}</span>`:v}
                </div>
              `})}
          </div>
          <div class="distribution-legend">
            ${Ko.map(i=>u`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${i.color}"></div>
                <span>${i.icon} ${i.name}</span>
                <span class="legend-count">${t[i.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}_renderEpicProgress(){return this.epics.length===0?v:u`
      <div class="section">
        <div class="section-title">Epic Progress</div>
        <div class="epic-list">
          ${this.epics.map(t=>{const e=this._getEpicProgress(t.id);return u`
              <div class="epic-row" @click=${()=>this._handleEpicClick(t.id)}>
                <span class="epic-id">${t.id}</span>
                <div class="epic-info">
                  <div class="epic-title">${t.title}</div>
                  <div class="epic-progress-bar">
                    <div class="epic-progress-fill" style="width: ${e.pct}%"></div>
                  </div>
                </div>
                <div class="epic-stats">
                  <span class="epic-stat">${e.done}/${e.total}</span>
                  <span class="epic-percentage value-green">${e.pct}%</span>
                </div>
              </div>
            `})}
        </div>
      </div>
    `}_renderNeedsAttention(t){return u`
      <div class="section">
        <div class="section-title">Needs Attention (${t.length})</div>
        ${t.length===0?u`<div class="empty-section">No ticks need human attention</div>`:u`
              <div class="attention-list">
                ${t.slice(0,6).map((e,i)=>u`
                  <div
                    class="attention-item ${z({focused:this._focusedAttentionIndex===i})}"
                    @click=${()=>this._handleTickClick(e.id)}
                  >
                    <span class="attention-icon">👤</span>
                    <div class="attention-info">
                      <div class="attention-title">${e.title}</div>
                      <div class="attention-detail">${this._getAwaitingLabel(e)}</div>
                    </div>
                    <span class="attention-id">${e.id}</span>
                  </div>
                `)}
                ${t.length>6?u`<div class="empty-section">+${t.length-6} more</div>`:v}
              </div>
              ${t.length>0?u`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              `:v}
            `}
      </div>
    `}_renderRecentActivity(){return u`
      <div class="section">
        <div class="section-title">Recent Activity</div>
        ${this.activities.length===0?u`<div class="empty-section">No recent activity</div>`:u`
              <div class="activity-list">
                ${this.activities.slice(0,8).map(t=>u`
                  <div class="activity-item" @click=${()=>this._handleTickClick(t.tick)}>
                    <span class="activity-icon">${this._getActivityIcon(t.action)}</span>
                    <span class="activity-text">
                      <span class="tick-ref">${t.tick}</span>
                      ${t.action}${t.actor?` by ${t.actor}`:""}
                    </span>
                    <span class="activity-time">${this._formatRelativeTime(t.ts)}</span>
                  </div>
                `)}
              </div>
            `}
      </div>
    `}_renderDetailPane(){const t=this._detailTick;return t?u`
      <div class="detail-pane">
        <div class="detail-pane-header">
          <div class="detail-pane-header-left">
            <span class="detail-pane-id">${t.id}</span>
            <span class="detail-pane-title">${t.title}</span>
          </div>
          <div class="detail-pane-actions">
            <button
              class="detail-pane-btn primary"
              @click=${()=>this._handleOpenOnBoard(t.id)}
              title="Open in board detail drawer"
            >
              ↗ Open on Board
            </button>
            <button
              class="detail-pane-close"
              @click=${()=>this._closeDetailPane()}
              aria-label="Close detail pane"
            >✕</button>
          </div>
        </div>

        <div class="detail-tab-body">
          ${this._detailLoading?u`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`:this._renderDetailOverview(t)}
        </div>
      </div>
    `:v}_renderDetailOverview(t){return u`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${t.type}">${t.type}</span>
        <span class="detail-meta-badge status-${t.status}">${t.status.replace("_"," ")}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(t.priority)}"
        >${this._getPriorityLabel(t.priority)}</span>
        ${t.awaiting?u`<span class="detail-meta-badge awaiting">⏳ ${t.awaiting}</span>`:v}
        ${t.is_blocked?u`<span class="detail-meta-badge blocked">⊘ blocked</span>`:v}
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">Description</div>
        ${t.description?u`<div class="detail-description">${t.description}</div>`:u`<div class="detail-field-empty">No description</div>`}
      </div>

      <!-- Acceptance Criteria -->
      ${t.acceptance_criteria?u`
            <div class="detail-field">
              <div class="detail-field-label">Acceptance Criteria</div>
              <div class="detail-description">${t.acceptance_criteria}</div>
            </div>
          `:v}

      <!-- Parent -->
      ${t.parent?u`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${()=>this._handleTickClick(t.parent)}>${t.parent}</a>
            </div>
          `:v}

      <!-- Blocked by -->
      ${t.blocked_by&&t.blocked_by.length>0?u`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${t.blocked_by.map(e=>u`
                <a class="detail-link" @click=${()=>this._handleTickClick(e)} style="margin-right: 0.5rem;">${e}</a>
              `)}
            </div>
          `:v}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length>0?u`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(e=>u`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${e.author??"Unknown"}</span>
                      ${e.timestamp?u`<span class="detail-note-time">${this._formatRelativeTime(e.timestamp)}</span>`:v}
                    </div>
                    <div class="detail-note-text">${e.text}</div>
                  </li>
                `)}
              </ul>
            `:u`<div class="detail-field-empty">No notes</div>`}
      </div>

      <!-- Closed reason -->
      ${t.closed_reason?u`
            <div class="detail-field">
              <div class="detail-field-label">Close Reason</div>
              <div class="detail-description">${t.closed_reason}</div>
            </div>
          `:v}

      <!-- Timestamps -->
      <div class="detail-field">
        <div class="detail-field-label">Timestamps</div>
        <div class="detail-timestamps">
          <div class="detail-ts-row">
            <span class="detail-ts-label">Created</span>
            <span class="detail-ts-value">${this._formatTimestamp(t.created_at)}</span>
          </div>
          <div class="detail-ts-row">
            <span class="detail-ts-label">Updated</span>
            <span class="detail-ts-value">${this._formatTimestamp(t.updated_at)}</span>
          </div>
          ${t.started_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(t.started_at)}</span>
                </div>
              `:v}
          ${t.closed_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(t.closed_at)}</span>
                </div>
              `:v}
        </div>
      </div>
    `}};it.styles=_`
    :host {
      display: block;
    }

    /* Overlay backdrop */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(17, 17, 27, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Dashboard container */
    .dashboard {
      width: 100%;
      max-width: 1100px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .header-subtitle {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    .kbd-hint {
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .kbd-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    /* Body */
    .dashboard-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Section */
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--subtext0, #a6adc8);
    }

    /* Summary cards row */
    .summary-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .summary-card {
      background: var(--surface0, #313244);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-card-label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--subtext0, #a6adc8);
    }

    .summary-card-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
      line-height: 1.2;
    }

    .summary-card-detail {
      font-size: 0.6875rem;
      color: var(--overlay1, #7f849c);
    }

    .value-green { color: var(--green, #a6e3a1); }
    .value-blue { color: var(--blue, #89b4fa); }
    .value-peach { color: var(--peach, #fab387); }
    .value-yellow { color: var(--yellow, #f9e2af); }
    .value-red { color: var(--red, #f38ba8); }
    .value-mauve { color: var(--mauve, #cba6f7); }

    /* Column distribution */
    .distribution-bar-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .distribution-bar {
      height: 28px;
      background: var(--crust, #11111b);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }

    .distribution-segment {
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--crust, #11111b);
      min-width: 0;
      overflow: hidden;
    }

    .distribution-segment span {
      padding: 0 0.375rem;
      white-space: nowrap;
    }

    .segment-blocked { background: var(--red, #f38ba8); }
    .segment-ready { background: var(--blue, #89b4fa); }
    .segment-agent { background: var(--peach, #fab387); }
    .segment-human { background: var(--yellow, #f9e2af); }
    .segment-done { background: var(--green, #a6e3a1); }

    .distribution-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .legend-count {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    /* Epic progress */
    .epic-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .epic-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .epic-row:hover {
      background: var(--surface1, #45475a);
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
      min-width: 3rem;
    }

    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .epic-progress-bar {
      margin-top: 0.375rem;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .epic-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
      background: var(--green, #a6e3a1);
    }

    .epic-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .epic-stat {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-variant-numeric: tabular-nums;
    }

    .epic-percentage {
      font-weight: 600;
      min-width: 2.5rem;
      text-align: right;
    }

    /* Activity mini-feed */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      border-radius: 4px;
    }

    .activity-item:hover {
      background: var(--surface0, #313244);
    }

    .activity-icon {
      font-size: 0.875rem;
      width: 1.25rem;
      text-align: center;
      flex-shrink: 0;
    }

    .activity-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-text .tick-ref {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay0, #6c7086);
      white-space: nowrap;
    }

    /* Needs attention section */
    .attention-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .attention-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      border-left: 3px solid var(--yellow, #f9e2af);
      cursor: pointer;
      transition: background 0.15s;
    }

    .attention-item:hover,
    .attention-item.focused {
      background: var(--surface1, #45475a);
    }

    .attention-item.focused {
      outline: 2px solid var(--blue, #89b4fa);
      outline-offset: -2px;
    }

    .attention-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .attention-info {
      flex: 1;
      min-width: 0;
    }

    .attention-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attention-detail {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .attention-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
    }

    .attention-actions-hint {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .action-hint {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
    }

    .action-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    /* Two-column layout for lower sections */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    /* ================================================================
     * Detail Pane (inline tick detail)
     * ================================================================ */
    .detail-pane {
      background: var(--mantle, #181825);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
    }

    .detail-pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .detail-pane-header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
    }

    .detail-pane-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      flex-shrink: 0;
    }

    .detail-pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .detail-pane-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    .detail-pane-btn {
      background: none;
      border: 1px solid var(--surface1, #45475a);
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      font-size: 0.6875rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.15s;
      font-family: inherit;
    }

    .detail-pane-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
      border-color: var(--overlay0, #6c7086);
    }

    .detail-pane-btn.primary {
      background: var(--blue, #89b4fa);
      color: var(--crust, #11111b);
      border-color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .detail-pane-btn.primary:hover {
      opacity: 0.9;
    }

    .detail-pane-close {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1rem;
      line-height: 1;
    }

    .detail-pane-close:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    /* Detail pane body */
    .detail-tab-body {
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    /* Detail pane - Overview tab */
    .detail-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }

    .detail-meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1, #45475a);
      color: var(--subtext1, #bac2de);
    }

    .detail-meta-badge.type-bug { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.type-feature { background: rgba(137, 180, 250, 0.2); color: var(--blue); }
    .detail-meta-badge.type-epic { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.status-open { background: rgba(166, 227, 161, 0.2); color: var(--green); }
    .detail-meta-badge.status-in_progress { background: rgba(250, 179, 135, 0.2); color: var(--peach); }
    .detail-meta-badge.status-closed { background: var(--surface1); color: var(--subtext0); }
    .detail-meta-badge.awaiting { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.blocked { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.priority {
      border-left: 3px solid var(--priority-color, var(--subtext0));
    }

    .detail-description {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--crust, #11111b);
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface0, #313244);
      margin-bottom: 0.75rem;
    }

    .detail-field {
      margin-bottom: 0.75rem;
    }

    .detail-field-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .detail-field-value {
      font-size: 0.8125rem;
      color: var(--subtext1, #bac2de);
    }

    .detail-field-empty {
      font-size: 0.8125rem;
      color: var(--overlay0, #6c7086);
      font-style: italic;
    }

    .detail-link {
      color: var(--blue, #89b4fa);
      text-decoration: none;
      cursor: pointer;
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
    }

    .detail-link:hover {
      text-decoration: underline;
    }

    .detail-notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .detail-note {
      background: var(--crust, #11111b);
      border: 1px solid var(--surface0, #313244);
      border-radius: 6px;
      padding: 0.5rem 0.625rem;
      margin-bottom: 0.375rem;
    }

    .detail-note:last-child {
      margin-bottom: 0;
    }

    .detail-note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.6875rem;
    }

    .detail-note-author {
      font-weight: 500;
      color: var(--blue, #89b4fa);
    }

    .detail-note-time {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--overlay0, #6c7086);
    }

    .detail-note-text {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .detail-timestamps {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-ts-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
    }

    .detail-ts-label {
      color: var(--subtext0, #a6adc8);
    }

    .detail-ts-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--subtext1, #bac2de);
    }


    .detail-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.8125rem;
      gap: 0.5rem;
    }

    .detail-loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .dashboard-body {
        padding: 1rem;
      }

      .summary-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .two-col {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .dashboard {
        border-radius: 0;
        min-height: 100vh;
      }

      .summary-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    /* Empty state */
    .empty-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: var(--overlay0, #6c7086);
      font-size: 0.8125rem;
    }
  `;it.PRIORITY_LABELS={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};it.PRIORITY_COLORS={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};Nt([c({type:Array})],it.prototype,"ticks",2);Nt([c({type:Array})],it.prototype,"epics",2);Nt([c({type:Boolean,reflect:!0})],it.prototype,"open",2);Nt([c({type:Array})],it.prototype,"activities",2);Nt([c({type:String,attribute:"repo-name"})],it.prototype,"repoName",2);Nt([y()],it.prototype,"_focusedAttentionIndex",2);Nt([y()],it.prototype,"_detailTick",2);Nt([y()],it.prototype,"_detailNotes",2);Nt([y()],it.prototype,"_detailLoading",2);it=Nt([ht("tickflow-dashboard")],it);xs("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const t=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",t.scope),t.addEventListener("updatefound",()=>{const e=t.installing;e&&e.addEventListener("statechange",()=>{e.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",e=>{var i;((i=e.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",e.data.version)})}catch(t){console.error("[PWA] Service worker registration failed:",t)}});
