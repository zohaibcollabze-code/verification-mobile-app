import { useState, useCallback } from 'react';
import { jobsService } from '../services/jobs/jobsService';
import { RequestModel, PaginatedRequestResult } from '../services/api/types/requestTypes';
import { ErrorHandler } from '../utils/errorHandler';
import * as AssignmentCacheDB from '@/services/db/assignments';
import { useNetworkStore } from '@/stores/networkStore';

const sanitizeJobs = (items: RequestModel[]) =>
  items.filter((job) => job.status?.toLowerCase() !== 'published');

const sortJobs = (items: RequestModel[]) =>
  [...items].sort((a, b) => {
    const aDate = (a.dueDate ?? a.createdAt)?.getTime?.() ?? 0;
    const bDate = (b.dueDate ?? b.createdAt)?.getTime?.() ?? 0;
    return bDate - aDate;
  });

let cachedJobList: RequestModel[] = [];
const cachedJobDetails = new Map<string, RequestModel>();

export interface JobSummary {
  total: number;
  published: number;
  returned: number;
  assigned: number;
}

const defaultSummary: JobSummary = {
  total: 0,
  published: 0,
  returned: 0,
  assigned: 0,
};

const buildSummary = (items: RequestModel[]): JobSummary => {
  if (!items?.length) return defaultSummary;
  return items.reduce<JobSummary>((acc, item) => {
    const status = item.status?.toLowerCase?.() ?? '';
    acc.total += 1;
    if (status === 'published') acc.published += 1;
    if (status === 'returned') acc.returned += 1;
    if (status === 'assigned') acc.assigned += 1;
    return acc;
  }, { ...defaultSummary });
};

export const useJobs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [jobs, setJobs] = useState<RequestModel[]>([]);
  const [jobDetail, setJobDetail] = useState<RequestModel | null>(null);
  const [jobSummary, setJobSummary] = useState<JobSummary>(defaultSummary);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const fetchJobs = useCallback(async (params?: any): Promise<PaginatedRequestResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await jobsService.getJobs(params);
      setJobSummary(buildSummary(result.items));
      const sanitized = sortJobs(sanitizeJobs(result.items));
      cachedJobList = sanitized;
      setJobs(sanitized);
      sanitized.forEach((job) => cachedJobDetails.set(job.id, job));
      sanitized.forEach((job) => AssignmentCacheDB.saveAssignment(job));
      return { ...result, items: sanitized };
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      ErrorHandler.logError('Failed to fetch jobs', err);
      const cachedAssignments = AssignmentCacheDB.getAllAssignments().map((record) => record.assignment);
      if (cachedAssignments.length) {
        const offlineList = sortJobs(sanitizeJobs(cachedAssignments));
        cachedJobList = offlineList;
        offlineList.forEach((job) => cachedJobDetails.set(job.id, job));
        setJobs(offlineList);
        const summary = buildSummary(offlineList);
        setJobSummary(summary);
        return {
          items: offlineList,
          totalCount: offlineList.length,
          page: 1,
          perPage: offlineList.length,
          hasNext: false,
        };
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobDetail = useCallback(async (id: string): Promise<RequestModel | null> => {
    const fetchJobDetail = async (id: string) => {
      try {
        setLoading(true);
        const data = await jobsService.getJobDetail(id);
        setJobDetail(data);
        cachedJobDetails.set(id, data);
        AssignmentCacheDB.saveAssignment(data);
        return data;
      } catch (err) {
        const cached = cachedJobDetails.get(id);
        if (cached) {
          setJobDetail(cached);
          return cached;
        }
        const cachedRecord = AssignmentCacheDB.getAssignment(id);
        if (cachedRecord?.assignment) {
          cachedJobDetails.set(id, cachedRecord.assignment);
          setJobDetail(cachedRecord.assignment);
          return cachedRecord.assignment;
        }
        const mapped = ErrorHandler.handle(err);
        setError(mapped);
        ErrorHandler.logError(`Failed to fetch job detail for ID: ${id}`, err);
        return null;
      } finally {
        setLoading(false);
      }
    };
    return fetchJobDetail(id);
  }, []);

  const acceptJob = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        await jobsService.acceptJob(id);
        AssignmentCacheDB.setPendingAcceptance(id, false);
        return true;
      }
      AssignmentCacheDB.setPendingAcceptance(id, true);
      AssignmentCacheDB.queueAssignmentAction(id, 'accept');
      return true;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      ErrorHandler.logError(`Failed to accept job for ID: ${id}`, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const rejectJob = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await jobsService.rejectJob(id, reason);
      return true;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      ErrorHandler.logError(`Failed to reject job for ID: ${id}`, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    jobs,
    jobDetail,
    jobSummary,
    fetchJobs,
    fetchJobDetail,
    acceptJob,
    rejectJob,
  };
};
