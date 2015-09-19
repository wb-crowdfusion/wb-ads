# CHANGELOG


## v2.2.4
* issue #6: [wb/ads/2.2.4/krux.js] Update krux interchange and provide wbkrux window global for extraction of krux data for use in kwidget, etc.


## v2.2.3
* issue #2: [wb/ads/2.2.3/ads.js] Changes ad size load order for less page jumping.


## v2.2.2
* [wb/ads/2.2.2/ads.js] Force "tile" property on a slot object to be set on the slot AND into the targeting.  ticket #243
* [wb/ads/2.2.2/ppid.js] ppid tracking module/id generator added.  ticket #246
* [wb/ads/2.2.2/ads.js] In "generateId" method, strip out invalid id chars.  ticket #245


## v2.2.1
* [wb/ads/2.2.1/ads.js] Set the Slot `slot_data.tile` with adDiv `data-tile` value.  ticket #237
* [wb/ads/2.2.1/ads.js] Use deferred/promise implementation to handle slot targeting and rendering.  ticket #233


## v2.2.0
* [wb/ads/2.2.0/ads.js] Allows for arbitrary targeting params being set on all slots.  ticket #190
* Adds [wb/ads/2.2.0/krux.js] Which injects krux user and segments to wbads global targeting.  ticket #218
* Adds [wb/ads/2.2.0/criteo.js] Which injects criteo segments to wbads global targeting.  ticket #190


## v2.1.3
* [wb/ads/2.1.3/ads.js] Adds support blank adzone for tmz-style ROS.  ticket #185
* [wb/ads/2.1.3/ads.js] Adds new event "filter.init.args".


## v2.1.2
* re-add Quantcast delivery tag ticket #199
* strip spaces from global_targeting.tag for adops  ticket #200


## v2.1.1
* update Quantcast delivery code which replaces hacks    ticket #182
* update debug messages from TPIX to WB ads
* support arrays in data pos attribute  ticket #183
* add eyereturn iframe buster    ticket #191
* change atlas iframe buster to root url     ticket #191

## v2.1.0
* modified defaults to be more generic wbads
* consolidate events to single name
* support pre-init setters via callback
* properly support refreshing ads via single-request mode


## v2.0.0
* Added DFP support
* replace tpixads.js with wb/js/2.0.0/ads.js (purge old js next release)
* all old-style tags replaced with GPT googletag objects


## v1.1.5
* Added option to set custom pos for tpixAd (affected all ads/*.cft files and tpixads.js).  ticket #159
* Added adsonards.js for async safe adsonar ads.


## v1.1.4
* Adding 728x90 atf/btf pos.  ticket #154


## v1.1.3
* Adding html attribute align="center" to tpixAd.prototype.write and wrapping rendered ad with <center> tags.  ticket #130


## v1.1.2
* Adding iframe-buster file for Doubleclick AdX


## v1.1.1
* Adding iframe-buster files for mediaplex


## v1.1.0
* upgrading sponsors to include badges on listing pages


## v1.0.4
* Adding iframe-buster files for all ad-vendors


## v1.0.3
* Adjusting tile=18, pos=btf3 per WB AdOps request
* Adds content blocks for rss,js,txt and xml.  This prevents exceptions in case these templates are included in an unsupported context.


## v1.0.2
* Adding tile=18, pos=inpost for new inbetween 300x250
* Adds DefaultPermissionsBindings for @wb-sponsors


## v1.0.1
* Moved tpixads js from wb-assets to this plugin.
* Added tpixAdConfig.setEnabled(boolean) function, causes ad.write to be ignored.
* tpixAdConfig debugging now renders into console, not alert.
* Adds route for tpixad refresh/iframe.


## v1.0.0
* initial version
