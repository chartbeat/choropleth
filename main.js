var Map = {
  // Update backend data every X ms
  interval: 3000,
  
  // get color depending on visitors value
  getColor: function(d) {
    return d > 1000 ? '#800026' :
      d > 500  ? '#BD0026' :
      d > 200  ? '#E31A1C' :
      d > 100  ? '#FC4E2A' :
      d > 50   ? '#FD8D3C' :
      d > 20   ? '#FEB24C' :
      d > 10   ? '#FED976' :
      d > 0   ? '#FFEDA0' :
      '#D9D9D9';
  },

  style: function(feature) {
    return {
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7,
      fillColor: this.getColor(feature.properties.visitors)
    };
  },

  highlightFeature: function(e) {
    var layer = e.target;

    layer.setStyle({
                     weight: 5,
                     color: '#666',
                     dashArray: '',
                     fillOpacity: 0.7
                   });

    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
    }

    this.info.update(layer.feature.properties);
  },

  resetHighlight: function(e) {
    this.geojson.resetStyle(e.target);
    this.info.update();
  },

  zoomToFeature: function(e) {
    this.map.fitBounds(e.target.getBounds());
  },

  onEachFeature: function(feature, layer) {
    layer.on({
               mouseover: $.proxy(this.highlightFeature, this),
               mouseout: $.proxy(this.resetHighlight, this),
               click: $.proxy(this.zoomToFeature, this)
             });
  },

  setupMap: function() {
    this.map = L.map('map').setView([37.8, -96], 4);


    this.info = L.control();
    this.info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info');
      this.update();
      return this._div;
    };
    this.info.update = function (props) {
      this._div.innerHTML = '<h4>Number of Visitors</h4>' +  (props ?
                                                              '<b>' + props.name + '</b><br />' + props.visitors + ' visitors'
                                                              : 'Hover over a state');
    };
    this.info.addTo(this.map);

    var tileTemplate = 'http://{s}.tiles.mapbox.com/v3/chartbeat.chartbeat/{z}/{x}/{y}.png';

    // Tile information
    var tiles = new L.TileLayer(tileTemplate, {
                                  'attribution': 'Map data © OpenStreetMap, Imagery © MapBox',
                                  'minZoom': 2,
                                  'maxZoom': 8,
                                  'subdomains': 'abcd',
                                  'unloadInvisibleTiles': true,
                                  'reuseTiles': true
                                }).addTo(this.map);

    this.geojson = L.geoJson(statesData, {
                               style: $.proxy(this.style, this),
                               onEachFeature: $.proxy(this.onEachFeature, this)
                             }).addTo(this.map);

    var legend = L.control({position: 'bottomright'});

    var getColor = $.proxy(this.getColor, this);
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend'),
      grades = [1, 10, 20, 50, 100, 200, 500, 1000],
      labels = [],
      from, to;

      for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

        labels.push(
          '<i style="background:' + getColor(from + 1) + '"></i> ' +
            from + (to ? '&ndash;' + to : '+'));
      }

      div.innerHTML = labels.join('<br>');
      return div;
    };

    legend.addTo(this.map);
  },

  refreshMap: function() {
    this.geojson.clearLayers();
    this.geojson.addData(statesData, {
                           style: $.proxy(this.style, this),
                           onEachFeature: $.proxy(this.onEachFeature, this)
                         });
  },

  parseQueryString: function() {
    var ret = {};
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      ret[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return ret;
  },

  setupUrl: function() {
    var queryVars = this.parseQueryString();
    var domain = queryVars["host"] || "gizmodo.com";
    var apikey = queryVars["apikey"] || "317a25eccba186e0f6b558f45214c0e7";
    var limit = 5000;
    this.api_endpoint = "http://api.chartbeat.com/geo/?host=" + domain + "&apikey=" + apikey + "&limit=" + limit + "&country=US";
  },

  updateData: function() {
    function onSuccess(response) {
        for (var i = 0; i < statesData.features.length; ++i) {
          var state = statesData.features[i].properties["abbr"];
          var val = response["regions"][state];
          statesData.features[i].properties["visitors"] = val || 0;
        }
        this.refreshMap();
      setTimeout($.proxy(this.updateData, this), this.interval);
    }

    function onError() {
      setTimeout($.proxy(this.updateData, this), this.interval);
    }

    $.ajax({
             url: this.api_endpoint,
             success: $.proxy(onSuccess, this),
             error: $.proxy(onError, this)
           });
  },

  start: function() {
    this.setupUrl();
    this.setupMap();
    this.updateData();
  }
};
