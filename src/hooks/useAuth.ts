import { useEffect, useState } from 'react';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { database } from '@/lib/firebase';

const fetchUserLevel = async (currentUser: User | null) => {
  if (!currentUser) {
    return null;
  }
  try {
    const userDocRef = doc(database, "migrated_data", "b7ojJpFKj4RNIkQneCpu");
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const usersData = userDocSnap.data()?.data;
      if (Array.isArray(usersData)) {
        const userData = usersData.find((u: any) => u.id_pengguna === currentUser.uid || u.email === currentUser.email);
        return userData ? userData.level : "kasir";
      }
    }
    return "kasir"; // Default if doc or data is not found
  } catch (error) {
    console.error("Failed to fetch user level:", error);
    return "kasir"; // Default on error
  }
};


export function useAuth(auth: Auth) {
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const level = await fetchUserLevel(currentUser);
        setUserLevel(level);
      } else {
        setUserLevel(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, userLevel, loading };
}
