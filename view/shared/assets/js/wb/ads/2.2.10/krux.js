/**
 * @overview If this code is included on a page with wbads it will add the krux data as global
 * targeting params to all ad slots rendered on the page.
 *
 * Set the global window.KRUX_CONFID prior to including this script
 * so the Krux control tags are properly added.
 *
 * This script must be included AFTER wbads is included.
 *
 * Note that although this looks like a nice and tidy UMD implementation, it's not, it's
 * adding the module to all loaders if found AND the window global.  This is because
 * we have mixed use of globals, requirejs, etc.  For now, this is the least putrid
 * setup so sites using full requirejs don't have to define wbkrux separately.
 * wbppid (ppid.js) is also doing this.
 *
 * @todo: consider rewriting all wbads and plugins as amd modules or at least with umd
 *
 * @requires window.KRUX_CONFID
 * @requires window.wbads
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global Krux: true, wbads: true */

window.KRUX_CONFID = window.KRUX_CONFID || false;
window.KRUX_VERSION = window.KRUX_VERSION || '1.9';
window.Krux||((Krux=function(){Krux.q.push(arguments)}).q=[]);

(function(w, d, wbads, krux, factory) {
  'use strict';
  w.wbkrux = factory(w, d, wbads, krux);

  // Montage Require
  if (typeof bootstrap === 'function') {
    bootstrap('wbkrux', w.wbkrux);
  }

  // CommonJS/Node
  if (typeof exports === 'object') {
    module.exports = w.wbkrux;
  }

  // RequireJS
  if (typeof define === 'function' && define.amd) {
    define('wbkrux', [], w.wbkrux);
  }

})(window, document, window.wbads, window.Krux, function(w, d, wbads, krux) {
  'use strict';

  var _this = {};
  var ctagId = 'kxct';
  var ctag = d.getElementById(ctagId);

  /**
   * Helper function to retrieve krux data from localstorage or cookies.
   *
   * @param {string} n - the name of the property to retrieve
   * @param {string} ns - the namespace the data is stored in.
   * @returns {*}
   */
  function retrieve(n, ns) {
    var m, k = ns + n;
    if (w.localStorage) {
      return w.localStorage[k] || '';
    } else if (navigator.cookieEnabled) {
      m = d.cookie.match(k + '=([^;]*)');
      return m && decodeURIComponent(m[1]) || '';
    }
    return '';
  }

  /**
   * Returns the raw krux parameter or an empty string.
   * @returns {string}
   */
  function getParam(n) {
    return retrieve(n, 'kxwarnerbros_') || retrieve(n, 'kxwarnerbros') || retrieve(n, 'kx');
  }

  /**
   * Returns the krux user or empty string
   * @returns {string}
   */
  function getUser() {
    return getParam('user');
  }

  /**
   * Returns the krux segments/segs or empty array
   * @returns {string[]}
   */
  function getSegments() {
    var segs = getParam('segs');
    return segs && segs.split(',') || [];
  }

  /**
   * Returns the krux data that can be used in gpt cust_params.
   * @link https://support.google.com/dfp_premium/answer/1080597?vid=1-635782176383068807-3377878002
   *
   * @param {boolean} encode - defaults to true, when true encodes the entire result with encodeURIComponent
   * @return {string}
   */
  function getGptCustParams(encode) {
    encode = encode || true;
    var ksg = getSegments();
    var kuid = getUser();
    var khost = encodeURIComponent(d.location.hostname);
    var str = 'ksg=' + ksg + '&kuid=' + kuid + '&khost=' + khost;
    return encode ? encodeURIComponent(str) : str;
  }

  if (ctag && !w.KRUX_CONFID) {
    w.KRUX_CONFID = ctag.getAttribute('data-id') || false;
  }

  // public interface
  _this.getParam = getParam;
  _this.getUser = getUser;
  _this.getSegments = getSegments;
  _this.getGptCustParams = getGptCustParams;

  if (!w.KRUX_CONFID) {
    return _this;
  }

  if (!ctag) {
    ctag = d.createElement('script');
    ctag.type = 'text/javascript';
    ctag.id = ctagId;
    ctag.setAttribute('class', ctagId);
    ctag.setAttribute('data-id', w.KRUX_CONFID);
    ctag.setAttribute('data-timing', 'async');
    ctag.setAttribute('data-version', w.KRUX_VERSION);
    var s = d.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ctag, s);

    var k = d.createElement('script');
    k.type = 'text/javascript';
    k.async = true;
    var m, src = (m=location.href.match(/\bkxsrc=([^&]+)/)) && decodeURIComponent(m[1]);
    k.src = /^https?:\/\/([a-z0-9_\-\.]+\.)?krxd\.net(:\d{1,5})?\//i.test(src) ? src : src === 'disable' ? '' :
        (location.protocol === 'https:' ? 'https:' : 'http:') + '//cdn.krxd.net/controltag?confid=' + w.KRUX_CONFID;
    s.parentNode.insertBefore(k, s);
  }

  wbads.defineCallback('pre.enable.services', function() {
    krux.user = getUser();
    krux.segments = getSegments();

    wbads.setGlobalTargetingParam('ksg', krux.segments);
    wbads.setGlobalTargetingParam('kuid', krux.user);
    wbads.setGlobalTargetingParam('khost', encodeURIComponent(d.location.hostname));
  });

  return _this;
});
