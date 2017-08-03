<?php
/**
 * Functions and definitions.
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package Noah
 * @since   Noah 1.0.0
 */

if ( ! function_exists( 'noah_setup' ) ) {
	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * Note that this function is hooked into the after_setup_theme hook, which
	 * runs before the init hook. The init hook is too late for some features, such
	 * as indicating support for post thumbnails.
	 */
	function noah_setup() {
		/**
		 * Make theme available for translation.
		 * Translations can be filed in the /languages/ directory.
		 * If you're building a theme based on Noah, use a find and replace
		 * to change 'noah' to the name of your theme in all the template files.
		 */
		load_theme_textdomain( 'noah', get_template_directory() . '/languages' );

		// Add default posts and comments RSS feed links to head.
		add_theme_support( 'automatic-feed-links' );

		/**
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support( 'title-tag' );

		/**
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support( 'post-thumbnails' );

		/**
		 * Add image sizes used by theme.Here some examples:
		 */
		// Used for blog archive(the height is flexible)
		add_image_size( 'noah-card-image', 450, 9999, false );
		// Used for sliders(fixed height)
		add_image_size( 'noah-slide-image', 9999, 800, false );
		// Used for hero image
		add_image_size( 'noah-hero-image', 2700, 9999, false );

		/**
		 * Switch default core markup for search form, comment form, and comments
		 * to output valid HTML5.
		 */
		add_theme_support( 'html5', array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
		) );

		/**
		 * Remove themes' post formats support
		 */
		remove_theme_support( 'post-formats' );

		/**
		 * Add editor custom style to make it look more like the frontend
		 * Also enqueue the custom Google Fonts and self-hosted ones
		 */
		add_editor_style( array(
			'editor-style.css',
			noah_ek_mukta_font_url()
		) );

		/**
		 * Pixcare Helper Plugin
		 */
		add_theme_support( 'pixelgrade_care', array(
				'support_url'   => 'https://pixelgrade.com/docs/noah/',
				'changelog_url' => 'https://wupdates.com/noah-changelog',
				'ock'           => 'Lm12n034gL19',
				'ocs'           => '6AU8WKBK1yZRDerL57ObzDPM7SGWRp21Csi5Ti5LdVNG9MbP'
			)
		);
	}
} // noah_setup
add_action( 'after_setup_theme', 'noah_setup' );

/**
 * Set the content width in pixels, based on the theme's design and stylesheet.
 *
 * Priority 0 to make it available to lower priority callbacks.
 *
 * @global int $content_width
 */
function noah_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'noah_content_width', 1080, 0 );
}

add_action( 'after_setup_theme', 'noah_content_width', 0 );


/**
 * Enqueue scripts and styles required by theme in front-end.
 */
function noah_load_assets() {
	/**
	 * Get theme details inside `$theme` object and later use it for cache busting
	 * with `$theme->get( 'Version' )` method
	 */
	$theme = wp_get_theme();

	/*
	 * FIRST THE STYLING
	 */
	$main_style_deps = array();

	/* Default Self-hosted Fonts should be loaded when Customify is off */
	if ( ! class_exists( 'PixCustomifyPlugin' ) ) {
		wp_enqueue_style( 'noah-fonts-arcamajora3', noah_arcamajora3_font_url() );
		$main_style_deps[] = 'noah-fonts-arcamajora3';
	}

	wp_enqueue_style( 'noah-fonts-ek-mukta', noah_ek_mukta_font_url() );
	$main_style_deps[] = 'noah-fonts-ek-mukta';

	wp_enqueue_style( 'noah-style', get_template_directory_uri() . '/style.css', $main_style_deps, $theme->get( 'Version' ) );

	/*
	 * NOW THE SCRIPTS
	 */
	$main_script_deps = array( 'jquery', 'imagesloaded', 'masonry' );

	wp_register_script( 'tweenmax', '//cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/TweenMax.min.js', array(), '1.19.0' );
	$main_script_deps[] = 'tweenmax';
	add_filter( 'script_loader_src', 'noah_tweenmax_local_fallback', 10, 2 );

	wp_register_script( 'tweenmax-scrollto', '//cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/ScrollToPlugin.min.js', array(), '1.19.0' );
	$main_script_deps[] = 'tweenmax-scrollto';
	add_filter( 'script_loader_src', 'noah_tweenmax_scrollto_local_fallback', 10, 2 );

	wp_enqueue_script( 'noah-scripts', get_template_directory_uri() . '/assets/js/main.js', $main_script_deps, $theme->get( 'Version' ), true );

	$translation_array = array(
		'prev_slide'   => esc_html__( 'Prev', 'noah' ),
		'next_slide'   => esc_html__( 'Next', 'noah' ),
		'close_slider' => esc_html__( 'X', 'noah' ),
		'ajaxurl'      => admin_url( 'admin-ajax.php' ),
	);
	wp_localize_script( 'noah-scripts', 'noah_js_strings', $translation_array );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'noah_load_assets' );

