<?php

/**
 * Code borrowed from Jetpack just in case Jetpack is missing
 */

// Add Settings Section for CPT
function noah_jetpack_cpt_settings_api_init() {
	add_settings_section(
		'jetpack_cpt_section',
		'<span id="cpt-options">' . __( 'Your Custom Content Types', 'noah' ) . '</span>',
		'noah_jetpack_cpt_section_callback',
		'writing'
	);
}
add_action( 'admin_init', 'noah_jetpack_cpt_settings_api_init' );

/*
 * Settings Description
 */
function noah_jetpack_cpt_section_callback() {
	?>
	<p>
		<?php esc_html_e( 'Use these settings to display different types of content on your site.', 'noah' ); ?>
		<a target="_blank"
		   href="http://jetpack.com/support/custom-content-types/"><?php esc_html_e( 'Learn More', 'noah' ); ?></a>
	</p>
	<?php
}
