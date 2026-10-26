<?php
/**
 * Frontend handler para Trade-in Widget
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tradein_Frontend {
    
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
        // Enqueue scripts e estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Hook em woocommerce_before_add_to_cart_form para renderizar na PDP
        if (get_option('tradein_widget_enabled_product', 'yes') === 'yes') {
            add_action('woocommerce_before_add_to_cart_form', array($this, 'render_tradein_widget_product'));
        }
        
        // Hook para renderizar no carrinho
        if (get_option('tradein_widget_enabled_cart', 'yes') === 'yes') {
            add_action('woocommerce_before_cart', array($this, 'render_tradein_widget_cart'));
            add_action('woocommerce_before_cart_table', array($this, 'render_tradein_widget_cart'));
        }
        
        // Adicionar widget após o resumo do carrinho também
        add_action('woocommerce_after_cart_table', array($this, 'render_tradein_widget_cart_bottom'));
    }
    
    public function enqueue_scripts() {
        $api_url = get_option('tradein_widget_api_url', 'https://your-tradein-api.com');
        
        // Enqueue widget.js
        wp_enqueue_script(
            'tradein-widget-script',
            $api_url . '/widget.js',
            array(),
            TRADEIN_WIDGET_VERSION,
            true
        );
        
        // Localizar script com configurações
        wp_localize_script('tradein-widget-script', 'tradeinWidgetConfig', array(
            'apiUrl' => $api_url,
            'storeId' => get_option('tradein_widget_store_id', get_bloginfo('name')),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('tradein_widget_nonce')
        ));
    }
    
    /**
     * Renderizar widget na página de produto (PDP)
     * Hook: woocommerce_before_add_to_cart_form
     */
    public function render_tradein_widget_product() {
        global $product;
        
        if (!$product) {
            return;
        }
        
        $this->render_widget('product');
    }
    
    /**
     * Renderizar widget no carrinho
     * Hook: woocommerce_before_cart
     */
    public function render_tradein_widget_cart() {
        if (!is_cart()) {
            return;
        }
        $this->render_widget('cart');
    }
    
    /**
     * Renderizar widget no final do carrinho
     */
    public function render_tradein_widget_cart_bottom() {
        if (!is_cart()) {
            return;
        }
        // Evitar duplicação se já renderizado
        static $rendered = false;
        if ($rendered) {
            return;
        }
        // $this->render_widget('cart');
        // $rendered = true;
    }
    
    private function render_widget($location = 'product') {
        $api_url = get_option('tradein_widget_api_url', 'https://your-tradein-api.com');
        $store_id = get_option('tradein_widget_store_id', get_bloginfo('name'));
        $button_label = get_option('tradein_widget_button_label', 'Dê seu usado como entrada');
        
        ?>
        <div class="tradein-widget-container tradein-widget-<?php echo esc_attr($location); ?>" style="margin: 20px 0;">
            <trade-in-widget 
                api-url="<?php echo esc_url($api_url); ?>"
                store-id="<?php echo esc_attr($store_id); ?>"
                label="<?php echo esc_attr($button_label); ?>">
            </trade-in-widget>
        </div>
        <?php
    }
}
