# Deployment & Infrastructure Configuration

## 1. Docker Configuration

### 1.1 Backend API Dockerfile

```dockerfile
# Dockerfile for FastAPI backend service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 1.2 ML Inference Service Dockerfile

```dockerfile
# Dockerfile for ML inference service (TensorFlow Serving)
FROM tensorflow/serving:2.13.0

# Copy model files
COPY models/ /models/

# Expose gRPC and REST API ports
EXPOSE 8500 8501

# Set model config
ENV MODEL_NAME=sports_prediction
ENV MODEL_BASE_PATH=/models
```

### 1.3 Mobile App Build Configuration

```yaml
# .github/workflows/mobile-build.yml (GitHub Actions)
name: Build Mobile Apps

on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd mobile
          npm install
      - name: Build iOS
        run: |
          cd mobile
          npx expo build:ios --type archive
      - name: Upload to App Store
        # Configure App Store Connect API key

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd mobile
          npm install
      - name: Build Android
        run: |
          cd mobile
          npx expo build:android --type app-bundle
      - name: Upload to Play Store
        # Configure Play Store API
```

## 2. Kubernetes Configuration

### 2.1 Backend API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prediction-api
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: prediction-api
  template:
    metadata:
      labels:
        app: prediction-api
    spec:
      containers:
      - name: api
        image: your-registry/prediction-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: prediction-api-service
  namespace: production
spec:
  selector:
    app: prediction-api
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: prediction-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prediction-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2.2 ML Inference Service Deployment

```yaml
# k8s/ml-inference-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: tensorflow-serving
        image: tensorflow/serving:2.13.0
        ports:
        - containerPort: 8500
          name: grpc
        - containerPort: 8501
          name: rest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
            nvidia.com/gpu: 1  # GPU for faster inference
          limits:
            memory: "4Gi"
            cpu: "2000m"
            nvidia.com/gpu: 1
        volumeMounts:
        - name: models
          mountPath: /models
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: model-storage
```

### 2.3 Redis Deployment

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: production
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### 2.4 PostgreSQL Deployment

```yaml
# k8s/postgres-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres
  replicas: 1  # Primary
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: timescale/timescaledb:latest-pg15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "sportsprediction"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
---
# Read replicas for scaling reads
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-replica
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: postgres-replica
  template:
    metadata:
      labels:
        app: postgres-replica
    spec:
      containers:
      - name: postgres
        image: timescale/timescaledb:latest-pg15
        # Configure as read replica
        # ... (similar config, read-only)
```

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: sport-prediction
  KUBERNETES_NAMESPACE: production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run linting
        run: |
          flake8 app/
          black --check app/
          mypy app/
      
      - name: Run tests
        run: |
          pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        uses: azure/setup-kubectl@v2
      
      - name: Set up kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/prediction-api \
            api=$ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }} \
            -n $KUBERNETES_NAMESPACE
          kubectl rollout status deployment/prediction-api -n $KUBERNETES_NAMESPACE
      
      - name: Run smoke tests
        run: |
          # Wait for deployment to be ready
          sleep 30
          # Run smoke tests against production
          pytest tests/smoke/ --base-url https://api.sportsprediction.com
```

## 4. Infrastructure as Code (Terraform)

### 4.1 AWS EKS Cluster

```hcl
# terraform/eks-cluster.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "sport-prediction-cluster"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_cloudwatch_log_group.cluster,
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
  ]
}

# Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 3
  }

  instance_types = ["t3.large"]
  capacity_type  = "ON_DEMAND"

  labels = {
    Environment = "production"
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]
}

# GPU Node Group for ML Inference
resource "aws_eks_node_group" "gpu" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "gpu-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = 1
    max_size     = 5
    min_size     = 1
  }

  instance_types = ["g4dn.xlarge"]  # GPU instances
  capacity_type  = "ON_DEMAND"

  labels = {
    Environment = "production"
    Workload    = "ml-inference"
  }

  taint {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

### 4.2 RDS PostgreSQL (Managed Database)

```hcl
# terraform/rds.tf
resource "aws_db_instance" "postgres" {
  identifier             = "sport-prediction-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.r5.xlarge"
  allocated_storage      = 500
  max_allocated_storage  = 1000
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = "sportsprediction"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  skip_final_snapshot = false
  final_snapshot_identifier = "sport-prediction-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name        = "sport-prediction-db"
    Environment = "production"
  }
}

