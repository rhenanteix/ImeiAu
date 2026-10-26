<?php
/**
 * API endpoints para integração com Trade-in backend
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tradein_API {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Registrar rotas REST API
        add_action('rest_api_init', array($this, 'register_routes'));
        
        // AJAX handlers
        add_action('wp_ajax_tradein_create_coupon', array($this, 'ajax_create_coupon'));
        add_action('wp_ajax_nopriv_tradein_create_coupon', array($this, 'ajax_create_coupon'));
    }
    
    public function register_routes() {
        register_rest_route('tradein/v1', '/coupon/approve', array(
            'methods' => 'POST',
            'callback' => array($this, 'approve_coupon'),
            'permission_callback' => array($this, 'verify_api_token')
        ));
        
        register_rest_route('tradein/v1', '/quote/received', array(
            'methods' => 'POST',
            'callback' => array($this, 'receive_quote'),
            'permission_callback' => array($this, 'verify_api_token')
        ));
    }
    
    public function verify_api_token($request) {
        $api_token = get_option('tradein_widget_api_token');
        $auth_header = $request->get_header('Authorization');
        
        if (!$api_token || !$auth_header) {
            return false;
        }
        
        return $auth_header === 'Bearer ' . $api_token;
    }
    
    /**
     * Endpoint para disparar criação de cupons quando cotação for aprovada
     * POST /wp-json/tradein/v1/coupon/approve
     */
    public function approve_coupon($request) {
        $params = $request->get_json_params();
        
        $quote_id = sanitize_text_field($params['quoteId'] ?? '');
        $store_id = sanitize_text_field($params['storeId'] ?? '');
        $amount = intval($params['estimatedValue'] ?? 0);
        $customer_email = sanitize_email($params['customerEmail'] ?? '');
        
        if (!$quote_id || !$amount) {
            return new WP_Error('missing_data', 'Dados obrigatórios não informados', array('status' => 400));
        }
        
        // Gerar código do cupom
        $coupon_code = 'TRADEIN-' . strtoupper(substr($quote_id, -8)) . '-' . rand(100000, 999999);
        
        // Criar cupom no WooCommerce
        $coupon = new WC_Coupon();
        $coupon->set_code($coupon_code);
        $coupon->set_discount_type('fixed_cart');
        $coupon->set_amount($amount / 100);
        $coupon->set_individual_use(false);
        $coupon->set_usage_limit(1);
        $coupon->set_usage_limit_per_user(1);
        $coupon->set_date_expires(strtotime('+30 days'));
        $coupon->set_description('Cupom Trade-in - Cotação: ' . $quote_id);
        
        $coupon_id = $coupon->save();
        
        if (!$coupon_id) {
            return new WP_Error('coupon_error', 'Erro ao criar cupom', array('status' => 500));
        }
        
        // Salvar no banco
        global $wpdb;
        $table_name = $wpdb->prefix . 'tradein_quotes';
        
        $wpdb->insert(
            $table_name,
            array(
                'quote_id' => $quote_id,
                'store_id' => $store_id,
                'customer_email' => $customer_email,
                'estimated_value' => $amount,
                'coupon_code' => $coupon_code,
                'status' => 'approved'
            ),
            array('%s', '%s', '%s', '%d', '%s', '%s')
        );
        
        return rest_ensure_response(array(
            'success' => true,
            'couponCode' => $coupon_code,
            'amount' => $amount,
            'expiresAt' => date('Y-m-d H:i:s', strtotime('+30 days'))
        ));
    }
    
    /**
     * Receber cotação da API Trade-in
     */
    public function receive_quote($request) {
        $params = $request->get_json_params();
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'tradein_quotes';
        
        $wpdb->insert(
            $table_name,
            array(
                'quote_id' => sanitize_text_field($params['id'] ?? ''),
                'store_id' => sanitize_text_field($params['store_id'] ?? ''),
                'customer_email' => sanitize_email($params['customer']['email'] ?? ''),
                'device_info' => wp_json_encode($params['device'] ?? array()),
                'estimated_value' => intval($params['estimated_value'] ?? 0),
                'status' => 'pending'
            ),
            array('%s', '%s', '%s', '%s', '%d', '%s')
        );
        
        return rest_ensure_response(array('success' => true));
    }
    
    /**
     * AJAX para criar cupom via frontend
     */
    public function ajax_create_coupon() {
        check_ajax_referer('tradein_widget_nonce', 'nonce');
        
        $quote_id = sanitize_text_field($_POST['quote_id']);
        $amount = intval($_POST['amount']);
        
        if (!$quote_id || !$amount) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }
        
        // Chamar API Trade-in para aprovar e obter cupom
        $api_url = get_option('tradein_widget_api_url', 'https://your-tradein-api.com');
        $response = wp_remote_post($api_url . '/api/v1/tradein/' . $quote_id . '/approve', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . get_option('tradein_widget_admin_token')
            ),
            'body' => wp_json_encode(array(
                'mode' => 'instant_coupon'
            ))
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => 'Erro ao comunicar com API'));
            return;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['coupon_code'])) {
            // Aplicar cupom automaticamente
            WC()->session->set('tradein_coupon_code', $body['coupon_code']);
            WC()->session->set('tradein_coupon_amount', $amount);
            
            if (WC()->cart) {
                WC()->cart->add_discount($body['coupon_code']);
                WC()->cart->calculate_totals();
            }
            
            wp_send_json_success(array(
                'coupon_code' => $body['coupon_code'],
                'amount' => $amount
            ));
        } else {
            wp_send_json_error(array('message' => 'Não foi possível gerar cupom'));
        }
    }
}
