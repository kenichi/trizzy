(function($) {

  function DeviceLocations() {

    this.tileLayerURL = 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    this.apiUrl = 'http://geotriggersdev.arcgis.com/device/locations';
    $('#apiUrl').val(this.apiUrl);

    this.map = L.map('map');

    this.tiles = new L.tileLayer(this.tileLayerURL);
    this.map.addLayer(this.tiles);
    this.map.setView([45.5165, -122.6664], 16);

    this.locLayer = L.geoJson(null, {
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.collected_at) {
          layer.bindPopup(feature.properties.collected_at);
        }
      }
    }).addTo(this.map);
    this.triLayer = L.geoJson(null, { style: { color: "#ff7800" }}).addTo(this.map);

    this.locationsMapper = new LocationsMapper(this);
    this.triggersMapper = new TriggersMapper(this);

  };

  DeviceLocations.prototype.get = function() {

    var data = $('form').serializeArray();
    var at;

    var params = {};
    $(data).each(function(i,e) {
      switch (e.name) {
        case "access_token":
          at = e.value;
          break;
        case "apiUrl":
          this.apiUrl = e.value;
          break;
        default:
          if (e.value) params[e.name] = e.value;
      }
    });

    var headers = {
      "Authorization": "Bearer " + at
    };

    $('.submit button').attr("disabled", true);
    $('#response').val("waiting...");

    $.ajax({
      url: this.apiUrl,
      data: params,
      headers: headers
    }).done($.proxy(this.handleGetResponse, this));

  };

  DeviceLocations.prototype.handleGetResponse = function(r) {

    $('.submit button').attr("disabled", null);

    $('#response').val(JSON.stringify(r, null, 2));

    if (!r.error) {
      this.triggersMapper.triggers = r.triggers;
      this.triggersMapper.show();
      this.locationsMapper.locations = r.locations;
      this.locationsMapper.show();
    }

  };
  
  // ---

  function LocationsMapper(dl, timeout) {
    this.locations = [];
    this.timeout = timeout || 25;
    this.dl = dl;
  };

  LocationsMapper.prototype.show = function() {
    if (this.locations.length > 0) {
      var l = this.locations.pop();
      this.dl.locLayer.addData(l);
      setTimeout($.proxy(function(){ this.show(); }, this), this.timeout);
    }
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

  $(function() {

    var dl = new DeviceLocations();
    $('form').submit(function() {
      dl.get();
      return false;
    });

  });


})(jQuery);
