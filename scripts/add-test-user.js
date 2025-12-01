// Simple script to add a test user directly to Firebase
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestUser() {
  try {
    const testUser = {
      id: 'test-user-amis',
      name: 'Amis Sharma',
      username: 'amissharma',
      username_lowercase: 'amissharma',
      displayName_lowercase: 'amis sharma',
      avatar: 'https://picsum.photos/seed/amissharma/200/200',
      email: 'amis@example.com',
      bio: 'Full-stack developer and tech enthusiast. Building the future one line of code at a time.',
      location: 'Mumbai, India',
      headline: 'Full-Stack Developer | React & Node.js Expert',
      followers: [],
      following: [],
      work: [
        {
          title: 'Senior Full-Stack Developer',
          company: 'TechInnovate',
          years: '2023-Present'
        }
      ],
      education: [
        {
          degree: 'B.Tech Computer Science',
          school: 'IIT Mumbai',
          year: '2022'
        }
      ],
      interests: ['Coding', 'AI', 'Blockchain', 'Gaming'],
      skills: ['React', 'Node.js', 'TypeScript', 'Firebase', 'Next.js'],
      coverPhoto: 'https://picsum.photos/seed/amissharma-cover/1200/400'
    };

    console.log('Adding test user to Firebase...');
    
    // Add user document
    await setDoc(doc(db, 'users', testUser.id), {
      ...testUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Add username mapping
    await setDoc(doc(db, 'usernames', testUser.username_lowercase), {
      uid: testUser.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Test user added successfully!');
    console.log(`Profile URL: http://localhost:9002/profile/${testUser.username}`);
    console.log(`Vanity URL: http://localhost:9002/p/${testUser.username}`);

  } catch (error) {
    console.error('❌ Error adding test user:', error);
  }
}

addTestUser();