# HK Cultural Events Finder - Frontend

This is the frontend application for the HK Cultural Events Finder, built with vanilla JavaScript, HTML, and CSS.

## Prerequisites

*   Node.js installed
*   MongoDB installed and running locally (or configured via `.env`)

## Setup & Installation

1.  **Navigate to the project root** (one level up from this folder):
    ```bash
    cd ..
    ```

2.  **Install dependencies** (this installs packages for both frontend and backend):
    ```bash
    npm install
    ```

## Running the Application

To start both the Backend API and the Frontend server simultaneously:

1.  **Run the start command from the project root**:
    ```bash
    npm start
    ```

2.  **Access the application**:
    Open your browser and go to: [http://localhost:3000](http://localhost:3000)

    *   **Frontend**: http://localhost:3000
    *   **Backend API**: http://localhost:5000

## Test Credentials

You can use the following accounts to log in:

*   **User**: `testuser` / `password123`
*   **Admin**: `admin` / `admin123`

## Project Structure

*   `index.html`: Main entry point.
*   `js/app.js`: Main application logic and routing.
*   `js/api.js`: Centralized API handling.
*   `js/components/`: Individual UI components (Login, Locations, Map, etc.).
*   `css/style.css`: Application styling.
