/**
 * @requires window.jQuery
 *
 * @fileOverview
 * Telepix banner ad manager. Inserts Google DFP premium ad tags into the calling page.
 *
 * Auto-discovery mode by default, set selector containing ad containers, attach data- attributes, and let
 * buildSlots() find all the ad containers.  Once slots are set up, a call to showAds() will tell google to queue the ads
 * in all discovered containers.  subsequent showAds() calls will queue ads from new containers, as well as any
 * which contain the data-refresh="true" attribute
 *
 * Programmatic mode (can be combined with auto-discovery mode) allows programmatic insertion of slots as well as
 * custom global targeting and targeting for existing/new slots.  subsequent calls to showAds() are still required
 * to update any created/modified slots
 *
 * @see <a href="https://support.google.com/dfp_premium/answer/1650154?hl=en">google's official documentation</a>
 *
 * @usage wbads.init( '4321', 'Mysite', 'Myzone', { debug_enabled: true }, { collapse_empty_divs: true, global_targeting: { category: "kids" } });
 *          ...discovery method...
 *     <insert empty divs in body where ads go, using class="[insert selector here]">
 *          ...and/or programmatic method...
 *          wbads.addSlot(.....)
 *          wbads.setChannel('ellentv');  //optional
 *          wbads.setGlobalTargetingParam('category','ellentv'); // optional
 *          ...after all ads defined...
 *     wbads.buildSlots();
 *
 *     wbads.showAds();
 *
 */
/*jslint browser: true, devel: true, todo: true, regexp: true */
/*global jQuery */
/*** BEGIN REQUIRED GOOGLE DFP PREMIUM AD CODE ***/
if( typeof googletag === "undefined" ){
    var googletag = googletag || {};
    googletag.cmd = googletag.cmd || [];
    (function() {
        var gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        var useSSL = 'https:' == document.location.protocol;
        gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
        var node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(gads, node);
    })();
}
/*** END REQUIRED GOOGLE DFP PREMIUM AD CODE ***/

/** used when quantcast enabled */
var _qevents = _qevents || [];

