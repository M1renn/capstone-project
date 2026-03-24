# E-Learning Platform Integration — Enterprise Integration with Node-RED

## Overview

This project implements an Enterprise Application Integration solution for an E-Learning Platform using Node-RED as an orchestration engine. The system coordinates multiple microservices:

- Enrollment Service
- Payment Service  
- Progress Tracking Service
- Certificate Service

The architecture follows Enterprise Integration Patterns with Circuit Breaker pattern, Retry with Exponential Backoff, and Fallback mechanisms to ensure system resilience and fault tolerance.

---

## Architecture Decision

### Why Node-RED?

Node-RED serves as the central orchestration layer because:

- Provides visual flow-based programming for clear workflow visualization
- Simplifies service coordination through drag-and-drop nodes
- Supports HTTP, webhooks, and data transformations out of the box
- Enables clear implementation of Enterprise Integration Patterns
- Built-in support for retry logic and error handling mechanisms

Node-RED acts as the single entry point for all learning enrollment processes, managing the entire student journey from enrollment to certification.

---

## System Architecture Diagrams

### System Architecture Diagram

```mermaid
graph TB
    Client[Student Client] --> NR[Node-RED Orchestrator<br/>Port 1880]
    
    subgraph "E-Learning Services"
        ES[Enrollment Service<br/>:3001]
        PS[Payment Service<br/>:3002]
        PRS[Progress Service<br/>:3003]
        CS[Certificate Service<br/>:3004]
    end
    
    subgraph "Resilience Layer"
        CB[Circuit Breaker]
        RT[Retry with Backoff]
        FB[Fallback Handler]
        AU[Audit Logger]
    end
    
    NR --> ES
    NR --> PS
    NR --> PRS
    NR --> CS
    
    NR --> CB
    NR --> RT
    NR --> FB
    NR --> AU
    
    style NR fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style CB fill:#ffccbc,stroke:#bf360c,stroke-width:2px
    style RT fill:#ffccbc,stroke:#bf360c,stroke-width:2px
    style FB fill:#ffe0b2,stroke:#e65100,stroke-width:2px
Sequence Diagram

<img width="4560" height="5043" alt="sequance diag" src="https://github.com/user-attachments/assets/5271f0ed-9cfe-447d-afe7-fe509bb8a201" />

Integration Diagram

<img width="7006" height="2184" alt="integration diag" src="https://github.com/user-attachments/assets/24e94fc9-169c-4383-a536-96d56c44c727" />

Business Flow
Happy Path
Student submits enrollment request via POST /enroll

Node-RED generates unique sessionId and initializes audit trail

Enrollment is created in Enrollment Service

Payment is processed with exponential backoff retry on transient failures

Progress tracking is initialized for the course

Certificate is generated asynchronously

Success response returned to student with certificate URL

Final status: completed

Failure Scenarios
Payment Failure
Payment authorization fails after maximum retry attempts

Enrollment is automatically rolled back

Student receives detailed error response

Audit trail captures complete failure context

Circuit Breaker Activated
Enrollment service becomes unavailable

Circuit breaker tracks consecutive failures

After 3 failures, circuit opens

Fallback response returns deferred processing confirmation

Requests are queued for later processing

Certificate Generation Delay
Certificate generation is non-critical path

If certificate service is slow, flow continues

Student receives completion status

Certificate generated asynchronously and delivered later

Audit trail marks certificate status as pending

Resilience Features
Circuit Breaker Pattern
State	Behavior	Transition
CLOSED	Normal operation, requests pass through	Failures increment counter
OPEN	Service considered unavailable after 3 failures	Fallback triggered immediately
HALF-OPEN	Test requests sent periodically	Success → CLOSED, Failure → OPEN
Retry with Exponential Backoff
Service	Max Retries	Backoff Strategy	Delay Pattern
Enrollment	3	Circuit Breaker	Failure threshold based
Payment	3	Exponential	1s, 2s, 4s
Progress	2	Fixed	1.5s each attempt
Certificate	1	Async	Non-blocking, no wait
Fallback Mechanism
When services are unavailable:

Enrollment Service: Request queued for asynchronous processing with confirmation to student

Payment Service: Transaction held for manual review with notification

Progress Service: Tracking initialized with delay, student notified of slight delay

Certificate Service: Generation scheduled for retry, student receives certificate later

Traceability with Session ID
Each request receives a unique sessionId used throughout the entire journey:

Generated at flow initialization

Propagated to all service calls

Recorded in audit trail at each step

Returned in final response

Enables full request tracing across distributed services

Example Response
json
{
  "sessionId": "1742834567890-abc123def",
  "enrollmentId": "ENR-12345",
  "userId": "john@example.com",
  "courseId": "CS-101",
  "status": "completed",
  "audit": [
    {
      "step": "enrollment",
      "status": "success",
      "timestamp": 1742834567890,
      "enrollmentId": "ENR-12345"
    },
    {
      "step": "payment",
      "status": "success",
      "timestamp": 1742834568890,
      "paymentId": "PAY-67890"
    },
    {
      "step": "progress",
      "status": "success",
      "timestamp": 1742834569890,
      "progressId": "PROG-24680"
    },
    {
      "step": "certificate",
      "status": "success",
      "timestamp": 1742834570890,
      "certificateId": "CERT-13579"
    }
  ],
  "certificateUrl": "https://platform.com/certs/CERT-13579.pdf"
}
Error Response Format
json
{
  "status": "payment_failed",
  "message": "Payment declined after 3 retry attempts",
  "sessionId": "1742834567890-abc123def",
  "enrollmentId": "ENR-12345",
  "step": "payment",
  "timestamp": "2024-03-24T22:30:00.000Z",
  "audit": [
    {
      "step": "enrollment",
      "status": "success",
      "timestamp": 1742834567890
    },
    {
      "step": "payment",
      "status": "failed",
      "error": "Payment declined",
      "timestamp": 1742834568890
    }
  ]
}
Enterprise Integration Patterns
Pattern	Problem	Implementation	Purpose
Circuit Breaker	Prevent cascading failures	Failure counter + state machine	Service protection
Retry with Backoff	Handle transient failures	Exponential delay logic	Self-healing
Fallback	Graceful degradation	Deferred processing queue	User experience
Correlation Identifier	Track distributed requests	sessionId propagation	Observability
Content-Based Router	Dynamic routing	Switch nodes	Flow control
Request-Reply	Synchronous communication	HTTP request-response	Immediate feedback
Process Manager	Central workflow control	Node-RED orchestration	Coordination
Message Store	Audit trail	Audit array in flow	Debugging
Error Handling Implementation
Circuit Breaker Function
javascript
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

if (msg.circuitState === undefined) {
    msg.circuitState = 'CLOSED';
    msg.failureCount = 0;
}

if (msg.error || (msg.payload && msg.payload.status === 'error')) {
    msg.failureCount++;
    
    if (msg.failureCount >= MAX_RETRIES) {
        msg.circuitState = 'OPEN';
        msg.circuitOpen = true;
        return [null, msg];
    }
    
    msg.retryDelay = TIMEOUT_MS;
    return [msg, null];
}

msg.failureCount = 0;
msg.circuitState = 'CLOSED';
return [msg, null];
Retry with Exponential Backoff
javascript
const MAX_ATTEMPTS = 3;
const BASE_DELAY = 1000;

if (msg.retryAttempts === undefined) {
    msg.retryAttempts = 0;
}

if (msg.error || (msg.payload && msg.payload.status === 'error')) {
    msg.retryAttempts++;
    
    if (msg.retryAttempts <= MAX_ATTEMPTS) {
        msg.retryDelay = BASE_DELAY * Math.pow(2, msg.retryAttempts - 1);
        delete msg.error;
        return [msg, null];
    } else {
        return [null, msg];
    }
}

msg.retryAttempts = 0;
return [msg, null];
Fallback Handler
javascript
msg.payload = {
    status: "deferred",
    message: "Service temporarily unavailable. Request queued.",
    sessionId: msg.sessionId,
    step: msg.step,
    timestamp: new Date().toISOString()
};

msg.audit.push({
    step: msg.step,
    status: 'circuit_open',
    fallback: true,
    timestamp: Date.now()
});

return msg;
Testing Strategy
Normal Flow Test
bash
curl -X POST http://localhost:1880/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "student": "john.doe@example.com",
    "course": "CS-101: Introduction to Programming",
    "amount": 299.99,
    "paymentMethod": "credit_card"
  }'
Circuit Breaker Test
bash
# Stop enrollment service
docker-compose stop enrollment-service

# Send 4 requests - circuit opens after 3 failures
for i in 1 2 3 4; do
  curl -X POST http://localhost:1880/enroll \
    -H "Content-Type: application/json" \
    -d '{"student":"test@example.com","course":"CS-101"}'
  echo "Request $i sent"
  sleep 1
done

# Check circuit breaker logs
docker-compose logs nodered | grep -E "(Circuit|fallback)"

# Restart service
docker-compose start enrollment-service
Exponential Backoff Test
bash
# Stop payment service
docker-compose stop payment-service

# Send request and observe retry delays
time curl -X POST http://localhost:1880/enroll \
  -H "Content-Type: application/json" \
  -d '{"student":"test@example.com","course":"CS-101"}'

# Check retry patterns
docker-compose logs nodered | grep -E "(retry|backoff)"

# Restart service
docker-compose start payment-service
Failure Simulation via Environment Variables
Edit docker-compose.yml to simulate failures:

yaml
enrollment-service:
  environment:
    FAIL_MODE: always  # Simulate constant failures

payment-service:
  environment:
    PAYMENT_FAIL_MODE: random  # 50% random failure rate

progress-service:
  environment:
    PROGRESS_FAIL_MODE: always  # Always fail

certificate-service:
  environment:
    CERTIFICATE_FAIL_MODE: always  # Async failure
System Architecture
Component Overview
Component	Technology	Port	Purpose
Node-RED	Node-RED + Custom flows	1880	Orchestration & EIP patterns
Enrollment Service	Node.js / Express	3001	Student enrollment management
Payment Service	Node.js / Express	3002	Payment processing & charging
Progress Service	Node.js / Express	3003	Course progress tracking
Certificate Service	Node.js / Express	3004	Certificate generation & delivery
Network Architecture
text

Integration Style
Synchronous HTTP communication for request-response pattern

Centralized orchestration via Node-RED flow engine

Circuit Breaker pattern for service protection

Compensation-based consistency for payment rollback

Session ID propagation for end-to-end tracing

Asynchronous processing for non-critical operations

Design Principles
Principle	Implementation
Loose Coupling	Services communicate only through HTTP APIs
Centralized Workflow	Node-RED manages all business processes
Fault Tolerance	Circuit breaker + retry with backoff
Observability	Session ID + step-by-step audit trail
Graceful Degradation	Fallback responses when services unavailable
Idempotency	Safe retries with session ID tracking
Separation of Concerns	Each service has single responsibility
Performance & Scalability
Stateless orchestrator - Node-RED instances can scale horizontally

Exponential backoff - Prevents overwhelming failing services

Circuit breaker - Protects downstream services from cascading failures

Async processing - Non-blocking certificate generation

Audit logging - Minimal performance overhead with in-memory tracking

Connection pooling - HTTP keep-alive for service communication

How to Run
Prerequisites
Docker Desktop 20.10 or higher

Docker Compose 2.0 or higher

4GB available RAM

Ports 1880, 3001-3004 available

Quick Start
bash
# Clone or navigate to project directory
cd elearning-platform

# Start all services with build
docker compose up -d --build

# Check all services are running
docker compose ps

# View real-time logs
docker compose logs -f

# Access Node-RED UI
open http://localhost:1880
Service URLs
Service	URL	Purpose
Node-RED UI	http://localhost:1880	Flow editor and monitoring
Enrollment API	http://localhost:3001	Enrollment management
Payment API	http://localhost:3002	Payment processing
Progress API	http://localhost:3003	Progress tracking
Certificate API	http://localhost:3004	Certificate generation
Service Management
bash
# Restart specific service
docker compose restart payment-service

# Stop all services
docker compose down

# Stop and remove volumes (clean start)
docker compose down -v

# View logs for specific service
docker compose logs -f nodered

# Execute commands in container
docker compose exec nodered sh
Evaluation Criteria Mapping
Criterion	Implementation
Orchestration	Node-RED central workflow coordination
Circuit Breaker	State machine with 3-failure threshold
Retry with Backoff	Exponential delay pattern (1s, 2s, 4s)
Fallback Mechanisms	Graceful degradation responses
Enterprise Integration Patterns	7+ patterns implemented
Error Handling	Comprehensive error capture + formatting
Traceability	Session ID + detailed audit trail
Docker Integration	Complete docker-compose setup
Documentation	Detailed README + diagrams
AI Usage Disclosure
AI tools were used to:

Understand Enterprise Integration Patterns and best practices

Improve architecture design and resilience strategies

Validate flow logic and edge case handling

Generate and format Mermaid diagrams

Structure comprehensive documentation

Create test scenarios and validation approaches

All implementation, code review, testing, and architectural decisions were manually performed and adapted for production-like scenarios.

References
Enterprise Integration Patterns

Circuit Breaker Pattern

Exponential Backoff

Node-RED Documentation

Mermaid Diagram Syntax

Saga Pattern

Conclusion
This project successfully demonstrates:

Circuit Breaker pattern for service resilience and fault isolation

Retry with exponential backoff for handling transient failures

Fallback mechanisms for graceful degradation during outages

Session-based traceability with comprehensive audit trails

Enterprise Integration Patterns applied in real-world context

Production-like microservice orchestration with Node-RED

Async processing for non-critical operations

The solution provides a robust, fault-tolerant integration platform suitable for enterprise e-learning applications, with clear observability and graceful degradation under failure conditions.
