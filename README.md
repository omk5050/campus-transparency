# Campus Transparency Platform

A full-stack application designed to foster transparency on campus by allowing students to report issues anonymously, vote on them, and track their resolution status.

## 🚀 Features

- **Anonymous Reporting**: Students can report campus issues without revealing their identity. The system uses secure hashing to maintain "controlled anonymity."
- **Community Voting**: Upvote or downvote reported signals to highlight the most pressing concerns.
- **Issue Lifecycle**: Track reports as they move from `REPORTED` to `IN_PROGRESS` and finally `RESOLVED`.
- **Admin Dashboard**: Secure panel for campus administrators to moderate reports, hide inappropriate content, and update issue statuses.
- **Audit Logging**: Every administrative action is logged for accountability.

## 🛠️ Tech Stack

- **Backend**: Java 21, Spring Boot 3.5, Spring Security, JPA/Hibernate, Flyway, PostgreSQL.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Material UI, Lucide Icons.
- **Authentication**: JWT (JSON Web Tokens) with BCrypt password hashing.

## 🏁 Getting Started

### Prerequisites

- **Java 21** or higher.
- **Node.js** (v20+ recommended).
- **PostgreSQL** database.

### 1. Database Setup
Ensure you have a PostgreSQL database running. Update the `backend/src/main/resources/application.properties` with your database credentials.

### 2. Run the Backend
```bash
cd backend
./mvnw spring-boot:run
```
*The backend will automatically seed initial data and admin accounts on the first run.*

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Default Credentials

The system comes pre-seeded with the following accounts for development:

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Admin   | `admin`   | `admin123`  |

### Generating New Hashed Passwords
If you need to generate a new BCrypt hash for a custom admin password, use the built-in utility:
```bash
cd backend
.\mvnw.cmd compile exec:java "-Dexec.mainClass=com.campus.transparency.util.PasswordGenerator" "-Dexec.args=YOUR_PASSWORD"
```

## 🏗️ Project Structure

- `/backend`: Spring Boot API and Domain logic.
- `/frontend`: React application with modern UI components.
- `/backend/src/main/java/com/campus/transparency/domain`: Core business logic and entities.

## 📜 License
This project is for campus transparency and accountability.
