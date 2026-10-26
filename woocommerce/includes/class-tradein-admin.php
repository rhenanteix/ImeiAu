<?php
/**
 * Painel administrativo do plugin Trade-in Widget
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tradein_Admin {
    
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
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Trade-in Widget', 'tradein-widget'),
            __('Trade-in Widget', 'tradein-widget'),
            'manage_options',
            'tradein-widget',
            array($this, 'admin_page'),
            'dashicons-update',
            56
        );
        
        add_submenu_page(
            'tradein-widget',
            __('Configurações', 'tradein-widget'),
            __('Configurações', 'tradein-widget'),
            'manage_options',
            'tradein-widget-settings',
            array($this, 'settings_page')
        );
        
        add_submenu_page(
            'tradein-widget',
            __('Cotações', 'tradein-widget'),
            __('Cotações', 'tradein-widget'),
            'manage_options',
            'tradein-widget-quotes',
            array($this, 'quotes_page')
        );
    }
    
    public function register_settings() {
        register_setting('tradein_widget_settings', 'tradein_widget_api_url');
        register_setting('tradein_widget_settings', 'tradein_widget_store_id');
        register_setting('tradein_widget_settings', 'tradein_widget_admin_token');
        register_setting('tradein_widget_settings', 'tradein_widget_api_token');
        register_setting('tradein_widget_settings', 'tradein_widget_button_label');
        register_setting('tradein_widget_settings', 'tradein_widget_enabled_product');
        register_setting('tradein_widget_settings', 'tradein_widget_enabled_cart');
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'tradein-widget') === false) {
            return;
        }
        
        wp_enqueue_style('tradein-admin-style', TRADEIN_WIDGET_PLUGIN_URL . 'assets/css/admin.css', array(), TRADEIN_WIDGET_VERSION);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Trade-in Widget', 'tradein-widget'); ?></h1>
            <div class="card">
                <h2><?php _e('Visão Geral', 'tradein-widget'); ?></h2>
                <p><?php _e('Widget Trade-in integrado ao WooCommerce para trocar aparelhos usados como entrada.', 'tradein-widget'); ?></p>
                <p>
                    <a href="<?php echo admin_url('admin.php?page=tradein-widget-settings'); ?>" class="button button-primary">
                        <?php _e('Configurar Plugin', 'tradein-widget'); ?>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tradein-widget-quotes'); ?>" class="button">
                        <?php _e('Ver Cotações', 'tradein-widget'); ?>
                    </a>
                </p>
            </div>
            
            <div class="card">
                <h2><?php _e('Hooks Utilizados', 'tradein-widget'); ?></h2>
                <ul>
                    <li><code>woocommerce_before_add_to_cart_form</code> - Renderiza widget na página de produto (PDP)</li>
                    <li><code>woocommerce_before_cart</code> / <code>woocommerce_before_cart_table</code> - Renderiza widget no carrinho</li>
                    <li><code>WC()->cart->add_discount()</code> - Aplica desconto de trade-in na sessão atual</li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Configurações do Trade-in Widget', 'tradein-widget'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('tradein_widget_settings');
                do_settings_sections('tradein_widget_settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="tradein_widget_api_url"><?php _e('URL da API Trade-in', 'tradein-widget'); ?></label>
                        </th>
                        <td>
                            <input type="url" id="tradein_widget_api_url" name="tradein_widget_api_url" 
                                   value="<?php echo esc_attr(get_option('tradein_widget_api_url')); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('URL base da API FastAPI do Trade-in', 'tradein-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="tradein_widget_store_id"><?php _e('Store ID', 'tradein-widget'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="tradein_widget_store_id" name="tradein_widget_store_id" 
                                   value="<?php echo esc_attr(get_option('tradein_widget_store_id', get_bloginfo('name'))); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('Identificador da loja no sistema Trade-in', 'tradein-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="tradein_widget_admin_token"><?php _e('Token Admin', 'tradein-widget'); ?></label>
                        </th>
                        <td>
                            <input type="password" id="tradein_widget_admin_token" name="tradein_widget_admin_token" 
                                   value="<?php echo esc_attr(get_option('tradein_widget_admin_token')); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('Token para comunicação com API Trade-in', 'tradein-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="tradein_widget_api_token"><?php _e('Token API WordPress', 'tradein-widget'); ?></label>
                        </th>
                        <td>
                            <input type="password" id="tradein_widget_api_token" name="tradein_widget_api_token" 
                                   value="<?php echo esc_attr(get_option('tradein_widget_api_token')); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('Token para validar chamadas da API Trade-in para este WordPress', 'tradein-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="tradein_widget_button_label"><?php _e('Texto do Botão', 'tradein-widget'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="tradein_widget_button_label" name="tradein_widget_button_label" 
                                   value="<?php echo esc_attr(get_option('tradein_widget_button_label', 'Dê seu usado como entrada')); ?>" 
                                   class="regular-text" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Exibição', 'tradein-widget'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="tradein_widget_enabled_product" value="yes" 
                                       <?php checked(get_option('tradein_widget_enabled_product', 'yes'), 'yes'); ?> />
                                <?php _e('Exibir na página de produto (PDP)', 'tradein-widget'); ?>
                            </label>
                            <br>
                            <label>
                                <input type="checkbox" name="tradein_widget_enabled_cart" value="yes" 
                                       <?php checked(get_option('tradein_widget_enabled_cart', 'yes'), 'yes'); ?> />
                                <?php _e('Exibir no carrinho', 'tradein-widget'); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    public function quotes_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tradein_quotes';
        $quotes = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 100");
        ?>
        <div class="wrap">
            <h1><?php _e('Cotações Trade-in', 'tradein-widget'); ?></h1>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php _e('Quote ID', 'tradein-widget'); ?></th>
                        <th><?php _e('Email', 'tradein-widget'); ?></th>
                        <th><?php _e('Valor Estimado', 'tradein-widget'); ?></th>
                        <th><?php _e('Cupom', 'tradein-widget'); ?></th>
                        <th><?php _e('Status', 'tradein-widget'); ?></th>
                        <th><?php _e('Data', 'tradein-widget'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($quotes): ?>
                        <?php foreach ($quotes as $quote): ?>
                            <tr>
                                <td><?php echo esc_html($quote->quote_id); ?></td>
                                <td><?php echo esc_html($quote->customer_email); ?></td>
                                <td>R$ <?php echo number_format($quote->estimated_value / 100, 2, ',', '.'); ?></td>
                                <td><?php echo esc_html($quote->coupon_code ?: '-'); ?></td>
                                <td><?php echo esc_html($quote->status); ?></td>
                                <td><?php echo esc_html($quote->created_at); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6"><?php _e('Nenhuma cotação encontrada.', 'tradein-widget'); ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
}
