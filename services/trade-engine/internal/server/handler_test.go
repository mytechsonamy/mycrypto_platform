package server

import (
	"testing"

	"github.com/mytrader/trade-engine/pkg/logger"
)

func TestNewHandler(t *testing.T) {
	log, err := logger.NewLogger("info", "json")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	h := NewHandler(log, nil, nil)
	if h == nil {
		t.Error("NewHandler() returned nil")
	}

	if h.logger == nil {
		t.Error("Handler logger is nil")
	}
}
