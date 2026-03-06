import { useState, useCallback } from 'react';
import { profileService } from '../services/profile/profileService';
import { Inspector } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';
import { ErrorHandler } from '../utils/errorHandler';

export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await profileService.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const updateProfile = useCallback(async (data: Partial<Inspector>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = await profileService.updateProfile(data);
      setUser(updatedProfile);
      return updatedProfile;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  return {
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
};
