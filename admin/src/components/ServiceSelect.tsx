import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import ServiceModal from '../modals/ServiceModal';

interface Service {
  service_id: number;
  name: string;
  category?: string;
  cost?: number;
  period?: number;
  [key: string]: any;
}

interface ServiceSelectProps {
  value?: number | null;
  onChange?: (serviceId: number | null, service: Service | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  onServiceUpdated?: () => void;
  readonly?: boolean;
  className?: string;
}

export default function ServiceSelect({
  value,
  onChange,
  onLoadingChange,
  onServiceUpdated,
  readonly = false,
  className = '',
}: ServiceSelectProps) {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingService, setLoadingService] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    if (readonly && value && !selectedService) {
      setLoadingService(true);
      onLoadingChange?.(true);

      shm_request(`shm/v1/admin/service?service_id=${value}&limit=1`)
        .then(res => {
          const data = res.data || res;
          const services = Array.isArray(data) ? data : [];
          if (services.length > 0) {
            setSelectedService(services[0]);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingService(false);
          onLoadingChange?.(false);
        });
    }
  }, [value, readonly]);

  useEffect(() => {
    if (!readonly) {
      setLoading(true);
      onLoadingChange?.(true);

      shm_request('shm/v1/admin/service?limit=0')
        .then(res => {
          const data = res.data || res;
          const services = Array.isArray(data) ? data : [];
          setItems(services);

          if ((value === null || value === undefined) && services.length > 0) {
            onChange?.(services[0].service_id, services[0]);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          onLoadingChange?.(false);
        });
    }
  }, [readonly]);

  useEffect(() => {
    onLoadingChange?.(loading || loadingService);
  }, [loading, loadingService, onLoadingChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value ? Number(e.target.value) : null;
    const service = items.find(s => s.service_id === serviceId) || null;
    onChange?.(serviceId, service);
  };

  const handleOpenServiceModal = () => {
    if (selectedService) {
      setServiceModalOpen(true);
    }
  };

  const handleSaveService = async (serviceData: Record<string, any>) => {
    await shm_request('shm/v1/admin/service', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });

    if (value) {
      const res = await shm_request(`shm/v1/admin/service?service_id=${value}&limit=1`);
      const data = res.data || res;
      const services = Array.isArray(data) ? data : [];
      if (services.length > 0) {
        setSelectedService(services[0]);
      }
    }

    onServiceUpdated?.();
  };

  const handleDeleteService = async (id: number) => {
    await shm_request(`shm/v1/admin/service/${id}`, {
      method: 'DELETE',
    });
    onServiceUpdated?.();
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  if (loadingService) {
    return (
      <div
        className={`w-full px-3 py-2 text-sm rounded border ${className}`}
        style={inputStyles}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-4 rounded animate-pulse flex-1"
            style={{
              backgroundColor: 'var(--theme-input-border)',
            }}
          />
        </div>
      </div>
    );
  }

  if (readonly) {
    const currentService = selectedService;
    return (
      <>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentService ? `[${currentService.service_id}] ${currentService.name}` : (value ? `#${value}` : '')}
            readOnly
            className={`flex-1 px-3 py-2 text-sm rounded border opacity-60 ${className}`}
            style={inputStyles}
          />
          {currentService && (
            <button
              type="button"
              onClick={handleOpenServiceModal}
              className="p-2 rounded border hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                borderColor: 'var(--theme-button-secondary-border)',
                color: 'var(--theme-button-secondary-text)',
              }}
              title="Редактировать услугу"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {currentService && (
          <ServiceModal
            open={serviceModalOpen}
            onClose={() => setServiceModalOpen(false)}
            data={currentService}
            onSave={handleSaveService}
            onDelete={() => handleDeleteService(currentService.service_id)}
          />
        )}
      </>
    );
  }

  if (loading) {
    return (
      <div
        className={`w-full px-3 py-2 text-sm rounded border ${className}`}
        style={inputStyles}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-4 rounded animate-pulse flex-1"
            style={{
              backgroundColor: 'var(--theme-input-border)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      className={`w-full px-3 py-2 text-sm rounded border ${className}`}
      style={inputStyles}
    >
      {items.map(item => (
        <option key={item.service_id} value={item.service_id}>
          [{item.service_id}] {item.name}
        </option>
      ))}
    </select>
  );
}
