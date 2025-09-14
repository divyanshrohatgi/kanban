# PinBoard — Real-time Collaborative Kanban

A modern, real-time collaborative Kanban board built with React, Node.js, and WebSockets. Features drag & drop cards, live collaboration, presence tracking, and notifications.

## ✨ Features

- **Kanban Boards**: Create and manage multiple boards with columns and cards
- **Drag & Drop**: Move cards between columns with smooth animations
- **Real-time Sync**: Live updates via WebSockets (Socket.IO)
- **Presence Tracking**: See who's currently viewing boards
- **Notifications**: In-app notifications and email alerts
- **Authentication**: JWT-based user registration and login

## 🚀 Technologies Used

### Frontend

- **React:** A JavaScript library for building user interfaces.
- **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
- **Vite:** A fast build tool for modern web projects.
- **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
- **Radix UI:** Reusable components built with Radix UI and Tailwind CSS.
- **Axios:** Promise-based HTTP client for the browser and Node.js.
- **Sonner:** An opinionated toast component for React.
- **Socket.IO Client:** For real-time communication.

### Backend

- **Node.js:** JavaScript runtime built on Chrome's V8 JavaScript engine.
- **Express.js:** Fast, unopinionated, minimalist web framework for Node.js.
- **TypeScript:** For type-safe backend development.
- **Supabase:** Open Source Firebase Alternative (PostgreSQL Database, Authentication, Realtime).
- **Redis (Upstash):** For caching and real-time data management.
- **Socket.IO:** For real-time, bidirectional event-based communication.
- **SendGrid:** For email notifications.

### Deployment

- **Docker:** Containerization platform for packaging the application.
- **Render.com:** Cloud platform for deploying web services.

## ⚙️ Local Setup & Development

Follow these steps to get PinBoard up and running on your local machine.

### Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org/en/download/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/get-npm) (comes with Node.js)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine for Linux)
- **Supabase Project:**
  - Create a new project on [Supabase](https://supabase.com/).
  - Obtain your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from your project settings (API section).
  - You will need to set up your database schema. The initial schema is typically found in `backend/supabase/migrations/20250115000000_initial_schema.sql`. You can use the Supabase CLI or SQL Editor to apply this.
- **Upstash Redis Database:**
  - Create a new Redis database on [Upstash](https://upstash.com/).
  - Obtain your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **SendGrid Account (Optional, for emails):**
  - Create an account on [SendGrid](https://sendgrid.com/).
  - Obtain your `SENDGRID_API_KEY`.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auction-PrimeBid-main
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory with the following content. Replace the placeholder values with your actual credentials obtained from Supabase, Upstash, and SendGrid.

```
PORT=8080
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_KEY
UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REDIS_REST_TOKEN
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY
JWT_SECRET=a_strong_random_secret_key_for_jwt_security
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

_Note: The `JWT_SECRET` can be any strong, random string._

Create a `.env` file in the `frontend/` directory:

```
VITE_API_URL=http://localhost:8080
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Database Setup

```bash
cd backend
npx supabase db push
```

### 5. Start Development

**Option 1: Manual Start**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Option 2: Using Start Script**
```bash
# Make sure both backend and frontend are built first
cd backend && npm run build
cd ../frontend && npm run build

# Then run the start script
./start.sh
```

Visit http://localhost:5173

### 6. Build and Run with Docker

This project uses Docker to containerize both the frontend and backend, allowing you to run the entire application with a single command.

1.  **Build the Docker Image:**
    Navigate to the root of your project in your terminal and run:

    ```bash
    docker build -t pinboard-app . --no-cache
    ```

2.  **Stop and Remove Previous Containers (if any):**
    If you have a previous instance of the container running, stop and remove it to avoid port conflicts:

    ```bash
    docker stop pinboard-app || true
    docker rm -f pinboard-app || true
    ```

3.  **Run the Docker Container:**
    Choose a port that is free on your machine. Port `8080` is used internally by the container.

    ```bash
    docker run -p 8080:8080 --name pinboard-app -d pinboard-app
    ```

4.  **Access the Application:**
    Open your web browser and navigate to:

    - `http://localhost:8080`

5.  **Check Container Logs (for debugging):**
    If the application doesn't load or you encounter issues, check the container logs for errors:
    ```bash
    docker logs pinboard-app
    ```

## ☁️ Deployment on Render.com

This project is configured for easy deployment to [Render.com](https://render.com/) using a single Dockerfile.
