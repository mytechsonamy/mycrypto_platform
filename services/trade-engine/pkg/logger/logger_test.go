package logger

import (
	"testing"

	"go.uber.org/zap"
)

func TestNewLogger(t *testing.T) {
	tests := []struct {
		name    string
		level   string
		format  string
		wantErr bool
	}{
		{
			name:    "debug level json format",
			level:   "debug",
			format:  "json",
			wantErr: false,
		},
		{
			name:    "info level json format",
			level:   "info",
			format:  "json",
			wantErr: false,
		},
		{
			name:    "warn level json format",
			level:   "warn",
			format:  "json",
			wantErr: false,
		},
		{
			name:    "error level json format",
			level:   "error",
			format:  "json",
			wantErr: false,
		},
		{
			name:    "fatal level json format",
			level:   "fatal",
			format:  "json",
			wantErr: false,
		},
		{
			name:    "info level text format",
			level:   "info",
			format:  "text",
			wantErr: false,
		},
		{
			name:    "invalid level",
			level:   "invalid",
			format:  "json",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger, err := NewLogger(tt.level, tt.format)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewLogger() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && logger == nil {
				t.Error("NewLogger() returned nil logger")
			}
			if logger != nil {
				// Ensure logger can be synced without errors
				_ = logger.Sync()
			}
		})
	}
}

func TestNewDevelopmentLogger(t *testing.T) {
	logger, err := NewDevelopmentLogger()
	if err != nil {
		t.Fatalf("NewDevelopmentLogger() error = %v", err)
	}
	if logger == nil {
		t.Error("NewDevelopmentLogger() returned nil logger")
	}

	// Test logging
	logger.Info("test message")
	_ = logger.Sync()
}

func TestNewProductionLogger(t *testing.T) {
	logger, err := NewProductionLogger()
	if err != nil {
		t.Fatalf("NewProductionLogger() error = %v", err)
	}
	if logger == nil {
		t.Error("NewProductionLogger() returned nil logger")
	}

	// Test logging
	logger.Info("test message")
	_ = logger.Sync()
}

func TestWithFields(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	fields := []zap.Field{
		zap.String("key1", "value1"),
		zap.Int("key2", 123),
	}

	newLogger := WithFields(logger, fields...)
	if newLogger == nil {
		t.Error("WithFields() returned nil logger")
	}

	// Test logging with fields
	newLogger.Info("test message with fields")
	_ = newLogger.Sync()
}

func TestWithRequestID(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	requestID := "req-12345"
	newLogger := WithRequestID(logger, requestID)
	if newLogger == nil {
		t.Error("WithRequestID() returned nil logger")
	}

	// Test logging with request ID
	newLogger.Info("test message with request ID")
	_ = newLogger.Sync()
}

func TestWithTraceID(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	traceID := "trace-12345"
	newLogger := WithTraceID(logger, traceID)
	if newLogger == nil {
		t.Error("WithTraceID() returned nil logger")
	}

	// Test logging with trace ID
	newLogger.Info("test message with trace ID")
	_ = newLogger.Sync()
}

func TestWithUserID(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	userID := "user-12345"
	newLogger := WithUserID(logger, userID)
	if newLogger == nil {
		t.Error("WithUserID() returned nil logger")
	}

	// Test logging with user ID
	newLogger.Info("test message with user ID")
	_ = newLogger.Sync()
}

func TestWithService(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	service := "trade-engine"
	newLogger := WithService(logger, service)
	if newLogger == nil {
		t.Error("WithService() returned nil logger")
	}

	// Test logging with service name
	newLogger.Info("test message with service name")
	_ = newLogger.Sync()
}

func TestLoggerLevels(t *testing.T) {
	logger, err := NewLogger("debug", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	// Test different log levels
	logger.Debug("debug message")
	logger.Info("info message")
	logger.Warn("warn message")
	logger.Error("error message")

	_ = logger.Sync()
}

func TestLoggerWithMultipleFields(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	// Chain multiple field additions
	enrichedLogger := WithService(
		WithRequestID(
			WithUserID(logger, "user-123"),
			"req-456",
		),
		"trade-engine",
	)

	enrichedLogger.Info("test message with multiple fields",
		zap.String("order_id", "order-789"),
		zap.Float64("price", 50000.50),
	)

	_ = enrichedLogger.Sync()
}

func TestLoggerJSONFormat(t *testing.T) {
	logger, err := NewLogger("info", "json")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	// Log a message and verify no panic
	logger.Info("test json format",
		zap.String("field1", "value1"),
		zap.Int("field2", 42),
		zap.Bool("field3", true),
	)

	_ = logger.Sync()
}

func TestLoggerTextFormat(t *testing.T) {
	logger, err := NewLogger("info", "text")
	if err != nil {
		t.Fatalf("NewLogger() error = %v", err)
	}

	// Log a message and verify no panic
	logger.Info("test text format",
		zap.String("field1", "value1"),
		zap.Int("field2", 42),
		zap.Bool("field3", true),
	)

	_ = logger.Sync()
}

func BenchmarkNewLogger(b *testing.B) {
	for i := 0; i < b.N; i++ {
		logger, _ := NewLogger("info", "json")
		_ = logger.Sync()
	}
}

func BenchmarkLoggerInfo(b *testing.B) {
	logger, _ := NewLogger("info", "json")
	defer logger.Sync()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		logger.Info("benchmark message",
			zap.String("key", "value"),
			zap.Int("count", i),
		)
	}
}

func BenchmarkLoggerWithFields(b *testing.B) {
	logger, _ := NewLogger("info", "json")
	defer logger.Sync()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enrichedLogger := WithRequestID(
			WithUserID(logger, "user-123"),
			"req-456",
		)
		enrichedLogger.Info("benchmark message")
	}
}
