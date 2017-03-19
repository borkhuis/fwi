/**
 * Flickr Webalbum Integration jQuery plugin
 * This library is based of the PWI plugin.
 * @name jquery.fwi.js
 * @author Johan Borkhuis - http://www.borkhuis.com/
 * @revision 0.0.1
 * @date mar 19, 2017
 * @copyright (c) 2017 Johan Borkhuis
 */

(function ($) {
    var elem, opts = {};
    $.fn.fwi = function (opts) {
        var $self, settings = {}, strings = {};
        opts = $.extend(true,{}, $.fn.fwi.defaults, opts);
        opts.selector = this.selector;
        elem = this;

        // Function:        formatDate
        // Description:     Format date to <day>-<month>-<year>
        // Parameters:      $dt: Date-object
        // Return:          Date string
        function formatDate($dt) {
            $year = $dt.getUTCFullYear();
            if ($year < 1000) {
                $year += 1900;
            }
            return ($dt.getUTCDate() + "-" + ($dt.getUTCMonth() + 1) + "-" + $year);
        }

        // Function:        sortData
        // Description:     Sort array according to sortMode
        // Parameters:      j: array containing all photo or album records
        //                  sortMode: mode to sort; name or date; ascending or descending
        // Return:          Sorted array
        function sortData(entries, sortMode) {
            if (sortMode === "none")
                return;

            function ascDateSort(a, b) {
                return Number(a.date) - Number(b.date);
            }
            function descDateSort(a, b) {
                return Number(b.date) - Number(a.date);
            }
            function ascNameSort(a, b) {
                var nameA = a.title.$t.toLowerCase( );
                var nameB = b.title.$t.toLowerCase( );
                if (nameA < nameB) {return -1}
                if (nameA > nameB) {return 1}
                return 0;
            }
            function descNameSort(a, b) {
                var nameA = a.title.$t.toLowerCase( );
                var nameB = b.title.$t.toLowerCase( );
                if (nameA > nameB) {return -1}
                if (nameA < nameB) {return 1}
                return 0;
            }

            switch (sortMode) {
                case "ASC_DATE":
                    entries.sort(ascDateSort);
                    break;
                case "DESC_DATE":
                    entries.sort(descDateSort);
                    break;
                case "ASC_NAME":
                    entries.sort(ascNameSort);
                    break;
                case "DESC_NAME":
                    entries.sort(descNameSort);
                    break;
            }
        }
   
        // Function:        alignPictures
        // Description:     Align all pictures horizontally and vertically
        // Parameters:      divName: Name of the div containing the pictures
        // Return:          none
        function alignPictures(divName) {
            // Now make sure all divs have the same width and heigth
            var divHeigth = 0;
            $(divName).each(function(index, element) {
                var localHeigth = settings.albumThumbSize + parseInt(element.childNodes[1].clientHeight);
                if (divHeigth < localHeigth) {
                    divHeigth = localHeigth;
                }
            });
            $(divName).css('height', (divHeigth+2)+'px');
            if (settings.thumbAlign) {
                $(divName).css('width', (settings.albumThumbSize+2)+'px');
            }
        }
        
        function _initialize() {
            settings = opts;
            ts = new Date().getTime();
            settings.id = ts;
            strings = $.fn.fwi.strings;
            $self = $("<div id='fwi_" + ts + "'/>").appendTo(elem);
            $self.addClass('fwi_container');
            _start();
            return false;
        }

        function _start() {
            if (settings.username === '') {
                //alert('Make sure you specify at least your username.' + '\n' +
                        //'See http://fwi.googlecode.com for more info');
                //return;
            }
            switch (settings.mode) {
                case 'latest':
                    getLatest();
                    break;
                case 'album':
                case 'keyword':
                    getAlbum(1);
                    break;
                default:
                    getAlbums();
                    break;
            }
        }

        // Function:        photo
        // Description:     Create a photo-div
        // Parameters:      j: element containing the photo data
        //                  hidden: photo should not be shown, but included in HTML
        // Return:          HTML containing the photo-div
        function photo(j, hidden) {
            var $html, $thumb, $title = "", $youtubeId = "", $jsonData;

            if (j.title) {
                try {
                    $jsonData = JSON.parse(j.title);
                    if ($jsonData.youtube.length > 0) {
                        $youtubeId = $jsonData.youtube;
                    }
                } catch(e) {
                    //Empty catch, if no JSON data is found.
                }
            }

            if(settings.showPhotoTitle) {
                $title = j.title;
            }

            if ($youtubeId != "") {
                $anchor = $('<a>').attr({
                    href: "http://www.youtube.com/embed/" + $youtubeId + "?rel=0&wmode=transparent&autoplay=1&showinfo=0"
                });
                $thumb = $('<img>').attr({
                    // get the small-square size thumbnail photo
                    src: j.url_q,
                    alt: $title,
                    width: settings.thumbSize,
                    heigth: settings.thumbSize
                }).appendTo($anchor);
                if (settings.videoBorder != "") {
                    $thumb = $('<img>').attr({
                        id: 'video',
                        src: settings.videoBorder,
                        width: settings.thumbSize,
                        heigth: settings.thumbSize
                    }).appendTo($anchor);
                }
                $anchor.colorbox(opts.colorbox_config.config_youtube);
            } else {
                if (typeof j.url_l == 'undefined') {
                    $anchor = $('<a>').attr({
                        // get the original size photo
                        href: j.url_o,
                        title: $title
                    });
                } else {
                    $anchor = $('<a>').attr({
                        // get the medium-large size photo
                        href: j.url_l,
                        title: $title
                    });
                };

                $thumb = $('<img>').attr({
                    // get the small-square size thumbnail photo
                    src: j.url_q,
                    alt: $title,
                    width: settings.thumbSize,
                    heigth: settings.thumbSize
                }).appendTo($anchor);

                $anchor.colorbox(opts.colorbox_config.config_photos);
            };
            $html = $("<div class='fwi_photo' style='cursor: pointer;'/>").append($anchor);

            return $html;
        }
        
        function albums(j) {
            var $scAlbums = $("<div/>"), i = 0;
            var $startDate, $endDate;

            //$scAlbums = $("<div class='fwi_album_description'/>");

            var $albumsToShow = $.grep(j.photosets.photoset, function(n, i) {
                var $descriptionData;
                try {
                    $descriptionData = JSON.parse(n.description._content.replace(/&quot;/g, '"'));
                } catch(e) {
                    n.date = new Date();
                    //alert('Incorrect data in description\nAlbum: ' + n.title._content +
                        //'\nText: ' + n.description._content.replace(/&quot;/g, '"'));
                    //return false;
                }
                if (settings.albumKeywords.length > 0) {
                    $keywordMatch = false;
                    if ($descriptionData.keywords.length > 0) {
                        $keywordMatch = true;
                        for (var p in settings.albumKeywords) {
                            if ($.inArray(settings.albumKeywords[p], $descriptionData.keywords) < 0) {
                                $keywordMatch = false;
                                break;
                            }
                        }
                    }
                    n.date = new Date($descriptionData.date);
                    if ($keywordMatch == false) 
                        return false;
                }
                
                return true;
            });

            if ($albumsToShow.length == 0) {
                $scAlbums = $("<div class='fwi_album_description'/>");
                $scAlbums.append("<div class='title'>" + settings.labels.noalbums + "</div>");
                show(false, $scAlbums);
                return;
            }
 
            sortData($albumsToShow, settings.sortAlbums);
            
            $.each($albumsToShow, function(i, n) {
                var $scAlbum = $("<div class='fwi_album' style='cursor: pointer; width:150px;'/>");
                $scAlbum.bind('click.fwi', n, function (e) {
                    e.stopPropagation();
                    settings.page = 1;
                    settings.album = e.data.id;
                    settings.albumdescription = e.data.description._content;
                    if (typeof (settings.onclickAlbumThumb) === "function") {
                        settings.onclickAlbumThumb(e);
                    } else {
                        getAlbum(1);
                    }
                    return false;
                });
                
                //$scAlbum.append("<img src='" + n.primary_photo_extras.url_q + "' alt='album'/>");
                $scAlbum.append($("<img>").attr({
                    src: n.primary_photo_extras.url_q,
                    width: settings.albumThumbSize,
                    heigth: settings.albumThumbSize,
                    alt: 'album'
                }));
                if (settings.showAlbumTitles) {
                    var $scAlbumTitle = $("<div class='fwi_album_title'/>");

                    $scAlbumTitle.append(n.title._content +
                            (settings.showAlbumPhotoCount ? "<br />" +
                            (settings.showAlbumdate ? formatDate(n.date) : "") +
                            (settings.showAlbumPhotoCount ? "&nbsp;&nbsp;&nbsp;&nbsp;" + n.photos + " " +
                             ((n.photos == "1") ? settings.labels.photo :  settings.labels.photos) : "") : ""));

                    $scAlbum.append($scAlbumTitle);
                }

                $scAlbums.append($scAlbum);
            });

            $scAlbums.append(strings.clearDiv);
           
            $self.html("");
            show(false, $scAlbums);

            alignPictures('div.fwi_album');
        }

        function album(json) {
            var $links = $("<div/>"), 
            $thumb,
            $anchor;

            var currentPage = parseInt(json.photoset.page);

            $albumTitle = json.photoset.title;

            $navRow = $("<div class='fwi_pager'/>");

            $anchor = $("<div/>");
            if (settings.mode != 'album' && settings.mode != 'keyword') {
                tmp = $("<div class='fwi_album_backlink'>" + settings.labels.albums + "</div>").bind('click.fwi', function (e) {
                    e.stopPropagation();
                    getAlbums();
                    return false;
                });
                $links.append(tmp);
            }

            if (json.photoset.pages > 1) {
                // Multiple pages: 
                var $ppage = $("<div class='fwi_prevpage'/>").text(settings.labels.prev),
                $npage = $("<div class='fwi_nextpage'/>").text(settings.labels.next);
                if (currentPage > 1) {
                    $ppage.addClass('link').bind('click.fwi', function (e) {
                        e.stopPropagation();
                        getAlbum(currentPage-1);
                        return false;
                    });
                }
                $navRow.append($ppage);
                var startPaging = currentPage - 3;
                if (startPaging < 1) startPaging = 1;
                var endPaging = currentPage + 3;
                if (endPaging > json.photoset.pages) endPaging = json.photoset.pages;
                for (var p = startPaging; p <= endPaging; p++) {
                    if (p == currentPage) {
                        tmp = "<div class='fwi_pager_current'>" + p + "</div> ";
                    } else {
                        tmp = $("<div class='fwi_pager_page'>" + p + "</div>").bind('click.fwi', p, function (e) {
                            e.stopPropagation();
                            getAlbum(e.data);
                            return false;
                        });
                    }
                    $navRow.append(tmp);
                }
                if (currentPage < json.photoset.pages) {
                    $npage.addClass('link').bind('click.fwi', function (e) {
                        e.stopPropagation();
                        getAlbum(parseInt(currentPage)+1);
                        return false;
                    });
                }
                $navRow.append($npage);
                $navRow.append(strings.clearDiv);
            }

            if ((json.photoset.pages > 1) && (settings.showPager === 'both' || settings.showPager === 'top')) {
                $links.append($navRow.clone(true));
            }

            $.each(json.photoset.photo, function(i, n) {
                $links = $links.append(photo(json.photoset.photo[i], false));
            });

            if ((json.photoset.pages > 1) && (settings.showPager === 'both' || settings.showPager === 'bottom')) {
                $links.append($navRow.clone(true));
            }

            $links = $links.append(strings.clearDiv);

            $self.html("");

            // Wait until the DOM has loaded before trying to append to the body
            $(document).ready(function () {
                $self.html($links);
            });
        }
            
        function getAlbum(page) {
            //show(true, '');
            $.getJSON(strings.flickrUrl, {
                api_key: settings.api_key,
                user_id: settings.username,
                photoset_id: settings.album,
                per_page: settings.maxResults,
                page: page,
                method: "flickr.photosets.getPhotos",
                extras: "url_q,url_l,url_o,url_m",
                format: "json"
            }, album);
            return $self;
        }

        function getAlbums() {
            //show(true, '');
            $.getJSON(strings.flickrUrl, {
                api_key: settings.api_key,
                user_id: settings.username,
                method: "flickr.photosets.getList",
                per_page: "500",
                primary_photo_extras: "url_q",
                format: "json"
            }, albums);
            return $self;
        }

        function show(loading, data) {
            if (loading) {
                if (settings.loadingImage.length > 0) {
                    $(settings.loadingImage).show();
                }
                document.body.style.cursor = "wait";
                //--if ($.blockUI){ $self.block(settings.blockUIConfig);}
            } else {
                if (settings.loadingImage.length > 0) {
                    $(settings.loadingImage).hide();
                }
                document.body.style.cursor = "default";
                //--if ($.blockUI){ $self.unblock(); }
                $self.html(data);
            }
        }

        _initialize();
    };

    $.fn.fwi.defaults = {
        mode: 'albums', //-- can be: album, albums, latest
        username: '',   //-- Must be explicitly set!!!
        album: "", //-- For loading a single album        
        api_key: "2f0e634b471fdb47446abcb9c5afebdc",  //-- FWI api key
        keyword: "", //-- filter photo's within album using the photo-tag
        albumKeywords: [], //-- Only show albums containing one of these keywords in the description. Use [keywords: "kw1", "kw2"] within the description
        maxResults: 500,    //-- Flickr returns max 500 items per request
        thumbSize: 150, //-- specify thumbnail size of albumthumbs
        albumThumbSize: 150, //-- specify thumbnail size of albumthumbs
        page: 1, //-- initial page for an photo page        
        photoSize: "90%",
        videoSize: "70%",
        showPager: 'bottom', //'top', 'bottom', 'both' (for both albums and album paging)
        loadingImage: "",
        thumbAlign: false, //-- Allign thumbs vertically between rows
        sortAlbums: "none",     // Can be none, ASC_DATE, DESC_DATE, ASC_NAME, DESC_NAME
        sortPhotos: "none",     // Can be none, ASC_DATE, DESC_DATE, ASC_NAME, DESC_NAME        
        ownRelTag: "",          //-- Can be used to combine several albums by using the same rel-tag or split albums that are accidentally combined by using different rel-tags
        showAlbumTitles: true,  //--following settings should be self-explanatory
        showAlbumdate: false,
        showAlbumPhotoCount: true,
        showPhotoTitle: false,
        showPhotoDownloadPopup: false,
        showPhotoDate: true,
        showPageCounter: true,          //-- Show the counters below the pictures when more pages are available
        windowNoScroll: false,          //-- Do not scroll to the top of the window when the albun is refreshed
        videoBorder: "images/video.png",
        labels: {
            photo: "photo",
            photos: "photos",
            albums: "Back to albums",
            noalbums: "No albums available",
            page: "Page",
            prev: "Previous",
            next: "Next"
        },
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        colorbox_config: {
            config_photos: {
                rel             : 'flickr', 
                speed           : 0, 
                maxWidth        : "90%",
                maxHeight       : "90%",
                title           : formatPhotoTitleColorBox,
                current         : "Photo {current} of {total}"
            },
            config_youtube: {
                rel             : 'youtube', 
                iframe          : true,
                innerWidth      : "70%",
                innerHeight     : "70%",
                current         : "Video {current} of {total}"
            }
        },
        

        // Some internally used variables, do not touch
        token: "", //-- don't touch
        selector: "", //-- don't touch
        albumdescription: ""
            
    };
    $.fn.fwi.strings = {
        clearDiv: "<div style='clear: both;height:0px;'/>",
        flickrUrl: "https://api.flickr.com/services/rest/?jsoncallback=?"
    };
})(jQuery);

function formatPhotoTitleColorBox() {
    var url = $(this).attr('href');
    var title = $(this).attr('title') + '&nbsp;&nbsp;';
    return title + '<a href="' + url + '" target="_blank">Download</a>';
}

