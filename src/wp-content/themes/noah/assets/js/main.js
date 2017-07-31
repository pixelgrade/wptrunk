(function( $, window, document, undefined ) {

var AjaxLoading = function() {

    var _this = this;

    _this.ev = $({});

    if ( typeof Barba === "undefined" ) {
        return;
    }

    var ignored = ['.pdf', '.doc', '.eps', '.png', '.jpg', '.jpeg', '.zip', 'admin', 'wp-', 'wp-admin', 'feed', '#', '&add-to-cart=', '?add-to-cart=', '?remove_item'],
        barbaPreventCheck = Barba.Pjax.preventCheck;

    Barba.Pjax.preventCheck = function( ev, element ) {

        if ( !element || !element.href ) {
            return false;
        } else {
            for ( var i = ignored.length - 1; i >= 0; i-- ) {
                if ( element.href.indexOf( ignored[i] ) > -1 ) {
                    return false;
                }
            }
        }

        return barbaPreventCheck.call( Barba.Pjax, ev, element );
    };

    /**
    * Next step, you have to tell Barba to use the new Transition
    */
    Barba.Pjax.getTransition = function() {
        /**
        * Here you can use your own logic!
        * For example you can use different Transition based on the current page or link...
        */

        return Barba.BaseTransition.extend({
            start: function() {
                /**
                 * This function is automatically called as soon the Transition starts
                 * this.newContainerLoading is a Promise for the loading of the new container
                 * (Barba.js also comes with an handy Promise polyfill!)
                 */
                Promise
                    .all( [this.newContainerLoading, this.fadeOut()] )
                    .then( this.fadeIn.bind( this ) );
            },

            fadeOut: function() {
                /**
                 * this.oldContainer is the HTMLElement of the old Container
                 */
                var _that = this,
                    $old = $( _that.oldContainer );

                $old.find('video').each( function() {
                    this.pause(); // can't hurt
                    delete this; // @sparkey reports that this did the trick (even though it makes no sense!)
                    this.src = ""; // empty source
                    this.load();
                    $( this ).remove(); // this is probably what actually does the trick
                });

                _this.ev.trigger( 'beforeOut', $( _that.newContainer ) );


                return new Promise( function( resolve ) {
                    // alternate syntax for adding a callback
                    setTimeout(function() {
                        resolve( true );
                        _this.ev.trigger( 'afterOut', $( _that.newContainer ) );
                    }, 1000);
                });
            },

            fadeIn: function() {
                var _that = this;

                /**
                 * this.newContainer is the HTMLElement of the new Container
                 * At this stage newContainer is on the DOM (inside our #barba-container and with visibility: hidden)
                 * Please note, newContainer is available just after newContainerLoading is resolved!
                 */
                Barba.Pjax.Cache.data[Barba.HistoryManager.currentStatus().url].then( function(data) {
                    // get data and replace the body tag with a nobody tag
                    // because jquery strips the body tag when creating objects from data
                    var $newBody = $( data.replace(/(<\/?)body( .+?)?>/gi, '$1NOTBODY$2>', data) ).filter( 'notbody' );

                    // need to get the id and edit string from the data attributes
                    var curPostID = $newBody.data('curpostid'),
                        curPostTax = $newBody.data( 'curtaxonomy' ),
                        curPostEditString = $newBody.data( 'curpostedit' );

                    // Put the new body classes
                    $( 'body' ).attr( 'class', $newBody.attr( 'class' ) );

                    // Fix the admin bar, including modifying the body classes and attributes
                    adminBarEditFix( curPostID, curPostEditString, curPostTax );

                    window.scrollTo(0, 0);

                    _this.ev.trigger( 'beforeIn', $( _that.newContainer ) );

                    _that.done();

                    // find and initialize Tiled Galleries via Jetpack
                    if ( typeof tiledGalleries !== "undefined" ) {
                        tiledGalleries.findAndSetupNewGalleries();
                    }

                    // lets do some Google Analytics Tracking
                    if ( window._gaq ) {
                        _gaq.push( ['_trackPageview'] );
                    }

                    _this.ev.trigger( 'afterIn', $( _that.newContainer ) );
                });
            }
        });
    };

    Barba.Pjax.start();
};

var Gallery = function( $container ) {

	var _this = this;

	_this.$el = $();

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	$container.find( '.c-gallery' ).each( function( i, obj ) {
		var $gallery = $( obj );

		if ( ! $gallery.children().length ) {
			return;
		}

		_this.$el = _this.$el.add( $gallery );

		$gallery.data( 'offset', $gallery.offset() );

		$gallery.imagesLoaded( function() {
			_this.refresh( $gallery );
		} );
	} );
};

Gallery.prototype.update = function( trigger ) {
	var _this = this;

	_this.$el.each( function( i, obj ) {
		var $gallery = $( obj ),
			offset = $gallery.data( 'offset' );

		if ( trigger > offset.top ) {
			_this.show( $gallery );
		}
	} );
};

Gallery.prototype.show = function( $gallery ) {

	$gallery.find( '.c-card' ).each( function( i, obj ) {
		var $this = $( obj );

		if ( typeof $this.data( 'is-visible' ) !== "undefined" && $this.data( 'is-visible' ) ) {
			return;
		}

		$this.data( 'is-visible', true );

		setTimeout( function() {
			$this.imagesLoaded( function() {
				requestAnimationFrame( function() {
					$this.addClass( 'is-visible' );
				} );
			} );
		}, i * 100 );
	} );

};

Gallery.prototype.refresh = function( $galleries ) {
	var _this = this;

	if ( typeof $galleries === "undefined" ) {
		$galleries = _this.$el;
	}

	$galleries.each( function( i, obj ) {

		var $gallery = $( obj );

		if ( ! $gallery.is( '.js-masonry' ) ) {
			return;
		}

		var minWidth = $gallery.children()[0].getBoundingClientRect().width;

		$gallery.children().each( function() {
			var width = this.getBoundingClientRect().width;

			if ( width < minWidth ) {
				minWidth = width;
			}
		} );


		$gallery.masonry( {
			isAnimated: false,
			columnWidth: minWidth
		} );

	} );

};

var Hero = function() {

	this.refresh = function() {
		this.scrolled = null;
		this.hasHero = $( 'body' ).is( '.has-hero' );
		this.adminBarHeight = $( '#wpadminbar' ).height();
		this.heroHeight = $( '.c-hero' ).outerHeight() || 0;
		this.borderWidth = parseInt( $( '.c-border' ).css( 'borderTopWidth' ), 10 );

		$( '.site-header' ).css( 'top', this.heroHeight );

	};

	this.refresh();
};

Hero.prototype.update = function( scrollY ) {

	if ( ! this.hasHero ) {
		return;
	}

	if ( this.scrolled !== true && scrollY > this.heroHeight ) {
		this.scrolled = true;
		$( 'body' ).addClass( 'is-scrolled' );
		return;
	}

	if ( this.scrolled !== false && scrollY <= this.heroHeight ) {
		this.scrolled = false;
		$( 'body' ).removeClass( 'is-scrolled' );
	}
};

(function(){

    var $hero = $( '.c-hero__wrapper' ),
        $document = $( document ),
        keysBound = false;

    function positionHeroContent( e ) {
        switch( e.which ) {
            case 37: // left
                if ( $hero.hasClass( 'c-hero__wrapper--right' ) ) {
                    $hero.removeClass( 'c-hero__wrapper--right' );
                } else {
                    $hero.addClass( 'c-hero__wrapper--left' );
                }
            break;

            case 38: // up
                if ( $hero.hasClass( 'c-hero__wrapper--bottom' ) ) {
                    $hero.removeClass( 'c-hero__wrapper--bottom' );
                } else {
                    $hero.addClass( 'c-hero__wrapper--top' );
                }
            break;

            case 39: // right
                if ( $hero.hasClass( 'c-hero__wrapper--left' ) ) {
                    $hero.removeClass( 'c-hero__wrapper--left' );
                } else {
                    $hero.addClass( 'c-hero__wrapper--right' );
                }
            break;

            case 40: // down
                if ( $hero.hasClass( 'c-hero__wrapper--top' ) ) {
                    $hero.removeClass( 'c-hero__wrapper--top' );
                } else {
                    $hero.addClass( 'c-hero__wrapper--bottom' );
                }
            break;

            default: return; // exit this handler for other keys
        }
        e.preventDefault(); // prevent the default action (scroll / move caret)
    }

    function bindArrowKeys( e ) {
        if ( keysBound ) return;
        switch( e.which ) {
            case 37:
            case 39:
                // positionHeroContent( e );
                // $document.off( 'keydown', bindArrowKeys );
                // keysBound = true;
                // $document.on( 'keydown', positionHeroContent );
            break;
            case 40:
                var currentScroll = $( window ).scrollTop(),
                    windowHeight = window.innerHeight;

                if ( $( 'body' ).hasClass( 'has-hero' ) && 0 === currentScroll ) {
                    TweenMax.to( window, .5, { scrollTo: windowHeight } );
                }
            break;
            default: return;
        }
    }

     $document.on( 'keydown', bindArrowKeys );

})();
// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;(function ( $, window, document, undefined ) {

    var $window = $( window ),
        windowHeight = window.innerHeight,
        latestKnownScrollY = $window.scrollTop(),
        $body = $( 'body' );

    $( window ).on( 'resize', function() {
        windowHeight = window.innerHeight;
    });

    $( window ).on( 'scroll', function() {
        latestKnownScrollY = $window.scrollTop();
    });

    function NoahSlideshow( element, options ) {
        var self = this;

        self.$gallery = $( element );
        self.$slider = $( '<div class="c-slider">' );
        self.$slides = $();
        self.$counter = null;
        self.$currentView = null;

        self.renderSlider_();
        self.bindEvents_();
        self.finishInit_();

    }

    NoahSlideshow.prototype = {
        constructor: NoahSlideshow,
        finishInit_: function() {
            var self = this;

            this.disable = false;
	        this.autoplay = false;

	        if ( this.$gallery.is( '.gallery-columns--1' ) ) {
		        this.$gallery.removeClass( 'gallery-columns--1' );
		        this.$gallery.addClass( 'gallery-columns-0' );
		        this.autoplay = true;
	        }

            if ( this.$gallery.is( '.gallery-columns-0' ) ) {
                this.$gallery.removeClass( 'gallery-columns-0' );
                this.$gallery.addClass( 'gallery-columns-3' );
                this.showSlider_( 0, true );
                this.resizeToFit_();
                this.$slides.first().imagesLoaded(function() {
                    self.$el.addClass( 'is-loaded' );
                });

	            setInterval(function() {
                    if ( self.autoplay === true ) {
		                self.onNextClick();
                    }
	            }, 5000);
            } else {
                this.showThumbs_( 0, true );
                this.$gallery.imagesLoaded(function() {
                    self.$el.addClass( 'is-loaded' );
                });
            }
        },
        renderSlider_: function() {
            this.renderSlides_();
            this.renderHeader_();
            this.renderControls_();

            this.$el = this.$gallery;
            this.$el = this.$el.wrap( '<div class="c-slideshow u-content-background">' ).parent();
            this.$slider.appendTo( this.$el );
        },
        bindEvents_: function() {
            var self = this,
	            isTouch = !! ( ( "ontouchstart" in window ) || window.DocumentTouch && document instanceof DocumentTouch ),
                resizeEvent = ( 'onorientationchange' in window && isTouch ) ? 'orientationchange' : 'resize';

            $(document).on( 'keydown', function(e) {
                self.onKeyDown(e);
            });

            $window.on( resizeEvent + ' noah:project-view-change', function() {

                if ( self.$currentView === null ) {
                    return;
                }

                // resize gallery
                if ( self.$currentView === self.$gallery ) {
                    self.$gallery.imagesLoaded(function() {
                        self.$gallery.masonry({ isAnimated: false });
	                    self.$el.height( self.$gallery.outerHeight() );
                    });
                // resize slider
                } else {
                    self.resizeToFit_();
                }
            });

            self.$gallery.find( '.gallery-item' ).on( 'click', 'a img', function( e ) {
                self.showSlider_( $( this ).closest( '.gallery-item' ).index() );
            });

            self.controls.close
                .click( function( e ) {
	                if ( ! self.disable ) {
                        self.showThumbs_( self.current );
	                }
                })
                .on( 'mouseenter', function() {
                    self.controls[ 'cursor' ].text( "" ).addClass( "c-controls__cursor--remove" );
                });

            self.controls.prev
                .click( function(e) {
                    self.onPrevClick(e);
                })
                .on('mouseenter', function(e) {
                    self.onPrevEnter(e);
                });

            self.controls.next
                .click( function(e) {
                    self.onNextClick(e);
                })
                .on( 'mouseenter', function(e) {
                    self.onNextEnter(e);
                });

            $( self.$controls )
                .mouseenter( function() {
                    self.controls[ 'cursor' ].show();
                })
                .mousemove( function( e ) {
                    self.controls[ 'cursor' ].css({
                        top: e.clientY,
                        left: e.clientX
                    });
                })
                .mouseleave( function( e ) {
                    self.controls[ 'cursor' ].hide();
                });

        },

        isInViewport: function() {
            var y1 = this.$el.offset().top,
                y2 = y1 + this.$el.outerHeight(),
                y3 = latestKnownScrollY,
                y4 = y3 + windowHeight,
                intersection;


            intersection = Math.max(y1,y3) <= Math.min(y2,y4);

            return intersection;
         },

        onKeyDown: function( e ) {

            if ( ! this.isInViewport() || this.$currentView !== this.$slider ) {
                return;
            }

	        switch ( e.which ) {

		        // left arrow
		        case 37:
			        this.onPrevClick( e );
			        break;

		        // right arrow
		        case 39:
			        this.onNextClick( e );
			        break;

		        // escape key
		        case 27:
		        	if ( this.disable ) {
				        return;
			        }
			        this.showThumbs_( this.current );
			        break;

		        default:
			        return;
	        }
        },

        onPrevClick: function( e ) {
	        if ( typeof e !== "undefined" ) {
		        e.preventDefault();
		        this.autoplay = false;
	        }

            var self = this;

            if ( this.disable || this.$currentView !== this.$slider ) {
                return;
            }
            self.disable = true;

            var $current = $( self.$slides[self.current] ),
                $prev = $current.loopPrev( '.c-slider__slide' );

            self.current = self.current == 0 ? self.$slides.length - 1 : self.current - 1;

            TweenMax.to( $current, .5, {
                x: 50,
                opacity: 0,
                ease: Power2.easeInOut
            });

            TweenMax.fromTo( $prev, .5, {
                x: -50,
                opacity: 0
            }, {
                x: 0,
                opacity: 1,
                delay: .3,
                ease: Power2.easeInOut,
                onComplete: function() {
                    self.disable = false;
                }
            });

            self.$counter.html( $prev.data( 'slide-number' ) );
        },

        onPrevEnter: function() {
            this.controls[ 'cursor' ].removeClass( "c-controls__cursor--remove" ).text( noah_js_strings.prev_slide );
        },

        onNextClick: function( e ) {
	        if ( typeof e !== "undefined" ) {
                e.preventDefault();
		        this.autoplay = false;
	        }

            var self = this;

            if ( this.disable || this.$currentView !== this.$slider) {
                return;
            }
            this.disable = true;

            var $current = $( this.$slides[this.current] ),
                $next = $current.loopNext( '.c-slider__slide' );

            this.current = this.current + 1 == this.$slides.length ? 0 : this.current + 1;

            TweenMax.fromTo($current, .5, {}, {
                x: -50,
                opacity: 0,
                ease: Power2.easeInOut
            });

            TweenMax.fromTo($next, .5, {
                x: 50,
                opacity: 0
            }, {
                x: 0,
                opacity: 1,
                delay: .3,
                ease: Power2.easeInOut,
                onComplete: function() {
                    self.disable = false;
                }
            });

            this.$counter.html( $next.data( 'slide-number' ) );
        },

        onNextEnter: function() {
            this.controls[ 'cursor' ].removeClass( "c-controls__cursor--remove" ).text( noah_js_strings.next_slide );
        },

        renderSlides_: function() {
            var self = this;

            this.$gallery.children().each( function( i, obj ) {
                var src = $( obj ).find( 'img' ).data( 'orig-file' ),
                    $img = $( '<img class="c-slider__image" src="' + src + '">'),
                    $slide = $( '<div class="c-slider__slide" data-slide-number="' + ( i + 1 ) + '">' );

                $img.appendTo( $slide );
                $slide.appendTo( self.$slider );
                self.$slides = self.$slides.add( $slide );
            });
        },
        renderHeader_: function() {
            var $header, $counter, $pageHeader, $meta;

            // create the header element
            $header = $( '<div class="c-slider__header">' );

            // if we're in the media-only view add the page header inside the slider
            $pageHeader = $( '.c-page-header' );

            if ( $( 'body.has-media-only' ).length ) {
                $pageHeader = $pageHeader.clone();
                $header.append( $pageHeader );

                // delete the empty content wrapper
                // $( '.c-project__content' ).remove();
            }

            if ( $( 'body[class*="has-media"]' ).length ) {
                var $shareContainer = $('<div class="c-page-header__side">'),
                    $shareLink = $pageHeader.find( '.c-meta__share-link' ).first().removeClass( 'h7' ).addClass( 'h5' ).addClass( 'c-meta__share-link--desktop' );

                $shareLink.prependTo( $shareContainer );
                $shareContainer.prependTo( $header );
            }

            $meta = $pageHeader.find( '.c-page-header__meta' );

            // if there is no meta information remove the unneeded element
            if ( $.trim( $meta.html() ) == '' ) {
                $meta.remove();
            }

            // create the slider counter
            $counter = $( '<div class="c-page-header__side  c-counter h5">' );
            this.$counter = $( '<span class="c-counter__current js-current-slide">1</span>' );
            $counter.append( this.$counter );
            $counter.append( '<span class="c-counter__total">' + this.$slides.length + '</span>' );

            // add the counter to the slider header
            $header.append( $counter );

            // append the header we created to the slider
            this.$slider.append( $header );
        },
        morph: function( $source, $target, cb ) {
            var $clone = $source.clone().addClass( 'u-no-transition' ),
                $cloneWrap = $clone.wrap( '<div class="c-clone">' ).parent(),
                self = this,
                newScroll = latestKnownScrollY,
                source, target;

            cb = typeof cb !== "undefined" ? cb : noop;

            source = {
                width: $source.outerWidth(),
                height: $source.outerHeight(),
                offset: $source.offset()
            };

            TweenMax.to( $cloneWrap, 0, {y: 0} );

            $cloneWrap.css({
                position: 'fixed',
                top: source.offset.top - latestKnownScrollY,
                left: source.offset.left,
                width: source.width,
                height: source.height
            }).appendTo( 'body' );

            $window.one( 'noah:project-view-change', function() {
                var $adminBar = $( '#wpadminbar' ),
                    adminBarheight = ($adminBar.length && self.$currentView === self.$slider) ? $adminBar.outerHeight() : 0;

                target = {
                    width: $target.outerWidth(),
                    height: $target.outerHeight(),
                    offset: $target.offset()
                };

                if ( $target.closest( '.gallery-item' ).length ) {
                    newScroll = self.getThumbnailScrollPosition( self.current );
                } else {
                    var $header = below( 'lap' ) ? $( '.c-navbar__middle' ) : $( '.c-navbar__content' );
                    newScroll = self.$slider.offset().top - $header.outerHeight();
                }

                TweenMax.to( window, .8, {
                    scrollTo: newScroll - adminBarheight,
                    ease: Power2.easeInOut
                });

                var scale = target.width / source.width;

                TweenMax.to( $cloneWrap, .8, {
                    x: target.offset.left - source.offset.left,
                    y: latestKnownScrollY - newScroll + target.offset.top - source.offset.top + adminBarheight,
                    force3D: true,
                    ease: Power2.easeInOut,
                    onComplete: function() {
                        cb();
                        $cloneWrap.remove();
                    }
                });

                TweenMax.to( $clone, .8, {
                    scale: scale,
                    force3D: true,
                    ease: Power2.easeInOut
                });
            });
        },
        showThumbs_: function( idx, instant ) {
            var self = this;

            idx = typeof idx !== "undefined" ? idx : 0;
            instant = typeof instant !== "undefined" ? instant : false;

	        self.autoplay = false;
	        self.$slider.addClass( 'is-hidden' );
	        self.$gallery.removeClass( 'is-hidden' );

            if ( ! instant ) {
                var $source = self.$slides.eq( idx ).find( 'img' ),
                    $target = self.$gallery.children().eq( idx ).find( 'img' );

	            $( '.js-share-clone' ).addClass( 'is-visible' );

                self.morph($source, $target, function () {
                    self.$gallery.children().eq(idx).css({
                        opacity: '',
                        pointerEvents: 'auto'
                    });
                    self.$slider.hide();
                });

                // staggering fade in for the thumbnails
	            self.$gallery.children().css({
                    opacity: 0,
                    pointerEvents: 'none'
                }).not(':eq(' + idx + ')').each(function (i, obj) {
                    var delay = Math.floor(( Math.random() * 3 ) + 3) / 10,
                        random = Math.floor(Math.random() * 10) / 100 - 0.05;

                    // set timeout with the desired delay
                    setTimeout(function() {
                        // make sure image is loaded before fading in
                        $(obj).imagesLoaded(function() {
                            // fade in
                            TweenMax.to(obj, .5, {
                                opacity: 1,
                                pointerEvents: 'auto',
                                ease: Power2.easeInOut
                            });
                        });
                    }, (delay + random) * 1000);

                });

                self.$slides.css('opacity', 0);

                var $fadeOut = self.$slider.find('.c-slider__header, .c-slider__counter');

	            TweenMax.to( self.$el, .8, {
		            height: self.$gallery.outerHeight(),
		            ease: Power2.easeInOut
	            });

                TweenMax.fromTo($fadeOut, .3, {
                    opacity: 1
                }, {
                    opacity: 0,
                    ease: Power2.easeInOut
                });
            } else {
                self.$gallery.children().css( 'opacity', '' );
                self.$slider.hide();
            }

            self.$currentView = self.$gallery;

            $window.trigger( 'noah:project-view-change' );
        },
        showSlider_: function( idx, instant ) {
            var self = this;

            idx = typeof idx !== "undefined" ? idx : 0;
            instant = typeof instant !== "undefined" ? instant : false;
            self.current = idx;

	        self.$gallery.addClass( 'is-hidden' );
	        self.$slider.removeClass( 'is-hidden' );

            if ( ! instant ) {
                var $source = self.$gallery.children().eq( idx ).find( 'img' ),
                    $target = self.$slides.eq( idx ).find( 'img' ),
                    timeline = new TimelineMax({ paused: true }),
                    $adminBar = $( '#wpadminbar' ),
                    adminBarheight = $adminBar.length ? $adminBar.outerHeight() : 0;

                TweenMax.to( self.$slides.eq( idx ), 0, {x: 0} );

	            $( '.js-share-clone' ).removeClass( 'is-visible' );

	            self.morph( $source, $target, function() {
                    self.$slides.eq( idx ).css( 'opacity', 1 );

                    if ( $body.is( '.has-media-only' ) ) {
                        $( '.c-project__content' ).hide();
                        TweenMax.to( window, 0, {scrollTo: self.$slider.offset().top - $( '.c-navbar' ).outerHeight() - adminBarheight } );
                    }
                });

                if ( $body.is( '.has-media-only' ) ) {
                    TweenMax.to( '.c-project__content', .3, { opacity: 0 } );
                }

                self.$gallery.children().eq( idx ).css( 'opacity', 0 );
                self.$gallery.children().not( ':eq(' + idx + ')').each( function( i, obj ) {
                    TweenMax.fromTo( obj, .6, {
                        opacity: 1
                    }, {
                        opacity: 0,
                        ease: Power2.easeInOut
                    });
                });

                var $fadeIn = self.$slider.find( '.c-slider__header, .c-slider__counter' );

                TweenMax.fromTo( $fadeIn, .3, {
                    opacity: 0
                }, {
                    opacity: 1,
                    delay: .6,
                    ease: Power2.easeInOut
                });

	            TweenMax.to( self.$el, .8, {
		            height: self.$slider.outerHeight(),
		            ease: Power2.easeInOut
	            });

                self.$slider.show();
                self.$slides.css( 'opacity', 0 );
            } else {
                self.$gallery.children().css( 'opacity', 0 );
                self.$slides.css( 'opacity', 0 ).eq( idx ).css( 'opacity', 1 );
	            self.$el.height ( self.$slider.outerHeight() );
                if ( $body.is( '.has-media-only' ) ) {
                    $( '.c-project__content' ).hide();
                }
            }

            self.$counter.html( idx + 1 );
            self.$currentView = self.$slider;

            $window.trigger( 'noah:project-view-change' );

        },
        getThumbnailScrollPosition: function( idx ) {
            var $target = this.$gallery.children().eq( idx ),
                targetCenter,
                maxTarget;

            if ( ! $target.length ) {
                return latestKnownScrollY;
            }

            maxTarget = this.$gallery.offset().top + this.$gallery.outerHeight();
            targetCenter = $target.offset().top + $target.height() / 2 - windowHeight / 2;
            targetCenter = targetCenter > maxTarget ? maxTarget : targetCenter;
            targetCenter = targetCenter > 0 ? targetCenter : 0;
            return targetCenter;
        },
        renderControls_: function() {
            var self = this;

            if ( self.$controls ) {
                return;
            }

            self.controls = {};

            var $controls = $( '<div class="c-controls h4">' ),
                controls = [ 'prev', 'close', 'next' ];

            for ( var i = 0; i < controls.length; i++ ) {
                var controlName = controls[ i ],
                    $div = $( '<div class="c-controls__area c-controls__area--' + controlName + '">' );

                $controls.append( $div );
                self.controls[ controlName ] = $div;
            }

            var $cursor = $( '<div class="c-controls__cursor">' );
            $controls.append( $cursor );
            self.controls[ 'cursor' ] = $cursor;

            self.$controls = $controls;
            self.$controls.appendTo( self.$slider );
        },
        resizeToFit_: function() {
            var headerHeight = $( '.c-navbar' ).outerHeight() || $( '.c-navbar__middle' ).outerHeight(),
                $contentPaddingTop = $( '.u-content_container_padding_top' ),
                contentPaddingTop = $contentPaddingTop.length ? parseInt( $contentPaddingTop.css( 'paddingTop' ), 10 ) : 0,
                $adminBar = $( '#wpadminbar' ),
                adminBarheight = $adminBar.length ? $adminBar.outerHeight() : 0;

            // ensure proper fit for sliders in viewport
            if ( $( 'body.has-media-only' ).length ) {
                this.$slider.css( 'height', windowHeight - 2 * headerHeight - adminBarheight - contentPaddingTop );
            }
        }
    };


    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn.noahSlideshow = function ( options ) {
        return this.each( function () {

            if ( typeof options === 'string' ) {

                var self = $.data( this, "plugin_" + NoahSlideshow );

                if ( ! $.data( this, "plugin_" + NoahSlideshow ) ) {
                    return;
                }

                switch ( options ) {
                    case 'destroy':
                        self.showThumbs_( 0, true );
                        self.$gallery.find( '.gallery-item' ).off( 'click a img' );
                        self.$slider.remove();
                        self.$gallery.unwrap();
                        $.removeData( this, "plugin_" + NoahSlideshow );
                        break;
                    default:
                        break;
                }

                return;
            }

            if ( ! $.data( this, "plugin_" + NoahSlideshow ) ) {
                $.data( this, "plugin_" + NoahSlideshow, new NoahSlideshow( this, options ) );
            }
        });
    }

})( jQuery, window, document );

