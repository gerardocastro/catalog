document.addEventListener("deviceready", onDeviceReady, false);

// 1 true 0 false
var develop = 0;
var db, apiData, division, divisionOption, mapWidth, mapHeight, markerWidthPercentage, markerHeightPercentage;
var addRecords = [], changeRecords = [], removeRecords = [], apiPath, finishDowloading = 0, downloadCounter = 0;
var player = document.getElementById('video-player');

function onDeviceReady() {
  getFilePath();
  db = window.openDatabase('rogers', '2.0', 'rogers', 1000000);
  db.transaction(createDBtables, errorDB, successCreateDBtables);
}

function successCreateDBtables() {
  createListeners();
  setApiPath();
}

function fileSystemFail(evt) {
  alert(evt.target.error.code);
}

function errorDB(err) {
  alert("Error processing SQL: " + err.message);
}

function setApiPath() {
  if (develop == 0)
    apiPath = 'http://rogers-cms-demo.herokuapp.com/api.json';
  else
    apiPath = 'http://localhost:3000/api.json';
}

function getFilePath(){
  window.requestFileSystem( LocalFileSystem.PERSISTENT, 0,
    function onFileSystemSuccess(fileSystem) {
      fileSystem.root.getFile( "dummy.html", { create: true, exclusive: false },
        function gotFileEntry(fileEntry) {
          localStorage['rogersFilePath'] = fileEntry.toNativeURL().replace("dummy.html", "");
          localStorage['rogersFilePathStorage'] = fileEntry.toURL().replace("dummy.html", "");
          fileEntry.remove();
        }, fileSystemFail);
  }, fileSystemFail);
}

function createDBtables(tx) {
  // if (develop == 1) {
    tx.executeSql('DROP TABLE IF EXISTS collaterals');
    tx.executeSql('DROP TABLE IF EXISTS videos');
    tx.executeSql('DROP TABLE IF EXISTS maps');
    tx.executeSql('DROP TABLE IF EXISTS map_markers');
    tx.executeSql('DROP TABLE IF EXISTS jsons');
  // }

  tx.executeSql('CREATE TABLE IF NOT EXISTS collaterals (id INTEGER PRIMARY KEY, title TEXT,' +
    'division TEXT, category TEXT, file_url TEXT, file_name TEXT, downloaded_file INTEGER DEFAULT 0)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY, title TEXT,' +
    'division TEXT, description TEXT, file_url TEXT, file_name TEXT, thumbnail_url TEXT,' +
    'thumbnail_name TEXT, downloaded_file INTEGER DEFAULT 0, downloaded_thumb INTEGER DEFAULT 0)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS maps (id INTEGER PRIMARY KEY, division TEXT,' +
    ' file_url TEXT, file_name TEXT, downloaded_file INTEGER DEFAULT 0)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS map_markers (id INTEGER PRIMARY KEY,' +
    'map_id INTEGER, left TEXT, top TEXT, file_url TEXT, file_name TEXT, downloaded_file INTEGER DEFAULT 0)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS jsons (id INTEGER PRIMARY KEY AUTOINCREMENT' +
    ', json TEXT)');
}

function createListeners() {
  $('#update-app').on('click', function() {
    getApiData();
  });

  $('.division').on('click', function() {
    division = $(this).data('division');
  });

  $('.division-option').on('click', function() {
    divisionOption = $(this).data('option');
  });

  $('#video-back').on('click', function() {
    player.pause();
  });

  $(document).on('pagebeforeshow', '#division-page', function(e, data) {
    var logo = displayLogo();
    $('#division-image-title').addClass(logo);
    $('.top-logo').addClass(logo +'-thumbnail');
  });

  $(document).on('pagebeforeshow', '#collaterals-page', function(e, data) { 
    loadData();
  });

  $(document).on('pagebeforeshow', '#videos-page', function(e, data) { 
    loadData();
  });

  $(document).on('pagebeforeshow', '#map-page', function(e, data) { 
    loadData();
  });

  $(window).on( "orientationchange", function(event) {
    var activePage = $.mobile.activePage.attr('id');
    if (activePage == 'map-page' || activePage == 'map-zoom')
      loadData();
  });

  $('#map-img').on('click', function(){
    var id = $(this).data('id');
    drawMarkers(id);
  });

}

