<?php

if ( ! defined( 'WP_LOAD_IMPORTERS' ) ) {
	define( 'WP_LOAD_IMPORTERS', true );
}

// Load Importer API file
require_once ABSPATH . 'wp-admin/includes/import.php';
//no errors yet :)
$wpGrade_importerError = false;
//the path to the demo files including the file name without the extension
$import_filepath = get_template_directory() . '/inc/import/demo-data/demo_data.php';
$import_fileuri = get_template_directory_uri() . '/inc/import/demo-data/demo_data.xml';

//check if wp_importer, the base importer class is available, otherwise include it
if ( ! class_exists( 'WP_Importer' ) ) {
	$class_wp_importer = ABSPATH . 'wp-admin/includes/class-wp-importer.php';
	if ( file_exists( $class_wp_importer ) ) {
		require_once( $class_wp_importer );
	} else {
		$wpGrade_importerError = true;
	}
}

//check if the wp import class is available, this class handles the wordpress XML files. If not, include it
if ( ! class_exists( 'WPGrade_WP_Import' ) ) {
	$class_wp_import = get_template_directory() . '/inc/import/wordpress-importer/wordpress-importer.php';
	if ( file_exists( $class_wp_import ) ) {
		require_once( $class_wp_import );
	} else {
		$wpGrade_importerError = true;
	}
}

if ( $wpGrade_importerError !== false ) {
	$response['id'] = new WP_Error( 'import_posts_pages_noscript', 'The Auto importing script could not be loaded. Please use the <a href="' . esc_url( admin_url( 'import.php' ) ) . '">WordPress default import</a> and import the .XML file provided in the archive you\'ve received on purchase manually.' );
} else {
	if ( class_exists( 'WPGrade_WP_Import' ) ) {
		include_once( get_template_directory() . '/inc/import/wordpress-importer/wpgrade-import-class.php' );
	}

	ob_start();
	$wp_import                    = new wpGrade_import();
	$wp_import->fetch_attachments = true;
	$response['id']               = $wp_import->import_posts_pages( $import_fileuri, $import_filepath, $response['supplemental']['stepNumber'], $response['supplemental']['numberOfSteps'] );
	//after the last step we assign the menus to the proper locations
	if ( $response['supplemental']['stepNumber'] == 1 ) {
		$wp_import->set_menus( $import_filepath );
	}
	$response['data'] = ob_get_contents();
	ob_end_clean();
}