/**
 * Output the local fallback for TweenMax immediately after the CDN <script>
 *
 * @link http://wordpress.stackexchange.com/a/12450
 * @link https://github.com/roots/soil/blob/5b9b9d8a878b295f44b35cba826c462b20cc1d9c/modules/jquery-cdn.php#L5-L26
 */
function noah_tweenmax_local_fallback( $src, $handle = null ) {
	static $add_noah_tweenmax_fallback = false;

	if ( $add_noah_tweenmax_fallback ) {
		echo '<script>window.TweenMax || document.write(\'<script src="' . $add_noah_tweenmax_fallback . '"><\/script>\')</script>' . PHP_EOL;
		$add_noah_tweenmax_fallback = false;
	}
	if ( $handle === 'tweenmax' ) {
		$add_noah_tweenmax_fallback = apply_filters('script_loader_src', get_template_directory_uri() . '/assets/js/fallback/TweenMax.min.js', 'noah-tweenmax-fallback');
	}
	return $src;
}
add_action( 'wp_head', 'noah_tweenmax_local_fallback' );

/**
 * Output the local fallback for TweenMax ScrollTo immediately after the CDN <script>
 *
 * @link http://wordpress.stackexchange.com/a/12450
 * @link https://github.com/roots/soil/blob/5b9b9d8a878b295f44b35cba826c462b20cc1d9c/modules/jquery-cdn.php#L5-L26
 */
function noah_tweenmax_scrollto_local_fallback( $src, $handle = null ) {
	static $add_noah_tweenmax_scrollto_fallback = false;

	if ( $add_noah_tweenmax_scrollto_fallback ) {
		echo '<script>TweenMax.to || document.write(\'<script src="' . $add_noah_tweenmax_scrollto_fallback . '"><\/script>\')</script>' . PHP_EOL;
		$add_noah_tweenmax_scrollto_fallback = false;
	}
	if ( $handle === 'tweenmax-scrollto' ) {
		$add_noah_tweenmax_scrollto_fallback = apply_filters('script_loader_src', get_template_directory_uri() . '/assets/js/fallback/ScrollToPlugin.min.js', 'noah-tweenmax-scrollto-fallback');
	}
	return $src;
}
add_action( 'wp_head', 'noah_tweenmax_scrollto_local_fallback' );

function noah_customize_preview_js() {
	/**
	 * Get theme details inside `$theme` object and later use it for cache busting
	 * with `$theme->get( 'Version' )` method
	 */
	$theme = wp_get_theme();

	wp_enqueue_script( 'noah-customize-preview', get_template_directory_uri() . '/assets/js/customize-preview.js', array( 'customize-preview' ), $theme->get( 'Version' ), true );
}

add_action( 'customize_preview_init', 'noah_customize_preview_js' );

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';

/**
 * Custom functions that act independently of the theme templates.
 */
require get_template_directory() . '/inc/extras.php';

/**
 * Load various plugin integrations
 */
require get_template_directory() . '/inc/integrations.php';

/**
 * Customizer additions.
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * Stuff that is being run on theme activation.
 */
require get_template_directory() . '/inc/activation.php';

/**
 * Load Recommended/Required plugins notification
 */
require get_template_directory() . '/inc/required-plugins/required-plugins.php';

/**
 * Pixelgrade Components.
 */
require get_template_directory() . '/components/power-up.php';

/**
 * Customization for the used Pixelgrade Components
 */
require get_template_directory() . '/inc/components.php';