# Read Replicas
resource "aws_db_instance" "postgres_replica" {
  count              = 3
  identifier         = "sport-prediction-db-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier
  instance_class     = "db.r5.large"

  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Name        = "sport-prediction-db-replica-${count.index + 1}"
    Environment = "production"
  }
}
```

### 4.3 ElastiCache Redis

```hcl
# terraform/redis.tf
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "sport-prediction-redis"
  description                = "Redis cluster for caching"
  
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r6g.large"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled           = true
  
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name        = "sport-prediction-redis"
    Environment = "production"
  }
}
```

## 5. Environment Configuration

### 5.1 Environment Variables Template

```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sportsprediction
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# API
API_V1_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:3000","https://app.sportsprediction.com"]

# ML Inference
ML_INFERENCE_URL=http://ml-inference:8501
ML_MODEL_VERSION=v1.2.3

# External APIs
SPORTRADAR_API_KEY=your-api-key
SPORTRADAR_API_URL=https://api.sportradar.com
WEATHER_API_KEY=your-weather-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_MODELS=sport-prediction-models

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@sportsprediction.com
```

## 6. Database Migrations

### 6.1 Alembic Migration Setup

```python
# alembic.ini (excerpt)
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://user:pass@localhost/dbname

# alembic/env.py
from app.database import Base
from app.models import *  # Import all models

target_metadata = Base.metadata
```

### 6.2 Initial Migration Script

```python
# alembic/versions/001_initial_schema.py
"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-02-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('subscription_tier', sa.String(20), default='free'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # Teams table
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('league', sa.String(50), nullable=False),
        sa.Column('abbreviation', sa.String(10)),
        sa.Column('logo_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('idx_teams_league', 'teams', ['league'])

    # Games table
    op.create_table(
        'games',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('league', sa.String(50), nullable=False),
        sa.Column('home_team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id')),
        sa.Column('away_team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id')),
        sa.Column('scheduled_time', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(20), default='scheduled'),
        sa.Column('home_score', sa.Integer(), default=0),
        sa.Column('away_score', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('idx_games_league_scheduled', 'games', ['league', 'scheduled_time'])
    op.create_index('idx_games_status', 'games', ['status'])

    # Predictions table
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('games.id')),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('home_win_probability', sa.Numeric(5, 4), nullable=False),
        sa.Column('away_win_probability', sa.Numeric(5, 4), nullable=False),
        sa.Column('expected_home_score', sa.Numeric(5, 2)),
        sa.Column('expected_away_score', sa.Numeric(5, 2)),
        sa.Column('confidence_level', sa.String(20)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('idx_predictions_game', 'predictions', ['game_id', 'created_at'])
    op.create_unique_constraint('uq_prediction_game_model_time', 'predictions', ['game_id', 'model_version', 'created_at'])

    # Enable TimescaleDB extension for live_predictions
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    
    # Live predictions hypertable
    op.create_table(
        'live_predictions',
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('home_win_probability', sa.Numeric(5, 4)),
        sa.Column('away_win_probability', sa.Numeric(5, 4)),
        sa.Column('current_score_home', sa.Integer()),
        sa.Column('current_score_away', sa.Integer()),
        sa.PrimaryKeyConstraint('time', 'game_id'),
    )
    op.execute("SELECT create_hypertable('live_predictions', 'time');")
    op.create_index('idx_live_predictions_game_time', 'live_predictions', ['game_id', 'time'])

def downgrade():
    op.drop_table('live_predictions')
    op.drop_table('predictions')
    op.drop_table('games')
    op.drop_table('teams')
    op.drop_table('users')
```

## 7. Monitoring & Alerting

### 7.1 Prometheus Metrics

```python
# app/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# API metrics
api_requests_total = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status_code']
)

api_request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

# ML metrics
ml_predictions_total = Counter(
    'ml_predictions_total',
    'Total ML predictions',
    ['model_name', 'prediction_type']
)

ml_prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'ML prediction latency',
    ['model_name']
)

ml_model_accuracy = Gauge(
    'ml_model_accuracy',
    'ML model accuracy',
    ['model_name', 'metric_type']
)

