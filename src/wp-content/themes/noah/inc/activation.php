<?php
/**
 * Theme activation hook
 *
 * @package Noah
 * @since Noah 1.0
 */

if ( ! function_exists( 'noah_config_getting_active' ) ) {
	/**
	 * ACTIVATION SETTINGS
	 * These settings will be needed when the theme will get active
	 * Careful with the first setup, most of them will go in the clients database and they will be stored there
	 */
	function noah_config_getting_active() {
		//do nothing for now but who knows.. one day..
	}
} // end noah_config_getting_active
add_action( 'after_switch_theme', 'noah_config_getting_active' );