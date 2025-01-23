"use client";

import { Activity, Box, Server, BarChart3, RefreshCw } from "lucide-react";
import { Widget } from "@/components/ui/widget";
import { StatusCard } from "@/components/ui/status-card";
import { useServiceStore } from "@/store/services";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useState, useEffect } from "react";

export function SystemOverview() {
  const { serviceGroups, isLoading } = useServiceStore();
  const [refreshTimer, setRefreshTimer] = useState(10);
  useServiceStatus();

  useEffect(() => {
    if (isLoading) setRefreshTimer(10);
  }, [isLoading]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : 10));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allServices = serviceGroups.flatMap(group => group.services);
  const runningServices = allServices.filter(service => service.status === 'running');
  const errorServices = allServices.filter(service => service.status === 'error');
  const systemLoad = Math.min(100, Math.round((runningServices.length / allServices.length) * 100));

  return (
    <Widget 
      title="System Overview" 
      icon={BarChart3}
      className="w-full mb-6"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            title="Active Services"
            value={`${runningServices.length}/${allServices.length}`}
            icon={Server}
            loading={isLoading}
          />
          <StatusCard
            title="Services in Error"
            value={errorServices.length.toString()}
            icon={Box}
            loading={isLoading}
          />
          <StatusCard
            title="System Load"
            value={`${systemLoad}%`}
            icon={Activity}
            loading={isLoading}
          />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-gray-500 border-b pb-2">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh in {refreshTimer}s</span>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          {serviceGroups.map((group) => (
            <div key={group.name} className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold whitespace-nowrap">{group.name}</h3>
                <div className="h-px bg-gray-200 flex-grow" />
              </div>
              <div className="space-y-1">
                {group.services.map((service) => (
                  <div
                    key={service.name}
                    className="bg-white/50 rounded px-2 py-1.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          service.status === 'running' ? 'bg-green-500' :
                          service.status === 'error' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{service.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{service.description}</p>
                      </div>
                    </div>
                    <div className={`ml-2 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${
                      service.status === 'running' ? 'bg-green-100 text-green-800' :
                      service.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {service.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
} 