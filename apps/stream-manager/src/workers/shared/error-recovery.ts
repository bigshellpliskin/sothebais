import { logger } from '../../utils/logger.js';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = CircuitState.CLOSED;

  constructor(
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000 // 1 minute
    }
  ) {}

  public recordSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info('Circuit breaker closed after successful operation');
    }
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker opened due to failures', {
        failures: this.failures,
        threshold: this.config.failureThreshold
      });
    }
  }

  public canTry(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    const now = Date.now();
    if (this.state === CircuitState.OPEN && 
        now - this.lastFailureTime >= this.config.resetTimeout) {
      this.state = CircuitState.HALF_OPEN;
      logger.info('Circuit breaker entering half-open state');
      return true;
    }

    return this.state === CircuitState.HALF_OPEN;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public reset(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
    logger.info('Circuit breaker reset to closed state');
  }
}

export class RetryStrategy {
  constructor(
    private config: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    }
  ) {}

  public async retry<T>(
    operation: () => Promise<T>,
    context: string,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        logger.error('Max retries exceeded', {
          context,
          attempts: attempt,
          error
        });
        throw error;
      }

      const delay = Math.min(
        this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt),
        this.config.maxDelay
      );

      logger.info('Retrying operation', {
        context,
        attempt: attempt + 1,
        delay,
        error: error.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(operation, context, attempt + 1);
    }
  }
}

export class ErrorRecoveryManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryStrategy: RetryStrategy;

  constructor(
    private circuitBreakerConfig?: CircuitBreakerConfig,
    private retryConfig?: RetryConfig
  ) {
    this.retryStrategy = new RetryStrategy(retryConfig);
  }

  public async executeWithRecovery<T>(
    context: string,
    operation: () => Promise<T>
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(context);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(this.circuitBreakerConfig);
      this.circuitBreakers.set(context, circuitBreaker);
    }

    if (!circuitBreaker.canTry()) {
      throw new Error(`Circuit breaker is open for context: ${context}`);
    }

    try {
      const result = await this.retryStrategy.retry(
        operation,
        context
      );
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      throw error;
    }
  }

  public resetCircuitBreaker(context: string): void {
    const breaker = this.circuitBreakers.get(context);
    if (breaker) {
      breaker.reset();
    }
  }

  public getCircuitBreakerState(context: string): CircuitState | undefined {
    return this.circuitBreakers.get(context)?.getState();
  }
} 