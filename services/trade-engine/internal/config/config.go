// ============================================================================
// MYTRADER TRADE ENGINE - CONFIGURATION
// ============================================================================

package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Redis    RedisConfig    `yaml:"redis"`
	Kafka    KafkaConfig    `yaml:"kafka"`
	Logging  LoggingConfig  `yaml:"logging"`
}

type ServerConfig struct {
	Port         int           `yaml:"port"`
	Mode         string        `yaml:"mode"` // debug, release
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	IdleTimeout  time.Duration `yaml:"idle_timeout"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Database string `yaml:"database"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	SSLMode  string `yaml:"ssl_mode"`
	PoolSize int    `yaml:"pool_size"`
}

type RedisConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
	PoolSize int    `yaml:"pool_size"`
}

type KafkaConfig struct {
	Brokers []string `yaml:"brokers"`
	Topics  struct {
		TradeEvents string `yaml:"trade_events"`
		OrderEvents string `yaml:"order_events"`
	} `yaml:"topics"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`  // debug, info, warn, error
	Format string `yaml:"format"` // json, text
}

// Load reads configuration from file or environment variables
func Load() (*Config, error) {
	configPath := getEnv("CONFIG_PATH", "config.yaml")

	cfg := &Config{
		// Defaults
		Server: ServerConfig{
			Port:         8080,
			Mode:         "debug",
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			Database: "mytrader_trade_engine",
			User:     "trade_engine_app",
			SSLMode:  "disable",
			PoolSize: 50,
		},
		Redis: RedisConfig{
			Host:     "localhost",
			Port:     6379,
			DB:       0,
			PoolSize: 100,
		},
		Kafka: KafkaConfig{
			Brokers: []string{"localhost:9092"},
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	// Load from file if exists
	if _, err := os.Stat(configPath); err == nil {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}

		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("failed to parse config file: %w", err)
		}
	}

	// Override with environment variables
	cfg.overrideFromEnv()

	// Set default Kafka topics if not configured
	if cfg.Kafka.Topics.TradeEvents == "" {
		cfg.Kafka.Topics.TradeEvents = "trade-events"
	}
	if cfg.Kafka.Topics.OrderEvents == "" {
		cfg.Kafka.Topics.OrderEvents = "order-events"
	}

	return cfg, nil
}

func (c *Config) overrideFromEnv() {
	// Server
	if port := getEnv("PORT", ""); port != "" {
		fmt.Sscanf(port, "%d", &c.Server.Port)
	}
	if mode := getEnv("GIN_MODE", ""); mode != "" {
		c.Server.Mode = mode
	}

	// Database
	if host := getEnv("DB_HOST", ""); host != "" {
		c.Database.Host = host
	}
	if port := getEnv("DB_PORT", ""); port != "" {
		fmt.Sscanf(port, "%d", &c.Database.Port)
	}
	if db := getEnv("DB_NAME", ""); db != "" {
		c.Database.Database = db
	}
	if user := getEnv("DB_USER", ""); user != "" {
		c.Database.User = user
	}
	if pass := getEnv("DB_PASSWORD", ""); pass != "" {
		c.Database.Password = pass
	}

	// Redis
	if host := getEnv("REDIS_HOST", ""); host != "" {
		c.Redis.Host = host
	}
	if port := getEnv("REDIS_PORT", ""); port != "" {
		fmt.Sscanf(port, "%d", &c.Redis.Port)
	}

	// Kafka
	if brokers := getEnv("KAFKA_BROKERS", ""); brokers != "" {
		c.Kafka.Brokers = []string{brokers}
	}

	// Logging
	if level := getEnv("LOG_LEVEL", ""); level != "" {
		c.Logging.Level = level
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ConnectionString returns PostgreSQL connection string
func (c *DatabaseConfig) ConnectionString() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Database, c.SSLMode,
	)
}

// RedisAddr returns Redis address
func (c *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
