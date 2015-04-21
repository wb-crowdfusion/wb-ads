TODO
------------

* Review ads js for cleaner strategy, possible ref: http://exisweb.net/how-to-use-google-adsense-on-a-responsive-website



DEPENDENCIES
------------


CHANGES
-------

2.2.2
    * [wb/ads/2.2.2/ads.js] Force "tile" property on a slot object to be set on the slot AND into the targeting.  ticket #243
    * [wb/ads/2.2.2/ppid.js] ppid tracking module/id generator added.  ticket #246
    * [wb/ads/2.2.2/ads.js] In "generateId" method, strip out invalid id chars.  ticket #245


2.2.1
    * [wb/ads/2.2.1/ads.js] Set the Slot `slot_data.tile` with adDiv `data-tile` value.  ticket #237
    * [wb/ads/2.2.1/ads.js] Use deferred/promise implementation to handle slot targeting and rendering.  ticket #233


2.2.0
    * [wb/ads/2.2.0/ads.js] Allows for arbitrary targeting params being set on all slots.  ticket #190
    * Adds [wb/ads/2.2.0/krux.js] Which injects krux user and segments to wbads global targeting.  ticket #218
    * Adds [wb/ads/2.2.0/criteo.js] Which injects criteo segments to wbads global targeting.  ticket #190


2.1.3
    * [wb/ads/2.1.3/ads.js] Adds support blank adzone for tmz-style ROS.  ticket #185
    * [wb/ads/2.1.3/ads.js] Adds new event "filter.init.args".


2.1.2
    * re-add Quantcast delivery tag ticket #199
    * strip spaces from global_targeting.tag for adops  ticket #200

  -- doug.mecca Sep 25, 2014

2.1.1
    * update Quantcast delivery code which replaces hacks    ticket #182
    * update debug messages from TPIX to WB ads
    * support arrays in data pos attribute  ticket #183
    * add eyereturn iframe buster    ticket #191
    * change atlas iframe buster to root url     ticket #191

2.1.0
    * modified defaults to be more generic wbads
    * consolidate events to single name
    * support pre-init setters via callback
    * properly support refreshing ads via single-request mode

  -- doug.mecca Jun 23, 2014

2.0.0
    * Added DFP support
    * replace tpixads.js with wb/js/2.0.0/ads.js (purge old js next release)
    * all old-style tags replaced with GPT googletag objects

  -- doug.mecca Jun 16, 2014

1.1.5
    * Added option to set custom pos for tpixAd (affected all ads/*.cft files and tpixads.js).  ticket #159
    * Added adsonards.js for async safe adsonar ads.

  -- greg.brown Feb 20, 2014


1.1.4
    * Adding 728x90 atf/btf pos.  ticket #154

  -- doug.mecca Feb 3 2014

1.1.3
    * Adding html attribute align="center" to tpixAd.prototype.write and wrapping rendered ad with <center> tags.  ticket #130

  -- doug.mecca Nov 13 2013

1.1.2
    * Adding iframe-buster file for Doubleclick AdX

  -- daniella.rutel Nov 6 2013

1.1.1
    * Adding iframe-buster files for mediaplex

  -- jb.smith Dec 14 2012

1.1.0
    * upgrading sponsors to include badges on listing pages

  -- doug.mecca Oct 17 2012

1.0.4
    * Adding iframe-buster files for all ad-vendors

  -- doug.mecca May 09 2012

1.0.3
    * Adjusting tile=18, pos=btf3 per WB AdOps request
    * Adds content blocks for rss,js,txt and xml.  This prevents exceptions in case these
        templates are included in an unsupported context.

  -- doug.mecca Apr 02 2012

1.0.2
    * Adding tile=18, pos=inpost for new inbetween 300x250
    * Adds DefaultPermissionsBindings for @wb-sponsors

  -- doug.mecca Feb 22 2012

1.0.1
    * Moved tpixads js from wb-assets to this plugin.
    * Added tpixAdConfig.setEnabled(boolean) function, causes ad.write to be ignored.
    * tpixAdConfig debugging now renders into console, not alert.
    * Adds route for tpixad refresh/iframe.

1.0.0
    * initial version