var wbads = (function($, googletag, window, document, undefined) {
    'use strict';

    var _this = Object.create({});
    var settings;
    var dfp_settings;
    var display_provider = googletag;

    /** @type {string} unit_name - calculated from <tt>required_params</tt> */
    var unit_name       = "",
        required_params = {
            site_id:       "",
            site_domain:   "",
            ad_zone:       "article"
        };

    var module_defaults  = {
        /** @type {boolean} enabled - if false, ads won't render */
        enabled:            true,
        debug_enabled:      false,
        device_view:        "main",
        selector:           "wbads",
        data_store:         "wbadsdata",
        evt_callbacks:      {
            "pre.init":             {},
            "post.init":            {},
            "pre.enable.services":  {},
            "post.enable.services": {},
            "pre.slot.discovery":   {},
            "post.slot.discovery":  {},
            "pre.slot.define":      {},
            "post.slot.define":     {},
            "pre.display.ads":      {},
            "post.display.ads":     {}
        },
        quantcast:          {
            enabled:                true,
            qacct:                  "p-21jBY4_vbHNJQ",
            segs:                   ""
        }
    };

    /** @type {object} dfp_options - page-wide options to pass to the google ad service */
    var dfp_defaults     = {
            collapse_empty_divs:        false,
            disable_initial_load:       false,  // If webpage has an auto-play video player, set this to true
            enable_single_request:      false,
            enable_async_rendering:     true,
            enable_video_ads:           false,
            no_fetch:                   false,
            disable_publisher_console:  false,
            category_exclusion:         [],     // array of categories
            /**
             * qcs : The format should be ['####', '####', '####', 'etc']
             * category : channel from cf
             * tag : hashtags from cf
             * url : the URL of the page after .com. eg ellentv.com/photos the url value should be ['/photos']
             * adtest : if "?adtest=keyword" appended to URL then pass ['keyword'] as value
             */
            global_targeting: {
                qcs:                    {},
                category:               "",
                channel:                "", /** duplicate of category for consistency */
                tag:                    [],
                url:                    "",
                adtest:                 ""
            } /** todo: consider removing these explicit defs but they don't hurt */
    };

    /** cmd queue for googletag */
    var cmd = [];

    /** @type {Object} slots - hash table of created local slot objects */
    var slots = {},
        slot_count = 0;

    /** @type {object}
     * todo: find out if adops even has device-specific size mappings
     */
    var ad_sizes_list = {
        main: {
            leaderboard: [[728, 90]],
            leaderboard_flex: [[728, 90], [970, 66], [1010, 150], [970, 250], [1010, 250]],
            medium_rectangle: [[300, 250]],
            medium_rectangle_flex: [[300, 250], [300, 600]],
            skin: [[1, 1]]
        },
        /**
         * todo: make responsive via google's sizeMapping()/defineSizeMapping()/addSize() methods
         */
        smartphone: {
            leaderboard: [[320, 50]],
            leaderboard_flex: [[300, 250], [320, 50]],
            leaderboard_all: [[1, 1], [300, 250], [320, 50], [320, 360], [320, 480]],
            medium_rectangle: [[300, 250]],
            medium_rectangle_flex: [[300, 250], [300, 600]],
            skin: [[1, 1]]
        }
    };

    /**
     * @constructor
     * locally stored slot object instance
     */
    function Slot(id) {
        this.deferred = new $.Deferred();
        this.div_id = id;
        this.gpt_slot_object = false;
        this.slot_data = {
            tile:          "",
            size_list:     "",
            size_nickname: "",
            interstitial:  false,
            refresh:       false,

            /**
             * eg. { "interests": ["sports", "music", "movies"], "pos": ["atf"], "age": "20-30"] }
             * then eg. slot1.setTargeting( "pos", ["atf"] ).setTargeting( "age", "20-30" );
             */
            slot_targeting: {},

            /**
             * eg.  addSize( [browser-size], [[ad-size1],..,[ad-sizeN]] )...
             *   var mapping = googletag.sizeMapping().
             *   addSize([1024, 768], [970, 250]).  // desktop
             *   addSize([980, 690], [728, 90]).    // ipad
             *   addSize([640, 480], [120, 60]).    // mobile
             *   addSize([0, 0], [88, 31]).         // Fits browsers of any size smaller than 640 x 480
             *   build();
             *   adSlot.defineSizeMapping(mapping);
             */
            responsive_size_map: {},

            /**
             * values for AdSense parameters on a particular ad slot.
             * These will override any values set at the service level for this key.
             * All values must be set before any display call.
             * eg. slot.set("adsense_background_color", "#FFFFFF");
             * @link https://support.google.com/dfp_premium/answer/1650154?expand=pubservice_details#set
             */
            adsense_params: {}
        };

        var _this = this;
        defineCallback('pre.display.ads', function() {
            if (!_this.hasGptSlot()) {
                return;
            }

            $.each(_this.slot_data.slot_targeting, function (k, v) {
                if (k && v != '' && typeof v != 'undefined') {
                    _this.gpt_slot_object.setTargeting(k, v);
                }
            });
        });
    }

    /**
     * Stores values for targeting keys and slot parameters on a particular ad slot.
     * these will be applied when the slot is processed and added to google pubads service
     *
     * @param {string} key
     * @param {*} value
     * @return {Slot}
     */
    Slot.prototype.setTargetingParam = function(key, value) {
        if (key && value != '' && typeof value != 'undefined') {
            this.slot_data.slot_targeting[key] = value;
        }
        return this;
    };

    /**
     * @returns {Slot}
     */
    Slot.prototype.refresh = function () {
        if (this.hasGptSlot()) {
            display_provider.pubads().refresh([this.gpt_slot_object]);
        }
        return this;
    };

    /**
     * @param {Object} gptSlot
     * @return {Slot}
     */
    Slot.prototype.attachGptSlot = function(gptSlot) {
        this.gpt_slot_object = gptSlot;
        var _this = this;
        $.each(_this.slot_data.slot_targeting, function (k, v) {
            if (k && v != '' && typeof v != 'undefined') {
                _this.gpt_slot_object.setTargeting(k, v);
            }
        });
        this.deferred.resolve(this);
        return this;
    };

    /**
     * @return {bool}
     */
    Slot.prototype.hasGptSlot = function() {
        return this.gpt_slot_object ? true : false;
    };

    /**
     *  todo consider supporting any helpful SLOT-specific methods such as...
     *  addService(service)
     *  Adds the ad slot to the specified Google tag service.
     *
     *  clearTargeting()
     *  Clears all slot-level targeting for a particular ad slot.
     *
     *  set(key, value)
     *  Sets values for AdSense parameters on a particular ad slot.
     *
     *  setClickUrl(url)
     *  Sets the redirect URL for a click on an ad in a particular slot. The DoubleClick servers still record a click even if the click URL is replaced, but any landing page URL associated with the creative that is served is overridden.
     *
     *  setCollapseEmptyDiv(collapse, collapseBeforeAdFetch [optional])
     *  Specifies a slot-specific override to the page-wide div collapse behavior that was specified through pubService.collapseEmptyDivs().
     *
     *  setTargeting(key, value)
     *  Sets values for targeting keys on a particular ad slot.
     */

    /*
     * sets up the config object. (to be called explicitly from the page ie wbads.init('8310','Ellen','Homepage') )
     * @param {string} site_id a code provided by AdOps representing the site / partner
     * @param {string} site_domain a code provided by AdOps representing the specific site subdomain
     * @param {string} ad_zone a code representing the current page section NOTE: 1st 3 required_params will be combined to form a unit_name
     * @param {object} options module-specific settings, default-overrides
     * @param {object} dfp_options googledfp-specific settings, default-overrides
     * eg like... init("55123377", "ellen", "home", { debug_enabled: true }, {} )
     *
     * @return {*}
     *
     */
    function init(site_id, site_domain, ad_zone, options, dfp_options) {
        var initArgs = {site_id: site_id, site_domain: site_domain, ad_zone: ad_zone, options: options, dfp_options: dfp_options};
        trigger("filter.init.args", initArgs);
        site_id = initArgs.site_id;
        site_domain = initArgs.site_domain;
        ad_zone = initArgs.ad_zone;
        options = initArgs.options;
        dfp_options = initArgs.dfp_options;

        settings = $.extend({}, module_defaults, options);
        dfp_settings = $.extend({}, dfp_defaults, dfp_options);

        // if req'd params invalid or missing, or if !settings.enabled, nothing can happen
        // these parameters combined form the networkId
        settings.enabled = setRequiredParam("site_id", site_id) && setRequiredParam("site_domain", site_domain);

        // see ticket #185: adzone can be blank for tmz ros ads, still explicitly required but empty string now valid
        var hasAdzone = ad_zone ? true : false;
        setRequiredParam("ad_zone", ad_zone);

        unit_name = "/" + getRequiredParam("site_id") + "/" + getRequiredParam("site_domain") + (hasAdzone ? "/" + getRequiredParam("ad_zone") : "");

        if (!settings.enabled) {
            debug("init :: WBADS ads disabled. no ad slots will be created or displayed");
            return _this;
        }

        $.each(settings.evt_callbacks, function(name, func) {
            defineCallback(name, func);
        });

        // get automatic global targeting prior to pre.init to allow for user overrides
        getGlobalTargetingParams();

        trigger("pre.init");

        if (settings.quantcast.enabled) {
            embedQuantCastDeliveryTag();
            embedQuantCastMeasurementTag();
        }

        pushCmd(function() {
            trigger("pre.enable.services");

            if( dfp_settings.collapse_empty_divs ) googletag.pubads().collapseEmptyDivs();
            if( dfp_settings.disable_initial_load ) googletag.pubads().disableInitialLoad();
            if( dfp_settings.enable_single_request ) googletag.pubads().enableSingleRequest();
            /** async is the default, but it doesn't hurt to set explicitly here */
            if( dfp_settings.enable_async_rendering ) googletag.pubads().enableAsyncRendering();
            if( dfp_settings.enable_video_ads ) googletag.pubads().enableVideoAds();
            /** noFetch processes the JavaScript but does not make any HTTP calls for ad slot contents. */
            if( dfp_settings.no_fetch ) googletag.pubads().noFetch();
            /** Disables the Google Publisher Console */
            if( dfp_settings.disable_publisher_console ) googletag.pubads().disablePublisherConsole();

            /** pass valid global targeting options thru */
            $.each(dfp_settings.global_targeting, function(key, value) {
                if (key && value != '' && typeof value != 'undefined') {
                    googletag.pubads().setTargeting(key, value);
                    debug("pre.enable.services :: setting global param[" + key + "]=" + value);
                }
            });

            googletag.enableServices();
            trigger("post.enable.services");
        });
        trigger("post.init");

        return _this;
    }

    /**
     * programmatically add callback binding
     * @param {string} eventRef
     * @param {Function} eventBinding
     * @return {*}
     */
    function defineCallback(eventRef, eventBinding) {
        if ($.isFunction(eventBinding)) {
            bind(eventRef, eventBinding);
        }
        return _this;
    }

    /**
     * Sets values for DFP options that apply globally
     * IMPORTANT NOTE: these must be set prior to enableServices
     * @param {string} option - the option to turn on or off
     * @param {boolean} enabled - true or false
     * @return {*}
     */
    function setGlobalOption( option, enabled ) {
        if (typeof dfp_settings === "undefined") {
            defineCallback("pre.init", function(){ setGlobalOption( option, enabled ); });
            return _this;
        }

        /** only allow from preset list at this time */
        if ( typeof dfp_settings[option] !== 'undefined') {
            dfp_settings[option] = enabled;
            debug("setGlobalOption :: " + option + " set to: " + dfp_settings[option]);
        } else {
            debug("setGlobalOption :: No such option: " + option + " ...ABORTING! ");
        }

        return _this;
    }

    /**
     * Channels are set as category in the targeting options.
     *
     * @param {string} channel
     * @return {*}
     */
    function setChannel(channel) {
        setGlobalTargetingParam('category', channel);
        return _this;
    }

    /**
     * Sets values for ARBITRARY targeting keys that apply to all pubService ad slots.
     * NOTE #1: these must be set prior to enableServices to take effect
     * NOTE #2: these values could be overwritten by the getGlobalTargetingParams method called by init()
     *  (currently { url, qcs, adtest } are auto-populated).  call this method via pre.init callback to override auto-defaults
     *
     * @return {*}
     */
    function setGlobalTargetingParam(param, value) {
        if (typeof dfp_settings === "undefined") {
            defineCallback("pre.init", function(){ setGlobalTargetingParam( param, value ); });
            return _this;
        }

        if (param && value != '' && typeof value != 'undefined') {
            dfp_settings.global_targeting[param] = value;
            googletag.pubads().setTargeting(param, value);
        }
        return _this;
    }

    /**
     * use local methods to determine each optional global param
     */
    function getGlobalTargetingParams() {
        dfp_settings.global_targeting["url"] = getUriPaths();
        dfp_settings.global_targeting["qcs"] = getQCSegs();
        getHashtags();
        dfp_settings.global_targeting["adtest"] = getParamFromUri("adtest");
    }

    /**
     * auto-discover all potential slots via the selector, and call defineNewAdSlot on each candidate
     * NOTE: this is not called by init, must be kicked off explicitly by calling page
     *
     * @return {*}
     */
    function buildSlots() {
        trigger('pre.slot.discovery');

        if (!settings.enabled) {
            debug('buildSlots :: ads disabled. no ad slots will be created or displayed');
            return _this;
        }

        var cnt =  0;
        $('.' + settings.selector).each(function() {
            var adDiv = $(this);
            var id = adDiv.attr('id');
            if (id && getSlotById(id)) {
                return;
            }
            cnt++;
            defineNewAdSlot(adDiv, null, null, false, false);
        });

        debug('buildSlots :: found and created ' + cnt + ' ads');
        trigger('post.slot.discovery');
        return _this;
    }

    /**
     * create a new slot sometime after (or in lieu of) buildSlots()
     * supports js programmatic slot building and populating
     * @param {string} divId div ID of existing ad container to convert to ad slot
     * @param {string} sizeType [optional] - nickname for preset size
     * @param {string} sizeList [optional] - explicit comma-separated WxH pairs eg. "300x250,320x50"
     * @param {boolean} interstitial [optional] - true if this is out-of-page slot
     * @param {boolean} refresh [optional] - true if this slot repopulates with each call to showAds()
     * @returns {*}
     */
    function addSlot(divId, sizeType, sizeList, interstitial, refresh) {
        if (!settings.enabled) {
            debug('addSlot :: ads disabled. no ad slots will be created or displayed');
            return _this;
        }

        defineNewAdSlot($('#' + divId), sizeType, sizeList, interstitial, refresh);
        debug('addSlot :: googletag slot[' + divId + '] added');
        return _this;
    }

    /**
     * Sets values for targeting keys that apply to a SPECIFIC ad slot.
     * NOTE: must be called prior to any display commands
     * @param {string} slotDivId - the DOM id of the slot to update (eg. "dfp-wbad-1")
     * @param {string} param - the param to set
     * @param {string} value - the value to set for the given param
     * @returns {*}
     */
    function setSlotTargetingParam(slotDivId, param, value) {
        var slot = getSlotById(slotDivId);

        if (!slot) {
            debug("setSlotTargetingParam :: slot[" + slotDivId + "] does not exist.");
            return _this;
        }

        slot.setTargetingParam(param, value);
        return _this;
    }

    /**
     * @param {string} adDiv div ID of container
     * @param {string} sizeType [optional] - nickname for preset size
     * @param {string} sizeList [optional] - explicit comma-separated WxH pairs eg. "300x250,320x50"
     * @param {boolean} interstitial [optional] - true if this is an out-of-page slot
     * @param {boolean} refresh
     * @returns {*}
     */
    function defineNewAdSlot(adDiv, sizeType, sizeList, interstitial, refresh) {
        if (!adDiv) {
            debug("defineNewAdSlot :: no adDiv exists! ABORTING.");
            return _this;
        }

        var divId = generateId(adDiv);
        if (getSlotById(divId)) {
            debug(divId + ' :: defineNewAdSlot :: slot already defined.');
            return _this;
        }

        slots[divId] = new Slot(divId);
        trigger('pre.slot.define', slots[divId]);

        // gpt slot creation and attachment to our slot is queued so customizations
        // can be made all the way up to right before the ad gets rendered.
        pushCmd(function() {
            var gptSlot = adDiv.data(settings.data_store);
            var slotUnit = unit_name;
            if (gptSlot) {
                // somehow the gpt slot was defined by external code.
                // make sure to attach it to our slot object.
                slots[divId].attachGptSlot(gptSlot);
            } else {
                // get an index into the adsizes map
                // but allow for adHoc override via size arg
                var adSizeType = sizeType || adDiv.data('adsize');
                var adSizeList = sizeList || adDiv.data('adsize-list');
                var isInterstitial = (interstitial ? true : adDiv.data('interstitial')) || false;
                if( adSizeType == 'skin' ) {
                    slotUnit += '/skin';
                }
                var refreshable = (refresh ? true : adDiv.data('refresh')) || false;
                debug(divId + " :: defineNewAdSlot :: type:" + adSizeType + ", list:" + adSizeList + ", interstitial:" + isInterstitial + ", refreshable:" + refreshable );

                // out-of-page slots have no size
                if( !isInterstitial ) {
                    var dfpAdSizes;
                    if( adSizeList ) {
                        debug(divId + " :: defineNewAdSlot :: using adhoc size: " + adSizeList );
                        dfpAdSizes = getSizesFromString(adSizeList);
                    } else if( adSizeType && ad_sizes_list[settings.device_view][adSizeType]) {
                        dfpAdSizes = ad_sizes_list[settings.device_view][adSizeType];
                        debug(divId + " :: defineNewAdSlot :: using sizetype: " + adSizeType );
                    } else {
                        debug(divId + " :: defineNewAdSlot :: NO VALID SIZES FOUND. will expand to element size by default");
                    }
                    gptSlot = googletag.defineSlot(slotUnit, dfpAdSizes, divId).addService(googletag.pubads());
                    if( dfp_settings.enable_single_request ) {
                        adDiv.data('unfilled', true);
                        defineCallback( "pre.display.ads", function() {
                            if( !adDiv.data('registered') ) {
                               pushCmd( function() {
                                    display_provider.display(divId);
                                    adDiv.data('registered', true);
                                    debug(divId + " :: defineNewAdSlot :: pushing SRA display to cmd queue");
                                });
                            }
                        });
                    }
                    debug(divId + " :: defineNewAdSlot :: googletag slot defined");
                } else {
                    // can be an array OR assigned value, so support 'contains' style check
                    if( adDiv.data('pos').indexOf('prestitial') != -1 ) {
                        slotUnit += '/prestitial';
                    } else {
                        slotUnit += '/interstitial';
                    }
                    // note: these out-of-page slots have no size, but take up block-space if empty, so force collapse
                    gptSlot = googletag.defineOutOfPageSlot(slotUnit, divId).addService(googletag.pubads()).setCollapseEmptyDiv(true);
                    if( dfp_settings.enable_single_request ) {
                        adDiv.data('unfilled', true);
                        defineCallback( "pre.display.ads", function() {
                            if( !adDiv.data('registered') ) {
                               pushCmd( function() {
                                    display_provider.display(divId);
                                    adDiv.data('registered', true);
                                    debug(divId + " :: defineNewAdSlot :: pushing OutOfPageSlot SRA display to cmd queue");
                                });
                            }
                        });
                    }

                    debug(divId + " :: defineNewAdSlot :: googletag out-of-page slot defined");
                    adDiv.data('interstitial', true);
                }

                if( refreshable ) {
                    adDiv.data('refresh', true);
                    debug(divId + " :: defineNewAdSlot :: this slot will REFRESH with each showAds()");
                }

                if (adDiv.data('pos') != null) {
                    slots[divId].setTargetingParam('pos', adDiv.data('pos'));
                }

                if (adDiv.data('tile') != null) {
                    slots[divId].slot_data.tile = adDiv.data('tile');
                    slots[divId].setTargetingParam('tile', slots[divId].slot_data.tile);
                }

                slots[divId].attachGptSlot(gptSlot);
                adDiv.data(settings.data_store, gptSlot);
            }
        });

        trigger('post.slot.define', slots[divId]);
        return _this;
    }

    /**
     * return a single slot reference for modification/custom targeting
     * NOTE: modifications must be called prior to showAds()
     * yes this function is quite trivial now. todo: skip it and handle inline
     * @param {string} id
     * @returns {Slot}
     */
    function getSlotById(id) {
        if (slots[id]) {
            return slots[id];
        }
        return null;
    }

    /**
     * Displays an ad in all defined slots and if refreshable, updates slot with a new ad.
     * This code will wait until all slot have been "resolved", meaning they have their
     * targeting and a gpt slot object has been created and attached to the slot.
     *
     * @return {*}
     */
    function showAds() {
        flushCmd();

        var deferreds = $.map(slots, function(slot, index) {
            return slot.deferred;
        });

        $.when.apply($, deferreds).then(function() {
            trigger('pre.display.ads');

            $.each(slots, function(index, slot) {
                var adDiv = $('#' + slot.div_id);
                var adSlotData = adDiv.data(settings.data_store);
                var refreshable = adDiv.data('refresh') || false;
                var unfilled = adDiv.data('unfilled') || false;
                var filled = adDiv.data('filled') || false;
                var registered = adDiv.data('registered');

                if (dfp_settings.enable_single_request) {
                    if (refreshable) {
                        pushCmd(function() { display_provider.pubads().refresh([adSlotData]); });
                        debug("showAds :: refreshing ad " + adDiv.attr('id'));
                    } else if (unfilled) {
                        pushCmd(function() { display_provider.pubads().refresh([adSlotData]); });
                        debug("showAds :: filling unfilled ad " + adDiv.attr('id'));
                        adDiv.data('unfilled', false);
                    }
                } else {
                    if (refreshable) {
                        if (!registered) {
                            pushCmd(function() {
                                display_provider.display(adDiv.attr('id')); // display the refreshable slot
                                debug("showAds :: displaying ad " + adDiv.attr('id') + " - will REFRESH on next showAds()");
                                adDiv.data('registered', true);
                            });
                        } else {
                            pushCmd(function() { display_provider.pubads().refresh([adSlotData]); }); // issue refresh call if already registered
                            debug("showAds :: refreshing ad " + adDiv.attr('id'));
                        }
                    } else if (!filled) {
                        pushCmd(function() { display_provider.display(adDiv.attr('id')); });
                        debug("showAds :: displaying ad " + adDiv.attr('id') + " for the first and only time!");
                        adDiv.data('filled', true);
                    } else {
                        debug("showAds :: nonrefreshing ad " + adDiv.attr('id') + " already displayed..skipping.");
                    }
                }
            });

            flushCmd();
            trigger('post.display.ads');
        });

        return _this;
    }

    /**
     * generates a unique id for the container element
     * that the ad will be written into.
     * @param {object} element the element to update
     * @returns {string} the element's id
     */
    function generateId(element) {
        slot_count++;

        if (element && element.attr('id')) {
            return element.attr('id');
        }

        var id = 'wbad-' + getRequiredParam('site_domain') + '-' + slot_count;
        id = id.replace(/[^A-Za-z0-9-]+/g, '').toLowerCase();
        element.attr('id', id);
        return id;
    }

    /**
     * param name will be false if it fails
     * to clean up.
     * @param {string} param the param name to clean up
     * @returns {string} the cleaned up param
     */
    function cleanParamName(param) {
        param = trim(param.toLowerCase());
        param = param.replace(/[^a-z0-9_]/g, '');
        var param_regex = /^[a-z_][a-z0-9_]{1,20}$/;
        if (!param_regex.test(param)) {
            debug("_cleanParamName :: invalid param name: " + param);
            return "";
        }
        return param;
    }

    /**
     * sets a param.  returns true if that
     * param was set, false otherwise
     * @param {string} param the param to set
     * @param {string|object|boolean|number} val the value to assign
     * @returns {boolean} success or fail of the set
     */
    function setRequiredParam(param, val) {
        param = cleanParamName(param);
        if (!param) return false;

        required_params[param] = val || false;
        if (typeof(required_params[param]) == "string")
            required_params[param] = trim(required_params[param]);
//        debug("setRequiredParam :: param " + param + " set to: " + required_params[param]);
        return true;
    }

    /**
     * gets a param value.  note that false
     * will be returned if it's not a valid
     * param name or if the param isn't set.
     * @param {string} param
     * @returns {string|object|boolean|number} value of the passed param or false
     */
    function getRequiredParam(param) {
        param = cleanParamName(param);
        if (!param) return false;
        return (required_params[param] || false);
    }

    /**
     * override default selector class for finding ad container divs
     * NOTE: do NOT include the preceding "." so "div" not ".div"
     * @param {string} classname
     * @return {*}
     */
    function setSelector(classname) {
        if (typeof settings === "undefined") {
            defineCallback("pre.slot.discovery", function(){ setSelector(classname); });
            return _this;
        }
        if( null !== classname && "" != classname ) {
            // trim preceding "." if present
            // or classname = classname.replace(/^\./,"");
            if( classname.charAt(0) === '.' ) classname = classname.substr(1);
            settings.selector = classname;
        }
        return _this;
    }

    /**
     * enables/disables ads
     * @param {boolean} showAds
     * @return {*}
     */
    function setEnabled(showAds) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setEnabled(showAds); });
            return _this;
        }
        settings.enabled = showAds || false;
        debug("setEnabled :: ads enabled : " + settings.enabled);
        return _this;
    }

    /**
     * Returns true if ads are enabled.
     *
     * @return {boolean}
     */
    function getEnabled() {
        return settings.enabled;
    }

    /**
     * set the device
     * @param {string} device
     * @return {*}
     */
    function setDeviceView(device) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setDeviceView(device); });
            return _this;
        }
        settings.device_view = device || "main";
        debug("setDeviceView :: device_view set to : " + settings.device_view);
        return _this;
    }

    /**
     * enables/disables debugging
     * @param {boolean} enabled
     * @return {*}
     */
    function setDebug(enabled) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setDebug(enabled); });
            return _this;
        }
        settings.debug_enabled = enabled || false;
        return _this;
    }

    /**
     * simple little debugger, writes message <tt>msg</tt>
     * to console when enabled
     * @param {string} msg The string to display in the console
     */
    function debug(msg) {
        if (typeof settings === "undefined" || !settings.debug_enabled) return;
        if (window.console && typeof console.log != "undefined")
            console.log("[WBADS] " + msg);
    }

    /**
     * trims the white space from the
     * start and end of a string <tt>str</tt>
     * @param {string} str The string to trim
     * @returns {string}
     */
    function trim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }

    /**
     * gets param from a uri.  format should be
     * something like url.ext?var=val;var2=val2
     * @param {string} param - the var to get from the key-value pairs
     * @returns {string} value of query string param detected from Uri
     */
    function getParamFromUri(param) {
        var value = decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(param).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        debug("getParamFromUri :: param " + param + (value ? " found with value: " + value : " not found"));
        return value;
    }

    /**
     * Get list of width,height pairs from string
     * @param  {string} str
     * @return {Object[]}
     */
    function getSizesFromString( str ) {
        var sizes = [];

        if( str.length ) {
            var pairs = str.split(',');
            $.each(pairs, function (key, value) {
                var currentSize = value.split('x');
                sizes.push([parseInt(currentSize[0], 10), parseInt(currentSize[1], 10)]);
                debug("getSizesFromString :: adding SIZE=[" + currentSize[0] + "," + currentSize[1] + "]");
            });
        } else {
            debug("getSizesFromString :: NO VALID SIZES FOUND. will expand to element size by default");
        }

        return sizes;
    }

    /**
     * gets the full uri after the base not including search nor hash
     * @returns {string}
     */
    function getUriPaths() {
        var paths = window.location.pathname.replace(/\/$/, '');
        debug("getUriPaths :: found paths:" + paths);

        return paths;
    }

    /**
     * enables/disables QuantCast
     */
    function setQuantcast(enabled) {
        if (typeof settings === "undefined") {
            defineCallback("pre.init", function(){ setQuantcast(enabled); });
            return;
        }
        settings.quantcast.enabled = enabled || false;
        embedQuantCastDeliveryTag();
    }


    /**
     * embeds the Quantcast delivery tag (html head)
     * if quantcast is enabled.
     */
    function embedQuantCastDeliveryTag() {
        if (!settings.quantcast.enabled) return;
        document.write('<scr' + 'ipt src="//pixel.quantserve.com/seg/' + settings.quantcast.qacct + '.js" type="text/javascript"></scr' + 'ipt>');
    }


    /**
     * embeds the Quantcast measurement tag (footer)
     * if quantcast is enabled.
     */
    function embedQuantCastMeasurementTag() {
        if (!settings.quantcast.enabled) return;

        var elem = document.createElement('script');
        elem.src = (document.location.protocol == "https:" ? "https://secure" : "http://edge") + ".quantserve.com/quant.js";
        elem.async = true;
        elem.type = "text/javascript";
        var scpt = document.getElementsByTagName('script')[0];
        scpt.parentNode.insertBefore(elem, scpt);

        _qevents.push({
            qacct: settings.quantcast.qacct
        });
    }

    /**
     * quantcast specific functions/variables.
     */
    function _quantgc(n) {
        var c=document.cookie;if(!c)return '';
        var i=c.indexOf(n+"=");if(-1==i)return '';
        var len=i+n.length+1;
        var end=c.indexOf(";", len);
        return c.substring(len,end<0?c.length:end);
    }

    /**
     * gets the quantcast segments and returns them as array
     * @returns {string}
     */
    function getQCSegs() {
        if (!settings.quantcast.enabled) return "";
        if (settings.quantcast.segs != "")
            return settings.quantcast.segs;
        //var segs = "";
        var segs = [];
        var _qsegs = _quantgc("__qseg").split("|");
        for (var i=0; i < _qsegs.length;i++) {
            var qArr = _qsegs[i].split("_");
            //if (qArr.length > 1)
                //segs += ";qcseg=" + qArr[1];
            segs.push(qArr[1]);
        }
        settings.quantcast.segs = segs;
        debug("getQCSegs :: found segs:" + settings.quantcast.segs);

        return settings.quantcast.segs;
    }

    /**
     * gets the channel (currently passed as "category" for AdOps)
     * @returns {string}
     */
    function getChannel() {
        var channel = "";

        /** todo: get channel */
        debug("getChannel :: found channel:" + channel);

        return channel;
    }

    /**
     * gets the hashtags (currently passed as "tag" for AdOps)
     */
    function getHashtags() {
        var hashtags = [];

        /** todo: get hashtags automagically? or just allow via setGlobalTargeting/init dfp_settings */
        if( dfp_settings.global_targeting["tag"] != "" ) {
            hashtags = dfp_settings.global_targeting["tag"].split(",");
            var tagString = "";
            $.each(hashtags, function(index, tag) {
                debug("getHashtags :: pushing tag:" + tag);
                if( tagString != "" ) tagString += ",";
                tagString += $.trim(tag);
            });
            dfp_settings.global_targeting["tag"] = tagString;
        }

        debug("getHashtags :: found hashtags:" + dfp_settings.global_targeting["tag"]);
    }

    /**
     * Queues function instead of calling at once flushCmd is called just before rendering
     *
     * @param {Function} func
     */
    function pushCmd(func) {
        cmd.push(func);
    }

    /**
     * Flushes all cmd functions to googletag.cmd.push();
     */
    function flushCmd() {
        var cmds = cmd.slice(0);
        cmd = [];
        for (var i=0; i<cmds.length; i++) {
            googletag.cmd.push(cmds[i]);
        }
    }

    /**
     * Bind general wbads events to specified trigger
     *
     * @param {string} trigger
     * @param {Function} func
     */
    function bind(trigger, func) {
        $(_this).bind(trigger + ".wbads", func);
    }

    /**
     * Announce general wbads events
     *
     * @param {string} trigger
     * @param {Array|Object} [args]
     */
    function trigger(trigger, args) {
        $(_this).trigger(trigger + ".wbads", args || _this);
    }

    /**
     * Overwrites the display service (display/refresh) with another provider that gives you:
     * - display()
     * - pubads().refresh()
     * - pubads().display()
     *
     * This is here to allow for adtech/exchanges to provide a "wrapped/enhanced"
     * set of features to the default gpt process.
     *
     * This is a horrible hack/wrapper as it's not really a wrapper for the entire
     * gpt service... only display and refresh so don't expect to call display_provider.pubads() and get:
     * https://developers.google.com/doubleclick-gpt/reference#googletagpubadsservice
     *
     * @param {Object} provider
     * @return {*}
     */
    function setDisplayProvider(provider) {
        display_provider = provider;
        return _this;
    }

    /**
     * add privileged methods
     */
    _this.setDebug = setDebug;
    _this.setEnabled = setEnabled;
    _this.getEnabled = getEnabled;
    _this.setSelector = setSelector;
    _this.setGlobalOption = setGlobalOption;
    _this.setGlobalTargetingParam = setGlobalTargetingParam;
    _this.setQuantcast = setQuantcast;
    _this.addSlot = addSlot;
    _this.getSlotById = getSlotById;
    _this.setSlotTargetingParam = setSlotTargetingParam;
    _this.setChannel = setChannel;
    _this.defineCallback = defineCallback;
    _this.debug = debug;
    _this.showAds = showAds;
    _this.buildSlots = buildSlots;
    _this.setDisplayProvider = setDisplayProvider;
    _this.init = init;

    return _this;
})(window.jQuery, googletag, window, document);
