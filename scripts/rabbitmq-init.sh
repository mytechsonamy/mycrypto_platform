#!/bin/bash

# RabbitMQ Initialization Script
# This script sets up RabbitMQ exchanges, queues, and bindings for the exchange platform

# Wait for RabbitMQ to be ready
sleep 10

# Define RabbitMQ management API endpoint
RABBITMQ_ADMIN="http://localhost:15672/api"
USER="rabbitmq"
PASS="rabbitmq_dev_password"
VHOST="/"

echo "Setting up RabbitMQ..."

# ============================================================================
# CREATE EXCHANGES
# ============================================================================

echo "Creating exchanges..."

# Auth Events Exchange
rabbitmq-admin declare exchange --vhost "$VHOST" \
  name="auth.events" \
  type="topic" \
  durable="true" || echo "Exchange auth.events already exists"

# User Events Exchange
rabbitmq-admin declare exchange --vhost "$VHOST" \
  name="user.events" \
  type="topic" \
  durable="true" || echo "Exchange user.events already exists"

# Trading Events Exchange
rabbitmq-admin declare exchange --vhost "$VHOST" \
  name="trading.events" \
  type="topic" \
  durable="true" || echo "Exchange trading.events already exists"

# Notifications Exchange
rabbitmq-admin declare exchange --vhost "$VHOST" \
  name="notifications" \
  type="topic" \
  durable="true" || echo "Exchange notifications already exists"

# ============================================================================
# CREATE QUEUES
# ============================================================================

echo "Creating queues..."

# Email notifications queue
rabbitmq-admin declare queue --vhost "$VHOST" \
  name="email.notifications" \
  durable="true" || echo "Queue email.notifications already exists"

# SMS notifications queue
rabbitmq-admin declare queue --vhost "$VHOST" \
  name="sms.notifications" \
  durable="true" || echo "Queue sms.notifications already exists"

# KYC processing queue
rabbitmq-admin declare queue --vhost "$VHOST" \
  name="kyc.processing" \
  durable="true" || echo "Queue kyc.processing already exists"

# Audit logs queue
rabbitmq-admin declare queue --vhost "$VHOST" \
  name="audit.logs" \
  durable="true" || echo "Queue audit.logs already exists"

# User registration queue
rabbitmq-admin declare queue --vhost "$VHOST" \
  name="user.registration" \
  durable="true" || echo "Queue user.registration already exists"

# ============================================================================
# CREATE BINDINGS
# ============================================================================

echo "Creating queue bindings..."

# Bind email notifications queue to notifications exchange
rabbitmq-admin declare binding --vhost "$VHOST" \
  source="notifications" \
  destination="email.notifications" \
  routing_key="email.*" || echo "Binding already exists"

# Bind SMS notifications queue to notifications exchange
rabbitmq-admin declare binding --vhost "$VHOST" \
  source="notifications" \
  destination="sms.notifications" \
  routing_key="sms.*" || echo "Binding already exists"

# Bind KYC queue to user events exchange
rabbitmq-admin declare binding --vhost "$VHOST" \
  source="user.events" \
  destination="kyc.processing" \
  routing_key="kyc.*" || echo "Binding already exists"

# Bind audit logs queue to auth events exchange
rabbitmq-admin declare binding --vhost "$VHOST" \
  source="auth.events" \
  destination="audit.logs" \
  routing_key="*.#" || echo "Binding already exists"

# Bind user registration queue to user events exchange
rabbitmq-admin declare binding --vhost "$VHOST" \
  source="user.events" \
  destination="user.registration" \
  routing_key="registration.*" || echo "Binding already exists"

# ============================================================================
# SET QUEUE PARAMETERS
# ============================================================================

echo "Setting queue parameters..."

# Set message TTL to 24 hours for email notifications
rabbitmq-admin set queue-parameter --vhost "$VHOST" \
  name="email.notifications" \
  parameter="x-message-ttl" \
  value="86400000" || echo "Parameter already set"

# Enable dead letter exchange for email notifications
rabbitmq-admin set queue-parameter --vhost "$VHOST" \
  name="email.notifications" \
  parameter="x-dead-letter-exchange" \
  value="dlx.notifications" || echo "Parameter already set"

# Set max retries
rabbitmq-admin set queue-parameter --vhost "$VHOST" \
  name="email.notifications" \
  parameter="x-max-length" \
  value="1000000" || echo "Parameter already set"

echo "RabbitMQ setup complete!"
echo ""
echo "Created Exchanges:"
echo "  - auth.events"
echo "  - user.events"
echo "  - trading.events"
echo "  - notifications"
echo ""
echo "Created Queues:"
echo "  - email.notifications"
echo "  - sms.notifications"
echo "  - kyc.processing"
echo "  - audit.logs"
echo "  - user.registration"
echo ""
echo "Management UI: http://localhost:15672"
echo "Credentials: rabbitmq / rabbitmq_dev_password"