var Navbar = function () {

    var _this = this;

    _this.initialized = false;

    _this.bindEvents = function() {
        _this.$handle.on( 'change', function(e) {
            _this.onChange();
        });
    };

    _this.unbindEvents = function() {
        _this.$handle.off( 'change' );
    };

	_this.open = function() {
	    _this.$handle.prop( 'checked', true );
	    _this.$handle.trigger( 'change' );
	};

	_this.close = function() {
	    _this.$handle.prop( 'checked', false );
	    _this.$handle.trigger( 'change' );
	};

	_this.init();
};

Navbar.prototype.onChange = function() {
	var $body = $( 'body' );
	$body.attr( 'style', '' );

	if ( this.$handle.prop( 'checked' ) ) {
		$body.width( $body.width() );
		$body.css( 'overflow', 'hidden' );
	} else {
		$body.attr( 'style', '' );
	}
};

Navbar.prototype.init = function() {
    this.$handle = $( '#menu-toggle' );
    this.heroHeight = $('.c-hero').first().outerHeight();

    if ( this.initialized ) {
        this.headerHeight = this.$clone.outerHeight();
        return;
    }

    $( '.js-share-clone' ).remove();

    this.$navbar = $( '.c-navbar' );
	this.$logo = $( '.c-branding' ).closest( '.c-navbar__zone' ).addClass( 'c-navbar__zone--branding' );
    this.$share = $( '.c-meta__share-link:not(.c-meta__share-link--desktop)' );
	this.$clone = this.$logo.clone().css( 'overflow', 'hidden' ).addClass( 'mobile-logo-clone' );
	this.$clone.find( 'img' ).addClass( 'is-loaded' );
	this.$logo = $( '.c-branding' ).closest( '.c-navbar__zone' ).addClass( 'c-navbar__zone--branding' );

	if ( ! $( '.c-navbar__zone' ).filter( function() {
		var $obj = $( this );
		return ! $obj.is( '.c-navbar__zone--branding' ) && !! $obj.children().length;
	} ).length ) {
		$( '.c-navbar__label' ).hide();
	}

	if ( below( 'pad' ) || (
            below( 'lap' ) && Util.isTouch && window.innerWidth > window.innerHeight
        ) && this.$share.length ) {
        this.$target = this.$clone.wrapInner( "<div class='c-navbar__slide'></div>" ).children();
        this.$share.clone().addClass( 'js-share-clone' ).appendTo( this.$target );
    }

    this.$clone.appendTo( this.$navbar );

    this.headerHeight = this.$clone.outerHeight();

    this.unbindEvents();
    this.bindEvents();

    this.initialized = true;
};

Navbar.prototype.update = function( scrollY ) {

    if ( ! this.initialized || typeof this.$target === "undefined" || scrollY < 0
         || ! $( 'body' ).hasClass( 'single-jetpack-portfolio' )
         || this.$share.length == 0 ) {
        return;
    }

    if ( scrollY < this.heroHeight ) {
        this.$target.css( 'transform', 'translate3d(0,0,0)' );
        return;
    }

    if ( scrollY < this.heroHeight + this.headerHeight ) {
        this.$target.css( 'transform', 'translate3d(0,' + ( this.heroHeight - scrollY ) + 'px,0)' );
        return;
    }

    this.$target.css( 'transform', 'translate3d(0,' + -this.headerHeight + 'px,0)' );
};

Navbar.prototype.destroy = function() {
    if ( ! this.initialized ) {
        return;
    }

    if ( typeof this.$clone !== "undefined" ) {
        this.$clone.remove();
    }

    this.unbindEvents();
    this.initialized = false;
};

var Navigation = ( function () {

    var $targets = $( '.c-navbar' ).find( ".menu-item-has-children > a, .page_item_has_children > a" ),
        toggleClass = 'is-toggled';

    $targets.parent().addClass( toggleClass )

    $targets.on( 'click', function(e) {

        var $parent = $(this).parent();

        if ( $parent.hasClass( toggleClass ) ) {
            $parent.removeClass( toggleClass );
            stopEvent(e);
            return false;
        }

    });

    return {
    };

})();

var Overlay = (
	function() {
		var $overlay,
			$content,
			$close;

		init();

		function init() {

			$close = $( '<div class="c-overlay__close"></div>' );

			$overlay = $( '<div/>', {
				class: 'c-overlay u-container-sides-spacings js-header-height-padding-top'
			} );

			$content = $( '<div/>', {
				class: 'c-overlay__content u-content-width u-content-bottom-spacing entry-content content-area'
			} );

			$content.appendTo( $overlay );
			$overlay.appendTo( 'body' );
			$close.appendTo( 'body' );

			bindEvents();
		}

		function bindEvents() {

			$close.on( 'click', function() {
				hide();
			} );

			$content.on( 'click', function( e ) {
				e.stopPropagation();
			} );

			$overlay.on( 'click', function( e ) {
				hide();
			} );

			$( document ).on( 'keydown', function( evt ) {
				evt = evt || window.event;
				var isEscape = false;
				if ( "key" in evt ) {
					isEscape = (
					evt.key == "Escape" || evt.key == "Esc"
					);
				} else {
					isEscape = (
					evt.keyCode == 27
					);
				}
				if ( isEscape ) {
					hide();
				}
			} );
		}

		function setContent( html ) {
			$content.empty().html( html );
			$content.addClass( 'is-visible' );
		}

		function show() {
			$( 'body' ).addClass( 'has-overlay' ).css( 'overflow', 'hidden' );

			$overlay.addClass( 'is-visible' );
		}

		function hide() {
			$( 'body' ).removeClass( 'has-overlay' ).css( 'overflow', '' );

			$overlay.removeClass( 'is-visible' );
			$content.removeClass( 'is-visible' );
		}

		function load( url ) {

			Overlay.show();

			$.get( {
				url: url,
				success: function( result ) {
					var $content, title, content;

					$content = $( result ).find( '#main' );

					if ( typeof $content === "undefined" || ! $content.length ) {
						Overlay.hide();
						return;
					}

					title = $content.find( '.c-page-header__title' ).text();
					content = $content.find( '.entry-content' ).first().html();

					if ( title.length ) {
						content = '<div class="c-page-header__title h1 u-align-center">' + title + '</div>' + content;
					}

					if ( content.length ) {
						Overlay.setContent( content );
					} else {
						Overlay.hide();
					}
				}
			} );
		}

		return {
			show: show,
			hide: hide,
			load: load,
			setContent: setContent
		};

	}
)();

var Parallax = function( selector, options ) {
	this.disabled = false;
	this.selector = selector;
	this.options = options;
};

Parallax.prototype.init = function( $container ) {
	$container = $container || $( 'body' );

	if ( this.disabled === false ) {
		$container.find( this.selector ).rellax( this.options );
		$( window ).trigger( 'rellax' );
	}
};

Parallax.prototype.disable = function() {
	this.disabled = true;
	$( this.selector ).rellax( "destroy" );
};

Parallax.prototype.destroy = function() {
	$( this.selector ).rellax( "destroy" );
};

Parallax.prototype.enable = function() {
	this.disabled = false;
	$( this.selector ).rellax( this.options );
};

/*!
 * pixelgradeTheme v1.0.2
 * Copyright (c) 2017 PixelGrade http://www.pixelgrade.com
 * Licensed under MIT http://www.opensource.org/licenses/mit-license.php/
 */
var pixelgradeTheme = function() {

	var _this = this,
		lastScrollY = (window.pageYOffset || document.documentElement.scrollTop)  - (document.documentElement.clientTop || 0),
		windowWidth = window.innerWidth,
		windowHeight = window.innerHeight,
		orientation = windowWidth > windowHeight ? 'landscape' : 'portrait';

	_this.ev = $( {} );
	_this.frameRendered = false;
	_this.debug = false;

	_this.update = function() {

	};

	_this.onScroll = function() {
		if ( _this.frameRendered === false ) {
			return;
		}
		lastScrollY = (window.pageYOffset || document.documentElement.scrollTop)  - (document.documentElement.clientTop || 0);
		_this.frameRendered = false;
	};

	_this.getScroll = function() {
		return lastScrollY;
	};

	_this.getWindowWidth = function() {
		return windowWidth;
	};

	_this.getWindowHeight = function() {
		return windowHeight;
	};

	_this.getOrientation = function() {
		return orientation;
	};

	_this.onResize = function() {
		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;

		var newOrientation = windowWidth > windowHeight ? 'landscape' : 'portrait';

		_this.debouncedResize();

		if ( orientation !== newOrientation ) {
			_this.debouncedOrientationChange();
		}

		orientation = newOrientation;
	};

	_this.debouncedResize = Util.debounce(function() {
		$( window ).trigger( 'pxg:resize' );
	}, 300);

	_this.debouncedOrientationChange = Util.debounce(function() {
		$( window ).trigger( 'pxg:orientationchange' );
	}, 300);

	_this.renderLoop = function() {
		if ( _this.frameRendered === false ) {
			_this.ev.trigger( 'render' );
		}
		requestAnimationFrame( function() {
			_this.update();
			_this.renderLoop();
			_this.frameRendered = true;
			_this.ev.trigger( 'afterRender' );
		} );
	};

	_this.eventHandlers = function() {
		$( document ).ready( _this.onReady );
		$( window )
		.on( 'scroll', _this.onScroll )
		.on( 'resize', _this.onResize )
		.on( 'load', _this.onLoad );
	};

	_this.eventHandlers();
	_this.renderLoop();
};


pixelgradeTheme.prototype.onReady = function() {
	$( 'html' ).addClass( 'is-ready' );
};

pixelgradeTheme.prototype.onLoad = function() {
	$( 'html' ).addClass( 'is-loaded' );
};

pixelgradeTheme.prototype.log = function( message ) {
	if ( this.debug === true ) {
		console.log( message )
	}
};

