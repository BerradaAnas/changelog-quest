/*
 * Tiny standalone runtime for the Changelog Quest mock-up.
 *
 * The mock-up was designed on a design canvas as a ".dc.html" component:
 * an <x-dc> template with {{holes}}, <sc-if>/<sc-for> blocks and a
 * `class Component extends DCLogic` script. This file implements just the
 * subset the mock-up uses, so index.html opens in any browser with no build.
 *
 * It is a prototype helper, not production code. The real site will be
 * rebuilt as a proper static site (see docs/conception.md).
 */
(function () {
  "use strict";

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
      this.__render = null;
    }
    setState(patch) {
      var prev = Object.assign({}, this.state);
      var next = typeof patch === "function" ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, next);
      if (this.__render) this.__render(prev);
    }
    forceUpdate() {
      if (this.__render) this.__render(Object.assign({}, this.state));
    }
  }
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function lookup(path, scope) {
    path = path.trim();
    if (path === "true") return true;
    if (path === "false") return false;
    if (path === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split(".");
    var head = parts[0];
    var s = scope;
    while (s && !(Object.prototype.hasOwnProperty.call(s.vars, head))) s = s.parent;
    if (!s) return undefined;
    var v = s.vars[head];
    for (var i = 1; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interpolate(text, scope) {
    return text.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? "" : String(v);
    });
  }

  function child(scope, vars) { return { vars: vars, parent: scope }; }

  function renderNodes(nodes, scope, out) {
    for (var i = 0; i < nodes.length; i++) renderNode(nodes[i], scope, out);
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(interpolate(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();

    if (tag === "sc-if") {
      if (lookup(rawExpr(node.getAttribute("value")), scope)) renderNodes(node.childNodes, scope, out);
      return;
    }
    if (tag === "sc-for") {
      var list = lookup(rawExpr(node.getAttribute("list")), scope) || [];
      var as = node.getAttribute("as") || "item";
      for (var k = 0; k < list.length; k++) {
        var vars = { $index: k };
        vars[as] = list[k];
        renderNodes(node.childNodes, child(scope, vars), out);
      }
      return;
    }

    var el = document.importNode(node, false);
    var attrs = Array.prototype.slice.call(node.attributes);
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, val = attrs[a].value;
      if (name.indexOf("hint-") === 0) { el.removeAttribute(name); continue; }
      if (name.indexOf("on") === 0 && WHOLE.test(val)) {
        el.removeAttribute(name);
        var fn = lookup(val.match(WHOLE)[1], scope);
        var evt = name.slice(2).toLowerCase();
        if (evt === "change" && (tag === "input" || tag === "textarea")) evt = "input";
        if (typeof fn === "function") el.addEventListener(evt, fn);
        continue;
      }
      if (val.indexOf("{{") !== -1) {
        var str = interpolate(val, scope);
        el.setAttribute(name, str);
        if (name === "value" && "value" in el) el.value = str;
      }
    }
    renderNodes(node.childNodes, scope, el);
    out.appendChild(el);
  }

  function rawExpr(v) {
    var m = (v || "").match(WHOLE);
    return m ? m[1] : (v || "");
  }

  function boot() {
    var host = document.querySelector("x-dc");
    var scriptEl = document.querySelector("script[data-dc-script]");
    if (!host || !scriptEl) return;

    // Move <helmet> contents into <head>.
    var helmet = host.querySelector("helmet");
    if (helmet) {
      Array.prototype.slice.call(helmet.children).forEach(function (n) { document.head.appendChild(n); });
      helmet.remove();
    }

    // Keep the template inert.
    var tpl = document.createElement("template");
    tpl.innerHTML = host.innerHTML;
    var root = document.createElement("div");
    root.id = "dc-root";
    host.replaceWith(root);

    // Props from data-props defaults.
    var props = {};
    try {
      var decl = JSON.parse(scriptEl.getAttribute("data-props") || "{}");
      Object.keys(decl).forEach(function (k) {
        if (k.charAt(0) !== "$" && decl[k] && "default" in decl[k]) props[k] = decl[k].default;
      });
    } catch (e) { /* ignore */ }

    var Component = new Function("DCLogic", scriptEl.textContent + "\nreturn Component;")(DCLogic);
    var comp = new Component(props);
    var mounted = false;

    function render(prevState) {
      // Preserve focus and caret across re-renders (full DOM rebuild).
      var active = document.activeElement;
      var focusId = active && active.id ? active.id : null;
      var selStart = null, selEnd = null;
      try { if (focusId) { selStart = active.selectionStart; selEnd = active.selectionEnd; } } catch (e) {}

      var frag = document.createDocumentFragment();
      renderNodes(tpl.content.childNodes, { vars: comp.renderVals(), parent: null }, frag);
      root.replaceChildren(frag);

      if (focusId) {
        var again = document.getElementById(focusId);
        if (again) {
          again.focus();
          try { if (selStart != null) again.setSelectionRange(selStart, selEnd); } catch (e) {}
        }
      }
      if (mounted && comp.componentDidUpdate) comp.componentDidUpdate(comp.props, prevState || {});
    }

    comp.__render = render;
    render(null);
    mounted = true;
    if (comp.componentDidMount) comp.componentDidMount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