function displayLogo() {
  switch(division) {
    case 'Business Solutions':
      return 'business-solutions';
      break;
    case 'Data Centres':
      return 'data-centres';
      break;
    case 'Carrier Services':
      return 'carrier-services';
      break;
  }
}

function loadData() {
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM ' + divisionOption + ' WHERE division="' + division + '"', [], successLoadData, errorDB);
  }, errorDB);
}

function successLoadData(tx, results) {
  switch(divisionOption)
  {
    case 'collaterals':
      drawCollaterals(results);
      break;
    case 'videos':
      drawVideos(results);
      break;
    case 'maps':
      drawMap(tx, results);
      break;
  }
}

function drawCollaterals(results) {
  var len = results.rows.length;
  colleterals = groupCollateralByCategory(results);
  var collateralsId = $('#collaterals');
  collateralsId.empty();
  $.each(colleterals, function(category, items) {
    var li = $('<li/>').appendTo(collateralsId);
    var title = $('<div/>').addClass('title').text(category).appendTo(li);
    var ul = $('<ul/>').appendTo(li);
    $.each(items, function(index, item) {
      var itemList = $('<li/>').appendTo(ul);
      var collateralSrc = localStorage['rogersFilePath'] + item.file_name
      var itemlink = $('<a/>').attr('href', '#').
        attr('onclick', "window.open('"+ collateralSrc +"', '_blank', 'toolbar=yes');").
        text(item.title).appendTo(itemList); 
    });
  });
}

function groupCollateralByCategory(results) {
  var length = results.rows.length;
  var tmpHash = {};
  for (var i=0; i<length; i++) {
    var item = results.rows.item(i);
    var category = item.category.toString();
    if (typeof(tmpHash[category]) == "undefined")
      tmpHash[category] = [];
    tmpHash[category].push(item);
  }
  return tmpHash;
}

function drawVideos(results) {
  var len = results.rows.length;
  var videosId = $('#videos');
  videosId.empty();
  for (var i=0; i<len; i++){
    item = results.rows.item(i);
    var thumbnailSrc = localStorage['rogersFilePath'] + item.thumbnail_name;
    var videoSrc = localStorage['rogersFilePath'] + item.file_name;
    var li = $('<li/>').appendTo(videosId);
    var thumb = $('<div/>').addClass('thumbnail').addClass('play-video')
      .attr('data-video-url', videoSrc).appendTo(li);
    var thumbLink = $('<a/>').attr('href', '#video-page').appendTo(thumb);
    var thumbImg = $('<img/>').attr('src', thumbnailSrc).appendTo(thumbLink);
    var info = $('<div/>').addClass('info').appendTo(li);
    var infoTitle = $('<div/>').addClass('title').text(item.title).appendTo(info);
    var infoDescription = $('<div/>').addClass('description').text(item.description).appendTo(info);
  }
  playVideo();
}

function playVideo() {
  $('.play-video').on('click', function() {
    var video = document.getElementById('video-src');
    var videoUrl = $(this).data('video-url');

    $(video).attr('src', videoUrl).load();
    player.load();
    player.play();
  });
}

function drawMap(tx, results) {
  $('.marker').remove();
  if (results.rows.length == 1) {
    getMapOrientation();
    var item = results.rows.item(0);
    var fileSrc = localStorage['rogersFilePath'] + item.file_name;
    $('#map-img').attr('src', fileSrc);
    $('#map-img').attr('data-id', item.id);
  } 
}

function getMapOrientation() {
  if (window.orientation == 0 || window.orientation == 180) {
    mapWidth = 768; 
    mapHeight = 600;
    markerWidthPercentage = 0.79; 
    markerHeightPercentage = 0.76;
  }
  else {
    mapWidth = 1024; 
    mapHeight = 662;
    markerWidthPercentage = 0.88; 
    markerHeightPercentage = 1.01;
  }
  $('.map-img').width(mapWidth).height(mapHeight);
}

