<?php
/**
 * Plugin Name: Trade-in Widget for WooCommerce
 * Plugin URI: https://github.com/your-org/tradein-widget
 * Description: Integra o widget Trade-in para permitir que clientes troquem aparelhos usados como entrada na compra.
 * Version: 1.0.0
 * Author: Trade-in Team
 * Author URI: https://your-site.com
 * Text Domain: tradein-widget
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes do plugin
define('TRADEIN_WIDGET_VERSION', '1.0.0');
define('TRADEIN_WIDGET_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TRADEIN_WIDGET_PLUGIN_URL', plugin_dir_url(__FILE__));
define('TRADEIN_WIDGET_BASENAME', plugin_basename(__FILE__));

/**
 * Classe principal do plugin Trade-in Widget
 */
class Tradein_Widget_Plugin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Verificar se WooCommerce está ativo
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        // Carregar traduções
        load_plugin_textdomain('tradein-widget', false, dirname(TRADEIN_WIDGET_BASENAME) . '/languages');
        
        // Incluir arquivos
        $this->includes();
        
        // Hooks
        $this->init_hooks();
    }
    
    private function includes() {
        require_once TRADEIN_WIDGET_PLUGIN_DIR . 'includes/class-tradein-admin.php';
        require_once TRADEIN_WIDGET_PLUGIN_DIR . 'includes/class-tradein-api.php';
        require_once TRADEIN_WIDGET_PLUGIN_DIR . 'includes/class-tradein-coupons.php';
        require_once TRADEIN_WIDGET_PLUGIN_DIR . 'includes/class-tradein-frontend.php';
    }
    
    private function init_hooks() {
        // Admin
        if (is_admin()) {
            Tradein_Admin::get_instance();
        }
        
        // API endpoints
        Tradein_API::get_instance();
        
        // Cupom handler
        Tradein_Coupons::get_instance();
        
        // Frontend
        if (!is_admin()) {
            Tradein_Frontend::get_instance();
        }
    }
    
    public function activate() {
        // Criar tabelas se necessário
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabela para armazenar cotações
        $table_name = $wpdb->prefix . 'tradein_quotes';
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            quote_id varchar(100) NOT NULL,
            store_id varchar(50) NOT NULL,
            customer_email varchar(100),
            device_info text,
            estimated_value int(11),
            coupon_code varchar(50),
            status varchar(20) DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY quote_id (quote_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Definir opções padrão
        add_option('tradein_widget_api_url', 'https://your-tradein-api.com');
        add_option('tradein_widget_store_id', get_option('blogname'));
        add_option('tradein_widget_button_label', 'Dê seu usado como entrada');
        add_option('tradein_widget_enabled_product', 'yes');
        add_option('tradein_widget_enabled_cart', 'yes');
        
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    public function woocommerce_missing_notice() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('Trade-in Widget requer o plugin WooCommerce para funcionar.', 'tradein-widget'); ?></p>
        </div>
        <?php
    }
}

// Inicializar plugin
function tradein_widget_init() {
    return Tradein_Widget_Plugin::get_instance();
}

add_action('woocommerce_loaded', 'tradein_widget_init');