# Database metrics
db_connection_pool_size = Gauge(
    'db_connection_pool_size',
    'Database connection pool size'
)

# Cache metrics
cache_hits_total = Counter(
    'cache_hits_total',
    'Cache hits',
    ['cache_type']
)

cache_misses_total = Counter(
    'cache_misses_total',
    'Cache misses',
    ['cache_type']
)
```

### 7.2 Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Sports Prediction API Dashboard",
    "panels": [
      {
        "title": "API Request Rate",
        "targets": [
          {
            "expr": "rate(api_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "API Latency (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, api_request_duration_seconds_bucket)",
            "legendFormat": "P95 Latency"
          }
        ]
      },
      {
        "title": "ML Prediction Accuracy",
        "targets": [
          {
            "expr": "ml_model_accuracy",
            "legendFormat": "{{model_name}} - {{metric_type}}"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))",
            "legendFormat": "Hit Rate"
          }
        ]
      }
    ]
  }
}
```

### 7.3 Alerting Rules (Prometheus)

```yaml
# prometheus/alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(api_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, api_request_duration_seconds_bucket) > 0.5
        for: 5m
        annotations:
          summary: "High API latency"
          description: "P95 latency is {{ $value }}s"

  - name: ml_alerts
    rules:
      - alert: ModelAccuracyDrop
        expr: ml_model_accuracy < 0.60
        for: 1h
        annotations:
          summary: "Model accuracy dropped below threshold"
          description: "Model {{ $labels.model_name }} accuracy is {{ $value }}"

      - alert: HighPredictionLatency
        expr: histogram_quantile(0.95, ml_prediction_latency_seconds_bucket) > 1.0
        for: 5m
        annotations:
          summary: "High ML prediction latency"
          description: "P95 latency is {{ $value }}s"

  - name: infrastructure_alerts
    rules:
      - alert: DatabaseConnectionPoolExhausted
        expr: db_connection_pool_size / db_connection_pool_max > 0.9
        for: 5m
        annotations:
          summary: "Database connection pool nearly exhausted"

      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.7
        for: 10m
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}%"
```

## 8. Secrets Management

### 8.1 Kubernetes Secrets

```yaml
# k8s/secrets.yaml (use sealed-secrets or external-secrets operator in production)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  url: postgresql://user:password@postgres:5432/sportsprediction
  user: dbuser
  password: secure-password-here

---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
  namespace: production
type: Opaque
stringData:
  secret: your-jwt-secret-key-min-32-chars

---
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
  namespace: production
type: Opaque
stringData:
  sportradar-api-key: your-api-key
  weather-api-key: your-weather-key
```

### 8.2 AWS Secrets Manager Integration

```python
# app/config/secrets.py
import boto3
import json
from functools import lru_cache

@lru_cache()
def get_secret(secret_name: str) -> dict:
    """Retrieve secret from AWS Secrets Manager"""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_secrets = get_secret('sport-prediction/database')
api_secrets = get_secret('sport-prediction/api-keys')
```

## 9. Disaster Recovery

### 9.1 Backup Strategy

```bash
# scripts/backup-database.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Backup PostgreSQL
pg_dump $DATABASE_URL > "/backups/${BACKUP_FILE}"

# Compress
gzip "/backups/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "/backups/${BACKUP_FILE}.gz" \
  s3://sport-prediction-backups/database/${BACKUP_FILE}.gz

# Delete local backups older than 7 days
find /backups -name "backup_*.sql.gz" -mtime +7 -delete

# Keep last 30 days in S3
aws s3 ls s3://sport-prediction-backups/database/ | \
  awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'" {print $4}' | \
  xargs -I {} aws s3 rm s3://sport-prediction-backups/database/{}
```

### 9.2 Recovery Procedures

```markdown
# Disaster Recovery Runbook

## Database Recovery
1. Identify latest backup from S3
2. Restore to new RDS instance
3. Update connection strings
4. Verify data integrity
5. Switch traffic to new instance

## Application Recovery
1. Scale down current deployment
2. Deploy from latest Docker image
3. Verify health checks
4. Gradually scale up

## ML Model Recovery
1. Retrieve latest model from S3 model registry
2. Deploy to ML inference service
3. Verify predictions match expected outputs
4. Monitor accuracy metrics
```
