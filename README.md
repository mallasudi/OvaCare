# 🌸 OvaCare – Women’s Health & PCOS Management System

OvaCare is a full-stack web application designed to help women monitor, understand, and manage their reproductive health — with a strong focus on PCOS (Polycystic Ovary Syndrome).
It combines AI-powered assessment, cycle tracking, journaling, analytics, and consultation features into one unified platform.

---

## ✨ Key Features

-  AI-based PCOS risk prediction  
-  Smart cycle tracking with phase detection  
-  Analytical dashboard with health insights  
-  Journaling system with image upload  
-  Doctor consultation system  
-  Secure authentication (JWT + OTP reset)  
-  Admin panel with system controls  

###  Authentication & Security

* JWT-based login system
* Role-based access control
* Forgot Password with OTP verification
* Secure password reset flow

---

###  UI/UX Highlights

* Clean and modern UI with Tailwind CSS
* Light/Dark theme support
* Consistent dashboard layout
* Smooth navigation with role-based views

---

##  Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* Context API (Auth + Theme)
* Chart.js (Data visualization)

### Backend

* Node.js + Express.js
* MongoDB (Mongoose)
* JWT Authentication
* Nodemailer (OTP email system)

---

##  Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/OvaCare.git
cd OvaCare
```

### 2. Backend setup

```bash
cd backend
npm install
npm start
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

##  Environment Variables

Create a `.env` file in backend:

```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

---

##  Future Improvements

* AI model optimization for higher accuracy
* Doctor booking system
* Mobile app version
* Multi-language full support
* Advanced health recommendations engine

---

##  Purpose
Built as a real-world full-stack healthcare application focusing on women’s health and PCOS awareness.

---

##  Author

**Suniti Malla**
Full Stack Developer

---

##  Final Note

OvaCare is not just a project — it is a step towards using technology to empower women's health through data, awareness, and accessibility.

---
