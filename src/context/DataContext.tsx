'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type DataContextType = {
  loading: boolean;
  communities: any[];
  services: any[];
  products: any[];
  laborRate: number;
  efficiencyTarget: number;
  masterCategories: string[];
  masterUnits: string[];
  lastRefreshed: number | null;
  refreshData: () => Promise<void>;
  patchCommunity: (id: string, updates: any) => void;
  patchSettings: (key: string, value: string) => Promise<void>;
  patchProduct: (id: string, updates: any) => Promise<void>;
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
  const [efficiencyTarget, setEfficiencyTarget] = useState(60.0);
  const [masterCategories, setMasterCategories] = useState<string[]>(['Standard', 'Fertilizer', 'Herbicide', 'Insecticide', 'Equipment']);
  const [masterUnits, setMasterUnits] = useState<string[]>(['BAG', 'GAL', 'PAL', 'OZ', 'EA', 'LBS']);
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
          const { communities: c, services: s, products: p, laborRate: lr, efficiencyTarget: et, timestamp } = cached;
          if (Date.now() - timestamp < CACHE_TTL) {
            setCommunities(c);
            setServices(s);
            setProducts(p);
            setLaborRate(lr);
            setEfficiencyTarget(et || 60.0);
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
      const target = parseFloat(settingsMap['efficiency_target'] || '60.0');
      const cats = settingsMap['master_categories'] ? JSON.parse(settingsMap['master_categories']) : ['Standard', 'Fertilizer', 'Herbicide', 'Insecticide', 'Equipment'];
      const units = settingsMap['master_units'] ? JSON.parse(settingsMap['master_units']) : ['BAG', 'GAL', 'PAL', 'OZ', 'EA', 'LBS'];
      
      const prods = prodRes.data || [];
      const comms = commRes.data || [];

      setLaborRate(rate);
      setEfficiencyTarget(target);
      setMasterCategories(cats);
      setMasterUnits(units);
      setProducts(prods);
      setCommunities(comms);

      let servData: any[] = [];
      let from = 0;
      const step = 1000;
      
      while (true) {
        // We use a broader select to prevent 400 errors if forensic columns are missing
        const { data, error } = await supabase
          .from('service_history')
          .select(`
            *,
            service_product_usage ( *, products ( * ) )
          `)
          .order('id', { ascending: true })
          .range(from, from + step - 1);
          
        if (error) {
          console.error("Fetch Chunk Error:", error);
          break;
        }
        if (data && data.length > 0) {
          const normalized = data.map((d: any) => ({
            ...d,
            service_product_usage: (d.service_product_usage || []).map((u: any) => ({
              ...u,
              products: u.products
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
        efficiencyTarget: target,
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

  const patchSettings = useCallback(async (key: string, value: string) => {
    if (key === 'efficiency_target') setEfficiencyTarget(parseFloat(value));
    if (key === 'labor_rate_per_hour') setLaborRate(parseFloat(value));
    if (key === 'master_categories') setMasterCategories(JSON.parse(value));
    if (key === 'master_units') setMasterUnits(JSON.parse(value));

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) console.error("Setting Sync Error:", error);
  }, []);

  const patchProduct = useCallback(async (id: string, updates: any) => {
    let nextProducts: any[] = [];
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      nextProducts = next;
      return next;
    });

    // Update the services list in memory too so inventory page sees it immediately
    setServices(prev => prev.map(s => ({
      ...s,
      service_product_usage: s.service_product_usage.map((u: any) => 
        u.products?.id === id ? { ...u, products: { ...u.products, ...updates } } : u
      )
    })));

    // Sync with IndexedDB background
    try {
      const currentCache = await getIDB(CACHE_KEY);
      if (currentCache) {
        await setIDB(CACHE_KEY, {
          ...currentCache,
          products: nextProducts,
          services: currentCache.services.map((s: any) => ({
            ...s,
            service_product_usage: s.service_product_usage.map((u: any) => 
              u.products?.id === id ? { ...u, products: { ...u.products, ...updates } } : u
            )
          }))
        });
      }
    } catch (e) {
      console.warn("Failed background cache sync", e);
    }
  }, []);

  const lastRefreshedRef = useRef(lastRefreshed);
  useEffect(() => { lastRefreshedRef.current = lastRefreshed; }, [lastRefreshed]);

  useEffect(() => {
    loadData();
    
    // Background sync heartbeat: check every minute if we need a refresh
    const interval = setInterval(() => {
      const lr = lastRefreshedRef.current;
      if (lr && (Date.now() - lr > CACHE_TTL)) {
        console.log("Stale cache detected, triggering background sync...");
        loadData(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <DataContext.Provider value={{
      loading,
      communities,
      services,
      products,
      laborRate,
      efficiencyTarget,
      masterCategories,
      masterUnits,
      lastRefreshed,
      refreshData: () => loadData(true),
      patchCommunity,
      patchSettings,
      patchProduct
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
