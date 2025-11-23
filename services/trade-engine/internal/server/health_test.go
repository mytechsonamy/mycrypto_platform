package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mytrader/trade-engine/pkg/logger"
)

func TestHealth(t *testing.T) {
	// Create logger
	log, err := logger.NewLogger("info", "json")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	// Create handler
	h := NewHandler(log, nil, nil)

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	// Call handler
	h.Health(w, req)

	// Check status code
	if w.Code != http.StatusOK {
		t.Errorf("Health() status = %d, want %d", w.Code, http.StatusOK)
	}

	// Check content type
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Health() Content-Type = %s, want application/json", contentType)
	}

	// Parse response
	var response HealthResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Check response fields
	if response.Status != "ok" {
		t.Errorf("Health() status = %s, want ok", response.Status)
	}
	if response.Version != "1.0.0" {
		t.Errorf("Health() version = %s, want 1.0.0", response.Version)
	}
}

func TestReadyWithoutDependencies(t *testing.T) {
	// Create logger
	log, err := logger.NewLogger("info", "json")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	// Create handler without dependencies
	h := NewHandler(log, nil, nil)

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	// Call handler
	h.Ready(w, req)

	// Check status code (should be 200 OK even without dependencies configured)
	if w.Code != http.StatusOK {
		t.Errorf("Ready() status = %d, want %d", w.Code, http.StatusOK)
	}

	// Parse response
	var response ReadinessResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Check response fields
	if response.Status != "ready" {
		t.Errorf("Ready() status = %s, want ready", response.Status)
	}

	// Check services map exists
	if response.Services == nil {
		t.Error("Ready() services map is nil")
	}

	// Database and Redis should be "not_configured"
	if response.Services["database"] != "not_configured" {
		t.Errorf("Ready() database status = %s, want not_configured", response.Services["database"])
	}
	if response.Services["redis"] != "not_configured" {
		t.Errorf("Ready() redis status = %s, want not_configured", response.Services["redis"])
	}
}
