import path from "node:path";
import { cors } from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Elysia } from "elysia";
import { google } from "googleapis";
import { t } from "elysia";
import activity from "./activity";
import db from "./database";
import project from "./project";
import task from "./task";
import user from "./user";
import { validateSessionToken } from "./user/controllers/validate-session-token";
import purgeData from "./utils/purge-demo-data";
import setDemoUser from "./utils/set-demo-user";
import workspace from "./workspace";
import workspaceUser from "./workspace-user";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport";
import { randomUUID ,createHash  } from 'crypto';
import nodecron from "node-cron"
import  type { ScheduledTask } from  "node-cron"
type ScheduledJob = {
  job: ScheduledTask;
  targetTime: number; // 👈 This must match the key used in the object
  message: string;
};
const isDemoMode = process.env.DEMO_MODE === "true";

const oauth2Client = new google.auth.OAuth2(
  "751756805538-476rtglo819us8sor11ita5bfqhgii31.apps.googleusercontent.com",
  "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",
  "http://localhost:1337/auth/google/callback"
);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const app = new Elysia()
  .state("userEmail", "")
  .state('jobs', new Map<string, ScheduledJob>())
  .use(
    cors({
      origin: ["http://localhost:5173"], // Your frontend URL
      credentials: true,
      allowedHeaders: ["Authorization", "content-type"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  )
  .use(user)
  .use(
    cron({
      name: "purge-demo-data",
      pattern: "30 * * * *",
      run: async () => {
        const isDemoMode = process.env.DEMO_MODE === "true";

        if (isDemoMode) {
          console.log("Purging demo data");
          await purgeData();
        }
      },
    })
  )
  // Add Google OAuth routes
  .get("/auth/google", () => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    // Return a redirect response instead of JSON
    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
      },
    });
  })
  .get("/auth/google/callback", async ({ query }) => {
    console.log("callback called");
    const code = query.code as string | undefined;

    if (!code) {
      return new Response("No authorization code received", { status: 400 });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      return new Response(
        `
        <html>
          <script>
            const tokens = ${JSON.stringify(tokens)};
            console.log("tokesnss" , tokens)
            
            
            new Promise((resolve, reject) => {
               window.opener.postMessage({ 
                 type: 'google-auth-success', 
                 tokens: tokens 
               }, 'http://localhost:5173');
              resolve(null);
               }).then(()=>window.close());

          </script>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    } catch (error) {
      return new Response(
        `
        <html>
          <script>
            window.opener.postMessage({ type: 'google-auth-error' }, 'http://localhost:5173');
            window.close();
          </script>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  })
  .get("/calendar/events", async ({ headers }) => {
    try {
      const authToken = headers["authorization"]?.split("Bearer ")[1];
      if (!authToken) {
        return new Response("No authorization token", { status: 401 });
      }

      const authClient = new google.auth.OAuth2();
      authClient.setCredentials({ access_token: authToken });

      const calendar = google.calendar({
        version: "v3",
        auth: authClient,
      });

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      return { events: response.data.items };
    } catch (error) {
      return { error: "Failed to fetch calendar events" };
    }
  })
  .post(
    '/calendar/events',
    async ({ body, headers, store }) => {
      try {
        const authToken = headers['authorization']?.split('Bearer ')[1];
        if (!authToken) {
          return new Response('No authorization token', { status: 401 });
        }
  
        const authClient = new google.auth.OAuth2();
        authClient.setCredentials({ access_token: authToken });
  
        const calendar = google.calendar({ version: 'v3', auth: authClient });
  
        const event = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: body.summary,
            description: body.description,
            start: {
              dateTime: body.startTime,
              timeZone: 'Asia/Kolkata',
            },
            end: {
              dateTime: body.endTime,
              timeZone: 'Asia/Kolkata',
            },
          },
        });
  
        // --- CRON JOB SETUP ---
        const hash = createHash('sha256')
          .update(`${body.startTime}-${body.summary}-${body.description}`)
          .digest('hex');
        const jobId = `reminder-${hash.slice(0, 12)}`;
  
        const startTimestamp = new Date(body.startTime).getTime();
        const executingTime = startTimestamp - 10 * 60 * 1000; // minus 10 minutes
  
        const job = nodecron.schedule('* * * * *', () => {
          const now = Date.now();
          const diff = Math.abs(now - executingTime);
  
          console.log(`[${jobId}] Checking if it's time to run...`);
  
          if (diff <= 60000) {
            console.log(`[${jobId}] 🔔 Reminder triggered for event '${event.data.summary}'`);
  
            // 🧹 STOP & CLEANUP
            job.stop();
            store.jobs.delete(jobId);
          }
        });
  
        // Store the job
        store.jobs.set(jobId, {
          job,
          targetTime: executingTime, // ✅ FIXED
          message: event.data.summary || '',
        });
        
  
        return { success: true, event: event.data };
      } catch (error) {
        console.error('Error creating calendar event:', error);
        return { error: 'Failed to create calendar event' };
      }
    },
    {
      body: t.Object({
        summary: t.String(),
        description: t.String(),
        startTime: t.String(),
        endTime: t.String(),
      }),
    }
  )
  .guard({
    async beforeHandle({ store, cookie: { session }, set }) {
      if (isDemoMode) {
        if (!session?.value) {
          await setDemoUser(set);
        }

        const { user, session: validatedSession } = await validateSessionToken(
          session.value ?? ""
        );

        if (!user || !validatedSession) {
          await setDemoUser(set);
        }

        store.userEmail = user?.email ?? "";
      } else {
        if (!session?.value) {
          return { user: null };
        }

        const { user, session: validatedSession } = await validateSessionToken(
          session.value
        );

        if (!user || !validatedSession) {
          return { user: null };
        }

        store.userEmail = user.email;
      }
    },
  })
  .get("/me", async ({ cookie: { session } }) => {
    const { user } = await validateSessionToken(session.value ?? "");

    if (user === null) {
      return { user: null };
    }

    return { user };
  })
  .use(workspace)
  .use(project)
  .use(task)
  .use(workspaceUser)
  .use(activity)
  .onError(({ code, error }) => {
    switch (code) {
      case "VALIDATION":
        return error.all;
      default:
        if (error instanceof Error) {
          return {
            name: error.name,
            message: error.message,
          };
        }
    }
  })
  .listen(1337);

export type App = typeof app;

migrate(db, {
  migrationsFolder: path.join(__dirname, "../drizzle"),
});

console.log(`🏃 Kaneo is running at ${app.server?.url}`);
