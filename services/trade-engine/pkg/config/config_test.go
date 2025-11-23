package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoad(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test_config.yaml")

	configContent := `
server:
  http_port: 8080
  websocket_port: 8081
  read_timeout: 30s
  write_timeout: 30s
  shutdown_timeout: 30s

database:
  host: localhost
  port: 5433
  database: trade_engine_db
  user: trade_engine_user
  password: trade_engine_pass
  max_open_conns: 25
  max_idle_conns: 5
  conn_max_lifetime: 5m
  ssl_mode: disable

redis:
  host: localhost
  port: 6380
  password: ""
  db: 0
  max_retries: 3
  pool_size: 10
  dial_timeout: 5s
  read_timeout: 3s
  write_timeout: 3s

rabbitmq:
  host: localhost
  port: 5673
  user: admin
  password: changeme
  vhost: /
  timeout: 10s
  heartbeat: 60s

pgbouncer:
  enabled: false
  host: localhost
  port: 6433
  pool_mode: transaction
  max_client_conn: 100

logging:
  level: info
  format: json
  output: stdout
  file_path: ./logs/trade-engine.log
  max_size: 100
  max_age: 30
  max_backups: 5

matching:
  timeout: 1s
  batch_size: 1000

order_book:
  snapshot_interval: 5s
  cache_enabled: true
  cache_ttl: 60s

websocket:
  read_timeout: 10s
  write_timeout: 10s
  ping_interval: 30s
  max_message_size: 65536

environment: development
service_version: 1.0.0
`

	if err := os.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	// Test server config
	if cfg.Server.HTTPPort != 8080 {
		t.Errorf("Server.HTTPPort = %d, want 8080", cfg.Server.HTTPPort)
	}
	if cfg.Server.WebSocketPort != 8081 {
		t.Errorf("Server.WebSocketPort = %d, want 8081", cfg.Server.WebSocketPort)
	}
	if cfg.Server.ReadTimeout != 30*time.Second {
		t.Errorf("Server.ReadTimeout = %v, want 30s", cfg.Server.ReadTimeout)
	}

	// Test database config
	if cfg.Database.Host != "localhost" {
		t.Errorf("Database.Host = %s, want localhost", cfg.Database.Host)
	}
	if cfg.Database.Port != 5433 {
		t.Errorf("Database.Port = %d, want 5433", cfg.Database.Port)
	}
	if cfg.Database.Database != "trade_engine_db" {
		t.Errorf("Database.Database = %s, want trade_engine_db", cfg.Database.Database)
	}

	// Test Redis config
	if cfg.Redis.Host != "localhost" {
		t.Errorf("Redis.Host = %s, want localhost", cfg.Redis.Host)
	}
	if cfg.Redis.Port != 6380 {
		t.Errorf("Redis.Port = %d, want 6380", cfg.Redis.Port)
	}

	// Test RabbitMQ config
	if cfg.RabbitMQ.Host != "localhost" {
		t.Errorf("RabbitMQ.Host = %s, want localhost", cfg.RabbitMQ.Host)
	}
	if cfg.RabbitMQ.Port != 5673 {
		t.Errorf("RabbitMQ.Port = %d, want 5673", cfg.RabbitMQ.Port)
	}

	// Test logging config
	if cfg.Logging.Level != "info" {
		t.Errorf("Logging.Level = %s, want info", cfg.Logging.Level)
	}
	if cfg.Logging.Format != "json" {
		t.Errorf("Logging.Format = %s, want json", cfg.Logging.Format)
	}

	// Test environment
	if cfg.Environment != "development" {
		t.Errorf("Environment = %s, want development", cfg.Environment)
	}
}

func TestLoadWithEnvOverride(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test_config.yaml")

	configContent := `
server:
  http_port: 8080
  websocket_port: 8081
  read_timeout: 30s
  write_timeout: 30s
  shutdown_timeout: 30s

database:
  host: localhost
  port: 5433
  database: trade_engine_db
  user: trade_engine_user
  password: trade_engine_pass
  max_open_conns: 25
  max_idle_conns: 5
  conn_max_lifetime: 5m
  ssl_mode: disable

redis:
  host: localhost
  port: 6380
  password: ""
  db: 0
  max_retries: 3
  pool_size: 10
  dial_timeout: 5s
  read_timeout: 3s
  write_timeout: 3s

rabbitmq:
  host: localhost
  port: 5673
  user: admin
  password: changeme
  vhost: /
  timeout: 10s
  heartbeat: 60s

pgbouncer:
  enabled: false
  host: localhost
  port: 6433
  pool_mode: transaction
  max_client_conn: 100

logging:
  level: info
  format: json
  output: stdout
  file_path: ./logs/trade-engine.log
  max_size: 100
  max_age: 30
  max_backups: 5

matching:
  timeout: 1s
  batch_size: 1000

order_book:
  snapshot_interval: 5s
  cache_enabled: true
  cache_ttl: 60s

websocket:
  read_timeout: 10s
  write_timeout: 10s
  ping_interval: 30s
  max_message_size: 65536

environment: development
service_version: 1.0.0
`

	if err := os.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	// Set environment variable to override config
	os.Setenv("TRADE_ENGINE_SERVER_HTTP_PORT", "9000")
	defer os.Unsetenv("TRADE_ENGINE_SERVER_HTTP_PORT")

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	// Test that environment variable overrode the config file value
	if cfg.Server.HTTPPort != 9000 {
		t.Errorf("Server.HTTPPort = %d, want 9000 (from env override)", cfg.Server.HTTPPort)
	}
}

