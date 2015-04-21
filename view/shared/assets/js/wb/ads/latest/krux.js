/**
 * @overview If this code is included on a page with wbads it will add the krux data as global
 * targeting params to all ad slots rendered on the page.
 *
 * Set the global window.KRUX_CONFID prior to including this script
 * so the Krux control tags are properly added.
 *
 * This script must be included AFTER wbads is included.
 *
 * @todo: consider rewriting all wbads and plugins as amd modules or at least with umd
 *
 * @requires window.KRUX_CONFID
 * @requires window.wbads
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global Krux: true, wbads: true */

window.KRUX_CONFID = window.KRUX_CONFID || false;
window.Krux||((Krux=function(){Krux.q.push(arguments)}).q=[]);

(function(w, d, wbads) {
    'use strict';
    var ctagId = 'kxct',
        ctag = d.getElementById(ctagId);

    if (ctag && !w.KRUX_CONFID) {
        w.KRUX_CONFID = ctag.getAttribute('data-id') || false;
    }

    if (!w.KRUX_CONFID) {
        return;
    }

    if (!ctag) {
        ctag = d.createElement('script');
        ctag.type = 'text/javascript';
        ctag.id = ctagId;
        ctag.setAttribute('class', ctagId);
        ctag.setAttribute('data-id', w.KRUX_CONFID);
        ctag.setAttribute('data-timing', 'async');
        ctag.setAttribute('data-version', '1.9');
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

    /**
     * Helper function to retrieve krux data from localstorage or cookies.
     *
     * @param {string} n
     * @returns {*}
     */
    function retrieve(n) {
        var m, k = 'kx' + n, results;
        if (w.localStorage) {
            results =  w.localStorage[k] || '';
        } else if (navigator.cookieEnabled) {
            m = d.cookie.match(k + '=([^;]*)');
            results = m && encodeURIComponent(m[1]) || '';
        } else {
            results = '';
        }
        return results;
    }

    wbads.defineCallback('pre.enable.services', function() {
        // intentional late assignment of krux data
        w.Krux.user = retrieve('user');
        w.Krux.segments = (retrieve('segs') && retrieve('segs').split(',')) || [];

        wbads.setGlobalTargetingParam('ksg', w.Krux.segments);
        wbads.setGlobalTargetingParam('kuid', w.Krux.user);
        wbads.setGlobalTargetingParam('khost', encodeURIComponent(d.location.hostname));
    });

}(window, document, window.wbads));
