import { test, expect } from '@playwright/test';

test.describe('LocalStorage Mismatch Bug', () => {
  test('should handle localStorage with wrong automaton type gracefully', async ({ page }) => {
    // Set up localStorage with NFA type but DFA content (reproduces the bug)
    await page.goto('/');
    
    const localStorage = `{
      "automatonType": "nfa",
      "theme": "monokai", 
      "splitPercentage": 0.5,
      "runImmediately": true,
      "inputString": "010000100",
      "editorContent": "# DFA recognizing { x in {0,1}* | x does not end in 000 }\\n\\nstates: \\n  - q      # last bit was a 1 or non-existent\\n  - q0     # last two bits were 10\\n  - q00    # last three bits were 100\\n  - q000   # last three bits were 000\\n\\ninput_alphabet: [0, 1]\\n\\n# no last bit when we start\\nstart_state: q\\n\\n# accept if last three bits were not 000\\naccept_states: [q, q0, q00]\\n\\ndelta:\\n  # if we see a 1, reset\\n  q:\\n    1: q\\n    0: q0    # if we see a 0, count one more 0 than before\\n  q0:\\n    1: q\\n    0: q00\\n  q00:\\n    1: q\\n    0: q000\\n  q000:\\n    1: q\\n    0: q000  # until we get to three",
      "currentFilename": null,
      "version": "1.0.0",
      "timestamp": 1755295278220
    }`;
    
    await page.evaluate((data) => {
      window.localStorage.setItem('automata-app-state', data);
    }, localStorage);
    
    // Reload the page to trigger localStorage loading
    await page.reload();
    
    // Wait for the app to stabilize
    await page.waitForTimeout(1000);
    
    // Check that the app doesn't crash and shows an error instead
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Check that page loads without JavaScript errors
    const app = page.locator('.app');
    await expect(app).toBeVisible();
    
    // Should show parsing error instead of crashing
    const errorMessage = page.locator('.error-message, .cm-diagnostic-error, [role="alert"]').first();
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/error|invalid|unexpected/i);
    }
    
    // Check that no uncaught exceptions occurred
    await page.waitForTimeout(500);
    const jsErrors = consoleErrors.filter(msg => 
      msg.includes('TypeError') || 
      msg.includes('Cannot read properties of undefined') ||
      msg.includes('Uncaught')
    );
    
    expect(jsErrors).toHaveLength(0);
  });
  
  test('should handle empty localStorage gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Clear localStorage
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    
    await page.reload();
    await page.waitForTimeout(500);
    
    // App should load with defaults
    const app = page.locator('.app');
    await expect(app).toBeVisible();
    
    // Should have default DFA content
    const editor = page.locator('.cm-content');
    const content = await editor.textContent();
    expect(content).toContain('states');
  });
  
  test('should handle corrupted localStorage gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Set corrupted localStorage data
    await page.evaluate(() => {
      window.localStorage.setItem('automata-app-state', 'invalid-json{');
    });
    
    await page.reload();
    await page.waitForTimeout(500);
    
    // App should still load with defaults
    const app = page.locator('.app');
    await expect(app).toBeVisible();
  });
});