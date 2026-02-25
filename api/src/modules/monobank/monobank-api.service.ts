import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MonobankClientInfoResponse,
} from './interfaces/monobank-client-info.interface';
import { MonobankStatementResponse } from './interfaces/monobank-statement.interface';

@Injectable()
export class MonobankApiService {
  private readonly logger = new Logger(MonobankApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://api.monobank.ua';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get client information and accounts
   * Rate limit: 1 request per 60 seconds
   */
  async getClientInfo(token: string): Promise<MonobankClientInfoResponse> {
    try {
      this.logger.log('Fetching client info from Monobank API');
      const response = await this.axiosInstance.get<MonobankClientInfoResponse>(
        '/personal/client-info',
        {
          headers: {
            'X-Token': token,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.handleMonobankError(error, 'Failed to fetch client info');
    }
  }

  /**
   * Get account statement (transactions)
   * Rate limit: 1 request per 60 seconds
   * Maximum period: 31 days + 1 hour
   * 
   * @param token - Monobank personal token
   * @param account - Account ID (from client info)
   * @param from - Unix timestamp in seconds
   * @param to - Unix timestamp in seconds (optional, defaults to current time)
   */
  async getStatement(
    token: string,
    account: string,
    from: number,
    to?: number,
  ): Promise<MonobankStatementResponse[]> {
    try {
      const toParam = to || Math.floor(Date.now() / 1000);
      this.logger.log(
        `Fetching statement for account ${account} from ${new Date(from * 1000).toISOString()} to ${new Date(toParam * 1000).toISOString()}`,
      );

      const response = await this.axiosInstance.get<MonobankStatementResponse[]>(
        `/personal/statement/${account}/${from}/${toParam}`,
        {
          headers: {
            'X-Token': token,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.handleMonobankError(error, 'Failed to fetch statement');
    }
  }

  /**
   * Register a webhook URL with Monobank
   * Rate limit: 1 request per 60 seconds
   */
  async setWebhook(token: string, webhookUrl: string): Promise<void> {
    try {
      this.logger.log(`Setting Monobank webhook to ${webhookUrl}`);
      await this.axiosInstance.post(
        '/personal/webhook',
        { webHookUrl: webhookUrl },
        {
          headers: {
            'X-Token': token,
          },
        },
      );

      this.logger.log('Webhook set successfully');
    } catch (error) {
      this.handleMonobankError(error, 'Failed to set webhook');
    }
  }

  /**
   * Wait for specified milliseconds to respect rate limiting
   */
  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle Monobank API errors
   */
  private handleMonobankError(error: any, message: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      this.logger.error(`Monobank API Error: ${message}`, {
        status,
        data: errorData,
        message: error.message,
      });

      switch (status) {
        case 400:
          throw new HttpException(
            'Invalid request to Monobank API',
            HttpStatus.BAD_REQUEST,
          );
        case 401:
          throw new HttpException(
            'Invalid Monobank token',
            HttpStatus.UNAUTHORIZED,
          );
        case 403:
          throw new HttpException(
            'Access forbidden by Monobank',
            HttpStatus.FORBIDDEN,
          );
        case 429:
          throw new HttpException(
            'Too many requests to Monobank API. Please wait 60 seconds.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        case 500:
        case 502:
        case 503:
          throw new HttpException(
            'Monobank API is temporarily unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        default:
          throw new HttpException(
            `Monobank API error: ${message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
      }
    }

    this.logger.error(`Unexpected error: ${message}`, error);
    throw new HttpException(
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
