/**
 * @overview
 * Generates a random identifier for the user for use in googletag/dfp ad calls.
 * This is primarily to help with making frequency capping more reliable since
 * browsers like Safari are now blocking third party cookies which means the
 * built-in tracking that dfp has is lost.
 *
 * This script should be included AFTER googletag is loaded.
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global window: false, googletag: false, localStorage: false */

(function(w, d, factory) {
  'use strict';
  w.wbppid = factory(w, d);

  // Montage Require
  if (typeof bootstrap === 'function') {
    bootstrap('wbppid', w.wbppid);
  }

  // CommonJS/Node
  if (typeof exports === 'object') {
    module.exports = w.wbppid;
  }

  // RequireJS
  if (typeof define === 'function' && define.amd) {
    define('wbppid', [], w.wbppid);
  }

})(window, document, function(w, d, undefined) {
  'use strict';

  var _this = {};
  var ppid;
  var cookieName = w.WB_PPID_COOKIE_NAME || 'wbppid';
  var cookieExpires = w.WB_PPID_COOKIE_EXPIRES || 365;
  var cookieDomain = (d.domain).match(/(.\.)?(\w+\.\w+)$/)[2];
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + cookieExpires);

  /**
   * Generates a version 4 random uuid.
   * @returns {string}
   */
  var uuidv4 = function b(a) {
    return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, b);
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
   * @param {string} ppid
   */
  function toStorage(ppid) {
    if (w.localStorage) {
      w.localStorage[cookieName] = ppid;
    }

    if (navigator.cookieEnabled) {
      d.cookie = [cookieName, '=', ppid, '; expires=', expiry.toUTCString(), '; path=/; domain=', cookieDomain].join('');
    }
  }

  /**
   * Pushes our pp id into the pubads directly.
   */
  function toGoogletag() {
    if (typeof googletag !== 'undefined' && typeof googletag.pubads == 'function') {
      var id = get();
      if ('OPTOUT' === id) {
        id = '';
      }
      googletag.pubads().setPublisherProvidedId(id);
    }
  }

  /**
   * @returns {string}
   */
  function get() {
    return ppid || generate();
  }

  /**
   * The Rules:
   * - Alphanumeric ([0-9a-zA-Z]).
   * - A minimum of 32 characters.
   * - A maximum of 150 characters.
   *
   * @param {string} value
   */
  function set(value) {
    value = value.replace(/[\W_]/g, '');
    if (value.length < 32 || value.length > 150) {
      value = '';
    }
    ppid = value;
    toStorage(ppid);
  }

  /**
   * Flags the ppid with OPTOUT which will cause it to be nullified in googletag.
   */
  function optout() {
    ppid = 'OPTOUT';
    toStorage(ppid);
  }

  /**
   * @returns {string}
   */
  function generate() {
    set(uuidv4());
    return ppid;
  }

  ppid = fromStorage();

  // public interface
  _this.get = get;
  _this.set = set;
  _this.optout = optout;
  _this.regenerate = generate;
  _this.toGoogletag = toGoogletag;
  return _this;

});
