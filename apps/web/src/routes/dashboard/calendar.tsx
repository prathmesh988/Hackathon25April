import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventForm from "@/components/calendar/AddEventForm";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
}

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [popup, setPopup] = useState<Window | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:1337";

  const handleGoogleLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const newPopup = window.open(
      `${apiUrl}/auth/google`,
      "Google Login",
      `width=${width},height=${height},left=${left},top=${top},popup=1`,
    );
    setPopup(newPopup);
  };

  const fetchEvents = async () => {
    try {
      const tokens = JSON.parse(localStorage.getItem("googleTokens") || "{}");
      const response = await fetch(`${apiUrl}/calendar/events`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      const data = await response.json();
      console.log("the data " , data)
      if (data.error) {
        setIsAuthenticated(false);
        return;
      }
      if (data.events) {
        const ofiEvents = data.events.filter((event: CalendarEvent) =>
          event.summary.startsWith("ofi_"),
        );
        setEvents(ofiEvents);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const handleAuthMessage = async (event: MessageEvent) => {
      console.log(event)
      if (event.origin !== apiUrl) return;

      if (event.data.type === "google-auth-success") {
        if (popup) popup.close();
        localStorage.setItem("googleTokens", JSON.stringify(event.data.tokens));
        await fetchEvents();
      } else if (event.data.type === "google-auth-error") {
        console.error("Google authentication failed");
        if (popup) popup.close();
      }
    };

    window.addEventListener("message", handleAuthMessage);

    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);

  const filteredEvents = events.filter((event) => {
    if (!selectedDate) return false;
    const eventDate = new Date(event.start.dateTime);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  return (
    <div className="container mx-auto p-6">
      {!isAuthenticated ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Google Calendar Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Please connect your Google Calendar to view and manage events.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Connect Google Calendar
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Add New Event</CardTitle>
              </CardHeader>
              <CardContent>
                <AddEventForm />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar selected={selectedDate} onSelect={setSelectedDate} />
                <ul className="mt-4">
                  {filteredEvents.map((event) => (
                    <li key={event.id} className="p-2 border-b">
                      <strong>{event.summary}</strong> -{" "}
                      {format(new Date(event.start.dateTime), "PPpp")}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