func TestLoadInvalidFile(t *testing.T) {
	_, err := Load("/nonexistent/config.yaml")
	if err == nil {
		t.Error("Load() with invalid file should return error")
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		config  Config
		wantErr bool
	}{
		{
			name: "valid config",
			config: Config{
				Server: ServerConfig{
					HTTPPort:      8080,
					WebSocketPort: 8081,
				},
				Database: DatabaseConfig{
					Host:     "localhost",
					Port:     5432,
					Database: "test_db",
					User:     "test_user",
				},
				Redis: RedisConfig{
					Host: "localhost",
					Port: 6379,
				},
				RabbitMQ: RabbitMQConfig{
					Host: "localhost",
					Port: 5672,
				},
				Logging: LoggingConfig{
					Level:  "info",
					Format: "json",
				},
			},
			wantErr: false,
		},
		{
			name: "invalid http port",
			config: Config{
				Server: ServerConfig{
					HTTPPort:      0,
					WebSocketPort: 8081,
				},
				Database: DatabaseConfig{
					Host:     "localhost",
					Port:     5432,
					Database: "test_db",
					User:     "test_user",
				},
				Redis: RedisConfig{
					Host: "localhost",
					Port: 6379,
				},
				RabbitMQ: RabbitMQConfig{
					Host: "localhost",
					Port: 5672,
				},
				Logging: LoggingConfig{
					Level:  "info",
					Format: "json",
				},
			},
			wantErr: true,
		},
		{
			name: "empty database host",
			config: Config{
				Server: ServerConfig{
					HTTPPort:      8080,
					WebSocketPort: 8081,
				},
				Database: DatabaseConfig{
					Host:     "",
					Port:     5432,
					Database: "test_db",
					User:     "test_user",
				},
				Redis: RedisConfig{
					Host: "localhost",
					Port: 6379,
				},
				RabbitMQ: RabbitMQConfig{
					Host: "localhost",
					Port: 5672,
				},
				Logging: LoggingConfig{
					Level:  "info",
					Format: "json",
				},
			},
			wantErr: true,
		},
		{
			name: "invalid log level",
			config: Config{
				Server: ServerConfig{
					HTTPPort:      8080,
					WebSocketPort: 8081,
				},
				Database: DatabaseConfig{
					Host:     "localhost",
					Port:     5432,
					Database: "test_db",
					User:     "test_user",
				},
				Redis: RedisConfig{
					Host: "localhost",
					Port: 6379,
				},
				RabbitMQ: RabbitMQConfig{
					Host: "localhost",
					Port: 5672,
				},
				Logging: LoggingConfig{
					Level:  "invalid",
					Format: "json",
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Config.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGetDatabaseDSN(t *testing.T) {
	cfg := &Config{
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     5433,
			User:     "test_user",
			Password: "test_pass",
			Database: "test_db",
			SSLMode:  "disable",
		},
		PgBouncer: PgBouncerConfig{
			Enabled: false,
		},
	}

	dsn := cfg.GetDatabaseDSN()
	expected := "host=localhost port=5433 user=test_user password=test_pass dbname=test_db sslmode=disable"
	if dsn != expected {
		t.Errorf("GetDatabaseDSN() = %s, want %s", dsn, expected)
	}

	// Test with PgBouncer enabled
	cfg.PgBouncer.Enabled = true
	cfg.PgBouncer.Host = "pgbouncer"
	cfg.PgBouncer.Port = 6432

	dsn = cfg.GetDatabaseDSN()
	expected = "host=pgbouncer port=6432 user=test_user password=test_pass dbname=test_db sslmode=disable"
	if dsn != expected {
		t.Errorf("GetDatabaseDSN() with PgBouncer = %s, want %s", dsn, expected)
	}
}

func TestGetRedisAddr(t *testing.T) {
	cfg := &Config{
		Redis: RedisConfig{
			Host: "localhost",
			Port: 6380,
		},
	}

	addr := cfg.GetRedisAddr()
	expected := "localhost:6380"
	if addr != expected {
		t.Errorf("GetRedisAddr() = %s, want %s", addr, expected)
	}
}

func TestGetRabbitMQURL(t *testing.T) {
	cfg := &Config{
		RabbitMQ: RabbitMQConfig{
			Host:     "localhost",
			Port:     5673,
			User:     "admin",
			Password: "changeme",
			VHost:    "/",
		},
	}

	url := cfg.GetRabbitMQURL()
	expected := "amqp://admin:changeme@localhost:5673/"
	if url != expected {
		t.Errorf("GetRabbitMQURL() = %s, want %s", url, expected)
	}
}
