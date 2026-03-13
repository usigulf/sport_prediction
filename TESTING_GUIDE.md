# Testing Guide

## Overview

This guide covers testing strategies, best practices, and how to run tests for the Sports Prediction platform.

## Test Structure

```
backend/tests/
├── conftest.py           # Pytest fixtures and configuration
├── test_auth.py          # Authentication endpoint tests
├── test_predictions.py   # Prediction endpoint tests
├── test_ml_service.py    # ML service tests
└── test_integration.py    # Integration tests (if needed)
```

## Running Tests

### Run All Tests

```bash
cd backend
pytest
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### Run Specific Test File

```bash
pytest tests/test_auth.py
```

### Run Specific Test

```bash
pytest tests/test_auth.py::test_login_success
```

### Run Tests in Parallel

```bash
pip install pytest-xdist
pytest -n auto
```

### Run Only Fast Tests

```bash
pytest -m "not slow"
```

## Test Categories

### Unit Tests

Test individual functions and methods in isolation.

**Example:**
```python
def test_calculate_win_probability():
    result = calculate_win_probability(0.65, 0.35)
    assert result == 0.65
```

### Integration Tests

Test interactions between components (API endpoints, database, services).

**Example:**
```python
def test_get_prediction_integration(client, auth_headers, test_game):
    response = client.get(
        f"/api/v1/games/{test_game.id}/predictions",
        headers=auth_headers
    )
    assert response.status_code == 200
```

### End-to-End Tests

Test complete user workflows.

**Example:**
```python
def test_user_prediction_workflow(client):
    # Register
    register_response = client.post("/api/v1/auth/register", ...)
    # Login
    login_response = client.post("/api/v1/auth/login", ...)
    # Get prediction
    prediction_response = client.get("/api/v1/games/.../predictions", ...)
```

## Test Fixtures

Common fixtures are defined in `conftest.py`:

- `db` - Database session
- `client` - FastAPI test client
- `test_user` - Test user with free tier
- `premium_user` - Test user with premium tier
- `test_teams` - Sample teams
- `test_game` - Sample game
- `test_prediction` - Sample prediction
- `auth_headers` - Authentication headers for free user
- `premium_auth_headers` - Authentication headers for premium user

## Writing Tests

### Test Naming Convention

- Test functions should start with `test_`
- Use descriptive names: `test_login_with_invalid_password`
- Group related tests in the same file

### Test Structure (AAA Pattern)

```python
def test_example():
    # Arrange - Set up test data
    user = create_test_user()
    
    # Act - Execute the code being tested
    result = login_user(user.email, "password")
    
    # Assert - Verify the results
    assert result.success == True
    assert result.token is not None
```

### Testing Async Code

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result == expected_value
```

### Testing with Mocks

```python
from unittest.mock import Mock, patch

@patch('app.services.ml_service.MLService.predict')
def test_prediction_with_mock(mock_predict):
    mock_predict.return_value = {"probability": 0.65}
    
    result = get_prediction("game-id")
    
    assert result["probability"] == 0.65
    mock_predict.assert_called_once()
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all API endpoints
- **Critical Paths**: 100% coverage (auth, payments, predictions)

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main/develop branches
- Before deployment

See `.github/workflows/ci.yml` for CI configuration.

## Performance Testing

### Load Testing

```bash
# Install locust
pip install locust

# Run load tests
locust -f tests/load_test.py --host=http://localhost:8000
```

### Stress Testing

Test system behavior under extreme conditions:
- High concurrent requests
- Large payloads
- Database connection exhaustion

## Test Data Management

### Using Fixtures

```python
@pytest.fixture
def sample_game_data():
    return {
        "league": "nfl",
        "home_team_id": "team-1",
        "away_team_id": "team-2",
        "scheduled_time": "2024-02-10T20:00:00Z"
    }
```

### Database Seeding

Use `scripts/seed_data.py` for test data, or create fixtures for isolated tests.

### Cleaning Up

Tests should clean up after themselves:
- Use `@pytest.fixture(scope="function")` for per-test cleanup
- Use transactions that rollback
- Delete test data in `finally` blocks

## Common Test Patterns

### Testing Authentication

```python
def test_protected_endpoint_requires_auth(client):
    response = client.get("/api/v1/protected-endpoint")
    assert response.status_code == 401

def test_protected_endpoint_with_auth(client, auth_headers):
    response = client.get(
        "/api/v1/protected-endpoint",
        headers=auth_headers
    )
    assert response.status_code == 200
```

### Testing Error Cases

```python
def test_get_nonexistent_resource(client, auth_headers):
    response = client.get(
        "/api/v1/games/nonexistent-id",
        headers=auth_headers
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

### Testing Validation

```python
def test_invalid_input_validation(client):
    response = client.post(
        "/api/v1/games",
        json={"invalid": "data"}
    )
    assert response.status_code == 422  # Validation error
```

### Testing Rate Limiting

```python
def test_rate_limiting(client, auth_headers):
    # Make many requests
    for _ in range(101):
        response = client.get(
            "/api/v1/games/upcoming",
            headers=auth_headers
        )
    
    # Should be rate limited
    assert response.status_code == 429
```

## Debugging Failed Tests

### Verbose Output

```bash
pytest -v -s  # Verbose with print statements
```

### Debugging with pdb

```python
def test_example():
    import pdb; pdb.set_trace()
    # Test code here
```

### View Test Output

```bash
pytest --capture=no  # Show print statements
```

## Best Practices

1. **Keep Tests Fast**: Unit tests should run in milliseconds
2. **Test One Thing**: Each test should verify one behavior
3. **Use Descriptive Names**: Test names should explain what they test
4. **Avoid Test Interdependence**: Tests should be able to run in any order
5. **Mock External Services**: Don't make real API calls in tests
6. **Test Edge Cases**: Include boundary conditions and error cases
7. **Maintain Test Data**: Keep test fixtures up to date
8. **Review Coverage**: Regularly check coverage reports

## Mobile App Testing

### Unit Tests (Jest)

```bash
cd mobile
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests (Detox)

```bash
npm run test:e2e
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Testing Best Practices](https://docs.python-guide.org/writing/tests/)
