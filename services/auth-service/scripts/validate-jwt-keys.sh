#!/bin/bash

##############################################################################
# JWT Key Validation Script
#
# Purpose: Validate RSA key pair for JWT signing
# Usage: ./scripts/validate-jwt-keys.sh
#
# This script performs security checks on JWT keys:
# - Verifies keys exist and are readable
# - Checks key sizes (should be 4096-bit)
# - Validates key pair integrity (modulus match)
# - Checks file permissions
# - Verifies keys are in .gitignore
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYS_DIR="$PROJECT_ROOT/keys"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for failed checks
FAILED_CHECKS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Main validation logic
main() {
    print_header "JWT Key Validation"

    # Check if keys directory exists
    echo "1. Checking keys directory..."
    if [ ! -d "$KEYS_DIR" ]; then
        print_error "Keys directory not found at: $KEYS_DIR"
        echo "   Run: mkdir -p keys && openssl genrsa -out keys/private.pem 4096"
        return 1
    fi
    print_success "Keys directory found"

    # Check private key exists
    echo ""
    echo "2. Checking private key..."
    if [ ! -f "$KEYS_DIR/private.pem" ]; then
        print_error "Private key not found at: $KEYS_DIR/private.pem"
        echo "   Run: openssl genrsa -out keys/private.pem 4096"
        return 1
    fi
    print_success "Private key found"

    # Check public key exists
    echo ""
    echo "3. Checking public key..."
    if [ ! -f "$KEYS_DIR/public.pem" ]; then
        print_error "Public key not found at: $KEYS_DIR/public.pem"
        echo "   Run: openssl rsa -in keys/private.pem -pubout -out keys/public.pem"
        return 1
    fi
    print_success "Public key found"

    # Check private key permissions (should be 400)
    echo ""
    echo "4. Checking private key permissions..."
    PRIV_PERMS=$(stat -f "%Lp" "$KEYS_DIR/private.pem" 2>/dev/null || stat -c "%a" "$KEYS_DIR/private.pem" 2>/dev/null)
    if [ "$PRIV_PERMS" != "400" ]; then
        print_warning "Private key permissions are $PRIV_PERMS (should be 400)"
        echo "   Run: chmod 400 keys/private.pem"
        ((FAILED_CHECKS++))
    else
        print_success "Private key permissions correct (400)"
    fi

    # Check public key permissions (should be 444)
    echo ""
    echo "5. Checking public key permissions..."
    PUB_PERMS=$(stat -f "%Lp" "$KEYS_DIR/public.pem" 2>/dev/null || stat -c "%a" "$KEYS_DIR/public.pem" 2>/dev/null)
    if [ "$PUB_PERMS" != "444" ]; then
        print_warning "Public key permissions are $PUB_PERMS (should be 444)"
        echo "   Run: chmod 444 keys/public.pem"
        ((FAILED_CHECKS++))
    else
        print_success "Public key permissions correct (444)"
    fi

    # Check private key is readable
    echo ""
    echo "6. Checking private key is readable..."
    if [ -r "$KEYS_DIR/private.pem" ]; then
        print_success "Private key is readable"
    else
        print_error "Private key is not readable"
        return 1
    fi

    # Check key size
    echo ""
    echo "7. Checking key size..."
    KEY_SIZE=$(openssl rsa -in "$KEYS_DIR/private.pem" -text -noout 2>/dev/null | grep "Private-Key" | grep -oE "[0-9]+" | head -1)
    if [ -z "$KEY_SIZE" ]; then
        print_error "Could not determine key size"
        return 1
    fi

    if [ "$KEY_SIZE" -ge 4096 ]; then
        print_success "Key size is $KEY_SIZE bits (secure)"
    elif [ "$KEY_SIZE" -ge 2048 ]; then
        print_warning "Key size is $KEY_SIZE bits (minimum acceptable, upgrade to 4096 recommended)"
        ((FAILED_CHECKS++))
    else
        print_error "Key size is $KEY_SIZE bits (too small, must be 2048+)"
        return 1
    fi

    # Verify key pair integrity (modulus match)
    echo ""
    echo "8. Validating key pair integrity..."
    PRIV_MODULUS=$(openssl rsa -in "$KEYS_DIR/private.pem" -modulus -noout 2>/dev/null | openssl md5)
    PUB_MODULUS=$(openssl rsa -in "$KEYS_DIR/private.pem" -pubout 2>/dev/null | openssl rsa -pubin -modulus -noout | openssl md5)

    if [ "$PRIV_MODULUS" = "$PUB_MODULUS" ]; then
        print_success "Key pair is valid (modulus matches)"
    else
        print_error "Key pair is invalid (modulus mismatch)"
        echo "   Private modulus: $PRIV_MODULUS"
        echo "   Public modulus: $PUB_MODULUS"
        return 1
    fi

    # Check that keys are in .gitignore
    echo ""
    echo "9. Checking git configuration..."
    # Find .gitignore - could be at various levels
    GITIGNORE_PATH=""
    for path in "$PROJECT_ROOT/.gitignore" "$PROJECT_ROOT/../.gitignore" "$PROJECT_ROOT/../../.gitignore" "$PROJECT_ROOT/../../../.gitignore"; do
        if [ -f "$path" ]; then
            GITIGNORE_PATH="$path"
            break
        fi
    done

    if [ -n "$GITIGNORE_PATH" ]; then
        if grep -q "^\*\.pem$" "$GITIGNORE_PATH"; then
            print_success "*.pem is in .gitignore"
        else
            print_warning "*.pem not found in .gitignore (should be added)"
            ((FAILED_CHECKS++))
        fi
    else
        print_warning ".gitignore not found (cannot verify git configuration)"
    fi

    # Check if keys are tracked by git
    echo ""
    echo "10. Checking git status..."
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        if git check-ignore -q "$KEYS_DIR/private.pem" 2>/dev/null; then
            print_success "Private key is properly ignored by git"
        else
            print_warning "Private key might be tracked by git"
            echo "   Add to .gitignore if not already present"
            ((FAILED_CHECKS++))
        fi
    else
        print_info "Not a git repository, skipping git status check"
    fi

    # Check .env.example has JWT configuration
    echo ""
    echo "11. Checking .env.example configuration..."
    if grep -q "JWT_ALGORITHM=RS256" "$PROJECT_ROOT/.env.example"; then
        print_success ".env.example has JWT_ALGORITHM=RS256"
    else
        print_warning ".env.example missing JWT_ALGORITHM=RS256"
        ((FAILED_CHECKS++))
    fi

    if grep -q "JWT_PRIVATE_KEY_PATH" "$PROJECT_ROOT/.env.example"; then
        print_success ".env.example has JWT_PRIVATE_KEY_PATH"
    else
        print_warning ".env.example missing JWT_PRIVATE_KEY_PATH"
        ((FAILED_CHECKS++))
    fi

    # Summary
    echo ""
    print_header "Validation Summary"

    if [ $FAILED_CHECKS -eq 0 ]; then
        print_success "All validation checks passed!"
        echo ""
        print_info "Key Details:"
        echo "  Location: $KEYS_DIR"
        echo "  Algorithm: RSA"
        echo "  Key Size: $KEY_SIZE bits"
        echo "  Private Key: $(stat -f '%z bytes' "$KEYS_DIR/private.pem" 2>/dev/null || stat -c '%s bytes' "$KEYS_DIR/private.pem")"
        echo "  Public Key: $(stat -f '%z bytes' "$KEYS_DIR/public.pem" 2>/dev/null || stat -c '%s bytes' "$KEYS_DIR/public.pem")"
        echo ""
        echo "JWT Configuration Ready for:"
        echo "  - Local development (docker-compose)"
        echo "  - CI/CD pipeline deployment"
        echo "  - Production deployment (after moving to AWS Secrets Manager)"
        return 0
    else
        print_error "$FAILED_CHECKS validation check(s) failed"
        echo ""
        echo "Please fix the issues above before using the keys for JWT signing."
        return 1
    fi
}

# Run main function
main
exit $?