function drawMarkers(id) {
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM map_markers WHERE map_id="' + id + '"', [], function(tx, markers){
      getMarkers(tx, markers);
    }, errorDB);
  }, errorDB);
}

function getMarkers(tx, results) {
  var coords = {}, marker, top, left, zoomSrc;
  var len = results.rows.length;
  coords['coords'] = [];
  if (len > 0) {
    for (var i=0; i<len; i++) {
      marker = results.rows.item(i);
      top = marker.top * markerWidthPercentage;
      left = marker.left * markerHeightPercentage;
      zoomSrc = localStorage['rogersFilePath'] + marker.file_name;
      coords['coords'].push({top: top, left: left, img: zoomSrc});
    }
  }
  displayMarkers(coords);
}

function displayMarkers(captions) {
  var coords = captions.coords;
  var target = $('#image-wrapper');

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
  displayMakerImage();
}

function displayMakerImage() {
  $('.marker').on('click', function() { 
    var img = $(this).data('img');
    $('#map-zoom-img').attr('src', img);
  });
}

function getApiData() {
  $.ajax({
    type       : 'GET',
    url        : apiPath,
    crossDomain: true,
    dataType   : 'JSON',
    success    : function(response) {
      apiData = response;
      populateDB();
    },
    error      : function() {
      alert('There was an error trying to update the information.');                  
    }
  });
}

function populateDB() {
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM jsons ORDER BY id DESC LIMIT 1', [], updateDbData, errorDB);
  }, errorDB);
}

function updateDbData(tx, results) {
  var len = results.rows.length;
  
  if (len == 0)
    var oldData = {};
  else
    var oldData = JSON.parse(unescape(results.rows.item(0).json));

  var data = jsondiffpatch.diff(oldData, apiData);

  if (data) {
    addRecords = []; 
    changeRecords = []; 
    removeRecords = [];
    
    formatApiData(data);
    tx.executeSql('INSERT INTO jsons (json) VALUES ("' + escape(JSON.stringify(apiData)) + '")');
    //callback
    removeDBRecords(tx);
    addDBRecords(tx);
    updateDBRecords(tx);
  }
  else
    DBUpdated();
}

function DBUpdated() {
  alert('The information has been updated.');
}

function itemType(type) {
  if (type == 'coords')
    return 'map_markers';
  else
    return type;
}

function removeDBRecords(tx) {
  var type;
  $.each(removeRecords, function(index, item) {
    type = itemType(item.type);
    deleteRecord(tx, type, item.item_id);
  });
}

function addDBRecords(tx) {
  var items;
  var type;
  $.each(addRecords, function(index, itemsArray) {
    items = itemsArray.item[0];
    if ($.isArray(items)) {
      type = itemType(itemsArray.type);
      $.each(items, function(index, item) {
        addRecord(tx, type, item);
      });
    } else {
      type = itemType(itemsArray.parent);
      addRecord(tx, type, items);
    }
  });
}

function updateDBRecords(tx) {
  var type;
  $.each(changeRecords, function(index, item) {
    type = itemType(item.type);
    updateRecord(tx, type, item.change[0], item.field, item.change[2]);
  });
}

function addRecord(tx, type, item, parentId) {
  switch(type)
  {
    case 'collaterals':
      addCollateral(tx, item.id, item.title, item.division, item.category, item.file_url, item.file_name);
      break;
    case 'videos':
      addVideo(tx, item.id, item.title, item.division, item.description, item.file_url, item.file_name, item.thumbnail_url, item.thumbnail_name);
      break;
    case 'maps':
      addMap(tx, item.id, item.division, item.file_url, item.file_name);
      //callback
      $.each(item.markers.coords, function(index, marker) {
        addMarker(tx, marker.id, item.id, marker.left, marker.top, marker.file_url, marker.file_name);
      });
      break;
    case 'map_markers':
      addMarker(tx, item.id, item.map_id, item.left, item.top, item.file_url, item.file_name);
      break;
  }
}