var Slider = (function () {

    var options = {
        dots: true,
        infinite: true,
        speed: 600,
        fade: true,
        useTransform: false,
        ease: 'easeInOutCirc'
    };

    return {
        init: function( selector ) {
            $( selector ).each(function() {
                var $this = $(this),
                    autoplay = typeof $this.data( 'autoplay' ) !== "undefined",
                    autoplaySpeed = typeof $this.data( 'autoplay-delay' ) == "number" ? $this.data( 'autoplay-delay' ) : 2000;

                if ( autoplay ) {
                    $.extend(options, {
                        autoplay: autoplay,
                        autoplaySpeed: autoplaySpeed
                    })
                }

                $this.slick( options );

	            if ( ! autoplay ) {
                    $this.find( '.slick-slide' ).first().focus();
	            }
            });
        }
    }

})();
var Util = {
    isTouch: !! ( ( "ontouchstart" in window ) || window.DocumentTouch && document instanceof DocumentTouch ),
	// Returns a function, that, as long as it continues to be invoked, will not
	// be triggered. The function will be called after it stops being called for
	// N milliseconds. If `immediate` is passed, trigger the function on the
	// leading edge, instead of the trailing.
	debounce: function( func, wait, immediate ) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if ( ! immediate ) {
					func.apply( context, args );
				}
			};
			var callNow = immediate && ! timeout;
			clearTimeout( timeout );
			timeout = setTimeout( later, wait );
			if ( callNow ) {
				func.apply( context, args );
			}
		};
	},

	// Returns a function, that, when invoked, will only be triggered at most once
	// during a given window of time. Normally, the throttled function will run
	// as much as it can, without ever going more than once per `wait` duration;
	// but if you'd like to disable the execution on the leading edge, pass
	// `{leading: false}`. To disable execution on the trailing edge, ditto.
	throttle: function( callback, limit ) {
		var wait = false;
		return function() {
			if ( ! wait ) {
				callback.call();
				wait = true;
				setTimeout( function() {
					wait = false;
				}, limit );
			}
		}
	},

	reload_js: function( filename ) {
		var $old = $( 'script[src*="' + filename + '"]' );

		$old.each(function(i, obj) {
			var $old = $(obj),
				$new = $( '<script>' ),
				src = $old.attr( 'src' );

			$old.replaceWith( $new );
			$new.attr( 'src', src );
		});

	}
};

var noop = function() {};

// search every image that is alone in a p tag
// and wrap it in a figure element to behave like images with captions
function unwrapImages( $container ) {

    $container = typeof $container !== "undefined" ? $container : $( 'body' );

    $container.find( 'p > img:first-child:last-child' ).each(function(i, obj) {
        var $image = $(obj),
            className = $image.attr( 'class' ),
            $p = $image.parent();

        if ( $.trim( $p.text() ).length ) {
            return;
        }

        $image
            .removeAttr( 'class' )
            .unwrap()
            .wrap( '<figure />' )
            .parent()
            .attr( 'class', className );
    });

}

function wrapEmbeds( $container ) {

    $container = typeof $container !== "undefined" ? $container : $( 'body' );

    $container.children( 'iframe, embed, object' ).wrap( '<p>' );

}

// wrap comment actions in the same container
// and append it to the comment body
function wrapCommentActions( $container ) {

    $container = typeof $container !== "undefined" ? $container : $( 'body' );

    $container.find( '.comment' ).each( function(i, obj) {
        var $comment = $(obj),
            $body = $comment.children( '.comment-body' ),
            $reply = $body.find( '.reply' ),
            $edit = $body.find( '.comment-edit-link' ),
            $meta = $( '<div class="comment-links">' );

        $reply.add($edit).appendTo($meta);
        $meta.appendTo($body);
    });
}

function handleVideos( $container ) {
    $container = typeof $container !== "undefined" ? $container : $( 'body' );

    $container.find( '.video-placeholder' ).each( function( i, obj ) {
        var $placeholder = $( obj ),
            video = document.createElement( 'video' ),
            $video = $( video ).addClass( 'c-hero__video' );

        // play as soon as possible
        video.onloadedmetadata = function() {
            video.play();
        };

        video.src       = $placeholder.data( 'src' );
        video.poster    = $placeholder.data( 'poster' );
        video.muted     = true;
        video.loop      = true;

        $placeholder.replaceWith( $video );

        // if ( Modernizr.touchevents ) {

        //     // if autoplay is not allowed play on user gesture
        //     $placeholder.closest('.hero').on( 'touchstart', function() {
        //         video.play();
        //     });

        //     if ( isiPhone ) {
        //         makeVideoPlayableInline( video, /* hasAudio */ false);
        //     }
        // }

    });
}

function handleCustomCSS( $container ) {
    var $elements = typeof $container !== "undefined" ? $container.find( "[data-css]" ) : $( "[data-css]" );

    if ( $elements.length ) {

        $elements.each(function(i, obj) {

            var $element = $( obj ),
                css = $element.data( 'css' );

            if ( typeof css !== "undefined" ) {
                $element.replaceWith( '<style type="text/css">' + css + '</style>' );
            }

        });
    }
}

$.fn.loopNext = function( selector ) {
    selector = selector || '';
    return this.next( selector ).length ? this.next( selector ) : this.siblings( selector ).addBack( selector ).first();
};

$.fn.loopPrev = function( selector ) {
    selector = selector || '';
    return this.prev( selector ).length ? this.prev( selector ) : this.siblings( selector ).addBack( selector ).last();
};

function mq( direction, string ) {
    var $temp = $( '<div class="u-mq-' + direction + '-' + string + '">' ).appendTo( 'body' ),
        response = $temp.is( ':visible' );

    $temp.remove();
    return response;
}

function below( string ) {
    return mq( 'below', string );
}

function above( string ) {
    return mq( 'above', string );
}

function debounce( func, wait, immediate ) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if ( ! immediate ) {
                func.apply( context, args );
            }
        };
        var callNow = immediate && ! timeout;
        clearTimeout( timeout );
        timeout = setTimeout( later, wait );
        if ( callNow ) {
            func.apply( context, args );
        }
    };
};

function stopEvent( e ) {
    if ( typeof e == "undefined" ) return;
    e.stopPropagation();
    e.preventDefault();
}

// smooth scrolling to anchors on the same page
$( 'a[href*="#"]:not([href="#"])' ).on( 'click touchstart', function() {
    if ( location.pathname.replace( /^\//,'' ) == this.pathname.replace( /^\//,'' ) && location.hostname == this.hostname ) {
        var target = $( this.hash );
        target = target.length ? target : $( '[name=' + this.hash.slice(1) + ']' );
        if ( target.length ) {
            TweenMax.to( window, 1, {scrollTo: target.offset().top} );
            return false;
        }
    }
});

// debouncing function from John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
//
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce( func, threshold, execAsap ) {
    var timeout;

    return function debounced () {
        var obj = this, args = arguments;
        function delayed () {
            if (!execAsap)
                func.apply(obj, args);
            timeout = null;
        };

        if ( timeout )
            clearTimeout( timeout );
        else if ( execAsap )
            func.apply( obj, args );

        timeout = setTimeout( delayed, threshold || 100 );
    };
};

// use the debounce function to create a smartresize event
$.fn[ 'smartresize' ] = function( fn ) {
    return fn ? this.bind( 'resize', debounce( fn, 200 ) ) : this.trigger( 'smartresize' );
};

// here we change the link of the Edit button in the Admin Bar
// to make sure it reflects the current page
function adminBarEditFix( id, editString, taxonomy ) {
    // get the admin ajax url and clean it
    var baseEditURL = noah_js_strings.ajaxurl.replace( 'admin-ajax.php','post.php' ),
        baseEditTaxURL = noah_js_strings.ajaxurl.replace( 'admin-ajax.php','edit-tags.php' ),
        $editButton = $( '#wp-admin-bar-edit a' );

    if ( ! empty( $editButton ) ) {
        if ( id !== undefined && editString !== undefined ) { //modify the current Edit button
            if ( !empty( taxonomy ) ) { //it seems we need to edit a taxonomy
                $editButton.attr( 'href', baseEditTaxURL + '?tag_ID=' + id + '&taxonomy=' + taxonomy + '&action=edit' );
            } else {
                $editButton.attr( 'href', baseEditURL + '?post=' + id + '&action=edit' );
            }
            $editButton.html( editString );
        } else { // we have found an edit button but right now we don't need it anymore since we have no id
            $( '#wp-admin-bar-edit' ).remove();
        }
    } else { // upss ... no edit button
        // lets see if we need one
        if ( id !== undefined && editString !== undefined ) { //we do need one after all
            //locate the New button because we need to add stuff after it
            var $newButton = $( '#wp-admin-bar-new-content' );

            if ( !empty( $newButton ) ) {
                if ( !empty( taxonomy ) ) { //it seems we need to generate a taxonomy edit thingy
                    $newButton.after( '<li id="wp-admin-bar-edit"><a class="ab-item dJAX_internal" href="' + baseEditTaxURL + '?tag_ID=' + id + '&taxonomy=' + taxonomy + '&action=edit">' + editString + '</a></li>' );
                } else { //just a regular edit
                    $newButton.after( '<li id="wp-admin-bar-edit"><a class="ab-item dJAX_internal" href="' + baseEditURL + '?post=' + id + '&action=edit">' + editString + '</a></li>' );
                }
            }
        }
    }

    //Also we need to fix the (no-)customize-support class on body by running the WordPress inline script again
    // The original code is generated by the wp_customize_support_script() function in wp-includes/theme.php @3007
    var request, b = document.body, c = 'className', cs = 'customize-support', rcs = new RegExp('(^|\\s+)(no-)?'+cs+'(\\s+|$)');

    // No CORS request
    request = true;

    b[c] = b[c].replace( rcs, ' ' );
    // The customizer requires postMessage and CORS (if the site is cross domain)
    b[c] += ( window.postMessage && request ? ' ' : ' no-' ) + cs;

    //Plus, we need to change the url of the Customize button to the current url
    var $customizeButton = $( '#wp-admin-bar-customize a' ),
        baseCustomizeURL = noah_js_strings.ajaxurl.replace( 'admin-ajax.php','customize.php' );
    if ( ! empty( $customizeButton ) ) {
        $customizeButton.attr( 'href', baseCustomizeURL + '?url=' + encodeURIComponent( window.location.href ) );
    }

}

//similar to PHP's empty function
function empty( data ) {
    if ( typeof( data ) == 'number' || typeof( data ) == 'boolean' ) {
        return false;
    }

    if ( typeof( data ) == 'undefined' || data === null ) {
        return true;
    }

    if ( typeof( data.length ) != 'undefined' ) {
        return data.length === 0;
    }

    var count = 0;

    for ( var i in data ) {
        // if (data.hasOwnProperty(i))
        //
        // This doesn't work in ie8/ie9 due the fact that hasOwnProperty works only on native objects.
        // http://stackoverflow.com/questions/8157700/object-has-no-hasownproperty-method-i-e-its-undefined-ie8
        //
        // for hosts objects we do this
        if ( Object.prototype.hasOwnProperty.call( data, i ) ) {
            count ++;
        }
    }
    return count === 0;
}

// let the magic begin!
var Noah = new pixelgradeTheme(),
	resizeEvent = "ontouchstart" in window && "onorientationchange" in window ? "pxg:orientationchange" : "pxg:resize";

//Noah.debug = true;

Noah.init = function() {

	Noah.Parallax = new Parallax( '.c-hero__background, .c-hero__background-mask', {
		bleed: 20,
		scale: 1.2,
		container: '.c-hero__background-mask'
	} );

	Noah.Parallax.disabled = "ontouchstart" in window && "onorientationchange" in window;

	Noah.Hero = new Hero();
	Noah.Navbar = new Navbar();

	// expose pixelgradeTheme API
	$.Noah = Noah;
};

Noah.update = function() {
	Noah.Hero.update( Noah.getScroll() );
	Noah.Navbar.update( Noah.getScroll() );

	if ( typeof Noah.Gallery !== "undefined" ) {
		Noah.Gallery.update( Noah.getScroll() + Noah.getWindowHeight() * 3 / 4 );
	}
};

Noah.adjustLayout = function() {
	Noah.log( "Noah.adjustLayout" );

	Noah.Navbar.destroy();

	if ( below( 'lap' ) ) {
		Noah.Navbar.init();
		Noah.Navbar.onChange();
	}

	$( '.c-hero' ).each( function( i, obj ) {
		var $hero = $( obj ),
			heroHeight = $hero.css( 'minHeight', '' ).css( 'height' );

		$hero.css( 'minHeight', heroHeight );
	} );

	// initialize or destroy slideshows
	if ( below( 'pad' ) || ( below( 'lap' ) && Util.isTouch && Noah.getOrientation() === 'landscape' ) ) {
		$( '.gallery' ).noahSlideshow( 'destroy' );
	} else {
		$( '.gallery' ).noahSlideshow();
	}

	Noah.Gallery = new Gallery();

	// use header height as spacing measure for specific elements
	var $updatable = $( '.js-header-height-padding-top, .c-navbar__content' ),
		headerHeight = $( '.c-navbar' ).outerHeight() || $( '.c-navbar__middle' ).outerHeight();

	// set padding top to certain elements which is equal to the header height
	$updatable.css( 'paddingTop', '' );
	$updatable.css( 'paddingTop', headerHeight );

	Noah.Hero.refresh();

	$( window ).trigger( 'rellax' );
};

Noah.handleContent = function( $container ) {
	Noah.log( "Noah.handleContent" );

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	unwrapImages( $container.find( '.entry-content' ) );
	wrapEmbeds( $container.find( '.entry-content' ) );
	wrapCommentActions( $container );
	handleVideos( $container );
	handleCustomCSS( $container );

	// add every image on the page the .is-loaded class
	// after the image has actually loaded
	$container.find( '.c-card, img' ).each( function( i, obj ) {
		var $each = $( obj );
		$each.imagesLoaded( function() {
			$each.addClass( 'is-loaded' );
		} );
	} );

	$container.find( '.gallery' ).each( function( i, obj ) {
		var $each = $( obj );
		$each.wrap( '<div class="u-full-width u-container-sides-spacings">' );
		$each.wrap( '<div class="o-wrapper u-container-width">' );
	} );

	$container.find( '.js-taxonomy-dropdown' ).resizeselect();

	Slider.init( $container.find( '.c-hero__slider' ) );

	Noah.Parallax.init( $container );
	Noah.Gallery = new Gallery( $container );

	Noah.eventHandlers( $container );

	if ( $( 'body' ).is( '.single-jetpack-portfolio' ) ) {
		var $share,
			$target = $container.find( '.js-share-target' );

		$container.find( '.js-share-clone' ).remove();
		$container.find( '.c-meta__share-link' ).clone().addClass( 'js-share-clone h4' ).appendTo( $target );
	}

	if ( $( '.sharedaddy' ).length == 0 ) {
		$( '.c-meta__share-link' ).remove();
	}
};

Noah.eventHandlersOnce = function() {
	Noah.log( "Noah.eventHandlersOnce" );

	var $body = $( 'body' );

	$( window ).on( resizeEvent, Noah.adjustLayout );
	$( window ).on( 'beforeunload', Noah.fadeOut );

	Noah.ev.on( 'render', Noah.update );

	$body.on( 'click', '.c-meta__share-link', function( e ) {
		e.preventDefault();

		var shareContent = $( '.sharedaddy' );

		if ( shareContent.length ) {
			Overlay.setContent( shareContent );
			shareContent.show();
			Overlay.show();
		}
	} );

	$body.on( 'click', '.menu-item.overlay a', function( e ) {
		var url = $( this ).attr( 'href' );

		if ( window.location.protocol !== this.protocol || window.location.hostname !== this.hostname ) {
			return;
		}

		stopEvent( e );

		Overlay.load( url );
	} );

	$body.on( 'click', '.gallery-item a img', function( e ) {
		stopEvent( e );
	} );
};

Noah.eventHandlers = function( $container ) {
	Noah.log( 'Noah.eventHandlers', $container );

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	$container.find( '.js-taxonomy-dropdown' ).on( 'change', function() {
		var destination = $( this ).val();
		if ( typeof destination !== "undefined" && destination !== "#" ) {
			if ( typeof Noah.Ajax !== "undefined" && typeof Barba !== "undefined" && Barba.hasOwnProperty( "Pjax" ) ) {
				Barba.Pjax.goTo( destination );
			} else {
				window.location.href = destination;
			}
		}
	} );
};

Noah.initializeAjax = function() {
	Noah.log( 'Noah.initializeAjax' );

	var $body = $( 'body' );

	if ( $body.is( '.customizer-preview' ) || typeof $body.data( 'ajaxloading' ) === "undefined" ) {
		return;
	}

	Noah.Ajax = new AjaxLoading();

	Noah.Ajax.ev.on( 'beforeOut', function( ev, container ) {
		Noah.Parallax.destroy();
		Noah.Navbar.close();
		Noah.fadeOut();
	} );

	Noah.Ajax.ev.on( 'afterOut', function( ev, container ) {
		$( 'html' ).addClass( 'no-transitions' );
	} );

	Noah.Ajax.ev.on( 'afterIn', function( ev, container ) {

		var $container = $( container ).css( 'top', 100 );

		Util.reload_js( 'related-posts.js' );

		setTimeout( function() {
			$( 'html' ).removeClass( 'no-transitions' );
			$container.css( 'top', '' );
			Noah.handleContent( $container );
			Noah.adjustLayout();
			Noah.update();
			Noah.fadeIn();
		}, 0 );

	} );
};

Noah.fadeOut = function() {
	Noah.log( 'Noah.fadeOut' );

	$( 'html' ).removeClass( 'fade-in' ).addClass( 'fade-out' );

	Overlay.hide();
};

Noah.fadeIn = function() {
	Noah.log( 'Noah.fadeIn' );

	$( 'html' ).removeClass( 'fade-out no-transitions' ).addClass( 'fade-in' );
};

Noah.init();

$( document ).ready( function() {
	Noah.initializeAjax();
	Noah.handleContent();
	Noah.adjustLayout();
	Noah.eventHandlersOnce();
	Noah.update();
	Noah.fadeIn();
} );

})( jQuery, window, document );

