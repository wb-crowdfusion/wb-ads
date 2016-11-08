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
  w.wbrandomab = factory(w, d);

  // Montage Require
  if (typeof bootstrap === 'function') {
    bootstrap('wbrandomab', w.wbrandomab);
  }

  // CommonJS/Node
  if (typeof exports === 'object') {
    module.exports = w.wbrandomab;
  }

  // RequireJS
  if (typeof define === 'function' && define.amd) {
    define('wbrandomab', [], w.wbrandomab);
  }

})(window, document, function(w, d, undefined) {
  'use strict';

  var _this = {};
  var wbrandomab;
  var cookieName = w.WB_RANDOMAB_COOKIE_NAME || 'wbrandomab';
  var cookieExpires = w.WB_RANDOMAB_COOKIE_EXPIRES || 365;
  var cookieDomain = (d.domain).match(/(.\.)?(\w+\.\w+)$/)[2];
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + cookieExpires);

  /**
   * Generates an array of 20 random integers between 1 and 20
   * @returns {object}
   */
  var randomAB = function b() {
    var twentyRandom = {};
    for (var i = 0; i <= 20; i++) {
      twentyRandom['a' + i] = (Math.floor(Math.random() * 20) + 1);
    }

    return twentyRandom;
  };

  /**
   * @returns {string}
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

    if (results !== false) {
      var deserialized = results.split('&');
      results = {};

      for (var i = 0; i < deserialized.length; i++) {
        var splitValues = deserialized[i].split('=');
        results[splitValues[0]] = splitValues[1];
      }
    }

    return results || '';
  }

  /**
   * @param {Array} values
   */
  function toStorage(values) {
    for (var key in values) {
      wbrandomab += key + '=' + values[key] + '&';
    }

    wbrandomab = wbrandomab.slice(0, -1);

    if (w.localStorage) {
      w.localStorage[cookieName] = wbrandomab;
    }

    if (navigator.cookieEnabled) {
      d.cookie = [cookieName, '=', wbrandomab, '; expires=', expiry.toUTCString(), '; path=/; domain=', cookieDomain].join('');
    }
  }

  /**
   * Pushes random ab value into pubads directly.
   */
  function toGoogletag() {
    if (typeof googletag !== 'undefined' && typeof googletag.pubads == 'function') {
      var ab = get();
      for (var key in ab) {
        googletag.pubads().setTargeting(key, ab[key]);
      }
    }
  }

  /**
   * Returns the ab test values that can be used in gpt cust_params.
   * @link https://support.google.com/dfp_premium/answer/1080597?vid=1-635782176383068807-3377878002
   *
   * @param {boolean} encode - defaults to true, when true encodes the entire result with encodeURIComponent
   * @return {string}
   */
  function getGptCustParams(encode) {
    encode = encode || true;

    var str = wbrandomab;
    return encode ? encodeURIComponent(str) : str;
  }

  /**
   * @returns {string}
   */
  function get() {
    return wbrandomab || generate();
  }

  /**
   * @param {object} values
   */
  function set(values) {
    wbrandomab = values;
    toStorage(values);
  }

  /**
   * @returns {string}
   */
  function generate() {
    set(randomAB());
    return wbrandomab;
  }

  wbrandomab = fromStorage();

  // public interface
  _this.get = get;
  _this.set = set;
  _this.regenerate = generate;
  _this.toGoogletag = toGoogletag;
  _this.getGptCustParams = getGptCustParams;
  return _this;

});
