<?php
/**
 * The template for displaying archive pages for the jetpack-portfolio-tag taxonomy.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package Noah
 * @since   Noah 1.0.0
 */

//let the template parts know about our location
$location = 'archive portfolio portfolio-tag jetpack';
pixelgrade_set_location( $location );

get_header(); ?>

<?php
/**
 * pixelgrade_before_main_content hook.
 *
 * @hooked nothing() - 10 (outputs nothing)
 */
do_action( 'pixelgrade_before_main_content', $location );
?>

	<div class="u-portfolio_sides_spacing u-content-bottom-spacing">

		<header class="c-page-header content-area">
			<h1 class="c-page-header__title h1">
				<?php esc_html_e( 'Projects', 'noah' ); ?>
			</h1>
			<div class="c-page-header__meta h7">
				<span><?php esc_html_e( 'Show', 'noah' ); ?></span>
				<span
					class="c-page-header__taxonomy  u-color-accent"><?php noah_the_taxonomy_dropdown( 'jetpack-portfolio-tag', get_query_var( 'term' ) ); ?></span>
			</div>
			<?php if ( term_description() ) {
				echo term_description();
			} ?>
		</header><!-- .archive-header -->

		<?php if ( have_posts() ) : ?>

			<div class="u-content-background">
				<section class="c-archive-loop  u-full-width  u-portfolio_sides_spacing  u-content-bottom-spacing">
					<div class="o-wrapper u-portfolio_grid_width">
						<div <?php noah_portfolio_class( '', $location ); ?>>

							<?php while ( have_posts() ) : the_post();
								get_template_part( 'template-parts/content', 'jetpack-portfolio' );
							endwhile; ?>

						</div>
					</div><!-- .o-wrapper -->
				</section><!-- .c-archive-loop -->
			</div><!-- .u-content-background -->

		<?php else : ?>
			<div class="u-content-width entry-content">
				<?php get_template_part( 'template-parts/content', 'none' ); ?>
			</div>
		<?php endif; ?>
		
	</div>

<?php the_posts_navigation( array(
	'prev_text'          => esc_html__( 'Older projects', 'noah' ),
	'next_text'          => esc_html__( 'Newer projects', 'noah' ),
	'screen_reader_text' => esc_html__( 'Projects navigation', 'noah' ),
) ); ?>

<?php
/**
 * pixelgrade_after_main_content hook.
 *
 * @hooked nothing - 10 (outputs nothing)
 */
do_action( 'pixelgrade_after_main_content', $location );
?>

<?php get_footer();