/*
 The MIT License (MIT)
 Copyright (c) 2016 Luigi De Rosa

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */
(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define("Barba", [], factory);
  else if(typeof exports === 'object')
    exports["Barba"] = factory();
  else
    root["Barba"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/  // The module cache
/******/  var installedModules = {};
/******/
/******/  // The require function
/******/  function __webpack_require__(moduleId) {
/******/
/******/    // Check if module is in cache
/******/    if(installedModules[moduleId])
/******/      return installedModules[moduleId].exports;
/******/
/******/    // Create a new module (and put it into the cache)
/******/    var module = installedModules[moduleId] = {
/******/      exports: {},
/******/      id: moduleId,
/******/      loaded: false
/******/    };
/******/
/******/    // Execute the module function
/******/    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/    // Flag the module as loaded
/******/    module.loaded = true;
/******/
/******/    // Return the exports of the module
/******/    return module.exports;
/******/  }
/******/
/******/
/******/  // expose the modules object (__webpack_modules__)
/******/  __webpack_require__.m = modules;
/******/
/******/  // expose the module cache
/******/  __webpack_require__.c = installedModules;
/******/
/******/  // __webpack_public_path__
/******/  __webpack_require__.p = "http://localhost:8080/dist";
/******/
/******/  // Load entry module and return exports
/******/  return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  //Promise polyfill https://github.com/taylorhakes/promise-polyfill

  if (typeof Promise !== 'function') {
   window.Promise = __webpack_require__(1);
  }

  var Barba = {
    version: '1.0.0',
    BaseTransition: __webpack_require__(4),
    BaseView: __webpack_require__(6),
    BaseCache: __webpack_require__(8),
    Dispatcher: __webpack_require__(7),
    HistoryManager: __webpack_require__(9),
    Pjax: __webpack_require__(10),
    Prefetch: __webpack_require__(13),
    Utils: __webpack_require__(5)
  };

  module.exports = Barba;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(setImmediate) {(function (root) {

    // Store setTimeout reference so promise-polyfill will be unaffected by
    // other code modifying setTimeout (like sinon.useFakeTimers())
    var setTimeoutFunc = setTimeout;

    function noop() {
    }

    // Use polyfill for setImmediate for performance gains
    var asap = (typeof setImmediate === 'function' && setImmediate) ||
      function (fn) {
        setTimeoutFunc(fn, 0);
      };

    var onUnhandledRejection = function onUnhandledRejection(err) {
      if (typeof console !== 'undefined' && console) {
        console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
      }
    };

    // Polyfill for Function.prototype.bind
    function bind(fn, thisArg) {
      return function () {
        fn.apply(thisArg, arguments);
      };
    }

    function Promise(fn) {
      if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
      if (typeof fn !== 'function') throw new TypeError('not a function');
      this._state = 0;
      this._handled = false;
      this._value = undefined;
      this._deferreds = [];

      doResolve(fn, this);
    }

    function handle(self, deferred) {
      while (self._state === 3) {
        self = self._value;
      }
      if (self._state === 0) {
        self._deferreds.push(deferred);
        return;
      }
      self._handled = true;
      asap(function () {
        var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
        if (cb === null) {
          (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
          return;
        }
        var ret;
        try {
          ret = cb(self._value);
        } catch (e) {
          reject(deferred.promise, e);
          return;
        }
        resolve(deferred.promise, ret);
      });
    }

    function resolve(self, newValue) {
      try {
        // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
        if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
        if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
          var then = newValue.then;
          if (newValue instanceof Promise) {
            self._state = 3;
            self._value = newValue;
            finale(self);
            return;
          } else if (typeof then === 'function') {
            doResolve(bind(then, newValue), self);
            return;
          }
        }
        self._state = 1;
        self._value = newValue;
        finale(self);
      } catch (e) {
        reject(self, e);
      }
    }

    function reject(self, newValue) {
      self._state = 2;
      self._value = newValue;
      finale(self);
    }

    function finale(self) {
      if (self._state === 2 && self._deferreds.length === 0) {
        asap(function() {
          if (!self._handled) {
            onUnhandledRejection(self._value);
          }
        });
      }

      for (var i = 0, len = self._deferreds.length; i < len; i++) {
        handle(self, self._deferreds[i]);
      }
      self._deferreds = null;
    }

    function Handler(onFulfilled, onRejected, promise) {
      this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
      this.onRejected = typeof onRejected === 'function' ? onRejected : null;
      this.promise = promise;
    }

    /**
     * Take a potentially misbehaving resolver function and make sure
     * onFulfilled and onRejected are only called once.
     *
     * Makes no guarantees about asynchrony.
     */
    function doResolve(fn, self) {
      var done = false;
      try {
        fn(function (value) {
          if (done) return;
          done = true;
          resolve(self, value);
        }, function (reason) {
          if (done) return;
          done = true;
          reject(self, reason);
        });
      } catch (ex) {
        if (done) return;
        done = true;
        reject(self, ex);
      }
    }

    Promise.prototype['catch'] = function (onRejected) {
      return this.then(null, onRejected);
    };

    Promise.prototype.then = function (onFulfilled, onRejected) {
      var prom = new (this.constructor)(noop);

      handle(this, new Handler(onFulfilled, onRejected, prom));
      return prom;
    };

    Promise.all = function (arr) {
      var args = Array.prototype.slice.call(arr);

      return new Promise(function (resolve, reject) {
        if (args.length === 0) return resolve([]);
        var remaining = args.length;

        function res(i, val) {
          try {
            if (val && (typeof val === 'object' || typeof val === 'function')) {
              var then = val.then;
              if (typeof then === 'function') {
                then.call(val, function (val) {
                  res(i, val);
                }, reject);
                return;
              }
            }
            args[i] = val;
            if (--remaining === 0) {
              resolve(args);
            }
          } catch (ex) {
            reject(ex);
          }
        }

        for (var i = 0; i < args.length; i++) {
          res(i, args[i]);
        }
      });
    };

    Promise.resolve = function (value) {
      if (value && typeof value === 'object' && value.constructor === Promise) {
        return value;
      }

      return new Promise(function (resolve) {
        resolve(value);
      });
    };

    Promise.reject = function (value) {
      return new Promise(function (resolve, reject) {
        reject(value);
      });
    };

    Promise.race = function (values) {
      return new Promise(function (resolve, reject) {
        for (var i = 0, len = values.length; i < len; i++) {
          values[i].then(resolve, reject);
        }
      });
    };

    /**
     * Set the immediate function to execute callbacks
     * @param fn {function} Function to execute
     * @private
     */
    Promise._setImmediateFn = function _setImmediateFn(fn) {
      asap = fn;
    };

    Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
      onUnhandledRejection = fn;
    };

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = Promise;
    } else if (!root.Promise) {
      root.Promise = Promise;
    }

  })(this);

  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2).setImmediate))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(3).nextTick;
  var apply = Function.prototype.apply;
  var slice = Array.prototype.slice;
  var immediateIds = {};
  var nextImmediateId = 0;

  // DOM APIs, for completeness

  exports.setTimeout = function() {
    return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
  };
  exports.setInterval = function() {
    return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
  };
  exports.clearTimeout =
  exports.clearInterval = function(timeout) { timeout.close(); };

  function Timeout(id, clearFn) {
    this._id = id;
    this._clearFn = clearFn;
  }
  Timeout.prototype.unref = Timeout.prototype.ref = function() {};
  Timeout.prototype.close = function() {
    this._clearFn.call(window, this._id);
  };

  // Does not start the time, just sets up the members needed.
  exports.enroll = function(item, msecs) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = msecs;
  };

  exports.unenroll = function(item) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = -1;
  };

  exports._unrefActive = exports.active = function(item) {
    clearTimeout(item._idleTimeoutId);

    var msecs = item._idleTimeout;
    if (msecs >= 0) {
      item._idleTimeoutId = setTimeout(function onTimeout() {
        if (item._onTimeout)
          item._onTimeout();
      }, msecs);
    }
  };

  // That's not how node.js implements it but the exposed api is the same.
  exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
    var id = nextImmediateId++;
    var args = arguments.length < 2 ? false : slice.call(arguments, 1);

    immediateIds[id] = true;

    nextTick(function onNextTick() {
      if (immediateIds[id]) {
        // fn.call() is faster so we optimize for the common use-case
        // @see http://jsperf.com/call-apply-segu
        if (args) {
          fn.apply(null, args);
        } else {
          fn.call(null);
        }
        // Prevent ids from leaking
        exports.clearImmediate(id);
      }
    });

    return id;
  };

  exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
    delete immediateIds[id];
  };
  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2).setImmediate, __webpack_require__(2).clearImmediate))

/***/ },
/* 3 */
/***/ function(module, exports) {

  // shim for using process in browser

  var process = module.exports = {};

  // cached from whatever global is present so that test runners that stub it
  // don't break things.  But we need to wrap it in a try catch in case it is
  // wrapped in strict mode code which doesn't define any globals.  It's inside a
  // function because try/catches deoptimize in certain engines.

  var cachedSetTimeout;
  var cachedClearTimeout;

  (function () {
    try {
      cachedSetTimeout = setTimeout;
    } catch (e) {
      cachedSetTimeout = function () {
        throw new Error('setTimeout is not defined');
      }
    }
    try {
      cachedClearTimeout = clearTimeout;
    } catch (e) {
      cachedClearTimeout = function () {
        throw new Error('clearTimeout is not defined');
      }
    }
  } ())
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
      if (!draining || !currentQueue) {
          return;
      }
      draining = false;
      if (currentQueue.length) {
          queue = currentQueue.concat(queue);
      } else {
          queueIndex = -1;
      }
      if (queue.length) {
          drainQueue();
      }
  }

  function drainQueue() {
      if (draining) {
          return;
      }
      var timeout = cachedSetTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
              if (currentQueue) {
                  currentQueue[queueIndex].run();
              }
          }
          queueIndex = -1;
          len = queue.length;
      }
      currentQueue = null;
      draining = false;
      cachedClearTimeout(timeout);
  }

  process.nextTick = function (fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
          }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
          cachedSetTimeout(drainQueue, 0);
      }
  };

  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = ''; // empty string to avoid regexp issues
  process.versions = {};

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
      throw new Error('process.binding is not supported');
  };

  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

  var Utils = __webpack_require__(5);

  /**
   * BaseTransition to extend
   *
   * @namespace Barba.BaseTransition
   * @type {Object}
   */
  var BaseTransition = {
    /**
     * @memberOf Barba.BaseTransition
     * @type {HTMLElement}
     */
    oldContainer: undefined,

    /**
     * @memberOf Barba.BaseTransition
     * @type {HTMLElement}
     */
    newContainer: undefined,

    /**
     * @memberOf Barba.BaseTransition
     * @type {Promise}
     */
    newContainerLoading: undefined,

    /**
     * Helper to extend the object
     *
     * @memberOf Barba.BaseTransition
     * @param  {Object} newObject
     * @return {Object} newInheritObject
     */
    extend: function(obj){
      return Utils.extend(this, obj);
    },

    /**
     * This function is called from Pjax module to initialize
     * the transition.
     *
     * @memberOf Barba.BaseTransition
     * @private
     * @param  {HTMLElement} oldContainer
     * @param  {Promise} newContainer
     * @return {Promise}
     */
    init: function(oldContainer, newContainer) {
      var _this = this;

      this.oldContainer = oldContainer;
      this._newContainerPromise = newContainer;

      this.deferred = Utils.deferred();
      this.newContainerReady = Utils.deferred();
      this.newContainerLoading = this.newContainerReady.promise;

      this.start();

      this._newContainerPromise.then(function(newContainer) {
        _this.newContainer = newContainer;
        _this.newContainerReady.resolve();
      });

      return this.deferred.promise;
    },

    /**
     * This function needs to be called as soon the Transition is finished
     *
     * @memberOf Barba.BaseTransition
     */
    done: function() {
      this.oldContainer.parentNode.removeChild(this.oldContainer);
      this.newContainer.style.visibility = 'visible';
      this.deferred.resolve();
    },

    /**
     * Constructor for your Transition
     *
     * @memberOf Barba.BaseTransition
     * @abstract
     */
    start: function() {},
  };

  module.exports = BaseTransition;


/***/ },
/* 5 */
/***/ function(module, exports) {

  /**
   * Just an object with some helpful functions
   *
   * @type {Object}
   * @namespace Barba.Utils
   */
  var Utils = {
    /**
     * Return the current url
     *
     * @memberOf Barba.Utils
     * @return {String} currentUrl
     */
    getCurrentUrl: function() {
      return window.location.protocol + '//' +
             window.location.host +
             window.location.pathname +
             window.location.search;
    },

    /**
     * Given an url, return it without the hash
     *
     * @memberOf Barba.Utils
     * @private
     * @param  {String} url
     * @return {String} newCleanUrl
     */
    cleanLink: function(url) {
      return url.replace(/#.*/, '');
    },

    /**
     * Time in millisecond after the xhr request goes in timeout
     *
     * @memberOf Barba.Utils
     * @type {Number}
     * @default
     */
    xhrTimeout: 5000,

    /**
     * Start an XMLHttpRequest() and return a Promise
     *
     * @memberOf Barba.Utils
     * @param  {String} url
     * @return {Promise}
     */
    xhr: function(url) {
      var deferred = this.deferred();
      var req = new XMLHttpRequest();

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (req.status === 200) {
            return deferred.resolve(req.responseText);
          } else {
            return deferred.reject(new Error('xhr: HTTP code is not 200'));
          }
        }
      };

      req.ontimeout = function() {
        return deferred.reject(new Error('xhr: Timeout exceeded'));
      };

      req.open('GET', url);
      req.timeout = this.xhrTimeout;
      req.setRequestHeader('x-barba', 'yes');
      req.send();

      return deferred.promise;
    },

    /**
     * Get obj and props and return a new object with the property merged
     *
     * @memberOf Barba.Utils
     * @param  {object} obj
     * @param  {object} props
     * @return {object}
     */
    extend: function(obj, props) {
      var newObj = Object.create(obj);

      for(var prop in props) {
        if(props.hasOwnProperty(prop)) {
          newObj[prop] = props[prop];
        }
      }

      return newObj;
    },

    /**
     * Return a new "Deferred" object
     * https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred
     *
     * @memberOf Barba.Utils
     * @return {Deferred}
     */
    deferred: function() {
      return new function() {
        this.resolve = null;
        this.reject = null;

        this.promise = new Promise(function(resolve, reject) {
          this.resolve = resolve;
          this.reject = reject;
        }.bind(this));
      };
    },

    /**
     * Return the port number normalized, eventually you can pass a string to be normalized.
     *
     * @memberOf Barba.Utils
     * @private
     * @param  {String} p
     * @return {Int} port
     */
    getPort: function(p) {
      var port = typeof p !== 'undefined' ? p : window.location.port;
      var protocol = window.location.protocol;

      if (port != '')
        return parseInt(port);

      if (protocol === 'http:')
        return 80;

      if (protocol === 'https:')
        return 443;
    }
  };

  module.exports = Utils;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

  var Dispatcher = __webpack_require__(7);
  var Utils = __webpack_require__(5);

  /**
   * BaseView to be extended
   *
   * @namespace Barba.BaseView
   * @type {Object}
   */
  var BaseView  = {
    /**
     * Namespace of the view.
     * (need to be associated with the data-namespace of the container)
     *
     * @memberOf Barba.BaseView
     * @type {String}
     */
    namespace: null,

    /**
     * Helper to extend the object
     *
     * @memberOf Barba.BaseView
     * @param  {Object} newObject
     * @return {Object} newInheritObject
     */
    extend: function(obj){
      return Utils.extend(this, obj);
    },

    /**
     * Init the view.
     * P.S. Is suggested to init the view before starting Barba.Pjax.start(),
     * in this way .onEnter() and .onEnterCompleted() will be fired for the current
     * container when the page is loaded.
     *
     * @memberOf Barba.BaseView
     */
    init: function() {
      var _this = this;

      Dispatcher.on('initStateChange',
        function(newStatus, oldStatus) {
          if (oldStatus && oldStatus.namespace === _this.namespace)
            _this.onLeave();
        }
      );

      Dispatcher.on('newPageReady',
        function(newStatus, oldStatus, container) {
          _this.container = container;

          if (newStatus.namespace === _this.namespace)
            _this.onEnter();
        }
      );

      Dispatcher.on('transitionCompleted',
        function(newStatus, oldStatus) {
          if (newStatus.namespace === _this.namespace)
            _this.onEnterCompleted();

          if (oldStatus && oldStatus.namespace === _this.namespace)
            _this.onLeaveCompleted();
        }
      );
    },

   /**
    * This function will be fired when the container
    * is ready and attached to the DOM.
    *
    * @memberOf Barba.BaseView
    * @abstract
    */
    onEnter: function() {},

    /**
     * This function will be fired when the transition
     * to this container has just finished.
     *
     * @memberOf Barba.BaseView
     * @abstract
     */
    onEnterCompleted: function() {},

    /**
     * This function will be fired when the transition
     * to a new container has just started.
     *
     * @memberOf Barba.BaseView
     * @abstract
     */
    onLeave: function() {},

    /**
     * This function will be fired when the container
     * has just been removed from the DOM.
     *
     * @memberOf Barba.BaseView
     * @abstract
     */
    onLeaveCompleted: function() {}
  }

  module.exports = BaseView;


