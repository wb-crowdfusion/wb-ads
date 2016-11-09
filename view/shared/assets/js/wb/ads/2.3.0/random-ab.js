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
  var randomab;
  var cookieName = w.WB_RANDOMAB_COOKIE_NAME || 'wbrandomab';
  var cookieExpires = w.WB_RANDOMAB_COOKIE_EXPIRES || 365;
  var cookieDomain = (d.domain).match(/(.\.)?(\w+\.\w+)$/)[2];
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + cookieExpires);

  /**
   * Generates an array of 20 random integers between 1 and 20
   * @returns {Array}
   */
  function randomAB() {
    var twentyRandom = [];
    for (var i = 0; i < 20; i++) {
      twentyRandom.push((Math.floor(Math.random() * 20) + 1));
    }

    return twentyRandom;
  }

  /**
   * @returns {Array}
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
      results = results.split(',');
    }

    return results || '';
  }

  /**
   * @param {Array} values
   */
  function toStorage(values) {
    var randomAbString = values.join(',');

    if (w.localStorage) {
      w.localStorage[cookieName] = randomAbString;
    }

    if (navigator.cookieEnabled) {
      d.cookie = [cookieName, '=', randomAbString, '; expires=', expiry.toUTCString(), '; path=/; domain=', cookieDomain].join('');
    }
  }

  /**
   * Pushes random ab value into pubads directly.
   */
  function toGoogletag() {
    if (typeof googletag !== 'undefined' && typeof googletag.pubads == 'function') {
      var ab = get();
      for (var i = 0; i < ab.length; i++) {
        googletag.pubads().setTargeting('ab' + (i + 1), ab[i]);
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

    var str = '';
    for (var i = 0; i < randomab.length; i++) {
      str += 'ab' + (i + 1) + '=' + randomab[i] + '&';
    }
    str = str.slice(0, -1);

    return encode ? encodeURIComponent(str) : str;
  }

  /**
   * @returns {Array}
   */
  function get() {
    return randomab || generate();
  }

  /**
   * @param {Array} values
   */
  function set(values) {
    randomab = values;
    toStorage(values);
  }

  /**
   * @returns {Array}
   */
  function generate() {
    set(randomAB());
    return randomab;
  }

  randomab = fromStorage();

  // public interface
  _this.get = get;
  _this.set = set;
  _this.regenerate = generate;
  _this.toGoogletag = toGoogletag;
  _this.getGptCustParams = getGptCustParams;
  return _this;

});
