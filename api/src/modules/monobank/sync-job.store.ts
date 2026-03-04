import { Injectable } from '@nestjs/common';

export interface SyncJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentAccount: number;
  totalAccounts: number;
  transactionsCount: number;
  message: string;
  error?: string;
}

@Injectable()
export class SyncJobStore {
  private readonly jobs = new Map<string, SyncJob>();

  create(jobId: string): SyncJob {
    const job: SyncJob = {
      jobId,
      status: 'pending',
      currentAccount: 0,
      totalAccounts: 0,
      transactionsCount: 0,
      message: 'Starting sync...',
    };

    this.jobs.set(jobId, job);

    return job;
  }

  update(jobId: string, updates: Partial<Omit<SyncJob, 'jobId'>>): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      return;
    }

    Object.assign(job, updates);
  }

  get(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId);
  }
}