/***/ },
/* 7 */
/***/ function(module, exports) {

  /**
   * Little Dispatcher inspired by MicroEvent.js
   *
   * @namespace Barba.Dispatcher
   * @type {Object}
   */
  var Dispatcher = {
    /**
     * Object that keeps all the events
     *
     * @memberOf Barba.Dispatcher
     * @readOnly
     * @type {Object}
     */
    events: {},

    /**
     * Bind a callback to an event
     *
     * @memberOf Barba.Dispatcher
     * @param  {String} eventName
     * @param  {Function} function
     */
    on: function(e, f) {
      this.events[e] = this.events[e] || [];
      this.events[e].push(f);
    },

    /**
     * Unbind event
     *
     * @memberOf Barba.Dispatcher
     * @param  {String} eventName
     * @param  {Function} function
     */
    off: function(e, f) {
      if(e in this.events === false)
        return;

      this.events[e].splice(this.events[e].indexOf(f), 1);
    },

    /**
     * Fire the event running all the event associated to it
     *
     * @memberOf Barba.Dispatcher
     * @param  {String} eventName
     * @param  {...*} args
     */
    trigger: function(e) {//e, ...args
      if (e in this.events === false)
        return;

      for(var i = 0; i < this.events[e].length; i++){
        this.events[e][i].apply(this, Array.prototype.slice.call(arguments, 1));
      }
    }
  };

  module.exports = Dispatcher;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

  var Utils = __webpack_require__(5);

  /**
   * BaseCache it's a simple static cache
   *
   * @namespace Barba.BaseCache
   * @type {Object}
   */
  var BaseCache = {
    /**
     * The Object that keeps all the key value information
     *
     * @memberOf Barba.BaseCache
     * @type {Object}
     */
    data: {},

    /**
     * Helper to extend this object
     *
     * @memberOf Barba.BaseCache
     * @private
     * @param  {Object} newObject
     * @return {Object} newInheritObject
     */
    extend: function(obj) {
      return Utils.extend(this, obj);
    },

    /**
     * Set a key and value data, mainly Barba is going to save promises
     *
     * @memberOf Barba.BaseCache
     * @param {String} key
     * @param {*} value
     */
    set: function(key, val) {
      this.data[key] = val;
    },

    /**
     * Retrieve the data using the key
     *
     * @memberOf Barba.BaseCache
     * @param  {String} key
     * @return {*}
     */
    get: function(key) {
      return this.data[key];
    },

    /**
     * Flush the cache
     *
     * @memberOf Barba.BaseCache
     */
    reset: function() {
      this.data = {};
    }
  };

  module.exports = BaseCache;


/***/ },
/* 9 */
/***/ function(module, exports) {

  /**
   * HistoryManager helps to keep track of the navigation
   *
   * @namespace Barba.HistoryManager
   * @type {Object}
   */
  var HistoryManager = {
    /**
     * Keep track of the status in historic order
     *
     * @memberOf Barba.HistoryManager
     * @readOnly
     * @type {Array}
     */
    history: [],

    /**
     * Add a new set of url and namespace
     *
     * @memberOf Barba.HistoryManager
     * @param {String} url
     * @param {String} namespace
     * @private
     */
    add: function(url, namespace) {
      if (!namespace)
        namespace = undefined;

      this.history.push({
        url: url,
        namespace: namespace
      });
    },

    /**
     * Return information about the current status
     *
     * @memberOf Barba.HistoryManager
     * @return {Object}
     */
    currentStatus: function() {
      return this.history[this.history.length - 1];
    },

    /**
     * Return information about the previous status
     *
     * @memberOf Barba.HistoryManager
     * @return {Object}
     */
    prevStatus: function() {
      var history = this.history;

      if (history.length < 2)
        return null;

      return history[history.length - 2];
    }
  };

  module.exports = HistoryManager;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

  var Utils = __webpack_require__(5);
  var Dispatcher = __webpack_require__(7);
  var HideShowTransition = __webpack_require__(11);
  var BaseCache = __webpack_require__(8);

  var HistoryManager = __webpack_require__(9);
  var Dom = __webpack_require__(12);

  /**
   * Pjax is a static object with main function
   *
   * @namespace Barba.Pjax
   * @borrows Dom as Dom
   * @type {Object}
   */
  var Pjax = {
    Dom: Dom,
    History: HistoryManager,
    Cache: BaseCache,

    /**
     * Indicate wether or not use the cache
     *
     * @memberOf Barba.Pjax
     * @type {Boolean}
     * @default
     */
    cacheEnabled: true,

    /**
     * Indicate if there is an animation in progress
     *
     * @memberOf Barba.Pjax
     * @readOnly
     * @type {Boolean}
     */
    transitionProgress: false,

    /**
     * Class name used to ignore links
     *
     * @memberOf Barba.Pjax
     * @type {String}
     * @default
     */
    ignoreClassLink: 'no-barba',

    /**
     * Function to be called to start Pjax
     *
     * @memberOf Barba.Pjax
     */
    start: function() {
      this.init();
    },

    /**
     * Init the events
     *
     * @memberOf Barba.Pjax
     * @private
     */
    init: function() {
      var container = this.Dom.getContainer();
      var wrapper = this.Dom.getWrapper();

      wrapper.setAttribute('aria-live', 'polite');

      this.History.add(
        this.getCurrentUrl(),
        this.Dom.getNamespace(container)
      );

      //Fire for the current view.
      Dispatcher.trigger('initStateChange', this.History.currentStatus());
      Dispatcher.trigger('newPageReady',
        this.History.currentStatus(),
        {},
        container,
        this.Dom.currentHTML
      );
      Dispatcher.trigger('transitionCompleted', this.History.currentStatus());

      this.bindEvents();
    },

    /**
     * Attach the eventlisteners
     *
     * @memberOf Barba.Pjax
     * @private
     */
    bindEvents: function() {
      document.addEventListener('click',
        this.onLinkClick.bind(this)
      );

      window.addEventListener('popstate',
        this.onStateChange.bind(this)
      );
    },

    /**
     * Return the currentURL cleaned
     *
     * @memberOf Barba.Pjax
     * @return {String} currentUrl
     */
    getCurrentUrl: function() {
      return Utils.cleanLink(
        Utils.getCurrentUrl()
      );
    },

    /**
     * Change the URL with pushstate and trigger the state change
     *
     * @memberOf Barba.Pjax
     * @param {String} newUrl
     */
    goTo: function(url) {
      window.history.pushState(null, null, url);
      this.onStateChange();
    },

    /**
     * Force the browser to go to a certain url
     *
     * @memberOf Barba.Pjax
     * @param {String} url
     * @private
     */
    forceGoTo: function(url) {
      window.location = url;
    },

    /**
     * Load an url, will start an xhr request or load from the cache
     *
     * @memberOf Barba.Pjax
     * @private
     * @param  {String} url
     * @return {Promise}
     */
    load: function(url) {
      var deferred = Utils.deferred();
      var _this = this;
      var xhr;

      xhr = this.Cache.get(url);

      if (!xhr) {
        xhr = Utils.xhr(url);
        this.Cache.set(url, xhr);
      }

      xhr.then(
        function(data) {
          var container = _this.Dom.parseResponse(data);

          _this.Dom.putContainer(container);

          if (!_this.cacheEnabled)
            _this.Cache.reset();

          deferred.resolve(container);
        },
        function() {
          //Something went wrong (timeout, 404, 505...)
          _this.forceGoTo(url);

          deferred.reject();
        }
      );

      return deferred.promise;
    },

    /**
     * Get the .href parameter out of an element
     * and handle special cases (like xlink:href)
     *
     * @private
     * @memberOf Barba.Pjax
     * @param  {HTMLElement} el
     * @return {String} href
     */
    getHref: function(el) {
      if (!el) {
        return undefined;
      }

      if (el.getAttribute && typeof el.getAttribute('xlink:href') === 'string') {
        return el.getAttribute('xlink:href');
      }

      if (typeof el.href === 'string') {
        return el.href;
      }

      return undefined;
    },

    /**
     * Callback called from click event
     *
     * @memberOf Barba.Pjax
     * @private
     * @param {MouseEvent} evt
     */
    onLinkClick: function(evt) {
      var el = evt.target;

      //Go up in the nodelist until we
      //find something with an href
      while (el && !this.getHref(el)) {
        el = el.parentNode;
      }

      if (this.preventCheck(evt, el)) {
        evt.stopPropagation();
        evt.preventDefault();

        Dispatcher.trigger('linkClicked', el, evt);

        var href = this.getHref(el);
        this.goTo(href);
      }
    },

    /**
     * Determine if the link should be followed
     *
     * @memberOf Barba.Pjax
     * @param  {MouseEvent} evt
     * @param  {HTMLElement} element
     * @return {Boolean}
     */
    preventCheck: function(evt, element) {
      if (!window.history.pushState)
        return false;

      var href = this.getHref(element);

      //User
      if (!element || !href)
        return false;

      //Middle click, cmd click, and ctrl click
      if (evt.which > 1 || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey)
        return false;

      //Ignore target with _blank target
      if (element.target && element.target === '_blank')
        return false;

      //Check if it's the same domain
      if (window.location.protocol !== element.protocol || window.location.hostname !== element.hostname)
        return false;

      //Check if the port is the same
      if (Utils.getPort() !== Utils.getPort(element.port))
        return false;

      //Ignore case when a hash is being tacked on the current URL
      if (href.indexOf('#') > -1)
        return false;

      //Ignore case where there is download attribute
      if (element.getAttribute && typeof element.getAttribute('download') === 'string')
        return false;

      //In case you're trying to load the same page
      if (Utils.cleanLink(href) == Utils.cleanLink(location.href))
        return false;

      if (element.classList.contains(this.ignoreClassLink))
        return false;

      return true;
    },

    /**
     * Return a transition object
     *
     * @memberOf Barba.Pjax
     * @return {Barba.Transition} Transition object
     */
    getTransition: function() {
      //User customizable
      return HideShowTransition;
    },

    /**
     * Method called after a 'popstate' or from .goTo()
     *
     * @memberOf Barba.Pjax
     * @private
     */
    onStateChange: function() {
      var newUrl = this.getCurrentUrl();

      if (this.transitionProgress)
        this.forceGoTo(newUrl);

      if (this.History.currentStatus().url === newUrl)
        return false;

      this.History.add(newUrl);

      var newContainer = this.load(newUrl);
      var transition = Object.create(this.getTransition());

      this.transitionProgress = true;

      Dispatcher.trigger('initStateChange',
        this.History.currentStatus(),
        this.History.prevStatus()
      );

      var transitionInstance = transition.init(
        this.Dom.getContainer(),
        newContainer
      );

      newContainer.then(
        this.onNewContainerLoaded.bind(this)
      );

      transitionInstance.then(
        this.onTransitionEnd.bind(this)
      );
    },

    /**
     * Function called as soon the new container is ready
     *
     * @memberOf Barba.Pjax
     * @private
     * @param {HTMLElement} container
     */
    onNewContainerLoaded: function(container) {
      var currentStatus = this.History.currentStatus();
      currentStatus.namespace = this.Dom.getNamespace(container);

      Dispatcher.trigger('newPageReady',
        this.History.currentStatus(),
        this.History.prevStatus(),
        container,
        this.Dom.currentHTML
      );
    },

    /**
     * Function called as soon the transition is finished
     *
     * @memberOf Barba.Pjax
     * @private
     */
    onTransitionEnd: function() {
      this.transitionProgress = false;

      Dispatcher.trigger('transitionCompleted',
        this.History.currentStatus(),
        this.History.prevStatus()
      );
    }
  };

  module.exports = Pjax;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

  var BaseTransition = __webpack_require__(4);

  /**
   * Basic Transition object, wait for the new Container to be ready,
   * scroll top, and finish the transition (removing the old container and displaying the new one)
   *
   * @private
   * @namespace Barba.HideShowTransition
   * @augments Barba.BaseTransition
   */
  var HideShowTransition = BaseTransition.extend({
    start: function() {
      this.newContainerLoading.then(this.finish.bind(this));
    },

    finish: function() {
      document.body.scrollTop = 0;
      this.done();
    }
  });

  module.exports = HideShowTransition;


/***/ },
/* 12 */
/***/ function(module, exports) {

  /**
   * Object that is going to deal with DOM parsing/manipulation
   *
   * @namespace Barba.Pjax.Dom
   * @type {Object}
   */
  var Dom = {
    /**
     * The name of the data attribute on the container
     *
     * @memberOf Barba.Pjax.Dom
     * @type {String}
     * @default
     */
    dataNamespace: 'namespace',

    /**
     * Id of the main wrapper
     *
     * @memberOf Barba.Pjax.Dom
     * @type {String}
     * @default
     */
    wrapperId: 'barba-wrapper',

    /**
     * Class name used to identify the containers
     *
     * @memberOf Barba.Pjax.Dom
     * @type {String}
     * @default
     */
    containerClass: 'barba-container',

    /**
     * Full HTML String of the current page.
     * By default is the innerHTML of the initial loaded page.
     *
     * Each time a new page is loaded, the value is the response of the xhr call.
     *
     * @memberOf Barba.Pjax.Dom
     * @type {String}
     */
    currentHTML: document.documentElement.innerHTML,

    /**
     * Parse the responseText obtained from the xhr call
     *
     * @memberOf Barba.Pjax.Dom
     * @private
     * @param  {String} responseText
     * @return {HTMLElement}
     */
    parseResponse: function(responseText) {
      this.currentHTML = responseText;

      var wrapper = document.createElement('div');
      wrapper.innerHTML = responseText;

      var titleEl = wrapper.querySelector('title');

      if (titleEl)
        document.title = titleEl.textContent;

      return this.getContainer(wrapper);
    },

    /**
     * Get the main barba wrapper by the ID `wrapperId`
     *
     * @memberOf Barba.Pjax.Dom
     * @return {HTMLElement} element
     */
    getWrapper: function() {
      var wrapper = document.getElementById(this.wrapperId);

      if (!wrapper)
        throw new Error('Barba.js: wrapper not found!');

      return wrapper;
    },

    /**
     * Get the container on the current DOM,
     * or from an HTMLElement passed via argument
     *
     * @memberOf Barba.Pjax.Dom
     * @private
     * @param  {HTMLElement} element
     * @return {HTMLElement}
     */
    getContainer: function(element) {
      if (!element)
        element = document.body;

      if (!element)
        throw new Error('Barba.js: DOM not ready!');

      var container = this.parseContainer(element);

      if (container && container.jquery)
        container = container[0];

      if (!container)
        throw new Error('Barba.js: no container found');

      return container;
    },

    /**
     * Get the namespace of the container
     *
     * @memberOf Barba.Pjax.Dom
     * @private
     * @param  {HTMLElement} element
     * @return {String}
     */
    getNamespace: function(element) {
      if (element && element.dataset) {
        return element.dataset[this.dataNamespace];
      } else if (element) {
        return element.getAttribute('data-' + this.dataNamespace);
      }

      return null;
    },

    /**
     * Put the container on the page
     *
     * @memberOf Barba.Pjax.Dom
     * @private
     * @param  {HTMLElement} element
     */
    putContainer: function(element) {
      element.style.visibility = 'hidden';

      var wrapper = this.getWrapper();
      wrapper.appendChild(element);
    },

    /**
     * Get container selector
     *
     * @memberOf Barba.Pjax.Dom
     * @private
     * @param  {HTMLElement} element
     * @return {HTMLElement} element
     */
    parseContainer: function(element) {
      return element.querySelector('.' + this.containerClass);
    }
  };

  module.exports = Dom;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

  var Utils = __webpack_require__(5);
  var Pjax = __webpack_require__(10);

  /**
   * Prefetch
   *
   * @namespace Barba.Prefetch
   * @type {Object}
   */
  var Prefetch = {
    /**
     * Class name used to ignore prefetch on links
     *
     * @memberOf Barba.Prefetch
     * @type {String}
     * @default
     */
    ignoreClassLink: 'no-barba-prefetch',

    /**
     * Init the event listener on mouseover and touchstart
     * for the prefetch
     *
     * @memberOf Barba.Prefetch
     */
    init: function() {
      if (!window.history.pushState) {
        return false;
      }

      document.body.addEventListener('mouseover', this.onLinkEnter.bind(this));
      document.body.addEventListener('touchstart', this.onLinkEnter.bind(this));
    },

    /**
     * Callback for the mousehover/touchstart
     *
     * @memberOf Barba.Prefetch
     * @private
     * @param  {Object} evt
     */
    onLinkEnter: function(evt) {
      var el = evt.target;

      while (el && !Pjax.getHref(el)) {
        el = el.parentNode;
      }

      if (!el || el.classList.contains(this.ignoreClassLink)) {
        return;
      }

      var url = Pjax.getHref(el);

      //Check if the link is elegible for Pjax
      if (Pjax.preventCheck(evt, el) && !Pjax.Cache.get(url)) {
        var xhr = Utils.xhr(url);
        Pjax.Cache.set(url, xhr);
      }
    }
  };

  module.exports = Prefetch;


/***/ }
/******/ ])
});
;

/*
 * jQuery Easing v1.4.0 - http://gsgd.co.uk/sandbox/jquery/easing/
 * Open source under the BSD License.
 * Copyright © 2008 George McGinley Smith
 * All rights reserved.
 * https://raw.github.com/gdsmith/jquery-easing/master/LICENSE
*/

(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(['jquery'], function ($) {
            return factory($);
        });
    } else if (typeof module === "object" && typeof module.exports === "object") {
        exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
})(function($){

// Preserve the original jQuery "swing" easing as "jswing"
$.easing['jswing'] = $.easing['swing'];

var pow = Math.pow,
    sqrt = Math.sqrt,
    sin = Math.sin,
    cos = Math.cos,
    PI = Math.PI,
    c1 = 1.70158,
    c2 = c1 * 1.525,
    c3 = c1 + 1,
    c4 = ( 2 * PI ) / 3,
    c5 = ( 2 * PI ) / 4.5;

// x is the fraction of animation progress, in the range 0..1
function bounceOut(x) {
    var n1 = 7.5625,
        d1 = 2.75;
    if ( x < 1/d1 ) {
        return n1*x*x;
    } else if ( x < 2/d1 ) {
        return n1*(x-=(1.5/d1))*x + .75;
    } else if ( x < 2.5/d1 ) {
        return n1*(x-=(2.25/d1))*x + .9375;
    } else {
        return n1*(x-=(2.625/d1))*x + .984375;
    }
}

$.extend( $.easing,
{
    def: 'easeOutQuad',
    swing: function (x) {
        return $.easing[$.easing.def](x);
    },
    easeInQuad: function (x) {
        return x * x;
    },
    easeOutQuad: function (x) {
        return 1 - ( 1 - x ) * ( 1 - x );
    },
    easeInOutQuad: function (x) {
        return x < 0.5 ?
            2 * x * x :
            1 - pow( -2 * x + 2, 2 ) / 2;
    },
    easeInCubic: function (x) {
        return x * x * x;
    },
    easeOutCubic: function (x) {
        return 1 - pow( 1 - x, 3 );
    },
    easeInOutCubic: function (x) {
        return x < 0.5 ?
            4 * x * x * x :
            1 - pow( -2 * x + 2, 3 ) / 2;
    },
    easeInQuart: function (x) {
        return x * x * x * x;
    },
    easeOutQuart: function (x) {
        return 1 - pow( 1 - x, 4 );
    },
    easeInOutQuart: function (x) {
        return x < 0.5 ?
            8 * x * x * x * x :
            1 - pow( -2 * x + 2, 4 ) / 2;
    },
    easeInQuint: function (x) {
        return x * x * x * x * x;
    },
    easeOutQuint: function (x) {
        return 1 - pow( 1 - x, 5 );
    },
    easeInOutQuint: function (x) {
        return x < 0.5 ?
            16 * x * x * x * x * x :
            1 - pow( -2 * x + 2, 5 ) / 2;
    },
    easeInSine: function (x) {
        return 1 - cos( x * PI/2 );
    },
    easeOutSine: function (x) {
        return sin( x * PI/2 );
    },
    easeInOutSine: function (x) {
        return -( cos( PI * x ) - 1 ) / 2;
    },
    easeInExpo: function (x) {
        return x === 0 ? 0 : pow( 2, 10 * x - 10 );
    },
    easeOutExpo: function (x) {
        return x === 1 ? 1 : 1 - pow( 2, -10 * x );
    },
    easeInOutExpo: function (x) {
        return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ?
            pow( 2, 20 * x - 10 ) / 2 :
            ( 2 - pow( 2, -20 * x + 10 ) ) / 2;
    },
    easeInCirc: function (x) {
        return 1 - sqrt( 1 - pow( x, 2 ) );
    },
    easeOutCirc: function (x) {
        return sqrt( 1 - pow( x - 1, 2 ) );
    },
    easeInOutCirc: function (x) {
        return x < 0.5 ?
            ( 1 - sqrt( 1 - pow( 2 * x, 2 ) ) ) / 2 :
            ( sqrt( 1 - pow( -2 * x + 2, 2 ) ) + 1 ) / 2;
    },
    easeInElastic: function (x) {
        return x === 0 ? 0 : x === 1 ? 1 :
            -pow( 2, 10 * x - 10 ) * sin( ( x * 10 - 10.75 ) * c4 );
    },
    easeOutElastic: function (x) {
        return x === 0 ? 0 : x === 1 ? 1 :
            pow( 2, -10 * x ) * sin( ( x * 10 - 0.75 ) * c4 ) + 1;
    },
    easeInOutElastic: function (x) {
        return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ?
            -( pow( 2, 20 * x - 10 ) * sin( ( 20 * x - 11.125 ) * c5 )) / 2 :
            pow( 2, -20 * x + 10 ) * sin( ( 20 * x - 11.125 ) * c5 ) / 2 + 1;
    },
    easeInBack: function (x) {
        return c3 * x * x * x - c1 * x * x;
    },
    easeOutBack: function (x) {
        return 1 + c3 * pow( x - 1, 3 ) + c1 * pow( x - 1, 2 );
    },
    easeInOutBack: function (x) {
        return x < 0.5 ?
            ( pow( 2 * x, 2 ) * ( ( c2 + 1 ) * 2 * x - c2 ) ) / 2 :
            ( pow( 2 * x - 2, 2 ) *( ( c2 + 1 ) * ( x * 2 - 2 ) + c2 ) + 2 ) / 2;
    },
    easeInBounce: function (x) {
        return 1 - bounceOut( 1 - x );
    },
    easeOutBounce: bounceOut,
    easeInOutBounce: function (x) {
        return x < 0.5 ?
            ( 1 - bounceOut( 1 - 2 * x ) ) / 2 :
            ( 1 + bounceOut( 2 * x - 1 ) ) / 2;
    }
});

});
(function($) {

	$.fn.getStyleObject = function(){
		var dom = this.get(0),
			returns = {},
			style;

		if ( window.getComputedStyle ) {
			var camelize = function( a, b ) {
				return b.toUpperCase();
			};
			style = window.getComputedStyle(dom, null);
			for ( var i = 0, l = style.length; i < l; i++ ) {
				var prop = style[i];
				var camel = prop.replace(/\-([a-z])/g, camelize);
				var val = style.getPropertyValue(prop);
				returns[camel] = val;
			};
			return returns;
		};
		if ( style = dom.currentStyle ) {
			for ( var prop in style ) {
				returns[prop] = style[prop];
			}
			return returns;
		}
		return this.css();
	}

	$.fn.copyCSS = function( source ) {
		var styles = $( source ).getStyleObject();
		this.css( styles );
	}

	$.fn.resizeselect = function(settings) {
		return this.each(function() {

			$(this).change(function(){
				var $this = $(this);

				// create test element
				var text = $this.find("option:selected").text();
				var $test = $("<span>").html(text);

				// add to body, get width, and get out
				$test.appendTo('body').copyCSS($this);
				$test.css('width', 'auto');
				var width = $test.width();
				$test.remove();

				// set select width
				$this.width(width);

			// run on start
			}).change();
		});
	};

})(jQuery, window);
/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.6.0
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues
  License: MIT http://opensource.org/licenses/MIT

 */
