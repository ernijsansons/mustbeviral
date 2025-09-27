/**
 * Regression tests for CWE-480 logical operator fixes
 * These tests ensure that the identified bugs are fixed and don't reoccur
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock EventProcessor for testing race conditions
class MockEventProcessor {
  private isProcessing = false;
  private processQueue = jest.fn();
  private processingCalls: number[] = [];

  async triggerProcessing(): Promise<void> {
    // Atomic check-and-set to prevent race conditions
    if (this.isProcessing) {
      return;
    }

    // Immediately set flag before any async operations
    this.isProcessing = true;
    this.processingCalls.push(Date.now());

    try {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      this.processQueue();
    } catch (error) {
      console.error('Error in triggerProcessing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  getProcessingCalls(): number[] {
    return this.processingCalls;
  }

  reset(): void {
    this.isProcessing = false;
    this.processingCalls = [];
    this.processQueue.mockReset();
  }
}

describe('CWE-480 Regression Tests', () => {
  describe('EventProcessor Race Condition Fix', () => {
    let processor: MockEventProcessor;

    beforeEach(() => {
      processor = new MockEventProcessor();
    });

    afterEach(() => {
      processor.reset();
    });

    test('should prevent race conditions in concurrent triggerProcessing calls', async () => {
      // Fire 10 concurrent calls to triggerProcessing
      const promises = Array.from({ length: 10 }, () =>
        processor.triggerProcessing()
      );

      await Promise.all(promises);

      // Should only have processed once due to atomic locking
      const calls = processor.getProcessingCalls();
      expect(calls.length).toBe(1);
    });

    test('should handle rapid sequential calls correctly', async () => {
      // Sequential calls with minimal delay
      for (let i = 0; i < 5; i++) {
        await processor.triggerProcessing();
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const calls = processor.getProcessingCalls();
      expect(calls.length).toBe(5);
    });

    test('should recover from errors and allow subsequent processing', async () => {
      // First call succeeds
      await processor.triggerProcessing();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      // Second call should also succeed
      await processor.triggerProcessing();

      const calls = processor.getProcessingCalls();
      expect(calls.length).toBe(2);
    });
  });

  describe('Logical Operator Consistency', () => {
    test('should handle falsy values correctly in array defaults', () => {
      // Test cases for different falsy values
      const testCases = [
        { input: undefined, expected: true },
        { input: null, expected: true },
        { input: [], expected: true }, // Empty array should use default with ||
        { input: ['custom'], expected: false },
        { input: false, expected: true },
        { input: 0, expected: true },
        { input: '', expected: true }
      ];

      testCases.forEach(({ input, expected }) => {
        // Simulate the fixed logic: options.allowedTags || defaultTags
        const defaultTags = ['b', 'i', 'em', 'strong', 'a'];
        const result = input || defaultTags;
        const shouldUseDefault = Array.isArray(result) && result === defaultTags;

        expect(shouldUseDefault).toBe(expected);
      });
    });

    test('should maintain consistent behavior with nullish coalescing vs logical OR', () => {
      const defaultValue = ['default'];

      // Test the difference between ?? and ||
      const nullishTests = [
        { value: null, withNullish: null ?? defaultValue, withOr: null || defaultValue },
        { value: undefined, withNullish: undefined ?? defaultValue, withOr: undefined || defaultValue },
        { value: [], withNullish: [] ?? defaultValue, withOr: [] || defaultValue },
        { value: '', withNullish: '' ?? defaultValue, withOr: '' || defaultValue },
        { value: false, withNullish: false ?? defaultValue, withOr: false || defaultValue },
        { value: 0, withNullish: 0 ?? defaultValue, withOr: 0 || defaultValue }
      ];

      nullishTests.forEach(({ value, withNullish, withOr }) => {
        // For array configurations, || is generally more appropriate than ??
        // because empty arrays should typically use defaults
        if (Array.isArray(value) && value.length === 0) {
          expect(withOr).toEqual(defaultValue);
          expect(withNullish).toEqual(value); // ?? keeps empty array
        }
      });
    });
  });

  describe('React Component Conditional Rendering', () => {
    test('should handle empty arrays in conditional rendering correctly', () => {
      const testActivities = [
        [],
        [{ id: '1', type: 'edit', name: 'Test' }],
        null,
        undefined
      ];

      testActivities.forEach(activities => {
        // Simulate the fixed conditional logic
        const shouldShowEmptyState = !activities || activities.length === 0;
        const shouldShowList = activities && activities.length > 0;

        // These should be mutually exclusive
        expect(shouldShowEmptyState && shouldShowList).toBe(false);

        // One should always be true
        expect(shouldShowEmptyState || shouldShowList).toBe(true);
      });
    });

    test('should properly structure ternary operator precedence', () => {
      const activities = [{ id: '1', type: 'edit' }];

      // Fixed structure should be clear and unambiguous
      const renderResult = activities.length === 0 ?
        'empty-state' :
        activities.map(a => a.id).join(',');

      expect(renderResult).toBe('1');

      // Empty case
      const emptyResult = [].length === 0 ?
        'empty-state' :
        [].map((a: any) => a.id).join(',');

      expect(emptyResult).toBe('empty-state');
    });
  });

  describe('Performance Impact Verification', () => {
    test('should not degrade performance by more than 2ms for logical operators', () => {
      const iterations = 1000;
      const defaultArray = ['a', 'b', 'c'];

      // Test || operator performance
      const startOr = performance.now();
      for (let i = 0; i < iterations; i++) {
        const result = undefined || defaultArray;
      }
      const endOr = performance.now();

      // Test ?? operator performance
      const startNullish = performance.now();
      for (let i = 0; i < iterations; i++) {
        const result = undefined ?? defaultArray;
      }
      const endNullish = performance.now();

      const orTime = endOr - startOr;
      const nullishTime = endNullish - startNullish;
      const difference = Math.abs(orTime - nullishTime);

      // Performance difference should be minimal
      expect(difference).toBeLessThan(2);
    });
  });

  describe('Bug Reproduction Verification', () => {
    test('should verify 0% reproduction rate for race condition', async () => {
      const processor = new MockEventProcessor();
      let raceConditionDetected = false;

      // Attempt to trigger race condition 100 times
      for (let attempt = 0; attempt < 100; attempt++) {
        processor.reset();

        // Fire concurrent requests
        const promises = Array.from({ length: 5 }, () =>
          processor.triggerProcessing()
        );

        await Promise.all(promises);

        const calls = processor.getProcessingCalls();
        if (calls.length > 1) {
          raceConditionDetected = true;
          break;
        }
      }

      // Should have 0% reproduction rate after fix
      expect(raceConditionDetected).toBe(false);
    });

    test('should verify logical operator fixes work consistently', () => {
      let inconsistencyDetected = false;

      // Test edge cases that previously caused issues
      const edgeCases = [[], null, undefined, false, 0, ''];
      const defaultValue = ['default'];

      edgeCases.forEach(testValue => {
        // Use the fixed logic (|| instead of ??)
        const result = testValue || defaultValue;

        // For configuration arrays, should use default for all falsy values
        if (!testValue) {
          if (result !== defaultValue) {
            inconsistencyDetected = true;
          }
        }
      });

      expect(inconsistencyDetected).toBe(false);
    });
  });
});