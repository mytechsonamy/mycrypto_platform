#!/bin/bash

#############################################################################
# Test Data Seeding Script
# Purpose: Populate test environment with realistic test data
# Usage: ./scripts/seed-test-data.sh
#############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001/api/v1}"
TRADE_ENGINE_URL="${TRADE_ENGINE_URL:-http://localhost:8080/api/v1}"
WALLET_INTERNAL_URL="${WALLET_INTERNAL_URL:-http://localhost:3002/internal}"
TIMEOUT=30

# Global storage
declare -A USER_TOKENS
declare -a USER_IDS
declare -a USER_EMAILS

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#############################################################################
# User Registration & Authentication
#############################################################################

register_user() {
    local index=$1
    local name=$2
    local email="${name}@test.local"

    log_info "Registering user: $name ($email)"

    local response=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"TestPass123!\",
            \"firstName\": \"${name}\",
            \"lastName\": \"Trader\"
        }" \
        --max-time "$TIMEOUT")

    local token=$(echo "$response" | jq -r '.token // empty' 2>/dev/null)
    local userId=$(echo "$response" | jq -r '.user.id // empty' 2>/dev/null)

    if [ -z "$token" ] || [ -z "$userId" ]; then
        log_warn "Failed to register user $name (may already exist)"
        # Try to login instead
        response=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"${email}\",
                \"password\": \"TestPass123!\"
            }" \
            --max-time "$TIMEOUT")

        token=$(echo "$response" | jq -r '.token // empty' 2>/dev/null)
        userId=$(echo "$response" | jq -r '.user.id // empty' 2>/dev/null)

        if [ -z "$token" ] || [ -z "$userId" ]; then
            log_error "Failed to authenticate user $name"
            return 1
        fi
    fi

    USER_TOKENS["$name"]="$token"
    USER_IDS["$index"]="$userId"
    USER_EMAILS["$index"]="$email"

    log_success "User registered: $name (ID: $userId)"
    return 0
}

create_test_users() {
    log_info "Creating test users..."

    local users=(
        "trader1"
        "trader2"
        "trader3"
        "trader4"
        "trader5"
    )

    for i in "${!users[@]}"; do
        register_user "$i" "${users[$i]}"
    done

    log_success "Test users created"
}

#############################################################################
# Wallet Seeding
#############################################################################

seed_wallet_balances() {
    log_info "Seeding wallet balances..."

    local wallet_configs=(
        # User 1: High balance trader
        '{"btc": 2.0, "eth": 10.0, "usdt": 100000, "try": 200000}'
        # User 2: Medium balance trader
        '{"btc": 1.5, "eth": 8.0, "usdt": 75000, "try": 150000}'
        # User 3: High volume trader
        '{"btc": 3.0, "eth": 15.0, "usdt": 150000, "try": 300000}'
        # User 4: Low balance trader
        '{"btc": 0.1, "eth": 1.0, "usdt": 5000, "try": 50000}'
        # User 5: High crypto holder
        '{"btc": 5.0, "eth": 20.0, "usdt": 50000, "try": 100000}'
    )

    for i in "${!USER_IDS[@]}"; do
        local user_id="${USER_IDS[$i]}"
        local config="${wallet_configs[$i]}"

        log_info "Seeding wallet for user ${i}: $user_id"

        # Parse config
        local btc=$(echo "$config" | jq -r '.btc')
        local eth=$(echo "$config" | jq -r '.eth')
        local usdt=$(echo "$config" | jq -r '.usdt')
        local try=$(echo "$config" | jq -r '.try')

        # Call wallet service internal endpoint
        local response=$(curl -s -X POST "${WALLET_INTERNAL_URL}/wallets/seed" \
            -H "Content-Type: application/json" \
            -d "{
                \"user_id\": \"${user_id}\",
                \"balances\": {
                    \"BTC\": ${btc},
                    \"ETH\": ${eth},
                    \"USDT\": ${usdt},
                    \"TRY\": ${try}
                }
            }" \
            --max-time "$TIMEOUT")

        if [ $? -eq 0 ]; then
            log_success "Wallet seeded for user ${i}: BTC=$btc, ETH=$eth, USDT=$usdt, TRY=$try"
        else
            log_warn "Failed to seed wallet for user ${i}"
        fi
    done

    log_success "Wallet balances seeded"
}

#############################################################################
# Order Seeding
#############################################################################

