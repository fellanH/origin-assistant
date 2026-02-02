---
source: https://ai-sdk.dev/elements/components/test-results
scraped: 2026-02-02T09:36:40.119Z
category: code
---

# Test Results

Display test suite results with pass/fail/skip status and error details.

The `TestResults` component displays test suite results including summary statistics, progress, individual tests, and error details.

3.25s12/15 tests passed80%should login with valid credentials45msshould reject invalid password32msshould handle expired tokens28msshould create new user120ms
Expected status 200 but received 500
```
at Object. (src/user.test.ts:45:12)
  at Promise.then.completed (node_modules/jest-circus/build/utils.js:391:28)
```
should delete user

## Installation
```
npx ai-elements@latest add test-results
```

## Features

- Summary statistics (passed/failed/skipped)

- Progress bar visualization

- Collapsible test suites

- Individual test status and duration

- Error messages with stack traces

- Color-coded status indicators

## Status Colors

| Status | Color | Use Case |  |
| `passed` | Green | Test succeeded |  |
| `failed` | Red | Test failed |  |
| `skipped` | Yellow | Test skipped |  |
| `running` | Blue (animated) | Test in progress |  |

## Examples

### Basic Usage

3.50s

### With Test Suites

### With Error Details

should fetch data45ms
Expected 200, got 500
```
at Object. (/app/src/api.test.ts:45:12)
    at Module._compile (node:internal/modules/cjs/loader:1369:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1427:10)
```

## Props

###

###

###

###

###

###

###

###

###

###

###

###

###

###

###

###

###