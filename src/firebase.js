// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics"
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxQ8eQQ0peQkNzcVllRjIsweLp49SZw1E",
  authDomain: "blis-jos.firebaseapp.com",
  projectId: "blis-jos",
  storageBucket: "blis-jos.firebasestorage.app",
  messagingSenderId: "174634891544",
  appId: "1:174634891544:web:3d0dd68d7ef78d7d20466d",
  measurementId: "G-MCHQPFKQE5",
}

// Initialize Firebase App
export const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore Database
export const db = getFirestore(app)

// Initialize Firebase Authentication
export const auth = getAuth(app)

// Initialize Firebase Analytics safely (guards against environments where IndexedDB is disabled)
export let analytics = null
if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app)
      }
    })
    .catch((err) => {
      console.warn("Firebase Analytics not supported in this environment:", err)
    })
}

/**
 * Universal Firestore helper functions with localStorage failover
 */

// Save a key-value record to Firestore under 'school_data' collection
export const saveToCloud = async (docKey, data) => {
  try {
    const docRef = doc(db, "school_data", docKey)
    await setDoc(docRef, { payload: data, updatedAt: new Date().toISOString() }, { merge: true })
    return true
  } catch (err) {
    console.warn(`Cloud save error for ${docKey}:`, err)
    return false
  }
}

// Load a record from Firestore
export const loadFromCloud = async (docKey) => {
  try {
    const docRef = doc(db, "school_data", docKey)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return snap.data().payload
    }
  } catch (err) {
    console.warn(`Cloud load error for ${docKey}:`, err)
  }
  return null
}

// Real-time listener for any school collection
export const subscribeToCloudDoc = (docKey, onUpdate) => {
  try {
    const docRef = doc(db, "school_data", docKey)
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          if (data && data.payload !== undefined) {
            onUpdate(data.payload)
          }
        }
      },
      (error) => {
        console.warn(`Realtime subscription notice for ${docKey}:`, error)
      }
    )
  } catch (err) {
    console.warn(`Listener attachment error for ${docKey}:`, err)
    return () => {}
  }
}

export default app
