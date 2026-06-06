import { initializeApp, getApps } from "firebase/app"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBT9JBo_nH4YJQeATnXw-YSCXz2KNUQ4yc",
  authDomain: "escuelasabatica-8b49b.firebaseapp.com",
  projectId: "escuelasabatica-8b49b",
  storageBucket: "escuelasabatica-8b49b.firebasestorage.app",
  messagingSenderId: "345451516345",
  appId: "1:345451516345:web:01bb1dc2752f32d0562668",
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)

if (typeof window !== "undefined") {
  void enableIndexedDbPersistence(db).catch(() => {
    /* varias pestañas o navegador sin soporte */
  })
}
