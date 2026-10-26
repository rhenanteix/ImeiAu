<?php
/**
 * Handler de Cupons WooCommerce para Trade-in
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tradein_Coupons {
    
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
        // Aplicar cupom via AJAX
        add_action('wp_ajax_apply_tradein_coupon', array($this, 'ajax_apply_tradein_coupon'));
        add_action('wp_ajax_nopriv_apply_tradein_coupon', array($this, 'ajax_apply_tradein_coupon'));
        
        // Verificar cupom na sessão
        add_action('woocommerce_cart_calculate_fees', array($this, 'apply_tradein_discount'));
        
        // Validar cupom personalizado
        add_filter('woocommerce_coupon_is_valid', array($this, 'validate_tradein_coupon'), 10, 2);
        add_filter('woocommerce_coupon_get_discount_amount', array($this, 'get_tradein_discount_amount'), 10, 5);
        add_filter('woocommerce_coupon_get_discount_type', array($this, 'get_tradein_discount_type'), 10, 2);
        
        // Remover cupom ao finalizar sessão ou quando necessário
        add_action('woocommerce_checkout_order_processed', array($this, 'mark_coupon_used'));
    }
    
    /**
     * Aplicar desconto de trade-in na sessão atual do carrinho
     * Hook: woocommerce_cart_calculate_fees
     */
    public function apply_tradein_discount() {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        // Verificar se há cupom trade-in na sessão
        $tradein_coupon = WC()->session->get('tradein_coupon_code');
        $tradein_amount = WC()->session->get('tradein_coupon_amount');
        
        if (!$tradein_coupon || !$tradein_amount) {
            return;
        }
        
        // Verificar se o cupom já foi aplicado
        if (WC()->cart->has_discount($tradein_coupon)) {
            return;
        }
        
        // Aplicar desconto
        WC()->cart->add_discount($tradein_coupon);
    }
    
    /**
     * Aplicar cupom trade-in via AJAX
     */
    public function ajax_apply_tradein_coupon() {
        check_ajax_referer('tradein_widget_nonce', 'nonce');
        
        $coupon_code = sanitize_text_field($_POST['coupon_code']);
        $amount = intval($_POST['amount']);
        
        if (!$coupon_code || !$amount) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }
        
        // Verificar se carrinho não está vazio
        if (WC()->cart->is_empty()) {
            wp_send_json_error(array('message' => 'Carrinho vazio'));
            return;
        }
        
        // Salvar na sessão
        WC()->session->set('tradein_coupon_code', $coupon_code);
        WC()->session->set('tradein_coupon_amount', $amount);
        
        // Aplicar cupom ao carrinho
        $applied = WC()->cart->add_discount($coupon_code);
        
        if ($applied) {
            // Recalcular carrinho
            WC()->cart->calculate_totals();
            
            wp_send_json_success(array(
                'message' => 'Cupom aplicado com sucesso!',
                'coupon_code' => $coupon_code,
                'amount' => $amount,
                'formatted_amount' => wc_price($amount / 100)
            ));
        } else {
            // Remover da sessão se não foi aplicado
            WC()->session->__unset('tradein_coupon_code');
            WC()->session->__unset('tradein_coupon_amount');
            
            wp_send_json_error(array('message' => 'Não foi possível aplicar o cupom'));
        }
    }
    
    /**
     * Validar cupom trade-in
     */
    public function validate_tradein_coupon($valid, $coupon) {
        $coupon_code = $coupon->get_code();
        
        // Verificar se é cupom trade-in
        if (strpos($coupon_code, 'TRADEIN-') === 0) {
            // Verificar se cupom está na sessão
            $session_coupon = WC()->session->get('tradein_coupon_code');
            if ($session_coupon !== $coupon_code) {
                // Permitir se foi criado via API (verificar no banco)
                if (!$this->is_valid_tradein_coupon_db($coupon_code)) {
                    return false;
                }
            }
            return true;
        }
        
        return $valid;
    }
    
    /**
     * Obter valor do desconto para cupom trade-in
     */
    public function get_tradein_discount_amount($discount, $discounting_amount, $cart_item, $single, $coupon) {
        $coupon_code = $coupon->get_code();
        
        if (strpos($coupon_code, 'TRADEIN-') === 0) {
            // Buscar valor do desconto
            $amount = WC()->session->get('tradein_coupon_amount');
            if (!$amount) {
                $amount = $this->get_tradein_amount_from_db($coupon_code);
            }
            
            if ($amount) {
                // Retornar valor em centavos convertido? WooCommerce trabalha com moeda da loja
                return $amount / 100;
            }
        }
        
        return $discount;
    }
    
    /**
     * Definir tipo de desconto como valor fixo
     */
    public function get_tradein_discount_type($discount_type, $coupon) {
        $coupon_code = $coupon->get_code();
        
        if (strpos($coupon_code, 'TRADEIN-') === 0) {
            return 'fixed_cart';
        }
        
        return $discount_type;
    }
    
    /**
     * Marcar cupom como usado após pedido processado
     */
    public function mark_coupon_used($order_id) {
        global $wpdb;
        
        $tradein_coupon = WC()->session->get('tradein_coupon_code');
        if (!$tradein_coupon) {
            return;
        }
        
        // Atualizar no banco
        $table_name = $wpdb->prefix . 'tradein_quotes';
        $wpdb->update(
            $table_name,
            array('status' => 'used', 'updated_at' => current_time('mysql')),
            array('coupon_code' => $tradein_coupon),
            array('%s', '%s'),
            array('%s')
        );
        
        // Limpar sessão
        WC()->session->__unset('tradein_coupon_code');
        WC()->session->__unset('tradein_coupon_amount');
    }
    
    private function is_valid_tradein_coupon_db($coupon_code) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tradein_quotes';
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE coupon_code = %s AND status = 'approved'",
            $coupon_code
        ));
        
        return !empty($result);
    }
    
    private function get_tradein_amount_from_db($coupon_code) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tradein_quotes';
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT estimated_value FROM $table_name WHERE coupon_code = %s",
            $coupon_code
        ));
        
        return $result ? $result->estimated_value : 0;
    }
}
