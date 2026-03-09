import { useState, useCallback } from 'react';
import { jobsService } from '../services/jobs/jobsService';
import { RequestModel, PaginatedRequestResult } from '../services/api/types/requestTypes';
import { ErrorHandler } from '../utils/errorHandler';

const sanitizeJobs = (items: RequestModel[]) =>
  items.filter((job) => job.status?.toLowerCase() !== 'published');

const sortJobs = (items: RequestModel[]) =>
  [...items].sort((a, b) => {
    const aDate = (a.dueDate ?? a.createdAt)?.getTime?.() ?? 0;
    const bDate = (b.dueDate ?? b.createdAt)?.getTime?.() ?? 0;
    return bDate - aDate;
  });

export const useJobs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [jobs, setJobs] = useState<RequestModel[]>([]);
  const [jobDetail, setJobDetail] = useState<RequestModel | null>(null);

  const fetchJobs = useCallback(async (params?: any): Promise<PaginatedRequestResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await jobsService.getJobs(params);
      const sanitized = sortJobs(sanitizeJobs(result.items));
      setJobs(sanitized);
      return { ...result, items: sanitized };
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      ErrorHandler.logError('Failed to fetch jobs', err);
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
        return data;
      } catch (err) {
        setError({ message: (err as any)?.message || 'Failed to fetch job detail', code: (err as any)?.code || 'FETCH_ERROR' });
        throw err;
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
      await jobsService.acceptJob(id);
      return true;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      ErrorHandler.logError(`Failed to accept job for ID: ${id}`, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchJobs,
    fetchJobDetail,
    acceptJob,
    rejectJob,
  };
};
