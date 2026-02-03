import { ItineraryItem } from '../types';

export const downloadICS = (item: ItineraryItem, dateStr: string) => {
  // Parse date string (e.g., "2/27 (五)") to get year/month/day
  // Assuming current year or next occurrence for simplicity in this demo context
  // Fixed year 2025 based on the app header
  const year = 2025;
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  
  if (!dateMatch) return;
  
  const month = parseInt(dateMatch[1], 10);
  const day = parseInt(dateMatch[2], 10);
  
  // Parse time (e.g., "07:30")
  const [hours, minutes] = item.time.split(':').map(Number);

  // Create start date object
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + 90 * 60000); // Default duration 1.5 hours

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fukuoka Trip//EN',
    'BEGIN:VEVENT',
    `UID:${item.id}@fukuokatrip.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:福岡行程：${item.title}`,
    `DESCRIPTION:${item.description}\\n交通：${item.transportDetail}`,
    `LOCATION:${item.address_jp}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${item.title}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};