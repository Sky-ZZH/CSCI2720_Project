# CSCI2720 Project - Backend API Testing Guide

## System Requirements
*   **Google Chrome** (almost latest version)
*   **Node** v24.9.0 + **npm** 11.6.2
*   **MongoDB server** 8.0.13

PS C:\Users\xulin\OneDrive\Documents\GitHub\CSCI2720_Project> node .\check_env.js
Node Version: v24.9.0
NPM Version: 11.6.2
MongoDB Version Info:
db version v8.0.16

---

## Installation & Setup

```bash
cd ./backend 
npm install jsonwebtoken 
```

---

## Test Cases

### 1. Authentication (Login)
*   **Method:** `POST`
*   **URL:** `http://localhost:5000/api/login`

**Body (JSON):**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
    "_id": "693d3030eb488766fc493aa8",
    "username": "admin",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> **Remind:** This token is used for later tests.

---

### 2. Public Endpoints (No Token Required)

#### Get All Locations
*   **Method:** `GET`
*   **URL:** `http://localhost:5000/api/locations`
*   **Test Filter:** `http://localhost:5000/api/locations?keyword=Hall`

**Response:** Both OK.

#### Get Single Location
*   **Method:** `GET`
*   **URL:** `http://localhost:5000/api/locations/<VENUE_ID>`

**Response Example:**
```json
[
    {
        "_id": "693d30370d8269cfc9568213",
        "id": "36311771",
        "name": "Sha Tin Town Hall (Music Studio)",
        "latitude": 22.38136,
        "longitude": 114.1899,
        "events": [
            "693d30370d8269cfc956824b", 
            "693d30370d8269cfc956824e",
            ...
        ],
        "__v": 34,
        "coords": {
            "lat": 22.38136,
            "lng": 114.1899
        }
    }
]
```

---

### 3. Protected Endpoints (Token Required)
*For these requests, go to the **Authorization** tab in Postman, select **Bearer Token**, and paste the token you copied earlier.*

#### Add to Favorites
*   **Method:** `POST`
*   **URL:** `http://localhost:5000/api/user/favorites`

**Body (JSON):**
```json
{
  "locationId": "36311771" 
}
```
*(Replace with valid venue id)*

**Response:**
```json
{
    "message": "Added to favorites",
    "favorites": [
        "693d30370d8269cfc9568213"
    ]
}
```

**2nd Request (Remove):**
```json
{
    "message": "Removed from favorites",
    "favorites": []
}
```

#### Get Favorites
*   **Method:** `GET`
*   **URL:** `http://localhost:5000/api/user/favorites`

**Response:**
```json
[
    {
        "_id": "693d30370d8269cfc9568213",
        "id": "36311771",
        "name": "Sha Tin Town Hall (Music Studio)",
        ...
    }
]
```

#### Add Comment
*   **Method:** `POST`
*   **URL:** `http://localhost:5000/api/locations/AC1/comments`
    *   *e.g.* `http://localhost:5000/api/locations/36311771/comments`

**Body (JSON):**
```json
{
  "content": "This is a test comment."
}
```

**Response:**
```json
{
    "user": "693d3030eb488766fc493aa8",
    "location": "693d30370d8269cfc9568213",
    "content": "This is a test comment.",
    "_id": "693d34b8c9e3f9ee63397d40",
    "timestamp": "2025-12-13T09:41:12.561Z",
    "__v": 0
}
```

---

### 4. Admin Endpoints (Admin Token Required)

#### Create User
*   **Method:** `POST`
*   **URL:** `http://localhost:5000/api/admin/users`

**Body (JSON):**
```json
{
  "username": "testuser",
  "password": "user123",
  "role": "user"
}
```

**Response:**
```json
{
    "username": "testuser",
    "password": "$2b$10$v/5lbbPndvBiczhPgxHIK.jZkY9ZPXwdYz2d47BwZSGbdL3GJmZBi",
    "role": "user",
    "favorites": [],
    "_id": "693d3502c9e3f9ee63397d44",
    "__v": 0
}
```

#### Delete Event
*   **Method:** `DELETE`
*   **URL:** `http://localhost:5000/api/admin/events/<EVENT_MONGO_ID>`
    *   *Note: You need the MongoDB `_id` (long string) of an event, which you can find inside the Location details.*
    *   *e.g.* `http://localhost:5000/api/admin/events/693d30370d8269cfc956824b`

**Response:**
```json
{
    "message": "Event removed"
}
```


