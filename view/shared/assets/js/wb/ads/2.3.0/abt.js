/**
 * @overview
 * Generates a random value between 1 and 20 for ab testing in googletag/dfp ad calls.
 *
 * This script should be included AFTER googletag is loaded.
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global window: false, googletag: false, localStorage: false */

(function(w, d, factory) {
  'use strict';
  w.wbabt = factory(w, d);

  // Montage Require
  if (typeof bootstrap === 'function') {
    bootstrap('wbabt', w.wbabt);
  }

  // CommonJS/Node
  if (typeof exports === 'object') {
    module.exports = w.wbabt;
  }

  // RequireJS
  if (typeof define === 'function' && define.amd) {
    define('wbabt', [], w.wbabt);
  }

})(window, document, function(w, d, undefined) {
  'use strict';

  var _this = {};
  var abt;
  var cookieName = w.WB_ABT_COOKIE_NAME || 'wbabt';
  var cookieExpires = w.WB_ABT_COOKIE_EXPIRES || 365;
  var cookieDomain = (d.domain).match(/(.\.)?(\w+\.\w+)$/)[2];
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + cookieExpires);

  /**
   * Generates a random integer between 1 and 20
   * @returns {int}
   */
  function randomAbt() {
    return (Math.floor(Math.random() * 20) + 1);
  }

  /**
   * @returns {string} results
   */
  function fromStorage() {
    var m;
    var results;

    if (w.localStorage) {
      results = w.localStorage[cookieName] || false;
    }

    if (!results && navigator.cookieEnabled) {
      m = d.cookie.match(cookieName + '=([^;]*)');
      results = m && encodeURIComponent(m[1]) || false;
    }

    return results || '';
  }

  /**
   * @param {int} value
   */
  function toStorage(value) {
    if (w.localStorage) {
      w.localStorage[cookieName] = value;
    }

    if (navigator.cookieEnabled) {
      d.cookie = [cookieName, '=', value, '; expires=', expiry.toUTCString(), '; path=/; domain=', cookieDomain].join('');
    }
  }

  /**
   * Pushes random ab value into pubads directly.
   */
  function toGoogletag() {
    if (typeof googletag !== 'undefined' && typeof googletag.pubads == 'function') {
      var ab = get();
      googletag.pubads().setTargeting('abt', ab);
    }
  }

  /**
   * Returns the ab test value that can be used in gpt cust_params.
   * @link https://support.google.com/dfp_premium/answer/1080597?vid=1-635782176383068807-3377878002
   *
   * @param {boolean} encode - defaults to true, when true encodes the entire result with encodeURIComponent
   * @return {string}
   */
  function getGptCustParams(encode) {
    encode = encode || true;

    var str = 'abt=' + abt;

    return encode ? encodeURIComponent(str) : str;
  }

  /**
   * @returns {int}
   */
  function get() {
    return abt || generate();
  }

  /**
   * @param {int} value
   */
  function set(value) {
    abt = value;
    toStorage(value);
  }

  /**
   * @returns {int}
   */
  function generate() {
    set(randomAbt());
    return abt;
  }

  abt = fromStorage();

  // public interface
  _this.get = get;
  _this.set = set;
  _this.regenerate = generate;
  _this.toGoogletag = toGoogletag;
  _this.getGptCustParams = getGptCustParams;
  return _this;

});
