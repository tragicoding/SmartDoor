# Frontend (React Native/Expo)

This directory contains the mobile client for the Smart Door project, built with React Native and Expo.

## 🚀 Getting Started

1.  **Navigate to the client directory:**
    ```bash
    cd client
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Expo Development Server:**
    ```bash
    npm start
    ```
    This will open the Expo developer tools in your browser. You can then run the app on a physical device using the Expo Go app or in an emulator.

## Project Structure

-   `App.js`: The main entry point for the application. It loads necessary fonts and initializes the `AppNavigator`.
-   `app/`: Contains the core application logic and UI components.
    -   `navigation/`: Contains the `AppNavigator`, which defines the screen navigation flow using React Navigation.
    -   `screens/`: Contains the main screens of the application (e.g., `HomeScreen`, `LoginScreen`, `CalendarScreen`).
    -   `components/`: Contains reusable UI components used across different screens (e.g., `CalendarModal`, `ListInputModal`).
    -   `services/`: Contains modules for interacting with external services, such as the backend API (`api.js`) and device location (`location.js`).
    -   `store/`: Contains state management logic, such as the user profile store.
-   `assets/`: Contains static assets like fonts and images.

## Key Screens

-   **LaunchScreen**: The initial splash screen.
-   **LoginScreen**: Handles user authentication.
-   **RegisterScreen**: Handles user registration.
-   **HomeScreen**: The main dashboard after a user logs in. It displays weather information, daily lists, and provides access to other features.
-   **CalendarScreen**: Allows users to view and manage their daily lists on a calendar.
-   **MyPageScreen**: Displays user profile information and settings.
