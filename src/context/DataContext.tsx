'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type DataContextType = {
  loading: boolean;
  communities: any[];
  services: any[];
  products: any[];
  laborRate: number;
  lastRefreshed: number | null;
  refreshData: () => Promise<void>;
  patchCommunity: (id: string, updates: any) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY = 'tgs_intelligence_master_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// --- Simple IndexedDB Wrapper for Infinite Growth ---
const openDB = () => new Promise<IDBDatabase>((res, rej) => {
  const req = indexedDB.open('TGS_INTELLIGENCE_LAYER', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('cache');
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

const getIDB = async (key: string) => {
  const db = await openDB();
  return new Promise<any>((res, rej) => {
    const store = db.transaction('cache', 'readonly').objectStore('cache');
    const req = store.get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

const setIDB = async (key: string, val: any) => {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [laborRate, setLaborRate] = useState(32.50);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  const loadData = useCallback(async (force = false) => {
    // Prevent un-mounting pages if we already have data in memory (navigation case)
    if (!force && services.length > 0 && communities.length > 0) {
      return;
    }

    setLoading(true);

    if (!force) {
      try {
        const cached = await getIDB(CACHE_KEY);
        if (cached) {
          const { communities: c, services: s, products: p, laborRate: lr, timestamp } = cached;
          if (Date.now() - timestamp < CACHE_TTL) {
            setCommunities(c);
            setServices(s);
            setProducts(p);
            setLaborRate(lr);
            setLastRefreshed(timestamp);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Cache access error, falling back to cloud");
      }
    }

    try {
      const [settingsRes, prodRes, commRes] = await Promise.all([
        supabase.from('app_settings').select('key, value'),
        supabase.from('products').select('*').order('sku'),
        supabase.from('communities').select('*').order('name')
      ]);

      const settingsMap = Object.fromEntries((settingsRes.data || []).map((s: any) => [s.key, s.value]));
      const rate = parseFloat(settingsMap['labor_rate_per_hour'] || '32.50');
      const prods = prodRes.data || [];
      const comms = commRes.data || [];

      setLaborRate(rate);
      setProducts(prods);
      setCommunities(comms);

      let servData: any[] = [];
      let from = 0;
      const step = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('service_history')
          .select(`
            id, service_date, source_community_name, community_id, service_performed, crew_leader, crew_members, total_labor_hours_num, crew_count,
            service_product_usage ( quantity_used, محصولات:products ( sku, unit_price, coverage_sqft ) )
          `)
          .order('id', { ascending: true })
          .range(from, from + step - 1);
          
        if (error) break;
        if (data && data.length > 0) {
          // Normalize the product structure if needed (Supabase aliasing check)
          const normalized = data.map((d: any) => ({
            ...d,
            service_product_usage: d.service_product_usage.map((u: any) => ({
              ...u,
              products: u.محصولات || u.products
            }))
          }));
          servData = servData.concat(normalized);
          if (data.length < step) break;
          from += step;
        } else break;
      }
      
      servData.sort((a, b) => b.service_date.localeCompare(a.service_date));
      setServices(servData);

      const now = Date.now();
      setLastRefreshed(now);

      await setIDB(CACHE_KEY, {
        communities: comms,
        services: servData,
        products: prods,
        laborRate: rate,
        timestamp: now
      });
    } catch (e) {
      console.error("Global Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const patchCommunity = useCallback(async (id: string, updates: any) => {
    let nextCommunities: any[] = [];
    
    setCommunities(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      nextCommunities = next;
      return next;
    });

    if (updates.name) {
      setServices(prev => prev.map(s => s.community_id === id ? { ...s, source_community_name: updates.name } : s));
    }

    // Persist to IndexedDB
    try {
      const currentCache = await getIDB(CACHE_KEY);
      if (currentCache) {
        await setIDB(CACHE_KEY, {
          ...currentCache,
          communities: nextCommunities
        });
      }
    } catch (e) {
      console.warn("Failed to update cache background", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DataContext.Provider value={{
      loading,
      communities,
      services,
      products,
      laborRate,
      lastRefreshed,
      refreshData: () => loadData(true),
      patchCommunity
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
