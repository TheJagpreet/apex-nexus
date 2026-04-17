---
name: test-all
description: Run all test suites across apex-nexus Python services and report results
---

# Test All Services

Run the full test suite for all Python services and report a pass/fail summary.

## Usage

```
/test-all
```

## Behavior

Run these commands sequentially, capturing output:

```bash
make test-rag
make test-identity
make test-gateway
make test-agents
```

Then report:
- Pass/fail per service
- Total tests run, passed, failed
- Any error output for failing tests

## Individual Service Testing

```bash
make test-rag       # services/apex-rag
make test-identity  # services/apex-identity
make test-gateway   # services/apex-gateway
make test-agents    # services/apex-agents
```

## Notes

- All tests use pytest with asyncio_mode=auto
- apex-identity and apex-agents use in-memory SQLite in tests (no cleanup needed)
- apex-portal has no test suite
