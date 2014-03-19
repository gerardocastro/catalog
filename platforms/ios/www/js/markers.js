var Markers = {
  fn: {
    addMarkers: function() {
      var target = $('#image-wrapper');
      var data = target.attr('data-captions');
      var captions = $.parseJSON(data);
      var coords = captions.coords;

      for (var i = 0; i < coords.length; i++) {
        var obj = coords[i];
        var top = parseInt(obj.top);
        var left = parseInt(obj.left);
        var img = obj.img;

        $('<a class="marker"/>').css({
            'top': top,
            'left': left
        }).attr('href', '#map-zoom').attr('data-img', img).
        appendTo(target);
      }
    },
    showCaptions: function() {
      $('.marker').click(function() {
        var img = $(this).data('img');
        $('#map-zoom-img').attr('src', img);
      });
    }
  },

  init: function() {
    $('.marker').remove();
    this.fn.addMarkers();
    this.fn.showCaptions();
  }
};