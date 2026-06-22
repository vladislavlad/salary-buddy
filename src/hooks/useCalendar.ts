import { useQuery } from '@tanstack/react-query';
import { fetchCalendar } from '@/services/calendar';

export function useCalendar(year: number) {
  return useQuery({
    queryKey: ['calendar', year],
    queryFn: () => fetchCalendar(year),
    staleTime: Infinity,
    retry: 2,
  });
}
