<?php
/*
Plugin Name: CMES Chatbot
Description: CMES AI Chatbot Plugin
Version: 1.0.0
*/
//FAQ answerlist
$CMES_FAQ_DATA = [
    'companyInfo' => [
      'industries_served' =>
        'CMES Robotics provides automation solutions across a wide range of industries, including logistics, e-commerce, manufacturing, food and beverage, and consumer packaged goods. Our systems are designed to adapt to different production environments and operational requirements.',
  
      'partner_brands' =>
        'We work with globally recognized robot manufacturers and automation technology partners. The specific brands and configurations are selected based on the application requirements to ensure optimal performance and reliability.',
  
      'company_overview' =>
        'CMES Robotics designs and integrates customized robotic automation solutions. Our services include system design, robot integration, vision systems, software development, and full project delivery from concept to commissioning.',
  
      'automation_benefits' =>
        'Our automation solutions help companies improve productivity, reduce labor dependency, increase operational consistency, and enhance workplace safety. Each solution is tailored to meet the customer’s throughput, space, and process requirements.'
    ],
  
    'engineering' => [
      'robot_types' =>
        'We utilize industrial robots from leading global manufacturers, including articulated robots, collaborative robots, and specialized picking robots. The robot type is selected based on payload, speed, reach, and application needs.',
  
      'box_throughput' =>
        'Throughput depends on factors such as box size, weight, robot type, and system layout. In many applications, our systems can handle several hundred to over a thousand boxes per hour. Exact performance is determined during system design and testing.',
  
      'robot_integration' =>
        'We integrate robots from multiple major robot brands and are not limited to a single manufacturer. This allows us to recommend the most suitable robot platform based on the specific application and customer requirements.',
  
      'loose_bag_solution' =>
        'Yes, we offer robotic palletizing and depalletizing solutions for loose bags. These systems are designed with appropriate grippers and vision technologies to handle variations in bag shape, weight, and positioning.',
  
      'sku_capacity' =>
        'The number of SKUs that can be handled depends on the vision system, gripper design, and product variation. Our piece picking solutions are capable of handling a wide range of SKUs, and the exact capacity is defined based on the project requirements.',
  
      'pick_speed' =>
        'Pick speed varies depending on product characteristics, robot configuration, and system design. Typical pick rates range from several hundred to over a thousand picks per hour. Performance is validated through system testing and simulation.'
    ],
  
    'salesLead' => [
      'demo_request' =>
        'You can see a demo by scheduling a visit to our demonstration facility or by requesting a virtual demonstration. Please contact our team to arrange a demo that matches your application.',
  
      'request_quote' =>
        'To request a quote, please contact our sales team through the website or provide your application details via the contact form. Our team will review your requirements and follow up with a customized proposal.',
  
      'lead_time' =>
        'Lead time varies depending on system complexity, component availability, and project scope. After reviewing your application details, we can provide an estimated lead time tailored to your project.',
  
      'delivery_time' =>
        'Delivery time for a robotic palletizer depends on the system configuration and project requirements. Typical delivery timelines are discussed during the project planning phase after specifications are finalized.'
    ]
  ];
  
  add_action('wp_enqueue_scripts', function () {
    if ( ! is_front_page() ) return;
  
    $base = plugin_dir_url(__FILE__);
    $dir  = plugin_dir_path(__FILE__);

    $api = $dir . 'assets/apiservice.js';
    $ui  = $dir . 'assets/chatbot.js';
    $css = $dir . 'assets/chatbot.css';

    wp_enqueue_style(
    'cmes-chatbot-style',
    $base . 'assets/chatbot.css',
    [],
    file_exists($css) ? filemtime($css) : null
  );

  wp_enqueue_script(
    'cmes-chatbot-api',
    $base . 'assets/apiservice.js',
    [],
    file_exists($api) ? filemtime($api) : null,
    true
  );

  wp_enqueue_script(
    'cmes-chatbot-ui',
    $base . 'assets/chatbot.js',
    ['cmes-chatbot-api'],
    file_exists($ui) ? filemtime($ui) : null,
    true
  );
  });
  
