package server

import (
	"net/http"
	"time"

	"github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"
)

// MetricsResponseWriter wraps http.ResponseWriter to capture response metrics
type MetricsResponseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
}

// WriteHeader captures the status code
func (w *MetricsResponseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Write captures bytes written
func (w *MetricsResponseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.bytesWritten += int64(n)
	return n, err
}

// MetricsMiddleware records HTTP request metrics
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create wrapped response writer
		wrapped := &MetricsResponseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default to 200
		}

		// Record start time
		start := time.Now()

		// Call next handler
		next.ServeHTTP(wrapped, r)

		// Record metrics
		duration := time.Since(start).Seconds()
		metrics.RecordHTTPRequest(
			r.Method,
			r.URL.Path,
			wrapped.statusCode,
			duration,
			wrapped.bytesWritten,
		)
	})
}
