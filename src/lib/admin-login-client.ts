import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Admin Portal Auth Configuration (Vakalat Project)
const adminFirebaseConfig = {
    apiKey: "AIzaSyDtCTsbduQiNR9Wg1Tpo7s4ZbLgde971cY",
    authDomain: "vakalat.firebaseapp.com",
    projectId: "vakalat",
    storageBucket: "vakalat.firebasestorage.app",
    messagingSenderId: "735603652990",
    appId: "1:735603652990:web:634a8be5fc6aef9552db2f"
};

// Initialize Firebase for Admin Auth
// We use a unique name 'adminApp' to avoid conflict with the default app if it exists
const appName = 'adminApp';
let adminApp;

if (getApps().some(app => app.name === appName)) {
    adminApp = getApp(appName);
} else {
    adminApp = initializeApp(adminFirebaseConfig, appName);
}

export const adminAuth = getAuth(adminApp);
