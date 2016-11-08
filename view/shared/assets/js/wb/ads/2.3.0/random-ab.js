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
   * Generates a random integer between 1 and 20
   * @returns {int}
   */
  var randomAB = function b() {
    return (Math.floor(Math.random() * 20) + 1);
  };

  /**
   * @returns {string}
   */
  function fromStorage() {
    var m, results;

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
   * @param {string} wbrandomab
   */
  function toStorage(wbrandomab) {
    if (w.localStorage) {
      w.localStorage[cookieName] = wbrandomab;
    }

    if (navigator.cookieEnabled) {
      d.cookie = [cookieName, '=', wbrandomab, '; expires=', expiry.toUTCString(), '; path=/; domain=', cookieDomain].join('');
    }
  }

  /**
   * Pushes random ab value into the pubads directly.
   */
  function toGoogletag() {
    if (typeof googletag !== 'undefined' && typeof googletag.pubads == 'function') {
      var ab = get();
      if ('OPTOUT' === ab) {
        ab = '';
        return;
      }

      for (var i = 0; i <= 20; i++) {
        googletag.pubads().setTargeting('ab' + i, ab);
      }
    }
  }

  /**
   * @returns {string}
   */
  function get() {
    return wbrandomab || generate();
  }

  /**
   * @param {int} value
   */
  function set(value) {
    wbrandomab = value;
    toStorage(wbrandomab);
  }

  /**
   * Flags the wbrandomab with OPTOUT which will cause it to be nullified in googletag.
   */
  function optout() {
    wbrandomab = 'OPTOUT';
    toStorage(wbrandomab);
  }

  /**
   * @returns {int}
   */
  function generate() {
    set(randomAB());
    return wbrandomab;
  }

  wbrandomab = fromStorage();

  // public interface
  _this.get = get;
  _this.set = set;
  _this.optout = optout;
  _this.regenerate = generate;
  _this.toGoogletag = toGoogletag;
  return _this;

});
