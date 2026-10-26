-- PostgreSQL DDL. Valores monetários em centavos BRL.

CREATE TABLE condition_rules (
	id VARCHAR(64) NOT NULL, 
	criteria_name VARCHAR(50) NOT NULL, 
	deduction_percentage INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (deduction_percentage BETWEEN 0 AND 100), 
	UNIQUE (criteria_name)
);

CREATE TABLE devices (
	id VARCHAR(64) NOT NULL, 
	brand VARCHAR(60) NOT NULL, 
	model VARCHAR(100) NOT NULL, 
	storage VARCHAR(30) NOT NULL, 
	base_price INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (brand, model, storage), 
	CHECK (base_price >= 0)
);

CREATE TABLE leads (
	id VARCHAR(64) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	store_name VARCHAR(120) NOT NULL, 
	whatsapp VARCHAR(25) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	platform VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (email)
);

CREATE TABLE stores (
	id VARCHAR(64) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	domain VARCHAR(255) NOT NULL, 
	platform VARCHAR(30) NOT NULL, 
	api_keys JSON NOT NULL, 
	mode_preference VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (mode_preference IN ('instant_coupon','post_inspection')), 
	UNIQUE (domain)
);

CREATE TABLE tradein_requests (
	id VARCHAR(64) NOT NULL, 
	store_id VARCHAR(64) NOT NULL, 
	device_id VARCHAR(64) NOT NULL, 
	customer_data JSON NOT NULL, 
	condition JSON NOT NULL, 
	estimated_value INTEGER NOT NULL, 
	mode VARCHAR(30) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	coupon_code VARCHAR(80), 
	shipping_code VARCHAR(80) NOT NULL, 
	idempotency_key VARCHAR(100) NOT NULL, 
	payload_hash VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (store_id, idempotency_key), 
	CHECK (status IN ('pending_shipping','shipped','inspecting','approved','rejected')), 
	CHECK (estimated_value >= 0), 
	FOREIGN KEY(store_id) REFERENCES stores (id), 
	FOREIGN KEY(device_id) REFERENCES devices (id), 
	UNIQUE (coupon_code), 
	UNIQUE (shipping_code)
);

CREATE INDEX ix_tradein_requests_store_id ON tradein_requests (store_id);