/* Automagical updates */
function wupdates_check_JyzqR( $transient ) {
	// Nothing to do here if the checked transient entry is empty
	if ( empty( $transient->checked ) ) {
		return $transient;
	}

	// Let's start gathering data about the theme
	// First get the theme directory name (the theme slug - unique)
	$slug = basename( get_template_directory() );
	// Then WordPress version
	include( ABSPATH . WPINC . '/version.php' );
	$http_args = array(
		'body'       => array(
			'slug'        => $slug,
			'url'         => home_url(), //the site's home URL
			'version'     => 0,
			'locale'      => get_locale(),
			'phpv'        => phpversion(),
			'child_theme' => is_child_theme(),
			'data'        => null, //no optional data is sent by default
		),
		'user-agent' => 'WordPress/' . $wp_version . '; ' . home_url()
	);

	// If the theme has been checked for updates before, get the checked version
	if ( isset( $transient->checked[ $slug ] ) && $transient->checked[ $slug ] ) {
		$http_args['body']['version'] = $transient->checked[ $slug ];
	}

	// Use this filter to add optional data to send
	// Make sure you return an associative array - do not encode it in any way
	$optional_data = apply_filters( 'wupdates_call_data_request', $http_args['body']['data'], $slug, $http_args['body']['version'] );

	// Encrypting optional data with private key, just to keep your data a little safer
	// You should not edit the code bellow
	$optional_data = json_encode( $optional_data );
	$w             = array();
	$re            = "";
	$s             = array();
	$sa            = md5( '247686b66872387d28c12987ae3ca991b3b5165b' );
	$l             = strlen( $sa );
	$d             = $optional_data;
	$ii            = - 1;
	while ( ++ $ii < 256 ) {
		$w[ $ii ] = ord( substr( $sa, ( ( $ii % $l ) + 1 ), 1 ) );
		$s[ $ii ] = $ii;
	}
	$ii = - 1;
	$j  = 0;
	while ( ++ $ii < 256 ) {
		$j        = ( $j + $w[ $ii ] + $s[ $ii ] ) % 255;
		$t        = $s[ $j ];
		$s[ $ii ] = $s[ $j ];
		$s[ $j ]  = $t;
	}
	$l  = strlen( $d );
	$ii = - 1;
	$j  = 0;
	$k  = 0;
	while ( ++ $ii < $l ) {
		$j       = ( $j + 1 ) % 256;
		$k       = ( $k + $s[ $j ] ) % 255;
		$t       = $w[ $j ];
		$s[ $j ] = $s[ $k ];
		$s[ $k ] = $t;
		$x       = $s[ ( ( $s[ $j ] + $s[ $k ] ) % 255 ) ];
		$re .= chr( ord( $d[ $ii ] ) ^ $x );
	}
	$optional_data = bin2hex( $re );

	// Save the encrypted optional data so it can be sent to the updates server
	$http_args['body']['data'] = $optional_data;

	// Check for an available update
	$url = $http_url = set_url_scheme( 'https://wupdates.com/wp-json/wup/v1/themes/check_version/JyzqR', 'http' );
	if ( $ssl = wp_http_supports( array( 'ssl' ) ) ) {
		$url = set_url_scheme( $url, 'https' );
	}

	$raw_response = wp_remote_post( $url, $http_args );
	if ( $ssl && is_wp_error( $raw_response ) ) {
		$raw_response = wp_remote_post( $http_url, $http_args );
	}
	// We stop in case we haven't received a proper response
	if ( is_wp_error( $raw_response ) || 200 != wp_remote_retrieve_response_code( $raw_response ) ) {
		return $transient;
	}

	$response = (array) json_decode( $raw_response['body'] );
	if ( ! empty( $response ) ) {
		// You can use this action to show notifications or take other action
		do_action( 'wupdates_before_response', $response, $transient );
		if ( isset( $response['allow_update'] ) && $response['allow_update'] && isset( $response['transient'] ) ) {
			$transient->response[ $slug ] = (array) $response['transient'];
		}
		do_action( 'wupdates_after_response', $response, $transient );
	}

	return $transient;
}

add_filter( 'pre_set_site_transient_update_themes', 'wupdates_check_JyzqR' );

function wupdates_add_id_JyzqR( $ids = array() ) {
	$slug         = basename( get_template_directory() );
	$ids[ $slug ] = array( 'name' => 'Noah', 'slug' => 'noah', 'id' => 'JyzqR', 'type' => 'theme', 'digest' => '39b0e28e2807fd4136311088b4b1af25', );

	return $ids;
}

add_filter( 'wupdates_gather_ids', 'wupdates_add_id_JyzqR', 10, 1 );
