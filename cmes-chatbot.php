<?php
/*
Plugin Name: CMES Chatbot
Description: CMES AI Chatbot Plugin
Version: 1.0.0
*/

add_action('wp_enqueue_scripts', function () {
  if ( ! is_front_page() ) return;

  $base = plugin_dir_url(__FILE__);
  wp_enqueue_script(
    'cmes-chatbot',
    $base . 'chatbot.js',
    [],
    null,
    true
  );
});