function deleteRecord(tx, type, itemId) {
  tx.executeSql('DELETE FROM '+ type +' WHERE id='+ itemId);
  if (type == 'maps')
    tx.executeSql('DELETE FROM map_markers WHERE map_id='+ itemId);
}

function updateRecord(tx, type, itemId, field, value) {
  tx.executeSql('UPDATE '+ type +' SET '+ field +'= "'+ value +'" WHERE id='+ itemId);
}

function addCollateral(tx, id, title, division, category, file_url, file_name) {
  tx.executeSql('INSERT INTO collaterals (id, title, division, category, file_url, file_name)' +
    'VALUES ("'+ id +'", "'+ title +'", "'+ division +'", "'+ category +'", "'+ file_url +'", "'+ file_name +'")');
  tx.executeSql('SELECT * FROM collaterals LIMIT 1', [], downloadFileItem, errorDB);
}

function addVideo(tx, id, title, division, description, file_url, file_name, thumbnail_url, thumbnail_name) {
  tx.executeSql('INSERT INTO videos (id, title, division, description, file_url, file_name, thumbnail_url, thumbnail_name)' +
    'VALUES ("'+ id +'", "'+ title +'", "'+ division +'", "'+ description +'", "'+ file_url +'", "'+ file_name +
    '", "'+ thumbnail_url +'", "'+ thumbnail_name +'")');
  tx.executeSql('SELECT * FROM videos LIMIT 1', [], downloadFileItem, errorDB);
}

function addMap(tx, id, division, file_url, file_name) {
  tx.executeSql('INSERT INTO maps (id, division, file_url, file_name)' +
    'VALUES ("'+ id +'", "'+ division +'", "'+ file_url +'", "'+ file_name +'")');
  tx.executeSql('SELECT * FROM maps LIMIT 1', [], downloadFileItem, errorDB);
}

function addMarker(tx, id, mapId, left, top, file_url, file_name) {
  tx.executeSql('INSERT INTO map_markers (id, map_id, left, top, file_url, file_name)' +
    'VALUES ("'+ id +'", "'+ mapId +'", "'+ left +'", "'+ top +'", "'+ file_url +'", "'+ file_name +'")');
  tx.executeSql('SELECT * FROM map_markers LIMIT 1', [], downloadFileItem, errorDB);
}

function downloadFileItem(tx, results) {
  var item = results.rows.item(0);
  if (item.downloaded_file == 0) {
    downloadFile(item.file_url, item.file_name);
    if (item.thumbnail_url)
      downloadFile(item.thumbnail_url, item.thumbnail_name);
  }
}

function downloadFile(itemUrl, itemName){
  updateDownloading('add');
  var fileTransfer = new FileTransfer();
  var encodedPath = encodeURI(itemUrl);
  var item = localStorage['rogersFilePathStorage'] + itemName;
  fileTransfer.download( encodedPath, item,
    function (file) {
      updateDownloading('subtract');
    },
    function (error) {
      updateDownloading('subtract');
      alert("download error source " + error.source);
    }, fileSystemFail);
}

function updateDownloading(action) {
  if (action == 'add')
    downloadCounter = downloadCounter + 1;
  else
    if (action == 'subtract' && downloadCounter > 0)
      downloadCounter = downloadCounter - 1;
    else
      if (downloadCounter == 0)
        DBUpdated();
}

function formatApiData(obj, subparent, parent) {
  //check this again
  subparent = typeof subparent !== 'undefined' ? subparent : null;
  parent = typeof parent !== 'undefined' ? parent : null;

  for(key in obj) {
    if (obj[key].constructor == Object) {
        formatApiData(obj[key], key, subparent);
    } else {
      if (obj[key].constructor == Array){
        switch(obj[key].length){
          case 1:  
            addRecords.push({item: obj[key], type: key, parent: subparent});
            break;
          case 3: 
            changeRecords.push({change: obj[key], field: key, position: subparent, type: parent});
            break;
          case 4:  
            removeRecords.push({item_id: obj[key][0]['id'], type: subparent});
            break;
        }
      }
    }
  }
}
