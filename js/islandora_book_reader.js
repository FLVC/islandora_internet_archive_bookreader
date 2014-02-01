/**
 * @file
 * IslandoraBookReader is derived from the Internet Archive BookReader class.
 */

/**
 * Constructor
 */
function IslandoraBookReader(settings) {
  BookReader.call(this);
  this.settings = settings;
  this.dimensions = {};
  this.numLeafs = settings.pageCount;
  this.bookTitle = settings.label.substring(0,97) + '...';
  this.bookUrl = document.location.toString();
  this.imagesBaseURL = settings.imagesFolderUri;
  this.logoURL = '';
  this.pageNums = settings.pageNumbers;
  this.mode = settings.mode;
  this.fullscreen = false;
  this.pageProgression = settings.pageProgression;
}

(function ($) {
  // Inherit from Internet Archive BookReader class.
  jQuery.extend(IslandoraBookReader.prototype, BookReader.prototype);

  /**
   * For a given "accessible page index" return the page number in the book.
   *
   * For example, index 5 might correspond to "Page 1" if there is front matter such
   * as a title page and table of contents.
   * for now we just show the image number
   *
   * @param int index
   *   The index of the page.
   */
  IslandoraBookReader.prototype.getPageNum = function(index) {
    //return index + 1;
    var pageNum = this.pageNums[index];
    if (pageNum) {
        return pageNum;
    } else {
        return 'n' + index;
    }
  }

  /**
   * Gets the index for the given leaf number.
   *
   * @param int leafNum
   *   The leaf number.
   *
   * @return int
   *   The index of the given leaf number.
   */
  IslandoraBookReader.prototype.leafNumToIndex = function(leafNum) {
    return leafNum - 1;
  }

  /**
   * Get the structure for the given page.
   */
  IslandoraBookReader.prototype.getPage = function(index) {
    if (typeof this.settings.pages[index] != 'undefined') {
      return this.settings.pages[index];
    }
  }

  /**
   * For a given "accessible page index" return the PID of that page.
   *
   * @param int index
   *   The index of the page.
   *
   * @return string
   *   The PID the given page repersents.
   */
  IslandoraBookReader.prototype.getPID = function(index) {
    var page = this.getPage(index);
    if (typeof page != 'undefined') {
      return page.pid;
    }
  }

  /**
   * For a given "accessible page index" return metadata from Djatoka.
   *
   * @param int index
   *   The index of the page.
   *
   * @return object
   *   An object contatining the following string fields:
   *   - width: The width of the image in pixels.
   *   - height: The width of the image in pixels.
   *   If this function fails the values for each field will be 0.
   */
  IslandoraBookReader.prototype.getPageDimensions = function(index) {
    var dimensions = { width: 0, height: 0 };
    var page = this.getPage(index);
    if (typeof page != 'undefined') {
      // If we don't have one or the other, make a query out to Djatoka.
      if (typeof page.width == 'undefined' || typeof page.height == 'undefined') {
        var pid = page.pid;
        if (typeof pid == 'undefined') {
          return dimensions;
        }
        var url = this.getDimensionsUri(pid);
        jQuery.ajax({
          url: url,
          dataType: 'json',
          success: function(data, textStatus, jqXHR) {
            dimensions.width = parseInt(data.width);
            dimensions.height = parseInt(data.height);
          },
          async: false,
        });
      }
      else {
        dimensions.width = parseInt(page.width);
        dimensions.height = parseInt(page.height);
      }
    }

    return dimensions;
  }

  /**
   * Gets the width of the given page.
   *
   * @param int index
   *   The index of the page.
   *
   * @return int
   *   The width in pixels of the given page.
   */
  IslandoraBookReader.prototype.getPageWidth = function(index) {
    if (typeof this.dimensions[index] == 'undefined') {
      this.dimensions[index] = this.getPageDimensions(index);
    }
    return this.dimensions[index].width;
  }

  /**
   * Gets the height of the given page.
   *
   * @param int index
   *   The index of the page.
   *
   * @return int
   *   The height in pixels of the given page.
   */
  IslandoraBookReader.prototype.getPageHeight = function(index) {
    if (typeof this.dimensions[index] == 'undefined') {
      this.dimensions[index] = this.getPageDimensions(index);
    }
    return this.dimensions[index].height;
  }

  /**
   * Checks to see if search is enabled.
   *
   * @return boolean
   *   true if search is enabled false otherwise.
   */
  IslandoraBookReader.prototype.searchEnabled = function() {
    return this.settings.searchUri != null;
  }

  /**
   * Gets the Djatoka URI.
   *
   * @param string resource_uri
   *   The uri to the image Djatoka will use.
   *
   * @return string
   *   The Djatoka URI for the given resource URI.
   */
  IslandoraBookReader.prototype.getDjatokaUri = function(resource_uri) {
    var base_uri = this.settings.djatokaUri;
    //Do some sanitation on that base uri.
    //Since it comes from an admin form, let's make sure there's a '/' at the
    //end of it.
    if (base_uri.charAt(base_uri.length) != '/') {
      base_uri += '/';
    }
    var params = $.param({
      'rft_id': resource_uri,
      'url_ver': 'Z39.88-2004',
      'svc_id': 'info:lanl-repo/svc/getRegion',
      'svc_val_fmt': 'info:ofi/fmt:kev:mtx:jpeg2000',
      //'svc.format': 'image/png',
      'svc.format': 'image/jpg',
      'svc.level': this.settings.compression,
      'svc.rotate': 0,
    });
    return (base_uri + 'resolver?' + params);
  };

  /**
   * Gets the URI to the dimensions callback for the given page.
   *
   * @param string pid
   *   The id of the object containing the resource.
   *
   * @return string
   *   The Dimensions URI of the callback, to be used to fetch the pages
   *   dimension.
   */
  IslandoraBookReader.prototype.getDimensionsUri = function(pid) {
    var uri = this.settings.dimensionsUri;
    uri = uri.replace('PID', pid);
    return uri;
  };

  /**
   * Gets URI to the given page resource.
   *
   * @param int index
   *   The index of the page.
   *
   * @return string
   *   The URI
   */
  IslandoraBookReader.prototype.getPageURI = function(index, reduce, rotate) {
    if (typeof this.settings.pages[index] != 'undefined') {
      var resource_uri = this.settings.pages[index].uri;
      return this.getDjatokaUri(resource_uri);
    }
  }

  /**
   * Get the URI to the text content for the given page object.
   * This content will be displayed in the full text modal dialog box.
   *
   * @param string pid
   *   The page object to fetch the text content from.
   *
   * @return string
   *   The URI
   */
  IslandoraBookReader.prototype.getTextURI = function (pid) {
    return this.settings.textUri.replace('PID', pid);
  }

  /**
   * Return which side, left or right, that a given page should be
   * displayed on.
   */
  IslandoraBookReader.prototype.getPageSide = function(index) {
    if ((parseInt(this.settings.pages[0].height) / parseInt(this.settings.pages[0].width)) > 2.5 ) {
        // first page is narrow, probably spine
        return this.settings.pageProgression.toUpperCase()[index & 0x1];
    }

    // first page is normal width, probably book cover

    if ('rl' != this.pageProgression) {
      // If pageProgression is not set RTL we assume it is LTR
      if (0 == (index & 0x1)) {
        // Even-numbered page
        return 'R';
      } else {
        // Odd-numbered page
        return 'L';
      }
    } else {
      // RTL
      if (0 == (index & 0x1)) {
        return 'L';
      } else {
        return 'R';
      }
    }

  }

  /**
   * This function returns the left and right indices for the user-visible
   * spread that contains the given index.  The return values may be
   * null if there is no facing page or the index is invalid.
   */
  IslandoraBookReader.prototype.getSpreadIndices = function(pindex) {
    var spreadIndices = [null, null];
    if ('rl' == this.pageProgression) {
      // Right to Left
      if (this.getPageSide(pindex) == 'R') {
        spreadIndices[1] = pindex;
        spreadIndices[0] = pindex + 1;
      }
      else {
        // Given index was LHS
        spreadIndices[0] = pindex;
        spreadIndices[1] = pindex - 1;
      }
    }
    else {
      // Left to right
      if (this.getPageSide(pindex) == 'L') {
        spreadIndices[0] = pindex;
        spreadIndices[1] = pindex + 1;
      }
      else {
        // Given index was RHS
        spreadIndices[1] = pindex;
        spreadIndices[0] = pindex - 1;
      }
    }
    return spreadIndices;
  }

  /**
   * Search SOLR for the given term.
   */
  IslandoraBookReader.prototype.search = function(term) {
    var url = this.settings.searchUri.replace('TERM', encodeURI(term));
    term = term.replace(/\//g, ' '); // strip slashes, since this goes in the url
    this.searchTerm = term;
    this.removeSearchResults();
    this.showProgressPopup('<img id="searchmarker" src="'+ this.imagesBaseURL + 'marker_srch-on.png'+'">' + Drupal.t('Search results will appear below ...') + '</img>');
    var that = this;
    $.ajax({url:url, dataType:'json',
            success: function(data, status, xhr) {
              that.BRSearchCallback(data);
            },
            error: function() {
              alert("Search call to " + url + " failed");
            }
           });
  }

  /**
   * Display the Search Progress
   */
  IslandoraBookReader.prototype.showProgressPopup = function(msg) {
    if (this.popup) return;
    this.popup = document.createElement("div");
    $(this.popup).css({
        top:      '-' + ($('#BookReader').height()*0.5) + 'px',
    }).attr('className', 'BRprogresspopup');
    var bar = document.createElement("div");
    $(bar).css({
        height:   '20px'
    }).attr('className', 'BRprogressbar');
    $(this.popup).append(bar);
    if (msg) {
        var msgdiv = document.createElement("div");
        msgdiv.innerHTML = msg;
        $(this.popup).append(msgdiv);
    }
    $(this.popup).appendTo('#BookReader');
  }

  /**
   * Search callback, displays results.
   */
  IslandoraBookReader.prototype.BRSearchCallback = function(results) {
    this.removeSearchResults();
    this.searchResults = results;
    if (0 == results.matches.length) {
      var errStr  = Drupal.t('No matches were found.');
      var timeout = 1000;
      if (false === results.indexed) {
        errStr  = "<p>" + Drupal.t("This book hasn't been indexed for searching yet. We've just started indexing it, so search should be available soon. Please try again later. Thanks!") + "</p>";
        timeout = 5000;
      }
      $(this.popup).html(errStr);
      var that = this;
      setTimeout(function(){
        $(that.popup).fadeOut('slow', function() {
          that.removeProgressPopup();
        })
      },timeout);
      return;
    }
    var i;
    for (i=0; i<results.matches.length; i++) {
      this.addSearchResult(results.matches[i].text, this.leafNumToIndex(results.matches[i].par[0].page));
    }
    this.updateSearchHilites();
    this.removeProgressPopup();
  }

  /**
   * Embed code is not supported at the moment.
   */
  IslandoraBookReader.prototype.getEmbedCode = function(frameWidth, frameHeight, viewParams) {
    return Drupal.t("Embed code not currently supported.");
  }

  /**
   * Intialized the strings in the interface.
   *
   * @todo Translate these strings.
   */
  IslandoraBookReader.prototype.initUIStrings = function() {
    // Navigation handlers will be bound after all UI is in place -- makes moving icons between
    // the toolbar and nav bar easier
    // Setup tooltips -- later we could load these from a file for i18n
    var titles = {
      '.logo': Drupal.t('Go to Archive.org'), // $$$ update after getting OL record
      '.zoom_in': Drupal.t('Zoom in'),
      '.zoom_out': Drupal.t('Zoom out'),
      '.onepg': Drupal.t('One-page view'),
      '.twopg': Drupal.t('Two-page view'),
      '.thumb': Drupal.t('Thumbnail view'),
      '.print': Drupal.t('Print this page'),
      '.embed': Drupal.t('Embed BookReader'),
      '.link': Drupal.t('Link to this book (and page)'),
      '.bookmark': Drupal.t('Bookmark this page'),
      '.read': Drupal.t('Read this book aloud'),
      '.share': Drupal.t('Share this book'),
      '.info': Drupal.t('Info'),
      '.full': Drupal.t('Show fullscreen'),
      '.book_up': Drupal.t('Page up'),
      '.book_down': Drupal.t('Page down'),
      '.play': Drupal.t('Play'),
      '.pause': Drupal.t('Pause'),
      '.BOOKREADERdn': Drupal.t('Show/hide nav bar'),
      '.BOOKREADERup': Drupal.t('Show/hide nav bar'),
      '.book_top': Drupal.t('First page'),
      '.book_bottom': Drupal.t('Last page'),
      '.full_text' : Drupal.t('Full Text')
    };
    if ('rl' == this.pageProgression) {
      titles['.book_leftmost'] = Drupal.t('Last page');
      titles['.book_rightmost'] = Drupal.t('First page');
      titles['.book_left'] = Drupal.t('Next Page');
      titles['.book_right'] = Drupal.t('Previous Page');
    } else { // LTR
      titles['.book_leftmost'] = Drupal.t('First page');
      titles['.book_rightmost'] = Drupal.t('Last page');
      titles['.book_left'] = Drupal.t('Previous Page');
      titles['.book_right'] = Drupal.t('Next Page');
    }
    for (var icon in titles) {
      if (titles.hasOwnProperty(icon)) {
        $('#BookReader').find(icon).attr('title', titles[icon]);
      }
    }
  }

  /**
   * Override the default toolbar, mostly the same but some icons such as
   * full text are added.
   */
  IslandoraBookReader.prototype.initToolbar = function(mode, ui) {
    if (ui == "embed") {
      return; // No toolbar at top in embed mode
    }
    var readIcon = '';
    if (!navigator.userAgent.match(/mobile/i)) {
      readIcon = "<button class='BRicon read modal'></button>";
    }

    $("#BookReader").append(
      "<div id='BRtoolbar'>"
        +   "<span id='BRtoolbarbuttons'>"
        +     "<form  id='booksearch'><input type='search' id='textSrch' name='textSrch' val='' placeholder='"
        +     Drupal.t('Search inside')
        +     "'/><button type='submit' id='btnSrch' name='btnSrch'>" + Drupal.t('GO') + "</button></form>"
        +     "<button class='BRicon play'></button>"
        +     "<button class='BRicon pause'></button>"
        +     "<button class='BRicon info'></button>"
        +     "<button class='BRicon full_text'></buttion>"
        +     "<button class='BRicon full'></button>"
        +     "<button class='BRicon share'></button>"
        +     readIcon
        +   "</span>"
        +   "<span><a class='logo' href='" + this.logoURL + "'></a></span>"
        +   "<span id='BRreturn'><a></a></span>"
        +   "<div id='BRnavCntlTop' class='BRnabrbuvCntl'></div>"
        + "</div>"
    );
    // Attach submit handler to form.
    var that = this;
    $('#BRtoolbarbuttons > form').submit(function(event) {
      event.preventDefault();
      that.search($('#textSrch').val());
      return false;
    });
    // Browser hack - bug with colorbox on iOS 3 see https://bugs.launchpad.net/bookreader/+bug/686220
    if ( navigator.userAgent.match(/ipad/i) && $.browser.webkit && (parseInt($.browser.version, 10) <= 531) ) {
      $('#BRtoolbarbuttons .info').hide();
      $('#BRtoolbarbuttons .share').hide();
    }

    $('#BRreturn a').attr('href', this.bookUrl).text(this.bookTitle);

    $('#BRtoolbar .BRnavCntl').addClass('BRup');
    $('#BRtoolbar .pause').hide();

    this.updateToolbarZoom(this.reduce); // Pretty format

    if (ui == "embed" || ui == "touch") {
      $("#BookReader a.logo").attr("target","_blank");
    }

    // $$$ turn this into a member variable
    var jToolbar = $('#BRtoolbar'); // j prefix indicates jQuery object

    // We build in mode 2
    jToolbar.append();

    // Hide mode buttons and autoplay if 2up is not available
    // $$$ if we end up with more than two modes we should show the applicable buttons
    if ( !this.canSwitchToMode(this.constMode2up) ) {
      jToolbar.find('.two_page_mode, .play, .pause').hide();
    }
    if ( !this.canSwitchToMode(this.constModeThumb) ) {
      jToolbar.find('.thumbnail_mode').hide();
    }

    // Hide one page button if it is the only mode available
    if ( !(this.canSwitchToMode(this.constMode2up) || this.canSwitchToMode(this.constModeThumb)) ) {
      jToolbar.find('.one_page_mode').hide();
    }

    var overlayOpacity = Drupal.settings.islandoraInternetArchiveBookReader.overlayOpacity;
    // $$$ Don't hardcode ids
    var self = this;
    jToolbar.find('.share').colorbox({inline: true, opacity: overlayOpacity, href: "#BRshare", onLoad: function() {
      self.autoStop(); self.ttsStop();
      $('#colorbox').draggable({
        cancel: '.BRfloat > :not(.BRfloatHead)'
      });
    }});
    jToolbar.find('.info').colorbox({inline: true, opacity: overlayOpacity, href: "#BRinfo", onLoad: function() {
      self.autoStop(); self.ttsStop();
      $('#colorbox').draggable({
        cancel: '.BRfloat > :not(.BRfloatHead)'
      });
    }});
    jToolbar.find('.full_text').colorbox({inline: true, opacity: overlayOpacity, href: "#BRfulltext", onLoad: function() {
      self.autoStop(); self.ttsStop();
      $('#colorbox').draggable({
        cancel: '.BRfloat > :not(.BRfloatHead)'
      });
      self.buildFullTextDiv($('#BRfulltext'));
    }});

    jToolbar.find('.full').bind('click', function() {
      self.toggleFullScreen();
    });

    $('<div style="display: none;"></div>').append(this.blankShareDiv()).append(this.blankInfoDiv()).append(this.blankFullTextDiv()).appendTo($('body'));
    $('#BRinfo .BRfloatTitle a').attr( {'href': this.bookUrl} ).text(this.bookTitle).addClass('title');
    this.buildInfoDiv($('#BRinfo'));
    this.buildShareDiv($('#BRshare'));
  }

  /**
   * Toggle fullscreen viewer.
   */
  IslandoraBookReader.prototype.toggleFullScreen = function() {
    this.fullscreen = (this.fullscreen ? false : true);
    if(this.fullscreen) {
/*
      $('div#book-viewer').css({
        'position': 'fixed',
        'width': '100%',
        'height': '100%',
        'left': '0',
        'top': '0',
        'z-index': '700'
      });
      $('div#BookReader, div#BRcontainer').css({
        'height': '100%'
      });
*/
      $('div#BookReader').css({
        'position': 'fixed',
        'width': '100%',
        'height': '100%',
        'left': '0',
        'top': '0',
        'z-index': '700'
      });
      $('div#BRcontainer').css({
        'height': '100%'
      });
      //this little hack re-centers the pages
      //this.zoom(1);
      //this.zoom(2);
      if (1 == this.mode) {
          this.prepareOnePageView();
      } else if (3 == this.mode) {
          this.prepareThumbnailView();
      } else {
          this.prepareTwoPageView();
          this.twoPageCenterView(0.5, 0.5);
      }

    }
    else {
/*
      $('div#book-viewer').css({
      'position': 'relative',
      'z-index': '0'
      });
      $('div#BookReader, div#BRcontainer').css({
        'height': '680px'
      });
*/
      $('div#BookReader').css({
        'position': 'static',
        'height': '680px',
        'z-index': '0'
      });
      $('div#BRcontainer').css({
        'height': '680px'
      });
      //this.zoom(1);
      //this.zoom(2);
      if (1 == this.mode) {
          this.prepareOnePageView();
      } else if (3 == this.mode) {
          this.prepareThumbnailView();
      } else {
          this.prepareTwoPageView();
          this.twoPageCenterView(0.5, 0.5);
      }

    }
  }

  /**
   * Go Fullscreen regardless of current state.
   */
   IslandoraBookReader.prototype.goFullScreen = function() {
    this.fullscreen = true;
/*
        $('div#book-viewer').css({
            'position': 'fixed',
            'width': '100%',
            'height': '100%',
            'left': '0',
            'top': '0',
            'z-index': '700'
        });
        $('div#BookReader, div#BRcontainer').css({
            'height': '100%'
        });
*/
        $('div#BookReader').css({
          'position': 'fixed',
          'width': '100%',
          'height': '100%',
          'left': '0',
          'top': '0',
          'z-index': '700'
        });
        $('div#BRcontainer').css({
          'height': '100%'
        });
        //this little hack re-centers the pages
        //this.zoom(1);
        //this.zoom(2);
        if (1 == this.mode) {
            this.prepareOnePageView();
        } else if (3 == this.mode) {
            this.prepareThumbnailView();
        } else {
            this.prepareTwoPageView();
            this.twoPageCenterView(0.5, 0.5);
        }

  }
  /**
   * The default look of the "Info" modal dialog box.
   */
  IslandoraBookReader.prototype.blankInfoDiv = function() {
    return $([
      '<div class="BRfloat" id="BRinfo">',
            '<div class="BRfloatHead">' + Drupal.t('About this book'),
                '<a class="floatShut" href="javascript:;" onclick="jQuery.fn.colorbox.close();"><span class="shift">' + Drupal.t('Close') + '</span></a>',
            '</div>',
      '</div>'].join('\n'));
  }

  /**
   * The default look of the "Full Text" modal dialog box.
   */
  IslandoraBookReader.prototype.blankFullTextDiv = function() {
     return $([
        '<div class="BRfloat" id="BRfulltext">',
            '<div class="BRfloatHead">Text View',
                '<a class="floatShut" href="javascript:;" onclick="jQuery.fn.colorbox.close();"><span class="shift">' + Drupal.t('Close') + '</span></a>',
            '</div>',
            '<div class="BRfloatMeta">',
            '</div>',
            '</div>',
        '</div>'].join('\n')
    );
  }

  /**
   * The default look of the "Share" modal dialog box.
   */
  IslandoraBookReader.prototype.blankShareDiv = function() {
    return $([
      '<div class="BRfloat" id="BRshare">',
            '<div class="BRfloatHead">',
                'Share',
                '<a class="floatShut" href="javascript:;" onclick="jQuery.fn.colorbox.close();"><span class="shift">' + Drupal.t('Close') + '</span></a>',
            '</div>',
      '</div>'].join('\n'));
  }

  /**
   * Appends content onto the "Info" module dialog box.
   */
  IslandoraBookReader.prototype.buildInfoDiv = function(jInfoDiv) {
    $(this.settings.info).appendTo(jInfoDiv);
  }

  /**
   * Appends content onto the "Share" module dialog box.
   */
  IslandoraBookReader.prototype.buildShareDiv = function(jShareDiv) {
    var pageView = document.location + '';
    var bookView = (pageView + '').replace(/#.*/,'');
    var self = this;
    var jForm = $([
        '<p>' + Drupal.t('Copy and paste one of these options to share this book elsewhere.') + '</p>',
        '<form method="post" action="">',
            '<fieldset>',
                '<label for="pageview">' + Drupal.t('Link to this page view:') + '</label>',
                '<input type="text" name="pageview" id="pageview" value="' + pageView + '"/>',
            '</fieldset>',
            '<fieldset>',
                '<label for="booklink">' + Drupal.t('Link to the book:') + '</label>',
                '<input type="text" name="booklink" id="booklink" value="' + bookView + '"/>',
            '</fieldset>',
            '<fieldset class="center">',
                '<button type="button" onclick="jQuery.fn.colorbox.close();">' + Drupal.t('Finished') + '</button>',
            '</fieldset>',
        '</form>'].join('\n'));

    jForm.appendTo(jShareDiv);

    jForm.find('input').bind('change', function() {
        var form = $(this).parents('form:first');
        var params = {};
        params.mode = $(form.find('input[name=pages]:checked')).val();
        if (form.find('input[name=thispage]').attr('checked')) {
            params.page = self.getPageNum(self.currentIndex());
        }

        // $$$ changeable width/height to be added to share UI
        var frameWidth = "480px";
        var frameHeight = "430px";
        form.find('.BRframeEmbed').val(self.getEmbedCode(frameWidth, frameHeight, params));
    })
    jForm.find('input[name=thispage]').trigger('change');
    jForm.find('input, textarea').bind('focus', function() {
      this.select();
    });
    jForm.appendTo(jShareDiv);
    jForm = ''; // closure
  }

  /**
   * Appends content onto the "FullText" module dialog box.
   */
  IslandoraBookReader.prototype.buildFullTextDiv = function(jFullTextDiv) {
    jFullTextDiv.find('.BRfloatMeta').height(600);
    jFullTextDiv.find('.BRfloatMeta').width(600);
    if (1 == this.mode) {
      // Recent fix to correct issue with 2 page books
      var hash_arr = this.oldLocationHash.split("/");
      //var index = hash_arr[1];
      //var pid = this.getPID(index-1);
      var index = this.getPageIndex(hash_arr[1].replace("+"," "));
      var pid = this.getPID(index);
      $.get(this.getTextURI(pid),
            function(data) {
              jFullTextDiv.find('.BRfloatMeta').html(data);
            });
    } else if (3 == this.mode) {
      jFullTextDiv.find('.BRfloatMeta').html('<div>' + Drupal.t('Full text not supported for this view.') + '</div>');
    } else {
      var twoPageText = $([
      '<div class="textTop">',
         '<div class="textLeft"></div>',
         '<div class="textRight"></div>',
      '</div>'].join('\n'));
      jFullTextDiv.find('.BRfloatMeta').html(twoPageText);
      var indices = this.getSpreadIndices(this.currentIndex());
      var left_pid = this.getPID(indices[0]);
      var right_pid = this.getPID(indices[1]);
      if(left_pid) {
        $.get(this.getTextURI(left_pid),
              function(data) {
                jFullTextDiv.find('.textLeft').html(data);
              });
      }
      if(right_pid) {
        $.get(this.getTextURI(right_pid),
              function(data) {
                jFullTextDiv.find('.textRight').html(data);
              });
      }
    }
  }

  /**
   * This call back bind's handlers to various controls in the viewer. Performs
   * the default behaviour and add an additional navigation handler that hides
   * the viewer's toolbars, but otherwise allows tooltips to appear outside the
   * interface.
   */
  IslandoraBookReader.prototype.bindNavigationHandlers = function() {
    BookReader.prototype.bindNavigationHandlers.apply(this);
    $('.BRnavCntl').click(function(){
      if ($('#BRnavCntlBtm').hasClass('BRdn')) {
        $('#BookReader').css('overflow', 'visible');
      }
      else {
        $('#BookReader').css('overflow', 'hidden');
      }
    });
  }

  /**
   * Update the location hash only change it when it actually changes, as some
   * browsers can't handle that shit.
   */
  IslandoraBookReader.prototype.updateLocationHash = function() {
    // Updated with fix to recent bug found in the Archive Viewer that
    // prevents the last page from displaying the correct transcriptions
    // or hash links.
/* commenting out bug fix for now */
    var page_string = $('#pagenum').children('.currentpage').html();
    if (page_string != null) {
      var p_arr = page_string.split(" ");
      var p_index = p_arr[1]
      index = p_index;
    }
    else {
      index = 1;
    }

    //var newHash = '#' + this.fragmentFromParams(this.paramsFromCurrent());
    var currindex = this.currentIndex();
    if (page_string != this.currentIndex()) {
      var param_data = this.fragmentFromParams(this.paramsFromCurrent()).split("/");
      param_data[1] = index;
      //newHash = '#' + replaceAll(',','/',param_data.toString());
    }
    // End bug fix.


    var newHash = '#' + this.fragmentFromParams(this.paramsFromCurrent());

    if (this.oldLocationHash != newHash) {
      window.location.hash = newHash;
    }
    // This is the variable checked in the timer.  Only user-generated changes
    // to the URL will trigger the event.
    this.oldLocationHash = newHash;
  }

  function replaceAll(find, replace, str) {
    return str.replace(new RegExp(find, 'g'), replace);
  }

  /**
   * Prepare to flip the current right page left.
   *
   * This is only overridden to deal with a bug in small books in that their css
   * properties don't get reside because the page hasn't been removed from the
   * prefetch pages list.
   */
  IslandoraBookReader.prototype.prepareFlipRightToLeft = function(nextL, nextR) {
    $(this.prefetchedImgs[nextL]).removeAttr('style');
    $(this.prefetchedImgs[nextR]).removeAttr('style');
    BookReader.prototype.prepareFlipRightToLeft.call(this, nextL, nextR);
  }

/* FLVC - Overriding following functions to remove leading "Page " from displays */

IslandoraBookReader.prototype.getPageName = function(index) {
    return this.getPageNum(index);
}

IslandoraBookReader.prototype.addSearchResult = function(queryString, pageIndex) {
    var pageNumber = this.getPageNum(pageIndex);
    var uiStringSearch = "Search result"; // i18n
    var uiStringPage = "Page"; // i18n
    
    var percentThrough = BookReader.util.cssPercentage(pageIndex, this.numLeafs - 1);
    var pageDisplayString = '';
    if (pageNumber) {
        pageDisplayString = pageNumber;
    }
    
    var re = new RegExp('{{{(.+?)}}}', 'g');    
    queryString = queryString.replace(re, '<a href="#" onclick="br.jumpToIndex('+pageIndex+'); return false;">$1</a>')

    var marker = $('<div class="search" style="top:'+(-$('#BRcontainer').height())+'px; left:' + percentThrough + ';" title="' + uiStringSearch + '"><div class="query">'
        + queryString + '<span>' + pageNumber + '</span></div>')
    .data({'self': this, 'pageIndex': pageIndex })
    .appendTo('#BRnavline').bt({
        contentSelector: '$(this).find(".query")',
        trigger: 'hover',
        closeWhenOthersOpen: true,
        cssStyles: {
            padding: '12px 14px',
            backgroundColor: '#fff',
            border: '4px solid #e2dcc5',
            fontFamily: '"Lucida Grande","Arial",sans-serif',
            fontSize: '13px',
            //lineHeight: '18px',
            color: '#615132'
        },
        shrinkToFit: false,
        width: '230px',
        padding: 0,
        spikeGirth: 0,
        spikeLength: 0,
        overlap: '22px',
        overlay: false,
        killTitle: false, 
        textzIndex: 9999,
        boxzIndex: 9998,
        wrapperzIndex: 9997,
        offsetParent: null,
        positions: ['top'],
        fill: 'white',
        windowMargin: 10,
        strokeWidth: 0,
        cornerRadius: 0,
        centerPointX: 0,
        centerPointY: 0,
        shadow: false
    })
    .hover( function() {
                // remove from other markers then turn on just for this
                // XXX should be done when nav slider moves
                $('.search,.chapter').removeClass('front');
                $(this).addClass('front');
            }, function() {
                $(this).removeClass('front');
            }
    )
    .bind('click', function() {
        $(this).data('self').jumpToIndex($(this).data('pageIndex'));
    });
    
    $(marker).animate({top:'-25px'}, 'slow');

}

IslandoraBookReader.prototype.addChapter = function(chapterTitle, pageNumber, pageIndex) {
    var uiStringPage = 'Page'; // i18n

    var percentThrough = BookReader.util.cssPercentage(pageIndex, this.numLeafs - 1);
    
    $('<div class="chapter" style="left:' + percentThrough + ';"><div class="title">'
        + chapterTitle + '<span>|</span> ' + pageNumber + '</div></div>')
    .appendTo('#BRnavline')
    .data({'self': this, 'pageIndex': pageIndex })
    .bt({
        contentSelector: '$(this).find(".title")',
        trigger: 'hover',
        closeWhenOthersOpen: true,
        cssStyles: {
            padding: '12px 14px',
            backgroundColor: '#000',
            border: '4px solid #e2dcc5',
            //borderBottom: 'none',
            fontFamily: '"Arial", sans-serif',
            fontSize: '12px',
            fontWeight: '700',
            color: '#fff',
            whiteSpace: 'nowrap'
        },
        shrinkToFit: true,
        width: '200px',
        padding: 0,
        spikeGirth: 0,
        spikeLength: 0,
        overlap: '21px',
        overlay: false,
        killTitle: true, 
        textzIndex: 9999,
        boxzIndex: 9998,
        wrapperzIndex: 9997,
        offsetParent: null,
        positions: ['top'],
        fill: 'black',
        windowMargin: 10,
        strokeWidth: 0,
        cornerRadius: 0,
        centerPointX: 0,
        centerPointY: 0,
        shadow: false
    })
    .hover( function() {
            // remove hover effect from other markers then turn on just for this
            $('.search,.chapter').removeClass('front');
                $(this).addClass('front');
            }, function() {
                $(this).removeClass('front');
            }
    )
    .bind('click', function() {
        $(this).data('self').jumpToIndex($(this).data('pageIndex'));
    });
}

IslandoraBookReader.prototype.updateNavPageNum = function(index) {
    var pageNum = this.getPageNum(index);
    var pageStr;
    if (pageNum[0] == 'n') { // funny index
        pageStr = index + 1 + ' / ' + this.numLeafs; // Accessible index starts at 0 (alas) so we add 1 to make human
    } else {
        pageStr = pageNum;
    }
    
    $('#pagenum .currentpage').text(pageStr);
}

/*
* Update the table of contents based on array of TOC entries.
*/
IslandoraBookReader.prototype.updateTOC = function(tocEntries) {
    this.removeChapters();
    for (var i = tocEntries.length - 1; i >= 0; i--) {
        this.addChapterFromEntry(tocEntries[i]);
    }
}

})(jQuery);
