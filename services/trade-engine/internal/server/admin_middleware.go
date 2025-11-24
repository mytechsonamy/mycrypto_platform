// ============================================================================
// MYTRADER TRADE ENGINE - ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================================
// Component: Admin API Security and Authorization
// Version: 1.0
// Sprint 2 - TASK-BACKEND-014
// ============================================================================

package server

import (
	"encoding/json"
	"net"
	"net/http"
	"os"
	"strings"

	"go.uber.org/zap"
)

// AdminAuthMiddleware provides authentication and authorization for admin endpoints
// It enforces:
// 1. Admin token validation
// 2. IP whitelist (internal network only)
// 3. Request logging and audit trail
type AdminAuthMiddleware struct {
	logger         *zap.Logger
	requiredToken  string
	allowedNetworks []*net.IPNet
}

// NewAdminAuthMiddleware creates a new admin authentication middleware
func NewAdminAuthMiddleware(logger *zap.Logger) *AdminAuthMiddleware {
	// Get admin token from environment
	adminToken := os.Getenv("ADMIN_TOKEN")
	if adminToken == "" {
		logger.Warn("ADMIN_TOKEN not set, using default (INSECURE!)")
		adminToken = "admin-token-change-me"
	}

	// Parse allowed networks (internal networks)
	allowedNetworks := parseAllowedNetworks(logger)

	return &AdminAuthMiddleware{
		logger:          logger.With(zap.String("middleware", "admin-auth")),
		requiredToken:   adminToken,
		allowedNetworks: allowedNetworks,
	}
}

// Middleware returns the HTTP middleware function
func (m *AdminAuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract client IP
		clientIP := getClientIP(r)

		// Log admin access attempt
		m.logger.Info("Admin endpoint access attempt",
			zap.String("ip", clientIP),
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method),
		)

		// Check IP whitelist
		if !m.isIPAllowed(clientIP) {
			m.logger.Warn("Admin access denied: external IP",
				zap.String("ip", clientIP),
				zap.String("path", r.URL.Path),
			)
			m.respondWithError(w, http.StatusForbidden, "EXTERNAL_ACCESS_DENIED", "Access denied from external network")
			return
		}

		// Check admin token
		token := r.Header.Get("X-Admin-Token")
		if token == "" {
			m.logger.Warn("Admin access denied: missing token",
				zap.String("ip", clientIP),
			)
			m.respondWithError(w, http.StatusUnauthorized, "MISSING_TOKEN", "Admin token required")
			return
		}

		if token != m.requiredToken {
			m.logger.Warn("Admin access denied: invalid token",
				zap.String("ip", clientIP),
			)
			m.respondWithError(w, http.StatusForbidden, "INVALID_TOKEN", "Invalid admin token")
			return
		}

		// Token and IP validated, proceed
		m.logger.Info("Admin access granted",
			zap.String("ip", clientIP),
			zap.String("path", r.URL.Path),
		)

		next.ServeHTTP(w, r)
	})
}

// isIPAllowed checks if the client IP is in the allowed networks
func (m *AdminAuthMiddleware) isIPAllowed(ipStr string) bool {
	// In development mode, allow localhost
	if os.Getenv("APP_ENV") == "development" {
		if ipStr == "127.0.0.1" || ipStr == "::1" || ipStr == "localhost" {
			return true
		}
	}

	ip := net.ParseIP(ipStr)
	if ip == nil {
		m.logger.Error("Failed to parse IP", zap.String("ip", ipStr))
		return false
	}

	// Check against allowed networks
	for _, network := range m.allowedNetworks {
		if network.Contains(ip) {
			return true
		}
	}

	return false
}

// respondWithError sends an error response
func (m *AdminAuthMiddleware) respondWithError(w http.ResponseWriter, code int, errorCode, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{
		"code":    errorCode,
		"message": message,
	})
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// getClientIP extracts the real client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (set by proxies/load balancers)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}

	return ip
}

// parseAllowedNetworks parses allowed IP networks from environment
func parseAllowedNetworks(logger *zap.Logger) []*net.IPNet {
	var networks []*net.IPNet

	// Default internal networks
	defaultNetworks := []string{
		"10.0.0.0/8",      // Private network (Class A)
		"172.16.0.0/12",   // Private network (Class B)
		"192.168.0.0/16",  // Private network (Class C)
		"127.0.0.0/8",     // Loopback
		"::1/128",         // IPv6 loopback
	}

	// Get custom allowed networks from environment
	allowedNetworksEnv := os.Getenv("ADMIN_ALLOWED_NETWORKS")
	if allowedNetworksEnv != "" {
		customNetworks := strings.Split(allowedNetworksEnv, ",")
		defaultNetworks = append(defaultNetworks, customNetworks...)
	}

	// Parse all networks
	for _, cidr := range defaultNetworks {
		cidr = strings.TrimSpace(cidr)
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			logger.Error("Failed to parse allowed network",
				zap.String("cidr", cidr),
				zap.Error(err),
			)
			continue
		}
		networks = append(networks, network)
	}

	logger.Info("Admin allowed networks configured",
		zap.Int("network_count", len(networks)),
	)

	return networks
}

// ============================================================================
// RATE LIMITING MIDDLEWARE (Optional Enhancement)
// ============================================================================

// AdminRateLimiter provides rate limiting for admin endpoints
type AdminRateLimiter struct {
	logger *zap.Logger
	// Add rate limiting implementation as needed
}

// NewAdminRateLimiter creates a new rate limiter for admin endpoints
func NewAdminRateLimiter(logger *zap.Logger) *AdminRateLimiter {
	return &AdminRateLimiter{
		logger: logger.With(zap.String("middleware", "admin-ratelimit")),
	}
}

// Middleware returns the rate limiting middleware
func (rl *AdminRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement rate limiting logic
		// For now, just pass through
		next.ServeHTTP(w, r)
	})
}
