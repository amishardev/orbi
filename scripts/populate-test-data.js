const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test users data
const testUsers = [
  {
    id: 'test-user-1',
    name: 'John Doe',
    username: 'johndoe',
    username_lowercase: 'johndoe',
    displayName_lowercase: 'john doe',
    avatar: 'https://picsum.photos/seed/johndoe/200/200',
    email: 'john@example.com',
    bio: 'Software engineer passionate about building great products.',
    location: 'San Francisco, CA',
    headline: 'Senior Software Engineer at TechCorp',
    followers: [],
    following: [],
    work: [
      {
        title: 'Senior Software Engineer',
        company: 'TechCorp',
        years: '2022-Present'
      },
      {
        title: 'Software Engineer',
        company: 'StartupXYZ',
        years: '2020-2022'
      }
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        school: 'University of California',
        year: '2020'
      }
    ],
    interests: ['Technology', 'Hiking', 'Photography'],
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    coverPhoto: 'https://picsum.photos/seed/johndoe-cover/1200/400'
  },
  {
    id: 'test-user-2',
    name: 'Jane Smith',
    username: 'janesmith',
    username_lowercase: 'janesmith',
    displayName_lowercase: 'jane smith',
    avatar: 'https://picsum.photos/seed/janesmith/200/200',
    email: 'jane@example.com',
    bio: 'Product designer with a passion for user experience.',
    location: 'New York, NY',
    headline: 'Senior Product Designer at DesignCo',
    followers: ['test-user-1'],
    following: [],
    work: [
      {
        title: 'Senior Product Designer',
        company: 'DesignCo',
        years: '2021-Present'
      }
    ],
    education: [
      {
        degree: 'B.A. Design',
        school: 'Art Institute',
        year: '2019'
      }
    ],
    interests: ['Design', 'Art', 'Travel'],
    skills: ['Figma', 'Sketch', 'Prototyping', 'User Research'],
    coverPhoto: 'https://picsum.photos/seed/janesmith-cover/1200/400'
  },
  {
    id: 'test-user-3',
    name: 'Mike Johnson',
    username: 'mikejohnson',
    username_lowercase: 'mikejohnson',
    displayName_lowercase: 'mike johnson',
    avatar: 'https://picsum.photos/seed/mikejohnson/200/200',
    email: 'mike@example.com',
    bio: 'Marketing professional helping brands grow.',
    location: 'Austin, TX',
    headline: 'Marketing Manager at GrowthCorp',
    followers: [],
    following: ['test-user-1', 'test-user-2'],
    work: [
      {
        title: 'Marketing Manager',
        company: 'GrowthCorp',
        years: '2023-Present'
      }
    ],
    education: [
      {
        degree: 'MBA Marketing',
        school: 'Business School',
        year: '2022'
      }
    ],
    interests: ['Marketing', 'Business', 'Sports'],
    skills: ['Digital Marketing', 'Analytics', 'Strategy'],
    coverPhoto: 'https://picsum.photos/seed/mikejohnson-cover/1200/400'
  }
];

// Test posts data
const testPosts = [
  {
    id: 'post-1',
    userId: 'test-user-1',
    username: 'johndoe',
    caption: 'Just shipped a new feature! Excited to see how users respond. #coding #product',
    imageUrl: 'https://picsum.photos/seed/post1/800/600',
    reactions: {
      '👍': ['test-user-2'],
      '🔥': ['test-user-3']
    },
    commentsCount: 2,
    totalReactions: 2
  },
  {
    id: 'post-2',
    userId: 'test-user-2',
    username: 'janesmith',
    caption: 'Working on some exciting new designs. Love the creative process! ✨',
    imageUrl: 'https://picsum.photos/seed/post2/800/600',
    reactions: {
      '❤️': ['test-user-1', 'test-user-3'],
      '😍': ['test-user-1']
    },
    commentsCount: 1,
    totalReactions: 3
  },
  {
    id: 'post-3',
    userId: 'test-user-3',
    username: 'mikejohnson',
    caption: 'Great networking event today! Met some amazing entrepreneurs. #networking #business',
    reactions: {
      '👍': ['test-user-1', 'test-user-2']
    },
    commentsCount: 0,
    totalReactions: 2
  }
];

async function populateTestData() {
  try {
    console.log('Starting to populate test data...');

    // Add test users
    for (const user of testUsers) {
      console.log(`Adding user: ${user.username}`);
      
      // Add user document
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add username mapping
      await setDoc(doc(db, 'usernames', user.username_lowercase), {
        uid: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Add test posts
    for (const post of testPosts) {
      console.log(`Adding post: ${post.id}`);
      await setDoc(doc(db, 'posts', post.id), {
        ...post,
        createdAt: serverTimestamp()
      });
    }

    console.log('✅ Test data populated successfully!');
    console.log('You can now visit these profiles:');
    testUsers.forEach(user => {
      console.log(`- http://localhost:9002/profile/${user.username}`);
      console.log(`- http://localhost:9002/p/${user.username}`);
    });

  } catch (error) {
    console.error('❌ Error populating test data:', error);
  }
}

// Run the script
populateTestData();