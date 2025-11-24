import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000, // 1 second for testing
      monitoringPeriod: 5000,
      name: 'TestCircuit',
    });
  });

  describe('execute', () => {
    it('should execute function successfully when circuit is closed', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await circuitBreaker.execute(mockFn);

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after threshold failures', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      // Fail 3 times to reach threshold
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should use fallback when circuit is open', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const fallbackFn = jest.fn().mockResolvedValue('fallback data');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset mock call count
      mockFn.mockClear();

      // Act - attempt execution with fallback
      const result = await circuitBreaker.execute(mockFn, fallbackFn);

      // Assert
      expect(result).toBe('fallback data');
      expect(fallbackFn).toHaveBeenCalled();
      expect(mockFn).not.toHaveBeenCalled(); // Should not execute main function
    });

    it('should throw error when circuit is open and no fallback provided', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Act & Assert
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker TestCircuit is OPEN');
    });

    it('should transition to half-open after reset timeout', async () => {
      // Arrange
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Act
      const result = await circuitBreaker.execute(mockFn);

      // Assert
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit if half-open execution fails', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Act - fail in half-open state
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      // Assert
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count after monitoring period', async () => {
      // Arrange
      const circuitWithShortPeriod = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 100, // 100ms monitoring period
        name: 'ShortPeriodCircuit',
      });
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'));

      // Fail twice
      await expect(circuitWithShortPeriod.execute(mockFn)).rejects.toThrow();
      await expect(circuitWithShortPeriod.execute(mockFn)).rejects.toThrow();
      expect(circuitWithShortPeriod.getFailureCount()).toBe(2);

      // Wait for monitoring period to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Fail once more (should reset count)
      mockFn.mockRejectedValueOnce(new Error('fail'));
      await expect(circuitWithShortPeriod.execute(mockFn)).rejects.toThrow();

      // Assert - should still be closed (count reset to 1)
      expect(circuitWithShortPeriod.getState()).toBe(CircuitState.CLOSED);
      expect(circuitWithShortPeriod.getFailureCount()).toBe(1);
    });
  });

  describe('reset', () => {
    it('should manually reset circuit breaker to closed state', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Act
      circuitBreaker.reset();

      // Assert
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.isOpen()).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return circuit breaker metrics', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      // Act
      const metrics = circuitBreaker.getMetrics();

      // Assert
      expect(metrics).toMatchObject({
        state: CircuitState.CLOSED,
        failureCount: 1,
      });
      expect(metrics.lastFailureTime).toBeDefined();
    });
  });

  describe('getState', () => {
    it('should return current circuit state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('isOpen', () => {
    it('should return true when circuit is open', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Assert
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should return false when circuit is closed', () => {
      expect(circuitBreaker.isOpen()).toBe(false);
    });
  });
});
