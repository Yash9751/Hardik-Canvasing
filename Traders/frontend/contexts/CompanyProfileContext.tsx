import React, { createContext, useContext, useState, useEffect } from 'react';
import { companyProfileAPI } from '../services/api';

interface CompanyProfile {
  id: number;
  company_name: string;
  gst_number: string;
  mobile_number: string;
  email: string;
  address: string;
  business_type: string;
  created_at: string;
  updated_at: string;
}

interface CompanyProfileContextType {
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  updateCompanyProfile: (data: Partial<CompanyProfile>) => Promise<boolean>;
  refreshCompanyProfile: () => Promise<void>;
}

const CompanyProfileContext = createContext<CompanyProfileContextType | undefined>(undefined);

export const useCompanyProfile = () => {
  const context = useContext(CompanyProfileContext);
  if (context === undefined) {
    throw new Error('useCompanyProfile must be used within a CompanyProfileProvider');
  }
  return context;
};

export const CompanyProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true);
      const response = await companyProfileAPI.getCompanyProfile();
      setCompanyProfile(response.data);
    } catch (error) {
      console.error('Error loading company profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyProfile = async (data: Partial<CompanyProfile>): Promise<boolean> => {
    try {
      const response = await companyProfileAPI.updateCompanyProfile(data);
      setCompanyProfile(response.data);
      return true;
    } catch (error) {
      console.error('Error updating company profile:', error);
      return false;
    }
  };

  const refreshCompanyProfile = async () => {
    await loadCompanyProfile();
  };

  const value = {
    companyProfile,
    isLoading,
    updateCompanyProfile,
    refreshCompanyProfile,
  };

  return (
    <CompanyProfileContext.Provider value={value}>
      {children}
    </CompanyProfileContext.Provider>
  );
}; 