var dl;

(function($) {

  function DeviceLocations() {

    this.tileLayerURL = 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    this.apiUrl = 'https://geotrigger.arcgis.com/device/locations';
    $('#apiUrl').val(this.apiUrl);

    this.map = L.map('map');

    this.tiles = new L.tileLayer(this.tileLayerURL);
    this.map.addLayer(this.tiles);
    this.map.setView([35.5, -100], 4);

    this.createLayers();

    this.locationsMapper = new LocationsMapper(this);
    this.triggersMapper = new TriggersMapper(this);

  };

  DeviceLocations.prototype.createLayers = function() {
    this.createLocationsLayers();
    this.createTriggersLayer();
  };

  DeviceLocations.prototype.createLocationsLayers = function() {
    if (this.prevLocLayer != null) { this.map.removeLayer(this.prevLocLayer); }
    this.prevLocLayer = L.geoJson(null, {
      style: { color: "#ff0000" },
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.popup) {
          layer.bindPopup(feature.properties.popup);
        }
      }
    }).addTo(this.map);

    if (this.locLayer != null) { this.map.removeLayer(this.locLayer); }
    this.locLayer = L.geoJson(null, {
      style: { color: "#00ff00" },
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.popup) {
          layer.bindPopup(feature.properties.popup);
        }
      }
    }).addTo(this.map);

    if (this.nextLocLayer != null) { this.map.removeLayer(this.nextLocLayer); }
    this.nextLocLayer = L.geoJson(null, {
      style: { color: "#0000ff" },
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.popup) {
          layer.bindPopup(feature.properties.popup);
        }
      }
    }).addTo(this.map);
  };

  DeviceLocations.prototype.createTriggersLayer = function() {
    if (this.triLayer != null) { this.map.removeLayer(this.triLayer); }
    this.triLayer = L.geoJson(null, {
      style: { color: "#ff7800" },
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.popup) {
          layer.bindPopup(feature.properties.popup);
        }
      }
    }).addTo(this.map);
  };

  DeviceLocations.prototype.get = function() {

    var data = $('form').serializeArray();

    this.params = {};
    $(data).each($.proxy(function(i,e) {
      switch (e.name) {
        case "access_token":
          this.at = e.value;
          // params['token'] = at;
          break;
        case "apiUrl":
          this.apiUrl = e.value;
          break;
        default:
          if (e.value) { this.params[e.name] = e.value; }
      }
    }, this));

    var headers = {
      "Authorization": "Bearer " + this.at,
      "Loqization": "e0af7131723bea614df2bff9527dc4f5350d0c6dbca067a455529778d6578240"
    };

    $('.submit button').attr("disabled", true);
    $('#response').val("waiting...");

    $.ajax({
      method: "POST",
      contentType: "application/json",
      dataType: 'json',
      url: this.apiUrl,
      data: JSON.stringify(this.params),
      processData: false,
      headers: headers
    }).done($.proxy(this.handleGetResponse, this));

  };

  DeviceLocations.prototype.handleGetResponse = function(r) {

    $('.submit button').attr("disabled", null);

    $('#response').val(JSON.stringify(r, null, 2));

    if (!r.error) {
      this.triggersMapper.triggers = r.triggers;
      this.getTriggerHistory();
      /*
      this.triggersHistory = {};
      $(r.triggers).each($.proxy(function(i,t) {
        var id = t.geojson.properties.popup;
        this.triggersHistory[id] = new TriggerHistory(this, id);
      }, this));
      */
      this.triggersMapper.show();
      this.locationsMapper.setLocations(r.locations);
      // this.locationsMapper.show();

      if (r.boundingBox) {
        cs = r.boundingBox.coordinates[0];
        var sw = new L.LatLng(cs[0][1], cs[0][0]);
        var ne = new L.LatLng(cs[2][1], cs[2][0]);
        var bounds = new L.LatLngBounds(sw, ne);
        this.map.fitBounds(bounds);
      }
    }

  };

  DeviceLocations.prototype.getTriggerHistory = function() {
    var ids = $(this.triggersMapper.triggers).map(function(i,t) { return t.geojson.properties.popup; }).toArray();
    var params = {
      triggerIds: ids,
      deviceIds: this.params.deviceId,
      fromTimestamp: this.params.fromTimestamp,
      toTimestamp: this.params.toTimestamp
    };
    $.ajax({
      method: "POST",
      contentType: "application/json",
      dataType: 'json',
      url: 'https://geotrigger.arcgis.com/trigger/history',
      data: JSON.stringify(params),
      processData: false,
      headers: { Authorization: this.at }
    }).done($.proxy(function(r) { this.triggerHistory = r; }, this));
  };
  
  // ---

  function LocationsMapper(dl, timeout) {
    this.setLocations([]);
    this.timeout = timeout || 25;
    this.dl = dl;
  };

  LocationsMapper.prototype.setLocations = function(ls) {
    this.locations = ls.slice(0);
    this._locations = ls.slice(0);
    $('#step').attr('disabled', null);
    $('#total-steps').html(this.locations.length);
    this.index = 0;
    $('#current-step').val(this.index);
    $('#slider').slider({
      min: 0,
      max: this.locations.length - 1,
      change: $.proxy(function(e, slider) {
        this.index = slider.value;
        this.showStep();
      }, this)
    });
  };

  /*
  LocationsMapper.prototype.showStep = function() {
    if (this._locations.length > 0) {
      this.index++;
      $('#current-step').val(this.index);
      var l = this._locations.pop();
      this.dl.locLayer.addData(l);
    }
  };

  LocationsMapper.prototype.show = function() {
    if (this._locations.length > 0) {
      this.showStep();
      setTimeout($.proxy(function(){ this.show(); }, this), this.timeout);
    }
  };
  */

  LocationsMapper.prototype.resetLocations = function(timeout) {
    this.setLocations(this.locations);
    this.timeout = timeout || 25;
  };

  LocationsMapper.prototype.showStep = function() {
    this.dl.createLocationsLayers();
    if (this.index == 0) {
      this.showLocation();
      this.showNextLocation();
    } else if (this.index == (this.locations.length - 1)) {
      this.showPrevLocation();
      this.showLocation();
    } else {
      this.showPrevLocation();
      this.showLocation();
      this.showNextLocation();
    }
  };

  LocationsMapper.prototype.step = function() {
    this.showStep;
    this.index++;
  };

  LocationsMapper.prototype.showPrevLocation = function() {
    this.dl.prevLocLayer.addData(this.locations[this.index - 1]);
  };
  
  LocationsMapper.prototype.showLocation = function() {
    this.dl.locLayer.addData(this.locations[this.index]);
  };

  LocationsMapper.prototype.showNextLocation = function() {
    this.dl.nextLocLayer.addData(this.locations[this.index + 1]);
  };

  // ---

  function TriggersMapper(dl) {
    this.triggers = [];
    this.dl = dl;
  };

  TriggersMapper.prototype.show = function() {
    var self = this;
    $(this.triggers).each(function(i,e) {
      self.dl.triLayer.addData(e.geojson);
    });
  };

  // ---

  // ---

  function TriggerHistory(dl, triggerId) {
    this.dl = dl;
    this.setTriggerId(triggerId);
  };

  TriggerHistory.prototype.setTriggerId = function(triggerId) {
    this.triggerId = triggerId;
    var params = {
      triggerIds: this.triggerId,
      deviceIds: this.dl.params.deviceId,
      fromTimestamp: this.dl.params.fromTimestamp,
      toTimestamp: this.dl.params.toTimestamp
   };
    $.ajax({
      method: "POST",
      contentType: "application/json",
      dataType: 'json',
      url: 'https://geotrigger.arcgis.com/trigger/history',
      data: JSON.stringify(params),
      processData: false,
      headers: { Authorization: this.dl.at }
    }).done($.proxy(this.handleGetResponse, this));
  };

  TriggerHistory.prototype.handleGetResponse = function(r) {
    this.history = r;
  };

  // ---
  
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  $(function() {

    dl = new DeviceLocations();

    $('#submit').on('click', function(e) {
      e.preventDefault();
      dl.get();
    });

    $('#clear').on('click', function(e) {
      e.preventDefault();
      dl.createLayers();
    });

    /*
    $('#redraw').on('click', function(e) {
      e.preventDefault();
      dl.createLocationsLayer();
      dl.locationsMapper.resetLocations(250);
      dl.locationsMapper.show();
    });
    */

    $('#step').on('click', function(e) {
      e.preventDefault();
      // dl.locationsMapper.showStep();
      dl.locationsMapper.step();
    });

    $("#fromTimestamp").datetimepicker({
      changeMonth: true,
      dateFormat: 'yy-mm-dd',
      onClose: function(selected) {
        $("#toTimestamp").datetimepicker("option", "minDateTime", new Date(Date.parse(selected)));
      }
    });

    $("#toTimestamp").datetimepicker({
      changeMonth: true,
      dateFormat: 'yy-mm-dd',
      onClose: function(selected) {
        $("#fromTimestamp").datetimepicker("option", "maxDateTime", new Date(Date.parse(selected)));
      }
    });

    var at = getParameterByName('access_token');
    if (at != null && at != '') { $('#access_token').val(at); }

    var did = getParameterByName('deviceId');
    if (did != null && did != '') { $('#deviceId').val(did); }

    var host = getParameterByName('host');
    if (host != null && host != '') {
      dl.apiUrl = 'http://' + host + '/device/locations';
      $('#apiUrl').val(dl.apiUrl);
    }

    var fromTs = getParameterByName('fromTimestamp');
    if (fromTs !== null && fromTs !== '') { $('#fromTimestamp').val(new Date(fromTs).toISOString()); }
    
    var toTs = getParameterByName('toTimestamp');
    if (toTs !== null && toTs !== '') { $('#toTimestamp').val(new Date(toTs).toISOString()); }

  });


})(jQuery);
