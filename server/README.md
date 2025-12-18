# Backend Server (Node.js/Express)

This directory contains the backend server for the Smart Door project, built with Node.js, Express, and Prisma.

## 🚀 Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    Create a `.env` file in this directory and add the following variables:
    ```
    DATABASE_URL="mysql://user:password@host:port/database"
    JWT_SECRET="your_jwt_secret"
    DEVICE_SECRET="your_device_secret"
    MQTT_HOST="mqtt://your_mqtt_broker_host"
    CORS_ORIGIN="http://localhost:3000"
    ```

3.  **Run Database Migrations:**
    ```bash
    npx prisma migrate dev
    ```

4.  **Start the Server:**
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:4000`.

## Project Structure

-   `server.js`: The main entry point for the Express application. It initializes middleware and routes.
-   `prisma/`: Contains the database schema (`schema.prisma`) and migration files.
-   `src/`: Contains the core application logic.
    -   `config/`: Configuration files for Prisma (`prisma.js`) and MQTT (`mqtt.js`).
    -   `controllers/`: Request handlers that contain the business logic for each route.
    -   `middleware/`: Custom middleware for authentication (`auth.js`), validation (`validate.js`), and error handling (`error_handler.js`).
    -   `routes/`: Express route definitions.
    -   `services/`: Services that interact with external APIs, such as the weather service (`weather_svc.js`) and TTS service (`tts_svc.js`).
    -   `utils/`: Utility modules like the logger (`logger.js`).

## API Routes

-   `GET /api/health`: Health check endpoint.
-   `POST /api/auth/signup`: User registration.
-   `POST /api/auth/login`: User login.
-   `GET /api/users/me`: Get current user's profile.
-   `PUT /api/users/address`: Update user's address.
-   `GET /api/users/alarms`: Get user's alarms.
-   `POST /api/users/alarms`: Add a new alarm.
-   `POST /api/devices`: Register a new device.
-   `POST /api/bins/update`: Update the status of an umbrella bin.
-   `GET /api/bins/status`: Get the status of an umbrella bin.
-   `GET /api/weather/weekly`: Get the weekly weather forecast.


## Database Schema

The database schema is managed with Prisma and includes the following models:

-   **User**: Stores user information, including credentials and address.
-   **Device**: Represents a physical device (e.g., door sensor, umbrella bin).
-   **UmbrellaBin**: Stores the status of the umbrella bin (e.g., remaining umbrellas, capacity).
-   **Alarm**: Stores user-defined alarms.
-   **DailyList**: Stores daily to-do lists for users.
