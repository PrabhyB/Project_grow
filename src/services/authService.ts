import { createUserWithEmailAndPassword, sendPasswordResetEmail, 
  signInWithEmailAndPassword, signOut, updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase"; export async function registerUser( 
  name: string, email: string, password: string,
) { const credential = await createUserWithEmailAndPassword( auth, email, 
    password,
  ); await updateProfile(credential.user, { displayName: name,
  });
  return credential.user;
}
export async function loginUser(email: string, password: string) { const 
  credential = await signInWithEmailAndPassword(
    auth, email, password, ); return credential.user;
}
export async function logoutUser() { await signOut(auth);
}
export async function resetPassword(email: string) { await 
  sendPasswordResetEmail(auth, email);
}