// ===============================
// CMES Chatbot REST API
// ===============================
add_action('rest_api_init', function () {
    register_rest_route('cmes-chatbot/v1', '/chat', [
      'methods'  => 'POST',
      'callback' => 'cmes_chatbot_handle_chat',
      'permission_callback' => '__return_true', // 로컬 테스트용
    ]);
  });
  
  function cmes_chatbot_handle_chat($request) {
    global $CMES_FAQ_DATA;
  
    $p = $request->get_json_params();

    $message  = isset($p['message']) ? wp_strip_all_tags((string)$p['message']) : '';
    $mode     = isset($p['mode']) ? (string)$p['mode'] : 'chatting';
    $category = isset($p['category']) ? (string)$p['category'] : '';
    $history  = (isset($p['history']) && is_array($p['history'])) ? $p['history'] : [];

    $message = trim($message);
    if ($message === '') {
    return cmes_response('Please enter a question.', [], false, 'error');
    }

    if (mb_strlen($message) > 1500) $message = mb_substr($message, 0, 1500);
    if (count($history) > 10) $history = array_slice($history, -10);

  // 1) FAQ
  if ($mode === 'faq'
      && $category
      && isset($CMES_FAQ_DATA[$category])
      && isset($CMES_FAQ_DATA[$category][$message])) {

    $answer = $CMES_FAQ_DATA[$category][$message];
    $showQuoteCTA = cmes_should_show_quote_cta($category, $answer);

    return cmes_response($answer, [], $showQuoteCTA, 'faq');
  }

  // 2) Access Denied (최소)
  if (cmes_should_deny($message)) {
    return cmes_response(
      'Sorry — I can only answer questions related to CMES Robotics products and services. If you share your application details, I can help route you to the right team.',
      [],
      true,
      'denied'
    );
  }

  // 3) Chatting → RAG 연결
  $rag = cmes_call_rag_module([
    'message' => $message,
    'history' => $history,
    'category' => $category,
  ]);

  $answer  = isset($rag['answer']) ? (string)$rag['answer'] : '';
  $sources = (isset($rag['sources']) && is_array($rag['sources'])) ? $rag['sources'] : [];

  if (trim($answer) === '') {
    $answer = 'I’m not fully sure based on the available CMES information. If you share your application details (product type, box/bag specs, throughput target, layout constraints), I can help more accurately.';
  }

  $showQuoteCTA = cmes_should_show_quote_cta($category, $message);

  return cmes_response($answer, $sources, $showQuoteCTA, 'rag');
}

function cmes_response($answer, $sources = [], $showQuoteCTA = false, $type = 'rag') {
  return [
    'answer' => $answer,
    'sources' => $sources,
    'showQuoteCTA' => (bool)$showQuoteCTA,
    'type' => $type,
  ];
}

function cmes_should_deny($text) {
  $t = mb_strtolower((string)$text);
  $pii = ['password', 'ssn', 'social security', 'credit card', 'card number', 'bank account', 'otp'];
  foreach ($pii as $w) if (strpos($t, $w) !== false) return true;

  $illegal = ['how to hack', 'make a bomb', 'weapon', 'kill', 'steal'];
  foreach ($illegal as $w) if (strpos($t, $w) !== false) return true;

  return false;
}

function cmes_should_show_quote_cta($category, $text) {
  $t = mb_strtolower((string)$text);

  if ($category === 'salesLead') return true;

  $keywords = ['quote', 'pricing', 'price', 'cost', 'demo', 'proposal', 'lead time', 'delivery', 'contact', 'consult'];
  foreach ($keywords as $k) if (strpos($t, $k) !== false) return true;

  return false;
}

/**
 * RAG endpoint URL — must be the semantic-search backend (api.py in this repo).
 * That backend uses Chroma + SentenceTransformer embeddings for vector/semantic search,
 * then passes retrieved chunks to the LLM. To use a remote URL (e.g. ngrok), define
 * CMES_RAG_API_URL in wp-config.php before this plugin loads, e.g.:
 *   define( 'CMES_RAG_API_URL', 'https://your-ngrok.ngrok-free.dev/chat' );
 */
if ( ! defined( 'CMES_RAG_API_URL' ) ) {
  define( 'CMES_RAG_API_URL', 'https://cyano-jene-partis.ngrok-free.dev/chat' );
}

function cmes_call_rag_module($payload) {
  $rag_api_url = defined( 'CMES_RAG_API_URL' ) ? CMES_RAG_API_URL : 'https://cyano-jene-partis.ngrok-free.dev/chat';

  $response = wp_remote_post($rag_api_url, [
    'method'      => 'POST',
    'timeout'     => 15,
    'blocking'    => true,
    'headers'     => ['Content-Type' => 'application/json'],
    'body'        => json_encode([
      'question' => $payload['message'],
    ]),
  ]);

  if (is_wp_error($response)) {
    return [
      'answer' => 'Server offline. Contact Seungji for help.',
      'sources' => [],
    ];
  }

  $body = json_decode(wp_remote_retrieve_body($response), true);
  
  return [
    'answer' => $body['answer'] ?? 'No answer generated.',
    'sources' => $body['sources'] ?? [],
  ];
}
  
  
  
