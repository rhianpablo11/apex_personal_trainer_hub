import { getAccessToken } from './auth';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string; // ISO String
    timeZone?: string;
  };
  end: {
    dateTime: string; // ISO String
    timeZone?: string;
  };
}

const CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// List primary calendar events for a date range
export async function listCalendarEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');
  
  const url = `${CALENDAR_URL}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Google Calendar API list failed: ${res.statusText}`);
  }
  
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || 'Treino sem título',
    description: item.description || '',
    start: {
      dateTime: item.start?.dateTime || item.start?.date || '',
      timeZone: item.start?.timeZone || 'America/Sao_Paulo'
    },
    end: {
      dateTime: item.end?.dateTime || item.end?.date || '',
      timeZone: item.end?.timeZone || 'America/Sao_Paulo'
    }
  }));
}

// Create a new calendar event
export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const body = {
    summary: event.summary,
    description: event.description || 'Agendado via App do Apex',
    start: {
      dateTime: event.start.dateTime,
      timeZone: event.start.timeZone || 'America/Sao_Paulo'
    },
    end: {
      dateTime: event.end.dateTime,
      timeZone: event.end.timeZone || 'America/Sao_Paulo'
    },
    reminders: {
      useDefault: true
    }
  };
  
  const res = await fetch(CALENDAR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    throw new Error(`Failed to create Google Calendar event: ${res.statusText}`);
  }
  
  const data = await res.json();
  return {
    id: data.id,
    summary: data.summary,
    description: data.description,
    start: { dateTime: data.start.dateTime, timeZone: data.start.timeZone },
    end: { dateTime: data.end.dateTime, timeZone: data.end.timeZone }
  };
}

// Delete a calendar event
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await fetch(`${CALENDAR_URL}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Google Calendar event: ${res.statusText}`);
  }
}
