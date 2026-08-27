/* Veil Like System Fix
   This file works independently from the main code.
   It does NOT modify Follow, Chat, Profile or Notifications.
*/

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* ================================
   FIREBASE
================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA3Ebqc9zxeSaRTUDYymJk78-UYezD76SU",
  authDomain: "flora-veilchat.firebaseapp.com",
  projectId: "flora-veilchat",
  storageBucket: "flora-veilchat.firebasestorage.app",
  messagingSenderId: "352485676905",
  appId: "1:352485676905:web:8beb0df80a0daea2cccff8",
  measurementId: "G-CQKB9Z8VP1"
};

const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let user = null;
let likedUsers = new Set();
let busy = new Set();


/* ================================
   LOAD MY LIKES
================================ */

async function loadMyLikes() {

  if (!user) return;

  likedUsers = new Set();

  try {

    const q = query(
      collection(db, "likes"),
      where("likerId", "==", user.uid),
      limit(1000)
    );

    const snap = await getDocs(q);

    snap.forEach(d => {

      const data = d.data();

      if (data.targetId) {
        likedUsers.add(data.targetId);
      }

    });

    updateAllLikeButtons();

  } catch (error) {

    console.error(
      "VEIL LIKE LOAD ERROR:",
      error
    );

  }
}


/* ================================
   GET LIKE COUNT
================================ */

async function getLikes(targetId) {

  if (!targetId) return 0;

  try {

    const q = query(
      collection(db, "likes"),
      where("targetId", "==", targetId),
      limit(1000)
    );

    const snap = await getDocs(q);

    return snap.size;

  } catch (error) {

    console.error(
      "VEIL LIKE COUNT ERROR:",
      error
    );

    return 0;
  }
}


/* ================================
   LIKE / UNLIKE
================================ */

async function toggleLikeFixed(targetId) {

  if (!user) {
    showLikeMessage("Please login first.");
    return;
  }

  if (!targetId) {
    showLikeMessage("Invalid profile.");
    return;
  }

  if (targetId === user.uid) {
    return;
  }

  if (busy.has(targetId)) {
    return;
  }

  busy.add(targetId);

  const likeId =
    `${user.uid}_${targetId}`;

  const likeRef =
    doc(db, "likes", likeId);

  const currentlyLiked =
    likedUsers.has(targetId);

  try {

    if (currentlyLiked) {

      await deleteDoc(likeRef);

      likedUsers.delete(targetId);

    } else {

      await setDoc(
        likeRef,
        {
          likerId: user.uid,
          targetId: targetId,
          createdAt: new Date()
        }
      );

      likedUsers.add(targetId);
    }

    await refreshVisibleLikeCount(targetId);

    updateAllLikeButtons();

  } catch (error) {

    console.error(
      "VEIL LIKE ERROR:",
      error
    );

    showLikeMessage(
      "Like could not be updated."
    );

  } finally {

    busy.delete(targetId);

  }
}


/* ================================
   UPDATE PROFILE LIKE COUNT
================================ */

async function refreshVisibleLikeCount(targetId) {

  const count =
    await getLikes(targetId);

  /*
    Current profile page:
    <div class="count-line">
       <span>♥ X Likes</span>
    </div>
  */

  const countLine =
    document.querySelector(".count-line");

  if (
    countLine &&
    window.veilViewingProfile &&
    window.veilViewingProfile.uid === targetId
  ) {

    countLine.innerHTML =
      `<span>♥ ${count} Likes</span>`;
  }


  /*
    If profile button belongs to the
    currently opened profile.
  */

  const likeBtn =
    document.getElementById("profileLikeBtn");

  if (
    likeBtn &&
    window.veilViewingProfile &&
    window.veilViewingProfile.uid === targetId
  ) {

    likeBtn.innerHTML =
      `♥ ${count}`;

    likeBtn.classList.toggle(
      "liked",
      likedUsers.has(targetId)
    );
  }
}


/* ================================
   UPDATE ALL LIKE BUTTONS
================================ */

function updateAllLikeButtons() {

  /*
    Profile button
  */

  const profileButton =
    document.getElementById(
      "profileLikeBtn"
    );

  if (
    profileButton &&
    window.veilViewingProfile &&
    window.veilViewingProfile.uid !== user?.uid
  ) {

    const uid =
      window.veilViewingProfile.uid;

    profileButton.classList.toggle(
      "liked",
      likedUsers.has(uid)
    );
  }


  /*
    For You button
  */

  const forYouButton =
    document.getElementById(
      "likeForYouBtn"
    );

  if (
    forYouButton &&
    window.veilCurrentForYou
  ) {

    const uid =
      window.veilCurrentForYou.uid;

    const liked =
      likedUsers.has(uid);

    forYouButton.textContent =
      liked ? "♥ Liked" : "♥";

    forYouButton.classList.toggle(
      "liked",
      liked
    );
  }
}


/* ================================
   ATTACH PROFILE LIKE
================================ */

function attachProfileLike() {

  const button =
    document.getElementById(
      "profileLikeBtn"
    );

  if (!button) return;

  const profile =
    window.veilViewingProfile;

  if (
    !profile ||
    !profile.uid ||
    profile.uid === user?.uid
  ) {
    return;
  }

  /*
    Remove the old onclick from
    the main code.
  */

  button.onclick = null;

  button.onclick = async function(e) {

    e.preventDefault();
    e.stopPropagation();

    await toggleLikeFixed(
      profile.uid
    );

  };

  button.classList.toggle(
    "liked",
    likedUsers.has(profile.uid)
  );
}


/* ================================
   ATTACH FOR YOU LIKE
================================ */

function attachForYouLike() {

  const button =
    document.getElementById(
      "likeForYouBtn"
    );

  if (!button) return;

  const profile =
    window.veilCurrentForYou;

  if (!profile || !profile.uid) {
    return;
  }

  button.onclick = null;

  button.onclick = async function(e) {

    e.preventDefault();
    e.stopPropagation();

    await toggleLikeFixed(
      profile.uid
    );

  };

  const liked =
    likedUsers.has(profile.uid);

  button.textContent =
    liked ? "♥ Liked" : "♥";

  button.classList.toggle(
    "liked",
    liked
  );
}


/* ================================
   GLOBAL LIKE FIX
================================ */

function attachLikeSystem() {

  attachProfileLike();
  attachForYouLike();
  updateAllLikeButtons();

}


/* ================================
   MUTATION OBSERVER
================================ */

const observer =
  new MutationObserver(() => {

    attachLikeSystem();

  });

observer.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);


/* ================================
   AUTH
================================ */

onAuthStateChanged(
  auth,
  async currentUser => {

    user = currentUser;

    if (!user) {
      likedUsers = new Set();
      return;
    }

    await loadMyLikes();

    attachLikeSystem();

  }
);


/* ================================
   SMALL MESSAGE
================================ */

function showLikeMessage(text) {

  const toast =
    document.getElementById("toast");

  if (!toast) return;

  toast.textContent = text;

  toast.classList.remove(
    "hidden"
  );

  clearTimeout(
    window.veilLikeToast
  );

  window.veilLikeToast =
    setTimeout(() => {

      toast.classList.add(
        "hidden"
      );

    }, 2500);
}


/* ================================
   EXPOSE STATE
   Main code can use these
================================ */

window.veilLikeFix = {
  toggleLike: toggleLikeFixed,
  getLikes,
  loadMyLikes,
  likedUsers
};


/* ================================
   INITIAL RUN
================================ */

setTimeout(() => {

  attachLikeSystem();

}, 500);
