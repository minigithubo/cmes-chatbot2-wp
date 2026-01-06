<?php
/*
Plugin Name: CMES Chatbot
Description: CMES AI Chatbot Plugin
Version: 1.0.0
*/

add_action('wp_enqueue_scripts', function () {
  if ( ! is_front_page() ) return;

  $base = plugin_dir_url(__FILE__);
  $dir  = plugin_dir_path(__FILE__);

  $css_rel = 'assets/chatbot.css';
  $js_rel  = 'assets/chatbot.js';

  $css_ver = file_exists($dir . $css_rel) ? filemtime($dir . $css_rel) : null;
  $js_ver  = file_exists($dir . $js_rel) ? filemtime($dir . $js_rel) : null;

  wp_enqueue_style(
    'cmes-chatbot-style',
    $base . $css_rel,
    [],
    $css_ver
  );

  wp_enqueue_script(
    'cmes-chatbot',
    $base . $js_rel,
    [],
    $js_ver,
    true
  );
});
