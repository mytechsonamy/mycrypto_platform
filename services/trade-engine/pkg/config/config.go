package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config represents the complete application configuration
type Config struct {
	Server     ServerConfig     `mapstructure:"server"`
	Database   DatabaseConfig   `mapstructure:"database"`
	Redis      RedisConfig      `mapstructure:"redis"`
	RabbitMQ   RabbitMQConfig   `mapstructure:"rabbitmq"`
	PgBouncer  PgBouncerConfig  `mapstructure:"pgbouncer"`
	Logging    LoggingConfig    `mapstructure:"logging"`
	Matching   MatchingConfig   `mapstructure:"matching"`
	OrderBook  OrderBookConfig  `mapstructure:"order_book"`
	WebSocket  WebSocketConfig  `mapstructure:"websocket"`
	WalletClient WalletClientConfig `mapstructure:"wallet_client"`
	Environment string          `mapstructure:"environment"`
	ServiceVersion string       `mapstructure:"service_version"`
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	HTTPPort        int           `mapstructure:"http_port"`
	WebSocketPort   int           `mapstructure:"websocket_port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

// DatabaseConfig holds PostgreSQL database configuration
type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	Database           string        `mapstructure:"database"`
	User               string        `mapstructure:"user"`
	Password           string        `mapstructure:"password"`
	MaxOpenConns       int           `mapstructure:"max_open_conns"`
	MaxIdleConns       int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime    time.Duration `mapstructure:"conn_max_lifetime"`
	ConnMaxIdleTime    time.Duration `mapstructure:"conn_max_idle_time"`
	SSLMode            string        `mapstructure:"ssl_mode"`
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host         string        `mapstructure:"host"`
	Port         int           `mapstructure:"port"`
	Password     string        `mapstructure:"password"`
	DB           int           `mapstructure:"db"`
	MaxRetries   int           `mapstructure:"max_retries"`
	PoolSize     int           `mapstructure:"pool_size"`
	DialTimeout  time.Duration `mapstructure:"dial_timeout"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

// RabbitMQConfig holds RabbitMQ configuration
type RabbitMQConfig struct {
	Host      string        `mapstructure:"host"`
	Port      int           `mapstructure:"port"`
	User      string        `mapstructure:"user"`
	Password  string        `mapstructure:"password"`
	VHost     string        `mapstructure:"vhost"`
	Timeout   time.Duration `mapstructure:"timeout"`
	Heartbeat time.Duration `mapstructure:"heartbeat"`
}

// PgBouncerConfig holds PgBouncer configuration
type PgBouncerConfig struct {
	Enabled       bool   `mapstructure:"enabled"`
	Host          string `mapstructure:"host"`
	Port          int    `mapstructure:"port"`
	PoolMode      string `mapstructure:"pool_mode"`
	MaxClientConn int    `mapstructure:"max_client_conn"`
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"`
	Output     string `mapstructure:"output"`
	FilePath   string `mapstructure:"file_path"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxAge     int    `mapstructure:"max_age"`
	MaxBackups int    `mapstructure:"max_backups"`
}

// MatchingConfig holds matching engine configuration
type MatchingConfig struct {
	Timeout   time.Duration `mapstructure:"timeout"`
	BatchSize int           `mapstructure:"batch_size"`
}

// OrderBookConfig holds order book configuration
type OrderBookConfig struct {
	SnapshotInterval time.Duration `mapstructure:"snapshot_interval"`
	CacheEnabled     bool          `mapstructure:"cache_enabled"`
	CacheTTL         time.Duration `mapstructure:"cache_ttl"`
}

// WebSocketConfig holds WebSocket configuration
type WebSocketConfig struct {
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	PingInterval    time.Duration `mapstructure:"ping_interval"`
	MaxMessageSize  int64         `mapstructure:"max_message_size"`
}

// WalletClientConfig holds wallet service client configuration
type WalletClientConfig struct {
	BaseURL                    string        `mapstructure:"base_url"`
	Timeout                    time.Duration `mapstructure:"timeout"`
	MaxRetries                 int           `mapstructure:"max_retries"`
	RetryWaitTime              time.Duration `mapstructure:"retry_wait_time"`
	RetryMaxWaitTime           time.Duration `mapstructure:"retry_max_wait_time"`
	CircuitBreakerEnabled      bool          `mapstructure:"circuit_breaker_enabled"`
	CircuitBreakerMaxRequests  uint32        `mapstructure:"circuit_breaker_max_requests"`
	CircuitBreakerInterval     time.Duration `mapstructure:"circuit_breaker_interval"`
	CircuitBreakerTimeout      time.Duration `mapstructure:"circuit_breaker_timeout"`
	CircuitBreakerFailureRatio float64       `mapstructure:"circuit_breaker_failure_ratio"`
	MaxIdleConns               int           `mapstructure:"max_idle_conns"`
	MaxIdleConnsPerHost        int           `mapstructure:"max_idle_conns_per_host"`
	IdleConnTimeout            time.Duration `mapstructure:"idle_conn_timeout"`
	RateLimitEnabled           bool          `mapstructure:"rate_limit_enabled"`
	RateLimitRPS               int           `mapstructure:"rate_limit_rps"`
	UseMock                    bool          `mapstructure:"use_mock"`
}

// Load loads configuration from the specified YAML file and environment variables
// Environment variables with TRADE_ENGINE_ prefix override YAML values
func Load(configPath string) (*Config, error) {
	v := viper.New()

	// Set config file path
	v.SetConfigFile(configPath)
	v.SetConfigType("yaml")

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Enable environment variable override
	v.SetEnvPrefix("TRADE_ENGINE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	var config Config
	if err := v.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return &config, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Validate server config
	if c.Server.HTTPPort <= 0 || c.Server.HTTPPort > 65535 {
		return fmt.Errorf("invalid http_port: %d (must be between 1 and 65535)", c.Server.HTTPPort)
	}
	if c.Server.WebSocketPort <= 0 || c.Server.WebSocketPort > 65535 {
		return fmt.Errorf("invalid websocket_port: %d (must be between 1 and 65535)", c.Server.WebSocketPort)
	}

	// Validate database config
	if c.Database.Host == "" {
		return fmt.Errorf("database host cannot be empty")
	}
	if c.Database.Port <= 0 || c.Database.Port > 65535 {
		return fmt.Errorf("invalid database port: %d", c.Database.Port)
	}
	if c.Database.Database == "" {
		return fmt.Errorf("database name cannot be empty")
	}
	if c.Database.User == "" {
		return fmt.Errorf("database user cannot be empty")
	}

	// Validate Redis config
	if c.Redis.Host == "" {
		return fmt.Errorf("redis host cannot be empty")
	}
	if c.Redis.Port <= 0 || c.Redis.Port > 65535 {
		return fmt.Errorf("invalid redis port: %d", c.Redis.Port)
	}

	// Validate RabbitMQ config
	if c.RabbitMQ.Host == "" {
		return fmt.Errorf("rabbitmq host cannot be empty")
	}
	if c.RabbitMQ.Port <= 0 || c.RabbitMQ.Port > 65535 {
		return fmt.Errorf("invalid rabbitmq port: %d", c.RabbitMQ.Port)
	}

	// Validate logging config
	validLogLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true, "fatal": true}
	if !validLogLevels[c.Logging.Level] {
		return fmt.Errorf("invalid log level: %s (must be debug, info, warn, error, or fatal)", c.Logging.Level)
	}

	validLogFormats := map[string]bool{"json": true, "text": true}
	if !validLogFormats[c.Logging.Format] {
		return fmt.Errorf("invalid log format: %s (must be json or text)", c.Logging.Format)
	}

	// Validate wallet client config
	if !c.WalletClient.UseMock {
		if c.WalletClient.BaseURL == "" {
			return fmt.Errorf("wallet_client base_url cannot be empty when not using mock")
		}
		if c.WalletClient.Timeout <= 0 {
			return fmt.Errorf("wallet_client timeout must be positive")
		}
	}

	return nil
}

// GetDatabaseDSN returns the PostgreSQL connection string
func (c *Config) GetDatabaseDSN() string {
	// Use PgBouncer if enabled
	host := c.Database.Host
	port := c.Database.Port
	if c.PgBouncer.Enabled {
		host = c.PgBouncer.Host
		port = c.PgBouncer.Port
	}

	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		host,
		port,
		c.Database.User,
		c.Database.Password,
		c.Database.Database,
		c.Database.SSLMode,
	)
}

// GetRedisAddr returns the Redis connection address
func (c *Config) GetRedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Redis.Host, c.Redis.Port)
}

// GetRabbitMQURL returns the RabbitMQ connection URL
func (c *Config) GetRabbitMQURL() string {
	return fmt.Sprintf(
		"amqp://%s:%s@%s:%d%s",
		c.RabbitMQ.User,
		c.RabbitMQ.Password,
		c.RabbitMQ.Host,
		c.RabbitMQ.Port,
		c.RabbitMQ.VHost,
	)
}