/* global window, document, define, jQuery, setInterval, clearInterval */
(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }

}(function($) {
    'use strict';
    var Slick = window.Slick || {};

    Slick = (function() {

        var instanceUid = 0;

        function Slick(element, settings) {

            var _ = this, dataSettings;

            _.defaults = {
                accessibility: true,
                adaptiveHeight: false,
                appendArrows: $(element),
                appendDots: $(element),
                arrows: true,
                asNavFor: null,
                prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',
                nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',
                autoplay: false,
                autoplaySpeed: 3000,
                centerMode: false,
                centerPadding: '50px',
                cssEase: 'ease',
                customPaging: function(slider, i) {
                    return $('<button type="button" data-role="none" role="button" tabindex="0" />').text(i + 1);
                },
                dots: false,
                dotsClass: 'slick-dots',
                draggable: true,
                easing: 'linear',
                edgeFriction: 0.35,
                fade: false,
                focusOnSelect: false,
                infinite: true,
                initialSlide: 0,
                lazyLoad: 'ondemand',
                mobileFirst: false,
                pauseOnHover: true,
                pauseOnFocus: true,
                pauseOnDotsHover: false,
                respondTo: 'window',
                responsive: null,
                rows: 1,
                rtl: false,
                slide: '',
                slidesPerRow: 1,
                slidesToShow: 1,
                slidesToScroll: 1,
                speed: 500,
                swipe: true,
                swipeToSlide: false,
                touchMove: true,
                touchThreshold: 5,
                useCSS: true,
                useTransform: true,
                variableWidth: false,
                vertical: false,
                verticalSwiping: false,
                waitForAnimate: true,
                zIndex: 1000
            };

            _.initials = {
                animating: false,
                dragging: false,
                autoPlayTimer: null,
                currentDirection: 0,
                currentLeft: null,
                currentSlide: 0,
                direction: 1,
                $dots: null,
                listWidth: null,
                listHeight: null,
                loadIndex: 0,
                $nextArrow: null,
                $prevArrow: null,
                slideCount: null,
                slideWidth: null,
                $slideTrack: null,
                $slides: null,
                sliding: false,
                slideOffset: 0,
                swipeLeft: null,
                $list: null,
                touchObject: {},
                transformsEnabled: false,
                unslicked: false
            };

            $.extend(_, _.initials);

            _.activeBreakpoint = null;
            _.animType = null;
            _.animProp = null;
            _.breakpoints = [];
            _.breakpointSettings = [];
            _.cssTransitions = false;
            _.focussed = false;
            _.interrupted = false;
            _.hidden = 'hidden';
            _.paused = true;
            _.positionProp = null;
            _.respondTo = null;
            _.rowCount = 1;
            _.shouldClick = true;
            _.$slider = $(element);
            _.$slidesCache = null;
            _.transformType = null;
            _.transitionType = null;
            _.visibilityChange = 'visibilitychange';
            _.windowWidth = 0;
            _.windowTimer = null;

            dataSettings = $(element).data('slick') || {};

            _.options = $.extend({}, _.defaults, settings, dataSettings);

            _.currentSlide = _.options.initialSlide;

            _.originalSettings = _.options;

            if (typeof document.mozHidden !== 'undefined') {
                _.hidden = 'mozHidden';
                _.visibilityChange = 'mozvisibilitychange';
            } else if (typeof document.webkitHidden !== 'undefined') {
                _.hidden = 'webkitHidden';
                _.visibilityChange = 'webkitvisibilitychange';
            }

            _.autoPlay = $.proxy(_.autoPlay, _);
            _.autoPlayClear = $.proxy(_.autoPlayClear, _);
            _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);
            _.changeSlide = $.proxy(_.changeSlide, _);
            _.clickHandler = $.proxy(_.clickHandler, _);
            _.selectHandler = $.proxy(_.selectHandler, _);
            _.setPosition = $.proxy(_.setPosition, _);
            _.swipeHandler = $.proxy(_.swipeHandler, _);
            _.dragHandler = $.proxy(_.dragHandler, _);
            _.keyHandler = $.proxy(_.keyHandler, _);

            _.instanceUid = instanceUid++;

            // A simple way to check for HTML strings
            // Strict HTML recognition (must start with <)
            // Extracted from jQuery v1.11 source
            _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;


            _.registerBreakpoints();
            _.init(true);

        }

        return Slick;

    }());

    Slick.prototype.activateADA = function() {
        var _ = this;

        _.$slideTrack.find('.slick-active').attr({
            'aria-hidden': 'false'
        }).find('a, input, button, select').attr({
            'tabindex': '0'
        });

    };

    Slick.prototype.addSlide = Slick.prototype.slickAdd = function(markup, index, addBefore) {

        var _ = this;

        if (typeof(index) === 'boolean') {
            addBefore = index;
            index = null;
        } else if (index < 0 || (index >= _.slideCount)) {
            return false;
        }

        _.unload();

        if (typeof(index) === 'number') {
            if (index === 0 && _.$slides.length === 0) {
                $(markup).appendTo(_.$slideTrack);
            } else if (addBefore) {
                $(markup).insertBefore(_.$slides.eq(index));
            } else {
                $(markup).insertAfter(_.$slides.eq(index));
            }
        } else {
            if (addBefore === true) {
                $(markup).prependTo(_.$slideTrack);
            } else {
                $(markup).appendTo(_.$slideTrack);
            }
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slides.each(function(index, element) {
            $(element).attr('data-slick-index', index);
        });

        _.$slidesCache = _.$slides;

        _.reinit();

    };

    Slick.prototype.animateHeight = function() {
        var _ = this;
        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.animate({
                height: targetHeight
            }, _.options.speed);
        }
    };

    Slick.prototype.animateSlide = function(targetLeft, callback) {

        var animProps = {},
            _ = this;

        _.animateHeight();

        if (_.options.rtl === true && _.options.vertical === false) {
            targetLeft = -targetLeft;
        }
        if (_.transformsEnabled === false) {
            if (_.options.vertical === false) {
                _.$slideTrack.animate({
                    left: targetLeft
                }, _.options.speed, _.options.easing, callback);
            } else {
                _.$slideTrack.animate({
                    top: targetLeft
                }, _.options.speed, _.options.easing, callback);
            }

        } else {

            if (_.cssTransitions === false) {
                if (_.options.rtl === true) {
                    _.currentLeft = -(_.currentLeft);
                }
                $({
                    animStart: _.currentLeft
                }).animate({
                    animStart: targetLeft
                }, {
                    duration: _.options.speed,
                    easing: _.options.easing,
                    step: function(now) {
                        now = Math.ceil(now);
                        if (_.options.vertical === false) {
                            animProps[_.animType] = 'translate(' +
                                now + 'px, 0px)';
                            _.$slideTrack.css(animProps);
                        } else {
                            animProps[_.animType] = 'translate(0px,' +
                                now + 'px)';
                            _.$slideTrack.css(animProps);
                        }
                    },
                    complete: function() {
                        if (callback) {
                            callback.call();
                        }
                    }
                });

            } else {

                _.applyTransition();
                targetLeft = Math.ceil(targetLeft);

                if (_.options.vertical === false) {
                    animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
                } else {
                    animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
                }
                _.$slideTrack.css(animProps);

                if (callback) {
                    setTimeout(function() {

                        _.disableTransition();

                        callback.call();
                    }, _.options.speed);
                }

            }

        }

    };

    Slick.prototype.getNavTarget = function() {

        var _ = this,
            asNavFor = _.options.asNavFor;

        if ( asNavFor && asNavFor !== null ) {
            asNavFor = $(asNavFor).not(_.$slider);
        }

        return asNavFor;

    };

    Slick.prototype.asNavFor = function(index) {

        var _ = this,
            asNavFor = _.getNavTarget();

        if ( asNavFor !== null && typeof asNavFor === 'object' ) {
            asNavFor.each(function() {
                var target = $(this).slick('getSlick');
                if(!target.unslicked) {
                    target.slideHandler(index, true);
                }
            });
        }

    };

    Slick.prototype.applyTransition = function(slide) {

        var _ = this,
            transition = {};

        if (_.options.fade === false) {
            transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
        } else {
            transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
        }

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }

    };

    Slick.prototype.autoPlay = function() {

        var _ = this;

        _.autoPlayClear();

        if ( _.slideCount > _.options.slidesToShow ) {
            _.autoPlayTimer = setInterval( _.autoPlayIterator, _.options.autoplaySpeed );
        }

    };

    Slick.prototype.autoPlayClear = function() {

        var _ = this;

        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }

    };

    Slick.prototype.autoPlayIterator = function() {

        var _ = this,
            slideTo = _.currentSlide + _.options.slidesToScroll;

        if ( !_.paused && !_.interrupted && !_.focussed ) {

            if ( _.options.infinite === false ) {

                if ( _.direction === 1 && ( _.currentSlide + 1 ) === ( _.slideCount - 1 )) {
                    _.direction = 0;
                }

                else if ( _.direction === 0 ) {

                    slideTo = _.currentSlide - _.options.slidesToScroll;

                    if ( _.currentSlide - 1 === 0 ) {
                        _.direction = 1;
                    }

                }

            }

            _.slideHandler( slideTo );

        }

    };

    Slick.prototype.buildArrows = function() {

        var _ = this;

        if (_.options.arrows === true ) {

            _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
            _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

            if( _.slideCount > _.options.slidesToShow ) {

                _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
                _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

                if (_.htmlExpr.test(_.options.prevArrow)) {
                    _.$prevArrow.prependTo(_.options.appendArrows);
                }

                if (_.htmlExpr.test(_.options.nextArrow)) {
                    _.$nextArrow.appendTo(_.options.appendArrows);
                }

                if (_.options.infinite !== true) {
                    _.$prevArrow
                        .addClass('slick-disabled')
                        .attr('aria-disabled', 'true');
                }

            } else {

                _.$prevArrow.add( _.$nextArrow )

                    .addClass('slick-hidden')
                    .attr({
                        'aria-disabled': 'true',
                        'tabindex': '-1'
                    });

            }

        }

    };

    Slick.prototype.buildDots = function() {

        var _ = this,
            i, dot;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$slider.addClass('slick-dotted');

            dot = $('<ul />').addClass(_.options.dotsClass);

            for (i = 0; i <= _.getDotCount(); i += 1) {
                dot.append($('<li />').append(_.options.customPaging.call(this, _, i)));
            }

            _.$dots = dot.appendTo(_.options.appendDots);

            _.$dots.find('li').first().addClass('slick-active').attr('aria-hidden', 'false');

        }

    };

    Slick.prototype.buildOut = function() {

        var _ = this;

        _.$slides =
            _.$slider
                .children( _.options.slide + ':not(.slick-cloned)')
                .addClass('slick-slide');

        _.slideCount = _.$slides.length;

        _.$slides.each(function(index, element) {
            $(element)
                .attr('data-slick-index', index)
                .data('originalStyling', $(element).attr('style') || '');
        });

        _.$slider.addClass('slick-slider');

        _.$slideTrack = (_.slideCount === 0) ?
            $('<div class="slick-track"/>').appendTo(_.$slider) :
            _.$slides.wrapAll('<div class="slick-track"/>').parent();

        _.$list = _.$slideTrack.wrap(
            '<div aria-live="polite" class="slick-list"/>').parent();
        _.$slideTrack.css('opacity', 0);

        if (_.options.centerMode === true || _.options.swipeToSlide === true) {
            _.options.slidesToScroll = 1;
        }

        $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');

        _.setupInfinite();

        _.buildArrows();

        _.buildDots();

        _.updateDots();


        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        if (_.options.draggable === true) {
            _.$list.addClass('draggable');
        }

    };

    Slick.prototype.buildRows = function() {

        var _ = this, a, b, c, newSlides, numOfSlides, originalSlides,slidesPerSection;

        newSlides = document.createDocumentFragment();
        originalSlides = _.$slider.children();

        if(_.options.rows > 1) {

            slidesPerSection = _.options.slidesPerRow * _.options.rows;
            numOfSlides = Math.ceil(
                originalSlides.length / slidesPerSection
            );

            for(a = 0; a < numOfSlides; a++){
                var slide = document.createElement('div');
                for(b = 0; b < _.options.rows; b++) {
                    var row = document.createElement('div');
                    for(c = 0; c < _.options.slidesPerRow; c++) {
                        var target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c));
                        if (originalSlides.get(target)) {
                            row.appendChild(originalSlides.get(target));
                        }
                    }
                    slide.appendChild(row);
                }
                newSlides.appendChild(slide);
            }

            _.$slider.empty().append(newSlides);
            _.$slider.children().children().children()
                .css({
                    'width':(100 / _.options.slidesPerRow) + '%',
                    'display': 'inline-block'
                });

        }

    };

    Slick.prototype.checkResponsive = function(initial, forceUpdate) {

        var _ = this,
            breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false;
        var sliderWidth = _.$slider.width();
        var windowWidth = window.innerWidth || $(window).width();

        if (_.respondTo === 'window') {
            respondToWidth = windowWidth;
        } else if (_.respondTo === 'slider') {
            respondToWidth = sliderWidth;
        } else if (_.respondTo === 'min') {
            respondToWidth = Math.min(windowWidth, sliderWidth);
        }

        if ( _.options.responsive &&
            _.options.responsive.length &&
            _.options.responsive !== null) {

            targetBreakpoint = null;

            for (breakpoint in _.breakpoints) {
                if (_.breakpoints.hasOwnProperty(breakpoint)) {
                    if (_.originalSettings.mobileFirst === false) {
                        if (respondToWidth < _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    } else {
                        if (respondToWidth > _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    }
                }
            }

            if (targetBreakpoint !== null) {
                if (_.activeBreakpoint !== null) {
                    if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
                        _.activeBreakpoint =
                            targetBreakpoint;
                        if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                            _.unslick(targetBreakpoint);
                        } else {
                            _.options = $.extend({}, _.originalSettings,
                                _.breakpointSettings[
                                    targetBreakpoint]);
                            if (initial === true) {
                                _.currentSlide = _.options.initialSlide;
                            }
                            _.refresh(initial);
                        }
                        triggerBreakpoint = targetBreakpoint;
                    }
                } else {
                    _.activeBreakpoint = targetBreakpoint;
                    if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                        _.unslick(targetBreakpoint);
                    } else {
                        _.options = $.extend({}, _.originalSettings,
                            _.breakpointSettings[
                                targetBreakpoint]);
                        if (initial === true) {
                            _.currentSlide = _.options.initialSlide;
                        }
                        _.refresh(initial);
                    }
                    triggerBreakpoint = targetBreakpoint;
                }
            } else {
                if (_.activeBreakpoint !== null) {
                    _.activeBreakpoint = null;
                    _.options = _.originalSettings;
                    if (initial === true) {
                        _.currentSlide = _.options.initialSlide;
                    }
                    _.refresh(initial);
                    triggerBreakpoint = targetBreakpoint;
                }
            }

            // only trigger breakpoints during an actual break. not on initialize.
            if( !initial && triggerBreakpoint !== false ) {
                _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
            }
        }

    };

    Slick.prototype.changeSlide = function(event, dontAnimate) {

        var _ = this,
            $target = $(event.currentTarget),
            indexOffset, slideOffset, unevenOffset;

        // If target is a link, prevent default action.
        if($target.is('a')) {
            event.preventDefault();
        }

        // If target is not the <li> element (ie: a child), find the <li>.
        if(!$target.is('li')) {
            $target = $target.closest('li');
        }

        unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0);
        indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

        switch (event.data.message) {

            case 'previous':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
                }
                break;

            case 'next':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
                }
                break;

            case 'index':
                var index = event.data.index === 0 ? 0 :
                    event.data.index || $target.index() * _.options.slidesToScroll;

                _.slideHandler(_.checkNavigable(index), false, dontAnimate);
                $target.children().trigger('focus');
                break;

            default:
                return;
        }

    };

    Slick.prototype.checkNavigable = function(index) {

        var _ = this,
            navigables, prevNavigable;

        navigables = _.getNavigableIndexes();
        prevNavigable = 0;
        if (index > navigables[navigables.length - 1]) {
            index = navigables[navigables.length - 1];
        } else {
            for (var n in navigables) {
                if (index < navigables[n]) {
                    index = prevNavigable;
                    break;
                }
                prevNavigable = navigables[n];
            }
        }

        return index;
    };

    Slick.prototype.cleanUpEvents = function() {

        var _ = this;

        if (_.options.dots && _.$dots !== null) {

            $('li', _.$dots)
                .off('click.slick', _.changeSlide)
                .off('mouseenter.slick', $.proxy(_.interrupt, _, true))
                .off('mouseleave.slick', $.proxy(_.interrupt, _, false));

        }

        _.$slider.off('focus.slick blur.slick');

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
            _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);
        }

        _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
        _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
        _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
        _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

        _.$list.off('click.slick', _.clickHandler);

        $(document).off(_.visibilityChange, _.visibility);

        _.cleanUpSlideEvents();

        if (_.options.accessibility === true) {
            _.$list.off('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().off('click.slick', _.selectHandler);
        }

        $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

        $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

        $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

        $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(document).off('ready.slick.slick-' + _.instanceUid, _.setPosition);

    };

    Slick.prototype.cleanUpSlideEvents = function() {

        var _ = this;

        _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true));
        _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false));

    };

    Slick.prototype.cleanUpRows = function() {

        var _ = this, originalSlides;

        if(_.options.rows > 1) {
            originalSlides = _.$slides.children().children();
            originalSlides.removeAttr('style');
            _.$slider.empty().append(originalSlides);
        }

    };

    Slick.prototype.clickHandler = function(event) {

        var _ = this;

        if (_.shouldClick === false) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
        }

    };

    Slick.prototype.destroy = function(refresh) {

        var _ = this;

        _.autoPlayClear();

        _.touchObject = {};

        _.cleanUpEvents();

        $('.slick-cloned', _.$slider).detach();

        if (_.$dots) {
            _.$dots.remove();
        }


        if ( _.$prevArrow && _.$prevArrow.length ) {

            _.$prevArrow
                .removeClass('slick-disabled slick-arrow slick-hidden')
                .removeAttr('aria-hidden aria-disabled tabindex')
                .css('display','');

            if ( _.htmlExpr.test( _.options.prevArrow )) {
                _.$prevArrow.remove();
            }
        }

        if ( _.$nextArrow && _.$nextArrow.length ) {

            _.$nextArrow
                .removeClass('slick-disabled slick-arrow slick-hidden')
                .removeAttr('aria-hidden aria-disabled tabindex')
                .css('display','');

            if ( _.htmlExpr.test( _.options.nextArrow )) {
                _.$nextArrow.remove();
            }

        }


        if (_.$slides) {

            _.$slides
                .removeClass('slick-slide slick-active slick-center slick-visible slick-current')
                .removeAttr('aria-hidden')
                .removeAttr('data-slick-index')
                .each(function(){
                    $(this).attr('style', $(this).data('originalStyling'));
                });

            _.$slideTrack.children(this.options.slide).detach();

            _.$slideTrack.detach();

            _.$list.detach();

            _.$slider.append(_.$slides);
        }

        _.cleanUpRows();

        _.$slider.removeClass('slick-slider');
        _.$slider.removeClass('slick-initialized');
        _.$slider.removeClass('slick-dotted');

        _.unslicked = true;

        if(!refresh) {
            _.$slider.trigger('destroy', [_]);
        }

    };

    Slick.prototype.disableTransition = function(slide) {

        var _ = this,
            transition = {};

        transition[_.transitionType] = '';

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }

    };

    Slick.prototype.fadeSlide = function(slideIndex, callback) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).css({
                zIndex: _.options.zIndex
            });

            _.$slides.eq(slideIndex).animate({
                opacity: 1
            }, _.options.speed, _.options.easing, callback);

        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 1,
                zIndex: _.options.zIndex
            });

            if (callback) {
                setTimeout(function() {

                    _.disableTransition(slideIndex);

                    callback.call();
                }, _.options.speed);
            }

        }

    };

    Slick.prototype.fadeSlideOut = function(slideIndex) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).animate({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            }, _.options.speed, _.options.easing);

        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            });

        }

    };

    Slick.prototype.filterSlides = Slick.prototype.slickFilter = function(filter) {

        var _ = this;

        if (filter !== null) {

            _.$slidesCache = _.$slides;

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

            _.reinit();

        }

    };

    Slick.prototype.focusHandler = function() {

        var _ = this;

        _.$slider
            .off('focus.slick blur.slick')
            .on('focus.slick blur.slick',
                '*:not(.slick-arrow)', function(event) {

            event.stopImmediatePropagation();
            var $sf = $(this);

            setTimeout(function() {

                if( _.options.pauseOnFocus ) {
                    _.focussed = $sf.is(':focus');
                    _.autoPlay();
                }

            }, 0);

        });
    };

    Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function() {

        var _ = this;
        return _.currentSlide;

    };

    Slick.prototype.getDotCount = function() {

        var _ = this;

        var breakPoint = 0;
        var counter = 0;
        var pagerQty = 0;

        if (_.options.infinite === true) {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToScroll;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        } else if (_.options.centerMode === true) {
            pagerQty = _.slideCount;
        } else if(!_.options.asNavFor) {
            pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
        }else {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToScroll;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        }

        return pagerQty - 1;

    };

    Slick.prototype.getLeft = function(slideIndex) {

        var _ = this,
            targetLeft,
            verticalHeight,
            verticalOffset = 0,
            targetSlide;

        _.slideOffset = 0;
        verticalHeight = _.$slides.first().outerHeight(true);

        if (_.options.infinite === true) {
            if (_.slideCount > _.options.slidesToShow) {
                _.slideOffset = (_.slideWidth * _.options.slidesToShow) * -1;
                verticalOffset = (verticalHeight * _.options.slidesToShow) * -1;
            }
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
                    if (slideIndex > _.slideCount) {
                        _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1;
                        verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1;
                    } else {
                        _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1;
                        verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1;
                    }
                }
            }
        } else {
            if (slideIndex + _.options.slidesToShow > _.slideCount) {
                _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth;
                verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight;
            }
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideOffset = 0;
            verticalOffset = 0;
        }

        if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
            _.slideOffset = ((_.slideWidth * Math.floor(_.options.slidesToShow)) / 2) - ((_.slideWidth * _.slideCount) / 2);
        } else if (_.options.centerMode === true && _.options.infinite === true) {
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
        } else if (_.options.centerMode === true) {
            _.slideOffset = 0;
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
        }

        if (_.options.vertical === false) {
            targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset;
        } else {
            targetLeft = ((slideIndex * verticalHeight) * -1) + verticalOffset;
        }

        if (_.options.variableWidth === true) {

            if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
            } else {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
            }

            if (_.options.rtl === true) {
                if (targetSlide[0]) {
                    targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                } else {
                    targetLeft =  0;
                }
            } else {
                targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
            }

            if (_.options.centerMode === true) {
                if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
                } else {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
                }

                if (_.options.rtl === true) {
                    if (targetSlide[0]) {
                        targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                    } else {
                        targetLeft =  0;
                    }
                } else {
                    targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
                }

                targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
            }
        }

        return targetLeft;

    };

    Slick.prototype.getOption = Slick.prototype.slickGetOption = function(option) {

        var _ = this;

        return _.options[option];

    };

    Slick.prototype.getNavigableIndexes = function() {

        var _ = this,
            breakPoint = 0,
            counter = 0,
            indexes = [],
            max;

        if (_.options.infinite === false) {
            max = _.slideCount;
        } else {
            breakPoint = _.options.slidesToScroll * -1;
            counter = _.options.slidesToScroll * -1;
            max = _.slideCount * 2;
        }

        while (breakPoint < max) {
            indexes.push(breakPoint);
            breakPoint = counter + _.options.slidesToScroll;
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }

        return indexes;

    };

    Slick.prototype.getSlick = function() {

        return this;

    };

    Slick.prototype.getSlideCount = function() {

        var _ = this,
            slidesTraversed, swipedSlide, centerOffset;

        centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

        if (_.options.swipeToSlide === true) {
            _.$slideTrack.find('.slick-slide').each(function(index, slide) {
                if (slide.offsetLeft - centerOffset + ($(slide).outerWidth() / 2) > (_.swipeLeft * -1)) {
                    swipedSlide = slide;
                    return false;
                }
            });

            slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

            return slidesTraversed;

        } else {
            return _.options.slidesToScroll;
        }

    };

    Slick.prototype.goTo = Slick.prototype.slickGoTo = function(slide, dontAnimate) {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'index',
                index: parseInt(slide)
            }
        }, dontAnimate);

    };

    Slick.prototype.init = function(creation) {

        var _ = this;

        if (!$(_.$slider).hasClass('slick-initialized')) {

            $(_.$slider).addClass('slick-initialized');

            _.buildRows();
            _.buildOut();
            _.setProps();
            _.startLoad();
            _.loadSlider();
            _.initializeEvents();
            _.updateArrows();
            _.updateDots();
            _.checkResponsive(true);
            _.focusHandler();

        }

        if (creation) {
            _.$slider.trigger('init', [_]);
        }

        if (_.options.accessibility === true) {
            _.initADA();
        }

        if ( _.options.autoplay ) {

            _.paused = false;
            _.autoPlay();

        }

    };

    Slick.prototype.initADA = function() {
        var _ = this;
        _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
            'aria-hidden': 'true',
            'tabindex': '-1'
        }).find('a, input, button, select').attr({
            'tabindex': '-1'
        });

        _.$slideTrack.attr('role', 'listbox');

        _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function(i) {
            $(this).attr('role', 'option');

            //Evenly distribute aria-describedby tags through available dots.
            var describedBySlideId = _.options.centerMode ? i : Math.floor(i / _.options.slidesToShow);

            if (_.options.dots === true) {
                $(this).attr('aria-describedby', 'slick-slide' + _.instanceUid + describedBySlideId + '');
            }
        });

        if (_.$dots !== null) {
            _.$dots.attr('role', 'tablist').find('li').each(function(i) {
                $(this).attr({
                    'role': 'presentation',
                    'aria-selected': 'false',
                    'aria-controls': 'navigation' + _.instanceUid + i + '',
                    'id': 'slick-slide' + _.instanceUid + i + ''
                });
            })
                .first().attr('aria-selected', 'true').end()
                .find('button').attr('role', 'button').end()
                .closest('div').attr('role', 'toolbar');
        }
        _.activateADA();

    };

    Slick.prototype.initArrowEvents = function() {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow
               .off('click.slick')
               .on('click.slick', {
                    message: 'previous'
               }, _.changeSlide);
            _.$nextArrow
               .off('click.slick')
               .on('click.slick', {
                    message: 'next'
               }, _.changeSlide);
        }

    };

    Slick.prototype.initDotEvents = function() {

        var _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            $('li', _.$dots).on('click.slick', {
                message: 'index'
            }, _.changeSlide);
        }

        if ( _.options.dots === true && _.options.pauseOnDotsHover === true ) {

            $('li', _.$dots)
                .on('mouseenter.slick', $.proxy(_.interrupt, _, true))
                .on('mouseleave.slick', $.proxy(_.interrupt, _, false));

        }

    };

    Slick.prototype.initSlideEvents = function() {

        var _ = this;

        if ( _.options.pauseOnHover ) {

            _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true));
            _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false));

        }

    };

    Slick.prototype.initializeEvents = function() {

        var _ = this;

        _.initArrowEvents();

        _.initDotEvents();
        _.initSlideEvents();

        _.$list.on('touchstart.slick mousedown.slick', {
            action: 'start'
        }, _.swipeHandler);
        _.$list.on('touchmove.slick mousemove.slick', {
            action: 'move'
        }, _.swipeHandler);
        _.$list.on('touchend.slick mouseup.slick', {
            action: 'end'
        }, _.swipeHandler);
        _.$list.on('touchcancel.slick mouseleave.slick', {
            action: 'end'
        }, _.swipeHandler);

        _.$list.on('click.slick', _.clickHandler);

        $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

        if (_.options.accessibility === true) {
            _.$list.on('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

        $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

        $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

        $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(document).on('ready.slick.slick-' + _.instanceUid, _.setPosition);

    };

    Slick.prototype.initUI = function() {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.show();
            _.$nextArrow.show();

        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.show();

        }

    };

    Slick.prototype.keyHandler = function(event) {

        var _ = this;
         //Dont slide if the cursor is inside the form fields and arrow keys are pressed
        if(!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
            if (event.keyCode === 37 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'next' :  'previous'
                    }
                });
            } else if (event.keyCode === 39 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'previous' : 'next'
                    }
                });
            }
        }

    };

    Slick.prototype.lazyLoad = function() {

        var _ = this,
            loadRange, cloneRange, rangeStart, rangeEnd;

        function loadImages(imagesScope) {

            $('img[data-lazy]', imagesScope).each(function() {

                var image = $(this),
                    imageSource = $(this).attr('data-lazy'),
                    imageToLoad = document.createElement('img');

                imageToLoad.onload = function() {

                    image
                        .animate({ opacity: 0 }, 100, function() {
                            image
                                .attr('src', imageSource)
                                .animate({ opacity: 1 }, 200, function() {
                                    image
                                        .removeAttr('data-lazy')
                                        .removeClass('slick-loading');
                                });
                            _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
                        });

                };

                imageToLoad.onerror = function() {

                    image
                        .removeAttr( 'data-lazy' )
                        .removeClass( 'slick-loading' )
                        .addClass( 'slick-lazyload-error' );

                    _.$slider.trigger('lazyLoadError', [ _, image, imageSource ]);

                };

                imageToLoad.src = imageSource;

            });

        }

        if (_.options.centerMode === true) {
            if (_.options.infinite === true) {
                rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
                rangeEnd = rangeStart + _.options.slidesToShow + 2;
            } else {
                rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
                rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
            }
        } else {
            rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
            rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
            if (_.options.fade === true) {
                if (rangeStart > 0) rangeStart--;
                if (rangeEnd <= _.slideCount) rangeEnd++;
            }
        }

        loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);
        loadImages(loadRange);

        if (_.slideCount <= _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-slide');
            loadImages(cloneRange);
        } else
        if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
            loadImages(cloneRange);
        } else if (_.currentSlide === 0) {
            cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
            loadImages(cloneRange);
        }

    };

    Slick.prototype.loadSlider = function() {

        var _ = this;

        _.setPosition();

        _.$slideTrack.css({
            opacity: 1
        });

        _.$slider.removeClass('slick-loading');

        _.initUI();

        if (_.options.lazyLoad === 'progressive') {
            _.progressiveLazyLoad();
        }

    };

    Slick.prototype.next = Slick.prototype.slickNext = function() {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'next'
            }
        });

    };

    Slick.prototype.orientationChange = function() {

        var _ = this;

        _.checkResponsive();
        _.setPosition();

    };

    Slick.prototype.pause = Slick.prototype.slickPause = function() {

        var _ = this;

        _.autoPlayClear();
        _.paused = true;

    };

    Slick.prototype.play = Slick.prototype.slickPlay = function() {

        var _ = this;

        _.autoPlay();
        _.options.autoplay = true;
        _.paused = false;
        _.focussed = false;
        _.interrupted = false;

    };

    Slick.prototype.postSlide = function(index) {

        var _ = this;

        if( !_.unslicked ) {

            _.$slider.trigger('afterChange', [_, index]);

            _.animating = false;

            _.setPosition();

            _.swipeLeft = null;

            if ( _.options.autoplay ) {
                _.autoPlay();
            }

            if (_.options.accessibility === true) {
                _.initADA();
            }

        }

    };

    Slick.prototype.prev = Slick.prototype.slickPrev = function() {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'previous'
            }
        });

    };

    Slick.prototype.preventDefault = function(event) {

        event.preventDefault();

    };

    Slick.prototype.progressiveLazyLoad = function( tryCount ) {

        tryCount = tryCount || 1;

        var _ = this,
            $imgsToLoad = $( 'img[data-lazy]', _.$slider ),
            image,
            imageSource,
            imageToLoad;

        if ( $imgsToLoad.length ) {

            image = $imgsToLoad.first();
            imageSource = image.attr('data-lazy');
            imageToLoad = document.createElement('img');

            imageToLoad.onload = function() {

                image
                    .attr( 'src', imageSource )
                    .removeAttr('data-lazy')
                    .removeClass('slick-loading');

                if ( _.options.adaptiveHeight === true ) {
                    _.setPosition();
                }

                _.$slider.trigger('lazyLoaded', [ _, image, imageSource ]);
                _.progressiveLazyLoad();

            };

            imageToLoad.onerror = function() {

                if ( tryCount < 3 ) {

                    /**
                     * try to load the image 3 times,
                     * leave a slight delay so we don't get
                     * servers blocking the request.
                     */
                    setTimeout( function() {
                        _.progressiveLazyLoad( tryCount + 1 );
                    }, 500 );

                } else {

                    image
                        .removeAttr( 'data-lazy' )
                        .removeClass( 'slick-loading' )
                        .addClass( 'slick-lazyload-error' );

                    _.$slider.trigger('lazyLoadError', [ _, image, imageSource ]);

                    _.progressiveLazyLoad();

                }

            };

            imageToLoad.src = imageSource;

        } else {

            _.$slider.trigger('allImagesLoaded', [ _ ]);

        }

    };

    Slick.prototype.refresh = function( initializing ) {

        var _ = this, currentSlide, lastVisibleIndex;

        lastVisibleIndex = _.slideCount - _.options.slidesToShow;

        // in non-infinite sliders, we don't want to go past the
        // last visible index.
        if( !_.options.infinite && ( _.currentSlide > lastVisibleIndex )) {
            _.currentSlide = lastVisibleIndex;
        }

        // if less slides than to show, go to start.
        if ( _.slideCount <= _.options.slidesToShow ) {
            _.currentSlide = 0;

        }

        currentSlide = _.currentSlide;

        _.destroy(true);

        $.extend(_, _.initials, { currentSlide: currentSlide });

        _.init();

        if( !initializing ) {

            _.changeSlide({
                data: {
                    message: 'index',
                    index: currentSlide
                }
            }, false);

        }

    };

    Slick.prototype.registerBreakpoints = function() {

        var _ = this, breakpoint, currentBreakpoint, l,
            responsiveSettings = _.options.responsive || null;

        if ( $.type(responsiveSettings) === 'array' && responsiveSettings.length ) {

            _.respondTo = _.options.respondTo || 'window';

            for ( breakpoint in responsiveSettings ) {

                l = _.breakpoints.length-1;
                currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

                if (responsiveSettings.hasOwnProperty(breakpoint)) {

                    // loop through the breakpoints and cut out any existing
                    // ones with the same breakpoint number, we don't want dupes.
                    while( l >= 0 ) {
                        if( _.breakpoints[l] && _.breakpoints[l] === currentBreakpoint ) {
                            _.breakpoints.splice(l,1);
                        }
                        l--;
                    }

                    _.breakpoints.push(currentBreakpoint);
                    _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;

                }

            }

            _.breakpoints.sort(function(a, b) {
                return ( _.options.mobileFirst ) ? a-b : b-a;
            });

        }

    };

    Slick.prototype.reinit = function() {

        var _ = this;

        _.$slides =
            _.$slideTrack
                .children(_.options.slide)
                .addClass('slick-slide');

        _.slideCount = _.$slides.length;

        if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
            _.currentSlide = _.currentSlide - _.options.slidesToScroll;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        _.registerBreakpoints();

        _.setProps();
        _.setupInfinite();
        _.buildArrows();
        _.updateArrows();
        _.initArrowEvents();
        _.buildDots();
        _.updateDots();
        _.initDotEvents();
        _.cleanUpSlideEvents();
        _.initSlideEvents();

        _.checkResponsive(false, true);

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        _.setPosition();
        _.focusHandler();

        _.paused = !_.options.autoplay;
        _.autoPlay();

        _.$slider.trigger('reInit', [_]);

    };

    Slick.prototype.resize = function() {

        var _ = this;

        if ($(window).width() !== _.windowWidth) {
            clearTimeout(_.windowDelay);
            _.windowDelay = window.setTimeout(function() {
                _.windowWidth = $(window).width();
                _.checkResponsive();
                if( !_.unslicked ) { _.setPosition(); }
            }, 50);
        }
    };

    Slick.prototype.removeSlide = Slick.prototype.slickRemove = function(index, removeBefore, removeAll) {

        var _ = this;

        if (typeof(index) === 'boolean') {
            removeBefore = index;
            index = removeBefore === true ? 0 : _.slideCount - 1;
        } else {
            index = removeBefore === true ? --index : index;
        }

        if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
            return false;
        }

        _.unload();

        if (removeAll === true) {
            _.$slideTrack.children().remove();
        } else {
            _.$slideTrack.children(this.options.slide).eq(index).remove();
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slidesCache = _.$slides;

        _.reinit();

    };

    Slick.prototype.setCSS = function(position) {

        var _ = this,
            positionProps = {},
            x, y;

        if (_.options.rtl === true) {
            position = -position;
        }
        x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
        y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

        positionProps[_.positionProp] = position;

        if (_.transformsEnabled === false) {
            _.$slideTrack.css(positionProps);
        } else {
            positionProps = {};
            if (_.cssTransitions === false) {
                positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
                _.$slideTrack.css(positionProps);
            } else {
                positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
                _.$slideTrack.css(positionProps);
            }
        }

    };

    Slick.prototype.setDimensions = function() {

        var _ = this;

        if (_.options.vertical === false) {
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: ('0px ' + _.options.centerPadding)
                });
            }
        } else {
            _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: (_.options.centerPadding + ' 0px')
                });
            }
        }

        _.listWidth = _.$list.width();
        _.listHeight = _.$list.height();


        if (_.options.vertical === false && _.options.variableWidth === false) {
            _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
            _.$slideTrack.width(Math.ceil((_.slideWidth * _.$slideTrack.children('.slick-slide').length)));

        } else if (_.options.variableWidth === true) {
            _.$slideTrack.width(5000 * _.slideCount);
        } else {
            _.slideWidth = Math.ceil(_.listWidth);
            _.$slideTrack.height(Math.ceil((_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length)));
        }

        var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();
        if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset);

    };

    Slick.prototype.setFade = function() {

        var _ = this,
            targetLeft;

        _.$slides.each(function(index, element) {
            targetLeft = (_.slideWidth * index) * -1;
            if (_.options.rtl === true) {
                $(element).css({
                    position: 'relative',
                    right: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            } else {
                $(element).css({
                    position: 'relative',
                    left: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            }
        });

        _.$slides.eq(_.currentSlide).css({
            zIndex: _.options.zIndex - 1,
            opacity: 1
        });

    };

    Slick.prototype.setHeight = function() {

        var _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.css('height', targetHeight);
        }

    };

    Slick.prototype.setOption =
    Slick.prototype.slickSetOption = function() {

        /**
         * accepts arguments in format of:
         *
         *  - for changing a single option's value:
         *     .slick("setOption", option, value, refresh )
         *
         *  - for changing a set of responsive options:
         *     .slick("setOption", 'responsive', [{}, ...], refresh )
         *
         *  - for updating multiple values at once (not responsive)
         *     .slick("setOption", { 'option': value, ... }, refresh )
         */

        var _ = this, l, item, option, value, refresh = false, type;

        if( $.type( arguments[0] ) === 'object' ) {

            option =  arguments[0];
            refresh = arguments[1];
            type = 'multiple';

        } else if ( $.type( arguments[0] ) === 'string' ) {

            option =  arguments[0];
            value = arguments[1];
            refresh = arguments[2];

            if ( arguments[0] === 'responsive' && $.type( arguments[1] ) === 'array' ) {

                type = 'responsive';

            } else if ( typeof arguments[1] !== 'undefined' ) {

                type = 'single';

            }

        }

        if ( type === 'single' ) {

            _.options[option] = value;


        } else if ( type === 'multiple' ) {

            $.each( option , function( opt, val ) {

                _.options[opt] = val;

            });


        } else if ( type === 'responsive' ) {

            for ( item in value ) {

                if( $.type( _.options.responsive ) !== 'array' ) {

                    _.options.responsive = [ value[item] ];

                } else {

                    l = _.options.responsive.length-1;

                    // loop through the responsive object and splice out duplicates.
                    while( l >= 0 ) {

                        if( _.options.responsive[l].breakpoint === value[item].breakpoint ) {

                            _.options.responsive.splice(l,1);

                        }

                        l--;

                    }

                    _.options.responsive.push( value[item] );

                }

            }

        }

        if ( refresh ) {

            _.unload();
            _.reinit();

        }

    };

    Slick.prototype.setPosition = function() {

        var _ = this;

        _.setDimensions();

        _.setHeight();

        if (_.options.fade === false) {
            _.setCSS(_.getLeft(_.currentSlide));
        } else {
            _.setFade();
        }

        _.$slider.trigger('setPosition', [_]);

    };

    Slick.prototype.setProps = function() {

        var _ = this,
            bodyStyle = document.body.style;

        _.positionProp = _.options.vertical === true ? 'top' : 'left';

        if (_.positionProp === 'top') {
            _.$slider.addClass('slick-vertical');
        } else {
            _.$slider.removeClass('slick-vertical');
        }

        if (bodyStyle.WebkitTransition !== undefined ||
            bodyStyle.MozTransition !== undefined ||
            bodyStyle.msTransition !== undefined) {
            if (_.options.useCSS === true) {
                _.cssTransitions = true;
            }
        }

        if ( _.options.fade ) {
            if ( typeof _.options.zIndex === 'number' ) {
                if( _.options.zIndex < 3 ) {
                    _.options.zIndex = 3;
                }
            } else {
                _.options.zIndex = _.defaults.zIndex;
            }
        }

        if (bodyStyle.OTransform !== undefined) {
            _.animType = 'OTransform';
            _.transformType = '-o-transform';
            _.transitionType = 'OTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.MozTransform !== undefined) {
            _.animType = 'MozTransform';
            _.transformType = '-moz-transform';
            _.transitionType = 'MozTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.webkitTransform !== undefined) {
            _.animType = 'webkitTransform';
            _.transformType = '-webkit-transform';
            _.transitionType = 'webkitTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.msTransform !== undefined) {
            _.animType = 'msTransform';
            _.transformType = '-ms-transform';
            _.transitionType = 'msTransition';
            if (bodyStyle.msTransform === undefined) _.animType = false;
        }
        if (bodyStyle.transform !== undefined && _.animType !== false) {
            _.animType = 'transform';
            _.transformType = 'transform';
            _.transitionType = 'transition';
        }
        _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false);
    };


    Slick.prototype.setSlideClasses = function(index) {

        var _ = this,
            centerOffset, allSlides, indexOffset, remainder;

        allSlides = _.$slider
            .find('.slick-slide')
            .removeClass('slick-active slick-center slick-current')
            .attr('aria-hidden', 'true');

        _.$slides
            .eq(index)
            .addClass('slick-current');

        if (_.options.centerMode === true) {

            centerOffset = Math.floor(_.options.slidesToShow / 2);

            if (_.options.infinite === true) {

                if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {

                    _.$slides
                        .slice(index - centerOffset, index + centerOffset + 1)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                } else {

                    indexOffset = _.options.slidesToShow + index;
                    allSlides
                        .slice(indexOffset - centerOffset + 1, indexOffset + centerOffset + 2)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                }

                if (index === 0) {

                    allSlides
                        .eq(allSlides.length - 1 - _.options.slidesToShow)
                        .addClass('slick-center');

                } else if (index === _.slideCount - 1) {

                    allSlides
                        .eq(_.options.slidesToShow)
                        .addClass('slick-center');

                }

            }

            _.$slides
                .eq(index)
                .addClass('slick-center');

        } else {

            if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {

                _.$slides
                    .slice(index, index + _.options.slidesToShow)
                    .addClass('slick-active')
                    .attr('aria-hidden', 'false');

            } else if (allSlides.length <= _.options.slidesToShow) {

                allSlides
                    .addClass('slick-active')
                    .attr('aria-hidden', 'false');

            } else {

                remainder = _.slideCount % _.options.slidesToShow;
                indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

                if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {

                    allSlides
                        .slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                } else {

                    allSlides
                        .slice(indexOffset, indexOffset + _.options.slidesToShow)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                }

            }

        }

        if (_.options.lazyLoad === 'ondemand') {
            _.lazyLoad();
        }

    };

    Slick.prototype.setupInfinite = function() {

        var _ = this,
            i, slideIndex, infiniteCount;

        if (_.options.fade === true) {
            _.options.centerMode = false;
        }

        if (_.options.infinite === true && _.options.fade === false) {

            slideIndex = null;

            if (_.slideCount > _.options.slidesToShow) {

                if (_.options.centerMode === true) {
                    infiniteCount = _.options.slidesToShow + 1;
                } else {
                    infiniteCount = _.options.slidesToShow;
                }

                for (i = _.slideCount; i > (_.slideCount -
                        infiniteCount); i -= 1) {
                    slideIndex = i - 1;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '')
                        .attr('data-slick-index', slideIndex - _.slideCount)
                        .prependTo(_.$slideTrack).addClass('slick-cloned');
                }
                for (i = 0; i < infiniteCount; i += 1) {
                    slideIndex = i;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '')
                        .attr('data-slick-index', slideIndex + _.slideCount)
                        .appendTo(_.$slideTrack).addClass('slick-cloned');
                }
                _.$slideTrack.find('.slick-cloned').find('[id]').each(function() {
                    $(this).attr('id', '');
                });

            }

        }

    };

    Slick.prototype.interrupt = function( toggle ) {

        var _ = this;

        if( !toggle ) {
            _.autoPlay();
        }
        _.interrupted = toggle;

    };

    Slick.prototype.selectHandler = function(event) {

        var _ = this;

        var targetElement =
            $(event.target).is('.slick-slide') ?
                $(event.target) :
                $(event.target).parents('.slick-slide');

        var index = parseInt(targetElement.attr('data-slick-index'));

        if (!index) index = 0;

        if (_.slideCount <= _.options.slidesToShow) {

            _.setSlideClasses(index);
            _.asNavFor(index);
            return;

        }

        _.slideHandler(index);

    };

    Slick.prototype.slideHandler = function(index, sync, dontAnimate) {

        var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null,
            _ = this, navTarget;

        sync = sync || false;

        if (_.animating === true && _.options.waitForAnimate === true) {
            return;
        }

        if (_.options.fade === true && _.currentSlide === index) {
            return;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            return;
        }

        if (sync === false) {
            _.asNavFor(index);
        }

        targetSlide = index;
        targetLeft = _.getLeft(targetSlide);
        slideLeft = _.getLeft(_.currentSlide);

        _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

        if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true) {
                    _.animateSlide(slideLeft, function() {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true) {
                    _.animateSlide(slideLeft, function() {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        }

        if ( _.options.autoplay ) {
            clearInterval(_.autoPlayTimer);
        }

        if (targetSlide < 0) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll);
            } else {
                animSlide = _.slideCount + targetSlide;
            }
        } else if (targetSlide >= _.slideCount) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = 0;
            } else {
                animSlide = targetSlide - _.slideCount;
            }
        } else {
            animSlide = targetSlide;
        }

        _.animating = true;

        _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);

        oldSlide = _.currentSlide;
        _.currentSlide = animSlide;

        _.setSlideClasses(_.currentSlide);

        if ( _.options.asNavFor ) {

            navTarget = _.getNavTarget();
            navTarget = navTarget.slick('getSlick');

            if ( navTarget.slideCount <= navTarget.options.slidesToShow ) {
                navTarget.setSlideClasses(_.currentSlide);
            }

        }

        _.updateDots();
        _.updateArrows();

        if (_.options.fade === true) {
            if (dontAnimate !== true) {

                _.fadeSlideOut(oldSlide);

                _.fadeSlide(animSlide, function() {
                    _.postSlide(animSlide);
                });

            } else {
                _.postSlide(animSlide);
            }
            _.animateHeight();
            return;
        }

        if (dontAnimate !== true) {
            _.animateSlide(targetLeft, function() {
                _.postSlide(animSlide);
            });
        } else {
            _.postSlide(animSlide);
        }

    };

    Slick.prototype.startLoad = function() {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.hide();
            _.$nextArrow.hide();

        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.hide();

        }

        _.$slider.addClass('slick-loading');

    };

    Slick.prototype.swipeDirection = function() {

        var xDist, yDist, r, swipeAngle, _ = this;

        xDist = _.touchObject.startX - _.touchObject.curX;
        yDist = _.touchObject.startY - _.touchObject.curY;
        r = Math.atan2(yDist, xDist);

        swipeAngle = Math.round(r * 180 / Math.PI);
        if (swipeAngle < 0) {
            swipeAngle = 360 - Math.abs(swipeAngle);
        }

        if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
            return (_.options.rtl === false ? 'right' : 'left');
        }
        if (_.options.verticalSwiping === true) {
            if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
                return 'down';
            } else {
                return 'up';
            }
        }

        return 'vertical';

    };

    Slick.prototype.swipeEnd = function(event) {

        var _ = this,
            slideCount,
            direction;

        _.dragging = false;
        _.interrupted = false;
        _.shouldClick = ( _.touchObject.swipeLength > 10 ) ? false : true;

        if ( _.touchObject.curX === undefined ) {
            return false;
        }

        if ( _.touchObject.edgeHit === true ) {
            _.$slider.trigger('edge', [_, _.swipeDirection() ]);
        }

        if ( _.touchObject.swipeLength >= _.touchObject.minSwipe ) {

            direction = _.swipeDirection();

            switch ( direction ) {

                case 'left':
                case 'down':

                    slideCount =
                        _.options.swipeToSlide ?
                            _.checkNavigable( _.currentSlide + _.getSlideCount() ) :
                            _.currentSlide + _.getSlideCount();

                    _.currentDirection = 0;

                    break;

                case 'right':
                case 'up':

                    slideCount =
                        _.options.swipeToSlide ?
                            _.checkNavigable( _.currentSlide - _.getSlideCount() ) :
                            _.currentSlide - _.getSlideCount();

                    _.currentDirection = 1;

                    break;

                default:


            }

            if( direction != 'vertical' ) {

                _.slideHandler( slideCount );
                _.touchObject = {};
                _.$slider.trigger('swipe', [_, direction ]);

            }

        } else {

            if ( _.touchObject.startX !== _.touchObject.curX ) {

                _.slideHandler( _.currentSlide );
                _.touchObject = {};

            }

        }

    };

    Slick.prototype.swipeHandler = function(event) {

        var _ = this;

        if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
            return;
        } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
            return;
        }

        _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
            event.originalEvent.touches.length : 1;

        _.touchObject.minSwipe = _.listWidth / _.options
            .touchThreshold;

        if (_.options.verticalSwiping === true) {
            _.touchObject.minSwipe = _.listHeight / _.options
                .touchThreshold;
        }

        switch (event.data.action) {

            case 'start':
                _.swipeStart(event);
                break;

            case 'move':
                _.swipeMove(event);
                break;

            case 'end':
                _.swipeEnd(event);
                break;

        }

    };

    Slick.prototype.swipeMove = function(event) {

        var _ = this,
            edgeWasHit = false,
            curLeft, swipeDirection, swipeLength, positionOffset, touches;

        touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

        if (!_.dragging || touches && touches.length !== 1) {
            return false;
        }

        curLeft = _.getLeft(_.currentSlide);

        _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
        _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

        _.touchObject.swipeLength = Math.round(Math.sqrt(
            Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

        if (_.options.verticalSwiping === true) {
            _.touchObject.swipeLength = Math.round(Math.sqrt(
                Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));
        }

        swipeDirection = _.swipeDirection();

        if (swipeDirection === 'vertical') {
            return;
        }

        if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
            event.preventDefault();
        }

        positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
        if (_.options.verticalSwiping === true) {
            positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
        }


        swipeLength = _.touchObject.swipeLength;

        _.touchObject.edgeHit = false;

        if (_.options.infinite === false) {
            if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
                swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
                _.touchObject.edgeHit = true;
            }
        }

        if (_.options.vertical === false) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        } else {
            _.swipeLeft = curLeft + (swipeLength * (_.$list.height() / _.listWidth)) * positionOffset;
        }
        if (_.options.verticalSwiping === true) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        }

        if (_.options.fade === true || _.options.touchMove === false) {
            return false;
        }

        if (_.animating === true) {
            _.swipeLeft = null;
            return false;
        }

        _.setCSS(_.swipeLeft);

    };

    Slick.prototype.swipeStart = function(event) {

        var _ = this,
            touches;

        _.interrupted = true;

        if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
            _.touchObject = {};
            return false;
        }

        if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
            touches = event.originalEvent.touches[0];
        }

        _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
        _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

        _.dragging = true;

    };

    Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function() {

        var _ = this;

        if (_.$slidesCache !== null) {

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.appendTo(_.$slideTrack);

            _.reinit();

        }

    };

    Slick.prototype.unload = function() {

        var _ = this;

        $('.slick-cloned', _.$slider).remove();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
            _.$prevArrow.remove();
        }

        if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
            _.$nextArrow.remove();
        }

        _.$slides
            .removeClass('slick-slide slick-active slick-visible slick-current')
            .attr('aria-hidden', 'true')
            .css('width', '');

    };

    Slick.prototype.unslick = function(fromBreakpoint) {

        var _ = this;
        _.$slider.trigger('unslick', [_, fromBreakpoint]);
        _.destroy();

    };

    Slick.prototype.updateArrows = function() {

        var _ = this,
            centerOffset;

        centerOffset = Math.floor(_.options.slidesToShow / 2);

        if ( _.options.arrows === true &&
            _.slideCount > _.options.slidesToShow &&
            !_.options.infinite ) {

            _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            if (_.currentSlide === 0) {

                _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            }

        }

    };

    Slick.prototype.updateDots = function() {

        var _ = this;

        if (_.$dots !== null) {

            _.$dots
                .find('li')
                .removeClass('slick-active')
                .attr('aria-hidden', 'true');

            _.$dots
                .find('li')
                .eq(Math.floor(_.currentSlide / _.options.slidesToScroll))
                .addClass('slick-active')
                .attr('aria-hidden', 'false');

        }

    };

    Slick.prototype.visibility = function() {

        var _ = this;

        if ( _.options.autoplay ) {

            if ( document[_.hidden] ) {

                _.interrupted = true;

            } else {

                _.interrupted = false;

            }

        }

    };

    $.fn.slick = function() {
        var _ = this,
            opt = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;
        for (i = 0; i < l; i++) {
            if (typeof opt == 'object' || typeof opt == 'undefined')
                _[i].slick = new Slick(_[i], opt);
            else
                ret = _[i].slick[opt].apply(_[i].slick, args);
            if (typeof ret != 'undefined') return ret;
        }
        return _;
    };

}));