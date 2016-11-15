/**
 * @overview If this code is included on a page with wbads it will add the criteo data as global
 * targeting params to all ad slots rendered on the page.
 *
 * Set the globals window.CRTG_* prior to including this script
 * so the criteo tags are properly added.
 *
 * This script must be included AFTER wbads is included.
 *
 * @todo: consider rewriting all wbads and plugins as amd modules or at least with umd
 *
 * @requires window.CRTG_NID
 * @requires window.CRTG_COOKIE_NAME
 * @optional window.CRTG_VAR_NAME - defaults to 'crtg_content'
 * @requires window.wbads
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global wbads: true */

window.CRTG_NID = window.CRTG_NID || false;
window.CRTG_COOKIE_NAME = window.CRTG_COOKIE_NAME || false;
window.CRTG_VAR_NAME = window.CRTG_VAR_NAME || 'crtg_content';

(function(w, d, wbads) {
    'use strict';
    var ctagId = 'criteo-js',
        ctag = d.getElementById(ctagId);

    if (ctag) {
        if (!w.CRTG_NID) {
            w.CRTG_NID = ctag.getAttribute('data-nid') || false;
        }

        if (!w.CRTG_COOKIE_NAME) {
            w.CRTG_COOKIE_NAME = ctag.getAttribute('data-cookie-name') || false;
        }
    }

    if (!w.CRTG_NID || !w.CRTG_COOKIE_NAME || !w.CRTG_VAR_NAME) {
        return;
    }

    if (!ctag) {
        ctag = d.createElement('script');
        ctag.type = 'text/javascript';
        ctag.id = ctagId;
        ctag.async = true;
        ctag.setAttribute('class', ctagId);
        ctag.setAttribute('data-nid', w.CRTG_NID);
        ctag.setAttribute('data-cookie-name', w.CRTG_COOKIE_NAME);
        ctag.setAttribute('data-var-name', w.CRTG_VAR_NAME);

        var rnd = Math.floor(Math.random() * 99999999999);
        var url = location.protocol + '//rtax.criteo.com/delivery/rta/rta.js?netId=' + encodeURIComponent(w.CRTG_NID);
        url += '&cookieName=' + encodeURIComponent(w.CRTG_COOKIE_NAME);
        url += '&rnd=' + rnd;
        url += '&varName=' + encodeURIComponent(w.CRTG_VAR_NAME);
        ctag.src = url;
        d.getElementsByTagName('head')[0].appendChild(ctag);
    }

    /**
     * Get the criteo cookie value.
     *
     * @param {string} cookieName
     * @returns {string}
     */
    function getCookie(cookieName) {
        var i, x, y, cookies = document.cookie.split(';');
        for (i = 0; i < cookies.length; i++) {
            x = cookies[i].substr(0, cookies[i].indexOf('='));
            y = cookies[i].substr(cookies[i].indexOf('=') + 1);
            x = x.replace(/^\s+|\s+$/g, '');
            if (x == cookieName) {
                return decodeURIComponent(y);
            }
        }
        return'';
    }

    wbads.defineCallback('pre.enable.services', function() {
        var parts, params = getCookie(w.CRTG_COOKIE_NAME).split(';');
        for (var i = 0; i < params.length; i++) {
            parts = params[i].split('=');
            wbads.setGlobalTargetingParam('' + parts[0], '' + parts[1]);
        }
    });

}(window, document, window.wbads));
