package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mytrader/trade-engine/pkg/logger"
)

func TestRequestIDMiddleware(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := RequestIDMiddleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, req)

	requestID := w.Header().Get("X-Request-ID")
	if requestID == "" {
		t.Error("X-Request-ID header not set")
	}
}

func TestRequestIDMiddlewareWithExisting(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := RequestIDMiddleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Request-ID", "existing-id")
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, req)

	requestID := w.Header().Get("X-Request-ID")
	if requestID != "existing-id" {
		t.Errorf("X-Request-ID = %s, want existing-id", requestID)
	}
}

func TestLoggingMiddleware(t *testing.T) {
	log, err := logger.NewLogger("info", "json")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	})

	middleware := LoggingMiddleware(log)(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	w.Header().Set("X-Request-ID", "test-id")

	middleware.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Status code = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestRecoveryMiddleware(t *testing.T) {
	log, err := logger.NewLogger("info", "json")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("test panic")
	})

	middleware := RecoveryMiddleware(log)(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	w.Header().Set("X-Request-ID", "test-id")

	// Should not panic
	middleware.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Status code = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func TestCORSMiddleware(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := CORSMiddleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, req)

	// Check CORS headers
	if w.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Error("Access-Control-Allow-Origin header not set")
	}
	if w.Header().Get("Access-Control-Allow-Methods") == "" {
		t.Error("Access-Control-Allow-Methods header not set")
	}
	if w.Header().Get("Access-Control-Allow-Headers") == "" {
		t.Error("Access-Control-Allow-Headers header not set")
	}
}

func TestCORSMiddlewareOptions(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := CORSMiddleware(handler)

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, req)

	// OPTIONS should return 200
	if w.Code != http.StatusOK {
		t.Errorf("Status code = %d, want %d", w.Code, http.StatusOK)
	}
}
