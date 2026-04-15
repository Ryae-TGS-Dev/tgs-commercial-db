import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: {
    name: string;
    description: string;
    can_view_dashboard: boolean;
    can_view_financials: boolean;
    can_export_csv: boolean;
    can_log_service: boolean;
    can_edit_pricing: boolean;
    can_manage_system: boolean;
  };
};

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          full_name,
          role:app_roles(*)
        `)
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data as any);
      }
      setLoading(false);
    }

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { profile, loading };
}
