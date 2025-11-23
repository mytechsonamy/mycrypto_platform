package logger

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger creates a new Zap logger with the specified level and format
func NewLogger(level string, format string) (*zap.Logger, error) {
	// Parse log level
	var zapLevel zapcore.Level
	switch level {
	case "debug":
		zapLevel = zapcore.DebugLevel
	case "info":
		zapLevel = zapcore.InfoLevel
	case "warn":
		zapLevel = zapcore.WarnLevel
	case "error":
		zapLevel = zapcore.ErrorLevel
	case "fatal":
		zapLevel = zapcore.FatalLevel
	default:
		return nil, fmt.Errorf("invalid log level: %s", level)
	}

	// Create encoder config
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "timestamp",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "message",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// Create encoder based on format
	var encoder zapcore.Encoder
	if format == "json" {
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	} else {
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	}

	// Create core
	core := zapcore.NewCore(
		encoder,
		zapcore.AddSync(os.Stdout),
		zapLevel,
	)

	// Create logger with caller information
	logger := zap.New(core, zap.AddCaller(), zap.AddCallerSkip(0))

	return logger, nil
}

// NewDevelopmentLogger creates a logger optimized for development
func NewDevelopmentLogger() (*zap.Logger, error) {
	return zap.NewDevelopment()
}

// NewProductionLogger creates a logger optimized for production
func NewProductionLogger() (*zap.Logger, error) {
	return zap.NewProduction()
}

// WithFields adds structured fields to the logger
func WithFields(logger *zap.Logger, fields ...zap.Field) *zap.Logger {
	return logger.With(fields...)
}

// WithRequestID adds a request ID field to the logger
func WithRequestID(logger *zap.Logger, requestID string) *zap.Logger {
	return logger.With(zap.String("request_id", requestID))
}

// WithTraceID adds a trace ID field to the logger
func WithTraceID(logger *zap.Logger, traceID string) *zap.Logger {
	return logger.With(zap.String("trace_id", traceID))
}

// WithUserID adds a user ID field to the logger
func WithUserID(logger *zap.Logger, userID string) *zap.Logger {
	return logger.With(zap.String("user_id", userID))
}

// WithService adds a service name field to the logger
func WithService(logger *zap.Logger, service string) *zap.Logger {
	return logger.With(zap.String("service", service))
}
