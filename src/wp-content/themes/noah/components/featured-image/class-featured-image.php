<?php
/**
 * Replaces the featured image with a more advanced metabox that has a featured image and a hover image
 *
 * Everything gets hooked up and bolted in here.
 *
 * @see        https://pixelgrade.com
 * @author     Pixelgrade
 * @package    Components/Featured-Image
 * @version    1.0.5
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

//Load our component's template tags
pxg_load_component_file( 'featured-image', 'template-tags' );

class Pixelgrade_Feature_Image {
	public $_version  = '1.0.5';
	public $_assets_version = '1.0.0';

	private static $_instance = null;

	public function __construct() {
		$this->register_hooks();
	}

	/**
	 * Register our actions and filters
	 */
	public function register_hooks() {
		// We only do anything if the PixTypes plugin is active
		if ( class_exists( 'PixTypesPlugin' ) ) {

			// Setup how things will behave in the WP admin area
			add_action( 'admin_init', array( $this, 'admin_init' ) );

			// Remove the Featured image metabox
			add_action( 'add_meta_boxes', array( $this, 'remove_featured_image_metabox' ) );

			// Make sure that we save the featured image in the same way the core does - a value of -1 means delete the meta data, not saving it
			add_filter( 'cmb_validate_image', array( $this, 'save_featured_image_meta' ), 10, 3 );

			// Enqueue assets for the admin
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );

			// Others might want to know about this and get a chance to do their own work (like messing with our's :) )
			do_action( 'pixelgrade_featured_image_registered_hooks' );
		}

		// Setup our featured image PixTypes configuration
		// We need to do this regardless of the presence of PixTypes so we avoid the chicken and egg problem of the theme activating the plugin via PixCare
		add_filter( 'pixtypes_theme_activation_config', array( $this, 'pixtypes_config' ), 10, 1 );
	}

	/**
	 * Change the PixTypes theme config depending on our needs
	 *
	 * @param array $config
	 *
	 * @return array
	 */
	public function pixtypes_config( $config ) {
		// These are the PixTypes configs for the metaboxes for each post type
		$featured_image_metaboxes = array(
			//The Hero Background controls - For pages
			'enhanced_featured_image' => array(
				'id'         => 'enhanced_featured_image',
				'title'      => esc_html__( 'Thumbnail', 'noah' )
				                . ' <span class="tooltip" title="<' . 'title>'
				                . __( 'Thumbnail (Featured Image)', 'noah' )
				                . '</title><p>'
				                . __( 'The  image will be displayed on the Portfolio Grid as a thumbnail for the current project.', 'noah' )
				                . '</p><p>'
				                . __( '<strong>Thumbnail Hover</strong>', 'noah' )
				                . '</p><p>'
				                . __( 'Set an alternative background image when the mouse hovers the thumbnail. It will fill the thumbnail area and it will be vertical and horizontal centered.', 'noah' )
				                . '</p>"></span>',
				'pages'      => apply_filters( 'pixelgrade_featured_image_post_types', array( 'jetpack-portfolio' ) ), // Post types to display this metabox on
				'context'    => 'side',
				'priority'   => 'low',
				'show_names' => false, // Show field names on the left
				'fields'     => array(
					array(
						'name'        => esc_html__( 'Thumbnail Image', 'noah' ),
						'id'          => '_thumbnail_id', //this is the same id of the featured image we are replacing
						'type'        => 'image',
						'button_text' => esc_html__( 'Add Thumbnail Image', 'noah' ),
						'class'       => '',
					),
					array(
						'name'        => esc_html__( 'Thumbnail Hover Image', 'noah' ),
						'id'          => '_thumbnail_hover_image',
						'type'        => 'image',
						'button_text' => esc_html__( 'Add Thumbnail Hover', 'noah' ),
						'class'       => 'thumbnail-hover',
					),
				)
			),
		);

		//allow others to make changes
		$featured_image_metaboxes = apply_filters( 'pixelgrade_featured_image_metaboxes_config', $featured_image_metaboxes );

		// Now add our metaboxes to the config
		if ( empty( $config['metaboxes'] ) ) {
			$config['metaboxes'] = array();
		}
		// We merge them so we allow for overwrite by our newer configurations when the same key has been used
		// http://php.net/manual/ro/function.array-merge.php
		$config['metaboxes'] = array_merge( $config['metaboxes'], $featured_image_metaboxes );

		// Return our modified PixTypes configuration
		return $config;
	}

	/**
	 * Get post type
	 *
	 * @return string Post type
	 */
	public function get_post_type() {
		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
			if ( isset( $_REQUEST['post_id'] ) ) {
				$post = get_post( absint( $_REQUEST['post_id'] ) );

				return $post->post_type;
			}
		}

		$screen = get_current_screen();

		return $screen->post_type;

	} // end get_post_type

	public function remove_featured_image_metabox() {
		$post_type = $this->get_post_type();

		if ( in_array( $post_type, apply_filters( 'pixelgrade_featured_image_post_types', array( 'jetpack-portfolio' ) ) ) ) {
			//remove original featured image metabox
			remove_meta_box( 'postimagediv', $post_type, 'side' );
		}
	}

	public function save_featured_image_meta( $new, $post_id, $field ) {
		if ( isset( $field['id'] ) && '_thumbnail_id' == $field['id'] ) {
			if ( '-1' == $new ) {
				// Our CMB deleted the meta data when it is an empty string, not on -1
				$new = '';
			}
		}
		return $new;
	}

	/**
	 * Load on when the admin is initialized
	 */
	public function admin_init() {
		/* register the styles and scripts specific to this component */
		wp_register_style( 'noah_featured_image-admin-style', pixelgrade_get_theme_file_uri( 'components/featured-image/css/admin.css' ), array(), $this->_assets_version );
	}

	/**
	 * Enqueue scripts and styles for the admin area
	 *
	 * @param string $hook
	 */
	public function admin_enqueue_scripts( $hook ) {
		/* enqueue the styles and scripts specific to this component */
		if ( 'edit.php' != $hook ) {
			wp_enqueue_style( 'noah_featured_image-admin-style' );
		}
	}

	/**
	 * Main Pixelgrade_Feature_Image Instance
	 *
	 * Ensures only one instance of Pixelgrade_Feature_Image is loaded or can be loaded.
	 *
	 * @since  1.0.0
	 * @static
	 *
	 * @see    pixelgrade_featured_image()
	 * @return Pixelgrade_Feature_Image
	 */
	public static function instance() {
		if ( is_null( self::$_instance ) ) {
			self::$_instance = new self();
		}

		return self::$_instance;
	} // End instance ()

	/**
	 * Cloning is forbidden.
	 *
	 * @since 1.0.0
	 */
	public function __clone() {
		_doing_it_wrong( __FUNCTION__, esc_html__( 'Cheatin&#8217; huh?', 'noah' ), esc_html( $this->_version ) );
	} // End __clone ()

	/**
	 * Unserializing instances of this class is forbidden.
	 *
	 * @since 1.0.0
	 */
	public function __wakeup() {
		_doing_it_wrong( __FUNCTION__, esc_html__( 'Cheatin&#8217; huh?', 'noah' ),  esc_html( $this->_version ) );
	} // End __wakeup ()
}