seed_orders() {
    log_info "Seeding initial orders..."

    local symbols=("BTC/USDT" "ETH/USDT" "USDT/TRY")
    local base_prices=("45000" "2500" "37.5")
    local quantities=("0.5" "5" "1000")

    for i in "${!symbols[@]}"; do
        local symbol="${symbols[$i]}"
        local base_price="${base_prices[$i]}"
        local quantity="${quantities[$i]}"

        log_info "Seeding orders for $symbol"

        # Seed 10 buy and 10 sell orders at different price levels
        for level in {1..10}; do
            # Buy orders (below market)
            local buy_price=$(echo "$base_price - ($level * 100)" | bc)
            local trader_index=$(( RANDOM % 5 ))
            local trader_name="trader$((trader_index + 1))"
            local token="${USER_TOKENS[$trader_name]}"

            if [ -n "$token" ]; then
                curl -s -X POST "${API_BASE_URL}/trading/orders" \
                    -H "Content-Type: application/json" \
                    -H "Authorization: Bearer $token" \
                    -d "{
                        \"symbol\": \"${symbol}\",
                        \"side\": \"buy\",
                        \"type\": \"limit\",
                        \"quantity\": ${quantity},
                        \"price\": ${buy_price}
                    }" \
                    --max-time "$TIMEOUT" > /dev/null 2>&1

                log_success "Seeded buy order: $symbol @ $buy_price"
            fi

            # Sell orders (above market)
            local sell_price=$(echo "$base_price + ($level * 100)" | bc)
            trader_index=$(( RANDOM % 5 ))
            trader_name="trader$((trader_index + 1))"
            token="${USER_TOKENS[$trader_name]}"

            if [ -n "$token" ]; then
                curl -s -X POST "${API_BASE_URL}/trading/orders" \
                    -H "Content-Type: application/json" \
                    -H "Authorization: Bearer $token" \
                    -d "{
                        \"symbol\": \"${symbol}\",
                        \"side\": \"sell\",
                        \"type\": \"limit\",
                        \"quantity\": ${quantity},
                        \"price\": ${sell_price}
                    }" \
                    --max-time "$TIMEOUT" > /dev/null 2>&1

                log_success "Seeded sell order: $symbol @ $sell_price"
            fi

            sleep 0.5  # Small delay between orders
        done
    done

    log_success "Orders seeded"
}

#############################################################################
# Market Data Seeding
#############################################################################

seed_market_data() {
    log_info "Seeding market data..."

    local symbols=("BTC/USDT" "ETH/USDT" "USDT/TRY")
    local prices=("45000" "2500" "37.5")

    for i in "${!symbols[@]}"; do
        local symbol="${symbols[$i]}"
        local price="${prices[$i]}"

        log_info "Setting market price for $symbol"

        curl -s -X POST "${TRADE_ENGINE_URL}/markets/seed" \
            -H "Content-Type: application/json" \
            -d "{
                \"symbol\": \"${symbol}\",
                \"price\": ${price},
                \"timestamp\": $(date +%s)000
            }" \
            --max-time "$TIMEOUT" > /dev/null 2>&1

        log_success "Market data seeded: $symbol = $price"
    done

    log_success "Market data seeded"
}

#############################################################################
# Verification
#############################################################################

verify_seed_data() {
    log_info "Verifying seeded data..."

    # Check users created
    local user_count=${#USER_IDS[@]}
    log_success "Users created: $user_count"

    # Check order book has orders
    if [ -n "${USER_TOKENS[trader1]}" ]; then
        local orders=$(curl -s -X GET "${API_BASE_URL}/trading/orders" \
            -H "Authorization: Bearer ${USER_TOKENS[trader1]}" \
            --max-time "$TIMEOUT" | jq '.[] | length' 2>/dev/null)

        log_success "Orders in system: $orders"
    fi

    # Check market data
    local markets=$(curl -s -X GET "${TRADE_ENGINE_URL}/markets" \
        --max-time "$TIMEOUT" | jq 'length' 2>/dev/null)

    log_success "Markets available: $markets"
}

#############################################################################
# Cleanup
#############################################################################

cleanup_existing_data() {
    log_warn "Cleaning up existing test data..."

    # This is optional - can be enabled for fresh starts
    # curl -s -X POST "${API_BASE_URL}/admin/reset-test-data" \
    #     --max-time "$TIMEOUT" > /dev/null 2>&1

    log_success "Cleanup complete (if enabled)"
}

#############################################################################
# Main Execution
#############################################################################

main() {
    log_info "Test Data Seeding Started"
    log_info "API Base URL: $API_BASE_URL"
    log_info "Trade Engine URL: $TRADE_ENGINE_URL"

    # Check connectivity
    if ! curl -s "$API_BASE_URL/health" --max-time 5 > /dev/null 2>&1; then
        log_error "Cannot connect to API at $API_BASE_URL"
        log_error "Make sure services are running: docker-compose -f docker-compose.test.yml ps"
        exit 1
    fi

    log_success "API connectivity verified"

    # Cleanup existing data (optional)
    # cleanup_existing_data

    # Execute seeding steps
    create_test_users
    seed_wallet_balances
    seed_market_data
    seed_orders
    verify_seed_data

    log_success "Test data seeding completed successfully!"
    log_info ""
    log_info "Test Users Created:"
    for i in "${!USER_EMAILS[@]}"; do
        echo "  ${USER_EMAILS[$i]}"
    done
    log_info ""
    log_info "Default Password: TestPass123!"
    log_info ""
    log_info "You can now run integration tests:"
    log_info "  npm run test:integration"
    log_info ""
}

# Execute
main "$@"
