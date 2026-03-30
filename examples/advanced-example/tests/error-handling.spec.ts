import { test, expect } from '@playwright/test';

/**
 * Error Handling Test Suite
 * 
 * Demonstrates various error handling scenarios:
 * - Network errors
 * - Timeout handling
 * - Invalid data
 * - Recovery strategies
 * - Graceful degradation
 */

test.describe('Error Handling and Recovery', () => {
  
  test('Retry on network failure', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2230' 
    }
  }, async ({ page }) => {
    let attemptCount = 0;
    
    // Simulate network failure on first attempt, success on retry
    await page.route('**/api/data', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'success' })
        });
      }
    });

    await page.goto('/');
    
    // The application should retry and eventually succeed
    await expect(page.locator('[data-testid="data-loaded"]')).toBeVisible({ timeout: 10000 });
  });

  test('Handle timeout with user feedback', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2231' 
    }
  }, async ({ page }) => {
    // Simulate very slow response
    await page.route('**/api/slow-endpoint', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'delayed' })
        });
      }, 35000); // Longer than timeout
    });

    await page.goto('/slow-page');
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Should eventually show timeout message
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible({ timeout: 40000 });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('Validate and handle invalid input', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2232' 
    }
  }, async ({ page }) => {
    await page.goto('/form');
    
    // Try to submit invalid email
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.click('[data-testid="submit"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText(/valid email/i);
    
    // Fix the error
    await page.fill('[data-testid="email"]', 'valid@example.com');
    await page.click('[data-testid="submit"]');
    
    // Should succeed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Handle API error with fallback', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2233' 
    }
  }, async ({ page }) => {
    // Simulate API error
    await page.route('**/api/primary', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });
    
    // But fallback API works
    await page.route('**/api/fallback', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: 'fallback data' })
      });
    });

    await page.goto('/resilient-page');
    
    // Should use fallback and show data
    await expect(page.locator('[data-testid="data-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="fallback-notice"]')).toBeVisible();
  });

  test('Graceful degradation when feature unavailable', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2234' 
    }
  }, async ({ page }) => {
    // Simulate feature API being down
    await page.route('**/api/premium-feature', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not Found' })
      });
    });

    await page.goto('/dashboard');
    
    // Premium feature should be hidden or disabled
    await expect(page.locator('[data-testid="premium-feature"]')).not.toBeVisible();
    
    // But basic features should still work
    await expect(page.locator('[data-testid="basic-feature"]')).toBeVisible();
    await page.click('[data-testid="basic-feature"]');
    await expect(page.locator('[data-testid="basic-result"]')).toBeVisible();
  });

  test('Handle concurrent request errors', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2235' 
    }
  }, async ({ page }) => {
    let requestCount = 0;
    
    // Simulate rate limiting
    await page.route('**/api/data', route => {
      requestCount++;
      if (requestCount > 3) {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Too Many Requests' })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: `request ${requestCount}` })
        });
      }
    });

    await page.goto('/multi-request-page');
    
    // Should show rate limit message
    await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible({ timeout: 10000 });
  });

  test('Recover from session expiration', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2236' 
    }
  }, async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/dashboard/);
    
    // Simulate session expiration
    await page.route('**/api/protected', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });
    
    // Try to access protected resource
    await page.click('[data-testid="protected-link"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });

  test('Handle malformed API response', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2237' 
    }
  }, async ({ page }) => {
    // Return invalid JSON
    await page.route('**/api/data', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'This is not valid JSON {'
      });
    });

    await page.goto('/data-page');
    
    // Should show error message
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="parse-error"]')).toContainText(/error loading data/i);
  });

  test('Handle missing required data', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2238' 
    }
  }, async ({ page }) => {
    // Return incomplete data
    await page.route('**/api/user', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          // Missing required fields like 'name' and 'email'
          id: '123'
        })
      });
    });

    await page.goto('/profile');
    
    // Should show placeholder or error
    await expect(page.locator('[data-testid="incomplete-data-warning"]')).toBeVisible();
  });

  test('Retry with exponential backoff', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2239' 
    }
  }, async ({ page }) => {
    let attemptCount = 0;
    const attemptTimes: number[] = [];
    
    await page.route('**/api/unstable', route => {
      attemptCount++;
      attemptTimes.push(Date.now());
      
      if (attemptCount < 3) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'success' })
        });
      }
    });

    await page.goto('/retry-page');
    
    // Should eventually succeed
    await expect(page.locator('[data-testid="data-loaded"]')).toBeVisible({ timeout: 15000 });
    
    // Verify exponential backoff (delays should increase)
    if (attemptTimes.length >= 3) {
      const delay1 = attemptTimes[1] - attemptTimes[0];
      const delay2 = attemptTimes[2] - attemptTimes[1];
      expect(delay2).toBeGreaterThan(delay1);
    }
  });
});

test.describe('User Experience During Errors', () => {
  
  test('Show loading state during slow operations', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2240' 
    }
  }, async ({ page }) => {
    await page.route('**/api/slow', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'loaded' })
        });
      }, 3000);
    });

    await page.goto('/slow-load');
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Should hide loading when done
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="content"]')).toBeVisible();
  });

  test('Provide helpful error messages', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2241' 
    }
  }, async ({ page }) => {
    await page.route('**/api/data', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ 
          error: 'Resource not found',
          message: 'The requested item does not exist',
          suggestion: 'Please check the URL and try again'
        })
      });
    });

    await page.goto('/item/999');
    
    // Should show user-friendly error
    await expect(page.locator('[data-testid="error-title"]')).toContainText('Not Found');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('does not exist');
    await expect(page.locator('[data-testid="error-suggestion"]')).toContainText('check the URL');
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
  });
});

// Made with Bob
