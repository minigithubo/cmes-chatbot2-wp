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
  
    // CSS
    wp_enqueue_style(
      'cmes-chatbot-style',
      $base . 'assets/chatbot.css',
      [],
      filemtime($dir . 'assets/chatbot.css')
    );
  
    // 🔥 Chat API (먼저)
    wp_enqueue_script(
      'cmes-chatbot-api',
      $base . 'assets/chat-api.js',
      [],
      filemtime($dir . 'assets/chat-api.js'),
      true
    );
  
    // 🔥 Chat UI (API 의존)
    wp_enqueue_script(
      'cmes-chatbot',
      $base . 'assets/chatbot.js',
      ['cmes-chatbot-api'], // 중요
      filemtime($dir . 'assets/chatbot.js'),
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
  
    $params = $request->get_json_params();
    $message  = $params['message'] ?? '';
    $mode     = $params['mode'] ?? '';
    $category = $params['category'] ?? '';
  
    // ✅ FAQ 모드 처리
    if ($mode === 'faq'
        && isset($CMES_FAQ_DATA[$category])
        && isset($CMES_FAQ_DATA[$category][$message])) {
  
      return [
        'answer' => $CMES_FAQ_DATA[$category][$message]
      ];
    }
  
    // ❌ FAQ 아니면 임시 응답
    return [
      'answer' => 'Thanks for your question. We will get back to you shortly.'
    ];
  }
  
  
