/*
Generalized ad placement script for ADSONAR TEXT ADS
should apply to all of the tpix websites.

note: script doesn't require any other libraries
like jquery, prototype, etc.
*/

var adsonarAdConfig = {
    ad_count: 0,
    debug_enabled: false,
    enabled: true, // if false ads won't render
    ad_server: "",
    params: {
        previousPlacementIds: "",
        pid: "",
        ps: "",
        jv: "",
        ssl: false,
        v: 5, // version
        flash: false,
        fv: 0,
        url: "",
        dct: ""
    },

    /*
     * sets up the config object.
     *
     */
    init: function(pid, ps, jv, debug_mode) {
        this.setParam("pid", pid);
        this.setParam("ps", ps);
        this.ad_server = '//' + jv + '/adserving/getAds.jsp?';
        this.setParam("jv", jv);
        this.setParam("url", document.location.href);
        this.setParam("dct", document.title);
        if (this.isSSL()) {
            this.setParam("ssl", true);
        }
        this.setDebug(debug_mode);
    },

    /*
     * param name will be false if it fails
     * to clean up.
     *
     */
    cleanParamName: function(param) {
        param = this.trim(param.toLowerCase());
        param = param.replace(/[^a-z0-9_]/g, '');
        var param_regex = /^[a-z_][a-z0-9_]{0,30}$/;
        if (!param_regex.test(param)) {
            this.debug("invalid param name: " + param);
            return false;
        }
        return param;
    },

    /*
     * sets a param.  returns true if that
     * param was set, false otherwise
     *
     */
    setParam: function(param, val) {
        param = this.cleanParamName(param);
        if (!param) return false;
        this.debug("setParam: " + param);
        this.params[param] = val;
        if (typeof(this.params[param]) == "string")
            this.params[param] = this.trim(this.params[param]);
        this.debug("param " + param + " set to: " + this.params[param]);
        return true;
    },

    /*
     * gets a param value.  note that a blank
     * string will be returned if it's not a
     * valid param name or if the param isn't set.
     *
     */
    getParam: function(param) {
        param = this.cleanParamName(param);
        if (!param) return '';
        if (typeof this.params[param] == 'undefined') return '';
        return this.params[param];
    },

    /*
     * enables/disables ads
     *
     */
    setEnabled: function(enabled) {
        this.enabled = enabled || false;
    },

	/*
     * enables/disables debugging
     *
     */
    setDebug: function(enabled) {
        this.debug_enabled = enabled || false;
    },

    /*
     * simple little debugger, writes message
     * to console when enabled
     *
     */
    debug: function(msg) {
        if (!this.debug_enabled) return;
        if (window.console && typeof console.log != "undefined")
            console.log("ADSONAR ADS: " + msg);
    },

    /*
     * trims the white space from the
     * start and end of a string
     *
     */
    trim: function(str) {
        return str.replace(/^\s+|\s+$/g, "");
    },

    /*
     * determines if the site is on an ssl
     * connection.
     *
     */
    isSSL: function() {
        return (document.location.protocol == "https:");
    },

    /*
     * gets the correct ad server
     *
     */
    getAdServer: function() {
        return this.ad_server;
    },

    /*
     * returns true if the value passed
     * exists in the array passed
     *
     */
    inArray: function (val, arr) {
        for(var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] == val) {
                return true;
	        }
	    }
	    return false;
    }
};

/*
 * adsonarAd object definition
 *
 */
var __adsonarAds = [];
function AdsonarAd(placementId, width, height) {
    this.config = adsonarAdConfig;

    this.config.debug("Ad created, placementId: " + placementId + ", w:" + width + ", h:" + height);

    this.width = width;
    this.height = height;
    this.placementId = placementId;

    this.container_id = "";
    this.generateId();
    __adsonarAds[this.container_id] = this;
}

/*
 * generates a unique id currently only used for the array of ads
 *
 */
AdsonarAd.prototype.generateId = function() {
    this.config.ad_count++;
    var id = "adsonarAd" + this.width + this.height + this.placementId + "-" + this.config.ad_count;
    this.container_id = id;
    return id;
};

/*
 * gets the ad params together that will be
 * appended to the script url in this format:
 * param=val&param2=val2
 *
 */
AdsonarAd.prototype.getAdParams = function(encode, ignore) {
    var s = "";
    var useEncoding = encode || false;
    var ignoreParams = ignore || "previousPlacementIds,pid,ps,jv,ssl,v,flash,fv,url,dct,debug";
    ignoreParams = ignoreParams.split(",");
    var vals;
    for (var param in this.config.params) {
        if (!this.config.inArray(param, ignoreParams)) {
            vals = this.config.getParam(param).toString();
            if (useEncoding) {
                s += "&" + param + "=" + encodeURIComponent(vals);
            } else {
                s += "&" + param + "=" + vals;
            }
        }
    }
    return s;
};

/*
 * gets ad code that should be written into the page
 * this is an iframeable url
 *
 */
AdsonarAd.prototype.getAdTag = function() {
    var ad = this.config.getAdServer();
    ad += '&previousPlacementIds=' + encodeURIComponent(this.config.getParam("previousPlacementIds"));
    ad += '&pid=' + encodeURIComponent(this.config.getParam("pid"));
    ad += '&ps=' + encodeURIComponent(this.config.getParam("ps"));
    //ad += '&jv=' + encodeURIComponent(this.config.getParam("jv"));
    ad += '&ssl=' + (this.config.getParam("ssl") ? 'true' : 'false');
    ad += '&v=' + encodeURIComponent(this.config.getParam("v"));
    ad += '&flash=' + (this.config.getParam("flash") ? 'true' : 'false');
    ad += '&fv=' + encodeURIComponent(this.config.getParam("fv"));
    ad += '&url=' + encodeURIComponent(this.config.getParam("url"));
    ad += '&dct=' + encodeURIComponent(this.config.getParam("dct"));
    ad += '&placementId=' + encodeURIComponent(this.placementId);
    ad += '&zw=' + this.width + '&zh=' + this.height;
    ad += this.getAdParams(true);
    return ad;
};

/*
 * writes the ad into a dom id using innerHTML.  this is safe for async
 * ad writing as no document.write is used.  The ad is rendered using
 * an iframe.
 *
 */
AdsonarAd.prototype.writeTo = function(domId) {
    var container = document.getElementById(domId);
    if (!container) return;
    var ad = '<iframe id="' + this.container_id + '" frameborder="0" scrolling="no"';
    ad += ' width="' + this.width + '"';
    ad += ' height="' + this.height + '"';
    ad += ' src="' + this.getAdTag() + '"></iframe>';

    if (!this.config.enabled) {
        this.config.debug("Ads disabled, ad.writeTo ignored, ad: " + ad);
        return;
    }

    this.config.debug(ad);
    container.innerHTML = ad;
};
